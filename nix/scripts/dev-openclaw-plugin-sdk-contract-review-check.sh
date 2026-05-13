#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-plugin-sdk-contract-review-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9110}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9111}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9112}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9113}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9114}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9115}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9116}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9117}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9180}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-plugin-sdk-contract-review-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-plugin-sdk-contract-review-check-events.jsonl}"

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
  "version": "0.0.0-plugin-sdk-review-fixture",
  "private": true,
  "scripts": {
    "build": "echo ROOT_SECRET_BUILD_BODY",
    "typecheck": "echo ROOT_SECRET_TYPECHECK_BODY"
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
# OpenClaw plugin SDK contract review fixture

ROOT_SECRET_README_CONTENT must not appear in contract reviews.
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
  "version": "0.0.0-review-fixture",
  "private": false,
  "main": "./dist/index.js",
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./testing": "./dist/testing.js"
  },
  "scripts": {
    "build": "echo SDK_SECRET_BUILD_BODY",
    "test": "echo SDK_SECRET_TEST_BODY"
  },
  "dependencies": {
    "zod": "999.0.0-secret-version"
  },
  "devDependencies": {
    "typescript": "999.0.0-secret-version"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/README.md" <<'MD'
SDK_SECRET_README_CONTENT must not appear in contract reviews.
MD
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

cleanup() {
  rm -f \
    "${REVIEW_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

REVIEW_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/workspaces/openclaw-plugin-sdk-contract-review" > "$REVIEW_FILE"
curl --silent --fail "$CORE_URL/workspaces/openclaw-plugin-sdk-contract-review/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$REVIEW_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR" "$PLUGIN_SDK_DIR"
const fs = require("node:fs");
const path = require("node:path");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const review = readJson(2);
const summary = readJson(3);
const workspaceDir = path.resolve(process.argv[4]);
const pluginSdkDir = path.resolve(process.argv[5]);
const rawReview = JSON.stringify(review);

if (!review.ok || review.registry !== "openclaw-plugin-sdk-contract-review-v0" || review.mode !== "read-only") {
  throw new Error(`plugin SDK contract review should be read-only: ${JSON.stringify(review)}`);
}
if (review.sourceRegistry !== "openclaw-source-migration-plan-v0" || review.sourceMode !== "plan-only") {
  throw new Error(`plugin SDK review should derive from the plan-only migration plan: ${JSON.stringify(review)}`);
}
if (review.count !== 1 || !Array.isArray(review.items) || review.items.length !== 1) {
  throw new Error(`plugin SDK review should expose one review item: ${JSON.stringify(review.items)}`);
}

const item = review.items[0];
if (
  item.workspaceName !== "openclaw"
  || path.resolve(item.workspacePath) !== workspaceDir
  || path.resolve(item.packagePath) !== pluginSdkDir
  || item.capability !== "plugin_sdk"
  || item.targetArea !== "capability_contracts"
  || item.status !== "manifest_profiled_not_imported"
  || item.verdict !== "review_required_before_import"
) {
  throw new Error(`plugin SDK review item mismatch: ${JSON.stringify(item)}`);
}
if (
  item.packageManifest?.present !== true
  || item.packageManifest?.name !== "@openclaw/plugin-sdk"
  || item.packageManifest?.hasTypes !== true
  || item.packageManifest?.hasExports !== true
  || !item.packageManifest?.exportKeys?.includes(".")
  || !item.packageManifest?.exportKeys?.includes("./testing")
  || !item.packageManifest?.scriptNames?.includes("build")
  || !item.packageManifest?.scriptNames?.includes("test")
  || item.packageManifest?.dependencySummary?.dependencies !== 1
  || item.packageManifest?.dependencySummary?.devDependencies !== 1
) {
  throw new Error(`plugin SDK manifest metadata mismatch: ${JSON.stringify(item.packageManifest)}`);
}
if (
  !item.structure?.markers?.includes("package.json")
  || !item.structure?.markers?.includes("README.md")
  || !item.structure?.markers?.includes("src")
  || !item.structure?.markers?.includes("types")
  || item.structure?.hasSourceDirectory !== true
  || item.structure?.hasTypesDirectory !== true
  || !item.contractSurfaces?.includes("package_exports")
  || !item.contractSurfaces?.includes("type_declarations")
  || !item.contractSurfaces?.includes("source_contract_candidates")
  || !item.contractSurfaces?.includes("package_scripts_metadata")
) {
  throw new Error(`plugin SDK structure and surface metadata mismatch: ${JSON.stringify({ structure: item.structure, surfaces: item.contractSurfaces })}`);
}
if (
  !Array.isArray(item.recommendedReviews)
  || item.recommendedReviews.length < 4
  || !Array.isArray(item.blockers)
  || item.blockers.length < 3
  || item.governance?.mode !== "plugin_sdk_contract_review_read_only"
  || item.governance?.canReadManifestMetadata !== true
  || item.governance?.canReadSourceFileContent !== false
  || item.governance?.canMutate !== false
  || item.governance?.canExecute !== false
  || item.governance?.createsTask !== false
  || item.governance?.createsApproval !== false
  || item.governance?.runtimeOwner !== "openclaw_on_nixos"
) {
  throw new Error(`plugin SDK review should remain review-only: ${JSON.stringify(item)}`);
}
if (
  review.summary?.total !== 1
  || review.summary?.withManifest !== 1
  || review.summary?.withTypes !== 1
  || review.summary?.withExports !== 1
  || review.summary?.byVerdict?.review_required_before_import !== 1
  || review.summary?.governance?.mode !== "plugin_sdk_contract_review_read_only"
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
  "ROOT_SECRET_BUILD_BODY",
  "ROOT_SECRET_TYPECHECK_BODY",
  "ROOT_SECRET_README_CONTENT",
  "SDK_SECRET_BUILD_BODY",
  "SDK_SECRET_TEST_BODY",
  "SDK_SECRET_README_CONTENT",
  "SDK_SECRET_SOURCE_CONTENT",
  "999.0.0-secret-version",
]) {
  if (rawReview.includes(secret)) {
    throw new Error(`plugin SDK contract review must not expose source contents, script bodies, or dependency versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawPluginSdkContractReview: {
    registry: review.registry,
    mode: review.mode,
    sourceRegistry: review.sourceRegistry,
    summary: review.summary,
    item: {
      packageName: item.packageManifest.name,
      exportKeys: item.packageManifest.exportKeys,
      scriptNames: item.packageManifest.scriptNames,
      contractSurfaces: item.contractSurfaces,
      verdict: item.verdict,
      governance: item.governance,
    },
    endpoints: [
      "/workspaces/openclaw-plugin-sdk-contract-review",
      "/workspaces/openclaw-plugin-sdk-contract-review/summary",
    ],
  },
}, null, 2));
EOF
