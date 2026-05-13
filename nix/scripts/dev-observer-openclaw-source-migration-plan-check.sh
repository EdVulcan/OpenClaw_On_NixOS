#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-source-migration-plan-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9100}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9101}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9102}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9103}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9104}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9105}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9106}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9107}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9170}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-source-migration-plan-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-source-migration-plan-check-events.jsonl}"

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
  "version": "0.0.0-observer-migration-plan-fixture",
  "private": true,
  "scripts": {
    "build": "echo OBSERVER_PLAN_SECRET_BUILD_BODY",
    "typecheck": "echo OBSERVER_PLAN_SECRET_TYPECHECK_BODY"
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
# OpenClaw observer migration plan fixture

OBSERVER_PLAN_SECRET_README_CONTENT must not appear in migration plans.
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
    "${PLAN_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
PLAN_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/workspaces/openclaw-migration-plan" > "$PLAN_FILE"
curl --silent --fail "$CORE_URL/workspaces/openclaw-migration-plan/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$PLAN_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const path = require("node:path");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const plan = readJson(4);
const summary = readJson(5);
const workspaceDir = path.resolve(process.argv[6]);
const rawPlan = JSON.stringify(plan);

const requiredHtml = [
  "OpenClaw Source Migration Plan",
  "workspace-migration-plan-registry",
  "workspace-migration-plan-total",
  "workspace-migration-plan-candidates",
  "workspace-migration-plan-backlog",
  "workspace-migration-plan-mode",
  "workspace-migration-plan-json",
];
const requiredClient = [
  "/workspaces/openclaw-migration-plan",
  "renderWorkspaceMigrationPlan",
  "refreshWorkspaceMigrationPlan",
  "Plan-only migration draft: no task, approval, import, execution, or source read is created.",
  "First wave is a review order, not permission to absorb code.",
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

if (!plan.ok || plan.registry !== "openclaw-source-migration-plan-v0" || plan.mode !== "plan-only") {
  throw new Error(`migration plan should be plan-only: ${JSON.stringify(plan)}`);
}
if (plan.sourceRegistry !== "openclaw-source-migration-map-v0" || path.resolve(plan.roots?.[0] ?? "") !== workspaceDir) {
  throw new Error(`migration plan should derive from the migration map and configured root: ${JSON.stringify(plan)}`);
}
if (plan.candidateCount !== 8 || plan.count !== 4 || plan.summary?.backlog !== 4) {
  throw new Error(`migration plan should expose first wave and backlog counts: ${JSON.stringify(plan.summary)}`);
}

const firstWave = (plan.items ?? []).map((item) => item.capability);
for (const capability of ["plugin_sdk", "core_source_patterns", "extension_catalog", "verification_assets"]) {
  if (!firstWave.includes(capability)) {
    throw new Error(`Observer migration plan missing first-wave capability ${capability}: ${JSON.stringify(plan.items)}`);
  }
}
for (const item of plan.items ?? []) {
  if (
    item.status !== "planned_not_imported"
    || !Array.isArray(item.acceptanceCriteria)
    || item.acceptanceCriteria.length < 4
    || !Array.isArray(item.blockers)
    || item.blockers.length < 3
    || item.governance?.mode !== "migration_plan_only"
    || item.governance?.canReadFileContent !== false
    || item.governance?.canMutate !== false
    || item.governance?.canExecute !== false
    || item.governance?.createsTask !== false
    || item.governance?.createsApproval !== false
    || item.governance?.requiresHumanApprovalBeforeImport !== true
  ) {
    throw new Error(`plan item should remain plan-only and review-gated: ${JSON.stringify(item)}`);
  }
}
if (
  plan.summary?.governance?.mode !== "migration_plan_only"
  || plan.summary?.governance?.canReadFileContent !== false
  || plan.summary?.governance?.canMutate !== false
  || plan.summary?.governance?.canExecute !== false
  || plan.summary?.governance?.createsTask !== false
  || plan.summary?.governance?.createsApproval !== false
) {
  throw new Error(`summary governance should remain plan-only: ${JSON.stringify(plan.summary)}`);
}
if (JSON.stringify(plan.summary) !== JSON.stringify(summary.summary)) {
  throw new Error(`migration plan list and summary endpoints should agree: ${JSON.stringify({ list: plan.summary, summary: summary.summary })}`);
}
for (const secret of ["OBSERVER_PLAN_SECRET_BUILD_BODY", "OBSERVER_PLAN_SECRET_TYPECHECK_BODY", "OBSERVER_PLAN_SECRET_README_CONTENT"]) {
  if (rawPlan.includes(secret) || client.includes(secret) || html.includes(secret)) {
    throw new Error(`Observer migration plan must not expose source contents or script bodies: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawSourceMigrationPlan: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/workspaces/openclaw-migration-plan",
      "renderWorkspaceMigrationPlan",
      "refreshWorkspaceMigrationPlan",
    ],
    summary: summary.summary,
    firstWave: plan.items.map((item) => ({
      sequence: item.sequence,
      capability: item.capability,
      sourceDomain: item.sourceDomain,
      targetArea: item.targetArea,
      migrationKind: item.migrationKind,
      risk: item.risk,
      priority: item.priority,
      governance: item.governance,
    })),
    backlog: plan.backlog,
  },
}, null, 2));
EOF
