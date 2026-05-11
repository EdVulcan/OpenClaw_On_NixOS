#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TARGET_ONE="https://www.baidu.com"
TARGET_TWO="https://www.deepseek.com"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5300}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5301}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5302}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5303}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5304}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5305}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5306}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5307}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5370}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-persistence-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp"

cleanup() {
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent -X POST "$url" -H 'content-type: application/json' -d "$body"
}

assert_json() {
  local json="$1"
  local script="$2"
  node -e "$script" "$json"
}

"$SCRIPT_DIR/dev-up.sh"

completed_execution="$(post_json "$CORE_URL/tasks/execute" "{\"goal\":\"Persist completed task at $TARGET_ONE\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_ONE\",\"workViewStrategy\":\"ai-work-view\"}")"
assert_json "$completed_execution" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="completed"){throw new Error("completed execution failed before restart");}'

auto_recovered_execution="$(post_json "$CORE_URL/tasks/execute" "{\"goal\":\"Persist auto recovered task at $TARGET_TWO\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_TWO\",\"expectedUrl\":\"https://expected.invalid/persist\",\"recoveryExpectedUrl\":\"$TARGET_TWO\",\"autoRecover\":true,\"maxRecoveryAttempts\":1,\"workViewStrategy\":\"ai-work-view\",\"actions\":[{\"kind\":\"mouse.click\",\"params\":{\"x\":500,\"y\":260,\"button\":\"left\"}}]}")"
assert_json "$auto_recovered_execution" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="completed" || data.execution?.recovery?.succeeded!==true){throw new Error("auto recovered execution failed before restart");}'

before_summary="$(curl --silent "$CORE_URL/tasks/summary")"
assert_json "$before_summary" 'const data=JSON.parse(process.argv[1]); const c=data.summary?.counts; if(c?.completed!==2 || c?.failed!==1 || c?.recoverable!==3){throw new Error("unexpected pre-restart summary");}'

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

after_summary="$(curl --silent "$CORE_URL/tasks/summary")"
after_tasks="$(curl --silent "$CORE_URL/tasks?limit=10")"
latest_finished="$(curl --silent "$CORE_URL/tasks/latest-finished")"
latest_failed="$(curl --silent "$CORE_URL/tasks/latest-failed")"

node - <<'EOF' "$completed_execution" "$auto_recovered_execution" "$before_summary" "$after_summary" "$after_tasks" "$latest_finished" "$latest_failed"
const completedExecution = JSON.parse(process.argv[2]);
const autoRecoveredExecution = JSON.parse(process.argv[3]);
const beforeSummary = JSON.parse(process.argv[4]);
const afterSummary = JSON.parse(process.argv[5]);
const afterTasks = JSON.parse(process.argv[6]);
const latestFinished = JSON.parse(process.argv[7]);
const latestFailed = JSON.parse(process.argv[8]);

const beforeCounts = beforeSummary.summary?.counts ?? {};
const afterCounts = afterSummary.summary?.counts ?? {};
if (JSON.stringify(beforeCounts) !== JSON.stringify(afterCounts)) {
  throw new Error(`persisted counts changed across restart: before=${JSON.stringify(beforeCounts)} after=${JSON.stringify(afterCounts)}`);
}

const items = afterTasks.items ?? [];
const completedTask = items.find((task) => task.id === completedExecution.task?.id);
const autoRecoveredTask = items.find((task) => task.id === autoRecoveredExecution.task?.id);
const originalFailedAttemptId = autoRecoveredExecution.execution?.recovery?.recoveredFromTaskId;
const originalFailedAttempt = items.find((task) => task.id === originalFailedAttemptId);

if (!completedTask || completedTask.status !== "completed") {
  throw new Error("completed task was not restored after restart");
}
if (!autoRecoveredTask || autoRecoveredTask.status !== "completed" || autoRecoveredTask.recovery?.recoveredFromTaskId !== originalFailedAttemptId) {
  throw new Error("auto recovered task/recovery chain was not restored after restart");
}
if (!originalFailedAttempt || originalFailedAttempt.status !== "failed" || originalFailedAttempt.recoveredByTaskId !== autoRecoveredTask.id) {
  throw new Error("failed source attempt was not restored with recoveredByTaskId");
}
if (latestFinished.task?.id !== autoRecoveredTask.id) {
  throw new Error("latest finished task did not survive restart");
}
if (latestFailed.task?.id !== originalFailedAttempt.id || latestFailed.task?.restorable !== true) {
  throw new Error("latest failed task did not survive restart as restorable");
}
if (afterSummary.summary?.currentTaskId !== null || afterSummary.summary?.counts?.active !== 0) {
  throw new Error("runtime should restore to idle with no active task");
}

console.log(JSON.stringify({
  persistence: {
    stateFile: process.env.OPENCLAW_CORE_STATE_FILE ?? null,
    counts: afterCounts,
    restoredTasks: items.length,
  },
  completedTask: {
    id: completedTask.id,
    status: completedTask.status,
    phase: completedTask.executionPhase,
  },
  autoRecoveredTask: {
    id: autoRecoveredTask.id,
    status: autoRecoveredTask.status,
    recoveredFromTaskId: autoRecoveredTask.recovery?.recoveredFromTaskId ?? null,
  },
  failedSourceAttempt: {
    id: originalFailedAttempt.id,
    status: originalFailedAttempt.status,
    recoveredByTaskId: originalFailedAttempt.recoveredByTaskId ?? null,
  },
  latest: {
    finished: latestFinished.task?.id ?? null,
    failed: latestFailed.task?.id ?? null,
  },
}, null, 2));
EOF
