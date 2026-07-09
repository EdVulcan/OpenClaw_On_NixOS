#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-native-engineering-loop-operator-controls-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
TARGET_FILE="$WORKSPACE_DIR/package.json"
WRITE_RELATIVE_PATH="scratch/operator-selected-engineering-loop.txt"
WRITE_TARGET="$WORKSPACE_DIR/$WRITE_RELATIVE_PATH"
OLD_TEXT="OpenClaw on NixOS monorepo skeleton"
NEW_TEXT="OpenClaw on NixOS parameterized workbench skeleton"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10440}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10441}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10442}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10443}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10444}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10445}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10446}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10447}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10448}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-engineering-loop-operator-controls-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-engineering-loop-operator-controls-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/scratch"
cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "private": true,
  "description": "OpenClaw on NixOS monorepo skeleton",
  "scripts": {
    "typecheck": "printf engineering-loop-operator-controls-ok"
  }
}
JSON
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${EDIT_TASK_FILE:-}" \
    "${WRITE_TASK_FILE:-}" \
    "${VERIFY_TASK_FILE:-}" \
    "${OPERATOR_STEP_FILE:-}" \
    "${APPROVALS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

OPENCLAW_POST_JSON_DATA_FLAG="-d"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
EDIT_TASK_FILE="$(mktemp)"
WRITE_TASK_FILE="$(mktemp)"
VERIFY_TASK_FILE="$(mktemp)"
OPERATOR_STEP_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

post_json "$CORE_URL/plugins/native-adapter/engineering-edit-proposal-tasks" "{\"relativePath\":\"package.json\",\"oldString\":\"$OLD_TEXT\",\"newString\":\"$NEW_TEXT\",\"contextLines\":1,\"maxOutputChars\":8000,\"confirm\":true}" > "$EDIT_TASK_FILE"
post_json "$CORE_URL/plugins/native-adapter/engineering-write-proposal-tasks" "{\"relativePath\":\"$WRITE_RELATIVE_PATH\",\"content\":\"OpenClaw operator-selected engineering loop write proposal\\n\",\"overwrite\":true,\"contextLines\":1,\"confirm\":true}" > "$WRITE_TASK_FILE"
post_json "$CORE_URL/plugins/native-adapter/source-command-proposals/tasks" '{"proposalId":"openclaw:typecheck","query":"verify","confirm":true}' > "$VERIFY_TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$OPERATOR_STEP_FILE"
curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10" > "$APPROVALS_FILE"

node - <<'EOF' \
  "$HTML_FILE" \
  "$CLIENT_FILE" \
  "$EDIT_TASK_FILE" \
  "$WRITE_TASK_FILE" \
  "$VERIFY_TASK_FILE" \
  "$OPERATOR_STEP_FILE" \
  "$APPROVALS_FILE" \
  "$TARGET_FILE" \
  "$WRITE_TARGET" \
  "$OLD_TEXT" \
  "$NEW_TEXT" \
  "$WRITE_RELATIVE_PATH"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const editTask = readJson(4);
const writeTask = readJson(5);
const verifyTask = readJson(6);
const operatorStep = readJson(7);
const approvals = readJson(8);
const targetFile = process.argv[9];
const writeTarget = process.argv[10];
const oldText = process.argv[11];
const newText = process.argv[12];
const writeRelativePath = process.argv[13];
const targetPackage = JSON.parse(fs.readFileSync(targetFile, "utf8"));

for (const token of [
  "engineering-edit-proposal-task-button",
  "engineering-write-proposal-task-button",
  "engineering-verification-task-button",
  "engineering-edit-path-input",
  "engineering-edit-old-input",
  "engineering-edit-new-input",
  "engineering-write-path-input",
  "engineering-write-content-input",
  "engineering-verification-proposal-input",
  "engineering-verification-query-input",
  "engineering-loop-state-kind",
  "engineering-loop-state-task",
  "engineering-loop-state-approval",
  "engineering-loop-state-next",
  "engineering-loop-state-evidence",
  "engineering-loop-state-json",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing engineering loop operator control/input: ${token}`);
  }
}

for (const token of [
  "boundedEngineeringInput",
  "readEngineeringEditLoopInput",
  "readEngineeringWriteLoopInput",
  "readEngineeringVerificationLoopInput",
  "engineeringLoopEvidenceRoute",
  "renderEngineeringLoopControlState",
  "approve pending approval, then run operator step",
  "createEngineeringEditLoopApprovalTask",
  "createEngineeringWriteLoopApprovalTask",
  "createEngineeringVerificationLoopApprovalTask",
  "/plugins/native-adapter/engineering-edit-proposal-tasks",
  "/plugins/native-adapter/engineering-write-proposal-tasks",
  "/plugins/native-adapter/source-command-proposals/tasks",
  "approval and operator step are still required",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing engineering loop operator control token: ${token}`);
  }
}

if (
  !editTask.ok
  || editTask.registry !== "openclaw-native-engineering-edit-proposal-task-v0"
  || editTask.task?.status !== "queued"
  || editTask.approval?.status !== "pending"
  || editTask.engineeringEditProposal?.contentExposed !== false
  || editTask.target?.relativePath !== "package.json"
  || editTask.engineeringEditProposal?.target?.proposedBytes <= editTask.engineeringEditProposal?.target?.originalBytes
  || editTask.workspacePatchApply?.registry !== "openclaw-native-workspace-patch-apply-task-v0"
) {
  throw new Error(`edit operator control task mismatch: ${JSON.stringify(editTask)}`);
}
if (
  !writeTask.ok
  || writeTask.registry !== "openclaw-native-engineering-write-proposal-task-v0"
  || writeTask.task?.status !== "queued"
  || writeTask.approval?.status !== "pending"
  || writeTask.engineeringWriteProposal?.contentExposed !== false
  || writeTask.target?.relativePath !== writeRelativePath
  || writeTask.workspaceTextWrite?.registry !== "openclaw-native-workspace-text-write-task-v0"
) {
  throw new Error(`write operator control task mismatch: ${JSON.stringify(writeTask)}`);
}
if (
  !verifyTask.ok
  || verifyTask.registry !== "openclaw-source-command-task-v0"
  || verifyTask.task?.status !== "queued"
  || verifyTask.approval?.status !== "pending"
) {
  throw new Error(`verification operator control task mismatch: ${JSON.stringify(verifyTask)}`);
}
if (!operatorStep.ok || operatorStep.ran !== false || operatorStep.blocked !== true || operatorStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should remain blocked before approval: ${JSON.stringify(operatorStep)}`);
}
if ((approvals.items ?? []).length < 3 || approvals.summary?.pendingCount < 3) {
  throw new Error(`pending approval inbox should contain operator-created engineering tasks: ${JSON.stringify(approvals)}`);
}
if (targetPackage.description !== oldText || targetPackage.description === newText) {
  throw new Error(`edit task mutated before approval: ${JSON.stringify(targetPackage)}`);
}
if (fs.existsSync(writeTarget)) {
  throw new Error(`write task created a file before approval: ${writeTarget}`);
}

console.log(JSON.stringify({
  openclawNativeEngineeringLoopOperatorControls: {
    editTaskId: editTask.task.id,
    writeTaskId: writeTask.task.id,
    verificationTaskId: verifyTask.task.id,
    pendingApprovals: approvals.summary.pendingCount,
    parameterizedInputs: true,
    approvalGatePreserved: true,
  },
}, null, 2));
EOF
