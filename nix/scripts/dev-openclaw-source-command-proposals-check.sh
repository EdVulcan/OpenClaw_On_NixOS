#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-source-command-proposals-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
PROMPT_SECRET="SOURCE_COMMAND_PROMPT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9710}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9711}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9712}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9713}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9714}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9715}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9716}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9717}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9780}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-source-command-proposals-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-source-command-proposals-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$TOOLS_DIR" "$DOCS_TOOLS_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "private": true,
  "scripts": {
    "build": "echo source-command-secret-build",
    "dev": "echo source-command-secret-dev",
    "lint": "echo source-command-secret-lint",
    "test": "echo source-command-secret-test",
    "typecheck": "echo source-command-secret-typecheck"
  }
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "packages/*"
YAML
cat > "$WORKSPACE_DIR/TOOLS.md" <<EOF
# Tools
Command and shell proposals must stay proposal-only, require approval before process execution, and avoid exposing script bodies.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/command-runner.md" <<'MD'
# Command Runner
Use command, shell, and process metadata to draft safe proposal-only command shapes before approval.
MD
cat > "$TOOLS_DIR/command-tool.ts" <<'TS'
export function commandTool() {
  const secret = "SOURCE_COMMAND_TOOL_SECRET_DO_NOT_LEAK";
  return { kind: "command", secret };
}
TS
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createSourceCommandProposalContract() {
  return { capabilityId: "source-command-proposals" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type SourceCommandProposalManifest = { pluginId: string };
TS

cleanup() {
  rm -f "${PROPOSALS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

PROPOSALS_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/plugins/native-adapter/source-command-proposals?query=command&limit=12" > "$PROPOSALS_FILE"

node - <<'EOF' "$PROPOSALS_FILE" "$WORKSPACE_DIR" "$PROMPT_SECRET"
const fs = require("node:fs");
const proposals = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const workspaceDir = process.argv[3];
const promptSecret = process.argv[4];
const raw = JSON.stringify(proposals);

if (
  !proposals.ok
  || proposals.registry !== "openclaw-source-command-proposals-v0"
  || proposals.mode !== "proposal-only-source-absorbed"
  || proposals.sourceRegistry !== "workspace-command-proposals-v0"
  || proposals.sourceCommandSignals?.registry !== "openclaw-source-command-proposals-v0"
  || proposals.sourceCommandSignals?.toolSignals?.matchedTools < 1
  || proposals.sourceCommandSignals?.promptSignals?.matchedFiles < 1
  || proposals.sourceCommandSignals?.promptSignals?.commandVocabularyFiles < 1
) {
  throw new Error(`source command proposal envelope mismatch: ${JSON.stringify(proposals)}`);
}
if (
  proposals.governance?.canExecute !== false
  || proposals.governance?.createsTask !== false
  || proposals.governance?.createsApproval !== false
  || proposals.governance?.exposesScriptBodies !== false
  || proposals.governance?.exposesPromptContent !== false
  || proposals.governance?.exposesSourceFileContent !== false
) {
  throw new Error(`source command proposal governance mismatch: ${JSON.stringify(proposals.governance)}`);
}
const items = proposals.items ?? [];
for (const scriptName of ["typecheck", "test", "lint", "build", "dev"]) {
  const proposal = items.find((item) => item.scriptName === scriptName);
  if (!proposal || proposal.workspacePath !== workspaceDir || proposal.command !== "pnpm" || proposal.args?.join(" ") !== `run ${scriptName}`) {
    throw new Error(`missing source command proposal for ${scriptName}: ${JSON.stringify(proposal)}`);
  }
  if (
    proposal.sourceCommand?.registry !== "openclaw-source-command-proposals-v0"
    || proposal.sourceCommand?.absorbedFromEnhancedOpenClaw !== true
    || proposal.governance?.canExecute !== false
    || proposal.governance?.canCreateTaskFromSourceAbsorption !== false
    || proposal.governance?.requiresExplicitExecutionApproval !== true
    || proposal.governance?.exposesScriptBody !== false
  ) {
    throw new Error(`source command proposal should remain proposal-only: ${JSON.stringify(proposal)}`);
  }
}
for (const secret of [
  promptSecret,
  "source-command-secret-build",
  "source-command-secret-dev",
  "source-command-secret-lint",
  "source-command-secret-test",
  "source-command-secret-typecheck",
  "SOURCE_COMMAND_TOOL_SECRET_DO_NOT_LEAK",
]) {
  if (raw.includes(secret)) {
    throw new Error(`source command proposals leaked body content: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawSourceCommandProposals: {
    registry: proposals.registry,
    mode: proposals.mode,
    matchedTools: proposals.sourceCommandSignals.toolSignals.matchedTools,
    promptSemanticFiles: proposals.sourceCommandSignals.promptSignals.matchedFiles,
    total: proposals.summary.total,
  },
}, null, 2));
EOF
