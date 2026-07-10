import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const REGISTRY = "openclaw-session-manager-state-v0";
const PERSISTED_STATUSES = new Set(["running", "recovery_required", "stopped"]);

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function projectIntent(value, { restore = false } = {}) {
  const taskId = optionalString(value?.taskId);
  const status = optionalString(value?.status);
  if (!taskId || !PERSISTED_STATUSES.has(status)) {
    return null;
  }
  return {
    taskId,
    approvalId: optionalString(value.approvalId),
    status: restore && status === "running" ? "recovery_required" : status,
    timestamp: optionalString(value.timestamp),
    automaticRestart: false,
  };
}

export function createTrustedWorkViewSidecarRecoveryStore({
  stateFilePath,
  now = () => new Date().toISOString(),
} = {}) {
  let intent = null;
  try {
    const persisted = JSON.parse(readFileSync(stateFilePath, "utf8"));
    if (persisted?.registry === REGISTRY) {
      intent = projectIntent(persisted.sidecarLifecycleIntent, { restore: true });
    }
  } catch {
    intent = null;
  }

  function snapshot() {
    return intent ? { ...intent } : null;
  }

  function record(input) {
    intent = projectIntent({ ...input, timestamp: now() });
    if (!intent) {
      throw new Error("Trusted sidecar recovery intent requires a task id and valid status.");
    }
    mkdirSync(path.dirname(stateFilePath), { recursive: true });
    const tempPath = `${stateFilePath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify({
      registry: REGISTRY,
      sidecarLifecycleIntent: intent,
    }, null, 2)}\n`, "utf8");
    renameSync(tempPath, stateFilePath);
    return snapshot();
  }

  return { snapshot, record };
}
