#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-source-migration-plan-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9090}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9091}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9092}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9093}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9094}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9095}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9096}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9097}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9160}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-source-migration-plan-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-source-migration-plan-check-events.jsonl}"

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
  "version": "0.0.0-migration-plan-fixture",
  "private": true,
  "scripts": {
    "build": "echo PLAN_SECRET_BUILD_BODY",
    "typecheck": "echo PLAN_SECRET_TYPECHECK_BODY"
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
# OpenClaw migration plan fixture

PLAN_SECRET_README_CONTENT must not appear in migration plans.
MD
cat > "$WORKSPACE_DIR/ui/package.json" <<'JSON'
{
  "name": "@openclaw/ui",
  "private": true
}
JSON

cleanup() {
  rm -f \
    "${PLAN_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

PLAN_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/workspaces/openclaw-migration-plan" > "$PLAN_FILE"
curl --silent --fail "$CORE_URL/workspaces/openclaw-migration-plan/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$PLAN_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const path = require("node:path");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const plan = readJson(2);
const summary = readJson(3);
const workspaceDir = path.resolve(process.argv[4]);
const rawPlan = JSON.stringify(plan);

if (!plan.ok || plan.registry !== "openclaw-source-migration-plan-v0" || plan.mode !== "plan-only") {
  throw new Error(`migration plan should be plan-only: ${JSON.stringify(plan)}`);
}
if (plan.sourceRegistry !== "openclaw-source-migration-map-v0" || plan.sourceMode !== "read-only") {
  throw new Error(`migration plan should derive from the read-only migration map: ${JSON.stringify(plan)}`);
}
if (path.resolve(plan.roots?.[0] ?? "") !== workspaceDir) {
  throw new Error(`migration plan should use configured OpenClaw root: ${JSON.stringify(plan.roots)}`);
}
if (plan.candidateCount !== 8 || plan.count !== 4 || plan.summary?.backlog !== 4) {
  throw new Error(`migration plan should choose a conservative first wave from all candidates: ${JSON.stringify({ candidateCount: plan.candidateCount, count: plan.count, summary: plan.summary })}`);
}

const capabilities = (plan.items ?? []).map((item) => item.capability);
for (const capability of ["plugin_sdk", "core_source_patterns", "extension_catalog", "verification_assets"]) {
  if (!capabilities.includes(capability)) {
    throw new Error(`first-wave plan missing ${capability}: ${JSON.stringify(plan.items)}`);
  }
}
for (const capability of ["memory_host_sdk", "ui_workspace", "documentation_canon", "agent_skills"]) {
  if (!(plan.backlog ?? []).some((item) => item.capability === capability)) {
    throw new Error(`backlog missing deferred capability ${capability}: ${JSON.stringify(plan.backlog)}`);
  }
}
for (const [index, item] of (plan.items ?? []).entries()) {
  if (
    item.sequence !== index + 1
    || item.workspaceName !== "openclaw"
    || path.resolve(item.workspacePath) !== workspaceDir
    || item.status !== "planned_not_imported"
    || typeof item.recommendedNextStep !== "string"
    || !item.recommendedNextStep.trim()
    || !Array.isArray(item.acceptanceCriteria)
    || item.acceptanceCriteria.length < 4
    || !Array.isArray(item.blockers)
    || item.blockers.length < 3
  ) {
    throw new Error(`first-wave item should include ordered plan detail: ${JSON.stringify(item)}`);
  }
  if (
    item.governance?.mode !== "migration_plan_only"
    || item.governance?.canReadFileContent !== false
    || item.governance?.canMutate !== false
    || item.governance?.canExecute !== false
    || item.governance?.createsTask !== false
    || item.governance?.createsApproval !== false
    || item.governance?.requiresHumanApprovalBeforeImport !== true
    || item.governance?.migrationStatus !== "planned_not_imported"
  ) {
    throw new Error(`first-wave item should remain plan-only and review-gated: ${JSON.stringify(item.governance)}`);
  }
}
if (
  plan.summary?.total !== 4
  || plan.summary?.candidateCount !== 8
  || plan.summary?.byRisk?.low !== 2
  || plan.summary?.byRisk?.medium !== 2
  || plan.summary?.byPriority?.high !== 3
  || plan.summary?.byPriority?.medium !== 1
  || plan.summary?.governance?.mode !== "migration_plan_only"
  || plan.summary?.governance?.canReadFileContent !== false
  || plan.summary?.governance?.canMutate !== false
  || plan.summary?.governance?.canExecute !== false
  || plan.summary?.governance?.createsTask !== false
  || plan.summary?.governance?.createsApproval !== false
) {
  throw new Error(`migration plan summary mismatch: ${JSON.stringify(plan.summary)}`);
}
if (JSON.stringify(plan.summary) !== JSON.stringify(summary.summary)) {
  throw new Error(`migration plan list and summary endpoints should agree: ${JSON.stringify({ list: plan.summary, summary: summary.summary })}`);
}
for (const secret of ["PLAN_SECRET_BUILD_BODY", "PLAN_SECRET_TYPECHECK_BODY", "PLAN_SECRET_README_CONTENT"]) {
  if (rawPlan.includes(secret)) {
    throw new Error(`migration plan must not expose source contents or script bodies: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawSourceMigrationPlan: {
    registry: plan.registry,
    mode: plan.mode,
    sourceRegistry: plan.sourceRegistry,
    root: plan.roots[0],
    summary: plan.summary,
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
    endpoints: [
      "/workspaces/openclaw-migration-plan",
      "/workspaces/openclaw-migration-plan/summary",
    ],
  },
}, null, 2));
EOF
