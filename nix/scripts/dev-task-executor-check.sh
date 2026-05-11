#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET_ONE="https://www.baidu.com"
TARGET_TWO="https://www.deepseek.com"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5200}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5201}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5202}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5203}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5204}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5205}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5206}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5207}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5270}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
SESSION_MANAGER_URL="http://127.0.0.1:$OPENCLAW_SESSION_MANAGER_PORT"
SCREEN_ACT_URL="http://127.0.0.1:$OPENCLAW_SCREEN_ACT_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true

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

queued_task="$(post_json "$CORE_URL/tasks" "{\"goal\":\"Executor runs queued task at $TARGET_ONE\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_ONE\",\"workViewStrategy\":\"ai-work-view\"}")"
assert_json "$queued_task" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="queued"){throw new Error("queued task create failed");}'
queued_task_id="$(json_value "$queued_task" 'const data=JSON.parse(process.argv[1]); process.stdout.write(data.task.id);')"

queued_execution="$(post_json "$CORE_URL/tasks/$queued_task_id/execute" "{\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"executor queued task\"}},{\"kind\":\"mouse.click\",\"params\":{\"x\":640,\"y\":360,\"button\":\"left\"}}]}")"
assert_json "$queued_execution" 'const data=JSON.parse(process.argv[1]); const task=data.task; if(!data.ok || task?.status!=="completed" || task?.outcome?.kind!=="completed"){throw new Error("queued task execution did not complete");} if(data.execution?.finalReadiness!=="ready"){throw new Error("expected queued task final readiness ready");}'

direct_execution="$(post_json "$CORE_URL/tasks/execute" "{\"goal\":\"Executor creates and runs task at $TARGET_TWO\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_TWO\",\"workViewStrategy\":\"ai-work-view\",\"hideOnComplete\":false,\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"executor direct task\"}},{\"kind\":\"mouse.click\",\"params\":{\"x\":420,\"y\":240,\"button\":\"left\"}}]}")"
assert_json "$direct_execution" 'const data=JSON.parse(process.argv[1]); const task=data.task; if(!data.ok || task?.status!=="completed" || task?.targetUrl!=="https://www.deepseek.com"){throw new Error("direct execution did not complete deepseek task");} if(task.workView?.visibility!=="visible"){throw new Error("direct execution should keep work view visible");}'

runtime_state="$(curl --silent "$CORE_URL/state/runtime")"
task_summary="$(curl --silent "$CORE_URL/tasks/summary")"
latest_finished="$(curl --silent "$CORE_URL/tasks/latest-finished")"
work_view_state="$(curl --silent "$SESSION_MANAGER_URL/work-view/state")"
action_state="$(curl --silent "$SCREEN_ACT_URL/act/state")"

node - <<'EOF' "$queued_execution" "$direct_execution" "$runtime_state" "$task_summary" "$latest_finished" "$work_view_state" "$action_state"
const queuedExecution = JSON.parse(process.argv[2]);
const directExecution = JSON.parse(process.argv[3]);
const runtimeState = JSON.parse(process.argv[4]);
const taskSummary = JSON.parse(process.argv[5]);
const latestFinished = JSON.parse(process.argv[6]);
const workViewState = JSON.parse(process.argv[7]);
const actionState = JSON.parse(process.argv[8]);

const requiredPhases = [
  "queued",
  "preparing_work_view",
  "opening_target",
  "ready_for_action",
  "observing_screen",
  "acting_on_target",
  "verifying_result",
  "completed",
];

function assertTaskPhases(task, label) {
  const phases = new Set((task.phaseHistory ?? []).map((entry) => entry.phase));
  for (const phase of requiredPhases) {
    if (!phases.has(phase)) {
      throw new Error(`${label} missing executor phase ${phase}`);
    }
  }
}

assertTaskPhases(queuedExecution.task, "queued execution");
assertTaskPhases(directExecution.task, "direct execution");

if (runtimeState.runtime?.status !== "idle" || runtimeState.currentTask !== null) {
  throw new Error("Executor should leave runtime idle after completed tasks.");
}
if (taskSummary.summary?.counts?.completed !== 2 || taskSummary.summary?.counts?.active !== 0) {
  throw new Error("Expected executor summary to show two completed tasks and no active tasks.");
}
if (latestFinished.task?.id !== directExecution.task?.id || latestFinished.task?.workView?.visibility !== "visible") {
  throw new Error("Expected latest finished task to be the visible direct execution.");
}
if (workViewState.workView?.activeUrl !== "https://www.deepseek.com" || workViewState.workView?.visibility !== "visible") {
  throw new Error("Expected work view to remain visible on direct execution target.");
}
if (actionState.state?.actionCount !== 4 || actionState.state?.lastAction?.degraded !== false) {
  throw new Error("Expected four non-degraded executor actions.");
}

console.log(JSON.stringify({
  queuedExecution: {
    id: queuedExecution.task?.id ?? null,
    status: queuedExecution.task?.status ?? null,
    phase: queuedExecution.task?.executionPhase ?? null,
    finalReadiness: queuedExecution.execution?.finalReadiness ?? null,
    visibility: queuedExecution.task?.workView?.visibility ?? null,
  },
  directExecution: {
    id: directExecution.task?.id ?? null,
    status: directExecution.task?.status ?? null,
    phase: directExecution.task?.executionPhase ?? null,
    finalReadiness: directExecution.execution?.finalReadiness ?? null,
    visibility: directExecution.task?.workView?.visibility ?? null,
    activeUrl: directExecution.task?.workView?.activeUrl ?? null,
  },
  runtime: {
    status: runtimeState.runtime?.status ?? null,
    currentTaskId: runtimeState.runtime?.currentTaskId ?? null,
  },
  taskSummary: taskSummary.summary?.counts ?? null,
  actionCount: actionState.state?.actionCount ?? null,
  workView: {
    activeUrl: workViewState.workView?.activeUrl ?? null,
    visibility: workViewState.workView?.visibility ?? null,
  },
}, null, 2));
EOF
