#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-plugin-runtime-activation-task-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9290}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9291}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9292}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9293}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9294}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9295}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9296}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9297}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9360}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-native-plugin-runtime-activation-task-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-native-plugin-runtime-activation-task-check-events.jsonl}"

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
  "version": "0.0.0-observer-runtime-activation-task-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_RUNTIME_ACTIVATION_TASK_ROOT_SECRET_BUILD_BODY"
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
  "version": "0.0.0-observer-runtime-activation-task-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo OBSERVER_RUNTIME_ACTIVATION_TASK_SDK_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const OBSERVER_RUNTIME_ACTIVATION_TASK_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
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
curl --silent --fail "$CORE_URL/plugins/native-adapter/runtime-activation-task-draft" > "$DRAFT_FILE"
curl --silent --fail \
  -H "content-type: application/json" \
  -d '{"capabilityId":"act.plugin.capability.invoke","confirm":true}' \
  "$CORE_URL/plugins/native-adapter/runtime-activation-tasks" > "$TASK_FILE"

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
  "OpenClaw Native Runtime Activation Plan",
  "native-plugin-activation-task-button",
  "Create Activation Task",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of [
  "/plugins/native-adapter/runtime-activation-tasks",
  "createNativePluginRuntimeActivationApprovalTask",
  "Created approval-gated native plugin runtime activation task",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (
  !draft.ok
  || draft.registry !== "openclaw-native-plugin-runtime-activation-task-draft-v0"
  || draft.governance?.createsTask !== false
  || draft.governance?.createsApproval !== false
) {
  throw new Error(`Observer native runtime activation draft mismatch: ${JSON.stringify(draft)}`);
}
if (
  !taskResponse.ok
  || taskResponse.registry !== "openclaw-native-plugin-runtime-activation-task-v0"
  || taskResponse.mode !== "approval-gated-native-plugin-runtime-activation-task"
  || taskResponse.task?.type !== "native_plugin_runtime_activation"
  || taskResponse.task?.approval?.required !== true
  || taskResponse.approval?.status !== "pending"
  || taskResponse.governance?.createsTask !== true
  || taskResponse.governance?.createsApproval !== true
  || taskResponse.governance?.canImportModule !== false
  || taskResponse.governance?.canExecutePluginCode !== false
  || taskResponse.governance?.canActivateRuntime !== false
) {
  throw new Error(`Observer native runtime activation task response mismatch: ${JSON.stringify(taskResponse)}`);
}
for (const secret of [
  "OBSERVER_RUNTIME_ACTIVATION_TASK_ROOT_SECRET_BUILD_BODY",
  "OBSERVER_RUNTIME_ACTIVATION_TASK_SDK_SECRET_BUILD_BODY",
  "OBSERVER_RUNTIME_ACTIVATION_TASK_SDK_SECRET_SOURCE_CONTENT",
  "0.0.0-observer-runtime-activation-task-fixture",
]) {
  if (raw.includes(secret) || html.includes(secret) || client.includes(secret)) {
    throw new Error(`Observer runtime activation task must not expose source contents, script bodies, or package versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawNativePluginRuntimeActivationTask: {
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
