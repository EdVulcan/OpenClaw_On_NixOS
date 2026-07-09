#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-engineering-edit-approval-bridge-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
TARGET_FILE="$WORKSPACE_DIR/package.json"

source "$SCRIPT_DIR/openclaw-engineering-edit-proposal-fixture.sh"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10380}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10381}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10382}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10383}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10384}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10385}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10386}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10387}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10388}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-engineering-edit-approval-bridge-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-engineering-edit-approval-bridge-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
OLD_TEXT="OpenClaw on NixOS monorepo skeleton"
NEW_TEXT="OpenClaw on NixOS native agent body skeleton"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
prepare_engineering_edit_proposal_fixture "$WORKSPACE_DIR" "OBSERVER_ENGINEERING_EDIT_APPROVAL_BRIDGE"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${TASK_FILE:-}" \
    "${STEP_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

OPENCLAW_POST_JSON_DATA_FLAG="-d"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
post_json "$CORE_URL/plugins/native-adapter/engineering-edit-proposal-tasks" "{\"relativePath\":\"package.json\",\"oldString\":\"$OLD_TEXT\",\"newString\":\"$NEW_TEXT\",\"contextLines\":1,\"confirm\":true}" > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$TASK_FILE" "$STEP_FILE" "$TARGET_FILE" "$OLD_TEXT" "$NEW_TEXT"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const task = readJson(4);
const step = readJson(5);
const targetFile = process.argv[6];
const oldText = process.argv[7];
const newText = process.argv[8];
const targetText = fs.readFileSync(targetFile, "utf8");

for (const token of [
  "OpenClaw Engineering Edit Proposal",
  "engineering-edit-proposal-registry",
  "engineering-edit-proposal-target",
  "engineering-edit-proposal-apply",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing edit approval bridge-adjacent token: ${token}`);
  }
}
for (const token of [
  "/plugins/native-adapter/engineering-edit-proposal-tasks",
  "Approval-gated task bridge",
  "workspace_patch_apply task only with explicit confirmation",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing edit approval bridge token: ${token}`);
  }
}
if (!targetText.includes(oldText) || targetText.includes(newText)) {
  throw new Error(`Observer edit approval bridge must not mutate the target before approval: ${targetText}`);
}
if (
  !task.ok
  || task.registry !== "openclaw-native-engineering-edit-proposal-task-v0"
  || task.task?.status !== "queued"
  || task.approval?.status !== "pending"
  || task.engineeringEditProposal?.diffPreviewExposed !== true
  || task.workspacePatchApply?.registry !== "openclaw-native-workspace-patch-apply-task-v0"
  || task.governance?.createsTask !== true
  || task.governance?.createsApproval !== true
  || task.governance?.canExecuteWithoutApproval !== false
) {
  throw new Error(`Observer edit approval bridge response mismatch: ${JSON.stringify(task)}`);
}
if (!step.ok || step.ran !== false || step.blocked !== true || step.reason !== "policy_requires_approval") {
  throw new Error(`Observer operator step should remain blocked before edit approval: ${JSON.stringify(step)}`);
}

console.log(JSON.stringify({
  observerOpenClawNativeEngineeringEditApprovalBridge: {
    html: "visible",
    client: "visible",
    registry: task.registry,
    taskId: task.task.id,
    approvalId: task.approval.id,
    targetMutated: targetText.includes(newText),
  },
}, null, 2));
EOF
