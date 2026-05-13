#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-source-migration-map-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9070}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9071}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9072}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9073}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9074}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9075}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9076}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9077}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9140}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-source-migration-map-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-source-migration-map-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p \
  "$WORKSPACE_DIR/.git" \
  "$WORKSPACE_DIR/.openclaw" \
  "$WORKSPACE_DIR/docs" \
  "$WORKSPACE_DIR/extensions" \
  "$WORKSPACE_DIR/packages/plugin-sdk" \
  "$WORKSPACE_DIR/packages/memory-host-sdk" \
  "$WORKSPACE_DIR/qa/smoke" \
  "$WORKSPACE_DIR/skills" \
  "$WORKSPACE_DIR/src/core" \
  "$WORKSPACE_DIR/test/unit" \
  "$WORKSPACE_DIR/ui"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

for index in $(seq 1 11); do
  mkdir -p "$WORKSPACE_DIR/extensions/provider-$index"
done

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-migration-map-fixture",
  "private": true,
  "scripts": {
    "build": "echo SECRET_BUILD_BODY",
    "typecheck": "echo SECRET_TYPECHECK_BODY"
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
# OpenClaw migration fixture

SECRET_README_CONTENT must not appear in migration maps.
MD
cat > "$WORKSPACE_DIR/ui/package.json" <<'JSON'
{
  "name": "@openclaw/ui",
  "private": true
}
JSON

cleanup() {
  rm -f \
    "${MAP_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

MAP_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/workspaces/openclaw-migration-map" > "$MAP_FILE"
curl --silent --fail "$CORE_URL/workspaces/openclaw-migration-map/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$MAP_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const path = require("node:path");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const map = readJson(2);
const summary = readJson(3);
const workspaceDir = path.resolve(process.argv[4]);
const rawMap = JSON.stringify(map);

if (!map.ok || map.registry !== "openclaw-source-migration-map-v0" || map.mode !== "read-only") {
  throw new Error(`migration map should be read-only: ${JSON.stringify(map)}`);
}
if (map.sourceRegistry !== "workspace-detect-v0" || path.resolve(map.roots?.[0] ?? "") !== workspaceDir) {
  throw new Error(`migration map should derive from workspace detection: ${JSON.stringify(map)}`);
}
if (!Array.isArray(map.items) || map.items.length < 8) {
  throw new Error(`migration map should expose the fixture capability candidates: ${JSON.stringify(map.items)}`);
}

const byCapability = Object.fromEntries(map.items.map((item) => [item.capability, item]));
for (const capability of [
  "extension_catalog",
  "plugin_sdk",
  "memory_host_sdk",
  "ui_workspace",
  "core_source_patterns",
  "documentation_canon",
  "agent_skills",
  "verification_assets",
]) {
  if (!byCapability[capability]) {
    throw new Error(`missing migration candidate for ${capability}: ${JSON.stringify(map.items)}`);
  }
}
if (byCapability.extension_catalog.evidence?.approximateEntries < 10) {
  throw new Error(`extension catalog candidate should expose metadata counts only: ${JSON.stringify(byCapability.extension_catalog)}`);
}
for (const candidate of map.items) {
  if (
    candidate.workspaceName !== "openclaw"
    || path.resolve(candidate.workspacePath) !== workspaceDir
    || candidate.readiness !== "profiled"
    || candidate.governance?.mode !== "migration_candidate_read_only"
    || candidate.governance?.canReadFileContent !== false
    || candidate.governance?.canMutate !== false
    || candidate.governance?.canExecute !== false
    || candidate.governance?.requiresHumanReview !== true
    || candidate.governance?.migrationStatus !== "candidate_only"
  ) {
    throw new Error(`candidate should remain read-only and review-gated: ${JSON.stringify(candidate)}`);
  }
}
if (
  map.summary?.total !== map.items.length
  || map.summary?.workspaces !== 1
  || map.summary?.byTargetArea?.capability_registry < 2
  || map.summary?.byRisk?.low < 3
  || map.summary?.governance?.canReadFileContent !== false
  || map.summary?.governance?.canMutate !== false
  || map.summary?.governance?.canExecute !== false
) {
  throw new Error(`migration map summary mismatch: ${JSON.stringify(map.summary)}`);
}
if (JSON.stringify(map.summary) !== JSON.stringify(summary.summary)) {
  throw new Error(`migration map list and summary endpoints should agree: ${JSON.stringify({ list: map.summary, summary: summary.summary })}`);
}
for (const secret of ["SECRET_BUILD_BODY", "SECRET_TYPECHECK_BODY", "SECRET_README_CONTENT"]) {
  if (rawMap.includes(secret)) {
    throw new Error(`migration map must not expose file contents or script bodies: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawSourceMigrationMap: {
    registry: map.registry,
    mode: map.mode,
    sourceRegistry: map.sourceRegistry,
    root: map.roots[0],
    summary: map.summary,
    candidates: map.items.map((item) => ({
      capability: item.capability,
      sourceDomain: item.sourceDomain,
      targetArea: item.targetArea,
      migrationKind: item.migrationKind,
      risk: item.risk,
      priority: item.priority,
      governance: item.governance,
    })),
    endpoints: [
      "/workspaces/openclaw-migration-map",
      "/workspaces/openclaw-migration-map/summary",
    ],
  },
}, null, 2));
EOF
