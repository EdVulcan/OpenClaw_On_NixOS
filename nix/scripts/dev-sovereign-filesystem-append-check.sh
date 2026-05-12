#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-filesystem-append-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/append-workspace"
TARGET_FILE="$WORKSPACE_DIR/append.txt"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8330}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8331}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8332}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8333}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8334}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8335}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8336}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8337}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8400}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-filesystem-append-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-filesystem-append-check-events.jsonl}"

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
    "${CHANGES_FILE:-}" \
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
CHANGES_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"
ESCAPE_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/capabilities" > "$REGISTRY_FILE"
post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Sovereign body appends to a filesystem text file\",\"type\":\"system_task\",\"policy\":{\"intent\":\"filesystem.mkdir\"},\"actions\":[{\"kind\":\"filesystem.mkdir\",\"intent\":\"filesystem.mkdir\",\"params\":{\"path\":\"$WORKSPACE_DIR\",\"recursive\":true}},{\"kind\":\"filesystem.write_text\",\"intent\":\"filesystem.write_text\",\"params\":{\"path\":\"$TARGET_FILE\",\"content\":\"append-base\",\"overwrite\":false}},{\"kind\":\"filesystem.append_text\",\"intent\":\"filesystem.append_text\",\"params\":{\"path\":\"$TARGET_FILE\",\"content\":\"+tail\"}},{\"kind\":\"filesystem.read_text\",\"intent\":\"filesystem.read_text\",\"params\":{\"path\":\"$TARGET_FILE\"}}]}" > "$PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/filesystem/changes?limit=10" > "$CHANGES_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=180" > "$EVENTS_FILE"
curl --silent -X POST "$SYSTEM_URL/system/files/append-text" -H 'content-type: application/json' -d '{"path":"/etc/openclaw-should-not-append","content":"nope"}' > "$ESCAPE_FILE" || true

node - <<'EOF' "$REGISTRY_FILE" "$PLAN_FILE" "$STEP_FILE" "$CHANGES_FILE" "$HISTORY_FILE" "$EVENTS_FILE" "$ESCAPE_FILE" "$TARGET_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const registry = readJson(2);
const plan = readJson(3);
const step = readJson(4);
const changes = readJson(5);
const history = readJson(6);
const events = readJson(7);
const escape = readJson(8);
const targetFile = process.argv[9];
const baseContent = "append-base";
const appendedContent = "+tail";
const expectedContent = `${baseContent}${appendedContent}`;

const byId = Object.fromEntries((registry.capabilities ?? []).map((capability) => [capability.id, capability]));
const appendCapability = byId["act.filesystem.append_text"];
if (!appendCapability || appendCapability.governance !== "require_approval" || appendCapability.requiresApproval !== true) {
  throw new Error(`filesystem append capability should be high-risk approval-gated by default: ${JSON.stringify(appendCapability)}`);
}
if (!appendCapability.intents?.includes("filesystem.append_text") || appendCapability.domains?.[0] !== "body_internal") {
  throw new Error(`filesystem append capability should be body-internal with append intent: ${JSON.stringify(appendCapability)}`);
}

const actionSteps = (plan.plan?.steps ?? []).filter((item) => item.phase === "acting_on_target");
if (
  actionSteps.length !== 4
  || actionSteps[0].capabilityId !== "act.filesystem.mkdir"
  || actionSteps[1].capabilityId !== "act.filesystem.write_text"
  || actionSteps[2].capabilityId !== "act.filesystem.append_text"
  || actionSteps[3].capabilityId !== "sense.filesystem.read"
) {
  throw new Error(`plan should map mkdir, write, append, and read_text to filesystem capabilities: ${JSON.stringify(actionSteps)}`);
}
if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error(`operator should complete filesystem append chain: ${JSON.stringify(step.task)}`);
}
if (fs.readFileSync(targetFile, "utf8") !== expectedContent) {
  throw new Error("filesystem append chain should append text to the existing file");
}

const invocations = step.execution?.capabilityInvocations ?? [];
const appendInvocation = invocations.find((item) => item.capabilityId === "act.filesystem.append_text");
if (
  invocations.length !== 4
  || !appendInvocation
  || appendInvocation.summary?.kind !== "filesystem.append_text"
  || appendInvocation.summary?.path !== targetFile
  || appendInvocation.summary?.contentBytes !== Buffer.byteLength(appendedContent)
  || appendInvocation.summary?.previousBytes !== Buffer.byteLength(baseContent)
  || appendInvocation.summary?.totalBytes !== Buffer.byteLength(expectedContent)
) {
  throw new Error(`operator execution should summarize append_text invocation: ${JSON.stringify(invocations)}`);
}

if (
  history.summary?.total !== 4
  || history.summary?.invoked !== 4
  || history.summary?.blocked !== 0
  || history.summary?.byCapability?.["act.filesystem.mkdir"] !== 1
  || history.summary?.byCapability?.["act.filesystem.write_text"] !== 1
  || history.summary?.byCapability?.["act.filesystem.append_text"] !== 1
  || history.summary?.byCapability?.["sense.filesystem.read"] !== 1
  || history.items?.some((item) => item.policy?.decision !== "audit_only")
) {
  throw new Error(`capability history should record append chain under audit-only governance: ${JSON.stringify(history)}`);
}

if (
  changes.summary?.total !== 3
  || changes.summary?.mkdir !== 1
  || changes.summary?.write_text !== 1
  || changes.summary?.append_text !== 1
  || changes.summary?.byCapability?.["act.filesystem.append_text"] !== 1
) {
  throw new Error(`filesystem change ledger should include append_text: ${JSON.stringify(changes.summary)}`);
}
const appendChange = (changes.items ?? []).find((item) => item.change === "append_text");
if (
  !appendChange
  || appendChange.path !== targetFile
  || appendChange.contentBytes !== Buffer.byteLength(appendedContent)
  || appendChange.previousBytes !== Buffer.byteLength(baseContent)
  || appendChange.totalBytes !== Buffer.byteLength(expectedContent)
) {
  throw new Error(`filesystem change ledger should expose append_text metadata: ${JSON.stringify(changes.items)}`);
}

if (escape.ok !== false || escape.code !== "PATH_OUTSIDE_ALLOWED_ROOTS") {
  throw new Error(`append endpoint should reject paths outside allowed roots: ${JSON.stringify(escape)}`);
}

const eventTypes = (events.items ?? []).map((event) => event.type);
for (const type of ["system.files.directory_created", "system.files.written", "system.files.appended", "system.files.read", "capability.invoked", "task.completed"]) {
  if (!eventTypes.includes(type)) {
    throw new Error(`audit log should include ${type}: ${JSON.stringify(eventTypes)}`);
  }
}

console.log(JSON.stringify({
  sovereignFilesystemAppend: {
    capability: {
      id: appendCapability.id,
      governance: appendCapability.governance,
      requiresApproval: appendCapability.requiresApproval,
    },
    task: {
      status: step.task?.status,
      invocations: invocations.map((item) => ({
        capabilityId: item.capabilityId,
        kind: item.summary?.kind,
        path: item.summary?.path,
        contentBytes: item.summary?.contentBytes ?? null,
        totalBytes: item.summary?.totalBytes ?? null,
      })),
    },
    file: {
      path: targetFile,
      content: fs.readFileSync(targetFile, "utf8"),
      bytes: Buffer.byteLength(expectedContent),
    },
    rejectedPath: {
      ok: escape.ok,
      code: escape.code,
    },
    changes: changes.summary,
    history: history.summary,
    auditEvents: [...new Set(eventTypes.filter((type) => [
      "system.files.directory_created",
      "system.files.written",
      "system.files.appended",
      "system.files.read",
      "capability.invoked",
      "task.completed",
    ].includes(type)))],
  },
}, null, 2));
EOF
