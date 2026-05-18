#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-plugin-runtime-adapter-task-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9390}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9391}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9392}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9393}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9394}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9395}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9396}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9397}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9460}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-native-plugin-runtime-adapter-task-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-native-plugin-runtime-adapter-task-check-events.jsonl}"

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
  "version": "0.0.0-observer-runtime-adapter-task-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_RUNTIME_ADAPTER_TASK_ROOT_SECRET_BUILD_BODY"
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
  "version": "0.0.0-observer-runtime-adapter-task-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo OBSERVER_RUNTIME_ADAPTER_TASK_SDK_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const OBSERVER_RUNTIME_ADAPTER_TASK_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${DRAFT_FILE:-}" "${TASK_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
DRAFT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/runtime-adapter-task-draft" > "$DRAFT_FILE"
curl --silent --fail \
  -H "content-type: application/json" \
  -d '{"capabilityId":"act.plugin.capability.invoke","confirm":true}' \
  "$CORE_URL/plugins/native-adapter/runtime-adapter-tasks" > "$TASK_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$DRAFT_FILE" "$TASK_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));
const html = readText(2);
const client = readText(3);
const draft = readJson(4);
const taskResponse = readJson(5);
const raw = JSON.stringify({ draft, taskResponse });

for (const token of [
  "OpenClaw Native Runtime Adapter Contract",
  "native-plugin-runtime-adapter-task-button",
  "Create Adapter Task",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of [
  "/plugins/native-adapter/runtime-adapter-tasks",
  "createNativePluginRuntimeAdapterApprovalTask",
  "Created approval-gated native plugin runtime adapter task",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (
  !draft.ok
  || draft.registry !== "openclaw-native-plugin-runtime-adapter-task-draft-v0"
  || draft.sourceRegistry !== "openclaw-native-plugin-runtime-adapter-contract-v0"
  || draft.adapterContract?.registry !== "openclaw-native-plugin-runtime-adapter-contract-v0"
  || draft.governance?.createsTask !== false
  || draft.governance?.createsApproval !== false
) {
  throw new Error(`Observer native runtime adapter draft mismatch: ${JSON.stringify(draft)}`);
}
if (
  !taskResponse.ok
  || taskResponse.registry !== "openclaw-native-plugin-runtime-adapter-task-v0"
  || taskResponse.mode !== "approval-gated-native-plugin-runtime-adapter-task"
  || taskResponse.task?.type !== "native_plugin_runtime_adapter_implementation"
  || taskResponse.task?.approval?.required !== true
  || taskResponse.task?.plan?.strategy !== "native-plugin-runtime-adapter-v0"
  || taskResponse.approval?.status !== "pending"
  || taskResponse.governance?.createsTask !== true
  || taskResponse.governance?.createsApproval !== true
  || taskResponse.governance?.canImportModule !== false
  || taskResponse.governance?.canExecutePluginCode !== false
  || taskResponse.governance?.canActivateRuntime !== false
) {
  throw new Error(`Observer native runtime adapter task response mismatch: ${JSON.stringify(taskResponse)}`);
}
for (const secret of [
  "OBSERVER_RUNTIME_ADAPTER_TASK_ROOT_SECRET_BUILD_BODY",
  "OBSERVER_RUNTIME_ADAPTER_TASK_SDK_SECRET_BUILD_BODY",
  "OBSERVER_RUNTIME_ADAPTER_TASK_SDK_SECRET_SOURCE_CONTENT",
  "0.0.0-observer-runtime-adapter-task-fixture",
]) {
  if (raw.includes(secret) || html.includes(secret) || client.includes(secret)) {
    throw new Error(`Observer runtime adapter task must not expose source contents, script bodies, or package versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawNativePluginRuntimeAdapterTask: {
    html: "visible",
    client: "wired",
    task: {
      id: taskResponse.task.id,
      status: taskResponse.task.status,
      approval: taskResponse.task.approval,
    },
    approval: {
      id: taskResponse.approval.id,
      status: taskResponse.approval.status,
    },
  },
}, null, 2));
EOF
