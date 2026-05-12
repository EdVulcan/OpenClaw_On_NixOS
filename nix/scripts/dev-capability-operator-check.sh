#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-7300}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-7301}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-7302}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-7303}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-7304}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-7305}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-7306}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-7307}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-7370}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-capability-operator-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-capability-operator-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${PROCESS_PLAN_FILE:-}" \
    "${PROCESS_STEP_FILE:-}" \
    "${COMMAND_PLAN_FILE:-}" \
    "${COMMAND_STEP_FILE:-}" \
    "${HISTORY_FILE:-}" \
    "${EVENTS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

"$SCRIPT_DIR/dev-up.sh"

PROCESS_PLAN_FILE="$(mktemp)"
PROCESS_STEP_FILE="$(mktemp)"
COMMAND_PLAN_FILE="$(mktemp)"
COMMAND_STEP_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

post_json "$CORE_URL/tasks/plan" '{"goal":"Operator invokes process list capability","type":"system_task","intent":"process.list","actions":[{"kind":"process.list","intent":"process.list","params":{"limit":10}}]}' > "$PROCESS_PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$PROCESS_STEP_FILE"

post_json "$CORE_URL/tasks/plan" '{"goal":"Operator invokes approved command dry-run capability","type":"system_task","policy":{"intent":"system.command","requiresApproval":true,"approved":true},"actions":[{"kind":"system.command","intent":"system.command","params":{"command":"rm","args":["-rf","/tmp/openclaw-danger"]}}]}' > "$COMMAND_PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$COMMAND_STEP_FILE"

curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?source=openclaw-core&limit=80" > "$EVENTS_FILE"

node - <<'EOF' \
  "$PROCESS_PLAN_FILE" \
  "$PROCESS_STEP_FILE" \
  "$COMMAND_PLAN_FILE" \
  "$COMMAND_STEP_FILE" \
  "$HISTORY_FILE" \
  "$EVENTS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const processPlan = readJson(2);
const processStep = readJson(3);
const commandPlan = readJson(4);
const commandStep = readJson(5);
const history = readJson(6);
const events = readJson(7);

if (!processPlan.ok || processPlan.plan?.planner !== "capability-aware-v1") {
  throw new Error("process system task should be planned by the capability-aware planner");
}
const processAction = (processPlan.plan?.steps ?? []).find((step) => step.kind === "process.list");
if (processAction?.capabilityId !== "sense.process.list") {
  throw new Error("process plan action should map to sense.process.list");
}
if (!processStep.ok || processStep.ran !== true || processStep.task?.status !== "completed") {
  throw new Error("operator should complete process capability plan");
}
if (processStep.execution?.executor !== "capability-invoke-v1") {
  throw new Error("process capability plan should execute through capability invoke executor");
}
const processInvocation = processStep.execution?.capabilityInvocations?.[0];
if (processInvocation?.capabilityId !== "sense.process.list" || processInvocation.invoked !== true || processInvocation.summary?.count < 1) {
  throw new Error("process capability invocation should be recorded in operator execution");
}
if (processStep.task?.plan?.status !== "completed") {
  throw new Error("process capability task plan should complete");
}

if (!commandPlan.ok || commandPlan.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error("approved command dry-run task should be audited and executable");
}
const commandAction = (commandPlan.plan?.steps ?? []).find((step) => step.kind === "system.command");
if (commandAction?.capabilityId !== "act.system.command.dry_run" || commandAction.requiresApproval !== true) {
  throw new Error("command plan action should map to approval-gated command dry-run capability");
}
if (!commandStep.ok || commandStep.ran !== true || commandStep.task?.status !== "completed") {
  throw new Error("operator should complete approved command dry-run capability plan");
}
if (commandStep.execution?.executor !== "capability-invoke-v1") {
  throw new Error("command dry-run plan should execute through capability invoke executor");
}
const commandInvocation = commandStep.execution?.capabilityInvocations?.[0];
if (
  commandInvocation?.capabilityId !== "act.system.command.dry_run"
  || commandInvocation.invoked !== true
  || commandInvocation.summary?.wouldExecute !== false
) {
  throw new Error("approved command dry-run should remain non-executing through operator");
}

if (history.summary?.total !== 2 || history.summary?.invoked !== 2 || history.summary?.blocked !== 0) {
  throw new Error(`unexpected capability history after operator execution: ${JSON.stringify(history.summary)}`);
}
const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["capability.invoked", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  capabilityOperator: {
    processTask: {
      id: processStep.task?.id ?? null,
      status: processStep.task?.status ?? null,
      executor: processStep.execution?.executor ?? null,
      capability: processInvocation.capabilityId,
      count: processInvocation.summary.count,
    },
    commandTask: {
      id: commandStep.task?.id ?? null,
      status: commandStep.task?.status ?? null,
      executor: commandStep.execution?.executor ?? null,
      capability: commandInvocation.capabilityId,
      wouldExecute: commandInvocation.summary.wouldExecute,
    },
    history: history.summary,
  },
  auditEvents: [...eventTypes].filter((type) => type === "task.completed" || type.startsWith("capability.")),
}, null, 2));
EOF
