#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-formal-integration-readiness-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9140}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9141}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9142}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9143}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9144}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9145}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9146}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9147}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9210}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-formal-integration-readiness-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-formal-integration-readiness-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

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
  "version": "0.0.0-formal-readiness-fixture",
  "private": true,
  "scripts": {
    "build": "echo FORMAL_READINESS_SECRET_BUILD_BODY",
    "typecheck": "echo FORMAL_READINESS_SECRET_TYPECHECK_BODY"
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
FORMAL_READINESS_SECRET_README_CONTENT must not appear in readiness output.
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
  "version": "0.0.0-formal-readiness-fixture",
  "private": false,
  "main": "./dist/index.js",
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo FORMAL_SDK_SECRET_BUILD_BODY"
  },
  "dependencies": {
    "zod": "999.0.0-formal-secret-version"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const FORMAL_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

cleanup() {
  rm -f \
    "${REGISTRY_FILE:-}" \
    "${READINESS_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

REGISTRY_FILE="$(mktemp)"
READINESS_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/plugins/openclaw-native-plugin-registry" > "$REGISTRY_FILE"
curl --silent --fail "$CORE_URL/plugins/openclaw-formal-integration-readiness" > "$READINESS_FILE"
curl --silent --fail "$CORE_URL/plugins/openclaw-formal-integration-readiness/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$REGISTRY_FILE" "$READINESS_FILE" "$SUMMARY_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const registry = readJson(2);
const readiness = readJson(3);
const summary = readJson(4);
const raw = JSON.stringify({ registry, readiness, summary });

if (
  !registry.ok
  || registry.registry !== "openclaw-native-plugin-registry-v0"
  || registry.mode !== "native-contract-registry"
  || registry.runtimeOwner !== "openclaw_on_nixos"
  || registry.activationMode !== "manual_adapter_required"
  || registry.validation?.ok !== true
  || registry.summary?.totalPlugins !== 1
  || registry.summary?.totalCapabilities !== 6
  || registry.summary?.governance?.canActivateRuntime !== false
) {
  throw new Error(`native plugin registry endpoint mismatch: ${JSON.stringify(registry)}`);
}

if (
  !readiness.ok
  || readiness.registry !== "openclaw-formal-integration-readiness-v0"
  || readiness.mode !== "readiness-only"
  || readiness.status !== "ready_for_native_adapter_implementation"
  || readiness.readyForFormalIntegration !== true
  || readiness.summary?.readyForFormalIntegration !== true
  || readiness.summary?.blockedRequired !== 0
  || readiness.summary?.canImportSourceContent !== false
  || readiness.summary?.canExecutePluginCode !== false
  || readiness.summary?.canActivateRuntime !== false
  || readiness.summary?.createsTask !== false
  || readiness.summary?.createsApproval !== false
) {
  throw new Error(`formal integration readiness mismatch: ${JSON.stringify(readiness)}`);
}

const requiredGates = readiness.gates.filter((gate) => gate.required);
if (requiredGates.length < 6 || requiredGates.some((gate) => gate.status !== "passed")) {
  throw new Error(`required readiness gates should pass: ${JSON.stringify(readiness.gates)}`);
}
if (!readiness.gates.some((gate) => gate.id === "adapter_implementation_pending" && gate.status === "pending" && gate.required === false)) {
  throw new Error(`adapter implementation should remain a pending manual step: ${JSON.stringify(readiness.gates)}`);
}
for (const source of [
  "openclaw-native-plugin-registry-v0",
  "openclaw-source-migration-plan-v0",
  "openclaw-plugin-sdk-contract-review-v0",
]) {
  if (!readiness.sourceRegistries.includes(source)) {
    throw new Error(`readiness should reference ${source}: ${JSON.stringify(readiness.sourceRegistries)}`);
  }
}
if (JSON.stringify(readiness.summary) !== JSON.stringify(summary.summary)) {
  throw new Error(`readiness and summary endpoints should agree: ${JSON.stringify({ readiness: readiness.summary, summary: summary.summary })}`);
}
for (const secret of [
  "FORMAL_READINESS_SECRET_BUILD_BODY",
  "FORMAL_READINESS_SECRET_TYPECHECK_BODY",
  "FORMAL_READINESS_SECRET_README_CONTENT",
  "FORMAL_SDK_SECRET_BUILD_BODY",
  "FORMAL_SDK_SECRET_SOURCE_CONTENT",
  "999.0.0-formal-secret-version",
]) {
  if (raw.includes(secret)) {
    throw new Error(`readiness output must not expose source contents, script bodies, or dependency versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawFormalIntegrationReadiness: {
    status: readiness.status,
    readyForFormalIntegration: readiness.readyForFormalIntegration,
    requiredGates: readiness.summary.requiredGates,
    passedRequired: readiness.summary.passedRequired,
    runtimeActivation: readiness.summary.canActivateRuntime,
    nextAllowedWork: readiness.summary.nextAllowedWork,
  },
}, null, 2));
EOF
