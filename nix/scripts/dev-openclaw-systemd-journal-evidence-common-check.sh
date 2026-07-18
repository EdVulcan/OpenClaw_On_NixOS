#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CHECK_KIND="${OPENCLAW_SYSTEMD_JOURNAL_EVIDENCE_CHECK_KIND:-core}"
RUN_ID="systemd-journal-evidence-${CHECK_KIND}-$$"

if [[ "$CHECK_KIND" == "observer" ]]; then
  BASE_PORT="${OPENCLAW_SYSTEMD_JOURNAL_EVIDENCE_OBSERVER_PORT_BASE:-5990}"
else
  BASE_PORT="${OPENCLAW_SYSTEMD_JOURNAL_EVIDENCE_PORT_BASE:-5980}"
fi

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$BASE_PORT}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((BASE_PORT + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((BASE_PORT + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((BASE_PORT + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((BASE_PORT + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((BASE_PORT + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((BASE_PORT + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((BASE_PORT + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((BASE_PORT + 8))}"
export OPENCLAW_DEV_RUN_ID="${OPENCLAW_DEV_RUN_ID:-$RUN_ID}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-events-$RUN_ID.jsonl}"
export OPENCLAW_BODY_USER_OWNED_UNITS="${OPENCLAW_BODY_USER_OWNED_UNITS:-openclaw-session-manager,openclaw-browser-runtime}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-systemd-journal-evidence-${CHECK_KIND}.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-systemd-journal-evidence-${CHECK_KIND}.json}"
export OPENCLAW_SYSTEM_JOURNAL_MAX_LINES="${OPENCLAW_SYSTEM_JOURNAL_MAX_LINES:-25}"

SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
HTML_FILE=""
CLIENT_FILE=""

cleanup() {
  rm -f "$HTML_FILE" "$CLIENT_FILE" \
    "$OPENCLAW_EVENT_LOG_FILE" \
    "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" \
    "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
"$SCRIPT_DIR/dev-up.sh" >/dev/null

evidence="$(curl --silent --fail "$SYSTEM_URL/system/systemd/journal-evidence?unit=openclaw-system-sense.service&lines=5")"
invalid_body="$(mktemp)"
invalid_status="$(curl --silent --output "$invalid_body" --write-out '%{http_code}' "$SYSTEM_URL/system/systemd/journal-evidence?unit=ssh.service&lines=5")"
invalid_response="$(<"$invalid_body")"
rm -f "$invalid_body"

if [[ "$CHECK_KIND" == "observer" ]]; then
  HTML_FILE="$(mktemp)"
  CLIENT_FILE="$(mktemp --suffix=.mjs)"
  curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
  curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
  node --check "$CLIENT_FILE"
fi

node - <<'NODE' "$CHECK_KIND" "$evidence" "$invalid_status" "$invalid_response" "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const [kind, evidenceRaw, invalidStatus, invalidRaw, htmlFile, clientFile] = process.argv.slice(2);
const evidence = JSON.parse(evidenceRaw);
const invalid = JSON.parse(invalidRaw);

if (!evidence.ok || evidence.registry !== "openclaw-systemd-journal-evidence-v0") {
  throw new Error(`journal evidence should expose the expected registry: ${JSON.stringify(evidence)}`);
}
if (evidence.mode !== "read_only"
  || evidence.available !== true
  || evidence.unit !== "openclaw-system-sense.service"
  || evidence.requestedLines !== 5) {
  throw new Error(`journal evidence should be available for the fixed physical-host target: ${JSON.stringify(evidence)}`);
}
if (evidence.source?.transport !== "journalctl_json"
  || evidence.source?.command !== "journalctl"
  || JSON.stringify(evidence.source?.args) !== JSON.stringify([
    "--no-pager", "--quiet", "--output=json", "--reverse", "--lines", "" + 5, "--unit", "openclaw-system-sense.service",
  ])) {
  throw new Error(`journal evidence should expose only the fixed journalctl query: ${JSON.stringify(evidence.source)}`);
}
if (evidence.governance?.hostMutation !== false
  || evidence.governance?.canMutate !== false
  || evidence.governance?.readOnlyCommand !== true
  || evidence.governance?.commandArgsBound !== true) {
  throw new Error(`journal evidence governance should remain read-only and bound: ${JSON.stringify(evidence.governance)}`);
}
if (!Array.isArray(evidence.entries)) {
  throw new Error(`journal evidence should expose a bounded entry array: ${JSON.stringify(evidence)}`);
}
for (const entry of evidence.entries) {
  if (entry.unit !== "openclaw-system-sense.service") {
    throw new Error(`journal evidence leaked an entry outside the requested unit: ${JSON.stringify(entry)}`);
  }
  if (typeof entry.message === "string" && /(?:sk-[A-Za-z0-9_-]{8,}|Bearer\s+[^\s]+|(?:password|token|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+)/iu.test(entry.message)) {
    throw new Error(`journal evidence message was not redacted: ${entry.message}`);
  }
}
if (invalidStatus !== "400"
  || invalid.ok !== false
  || invalid.code !== "SYSTEMD_JOURNAL_UNIT_NOT_ALLOWED"
  || invalid.details?.allowedUnits?.includes("ssh.service")) {
  throw new Error(`journal evidence should reject non-OpenClaw units before execution: ${JSON.stringify({ invalidStatus, invalid })}`);
}

const result = {
  status: "passed",
  registry: evidence.registry,
  kind,
  unit: evidence.unit,
  available: evidence.available,
  returned: evidence.summary?.returned ?? evidence.entries.length,
  parseErrors: evidence.summary?.parseErrors ?? 0,
  mutation: evidence.governance?.hostMutation,
};

if (kind === "observer") {
  const html = fs.readFileSync(htmlFile, "utf8");
  const client = fs.readFileSync(clientFile, "utf8");
  for (const token of [
    "Service Journal Evidence",
    "systemd-journal-evidence-panel",
    "systemd-journal-evidence-unit",
    "systemd-journal-evidence-lines",
    "refresh-systemd-journal-evidence-button",
  ]) {
    if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
  }
  for (const token of [
    "/system/systemd/journal-evidence",
    "refreshSystemdJournalEvidence",
    "systemdJournalEvidenceAvailable",
    "commandArgsBound",
    "await refreshSystemdJournalEvidence();",
  ]) {
    if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
  }
  result.panel = "Service Journal Evidence";
}

console.log(JSON.stringify({ openclawSystemdJournalEvidence: result }, null, 2));
NODE
