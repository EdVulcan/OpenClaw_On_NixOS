import { execFile } from "node:child_process";
import { promisify } from "node:util";

const defaultExecFileAsync = promisify(execFile);
const JOURNAL_EVIDENCE_REGISTRY = "openclaw-systemd-journal-evidence-v0";
const DEFAULT_MAX_LINES = 25;
const DEFAULT_MAX_MESSAGE_CHARS = 512;
const DEFAULT_TIMEOUT_MS = 2500;
const MAX_OUTPUT_BYTES = 256 * 1024;

function boundedText(value, maxChars) {
  const text = typeof value === "string" ? value : "";
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}

function redactSensitiveText(value) {
  return boundedText(value, DEFAULT_MAX_MESSAGE_CHARS)
    .replace(/\bBearer\s+[^\s,;]+/giu, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/gu, "sk-[REDACTED]")
    .replace(/((?:api[-_ ]?key|authorization|credential|password|secret|token)\s*[:=]\s*)[^\s,;]+/giu, "$1[REDACTED]");
}

function parseBoundedPositiveInteger(value, fallback, maximum) {
  const numeric = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(numeric, maximum));
}

function parseJournalTimestamp(value) {
  const microseconds = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isSafeInteger(microseconds) || microseconds <= 0) return null;
  try {
    return new Date(Math.floor(microseconds / 1000)).toISOString();
  } catch {
    return null;
  }
}

function parseInteger(value) {
  const numeric = Number.parseInt(String(value ?? ""), 10);
  return Number.isSafeInteger(numeric) ? numeric : null;
}

function normaliseJournalEntry(record, requestedUnit, maxMessageChars) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const observedUnit = typeof record._SYSTEMD_UNIT === "string"
    ? record._SYSTEMD_UNIT
    : typeof record.UNIT === "string" ? record.UNIT : null;
  if (observedUnit && observedUnit !== requestedUnit) return null;
  const message = typeof record.MESSAGE === "string" ? record.MESSAGE : null;
  return {
    at: parseJournalTimestamp(record.__REALTIME_TIMESTAMP),
    unit: requestedUnit,
    priority: parseInteger(record.PRIORITY),
    identifier: boundedText(record.SYSLOG_IDENTIFIER, 96) || null,
    pid: parseInteger(record._PID),
    message: message === null ? null : boundedText(redactSensitiveText(message), maxMessageChars),
  };
}

function buildGovernance() {
  return {
    domain: "body_internal",
    risk: "low",
    autonomy: "observe_only",
    approvalRequired: false,
    hostMutation: false,
    canMutate: false,
    executesCommand: true,
    readOnlyCommand: true,
    commandArgsBound: true,
    createsTask: false,
    triggersRecovery: false,
    schedulesFollowUp: false,
  };
}

function buildUnavailableResponse({ unit, requestedLines, args, error }) {
  const errorCode = typeof error?.code === "string" ? error.code : "JOURNALCTL_FAILED";
  const detail = error?.stderr || error?.message || "journalctl did not return journal evidence.";
  return {
    ok: true,
    registry: JOURNAL_EVIDENCE_REGISTRY,
    mode: "read_only",
    available: false,
    unit,
    requestedLines,
    source: {
      service: "openclaw-system-sense",
      transport: "journalctl_json",
      command: "journalctl",
      args,
      evidence: "bounded_systemd_journal_read",
    },
    governance: buildGovernance(),
    summary: {
      returned: 0,
      parseErrors: 0,
      filteredEntries: 0,
    },
    entries: [],
    error: {
      code: errorCode,
      message: boundedText(redactSensitiveText(detail), 160),
    },
    next: {
      recommendedSlice: "openclaw-systemd-repair-post-verification",
      boundary: "journal evidence remains read-only and does not authorize restart or rollback",
    },
  };
}

export function createSystemdJournalEvidence({
  allowedUnits = [],
  journalctlPath = "journalctl",
  maxLines = DEFAULT_MAX_LINES,
  maxMessageChars = DEFAULT_MAX_MESSAGE_CHARS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  execFileAsync = defaultExecFileAsync,
  registry = JOURNAL_EVIDENCE_REGISTRY,
} = {}) {
  const unitAllowlist = new Set(allowedUnits.filter((unit) => typeof unit === "string"));
  const boundedMaxLines = parseBoundedPositiveInteger(maxLines, DEFAULT_MAX_LINES, 50);
  const boundedMessageChars = parseBoundedPositiveInteger(maxMessageChars, DEFAULT_MAX_MESSAGE_CHARS, 1024);
  const boundedTimeoutMs = parseBoundedPositiveInteger(timeoutMs, DEFAULT_TIMEOUT_MS, 5000);

  async function buildSystemdJournalEvidence({ unit, lines } = {}) {
    if (!unitAllowlist.has(unit)) {
      const error = new Error("Journal evidence is limited to an allowlisted OpenClaw system unit.");
      error.code = "SYSTEMD_JOURNAL_UNIT_NOT_ALLOWED";
      error.details = { unit: unit ?? null, allowedUnits: [...unitAllowlist].sort() };
      throw error;
    }

    const requestedLines = parseBoundedPositiveInteger(lines, boundedMaxLines, boundedMaxLines);
    const args = [
      "--no-pager",
      "--quiet",
      "--output=json",
      "--reverse",
      "--lines",
      String(requestedLines),
      "--unit",
      unit,
    ];

    let result;
    try {
      result = await execFileAsync(journalctlPath, args, {
        timeout: boundedTimeoutMs,
        maxBuffer: MAX_OUTPUT_BYTES,
        windowsHide: true,
      });
    } catch (error) {
      return buildUnavailableResponse({ unit, requestedLines, args, error });
    }

    const entries = [];
    let parseErrors = 0;
    let filteredEntries = 0;
    for (const line of String(result?.stdout ?? "").split(/\r?\n/u).filter(Boolean)) {
      try {
        const entry = normaliseJournalEntry(JSON.parse(line), unit, boundedMessageChars);
        if (entry) {
          entries.push(entry);
        } else {
          filteredEntries += 1;
        }
      } catch {
        parseErrors += 1;
      }
    }

    return {
      ok: true,
      registry,
      mode: "read_only",
      available: true,
      unit,
      requestedLines,
      source: {
        service: "openclaw-system-sense",
        transport: "journalctl_json",
        command: "journalctl",
        args,
        evidence: "bounded_systemd_journal_read",
      },
      governance: buildGovernance(),
      summary: {
        returned: entries.length,
        parseErrors,
        filteredEntries,
      },
      entries,
      next: {
        recommendedSlice: "openclaw-systemd-repair-post-verification",
        boundary: "journal evidence remains read-only and does not authorize restart or rollback",
      },
    };
  }

  return { buildSystemdJournalEvidence };
}

export { JOURNAL_EVIDENCE_REGISTRY };
