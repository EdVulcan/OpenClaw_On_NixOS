#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TARGET_PLAN_ONLY="https://example.com/work-view"
TARGET_EXECUTE="https://www.baidu.com"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5400}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5401}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5402}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5403}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5404}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5405}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5406}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5407}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5470}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-planner-check.json}"

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

json_value() {
  local json="$1"
  local script="$2"
  node -e "$script" "$json"
}

assert_json() {
  local json="$1"
  local script="$2"
  node -e "$script" "$json"
}

"$SCRIPT_DIR/dev-up.sh"

planned_execution="$(post_json "$CORE_URL/tasks/plan/execute" "{\"goal\":\"Plan and execute work view task\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_EXECUTE\",\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"planner execute\"}},{\"kind\":\"mouse.click\",\"params\":{\"x\":600,\"y\":340,\"button\":\"left\"}}]}")"
assert_json "$planned_execution" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="completed" || data.plan?.status!=="completed" || data.execution?.verification?.ok!==true){throw new Error("planned execution did not complete with verification");}'
planned_execution_id="$(json_value "$planned_execution" 'const data=JSON.parse(process.argv[1]); process.stdout.write(data.task.id);')"

planned_task="$(post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Plan only work view task\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_PLAN_ONLY\",\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"planner only\"}}]}")"
assert_json "$planned_task" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="queued" || data.plan?.strategy!=="rule-v1" || data.plan?.status!=="planned"){throw new Error("plan-only task was not planned");}'
planned_task_id="$(json_value "$planned_task" 'const data=JSON.parse(process.argv[1]); process.stdout.write(data.task.id);')"

before_summary="$(curl --silent "$CORE_URL/tasks/summary")"
assert_json "$before_summary" 'const data=JSON.parse(process.argv[1]); const c=data.summary?.counts; if(c?.queued!==1 || c?.completed!==1 || c?.active!==1){throw new Error("unexpected planner pre-restart summary");}'

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

after_summary="$(curl --silent "$CORE_URL/tasks/summary")"
restored_plan_only="$(curl --silent "$CORE_URL/tasks/$planned_task_id")"
restored_executed="$(curl --silent "$CORE_URL/tasks/$planned_execution_id")"
tasks_list="$(curl --silent "$CORE_URL/tasks?limit=10")"

node - <<'EOF' "$planned_task" "$planned_execution" "$before_summary" "$after_summary" "$restored_plan_only" "$restored_executed" "$tasks_list"
const plannedTask = JSON.parse(process.argv[2]);
const plannedExecution = JSON.parse(process.argv[3]);
const beforeSummary = JSON.parse(process.argv[4]);
const afterSummary = JSON.parse(process.argv[5]);
const restoredPlanOnly = JSON.parse(process.argv[6]);
const restoredExecuted = JSON.parse(process.argv[7]);
const tasksList = JSON.parse(process.argv[8]);

const beforeCounts = beforeSummary.summary?.counts ?? {};
const afterCounts = afterSummary.summary?.counts ?? {};
if (JSON.stringify(beforeCounts) !== JSON.stringify(afterCounts)) {
  throw new Error(`planner counts changed across restart: before=${JSON.stringify(beforeCounts)} after=${JSON.stringify(afterCounts)}`);
}

const planOnly = restoredPlanOnly.task;
const executed = restoredExecuted.task;
if (!planOnly || planOnly.id !== plannedTask.task?.id || planOnly.plan?.status !== "planned") {
  throw new Error("plan-only task did not survive restart with planned status");
}
if (!executed || executed.id !== plannedExecution.task?.id || executed.plan?.status !== "completed") {
  throw new Error("executed planned task did not survive restart with completed plan");
}

const completedSteps = (executed.plan?.steps ?? []).filter((step) => step.status === "completed");
const actionSteps = (executed.plan?.steps ?? []).filter((step) => step.phase === "acting_on_target");
if (completedSteps.length < 6 || actionSteps.length !== 2 || !actionSteps.every((step) => step.status === "completed")) {
  throw new Error("executed plan steps were not completed as expected");
}
if (afterSummary.summary?.currentTaskId !== planOnly.id || afterSummary.summary?.counts?.active !== 1) {
  throw new Error("plan-only queued task should remain the current active task after restart");
}

console.log(JSON.stringify({
  planner: {
    stateFile: process.env.OPENCLAW_CORE_STATE_FILE ?? null,
    counts: afterCounts,
    restoredTasks: tasksList.items?.length ?? 0,
  },
  planOnly: {
    id: planOnly.id,
    status: planOnly.status,
    planStatus: planOnly.plan?.status ?? null,
    stepCount: planOnly.plan?.steps?.length ?? 0,
  },
  plannedExecution: {
    id: executed.id,
    status: executed.status,
    planStatus: executed.plan?.status ?? null,
    completedSteps: completedSteps.length,
    actionSteps: actionSteps.length,
    verification: plannedExecution.execution?.verification?.ok ?? null,
  },
}, null, 2));
EOF
