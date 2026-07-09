#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-native-engineering-plan-todo-evidence-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10200}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10201}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10202}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10203}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10204}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10205}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10206}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10207}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10208}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-engineering-plan-todo-evidence-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-engineering-plan-todo-evidence-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${TASK_FILE:-}" \
    "${BEFORE_FILE:-}" \
    "${EVIDENCE_FILE:-}" \
    "${AFTER_FILE:-}" \
    "${ADAPTER_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

OPENCLAW_POST_JSON_DATA_FLAG="-d"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"

"$SCRIPT_DIR/dev-up.sh"

TASK_FILE="$(mktemp)"
BEFORE_FILE="$(mktemp)"
EVIDENCE_FILE="$(mktemp)"
AFTER_FILE="$(mktemp)"
ADAPTER_FILE="$(mktemp)"

post_json "$CORE_URL/tasks/plan" '{
  "goal": "Expose native engineering plan todo evidence",
  "type": "system_task",
  "targetUrl": "https://example.test/openclaw-plan-todo",
  "actions": [
    { "phase": "inspect", "kind": "screen.observe", "params": {} },
    { "phase": "implement", "kind": "task.complete", "params": {} }
  ]
}' > "$TASK_FILE"
curl --silent --fail "$CORE_URL/tasks/summary" > "$BEFORE_FILE"

task_id="$(node - <<'EOF' "$TASK_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!taskResponse.ok || !taskResponse.task?.id || !taskResponse.plan?.steps?.length) {
  throw new Error(`planned task fixture mismatch: ${JSON.stringify(taskResponse)}`);
}
process.stdout.write(taskResponse.task.id);
EOF
)"

todos_query="$(node - <<'EOF'
const todos = [
  { id: "read", description: "Read enhanced PlanModeTool semantics", status: "done" },
  { id: "surface", description: "Expose visible OpenClaw task/workbench evidence", status: "in_progress" },
  { id: "verify", description: "Validate endpoint and Observer visibility", status: "pending" }
];
process.stdout.write(encodeURIComponent(JSON.stringify(todos)));
EOF
)"

curl --silent --fail \
  "$CORE_URL/plugins/native-adapter/engineering-plan-todo/evidence?taskId=$task_id&limit=999&planSummary=bounded-planning-summary&confirmedPlan=bounded-confirmed-plan&todosJson=$todos_query" \
  > "$EVIDENCE_FILE"
curl --silent --fail "$CORE_URL/tasks/summary" > "$AFTER_FILE"
curl --silent --fail "$CORE_URL/plugins/openclaw-native-plugin-adapter" > "$ADAPTER_FILE"

node - <<'EOF' "$TASK_FILE" "$BEFORE_FILE" "$EVIDENCE_FILE" "$AFTER_FILE" "$ADAPTER_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const path = require("node:path");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const taskResponse = readJson(2);
const before = readJson(3);
const evidence = readJson(4);
const after = readJson(5);
const adapter = readJson(6);
const workspaceDir = process.argv[7];
const todoPath = path.join(workspaceDir, ".openclaw", "cc-todo.md");
const raw = JSON.stringify({ evidence, adapter });

if (before.summary?.counts?.total !== after.summary?.counts?.total || before.summary?.counts?.total !== 1) {
  throw new Error(`plan/todo evidence endpoint should not create tasks: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
}
if (fs.existsSync(todoPath)) {
  throw new Error(`plan/todo evidence endpoint must not write ${todoPath}`);
}
if (
  !evidence.ok
  || evidence.registry !== "openclaw-native-engineering-plan-todo-evidence-v0"
  || evidence.mode !== "planning-todo-evidence-only"
  || evidence.capability?.id !== "sense.openclaw.engineering_context.plan_todo_evidence"
  || evidence.sourceCapability?.sourceToolNames?.length !== 3
  || evidence.summary?.taskPlanCount !== 1
  || evidence.summary?.queryTodoCount !== 3
  || evidence.summary?.evidenceTodoCounts?.done !== 1
  || evidence.summary?.evidenceTodoCounts?.in_progress !== 1
  || evidence.summary?.evidenceTodoCounts?.pending !== 1
  || evidence.taskPlanEvidence?.selectedTaskId !== taskResponse.task?.id
  || evidence.taskPlanEvidence?.items?.[0]?.plan?.stepCount < 2
  || evidence.planningEvidence?.enter?.hiddenModeCreated !== false
  || evidence.planningEvidence?.exit?.executionTransitionCreated !== false
  || evidence.planningEvidence?.todoWrite?.todoPathWritten !== false
  || evidence.planningEvidence?.todoWrite?.taskStateMutated !== false
  || evidence.governance?.canSwitchHiddenAgentMode !== false
  || evidence.governance?.canWriteTodoFile !== false
  || evidence.governance?.canMutateTaskState !== false
  || evidence.governance?.canCreateTask !== false
  || evidence.governance?.canCreateApproval !== false
  || evidence.governance?.canExecuteCommand !== false
  || evidence.governance?.canCallProvider !== false
  || evidence.bounds?.noTodoFileWrite !== true
  || evidence.auditEvidence?.operation !== "plan_todo_evidence"
) {
  throw new Error(`plan/todo evidence mismatch: ${JSON.stringify(evidence)}`);
}
if (
  !adapter.implementedCapabilities?.includes("sense.openclaw.engineering_context.plan_todo_evidence")
  || adapter.summary?.canReadEngineeringPlanTodoEvidence !== true
) {
  throw new Error(`native adapter missing plan/todo evidence capability: ${JSON.stringify(adapter)}`);
}
for (const token of [
  "no hidden planning mode switch",
  "no .openclaw/cc-todo.md write",
  "no command execution",
  "no provider call",
]) {
  if (!raw.includes(token)) {
    throw new Error(`plan/todo evidence missing boundary token: ${token}`);
  }
}

console.log(JSON.stringify({
  openclawNativeEngineeringPlanTodoEvidence: {
    registry: evidence.registry,
    taskId: taskResponse.task.id,
    todos: evidence.summary.evidenceTodoCounts.total,
    todoFileWritten: fs.existsSync(todoPath),
  },
}, null, 2));
EOF
