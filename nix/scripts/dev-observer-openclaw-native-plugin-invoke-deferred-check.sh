#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-plugin-invoke-deferred-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9230}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9231}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9232}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9233}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9234}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9235}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9236}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9237}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9300}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-native-plugin-invoke-deferred-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-native-plugin-invoke-deferred-check-events.jsonl}"

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
  "version": "0.0.0-observer-invoke-deferred-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_INVOKE_DEFERRED_ROOT_SECRET_BUILD_BODY"
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
  "version": "0.0.0-observer-invoke-deferred-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo OBSERVER_INVOKE_DEFERRED_SDK_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const OBSERVER_INVOKE_DEFERRED_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${TASK_FILE:-}" "${APPROVED_FILE:-}" "${DEFERRED_FILE:-}" "${HISTORY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
DEFERRED_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
post_json "$CORE_URL/plugins/native-adapter/invoke-tasks" '{"capabilityId":"act.plugin.capability.invoke","confirm":true}' > "$TASK_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE"
const fs = require("node:fs");
const response = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!response.ok || response.approval?.status !== "pending" || !response.approval?.id) {
  throw new Error(`native plugin invoke task should create a pending approval: ${JSON.stringify(response)}`);
}
process.stdout.write(response.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-observer-openclaw-native-plugin-invoke-deferred-check","reason":"approve observer adapter-deferred native plugin invocation"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$DEFERRED_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$TASK_FILE" "$APPROVED_FILE" "$DEFERRED_FILE" "$HISTORY_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const taskResponse = readJson(4);
const approved = readJson(5);
const deferred = readJson(6);
const history = readJson(7);
const raw = JSON.stringify({ taskResponse, approved, deferred, history, html, client });

for (const token of [
  "Operator Loop",
  "operator-loop-json",
  "native-plugin-invoke-task-button",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of [
  "phase=",
  "createNativePluginInvokeApprovalTask",
  "/operator/step",
  "Reason:",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (approved.approval?.status !== "approved") {
  throw new Error(`approval should be approved before Observer deferred execution: ${JSON.stringify(approved)}`);
}
if (
  !deferred.ok
  || deferred.ran !== false
  || deferred.blocked !== true
  || deferred.reason !== "runtime_adapter_deferred"
  || deferred.task?.id !== taskResponse.task?.id
  || deferred.task?.executionPhase !== "runtime_adapter_deferred"
) {
  throw new Error(`Observer should be able to see the runtime adapter deferred operator result: ${JSON.stringify(deferred)}`);
}
if ((history.items ?? []).some((entry) => entry.capability?.id === "act.plugin.capability.invoke")) {
  throw new Error(`Observer deferred path must not execute plugin capability: ${JSON.stringify(history.items)}`);
}
for (const secret of [
  "OBSERVER_INVOKE_DEFERRED_ROOT_SECRET_BUILD_BODY",
  "OBSERVER_INVOKE_DEFERRED_SDK_SECRET_BUILD_BODY",
  "OBSERVER_INVOKE_DEFERRED_SDK_SECRET_SOURCE_CONTENT",
  "0.0.0-observer-invoke-deferred-fixture",
]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer deferred path must not expose source contents, script bodies, or package versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawNativePluginInvokeDeferred: {
    controls: ["operator-loop-json", "native-plugin-invoke-task-button"],
    task: {
      id: deferred.task.id,
      status: deferred.task.status,
      phase: deferred.task.executionPhase,
    },
    blocked: {
      reason: deferred.reason,
      ran: deferred.ran,
    },
  },
}, null, 2));
EOF
