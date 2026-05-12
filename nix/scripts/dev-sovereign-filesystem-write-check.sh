#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-filesystem-write-fixture"
TARGET_FILE="$FIXTURE_DIR/openclaw-written.txt"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8200}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8201}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8202}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8203}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8204}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8205}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8206}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8207}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8270}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-filesystem-write-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-filesystem-write-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${REGISTRY_FILE:-}" \
    "${PLAN_FILE:-}" \
    "${STEP_FILE:-}" \
    "${HISTORY_FILE:-}" \
    "${EVENTS_FILE:-}" \
    "${ESCAPE_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

"$SCRIPT_DIR/dev-up.sh"

REGISTRY_FILE="$(mktemp)"
PLAN_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"
ESCAPE_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/capabilities" > "$REGISTRY_FILE"
post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Sovereign body writes a bounded body file\",\"type\":\"system_task\",\"policy\":{\"intent\":\"filesystem.write\"},\"actions\":[{\"kind\":\"filesystem.write\",\"intent\":\"filesystem.write\",\"params\":{\"path\":\"$TARGET_FILE\",\"content\":\"sovereign-file-ok\",\"overwrite\":false}}]}" > "$PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=5&capabilityId=act.filesystem.write_text" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=120" > "$EVENTS_FILE"
curl --silent -X POST "$SYSTEM_URL/system/files/write-text" -H 'content-type: application/json' -d '{"path":"/etc/openclaw-should-not-write","content":"nope"}' > "$ESCAPE_FILE" || true

node - <<'EOF' "$REGISTRY_FILE" "$PLAN_FILE" "$STEP_FILE" "$HISTORY_FILE" "$EVENTS_FILE" "$ESCAPE_FILE" "$TARGET_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const registry = readJson(2);
const plan = readJson(3);
const step = readJson(4);
const history = readJson(5);
const events = readJson(6);
const escape = readJson(7);
const targetFile = process.argv[8];

const byId = Object.fromEntries((registry.capabilities ?? []).map((capability) => [capability.id, capability]));
const writeCapability = byId["act.filesystem.write_text"];
if (!writeCapability || writeCapability.governance !== "require_approval" || writeCapability.requiresApproval !== true) {
  throw new Error(`filesystem write capability should be high-risk approval-gated by default: ${JSON.stringify(writeCapability)}`);
}
if (!writeCapability.intents?.includes("filesystem.write") || writeCapability.domains?.[0] !== "body_internal") {
  throw new Error(`filesystem write capability should be body-internal with filesystem.write intent: ${JSON.stringify(writeCapability)}`);
}

const action = (plan.plan?.steps ?? []).find((item) => item.kind === "filesystem.write");
if (action?.capabilityId !== "act.filesystem.write_text" || action?.requiresApproval !== true) {
  throw new Error(`plan should map filesystem.write to write capability: ${JSON.stringify(action)}`);
}
if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error(`operator should autonomously complete filesystem write in sovereign body mode: ${JSON.stringify(step.task)}`);
}
if (step.task?.policy?.decision?.reason !== "body_internal_audit") {
  throw new Error(`task policy should audit body-internal filesystem write: ${JSON.stringify(step.task?.policy?.decision)}`);
}

const invocation = step.execution?.capabilityInvocations?.[0];
if (
  invocation?.capabilityId !== "act.filesystem.write_text"
  || invocation?.invoked !== true
  || invocation?.summary?.kind !== "filesystem.write_text"
  || invocation?.summary?.path !== targetFile
  || invocation?.summary?.contentBytes !== Buffer.byteLength("sovereign-file-ok")
) {
  throw new Error(`operator execution should record filesystem write invocation: ${JSON.stringify(invocation)}`);
}
if (fs.readFileSync(targetFile, "utf8") !== "sovereign-file-ok") {
  throw new Error("filesystem write should create the expected file content");
}

if (
  history.summary?.total !== 1
  || history.summary?.invoked !== 1
  || history.summary?.blocked !== 0
  || history.summary?.byCapability?.["act.filesystem.write_text"] !== 1
  || history.items?.[0]?.policy?.decision !== "audit_only"
  || history.items?.[0]?.policy?.reason !== "body_sovereignty_autonomy"
) {
  throw new Error(`capability history should record autonomous audited filesystem write: ${JSON.stringify(history)}`);
}

if (escape.ok !== false || escape.code !== "PATH_OUTSIDE_ALLOWED_ROOTS") {
  throw new Error(`filesystem write endpoint should reject paths outside allowed roots: ${JSON.stringify(escape)}`);
}

const eventTypes = (events.items ?? []).map((event) => event.type);
for (const type of ["policy.evaluated", "system.files.written", "capability.invoked", "task.completed"]) {
  if (!eventTypes.includes(type)) {
    throw new Error(`audit log should include ${type}: ${JSON.stringify(eventTypes)}`);
  }
}

console.log(JSON.stringify({
  sovereignFilesystemWrite: {
    capability: {
      id: writeCapability.id,
      governance: writeCapability.governance,
      requiresApproval: writeCapability.requiresApproval,
    },
    task: {
      status: step.task?.status,
      taskPolicyReason: step.task?.policy?.decision?.reason,
      capabilityPolicyReason: history.items?.[0]?.policy?.reason ?? null,
      autonomous: history.items?.[0]?.policy?.autonomous === true,
    },
    file: {
      path: targetFile,
      content: fs.readFileSync(targetFile, "utf8"),
      bytes: invocation?.summary?.contentBytes ?? null,
    },
    rejectedPath: {
      ok: escape.ok,
      code: escape.code,
    },
    history: history.summary,
    auditEvents: [...new Set(eventTypes.filter((type) => [
      "policy.evaluated",
      "system.files.written",
      "capability.invoked",
      "task.completed",
    ].includes(type)))],
  },
}, null, 2));
EOF
