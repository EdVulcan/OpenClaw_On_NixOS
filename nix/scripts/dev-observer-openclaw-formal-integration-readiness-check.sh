#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-formal-integration-readiness-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9150}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9151}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9152}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9153}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9154}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9155}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9156}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9157}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9220}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-formal-integration-readiness-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-formal-integration-readiness-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p \
  "$WORKSPACE_DIR/.git" \
  "$WORKSPACE_DIR/.openclaw" \
  "$WORKSPACE_DIR/docs" \
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
  "version": "0.0.0-observer-formal-readiness-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_FORMAL_SECRET_BUILD_BODY",
    "typecheck": "echo OBSERVER_FORMAL_SECRET_TYPECHECK_BODY"
  }
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "extensions/*"
  - "packages/*"
  - "ui"
YAML
cat > "$WORKSPACE_DIR/README.md" <<'MD'
OBSERVER_FORMAL_SECRET_README_CONTENT must not appear in observer readiness output.
MD
cat > "$WORKSPACE_DIR/ui/package.json" <<'JSON'
{
  "name": "@openclaw/ui",
  "private": true
}
JSON
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{
  "name": "@openclaw/plugin-sdk",
  "version": "0.0.0-observer-formal-readiness-fixture",
  "private": false,
  "main": "./dist/index.js",
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo OBSERVER_FORMAL_SDK_SECRET_BUILD_BODY"
  },
  "dependencies": {
    "zod": "999.0.0-observer-formal-secret-version"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const OBSERVER_FORMAL_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${REGISTRY_FILE:-}" \
    "${READINESS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
REGISTRY_FILE="$(mktemp)"
READINESS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/openclaw-native-plugin-registry" > "$REGISTRY_FILE"
curl --silent --fail "$CORE_URL/plugins/openclaw-formal-integration-readiness" > "$READINESS_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$REGISTRY_FILE" "$READINESS_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const registry = readJson(4);
const readiness = readJson(5);
const raw = JSON.stringify({ registry, readiness });

const requiredHtml = [
  "OpenClaw Native Plugin Registry",
  "native-plugin-registry-id",
  "native-plugin-registry-total",
  "native-plugin-registry-capabilities",
  "native-plugin-registry-activation",
  "native-plugin-registry-validation",
  "OpenClaw Formal Integration Readiness",
  "integration-readiness-registry",
  "integration-readiness-status",
  "integration-readiness-required",
  "integration-readiness-runtime",
  "integration-readiness-mode",
];
const requiredClient = [
  "/plugins/openclaw-native-plugin-registry",
  "/plugins/openclaw-formal-integration-readiness",
  "renderNativePluginRegistry",
  "renderFormalIntegrationReadiness",
  "refreshNativePluginRegistry",
  "refreshFormalIntegrationReadiness",
  "formal adapter work may begin only after required governance gates pass",
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
  !registry.ok
  || registry.registry !== "openclaw-native-plugin-registry-v0"
  || registry.validation?.ok !== true
  || registry.summary?.governance?.canActivateRuntime !== false
) {
  throw new Error(`native registry response mismatch: ${JSON.stringify(registry)}`);
}
if (
  !readiness.ok
  || readiness.registry !== "openclaw-formal-integration-readiness-v0"
  || readiness.status !== "ready_for_native_adapter_implementation"
  || readiness.summary?.blockedRequired !== 0
  || readiness.summary?.canActivateRuntime !== false
  || readiness.summary?.canExecutePluginCode !== false
  || readiness.summary?.createsTask !== false
  || readiness.summary?.createsApproval !== false
) {
  throw new Error(`formal readiness response mismatch: ${JSON.stringify(readiness)}`);
}
for (const secret of [
  "OBSERVER_FORMAL_SECRET_BUILD_BODY",
  "OBSERVER_FORMAL_SECRET_TYPECHECK_BODY",
  "OBSERVER_FORMAL_SECRET_README_CONTENT",
  "OBSERVER_FORMAL_SDK_SECRET_BUILD_BODY",
  "OBSERVER_FORMAL_SDK_SECRET_SOURCE_CONTENT",
  "999.0.0-observer-formal-secret-version",
]) {
  if (raw.includes(secret) || html.includes(secret) || client.includes(secret)) {
    throw new Error(`Observer readiness must not expose source contents, script bodies, or dependency versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawFormalIntegrationReadiness: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/plugins/openclaw-native-plugin-registry",
      "/plugins/openclaw-formal-integration-readiness",
      "renderNativePluginRegistry",
      "renderFormalIntegrationReadiness",
    ],
    status: readiness.status,
    requiredGates: `${readiness.summary.passedRequired}/${readiness.summary.requiredGates}`,
    runtimeActivation: readiness.summary.canActivateRuntime,
  },
}, null, 2));
EOF
