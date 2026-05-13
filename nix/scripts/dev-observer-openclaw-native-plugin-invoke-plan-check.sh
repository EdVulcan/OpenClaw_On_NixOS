#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-plugin-invoke-plan-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9190}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9191}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9192}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9193}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9194}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9195}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9196}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9197}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9260}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-native-plugin-invoke-plan-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-native-plugin-invoke-plan-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p \
  "$WORKSPACE_DIR/.git" \
  "$WORKSPACE_DIR/.openclaw" \
  "$WORKSPACE_DIR/extensions/provider-a" \
  "$WORKSPACE_DIR/extensions/provider-b" \
  "$WORKSPACE_DIR/packages/memory-host-sdk" \
  "$PLUGIN_SDK_DIR/src" \
  "$PLUGIN_SDK_DIR/types" \
  "$WORKSPACE_DIR/qa/smoke" \
  "$WORKSPACE_DIR/skills" \
  "$WORKSPACE_DIR/src/core" \
  "$WORKSPACE_DIR/test/unit" \
  "$WORKSPACE_DIR/ui"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

for index in $(seq 1 9); do
  mkdir -p "$WORKSPACE_DIR/extensions/provider-extra-$index"
done

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-invoke-plan-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_INVOKE_PLAN_ROOT_SECRET_BUILD_BODY"
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
  "version": "0.0.0-observer-invoke-plan-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo OBSERVER_INVOKE_PLAN_SDK_SECRET_BUILD_BODY"
  },
  "dependencies": {
    "zod": "999.0.0-observer-invoke-plan-secret-version"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const OBSERVER_INVOKE_PLAN_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${PLAN_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
PLAN_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/invoke-plan" > "$PLAN_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$PLAN_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const plan = readJson(4);
const raw = JSON.stringify(plan);

const requiredHtml = [
  "OpenClaw Native Plugin Invoke Plan",
  "native-plugin-invoke-plan-registry",
  "native-plugin-invoke-plan-capability",
  "native-plugin-invoke-plan-decision",
  "native-plugin-invoke-plan-runtime",
  "native-plugin-invoke-plan-mode",
  "native-plugin-invoke-plan-json",
];
const requiredClient = [
  "/plugins/native-adapter/invoke-plan",
  "renderNativePluginInvokePlan",
  "refreshNativePluginInvokePlan",
  "Plan-only draft for high-risk plugin capability invocation",
];
for (const token of requiredHtml) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of requiredClient) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (
  !plan.ok
  || plan.registry !== "openclaw-native-plugin-invoke-plan-v0"
  || plan.policy?.decision?.decision !== "require_approval"
  || plan.governance?.createsTask !== false
  || plan.governance?.createsApproval !== false
  || plan.governance?.canExecutePluginCode !== false
  || plan.governance?.canActivateRuntime !== false
) {
  throw new Error(`Observer native plugin invoke plan mismatch: ${JSON.stringify(plan)}`);
}
for (const secret of [
  "OBSERVER_INVOKE_PLAN_ROOT_SECRET_BUILD_BODY",
  "OBSERVER_INVOKE_PLAN_SDK_SECRET_BUILD_BODY",
  "OBSERVER_INVOKE_PLAN_SDK_SECRET_SOURCE_CONTENT",
  "999.0.0-observer-invoke-plan-secret-version",
  "0.0.0-observer-invoke-plan-fixture",
]) {
  if (raw.includes(secret) || html.includes(secret) || client.includes(secret)) {
    throw new Error(`Observer invoke plan must not expose source contents, script bodies, dependency versions, or package versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawNativePluginInvokePlan: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/plugins/native-adapter/invoke-plan",
      "renderNativePluginInvokePlan",
      "refreshNativePluginInvokePlan",
    ],
    decision: plan.policy.decision.decision,
    runtimeActivation: plan.governance.canActivateRuntime,
  },
}, null, 2));
EOF
