#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-source-migration-map-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9080}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9081}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9082}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9083}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9084}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9085}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9086}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9087}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9150}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-source-migration-map-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-source-migration-map-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

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
  "version": "0.0.0-observer-migration-map-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_SECRET_BUILD_BODY",
    "typecheck": "echo OBSERVER_SECRET_TYPECHECK_BODY"
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
# OpenClaw observer migration fixture

OBSERVER_SECRET_README_CONTENT must not appear in migration maps.
MD
cat > "$WORKSPACE_DIR/ui/package.json" <<'JSON'
{
  "name": "@openclaw/ui",
  "private": true
}
JSON

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${MAP_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
MAP_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/workspaces/openclaw-migration-map" > "$MAP_FILE"
curl --silent --fail "$CORE_URL/workspaces/openclaw-migration-map/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$MAP_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const path = require("node:path");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const map = readJson(4);
const summary = readJson(5);
const workspaceDir = path.resolve(process.argv[6]);
const rawMap = JSON.stringify(map);

const requiredHtml = [
  "OpenClaw Source Migration Map",
  "workspace-migration-registry",
  "workspace-migration-total",
  "workspace-migration-capabilities",
  "workspace-migration-high",
  "workspace-migration-mode",
  "workspace-migration-json",
];
const requiredClient = [
  "/workspaces/openclaw-migration-map",
  "renderWorkspaceMigrationMap",
  "refreshWorkspaceMigrationMap",
  "Read-only migration map: candidates are visible, source file contents stay hidden.",
  "Candidate status is not an import, execution, or mutation grant.",
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

if (!map.ok || map.registry !== "openclaw-source-migration-map-v0" || map.mode !== "read-only") {
  throw new Error(`migration map should be read-only: ${JSON.stringify(map)}`);
}
if (map.sourceRegistry !== "workspace-detect-v0" || path.resolve(map.roots?.[0] ?? "") !== workspaceDir) {
  throw new Error(`migration map should derive from workspace detection: ${JSON.stringify(map)}`);
}

const byCapability = Object.fromEntries((map.items ?? []).map((item) => [item.capability, item]));
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
for (const candidate of map.items ?? []) {
  if (
    candidate.workspaceName !== "openclaw"
    || path.resolve(candidate.workspacePath) !== workspaceDir
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
  map.summary?.total !== 8
  || map.summary?.byTargetArea?.capability_registry !== 2
  || map.summary?.byPriority?.high !== 3
  || map.summary?.governance?.canReadFileContent !== false
  || map.summary?.governance?.canMutate !== false
  || map.summary?.governance?.canExecute !== false
) {
  throw new Error(`migration map summary mismatch: ${JSON.stringify(map.summary)}`);
}
if (JSON.stringify(map.summary) !== JSON.stringify(summary.summary)) {
  throw new Error(`migration map list and summary endpoints should agree: ${JSON.stringify({ list: map.summary, summary: summary.summary })}`);
}
for (const secret of ["OBSERVER_SECRET_BUILD_BODY", "OBSERVER_SECRET_TYPECHECK_BODY", "OBSERVER_SECRET_README_CONTENT"]) {
  if (rawMap.includes(secret) || client.includes(secret) || html.includes(secret)) {
    throw new Error(`Observer migration map must not expose source contents or script bodies: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawSourceMigrationMap: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/workspaces/openclaw-migration-map",
      "renderWorkspaceMigrationMap",
      "refreshWorkspaceMigrationMap",
    ],
    summary: summary.summary,
    candidates: map.items.map((item) => ({
      capability: item.capability,
      sourceDomain: item.sourceDomain,
      targetArea: item.targetArea,
      migrationKind: item.migrationKind,
      risk: item.risk,
      priority: item.priority,
      governance: item.governance,
    })),
  },
}, null, 2));
EOF
