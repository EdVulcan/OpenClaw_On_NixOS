#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TARGET_URL="https://www.baidu.com"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5700}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5701}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5702}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5703}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5704}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5705}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5706}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5707}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5770}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-operator-control-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}"
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

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");

for (const token of ["resume-button", "operator-loop-status", "operator-loop-blocked", "operator-loop-next"]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of ["/operator/state", "/control/resume", "task.resumed"]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
EOF

planned_task="$(post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Operator control planned task\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_URL\",\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"operator control\"}}]}")"
assert_json "$planned_task" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="queued" || data.plan?.status!=="planned"){throw new Error("operator control planned task not queued");}'

ready_state="$(curl --silent "$CORE_URL/operator/state")"
assert_json "$ready_state" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.operator?.status!=="ready" || data.operator?.blocked!==false || data.operator?.nextTask?.status!=="queued"){throw new Error("operator state should expose ready queued task");}'

dry_run="$(post_json "$CORE_URL/operator/step" '{"dryRun":true}')"
assert_json "$dry_run" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.ran!==false || data.dryRun!==true || data.reason!=="dry_run" || data.task?.status!=="queued"){throw new Error("operator dry run should return queued task without running");}'

after_dry_summary="$(curl --silent "$CORE_URL/tasks/summary")"
assert_json "$after_dry_summary" 'const data=JSON.parse(process.argv[1]); const c=data.summary?.counts; if(c?.queued!==1 || c?.completed!==0 || c?.active!==1){throw new Error("dry run mutated task state");}'

pause_result="$(post_json "$CORE_URL/control/pause" '{}')"
assert_json "$pause_result" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="paused" || data.runtime?.paused!==true){throw new Error("pause did not mark current task paused");}'

paused_state="$(curl --silent "$CORE_URL/operator/state")"
assert_json "$paused_state" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.operator?.status!=="paused" || data.operator?.blocked!==true || data.operator?.reason!=="runtime_paused"){throw new Error("operator state should be paused/blocked");}'

blocked_step="$(post_json "$CORE_URL/operator/step" '{}')"
assert_json "$blocked_step" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.ran!==false || data.blocked!==true || data.reason!=="runtime_paused" || data.summary?.counts?.paused!==1){throw new Error("operator step should be blocked while paused");}'

resume_result="$(post_json "$CORE_URL/control/resume" '{}')"
assert_json "$resume_result" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="queued" || data.runtime?.status!=="queued" || data.runtime?.paused!==false){throw new Error("resume did not restore task to queued");}'

run_result="$(post_json "$CORE_URL/operator/run" '{"maxSteps":3}')"
assert_json "$run_result" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.ran!==true || data.count!==1 || data.steps?.[0]?.task?.status!=="completed" || data.steps?.[0]?.execution?.verification?.ok!==true){throw new Error("operator run did not complete resumed task");}'

final_state="$(curl --silent "$CORE_URL/operator/state")"

node - <<'EOF' "$ready_state" "$dry_run" "$paused_state" "$blocked_step" "$resume_result" "$run_result" "$final_state"
const ready = JSON.parse(process.argv[2]);
const dryRun = JSON.parse(process.argv[3]);
const paused = JSON.parse(process.argv[4]);
const blocked = JSON.parse(process.argv[5]);
const resumed = JSON.parse(process.argv[6]);
const run = JSON.parse(process.argv[7]);
const finalState = JSON.parse(process.argv[8]);

if (finalState.operator?.status !== "idle" || finalState.operator?.summary?.counts?.completed !== 1) {
  throw new Error("final operator state should be idle with one completed task");
}

console.log(JSON.stringify({
  operatorControl: {
    stateFile: process.env.OPENCLAW_CORE_STATE_FILE ?? null,
    policy: ready.operator?.policy ?? null,
  },
  dryRun: {
    ran: dryRun.ran,
    reason: dryRun.reason,
    taskStatus: dryRun.task?.status ?? null,
  },
  pauseGate: {
    status: paused.operator?.status ?? null,
    blocked: blocked.blocked,
    reason: blocked.reason,
    pausedCount: blocked.summary?.counts?.paused ?? null,
  },
  resume: {
    taskStatus: resumed.task?.status ?? null,
    runtimeStatus: resumed.runtime?.status ?? null,
  },
  run: {
    ran: run.ran,
    count: run.count,
    taskStatus: run.steps?.[0]?.task?.status ?? null,
    verification: run.steps?.[0]?.execution?.verification?.ok ?? null,
  },
  final: {
    status: finalState.operator?.status ?? null,
    counts: finalState.operator?.summary?.counts ?? null,
  },
}, null, 2));
EOF
