#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-plugin-runtime-refresh-evidence-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10200}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10201}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10202}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10203}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10204}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10205}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10206}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10207}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10208}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-native-plugin-runtime-refresh-evidence-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-native-plugin-runtime-refresh-evidence-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$WORKSPACE_DIR/extensions/provider-a" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-runtime-refresh-evidence-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_RUNTIME_REFRESH_ROOT_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "extensions/*"
  - "packages/*"
YAML
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{
  "name": "@openclaw/plugin-sdk",
  "version": "0.0.0-observer-runtime-refresh-evidence-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo OBSERVER_RUNTIME_REFRESH_SDK_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const OBSERVER_RUNTIME_REFRESH_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${REFRESH_FILE:-}" "${HISTORY_FILE:-}" "${APPROVALS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
REFRESH_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/runtime-refresh-evidence" > "$REFRESH_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10" > "$APPROVALS_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$REFRESH_FILE" "$HISTORY_FILE" "$APPROVALS_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const refresh = readJson(4);
const history = readJson(5);
const approvals = readJson(6);
const raw = JSON.stringify({ html, client, refresh, history, approvals });

for (const token of [
  "OpenClaw Native Runtime Refresh",
  "native-plugin-runtime-refresh-registry",
  "native-plugin-runtime-refresh-state",
  "native-plugin-runtime-refresh-blocked",
  "native-plugin-runtime-refresh-runtime",
  "native-plugin-runtime-refresh-json",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing runtime refresh token: ${token}`);
  }
}
for (const token of [
  "/plugins/native-adapter/runtime-refresh-evidence",
  "refreshNativePluginRuntimeRefreshEvidence",
  "renderNativePluginRuntimeRefreshEvidence",
  "Native plugin runtime refresh evidence",
  "sense.openclaw.plugin_runtime.refresh_evidence",
  "governed-runtime-refresh-evidence-only",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing runtime refresh token: ${token}`);
  }
}
if (
  !refresh.ok
  || refresh.registry !== "openclaw-native-plugin-runtime-refresh-evidence-v0"
  || refresh.summary?.readModelRefreshed !== true
  || refresh.summary?.canImportModule !== false
  || refresh.summary?.canExecutePluginCode !== false
  || refresh.summary?.canActivateRuntime !== false
  || refresh.governance?.canInvalidateModuleCache !== false
) {
  throw new Error(`Observer runtime refresh evidence mismatch: ${JSON.stringify(refresh)}`);
}
if ((history.items ?? []).length !== 0) {
  throw new Error(`Observer runtime refresh evidence must not invoke capabilities: ${JSON.stringify(history.items)}`);
}
if ((approvals.items ?? []).length !== 0) {
  throw new Error(`Observer runtime refresh evidence must not create approvals: ${JSON.stringify(approvals.items)}`);
}
for (const secret of [
  "OBSERVER_RUNTIME_REFRESH_ROOT_SECRET_BUILD_BODY",
  "OBSERVER_RUNTIME_REFRESH_SDK_SECRET_BUILD_BODY",
  "OBSERVER_RUNTIME_REFRESH_SDK_SECRET_SOURCE_CONTENT",
  "0.0.0-observer-runtime-refresh-evidence-fixture",
]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer runtime refresh evidence leaked source contents, script bodies, or package versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawNativePluginRuntimeRefreshEvidence: {
    html: "visible",
    client: "visible",
    registry: refresh.registry,
    readModelRefreshed: refresh.summary.readModelRefreshed,
    activationReady: refresh.summary.activationReady,
  },
}, null, 2));
EOF
