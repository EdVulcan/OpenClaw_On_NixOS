#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-plugin-runtime-adapter-denial-recovery-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9410}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9411}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9412}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9413}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9414}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9415}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9416}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9417}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9480}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-native-plugin-runtime-adapter-denial-recovery-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-native-plugin-runtime-adapter-denial-recovery-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$WORKSPACE_DIR/extensions/provider-a" "$WORKSPACE_DIR/extensions/provider-b" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$WORKSPACE_DIR/ui"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"
for index in $(seq 1 9); do mkdir -p "$WORKSPACE_DIR/extensions/provider-extra-$index"; done

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-runtime-adapter-denial-recovery-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_RUNTIME_ADAPTER_DENIAL_RECOVERY_ROOT_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "extensions/*"
  - "packages/*"
  - "ui"
YAML
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{
  "name": "@openclaw/plugin-sdk",
  "version": "0.0.0-observer-runtime-adapter-denial-recovery-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo OBSERVER_RUNTIME_ADAPTER_DENIAL_RECOVERY_SDK_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const OBSERVER_RUNTIME_ADAPTER_DENIAL_RECOVERY_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

OPENCLAW_POST_JSON_DATA_FLAG="-d"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"


cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${TASK_FILE:-}" "${BLOCKED_FILE:-}" "${DENIED_FILE:-}" "${RECOVERED_FILE:-}" "${RECOVERED_BLOCKED_FILE:-}" "${APPROVED_FILE:-}" "${DEFERRED_FILE:-}" "${TASKS_FILE:-}" "${APPROVALS_FILE:-}" "${HISTORY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_FILE="$(mktemp)"
DENIED_FILE="$(mktemp)"
RECOVERED_FILE="$(mktemp)"
RECOVERED_BLOCKED_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
DEFERRED_FILE="$(mktemp)"
TASKS_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
post_json "$CORE_URL/plugins/native-adapter/runtime-adapter-tasks" '{"capabilityId":"act.plugin.capability.invoke","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blocked = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (!taskResponse.ok || taskResponse.registry !== "openclaw-native-plugin-runtime-adapter-task-v0") {
  throw new Error(`observer native adapter task response mismatch: ${JSON.stringify(taskResponse)}`);
}
if (!blocked.ok || blocked.blocked !== true || blocked.reason !== "policy_requires_approval") {
  throw new Error(`observer native adapter task should block before denial: ${JSON.stringify(blocked)}`);
}
process.stdout.write(taskResponse.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/deny" '{"deniedBy":"dev-observer-openclaw-native-plugin-runtime-adapter-denial-recovery-check","reason":"observer denies native runtime adapter before recovery"}' > "$DENIED_FILE"

denied_task_id="$(node - <<'EOF' "$DENIED_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (denied.approval?.status !== "denied" || denied.task?.status !== "failed" || denied.task?.restorable !== true) {
  throw new Error(`observer denied native adapter task should fail and become restorable: ${JSON.stringify(denied)}`);
}
process.stdout.write(denied.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$denied_task_id/recover" '{}' > "$RECOVERED_FILE"

recovered_approval_id="$(node - <<'EOF' "$DENIED_FILE" "$RECOVERED_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (!recovered.ok || recovered.task?.status !== "queued") {
  throw new Error(`observer recovered native adapter task should be queued: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.type !== "native_plugin_runtime_adapter_implementation") {
  throw new Error(`observer recovered task should remain native adapter type: ${JSON.stringify(recovered.task)}`);
}
if (recovered.task?.approval?.requestId === denied.approval?.id || recovered.task?.approval?.status !== "pending") {
  throw new Error(`observer recovered native adapter should use a fresh pending approval: ${JSON.stringify(recovered.task?.approval)}`);
}
process.stdout.write(recovered.task.approval.requestId);
EOF
)"

post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_BLOCKED_FILE"
post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-observer-openclaw-native-plugin-runtime-adapter-denial-recovery-check","reason":"observer approves recovered native runtime adapter"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$DEFERRED_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=10" > "$TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$DENIED_FILE" "$RECOVERED_FILE" "$RECOVERED_BLOCKED_FILE" "$APPROVED_FILE" "$DEFERRED_FILE" "$TASKS_FILE" "$APPROVALS_FILE" "$HISTORY_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const denied = readJson(4);
const recovered = readJson(5);
const recoveredBlocked = readJson(6);
const approved = readJson(7);
const deferred = readJson(8);
const tasks = readJson(9);
const approvals = readJson(10);
const history = readJson(11);
const raw = JSON.stringify({ html, client, denied, recovered, recoveredBlocked, approved, deferred, tasks, approvals, history });

for (const token of [
  "native-plugin-runtime-adapter-task-button",
  "recover-selected-task-button",
  "approval-json",
  "approval-pending-count",
  "task-list-items",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of [
  "/plugins/native-adapter/runtime-adapter-tasks",
  "createNativePluginRuntimeAdapterApprovalTask",
  "recoverSelectedTask",
  "refreshApprovalState",
  "refreshTaskList",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (recoveredBlocked.blocked !== true || recoveredBlocked.reason !== "policy_requires_approval") {
  throw new Error(`observer recovered native adapter should block before fresh approval: ${JSON.stringify(recoveredBlocked)}`);
}
if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`observer recovered native adapter approval should become audited: ${JSON.stringify(approved)}`);
}
if (deferred.blocked !== true || deferred.reason !== "native_plugin_runtime_adapter_implementation_deferred") {
  throw new Error(`observer approved native adapter recovery should remain deferred: ${JSON.stringify(deferred)}`);
}
if (history.summary?.total !== 0 || history.summary?.invoked !== 0 || history.summary?.blocked !== 0) {
  throw new Error(`observer native adapter denial recovery must not invoke capabilities: ${JSON.stringify(history.summary)}`);
}
if (approvals.summary?.counts?.denied !== 1 || approvals.summary?.counts?.approved !== 1 || approvals.summary?.counts?.pending !== 0) {
  throw new Error(`observer approvals should show denied original plus approved recovery: ${JSON.stringify(approvals.summary)}`);
}
if (tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.queued !== 1) {
  throw new Error(`observer tasks should show failed source plus deferred recovered native adapter task: ${JSON.stringify(tasks.summary)}`);
}
for (const secret of [
  "OBSERVER_RUNTIME_ADAPTER_DENIAL_RECOVERY_ROOT_SECRET_BUILD_BODY",
  "OBSERVER_RUNTIME_ADAPTER_DENIAL_RECOVERY_SDK_SECRET_BUILD_BODY",
  "OBSERVER_RUNTIME_ADAPTER_DENIAL_RECOVERY_SDK_SECRET_SOURCE_CONTENT",
  "0.0.0-observer-runtime-adapter-denial-recovery-fixture",
]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer native adapter denial recovery leaked source, script, or package detail: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawNativePluginRuntimeAdapterDenialRecovery: {
    html: "controls-visible",
    deniedTask: denied.task.id,
    recoveredTask: recovered.task.id,
    deferredReason: deferred.reason,
    approvals: approvals.summary,
  },
}, null, 2));
EOF
