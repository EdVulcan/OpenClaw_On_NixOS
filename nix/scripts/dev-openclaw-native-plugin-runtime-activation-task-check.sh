#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-native-plugin-runtime-activation-task-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9280}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9281}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9282}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9283}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9284}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9285}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9286}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9287}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9350}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-native-plugin-runtime-activation-task-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-native-plugin-runtime-activation-task-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$WORKSPACE_DIR/extensions/provider-a" "$WORKSPACE_DIR/extensions/provider-b" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$WORKSPACE_DIR/ui"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"
for index in $(seq 1 9); do mkdir -p "$WORKSPACE_DIR/extensions/provider-extra-$index"; done

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-runtime-activation-task-fixture",
  "private": true,
  "scripts": {
    "build": "echo RUNTIME_ACTIVATION_TASK_ROOT_SECRET_BUILD_BODY"
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
  "version": "0.0.0-runtime-activation-task-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo RUNTIME_ACTIVATION_TASK_SDK_SECRET_BUILD_BODY"
  },
  "dependencies": {
    "zod": "999.0.0-runtime-activation-task-secret-version"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const RUNTIME_ACTIVATION_TASK_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

post_json() {
  local url="$1"
  local payload="$2"
  curl --silent --fail -H "content-type: application/json" -d "$payload" "$url"
}

cleanup() {
  rm -f "${DRAFT_FILE:-}" "${REJECTED_FILE:-}" "${TASK_FILE:-}" "${BLOCKED_FILE:-}" "${APPROVED_FILE:-}" "${DEFERRED_FILE:-}" "${HISTORY_FILE:-}" "${APPROVALS_FILE:-}" "${TASKS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

DRAFT_FILE="$(mktemp)"
REJECTED_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
DEFERRED_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
TASKS_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/plugins/native-adapter/runtime-activation-task-draft" > "$DRAFT_FILE"
curl --silent --output "$REJECTED_FILE" --write-out "%{http_code}" \
  -H "content-type: application/json" \
  -d '{"capabilityId":"act.plugin.capability.invoke"}' \
  "$CORE_URL/plugins/native-adapter/runtime-activation-tasks" | grep -qx "400"
post_json "$CORE_URL/plugins/native-adapter/runtime-activation-tasks" '{"capabilityId":"act.plugin.capability.invoke","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blocked = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!taskResponse.ok || taskResponse.registry !== "openclaw-native-plugin-runtime-activation-task-v0") {
  throw new Error(`runtime activation task response mismatch: ${JSON.stringify(taskResponse)}`);
}
if (!blocked.ok || blocked.ran !== false || blocked.blocked !== true || blocked.reason !== "policy_requires_approval") {
  throw new Error(`operator should block native runtime activation before approval: ${JSON.stringify(blocked)}`);
}
if (!blocked.approval?.id || blocked.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked runtime activation step should expose linked approval: ${JSON.stringify(blocked.approval)}`);
}
process.stdout.write(blocked.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-openclaw-native-plugin-runtime-activation-task-check","reason":"approve native plugin runtime activation fixture"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$DEFERRED_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=10" > "$TASKS_FILE"

node - <<'EOF' "$DRAFT_FILE" "$REJECTED_FILE" "$TASK_FILE" "$BLOCKED_FILE" "$APPROVED_FILE" "$DEFERRED_FILE" "$HISTORY_FILE" "$APPROVALS_FILE" "$TASKS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const draft = readJson(2);
const rejected = readJson(3);
const taskResponse = readJson(4);
const blocked = readJson(5);
const approved = readJson(6);
const deferred = readJson(7);
const history = readJson(8);
const approvals = readJson(9);
const tasks = readJson(10);
const raw = JSON.stringify({ draft, taskResponse, blocked, approved, deferred, history, approvals, tasks });

if (rejected.ok !== false || !String(rejected.error ?? "").includes("confirm=true")) {
  throw new Error(`native runtime activation task creation should require explicit confirmation: ${JSON.stringify(rejected)}`);
}
if (
  !draft.ok
  || draft.registry !== "openclaw-native-plugin-runtime-activation-task-draft-v0"
  || draft.mode !== "approval-gated-native-plugin-runtime-activation-task-draft"
  || draft.sourceRegistry !== "openclaw-native-plugin-runtime-activation-plan-v0"
  || draft.activationPlan?.summary?.blockedRequired !== 3
  || draft.policy?.decision?.decision !== "require_approval"
  || draft.governance?.createsTask !== false
  || draft.governance?.createsApproval !== false
  || draft.governance?.canImportModule !== false
) {
  throw new Error(`native runtime activation task draft mismatch: ${JSON.stringify(draft)}`);
}
if (
  !taskResponse.ok
  || taskResponse.registry !== "openclaw-native-plugin-runtime-activation-task-v0"
  || taskResponse.mode !== "approval-gated-native-plugin-runtime-activation-task"
  || taskResponse.sourceRegistry !== "openclaw-native-plugin-runtime-activation-task-draft-v0"
) {
  throw new Error(`native runtime activation task response mismatch: ${JSON.stringify(taskResponse)}`);
}
const task = taskResponse.task ?? {};
if (
  task.status !== "queued"
  || task.type !== "native_plugin_runtime_activation"
  || task.workViewStrategy !== "native-plugin-runtime-activation"
  || task.plan?.strategy !== "native-plugin-runtime-activation-v0"
  || task.policy?.decision?.decision !== "require_approval"
  || task.approval?.required !== true
  || task.plan?.governance?.canImportModule !== false
  || task.plan?.governance?.canExecutePluginCode !== false
  || task.plan?.governance?.canActivateRuntime !== false
) {
  throw new Error(`native runtime activation task should be queued behind explicit approval: ${JSON.stringify(task)}`);
}
if (!taskResponse.approval?.id || taskResponse.approval?.status !== "pending" || taskResponse.approval?.taskId !== task.id) {
  throw new Error(`native runtime activation task should create a linked pending approval: ${JSON.stringify(taskResponse.approval)}`);
}
if (
  taskResponse.governance?.createsTask !== true
  || taskResponse.governance?.createsApproval !== true
  || taskResponse.governance?.canExecuteWithoutApproval !== false
  || taskResponse.governance?.canImportModule !== false
  || taskResponse.governance?.canExecutePluginCode !== false
  || taskResponse.governance?.canActivateRuntime !== false
  || taskResponse.governance?.executed !== false
) {
  throw new Error(`native runtime activation governance mismatch: ${JSON.stringify(taskResponse.governance)}`);
}
if (!blocked.ok || blocked.ran !== false || blocked.blocked !== true || blocked.reason !== "policy_requires_approval") {
  throw new Error(`operator should block native runtime activation before approval: ${JSON.stringify(blocked)}`);
}
if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`native runtime activation approval should convert task to audited deferred execution: ${JSON.stringify(approved)}`);
}
if (!deferred.ok || deferred.ran !== false || deferred.blocked !== true || deferred.reason !== "native_plugin_runtime_activation_deferred") {
  throw new Error(`approved native runtime activation should remain runtime-adapter deferred: ${JSON.stringify(deferred)}`);
}
if (deferred.task?.id !== task.id || deferred.task?.status !== "queued" || deferred.task?.executionPhase !== "runtime_activation_deferred") {
  throw new Error(`deferred native runtime activation task should stay queued for future runtime adapter: ${JSON.stringify(deferred.task)}`);
}
if (history.summary?.total !== 0 || history.summary?.invoked !== 0 || history.summary?.blocked !== 0) {
  throw new Error(`native runtime activation task must not invoke capabilities: ${JSON.stringify(history.summary)}`);
}
if (approvals.summary?.counts?.approved !== 1 || approvals.summary?.counts?.pending !== 0) {
  throw new Error(`approval summary should show approved native runtime activation task only: ${JSON.stringify(approvals.summary)}`);
}
if (tasks.summary?.counts?.queued !== 1 || tasks.summary?.currentTaskId !== task.id) {
  throw new Error(`task summary should retain deferred native runtime activation task as current queued work: ${JSON.stringify(tasks.summary)}`);
}
for (const secret of [
  "RUNTIME_ACTIVATION_TASK_ROOT_SECRET_BUILD_BODY",
  "RUNTIME_ACTIVATION_TASK_SDK_SECRET_BUILD_BODY",
  "RUNTIME_ACTIVATION_TASK_SDK_SECRET_SOURCE_CONTENT",
  "999.0.0-runtime-activation-task-secret-version",
  "0.0.0-runtime-activation-task-fixture",
]) {
  if (raw.includes(secret)) {
    throw new Error(`native runtime activation task leaked source, script, dependency, or package detail: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawNativePluginRuntimeActivationTask: {
    registry: taskResponse.registry,
    task: {
      id: task.id,
      status: task.status,
      strategy: task.plan.strategy,
      phase: deferred.task.executionPhase,
    },
    approval: {
      id: taskResponse.approval.id,
      status: approved.approval.status,
    },
    operatorGate: {
      blocked: deferred.blocked,
      reason: deferred.reason,
    },
  },
}, null, 2));
EOF
