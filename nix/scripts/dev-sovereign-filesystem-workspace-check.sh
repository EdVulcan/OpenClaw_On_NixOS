#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-filesystem-workspace-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/agent-workspace/nested"
TARGET_FILE="$WORKSPACE_DIR/note.txt"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8300}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8301}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8302}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8303}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8304}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8305}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8306}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8307}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8370}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-filesystem-workspace-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-filesystem-workspace-check-events.jsonl}"

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
post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Sovereign body creates a filesystem workspace\",\"type\":\"system_task\",\"policy\":{\"intent\":\"filesystem.mkdir\"},\"actions\":[{\"kind\":\"filesystem.mkdir\",\"intent\":\"filesystem.mkdir\",\"params\":{\"path\":\"$WORKSPACE_DIR\",\"recursive\":true}},{\"kind\":\"filesystem.write\",\"intent\":\"filesystem.write\",\"params\":{\"path\":\"$TARGET_FILE\",\"content\":\"workspace-ready\",\"overwrite\":false}},{\"kind\":\"filesystem.metadata\",\"intent\":\"filesystem.metadata\",\"params\":{\"path\":\"$TARGET_FILE\"}}]}" > "$PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=160" > "$EVENTS_FILE"
curl --silent -X POST "$SYSTEM_URL/system/files/mkdir" -H 'content-type: application/json' -d '{"path":"/etc/openclaw-should-not-mkdir","recursive":true}' > "$ESCAPE_FILE" || true

node - <<'EOF' "$REGISTRY_FILE" "$PLAN_FILE" "$STEP_FILE" "$HISTORY_FILE" "$EVENTS_FILE" "$ESCAPE_FILE" "$WORKSPACE_DIR" "$TARGET_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const registry = readJson(2);
const plan = readJson(3);
const step = readJson(4);
const history = readJson(5);
const events = readJson(6);
const escape = readJson(7);
const workspaceDir = process.argv[8];
const targetFile = process.argv[9];

const byId = Object.fromEntries((registry.capabilities ?? []).map((capability) => [capability.id, capability]));
const mkdirCapability = byId["act.filesystem.mkdir"];
if (!mkdirCapability || mkdirCapability.governance !== "require_approval" || mkdirCapability.requiresApproval !== true) {
  throw new Error(`filesystem mkdir capability should be high-risk approval-gated by default: ${JSON.stringify(mkdirCapability)}`);
}
if (!mkdirCapability.intents?.includes("filesystem.mkdir") || mkdirCapability.domains?.[0] !== "body_internal") {
  throw new Error(`filesystem mkdir capability should be body-internal with filesystem.mkdir intent: ${JSON.stringify(mkdirCapability)}`);
}

const actionSteps = (plan.plan?.steps ?? []).filter((item) => item.phase === "acting_on_target");
if (
  actionSteps.length !== 3
  || actionSteps[0].capabilityId !== "act.filesystem.mkdir"
  || actionSteps[1].capabilityId !== "act.filesystem.write_text"
  || actionSteps[2].capabilityId !== "sense.filesystem.read"
) {
  throw new Error(`plan should map mkdir, write, and metadata to filesystem capabilities: ${JSON.stringify(actionSteps)}`);
}
if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error(`operator should complete filesystem workspace chain: ${JSON.stringify(step.task)}`);
}
if (!fs.statSync(workspaceDir).isDirectory() || fs.readFileSync(targetFile, "utf8") !== "workspace-ready") {
  throw new Error("filesystem workspace chain should create the directory and write the file");
}

const invocations = step.execution?.capabilityInvocations ?? [];
if (
  invocations.length !== 3
  || invocations[0].capabilityId !== "act.filesystem.mkdir"
  || invocations[0].summary?.kind !== "filesystem.mkdir"
  || invocations[0].summary?.created !== true
  || invocations[1].capabilityId !== "act.filesystem.write_text"
  || invocations[1].summary?.contentBytes !== Buffer.byteLength("workspace-ready")
  || invocations[2].capabilityId !== "sense.filesystem.read"
  || invocations[2].summary?.path !== targetFile
) {
  throw new Error(`operator execution should record mkdir, write, and metadata invocations: ${JSON.stringify(invocations)}`);
}

if (
  history.summary?.total !== 3
  || history.summary?.invoked !== 3
  || history.summary?.blocked !== 0
  || history.summary?.byCapability?.["act.filesystem.mkdir"] !== 1
  || history.summary?.byCapability?.["act.filesystem.write_text"] !== 1
  || history.summary?.byCapability?.["sense.filesystem.read"] !== 1
  || history.items?.some((item) => item.policy?.decision !== "audit_only")
) {
  throw new Error(`capability history should record all filesystem workspace invocations: ${JSON.stringify(history)}`);
}

if (escape.ok !== false || escape.code !== "PATH_OUTSIDE_ALLOWED_ROOTS") {
  throw new Error(`mkdir endpoint should reject paths outside allowed roots: ${JSON.stringify(escape)}`);
}

const eventTypes = (events.items ?? []).map((event) => event.type);
for (const type of ["system.files.directory_created", "system.files.written", "capability.invoked", "task.completed"]) {
  if (!eventTypes.includes(type)) {
    throw new Error(`audit log should include ${type}: ${JSON.stringify(eventTypes)}`);
  }
}

console.log(JSON.stringify({
  sovereignFilesystemWorkspace: {
    capability: {
      id: mkdirCapability.id,
      governance: mkdirCapability.governance,
      requiresApproval: mkdirCapability.requiresApproval,
    },
    task: {
      status: step.task?.status,
      taskPolicyReason: step.task?.policy?.decision?.reason,
      invocations: invocations.map((item) => ({
        capabilityId: item.capabilityId,
        kind: item.summary?.kind,
        path: item.summary?.path,
      })),
    },
    workspace: {
      directory: workspaceDir,
      file: targetFile,
      content: fs.readFileSync(targetFile, "utf8"),
    },
    rejectedPath: {
      ok: escape.ok,
      code: escape.code,
    },
    history: history.summary,
    auditEvents: [...new Set(eventTypes.filter((type) => [
      "system.files.directory_created",
      "system.files.written",
      "capability.invoked",
      "task.completed",
    ].includes(type)))],
  },
}, null, 2));
EOF
