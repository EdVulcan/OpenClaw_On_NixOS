#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-source-derived-edit-proposal-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
TARGET_RELATIVE_PATH="scratch/source-derived-edit.txt"
TARGET_FILE="$WORKSPACE_DIR/$TARGET_RELATIVE_PATH"
UNRELATED_SECRET="SOURCE_DERIVED_EDIT_PROPOSAL_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9610}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9611}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9612}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9613}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9614}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9615}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9616}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9617}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9680}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-source-derived-edit-proposal-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-source-derived-edit-proposal-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$TOOLS_DIR" "$(dirname "$TARGET_FILE")"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{"name":"openclaw","private":true}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "packages/*"
YAML
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export interface SourceDerivedProposalContract { capabilityId: string }
export function createSourceDerivedProposalContract(): SourceDerivedProposalContract {
  return { capabilityId: "source-derived" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type SourceDerivedProposalManifest = { pluginId: string };
TS
cat > "$TOOLS_DIR/edit-proposal-tool.ts" <<'TS'
export function editProposalTool() {
  const SOURCE_DERIVED_TOOL_SECRET = "must-not-leak";
  return SOURCE_DERIVED_TOOL_SECRET;
}
TS
cat > "$TARGET_FILE" <<EOF
alpha context
before
safe middle
$UNRELATED_SECRET
omega
tail context
EOF

cleanup() {
  rm -f "${DRAFT_FILE:-}" "${TASK_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

DRAFT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
EDITS_JSON='[{"search":"before","replacement":"after","occurrence":1},{"kind":"replace_lines","startLine":5,"endLine":5,"replacement":"zeta\n"}]'
EDITS_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$EDITS_JSON")"

curl --silent --fail "$CORE_URL/plugins/native-adapter/workspace-patch-apply/draft?relativePath=$TARGET_RELATIVE_PATH&edits=$EDITS_ENCODED&deriveProposalFromSource=true&proposalQuery=edit&contextLines=0" > "$DRAFT_FILE"
curl --silent --fail \
  -H "content-type: application/json" \
  -d "{\"relativePath\":\"$TARGET_RELATIVE_PATH\",\"edits\":$EDITS_JSON,\"deriveProposalFromSource\":true,\"proposalQuery\":\"edit\",\"contextLines\":0,\"confirm\":true}" \
  "$CORE_URL/plugins/native-adapter/workspace-patch-apply-tasks" > "$TASK_FILE"

node - <<'EOF' "$DRAFT_FILE" "$TASK_FILE" "$UNRELATED_SECRET"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const draft = readJson(2);
const task = readJson(3);
const unrelatedSecret = process.argv[4];
const raw = JSON.stringify({ draft, task });

if (
  !draft.ok
  || draft.proposal?.source !== "openclaw-source-derived-edit-proposal-v0"
  || draft.proposalSourceSignals?.registry !== "openclaw-source-derived-edit-proposal-v0"
  || draft.proposalSourceSignals?.toolSignals?.matchedTools < 1
  || draft.proposalSourceSignals?.semanticSignals?.matchedFiles < 1
  || draft.proposalSourceSignals?.governance?.exposesSourceFileContent !== false
  || draft.proposalSourceSignals?.governance?.canExecuteToolCode !== false
  || draft.proposal?.dryRun?.contentExposed !== false
) {
  throw new Error(`source-derived draft mismatch: ${JSON.stringify(draft)}`);
}
if (
  !task.ok
  || task.proposal?.source !== "openclaw-source-derived-edit-proposal-v0"
  || task.proposalSourceSignals?.registry !== "openclaw-source-derived-edit-proposal-v0"
  || task.approval?.status !== "pending"
  || task.task?.approval?.required !== true
) {
  throw new Error(`source-derived task mismatch: ${JSON.stringify(task)}`);
}
for (const secret of [unrelatedSecret, "SOURCE_DERIVED_TOOL_SECRET", "must-not-leak"]) {
  if (raw.includes(secret)) {
    throw new Error(`source-derived proposal leaked content: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawSourceDerivedEditProposal: {
    proposal: draft.proposal.registry,
    matchedTools: draft.proposalSourceSignals.toolSignals.matchedTools,
    matchedSemanticFiles: draft.proposalSourceSignals.semanticSignals.matchedFiles,
  },
}, null, 2));
EOF
