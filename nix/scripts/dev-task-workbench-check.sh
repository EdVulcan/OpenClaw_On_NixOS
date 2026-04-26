#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TARGET_ONE="https://www.baidu.com"
TARGET_TWO="https://www.deepseek.com"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true

cleanup() {
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

assert_json() {
  local json="$1"
  local script="$2"
  node -e "$script" "$json"
}

json_value() {
  local json="$1"
  local script="$2"
  node -e "$script" "$json"
}

post_json() {
  local url="$1"
  local body="$2"
  curl --silent -X POST "$url" -H 'content-type: application/json' -d "$body"
}

launch_task_into_work_view() {
  local task_id="$1"
  local target_url="$2"

  post_json "http://127.0.0.1:4100/tasks/$task_id/phase" "{\"phase\":\"preparing_work_view\",\"status\":\"running\",\"details\":{\"targetUrl\":\"$target_url\",\"displayTarget\":\"workspace-2\"}}" >/dev/null
  local prepare_result
  prepare_result="$(post_json "http://127.0.0.1:4102/work-view/prepare" "{\"displayTarget\":\"workspace-2\",\"entryUrl\":\"$target_url\"}")"
  assert_json "$prepare_result" 'const data=JSON.parse(process.argv[1]); if(!data.ok){throw new Error("prepare failed");}'

  post_json "http://127.0.0.1:4100/tasks/$task_id/phase" "{\"phase\":\"opening_target\",\"status\":\"running\",\"details\":{\"targetUrl\":\"$target_url\"}}" >/dev/null
  local reveal_result
  reveal_result="$(post_json "http://127.0.0.1:4102/work-view/reveal" "{\"entryUrl\":\"$target_url\"}")"
  assert_json "$reveal_result" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.workView?.visibility!=="visible"){throw new Error("reveal failed");}'

  local attach_body
  attach_body="$(node -e 'const data=JSON.parse(process.argv[1]); const payload={sessionId:data.session?.sessionId??null,status:data.workView?.status??"ready",visibility:data.workView?.visibility??"visible",mode:data.workView?.mode??"foreground-observable",helperStatus:data.workView?.helperStatus??"active",displayTarget:data.workView?.displayTarget??"workspace-2",activeUrl:data.workView?.activeUrl??data.browser?.activeUrl??data.tab?.url??null}; process.stdout.write(JSON.stringify(payload));' "$reveal_result")"
  local attach_result
  attach_result="$(post_json "http://127.0.0.1:4100/tasks/$task_id/attach-work-view" "$attach_body")"
  assert_json "$attach_result" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.executionPhase!=="ready_for_action"){throw new Error("attach failed");}'
}

record_action_phase() {
  local task_id="$1"
  local kind="$2"
  post_json "http://127.0.0.1:4100/tasks/$task_id/phase" "{\"phase\":\"acting_on_target\",\"status\":\"running\",\"details\":{\"actionKind\":\"$kind\",\"degraded\":false}}" >/dev/null
}

complete_task() {
  local task_id="$1"
  local target_url="$2"

  post_json "http://127.0.0.1:4102/work-view/hide" '{}' >/dev/null
  local hidden_state
  hidden_state="$(curl --silent http://127.0.0.1:4102/work-view/state)"
  assert_json "$hidden_state" 'const data=JSON.parse(process.argv[1]); if(data.workView?.visibility!=="hidden"){throw new Error("expected hidden work view");}'

  local complete_body
  complete_body="$(node -e 'const hidden=JSON.parse(process.argv[1]); const targetUrl=process.argv[2]; const workView=hidden.workView??{}; process.stdout.write(JSON.stringify({details:{targetUrl,workViewUrl:targetUrl,summary:`Completed task at ${targetUrl}`,workView:{status:workView.status??null,visibility:workView.visibility??null,mode:workView.mode??null,helperStatus:workView.helperStatus??null,browserStatus:workView.browserStatus??null,entryUrl:workView.entryUrl??targetUrl,displayTarget:workView.displayTarget??null,activeUrl:workView.activeUrl??targetUrl}}}));' "$hidden_state" "$target_url")"
  local complete_result
  complete_result="$(post_json "http://127.0.0.1:4100/tasks/$task_id/complete" "$complete_body")"
  assert_json "$complete_result" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="completed"){throw new Error("complete failed");}'
}

"$SCRIPT_DIR/dev-up.sh"

task_one_create="$(post_json "http://127.0.0.1:4100/tasks" "{\"goal\":\"Open the AI work view at $TARGET_ONE\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_ONE\",\"workViewStrategy\":\"ai-work-view\"}")"
assert_json "$task_one_create" 'const data=JSON.parse(process.argv[1]); if(!data.ok || !data.task?.id){throw new Error("task one create failed");}'
task_one_id="$(json_value "$task_one_create" 'const data=JSON.parse(process.argv[1]); process.stdout.write(data.task.id);')"
launch_task_into_work_view "$task_one_id" "$TARGET_ONE"

type_action="$(post_json "http://127.0.0.1:4105/act/keyboard/type" '{"text":"hello from openclaw-screen-act"}')"
assert_json "$type_action" 'const data=JSON.parse(process.argv[1]); if(data.action?.degraded!==false){throw new Error("expected type action degraded=false");}'
record_action_phase "$task_one_id" "keyboard.type"

click_action="$(post_json "http://127.0.0.1:4105/act/mouse/click" '{"x":640,"y":360,"button":"left"}')"
assert_json "$click_action" 'const data=JSON.parse(process.argv[1]); if(data.action?.degraded!==false){throw new Error("expected click action degraded=false");}'
record_action_phase "$task_one_id" "mouse.click"

complete_task "$task_one_id" "$TARGET_ONE"

runtime_idle="$(curl --silent http://127.0.0.1:4100/state/runtime)"
assert_json "$runtime_idle" 'const data=JSON.parse(process.argv[1]); if(data.runtime?.status!=="idle" || data.currentTask){throw new Error("runtime did not return to idle after completion");}'

latest_finished="$(curl --silent http://127.0.0.1:4100/tasks/latest-finished)"
assert_json "$latest_finished" 'const data=JSON.parse(process.argv[1]); const task=data.task; if(!task || task.status!=="completed" || task.workView?.visibility!=="hidden"){throw new Error("latest finished task not completed/hidden");}'
finished_task_id="$(json_value "$latest_finished" 'const data=JSON.parse(process.argv[1]); process.stdout.write(data.task.id);')"

recovered_latest="$(post_json "http://127.0.0.1:4100/tasks/$finished_task_id/recover" '{}')"
assert_json "$recovered_latest" 'const data=JSON.parse(process.argv[1]); const task=data.task; if(!task || task.recovery?.recoveredFromTaskId!==data.recoveredFromTask?.id){throw new Error("latest finished recovery failed");}'
recovered_latest_id="$(json_value "$recovered_latest" 'const data=JSON.parse(process.argv[1]); process.stdout.write(data.task.id);')"
launch_task_into_work_view "$recovered_latest_id" "$TARGET_ONE"

stop_result="$(post_json "http://127.0.0.1:4100/control/stop" '{}')"
assert_json "$stop_result" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="failed"){throw new Error("stop did not create failed task");}'

latest_failed="$(curl --silent http://127.0.0.1:4100/tasks/latest-failed)"
assert_json "$latest_failed" 'const data=JSON.parse(process.argv[1]); const task=data.task; if(!task || task.status!=="failed" || !task.restorable){throw new Error("latest failed task missing or not recoverable");}'
failed_task_id="$(json_value "$latest_failed" 'const data=JSON.parse(process.argv[1]); process.stdout.write(data.task.id);')"

recovered_failed="$(post_json "http://127.0.0.1:4100/tasks/$failed_task_id/recover" '{}')"
assert_json "$recovered_failed" 'const data=JSON.parse(process.argv[1]); const task=data.task; if(!task || task.recovery?.recoveredFromTaskId!==data.recoveredFromTask?.id){throw new Error("failed task recovery failed");}'
recovered_failed_id="$(json_value "$recovered_failed" 'const data=JSON.parse(process.argv[1]); process.stdout.write(data.task.id);')"
launch_task_into_work_view "$recovered_failed_id" "$TARGET_ONE"

task_two_create="$(post_json "http://127.0.0.1:4100/tasks" "{\"goal\":\"Open the AI work view at $TARGET_TWO\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_TWO\",\"workViewStrategy\":\"ai-work-view\"}")"
assert_json "$task_two_create" 'const data=JSON.parse(process.argv[1]); if(!data.ok || !data.task?.id){throw new Error("task two create failed");}'
task_two_id="$(json_value "$task_two_create" 'const data=JSON.parse(process.argv[1]); process.stdout.write(data.task.id);')"
launch_task_into_work_view "$task_two_id" "$TARGET_TWO"

tasks_list="$(curl --silent "http://127.0.0.1:4100/tasks?limit=8")"
runtime_running="$(curl --silent http://127.0.0.1:4100/state/runtime)"
work_view_state="$(curl --silent http://127.0.0.1:4102/work-view/state)"

node - <<'EOF' "$runtime_idle" "$latest_finished" "$recovered_latest" "$latest_failed" "$recovered_failed" "$tasks_list" "$runtime_running" "$work_view_state" "$task_one_id" "$recovered_latest_id" "$failed_task_id" "$recovered_failed_id" "$task_two_id"
const runtimeIdle = JSON.parse(process.argv[2]);
const latestFinished = JSON.parse(process.argv[3]);
const recoveredLatest = JSON.parse(process.argv[4]);
const latestFailed = JSON.parse(process.argv[5]);
const recoveredFailed = JSON.parse(process.argv[6]);
const tasksList = JSON.parse(process.argv[7]);
const runtimeRunning = JSON.parse(process.argv[8]);
const workViewState = JSON.parse(process.argv[9]);
const taskOneId = process.argv[10];
const recoveredLatestId = process.argv[11];
const failedTaskId = process.argv[12];
const recoveredFailedId = process.argv[13];
const taskTwoId = process.argv[14];

const items = tasksList.items ?? [];
const taskTwo = items.find((task) => task.id === taskTwoId);
const recoveredFailedTask = items.find((task) => task.id === recoveredFailedId);
if (!taskTwo || taskTwo.status !== "running" || taskTwo.targetUrl !== "https://www.deepseek.com") {
  throw new Error("Expected final active task to target deepseek.");
}
if (!recoveredFailedTask || recoveredFailedTask.status !== "superseded") {
  throw new Error("Expected recovered failed task to be superseded by the final task.");
}
if (runtimeRunning.runtime?.status !== "running" || runtimeRunning.currentTask?.id !== taskTwoId) {
  throw new Error("Expected runtime to track final active task.");
}
if (workViewState.workView?.activeUrl !== "https://www.deepseek.com" || workViewState.workView?.visibility !== "visible") {
  throw new Error("Expected work view to follow final active task URL.");
}

console.log(JSON.stringify({
  completedTask: {
    id: taskOneId,
    latestFinishedId: latestFinished.task?.id ?? null,
    runtimeAfterCompletion: runtimeIdle.runtime?.status ?? null,
    completedVisibility: latestFinished.task?.workView?.visibility ?? null,
  },
  recovery: {
    recoveredLatestId,
    latestFailedId: latestFailed.task?.id ?? null,
    recoveredFailedId,
  },
  finalRuntime: {
    status: runtimeRunning.runtime?.status ?? null,
    currentTaskId: runtimeRunning.currentTask?.id ?? null,
    currentTargetUrl: runtimeRunning.currentTask?.targetUrl ?? null,
  },
  finalWorkView: {
    activeUrl: workViewState.workView?.activeUrl ?? null,
    visibility: workViewState.workView?.visibility ?? null,
  },
  supersededTaskId: recoveredFailedId,
  visibleTasks: items.length,
}, null, 2));
EOF
