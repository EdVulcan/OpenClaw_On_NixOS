#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-workspace-edit-target-selection-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
TARGET_RELATIVE_PATH="src/agents/tools/edit-target-tool.ts"
TARGET_FILE="$WORKSPACE_DIR/$TARGET_RELATIVE_PATH"
UNRELATED_SECRET="EDIT_TARGET_SELECTION_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9630}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9631}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9632}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9633}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9634}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9635}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9636}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9637}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9700}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-edit-target-selection-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-edit-target-selection-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$TOOLS_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{"name":"openclaw","private":true}
JSON
cat > "$TARGET_FILE" <<EOF
export function editTargetTool() {
  const before = "before";
  const marker = "$UNRELATED_SECRET";
  const omega = "omega";
  return { before, omega, marker };
}
EOF

cleanup() {
  rm -f "${SELECTION_FILE:-}" "${DRAFT_FILE:-}" "${TASK_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

SELECTION_FILE="$(mktemp)"
DRAFT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
EDITS_JSON='[{"search":"before","replacement":"after","occurrence":1},{"search":"omega","replacement":"zeta","occurrence":1}]'
EDITS_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$EDITS_JSON")"

curl --silent --fail "$CORE_URL/plugins/native-adapter/workspace-edit-target-selection?scope=tools&query=edit&limit=8" > "$SELECTION_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/workspace-patch-apply/draft?edits=$EDITS_ENCODED&deriveProposalFromSource=true&proposalQuery=edit&selectTargetFromSource=true&targetSelectionQuery=edit&contextLines=0" > "$DRAFT_FILE"
curl --silent --fail \
  -H "content-type: application/json" \
  -d "{\"edits\":$EDITS_JSON,\"deriveProposalFromSource\":true,\"proposalQuery\":\"edit\",\"selectTargetFromSource\":true,\"targetSelectionQuery\":\"edit\",\"contextLines\":0,\"confirm\":true}" \
  "$CORE_URL/plugins/native-adapter/workspace-patch-apply-tasks" > "$TASK_FILE"

node - <<'EOF' "$SELECTION_FILE" "$DRAFT_FILE" "$TASK_FILE" "$TARGET_RELATIVE_PATH" "$UNRELATED_SECRET"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const selection = readJson(2);
const draft = readJson(3);
const task = readJson(4);
const expectedTarget = process.argv[5];
const unrelatedSecret = process.argv[6];
const raw = JSON.stringify({ selection, draft, task });

if (
  !selection.ok
  || selection.registry !== "openclaw-native-workspace-edit-target-selection-v0"
  || selection.selectedTarget?.relativePath !== expectedTarget
  || selection.summary?.canFeedPatchProposal !== true
  || selection.governance?.exposesSourceFileContent !== false
  || selection.governance?.canMutate !== false
) {
  throw new Error(`target selection mismatch: ${JSON.stringify(selection)}`);
}
if (
  !draft.ok
  || draft.target?.relativePath !== expectedTarget
  || draft.targetSelection?.selectedTarget?.relativePath !== expectedTarget
  || draft.proposal?.source !== "openclaw-source-derived-edit-proposal-v0"
  || draft.proposalSourceSignals?.governance?.exposesSourceFileContent !== false
  || draft.proposal?.dryRun?.contentExposed !== false
) {
  throw new Error(`target-selected draft mismatch: ${JSON.stringify(draft)}`);
}
if (
  !task.ok
  || task.target?.relativePath !== expectedTarget
  || task.targetSelection?.selectedTarget?.relativePath !== expectedTarget
  || task.approval?.status !== "pending"
  || task.task?.approval?.required !== true
) {
  throw new Error(`target-selected task mismatch: ${JSON.stringify(task)}`);
}
for (const secret of [unrelatedSecret, "EDIT_TARGET_SELECTION_SECRET_DO_NOT_LEAK"]) {
  if (raw.includes(secret)) {
    throw new Error(`target selection leaked content: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawWorkspaceEditTargetSelection: {
    selected: selection.selectedTarget.relativePath,
    candidates: selection.summary.candidateCount,
    draftTarget: draft.target.relativePath,
  },
}, null, 2));
EOF
