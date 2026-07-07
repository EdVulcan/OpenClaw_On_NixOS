#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-plugin-search-web-adapter-runtime-activation-task-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
SDK_SOURCE_DIR="$WORKSPACE_DIR/src/plugin-sdk"
EXTENSIONS_DIR="$WORKSPACE_DIR/extensions"
QUERY_SECRET="OBSERVER_SEARCH_WEB_ACTIVATION_TASK_QUERY_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10100}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10101}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10102}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10103}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10104}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10105}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10106}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10107}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10108}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-plugin-search-web-adapter-runtime-activation-task-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-plugin-search-web-adapter-runtime-activation-task-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

OPENCLAW_POST_JSON_DATA_FLAG="-d"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"


"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p \
  "$WORKSPACE_DIR/.git" \
  "$WORKSPACE_DIR/.openclaw" \
  "$PLUGIN_SDK_DIR/src" \
  "$PLUGIN_SDK_DIR/types" \
  "$SDK_SOURCE_DIR" \
  "$EXTENSIONS_DIR/web" \
  "$EXTENSIONS_DIR/memory"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-search-web-activation-task-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_SEARCH_WEB_ACTIVATION_TASK_ROOT_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{
  "name": "@openclaw/plugin-sdk",
  "version": "0.0.0-observer-search-web-activation-task-sdk-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo OBSERVER_SEARCH_WEB_ACTIVATION_TASK_SDK_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const OBSERVER_SEARCH_WEB_ACTIVATION_TASK_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type ObserverSearchWebActivationTaskManifest = { pluginId: string };
TS
cat > "$SDK_SOURCE_DIR/core.ts" <<'TS'
export function defineObserverSearchWebActivationTaskSourceContract() {
  return {
    adapterId: "openclaw.search_web.native-adapter",
    networkRuntimeDeferred: true,
  };
}
TS
cat > "$EXTENSIONS_DIR/web/openclaw.plugin.json" <<'JSON'
{
  "id": "openclaw.web-search",
  "providers": ["exa"],
  "providerEndpoints": [
    {
      "name": "exa",
      "hosts": ["OBSERVER_SEARCH_WEB_ACTIVATION_TASK_SECRET_ENDPOINT.example.test"]
    }
  ],
  "syntheticAuthRefs": ["web-search-key"],
  "contracts": {
    "tools": ["search", "fetch"],
    "web": ["query"]
  }
}
JSON
cat > "$EXTENSIONS_DIR/memory/openclaw.plugin.json" <<'JSON'
{
  "id": "openclaw.memory",
  "providers": ["lancedb"],
  "providerAuthEnvVars": {
    "lancedb": ["OBSERVER_SEARCH_WEB_ACTIVATION_TASK_SECRET_AUTH_ENV"]
  },
  "contracts": {
    "tools": ["remember"],
    "memory": ["workspace-index"]
  }
}
JSON

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${TASK_FILE:-}" "${BLOCKED_FILE:-}" "${APPROVED_FILE:-}" "${DEFERRED_FILE:-}" "${HISTORY_FILE:-}" "${APPROVALS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
DEFERRED_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
post_json "$CORE_URL/plugins/native-adapter/plugin-search-web-adapter-runtime-activation-tasks" "{\"providerContractId\":\"openclaw.web-search\",\"query\":\"$QUERY_SECRET\",\"confirm\":true}" > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blocked = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (!taskResponse.approval?.id || blocked.approval?.id !== taskResponse.approval.id) {
  throw new Error(`Observer runtime activation task should expose a linked approval: ${JSON.stringify({ taskResponse, blocked })}`);
}
process.stdout.write(taskResponse.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-observer-openclaw-plugin-search-web-adapter-runtime-activation-task-check","reason":"approve observer search/web runtime activation fixture"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$DEFERRED_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$TASK_FILE" "$BLOCKED_FILE" "$APPROVED_FILE" "$DEFERRED_FILE" "$HISTORY_FILE" "$APPROVALS_FILE" "$QUERY_SECRET"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const taskResponse = readJson(4);
const blocked = readJson(5);
const approved = readJson(6);
const deferred = readJson(7);
const history = readJson(8);
const approvals = readJson(9);
const querySecret = process.argv[10];
const raw = JSON.stringify({ html, client, taskResponse, blocked, approved, deferred, history, approvals });

for (const token of [
  "OpenClaw Search/Web Runtime Activation Plan",
  "plugin-search-web-activation-task-button",
  "Create Search/Web Activation Task",
  "plugin-search-web-activation-json",
  "approval-json",
  "task-list-items",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of [
  "/plugins/native-adapter/plugin-search-web-adapter-runtime-activation-tasks",
  "createPluginSearchWebRuntimeActivationApprovalTask",
  "pluginSearchWebActivationTaskButton",
  "network runtime remains deferred",
  "refreshPluginSearchWebRuntimeActivationPlan",
  "refreshApprovalState",
  "refreshTaskList",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (
  !taskResponse.ok
  || taskResponse.registry !== "openclaw-plugin-search-web-adapter-runtime-activation-task-v0"
  || taskResponse.mode !== "approval-gated-search-web-runtime-activation-task"
  || taskResponse.provider?.manifestId !== "openclaw.web-search"
  || taskResponse.governance?.createsTask !== true
  || taskResponse.governance?.createsApproval !== true
  || taskResponse.governance?.canUseNetwork !== false
  || taskResponse.governance?.canExecutePluginCode !== false
  || taskResponse.governance?.canActivateRuntime !== false
) {
  throw new Error(`Observer runtime activation task response mismatch: ${JSON.stringify(taskResponse)}`);
}
if (!blocked.ok || blocked.ran !== false || blocked.blocked !== true || blocked.reason !== "policy_requires_approval") {
  throw new Error(`Observer runtime activation task should block before approval: ${JSON.stringify(blocked)}`);
}
if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`Observer runtime activation approval should audit the task: ${JSON.stringify(approved)}`);
}
if (!deferred.ok || deferred.ran !== false || deferred.blocked !== true || deferred.reason !== "search_web_network_runtime_adapter_deferred") {
  throw new Error(`Observer runtime activation task should defer network runtime after approval: ${JSON.stringify(deferred)}`);
}
if (history.summary?.total !== 0 || history.summary?.invoked !== 0 || history.summary?.blocked !== 0) {
  throw new Error(`Observer runtime activation task must not invoke capabilities or network providers: ${JSON.stringify(history.summary)}`);
}
if (approvals.summary?.counts?.approved !== 1 || approvals.summary?.counts?.pending !== 0) {
  throw new Error(`Observer runtime activation approval summary mismatch: ${JSON.stringify(approvals.summary)}`);
}
for (const secret of [
  querySecret,
  "OBSERVER_SEARCH_WEB_ACTIVATION_TASK_ROOT_SECRET_BUILD_BODY",
  "OBSERVER_SEARCH_WEB_ACTIVATION_TASK_SDK_SECRET_BUILD_BODY",
  "OBSERVER_SEARCH_WEB_ACTIVATION_TASK_SDK_SECRET_SOURCE_CONTENT",
  "OBSERVER_SEARCH_WEB_ACTIVATION_TASK_SECRET_ENDPOINT",
  "OBSERVER_SEARCH_WEB_ACTIVATION_TASK_SECRET_AUTH_ENV",
  "0.0.0-observer-search-web-activation-task-fixture",
  "0.0.0-observer-search-web-activation-task-sdk-fixture",
]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer runtime activation task leaked query, source, endpoint, auth env, or version detail: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawPluginSearchWebAdapterRuntimeActivationTask: {
    html: "control-visible",
    registry: taskResponse.registry,
    provider: taskResponse.provider.manifestId,
    task: taskResponse.task.id,
    approval: approved.approval.status,
    deferredReason: deferred.reason,
  },
}, null, 2));
EOF
