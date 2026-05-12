#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-workspace-command-proposals-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8650}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8651}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8652}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8653}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8654}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8655}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8656}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8657}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8720}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-workspace-command-proposals-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-workspace-command-proposals-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-command-proposals-fixture",
  "private": true,
  "scripts": {
    "build": "echo secret-build-body",
    "dev": "echo secret-dev-body",
    "lint": "echo secret-lint-body",
    "test": "echo secret-test-body",
    "typecheck": "echo secret-typecheck-body"
  },
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "apps/*"
  - "packages/*"
YAML

cleanup() {
  rm -f \
    "${PROPOSALS_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

PROPOSALS_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/workspaces/command-proposals" > "$PROPOSALS_FILE"
curl --silent --fail "$CORE_URL/workspaces/command-proposals/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$PROPOSALS_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const proposals = readJson(2);
const summary = readJson(3);
const workspaceDir = process.argv[4];
const rawProposals = JSON.stringify(proposals);
const secretBodies = [
  "secret-build-body",
  "secret-dev-body",
  "secret-lint-body",
  "secret-test-body",
  "secret-typecheck-body",
];

if (!proposals.ok || proposals.registry !== "workspace-command-proposals-v0" || proposals.mode !== "proposal-only") {
  throw new Error(`workspace command proposals should expose proposal-only mode: ${JSON.stringify(proposals)}`);
}
if (proposals.workspaceRegistry !== "workspace-detect-v0" || proposals.roots?.[0] !== workspaceDir) {
  throw new Error(`workspace command proposals should derive from workspace detection: ${JSON.stringify(proposals)}`);
}

const items = proposals.items ?? [];
if (items.length !== 5) {
  throw new Error(`workspace command proposals should include fixture scripts: ${JSON.stringify(items)}`);
}
for (const scriptName of ["typecheck", "test", "lint", "build", "dev"]) {
  const proposal = items.find((item) => item.scriptName === scriptName);
  if (!proposal) {
    throw new Error(`missing proposal for ${scriptName}: ${JSON.stringify(items)}`);
  }
  if (
    proposal.workspaceName !== "openclaw"
    || proposal.workspacePath !== workspaceDir
    || proposal.cwd !== workspaceDir
    || proposal.packageManager !== "pnpm"
    || proposal.command !== "pnpm"
    || proposal.args?.[0] !== "run"
    || proposal.args?.[1] !== scriptName
    || proposal.usesShell !== false
    || proposal.status !== "proposed"
  ) {
    throw new Error(`proposal should describe a safe pnpm run command shape: ${JSON.stringify(proposal)}`);
  }
  if (
    proposal.governance?.mode !== "proposal_only"
    || proposal.governance?.canExecute !== false
    || proposal.governance?.requiresExplicitExecutionApproval !== true
    || proposal.governance?.exposesScriptBody !== false
  ) {
    throw new Error(`proposal should remain non-executable: ${JSON.stringify(proposal.governance)}`);
  }
}
if (items.find((item) => item.scriptName === "dev")?.risk !== "medium") {
  throw new Error(`dev proposal should be medium risk: ${JSON.stringify(items)}`);
}
for (const scriptName of ["typecheck", "test", "lint", "build"]) {
  if (items.find((item) => item.scriptName === scriptName)?.risk !== "low") {
    throw new Error(`${scriptName} proposal should be low risk: ${JSON.stringify(items)}`);
  }
}
if (secretBodies.some((secret) => rawProposals.includes(secret))) {
  throw new Error("workspace command proposals must not expose package.json script bodies");
}
if (
  proposals.summary?.total !== 5
  || proposals.summary?.workspaces !== 1
  || proposals.summary?.byWorkspace?.openclaw !== 5
  || proposals.summary?.byPackageManager?.pnpm !== 5
  || proposals.summary?.byCategory?.validation !== 3
  || proposals.summary?.byCategory?.build !== 1
  || proposals.summary?.byCategory?.runtime !== 1
  || proposals.summary?.byRisk?.low !== 4
  || proposals.summary?.byRisk?.medium !== 1
) {
  throw new Error(`workspace command proposal summary mismatch: ${JSON.stringify(proposals.summary)}`);
}
if (JSON.stringify(proposals.summary) !== JSON.stringify(summary.summary)) {
  throw new Error(`workspace command proposal list and summary endpoints should agree: ${JSON.stringify({ list: proposals.summary, summary: summary.summary })}`);
}

console.log(JSON.stringify({
  openclawWorkspaceCommandProposals: {
    registry: proposals.registry,
    mode: proposals.mode,
    root: proposals.roots[0],
    summary: proposals.summary,
    examples: items.map((item) => ({
      scriptName: item.scriptName,
      command: item.command,
      args: item.args,
      cwd: item.cwd,
      risk: item.risk,
      governance: item.governance,
    })),
    endpoints: [
      "/workspaces/command-proposals",
      "/workspaces/command-proposals/summary",
    ],
  },
}, null, 2));
EOF
