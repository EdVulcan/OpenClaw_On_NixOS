#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-plugin-sdk-contract-review-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9120}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9121}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9122}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9123}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9124}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9125}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9126}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9127}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9190}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-plugin-sdk-contract-review-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-plugin-sdk-contract-review-check-events.jsonl}"

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
  "version": "0.0.0-observer-plugin-sdk-review-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_ROOT_SECRET_BUILD_BODY",
    "typecheck": "echo OBSERVER_ROOT_SECRET_TYPECHECK_BODY"
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
# OpenClaw observer plugin SDK contract review fixture

OBSERVER_ROOT_SECRET_README_CONTENT must not appear in contract reviews.
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
  "version": "0.0.0-observer-review-fixture",
  "private": false,
  "main": "./dist/index.js",
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./testing": "./dist/testing.js"
  },
  "scripts": {
    "build": "echo OBSERVER_SDK_SECRET_BUILD_BODY",
    "test": "echo OBSERVER_SDK_SECRET_TEST_BODY"
  },
  "dependencies": {
    "zod": "999.0.0-observer-secret-version"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/README.md" <<'MD'
OBSERVER_SDK_SECRET_README_CONTENT must not appear in contract reviews.
MD
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const OBSERVER_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${REVIEW_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
REVIEW_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/workspaces/openclaw-plugin-sdk-contract-review" > "$REVIEW_FILE"
curl --silent --fail "$CORE_URL/workspaces/openclaw-plugin-sdk-contract-review/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$REVIEW_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR" "$PLUGIN_SDK_DIR"
const fs = require("node:fs");
const path = require("node:path");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const review = readJson(4);
const summary = readJson(5);
const workspaceDir = path.resolve(process.argv[6]);
const pluginSdkDir = path.resolve(process.argv[7]);
const rawReview = JSON.stringify(review);

const requiredHtml = [
  "OpenClaw Plugin SDK Contract Review",
  "plugin-sdk-review-registry",
  "plugin-sdk-review-total",
  "plugin-sdk-review-manifest",
  "plugin-sdk-review-types",
  "plugin-sdk-review-exports",
  "plugin-sdk-review-mode",
  "plugin-sdk-review-json",
];
const requiredClient = [
  "/workspaces/openclaw-plugin-sdk-contract-review",
  "renderPluginSdkContractReview",
  "refreshPluginSdkContractReview",
  "Read-only contract review: manifest shape and directory markers only.",
  "Source contents, README text, script bodies, dependency versions, tasks, approvals, and executions stay hidden.",
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
if (!review.ok || review.registry !== "openclaw-plugin-sdk-contract-review-v0" || review.mode !== "read-only") {
  throw new Error(`plugin SDK contract review should be read-only: ${JSON.stringify(review)}`);
}
if (review.sourceRegistry !== "openclaw-source-migration-plan-v0" || review.sourceMode !== "plan-only") {
  throw new Error(`plugin SDK review should derive from the plan-only migration plan: ${JSON.stringify(review)}`);
}
const item = review.items?.[0];
if (
  review.count !== 1
  || !item
  || path.resolve(item.workspacePath) !== workspaceDir
  || path.resolve(item.packagePath) !== pluginSdkDir
  || item.packageManifest?.name !== "@openclaw/plugin-sdk"
  || item.packageManifest?.hasTypes !== true
  || item.packageManifest?.hasExports !== true
  || !item.contractSurfaces?.includes("package_exports")
  || !item.contractSurfaces?.includes("type_declarations")
  || !item.contractSurfaces?.includes("source_contract_candidates")
  || !item.contractSurfaces?.includes("package_scripts_metadata")
) {
  throw new Error(`plugin SDK review item mismatch: ${JSON.stringify(item)}`);
}
if (
  item.governance?.mode !== "plugin_sdk_contract_review_read_only"
  || item.governance?.canReadSourceFileContent !== false
  || item.governance?.canMutate !== false
  || item.governance?.canExecute !== false
  || item.governance?.createsTask !== false
  || item.governance?.createsApproval !== false
  || item.governance?.runtimeOwner !== "openclaw_on_nixos"
) {
  throw new Error(`plugin SDK review should remain review-only: ${JSON.stringify(item.governance)}`);
}
if (
  review.summary?.withManifest !== 1
  || review.summary?.withTypes !== 1
  || review.summary?.withExports !== 1
  || review.summary?.governance?.canReadSourceFileContent !== false
  || review.summary?.governance?.canMutate !== false
  || review.summary?.governance?.canExecute !== false
  || review.summary?.governance?.createsTask !== false
  || review.summary?.governance?.createsApproval !== false
) {
  throw new Error(`plugin SDK review summary mismatch: ${JSON.stringify(review.summary)}`);
}
if (JSON.stringify(review.summary) !== JSON.stringify(summary.summary)) {
  throw new Error(`plugin SDK review list and summary endpoints should agree: ${JSON.stringify({ list: review.summary, summary: summary.summary })}`);
}
for (const secret of [
  "OBSERVER_ROOT_SECRET_BUILD_BODY",
  "OBSERVER_ROOT_SECRET_TYPECHECK_BODY",
  "OBSERVER_ROOT_SECRET_README_CONTENT",
  "OBSERVER_SDK_SECRET_BUILD_BODY",
  "OBSERVER_SDK_SECRET_TEST_BODY",
  "OBSERVER_SDK_SECRET_README_CONTENT",
  "OBSERVER_SDK_SECRET_SOURCE_CONTENT",
  "999.0.0-observer-secret-version",
]) {
  if (rawReview.includes(secret) || html.includes(secret) || client.includes(secret)) {
    throw new Error(`Observer plugin SDK contract review must not expose source contents, script bodies, or dependency versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawPluginSdkContractReview: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/workspaces/openclaw-plugin-sdk-contract-review",
      "renderPluginSdkContractReview",
      "refreshPluginSdkContractReview",
    ],
    summary: summary.summary,
    item: {
      packageName: item.packageManifest.name,
      exportKeys: item.packageManifest.exportKeys,
      scriptNames: item.packageManifest.scriptNames,
      contractSurfaces: item.contractSurfaces,
      verdict: item.verdict,
      governance: item.governance,
    },
  },
}, null, 2));
EOF
