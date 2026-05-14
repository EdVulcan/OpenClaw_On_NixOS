#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-workspace-edit-proposal-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
TARGET_RELATIVE_PATH="scratch/observer-native-edit.txt"
TARGET_FILE="$WORKSPACE_DIR/$TARGET_RELATIVE_PATH"
UNRELATED_SECRET="OBSERVER_NATIVE_WORKSPACE_EDIT_PROPOSAL_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9600}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9601}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9602}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9603}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9604}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9605}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9606}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9607}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9670}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-native-workspace-edit-proposal-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-native-workspace-edit-proposal-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$WORKSPACE_DIR/src/agents/tools" "$WORKSPACE_DIR/scratch"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "private": true
}
JSON
cat > "$TARGET_FILE" <<EOF
alpha context
before
safe middle
$UNRELATED_SECRET
omega
tail context
EOF

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${DRAFT_FILE:-}" "${TASK_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
DRAFT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"

EDITS_JSON='[{"search":"before","replacement":"after","occurrence":1},{"search":"omega","replacement":"zeta","occurrence":1}]'
PROPOSAL_JSON='{"title":"Observer proposal check","rationale":"Verify Observer can see proposal envelope metadata.","targetContext":{"symbol":"observerProposal","fileRole":"observer fixture"}}'
EDITS_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$EDITS_JSON")"
PROPOSAL_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$PROPOSAL_JSON")"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/workspace-patch-apply/draft?relativePath=$TARGET_RELATIVE_PATH&edits=$EDITS_ENCODED&proposal=$PROPOSAL_ENCODED&contextLines=0" > "$DRAFT_FILE"
curl --silent --fail \
  -H "content-type: application/json" \
  -d "{\"relativePath\":\"$TARGET_RELATIVE_PATH\",\"edits\":$EDITS_JSON,\"proposal\":$PROPOSAL_JSON,\"contextLines\":0,\"confirm\":true}" \
  "$CORE_URL/plugins/native-adapter/workspace-patch-apply-tasks" > "$TASK_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$DRAFT_FILE" "$TASK_FILE" "$UNRELATED_SECRET"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const draft = readJson(4);
const task = readJson(5);
const unrelatedSecret = process.argv[6];
const raw = JSON.stringify({ html, client, draft, task });

for (const token of [
  "OpenClaw Workspace Patch Apply",
  "workspace-patch-apply-task-button",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer proposal HTML missing ${token}`);
  }
}
for (const token of [
  "Proposal Envelope: registry=",
  "openclaw-native-workspace-edit-proposal-v0",
  "Observer sample edit proposal",
  "dryRun=",
  "contentExposed=",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer proposal client missing ${token}`);
  }
}
if (
  !draft.ok
  || draft.proposal?.registry !== "openclaw-native-workspace-edit-proposal-v0"
  || draft.proposal?.title !== "Observer proposal check"
  || draft.proposal?.targetContext?.symbol !== "observerProposal"
  || draft.proposal?.dryRun?.contentExposed !== false
  || draft.proposal?.governance?.approvalRequired !== true
) {
  throw new Error(`Observer proposal draft mismatch: ${JSON.stringify(draft)}`);
}
if (
  !task.ok
  || task.proposal?.registry !== "openclaw-native-workspace-edit-proposal-v0"
  || task.proposal?.dryRun?.contentExposed !== false
  || task.approval?.status !== "pending"
  || task.task?.approval?.required !== true
) {
  throw new Error(`Observer proposal task mismatch: ${JSON.stringify(task)}`);
}
if (raw.includes(unrelatedSecret)) {
  throw new Error("Observer proposal leaked unrelated file content");
}

console.log(JSON.stringify({
  observerOpenClawNativeWorkspaceEditProposal: {
    html: "visible",
    task: task.task.id,
    proposal: draft.proposal.registry,
  },
}, null, 2));
EOF
