#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-workspace-command-proposals-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8660}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8661}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8662}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8663}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8664}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8665}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8666}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8667}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8730}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-workspace-command-proposals-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-workspace-command-proposals-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-command-proposals-fixture",
  "private": true,
  "scripts": {
    "build": "echo observer-secret-build-body",
    "dev": "echo observer-secret-dev-body",
    "test": "echo observer-secret-test-body",
    "typecheck": "echo observer-secret-typecheck-body"
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
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${PROPOSALS_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
PROPOSALS_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/workspaces/command-proposals" > "$PROPOSALS_FILE"
curl --silent --fail "$CORE_URL/workspaces/command-proposals/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$PROPOSALS_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const proposals = readJson(4);
const summary = readJson(5);
const workspaceDir = process.argv[6];
const rawProposals = JSON.stringify(proposals);
const secretBodies = [
  "observer-secret-build-body",
  "observer-secret-dev-body",
  "observer-secret-test-body",
  "observer-secret-typecheck-body",
];

const requiredHtml = [
  "workspace-command-registry",
  "workspace-command-total",
  "workspace-command-validation",
  "workspace-command-build",
  "workspace-command-runtime",
  "workspace-command-mode",
  "workspace-command-json",
];
const requiredClient = [
  "/workspaces/command-proposals",
  "renderWorkspaceCommandProposals",
  "refreshWorkspaceCommandProposals",
  "Proposal-only: command shapes are visible, execution remains disabled here.",
  "Script bodies are not displayed.",
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

if (!proposals.ok || proposals.registry !== "workspace-command-proposals-v0" || proposals.mode !== "proposal-only") {
  throw new Error(`workspace command proposals should expose proposal-only mode: ${JSON.stringify(proposals)}`);
}
const items = proposals.items ?? [];
if (items.length !== 4) {
  throw new Error(`workspace command proposals should include fixture scripts: ${JSON.stringify(items)}`);
}
for (const scriptName of ["typecheck", "test", "build", "dev"]) {
  const proposal = items.find((item) => item.scriptName === scriptName);
  if (!proposal || proposal.cwd !== workspaceDir || proposal.command !== "pnpm" || proposal.args?.join(" ") !== `run ${scriptName}`) {
    throw new Error(`proposal should expose safe command shape for ${scriptName}: ${JSON.stringify(proposal)}`);
  }
  if (
    proposal.governance?.canExecute !== false
    || proposal.governance?.requiresExplicitExecutionApproval !== true
    || proposal.governance?.exposesScriptBody !== false
  ) {
    throw new Error(`proposal should remain non-executable: ${JSON.stringify(proposal.governance)}`);
  }
}
if (secretBodies.some((secret) => rawProposals.includes(secret))) {
  throw new Error("workspace command proposals must not expose package.json script bodies");
}
if (
  proposals.summary?.total !== 4
  || proposals.summary?.byCategory?.validation !== 2
  || proposals.summary?.byCategory?.build !== 1
  || proposals.summary?.byCategory?.runtime !== 1
  || proposals.summary?.byRisk?.low !== 3
  || proposals.summary?.byRisk?.medium !== 1
) {
  throw new Error(`workspace command proposal summary mismatch: ${JSON.stringify(proposals.summary)}`);
}
if (JSON.stringify(proposals.summary) !== JSON.stringify(summary.summary)) {
  throw new Error(`workspace command proposal list and summary endpoints should agree: ${JSON.stringify({ list: proposals.summary, summary: summary.summary })}`);
}

console.log(JSON.stringify({
  observerWorkspaceCommandProposals: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/workspaces/command-proposals",
      "/workspaces/command-proposals/summary",
      "renderWorkspaceCommandProposals",
    ],
    summary: summary.summary,
    examples: items.map((item) => ({
      workspaceName: item.workspaceName,
      scriptName: item.scriptName,
      command: item.command,
      args: item.args,
      risk: item.risk,
      governance: item.governance,
    })),
  },
}, null, 2));
EOF
