#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TARGET_URL="https://www.baidu.com"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5600}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5601}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5602}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5603}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5604}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5605}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5606}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5607}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5670}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-operator-check.json}"

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

const requiredHtml = [
  "create-planned-task-button",
  "operator-step-button",
  "operator-run-button",
  "task-plan-json",
  "operator-loop-json",
];
const requiredClient = [
  "/tasks/plan",
  "/operator/step",
  "/operator/run",
  "task.planned",
  "renderTaskPlan",
  "renderOperatorPanel",
];

for (const token of requiredHtml) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of requiredClient) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
EOF

planned_task="$(post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Observer operator planned task\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_URL\",\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"observer operator\"}},{\"kind\":\"mouse.click\",\"params\":{\"x\":560,\"y\":320,\"button\":\"left\"}}]}")"
assert_json "$planned_task" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="queued" || data.plan?.status!=="planned"){throw new Error("planned task did not enter queued/planned state");}'

operator_step="$(post_json "$CORE_URL/operator/step" '{}')"
assert_json "$operator_step" 'const data=JSON.parse(process.argv[1]); if(!data.ok || !data.ran || data.task?.status!=="completed" || data.task?.plan?.status!=="completed" || data.execution?.verification?.ok!==true){throw new Error("operator step did not complete planned task from observer milestone");}'

idle_run="$(post_json "$CORE_URL/operator/run" '{"maxSteps":2}')"
assert_json "$idle_run" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.ran!==false || data.count!==0){throw new Error("operator run should be idle after single planned task");}'

summary="$(curl --silent "$CORE_URL/tasks/summary")"

node - <<'EOF' "$planned_task" "$operator_step" "$idle_run" "$summary"
const planned = JSON.parse(process.argv[2]);
const step = JSON.parse(process.argv[3]);
const idle = JSON.parse(process.argv[4]);
const summary = JSON.parse(process.argv[5]);

const counts = summary.summary?.counts ?? {};
if (counts.completed !== 1 || counts.active !== 0) {
  throw new Error(`unexpected observer operator task counts: ${JSON.stringify(counts)}`);
}

console.log(JSON.stringify({
  observerOperator: {
    htmlControls: [
      "create-planned-task-button",
      "operator-step-button",
      "operator-run-button",
    ],
    clientApis: [
      "/tasks/plan",
      "/operator/step",
      "/operator/run",
    ],
    stateFile: process.env.OPENCLAW_CORE_STATE_FILE ?? null,
  },
  plannedTask: {
    id: planned.task?.id ?? null,
    initialStatus: planned.task?.status ?? null,
    initialPlanStatus: planned.plan?.status ?? null,
  },
  operatorStep: {
    ran: step.ran,
    taskId: step.task?.id ?? null,
    status: step.task?.status ?? null,
    planStatus: step.task?.plan?.status ?? null,
    verification: step.execution?.verification?.ok ?? null,
  },
  idleRun: {
    ran: idle.ran,
    count: idle.count,
  },
  taskSummary: counts,
}, null, 2));
EOF
