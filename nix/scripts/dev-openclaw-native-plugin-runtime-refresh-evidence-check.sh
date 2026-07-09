#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-native-plugin-runtime-refresh-evidence-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10180}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10181}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10182}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10183}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10184}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10185}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10186}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10187}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10188}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-native-plugin-runtime-refresh-evidence-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-native-plugin-runtime-refresh-evidence-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$WORKSPACE_DIR/extensions/provider-a" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-runtime-refresh-evidence-fixture",
  "private": true,
  "scripts": {
    "build": "echo RUNTIME_REFRESH_ROOT_SECRET_BUILD_BODY"
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
  "version": "0.0.0-runtime-refresh-evidence-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo RUNTIME_REFRESH_SDK_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const RUNTIME_REFRESH_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

cleanup() {
  rm -f "${REFRESH_FILE:-}" "${HISTORY_FILE:-}" "${APPROVALS_FILE:-}" "${ADAPTER_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

REFRESH_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
ADAPTER_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/plugins/native-adapter/runtime-refresh-evidence" > "$REFRESH_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$CORE_URL/plugins/openclaw-native-plugin-adapter" > "$ADAPTER_FILE"

node - <<'EOF' "$REFRESH_FILE" "$HISTORY_FILE" "$APPROVALS_FILE" "$ADAPTER_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const refresh = readJson(2);
const history = readJson(3);
const approvals = readJson(4);
const adapter = readJson(5);
const raw = JSON.stringify({ refresh, history, approvals, adapter });

if (
  !refresh.ok
  || refresh.registry !== "openclaw-native-plugin-runtime-refresh-evidence-v0"
  || refresh.mode !== "governed-runtime-refresh-evidence-only"
  || refresh.capability?.id !== "sense.openclaw.plugin_runtime.refresh_evidence"
  || refresh.runtimeState?.readModelRefreshed !== true
  || refresh.runtimeState?.activeLoader !== false
  || refresh.runtimeState?.loadedPluginModules !== 0
  || refresh.summary?.readModelRefreshed !== true
  || refresh.summary?.canImportModule !== false
  || refresh.summary?.canExecutePluginCode !== false
  || refresh.summary?.canActivateRuntime !== false
  || refresh.summary?.createsTask !== false
  || refresh.summary?.createsApproval !== false
  || refresh.governance?.canInvalidateModuleCache !== false
  || refresh.governance?.canImportModule !== false
  || refresh.governance?.canActivateRuntime !== false
  || refresh.auditEvidence?.operation !== "plugin_runtime_refresh_evidence"
) {
  throw new Error(`runtime refresh evidence mismatch: ${JSON.stringify(refresh)}`);
}
for (const id of [
  "recompute_native_contract_registry",
  "report_runtime_activation_gates",
  "defer_module_cache_invalidation",
  "block_plugin_module_load",
  "block_runtime_activation",
]) {
  if (!refresh.lifecycleActions?.some((action) => action.id === id)) {
    throw new Error(`runtime refresh evidence missing lifecycle action ${id}: ${JSON.stringify(refresh.lifecycleActions)}`);
  }
}
if ((history.items ?? []).length !== 0) {
  throw new Error(`runtime refresh evidence must not invoke capabilities: ${JSON.stringify(history.items)}`);
}
if ((approvals.items ?? []).length !== 0) {
  throw new Error(`runtime refresh evidence must not create approvals: ${JSON.stringify(approvals.items)}`);
}
if (
  !adapter.implementedCapabilities?.includes("sense.openclaw.plugin_runtime.refresh_evidence")
  || adapter.summary?.canReadPluginRuntimeRefreshEvidence !== true
) {
  throw new Error(`native adapter missing runtime refresh evidence capability: ${JSON.stringify(adapter)}`);
}
for (const secret of [
  "RUNTIME_REFRESH_ROOT_SECRET_BUILD_BODY",
  "RUNTIME_REFRESH_SDK_SECRET_BUILD_BODY",
  "RUNTIME_REFRESH_SDK_SECRET_SOURCE_CONTENT",
  "0.0.0-runtime-refresh-evidence-fixture",
]) {
  if (raw.includes(secret)) {
    throw new Error(`runtime refresh evidence leaked source contents, script bodies, or package versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawNativePluginRuntimeRefreshEvidence: {
    registry: refresh.registry,
    readModelRefreshed: refresh.summary.readModelRefreshed,
    blockedActions: refresh.summary.blockedActions,
    activationReady: refresh.summary.activationReady,
  },
}, null, 2));
EOF
