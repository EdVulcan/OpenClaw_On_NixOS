#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-plugin-search-web-adapter-runtime-activation-persistence-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
SDK_SOURCE_DIR="$WORKSPACE_DIR/src/plugin-sdk"
EXTENSIONS_DIR="$WORKSPACE_DIR/extensions"
QUERY_SECRET="OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_QUERY_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10160}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10161}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10162}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10163}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10164}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10165}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10166}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10167}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10168}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-plugin-search-web-adapter-runtime-activation-persistence-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-plugin-search-web-adapter-runtime-activation-persistence-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

post_json() {
  curl --silent --fail -X POST "$1" -H 'content-type: application/json' -d "$2"
}

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
  "version": "0.0.0-observer-search-web-activation-persistence-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_ROOT_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{
  "name": "@openclaw/plugin-sdk",
  "version": "0.0.0-observer-search-web-activation-persistence-sdk-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_SDK_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type ObserverSearchWebActivationPersistenceManifest = { pluginId: string };
TS
cat > "$SDK_SOURCE_DIR/core.ts" <<'TS'
export function defineObserverSearchWebActivationPersistenceSourceContract() {
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
      "hosts": ["OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_SECRET_ENDPOINT.example.test"]
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
    "lancedb": ["OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_SECRET_AUTH_ENV"]
  },
  "contracts": {
    "tools": ["remember"],
    "memory": ["workspace-index"]
  }
}
JSON

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${TASK_FILE:-}" "${BLOCKED_FILE:-}" "${POST_PENDING_RESTART_TASKS_FILE:-}" "${POST_PENDING_RESTART_APPROVALS_FILE:-}" "${DENIED_FILE:-}" "${RECOVERED_FILE:-}" "${POST_RECOVERY_RESTART_TASKS_FILE:-}" "${POST_RECOVERY_RESTART_APPROVALS_FILE:-}" "${RECOVERED_APPROVED_FILE:-}" "${DEFERRED_FILE:-}" "${POST_FINAL_RESTART_TASKS_FILE:-}" "${POST_FINAL_RESTART_APPROVALS_FILE:-}" "${POST_FINAL_RESTART_HISTORY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_FILE="$(mktemp)"
POST_PENDING_RESTART_TASKS_FILE="$(mktemp)"
POST_PENDING_RESTART_APPROVALS_FILE="$(mktemp)"
DENIED_FILE="$(mktemp)"
RECOVERED_FILE="$(mktemp)"
POST_RECOVERY_RESTART_TASKS_FILE="$(mktemp)"
POST_RECOVERY_RESTART_APPROVALS_FILE="$(mktemp)"
RECOVERED_APPROVED_FILE="$(mktemp)"
DEFERRED_FILE="$(mktemp)"
POST_FINAL_RESTART_TASKS_FILE="$(mktemp)"
POST_FINAL_RESTART_APPROVALS_FILE="$(mktemp)"
POST_FINAL_RESTART_HISTORY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
post_json "$CORE_URL/plugins/native-adapter/plugin-search-web-adapter-runtime-activation-tasks" "{\"providerContractId\":\"openclaw.web-search\",\"query\":\"$QUERY_SECRET\",\"confirm\":true}" > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_FILE"

approval_id="$(node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$TASK_FILE" "$BLOCKED_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const blocked = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
for (const token of ["plugin-search-web-activation-task-button", "recover-selected-task-button", "approval-json", "task-list-items"]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of ["createPluginSearchWebRuntimeActivationApprovalTask", "recoverSelectedTask", "refreshApprovalState", "refreshTaskList"]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (!taskResponse.ok || taskResponse.task?.type !== "openclaw_search_web_runtime_activation") {
  throw new Error(`observer persistence fixture should create activation task: ${JSON.stringify(taskResponse)}`);
}
if (!blocked.ok || blocked.blocked !== true || blocked.reason !== "policy_requires_approval") {
  throw new Error(`observer activation task should block before persisted approval: ${JSON.stringify(blocked)}`);
}
process.stdout.write(taskResponse.approval.id);
EOF
)"

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$CORE_URL/tasks?limit=8" > "$POST_PENDING_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$POST_PENDING_RESTART_APPROVALS_FILE"

node - <<'EOF' "$TASK_FILE" "$POST_PENDING_RESTART_TASKS_FILE" "$POST_PENDING_RESTART_APPROVALS_FILE" "$approval_id"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const tasks = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const approvals = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const approvalId = process.argv[5];
const task = (tasks.items ?? []).find((item) => item.id === taskResponse.task?.id);
if (!task || task.status !== "queued" || task.type !== "openclaw_search_web_runtime_activation" || task.approval?.requestId !== approvalId) {
  throw new Error(`observer pending activation task should survive restart: ${JSON.stringify(task)}`);
}
if (!(approvals.items ?? []).some((approval) => approval.id === approvalId && approval.status === "pending")) {
  throw new Error(`observer pending activation approval should survive restart: ${JSON.stringify(approvals.items)}`);
}
EOF

post_json "$CORE_URL/approvals/$approval_id/deny" '{"deniedBy":"dev-observer-openclaw-plugin-search-web-adapter-runtime-activation-persistence-check","reason":"deny persisted observer activation task before recovery"}' > "$DENIED_FILE"

denied_task_id="$(node - <<'EOF' "$DENIED_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!denied.ok || denied.task?.status !== "failed" || denied.task?.restorable !== true) {
  throw new Error(`observer denied persisted activation should fail and become restorable: ${JSON.stringify(denied)}`);
}
process.stdout.write(denied.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$denied_task_id/recover" '{}' > "$RECOVERED_FILE"

recovered_approval_id="$(node - <<'EOF' "$DENIED_FILE" "$RECOVERED_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (!recovered.ok || recovered.task?.status !== "queued" || recovered.task?.type !== "openclaw_search_web_runtime_activation") {
  throw new Error(`observer recovered persisted activation should be queued: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.recovery?.recoveredFromTaskId !== denied.task?.id || recovered.task?.approval?.requestId === denied.approval?.id) {
  throw new Error(`observer recovered persisted activation should preserve links and fresh approval: ${JSON.stringify(recovered)}`);
}
process.stdout.write(recovered.task.approval.requestId);
EOF
)"

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$CORE_URL/tasks?limit=8" > "$POST_RECOVERY_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$POST_RECOVERY_RESTART_APPROVALS_FILE"

node - <<'EOF' "$DENIED_FILE" "$RECOVERED_FILE" "$POST_RECOVERY_RESTART_TASKS_FILE" "$POST_RECOVERY_RESTART_APPROVALS_FILE" "$recovered_approval_id"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const tasks = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const approvals = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const recoveredApprovalId = process.argv[6];
const sourceAfter = (tasks.items ?? []).find((task) => task.id === denied.task?.id);
const recoveredAfter = (tasks.items ?? []).find((task) => task.id === recovered.task?.id);
if (!sourceAfter || sourceAfter.status !== "failed" || sourceAfter.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`observer failed activation source should survive restart: ${JSON.stringify(sourceAfter)}`);
}
if (!recoveredAfter || recoveredAfter.status !== "queued" || recoveredAfter.recovery?.recoveredFromTaskId !== sourceAfter.id || recoveredAfter.approval?.requestId !== recoveredApprovalId) {
  throw new Error(`observer queued recovered activation should survive restart: ${JSON.stringify(recoveredAfter)}`);
}
if (!(approvals.items ?? []).some((approval) => approval.id === recoveredApprovalId && approval.status === "pending")) {
  throw new Error(`observer recovered approval should survive restart pending: ${JSON.stringify(approvals.items)}`);
}
EOF

post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-observer-openclaw-plugin-search-web-adapter-runtime-activation-persistence-check","reason":"approve observer recovered persisted activation task"}' > "$RECOVERED_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$DEFERRED_FILE"

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$CORE_URL/tasks?limit=8" > "$POST_FINAL_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$POST_FINAL_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$POST_FINAL_RESTART_HISTORY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$DENIED_FILE" "$RECOVERED_FILE" "$DEFERRED_FILE" "$POST_FINAL_RESTART_TASKS_FILE" "$POST_FINAL_RESTART_APPROVALS_FILE" "$POST_FINAL_RESTART_HISTORY_FILE" "$QUERY_SECRET"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));
const html = readText(2);
const client = readText(3);
const denied = readJson(4);
const recovered = readJson(5);
const deferred = readJson(6);
const tasks = readJson(7);
const approvals = readJson(8);
const history = readJson(9);
const querySecret = process.argv[10];
const raw = JSON.stringify({ html, client, denied, recovered, deferred, tasks, approvals, history });
const sourceAfter = (tasks.items ?? []).find((task) => task.id === denied.task?.id);
const recoveredAfter = (tasks.items ?? []).find((task) => task.id === recovered.task?.id);

if (deferred.blocked !== true || deferred.reason !== "search_web_network_runtime_adapter_deferred") {
  throw new Error(`observer approved persisted activation should remain deferred: ${JSON.stringify(deferred)}`);
}
if (!sourceAfter || sourceAfter.status !== "failed" || sourceAfter.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`observer failed activation source should persist after final restart: ${JSON.stringify(sourceAfter)}`);
}
if (!recoveredAfter || recoveredAfter.status !== "queued" || recoveredAfter.executionPhase !== "network_runtime_deferred" || recoveredAfter.recovery?.recoveredFromTaskId !== sourceAfter.id) {
  throw new Error(`observer deferred recovered activation should persist after final restart: ${JSON.stringify(recoveredAfter)}`);
}
if (approvals.summary?.counts?.denied !== 1 || approvals.summary?.counts?.approved !== 1 || approvals.summary?.counts?.pending !== 0) {
  throw new Error(`observer final approval summary mismatch: ${JSON.stringify(approvals.summary)}`);
}
if (history.summary?.total !== 0 || history.summary?.invoked !== 0 || history.summary?.blocked !== 0) {
  throw new Error(`observer activation persistence must not invoke capabilities: ${JSON.stringify(history.summary)}`);
}
for (const secret of [
  querySecret,
  "OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_ROOT_SECRET_BUILD_BODY",
  "OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_SDK_SECRET_BUILD_BODY",
  "OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_SDK_SECRET_SOURCE_CONTENT",
  "OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_SECRET_ENDPOINT",
  "OBSERVER_SEARCH_WEB_ACTIVATION_PERSISTENCE_SECRET_AUTH_ENV",
  "0.0.0-observer-search-web-activation-persistence-fixture",
  "0.0.0-observer-search-web-activation-persistence-sdk-fixture",
]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer activation persistence leaked query, source, endpoint, auth env, or version detail: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawPluginSearchWebAdapterRuntimeActivationPersistence: {
    html: "controls-visible",
    failedSource: sourceAfter.id,
    recoveredTask: recoveredAfter.id,
    executionPhase: recoveredAfter.executionPhase,
    approvals: approvals.summary,
    history: history.summary,
  },
}, null, 2));
EOF
