#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-filesystem-read-text-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/readback-workspace"
TARGET_FILE="$WORKSPACE_DIR/readback.txt"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8310}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8311}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8312}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8313}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8314}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8315}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8316}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8317}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8380}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-filesystem-read-text-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-filesystem-read-text-check-events.jsonl}"

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
    "${READ_FILE:-}" \
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
READ_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"
ESCAPE_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/capabilities" > "$REGISTRY_FILE"
post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Sovereign body writes and reads back a filesystem text file\",\"type\":\"system_task\",\"policy\":{\"intent\":\"filesystem.mkdir\"},\"actions\":[{\"kind\":\"filesystem.mkdir\",\"intent\":\"filesystem.mkdir\",\"params\":{\"path\":\"$WORKSPACE_DIR\",\"recursive\":true}},{\"kind\":\"filesystem.write_text\",\"intent\":\"filesystem.write_text\",\"params\":{\"path\":\"$TARGET_FILE\",\"content\":\"readback-confirmed\",\"overwrite\":false}},{\"kind\":\"filesystem.read_text\",\"intent\":\"filesystem.read_text\",\"params\":{\"path\":\"$TARGET_FILE\"}}]}" > "$PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
post_json "$CORE_URL/capabilities/invoke" "{\"capabilityId\":\"sense.filesystem.read\",\"intent\":\"filesystem.read_text\",\"operation\":\"read_text\",\"params\":{\"path\":\"$TARGET_FILE\"}}" > "$READ_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=180" > "$EVENTS_FILE"
curl --silent "$SYSTEM_URL/system/files/read-text?path=/etc/openclaw-should-not-read" > "$ESCAPE_FILE" || true

node - <<'EOF' "$REGISTRY_FILE" "$PLAN_FILE" "$STEP_FILE" "$READ_FILE" "$HISTORY_FILE" "$EVENTS_FILE" "$ESCAPE_FILE" "$TARGET_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const registry = readJson(2);
const plan = readJson(3);
const step = readJson(4);
const read = readJson(5);
const history = readJson(6);
const events = readJson(7);
const escape = readJson(8);
const targetFile = process.argv[9];
const expectedContent = "readback-confirmed";

const byId = Object.fromEntries((registry.capabilities ?? []).map((capability) => [capability.id, capability]));
const readCapability = byId["sense.filesystem.read"];
if (
  !readCapability
  || readCapability.governance !== "audit_only"
  || readCapability.risk !== "medium"
  || !readCapability.intents?.includes("filesystem.read_text")
) {
  throw new Error(`filesystem read capability should expose audited read_text intent: ${JSON.stringify(readCapability)}`);
}

const actionSteps = (plan.plan?.steps ?? []).filter((item) => item.phase === "acting_on_target");
if (
  actionSteps.length !== 3
  || actionSteps[0].capabilityId !== "act.filesystem.mkdir"
  || actionSteps[1].capabilityId !== "act.filesystem.write_text"
  || actionSteps[2].capabilityId !== "sense.filesystem.read"
  || actionSteps[2].kind !== "filesystem.read_text"
) {
  throw new Error(`plan should map mkdir, write_text, and read_text to filesystem capabilities: ${JSON.stringify(actionSteps)}`);
}
if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error(`operator should complete filesystem readback chain: ${JSON.stringify(step.task)}`);
}

const invocations = step.execution?.capabilityInvocations ?? [];
const readInvocation = invocations.find((item) => item.capabilityId === "sense.filesystem.read");
if (
  invocations.length !== 3
  || !readInvocation
  || readInvocation.summary?.kind !== "filesystem.read_text"
  || readInvocation.summary?.path !== targetFile
  || readInvocation.summary?.contentBytes !== Buffer.byteLength(expectedContent)
) {
  throw new Error(`operator execution should summarize governed read_text content: ${JSON.stringify(invocations)}`);
}

if (
  !read.ok
  || read.invoked !== true
  || read.policy?.decision !== "audit_only"
  || read.summary?.kind !== "filesystem.read_text"
  || read.result?.path !== targetFile
  || read.result?.content !== expectedContent
) {
  throw new Error(`direct read_text invocation should return bounded file content: ${JSON.stringify(read)}`);
}
if (fs.readFileSync(targetFile, "utf8") !== expectedContent) {
  throw new Error("target file should contain the text that read_text returned");
}

if (
  history.summary?.total !== 4
  || history.summary?.invoked !== 4
  || history.summary?.blocked !== 0
  || history.summary?.byCapability?.["act.filesystem.mkdir"] !== 1
  || history.summary?.byCapability?.["act.filesystem.write_text"] !== 1
  || history.summary?.byCapability?.["sense.filesystem.read"] !== 2
  || history.items?.some((item) => item.policy?.decision !== "audit_only")
) {
  throw new Error(`capability history should record read_text under audit-only governance: ${JSON.stringify(history)}`);
}

if (escape.ok !== false || escape.code !== "PATH_OUTSIDE_ALLOWED_ROOTS") {
  throw new Error(`read-text endpoint should reject paths outside allowed roots: ${JSON.stringify(escape)}`);
}

const eventTypes = (events.items ?? []).map((event) => event.type);
for (const type of ["system.files.directory_created", "system.files.written", "system.files.read", "capability.invoked", "task.completed"]) {
  if (!eventTypes.includes(type)) {
    throw new Error(`audit log should include ${type}: ${JSON.stringify(eventTypes)}`);
  }
}

console.log(JSON.stringify({
  sovereignFilesystemReadText: {
    capability: {
      id: readCapability.id,
      governance: readCapability.governance,
      intents: readCapability.intents.filter((intent) => intent.startsWith("filesystem.")),
    },
    task: {
      status: step.task?.status,
      taskPolicyReason: step.task?.policy?.decision?.reason,
      invocations: invocations.map((item) => ({
        capabilityId: item.capability?.id,
        kind: item.summary?.kind,
        path: item.summary?.path,
        contentBytes: item.summary?.contentBytes ?? null,
      })),
    },
    readback: {
      path: read.result?.path,
      content: read.result?.content,
      contentBytes: read.summary?.contentBytes,
    },
    rejectedPath: {
      ok: escape.ok,
      code: escape.code,
    },
    history: history.summary,
    auditEvents: [...new Set(eventTypes.filter((type) => [
      "system.files.directory_created",
      "system.files.written",
      "system.files.read",
      "capability.invoked",
      "task.completed",
    ].includes(type)))],
  },
}, null, 2));
EOF
