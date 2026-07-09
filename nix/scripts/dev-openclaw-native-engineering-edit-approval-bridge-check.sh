#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-native-engineering-edit-approval-bridge-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
TARGET_FILE="$WORKSPACE_DIR/package.json"

source "$SCRIPT_DIR/openclaw-engineering-edit-proposal-fixture.sh"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10360}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10361}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10362}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10363}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10364}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10365}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10366}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10367}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10368}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-engineering-edit-approval-bridge-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-engineering-edit-approval-bridge-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OLD_TEXT="OpenClaw on NixOS monorepo skeleton"
NEW_TEXT="OpenClaw on NixOS native agent body skeleton"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
prepare_engineering_edit_proposal_fixture "$WORKSPACE_DIR" "ENGINEERING_EDIT_APPROVAL_BRIDGE"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${NO_CONFIRM_FILE:-}" \
    "${DUPLICATE_FILE:-}" \
    "${TASK_FILE:-}" \
    "${STEP_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

OPENCLAW_POST_JSON_DATA_FLAG="-d"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"

"$SCRIPT_DIR/dev-up.sh"

NO_CONFIRM_FILE="$(mktemp)"
DUPLICATE_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

NO_CONFIRM_STATUS="$(curl --silent --output "$NO_CONFIRM_FILE" --write-out "%{http_code}" \
  -H "content-type: application/json" \
  -d "{\"relativePath\":\"package.json\",\"oldString\":\"$OLD_TEXT\",\"newString\":\"$NEW_TEXT\",\"confirm\":false}" \
  "$CORE_URL/plugins/native-adapter/engineering-edit-proposal-tasks")"
DUPLICATE_STATUS="$(curl --silent --output "$DUPLICATE_FILE" --write-out "%{http_code}" \
  -H "content-type: application/json" \
  -d "{\"relativePath\":\"src/duplicate.ts\",\"oldString\":\"repeat\",\"newString\":\"once\",\"confirm\":true}" \
  "$CORE_URL/plugins/native-adapter/engineering-edit-proposal-tasks")"
post_json "$CORE_URL/plugins/native-adapter/engineering-edit-proposal-tasks" "{\"relativePath\":\"package.json\",\"oldString\":\"$OLD_TEXT\",\"newString\":\"$NEW_TEXT\",\"contextLines\":1,\"confirm\":true}" > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/tasks/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$NO_CONFIRM_FILE" "$NO_CONFIRM_STATUS" "$DUPLICATE_FILE" "$DUPLICATE_STATUS" "$TASK_FILE" "$STEP_FILE" "$SUMMARY_FILE" "$TARGET_FILE" "$OLD_TEXT" "$NEW_TEXT"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const noConfirm = readJson(2);
const noConfirmStatus = process.argv[3];
const duplicate = readJson(4);
const duplicateStatus = process.argv[5];
const task = readJson(6);
const step = readJson(7);
const summary = readJson(8);
const targetFile = process.argv[9];
const oldText = process.argv[10];
const newText = process.argv[11];
const targetText = fs.readFileSync(targetFile, "utf8");

if (noConfirmStatus !== "400" || noConfirm.ok !== false || !String(noConfirm.error ?? "").includes("confirm=true")) {
  throw new Error(`edit bridge without confirm should be rejected: status=${noConfirmStatus} body=${JSON.stringify(noConfirm)}`);
}
if (duplicateStatus !== "400" || duplicate.ok !== false || !String(duplicate.error ?? "").includes("exactly one match")) {
  throw new Error(`non-unique edit proposal should be rejected: status=${duplicateStatus} body=${JSON.stringify(duplicate)}`);
}
if (!targetText.includes(oldText) || targetText.includes(newText)) {
  throw new Error(`edit approval bridge must not mutate the target before approval: ${targetText}`);
}
if (
  !task.ok
  || task.registry !== "openclaw-native-engineering-edit-proposal-task-v0"
  || task.mode !== "approval-gated-edit-proposal-bridge"
  || task.sourceRegistry !== "openclaw-native-engineering-edit-proposal-v0"
  || task.capability?.id !== "act.openclaw.engineering_tool.edit_proposal"
  || task.task?.status !== "queued"
  || task.approval?.status !== "pending"
  || task.engineeringEditProposal?.registry !== "openclaw-native-engineering-edit-proposal-v0"
  || task.engineeringEditProposal?.contentExposed !== false
  || task.engineeringEditProposal?.diffPreviewExposed !== true
  || task.workspacePatchApply?.registry !== "openclaw-native-workspace-patch-apply-task-v0"
  || task.workspacePatchApply?.contentExposed !== false
  || task.workspacePatchApply?.diffPreviewExposed !== true
  || task.task?.engineeringEditProposal?.approvedMutationCapabilityId !== "act.openclaw.workspace_patch_apply"
  || task.governance?.createsTask !== true
  || task.governance?.createsApproval !== true
  || task.governance?.canExecuteWithoutApproval !== false
  || task.governance?.executed !== false
  || task.governance?.canMutateBeforeApproval !== false
) {
  throw new Error(`edit approval bridge response mismatch: ${JSON.stringify(task)}`);
}
if (!step.ok || step.ran !== false || step.blocked !== true || step.reason !== "policy_requires_approval") {
  throw new Error(`operator step should remain blocked before edit approval: ${JSON.stringify(step)}`);
}
if (summary.summary?.counts?.total !== 1 || summary.summary?.counts?.queued !== 1) {
  throw new Error(`task summary should contain one queued edit bridge task: ${JSON.stringify(summary)}`);
}

console.log(JSON.stringify({
  openclawNativeEngineeringEditApprovalBridge: {
    registry: task.registry,
    taskId: task.task.id,
    approvalId: task.approval.id,
    operatorBlocked: step.blocked,
    targetMutated: targetText.includes(newText),
  },
}, null, 2));
EOF
