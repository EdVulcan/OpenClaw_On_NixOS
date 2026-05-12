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
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-capability-approval-operator-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-capability-approval-operator-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${WAIT_PLAN_FILE:-}" \
    "${BLOCKED_STEP_FILE:-}" \
    "${PENDING_APPROVALS_FILE:-}" \
    "${APPROVED_FILE:-}" \
    "${APPROVED_STEP_FILE:-}" \
    "${DENIED_PLAN_FILE:-}" \
    "${DENIED_BLOCKED_STEP_FILE:-}" \
    "${DENY_PENDING_FILE:-}" \
    "${DENIED_FILE:-}" \
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

WAIT_PLAN_FILE="$(mktemp)"
BLOCKED_STEP_FILE="$(mktemp)"
PENDING_APPROVALS_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
APPROVED_STEP_FILE="$(mktemp)"
DENIED_PLAN_FILE="$(mktemp)"
DENIED_BLOCKED_STEP_FILE="$(mktemp)"
DENY_PENDING_FILE="$(mktemp)"
DENIED_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

post_json "$CORE_URL/tasks/plan" '{"goal":"Operator waits for command capability approval","type":"system_task","policy":{"intent":"system.command"},"actions":[{"kind":"system.command","intent":"system.command","params":{"command":"rm","args":["-rf","/tmp/openclaw-danger"]}}]}' > "$WAIT_PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"
curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10" > "$PENDING_APPROVALS_FILE"

approval_id="$(node - <<'EOF' "$BLOCKED_STEP_FILE" "$PENDING_APPROVALS_FILE"
const fs = require("node:fs");
const blocked = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const pending = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (!blocked.ok || blocked.ran !== false || blocked.blocked !== true || blocked.reason !== "policy_requires_approval") {
  throw new Error("operator should wait on capability approval instead of running the task");
}
if (blocked.task?.status !== "queued" || blocked.task?.executionPhase !== "waiting_for_approval") {
  throw new Error("blocked capability task should remain queued and waiting_for_approval");
}
if (!blocked.approval?.id || blocked.approval.status !== "pending") {
  throw new Error("blocked operator response should include a pending approval");
}
if (pending.items?.length !== 1 || pending.items[0].id !== blocked.approval.id) {
  throw new Error("approval inbox should contain the operator-created pending approval");
}
process.stdout.write(blocked.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-capability-approval-operator-check","reason":"approve dry-run command plan"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$APPROVED_STEP_FILE"

post_json "$CORE_URL/tasks/plan" '{"goal":"Operator fails denied command capability approval","type":"system_task","policy":{"intent":"system.command"},"actions":[{"kind":"system.command","intent":"system.command","params":{"command":"rm","args":["-rf","/tmp/openclaw-denied"]}}]}' > "$DENIED_PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$DENIED_BLOCKED_STEP_FILE"
curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10" > "$DENY_PENDING_FILE"

deny_id="$(node - <<'EOF' "$DENIED_BLOCKED_STEP_FILE" "$DENY_PENDING_FILE"
const fs = require("node:fs");
const blocked = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const pending = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (!blocked.ok || blocked.ran !== false || blocked.blocked !== true || blocked.reason !== "policy_requires_approval") {
  throw new Error("denial path should also wait on capability approval");
}
if (!blocked.approval?.id || blocked.approval.status !== "pending") {
  throw new Error("denial path should expose the pending approval");
}
if (pending.items?.length !== 1 || pending.items[0].id !== blocked.approval.id) {
  throw new Error("denial path approval inbox should contain one pending approval");
}
process.stdout.write(blocked.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$deny_id/deny" '{"deniedBy":"dev-capability-approval-operator-check","reason":"deny dry-run command plan"}' > "$DENIED_FILE"

curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?source=openclaw-core&limit=100" > "$EVENTS_FILE"

node - <<'EOF' \
  "$WAIT_PLAN_FILE" \
  "$BLOCKED_STEP_FILE" \
  "$APPROVED_FILE" \
  "$APPROVED_STEP_FILE" \
  "$DENIED_PLAN_FILE" \
  "$DENIED_BLOCKED_STEP_FILE" \
  "$DENIED_FILE" \
  "$HISTORY_FILE" \
  "$EVENTS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const waitPlan = readJson(2);
const blockedStep = readJson(3);
const approved = readJson(4);
const approvedStep = readJson(5);
const deniedPlan = readJson(6);
const deniedBlockedStep = readJson(7);
const denied = readJson(8);
const history = readJson(9);
const events = readJson(10);

const waitAction = (waitPlan.plan?.steps ?? []).find((step) => step.kind === "system.command");
if (!waitPlan.ok || waitPlan.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error("unapproved command task should be task-audited before capability approval gate");
}
if (waitPlan.task?.approval?.required === true) {
  throw new Error("capability-level approval should be requested by the operator, not at task creation");
}
if (waitAction?.capabilityId !== "act.system.command.dry_run" || waitAction.requiresApproval !== true) {
  throw new Error("command plan should carry approval-gated command capability metadata");
}
if (blockedStep.policy?.decision !== "require_approval" || blockedStep.approval?.intent !== "system.command") {
  throw new Error("blocked step should expose the capability policy approval requirement");
}
if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error("approval should convert the waiting task to audited execution");
}
if (!approvedStep.ok || approvedStep.ran !== true || approvedStep.task?.status !== "completed") {
  throw new Error("operator should complete the approved capability task");
}
if (approvedStep.execution?.executor !== "capability-invoke-v1") {
  throw new Error("approved capability task should execute through capability invoke");
}
const approvedInvocation = approvedStep.execution?.capabilityInvocations?.[0];
if (
  approvedInvocation?.capabilityId !== "act.system.command.dry_run"
  || approvedInvocation.invoked !== true
  || approvedInvocation.summary?.wouldExecute !== false
) {
  throw new Error("approved system command must remain dry-run only");
}

if (!deniedPlan.ok || deniedPlan.task?.status !== "queued") {
  throw new Error("denial path task should be queued before approval gate");
}
if (deniedBlockedStep.task?.status !== "queued" || deniedBlockedStep.task?.executionPhase !== "waiting_for_approval") {
  throw new Error("denial path should wait without failing before user decision");
}
if (denied.approval?.status !== "denied" || denied.task?.status !== "failed") {
  throw new Error("denying capability approval should fail the waiting task");
}
if (denied.task?.outcome?.reason !== "Approval denied by user.") {
  throw new Error("denied task should record a clear user-denial reason");
}

if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`capability history should only include the approved invocation: ${JSON.stringify(history.summary)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.approved", "approval.denied", "capability.invoked", "task.completed", "task.failed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  capabilityApprovalOperator: {
    blockedGate: {
      taskId: blockedStep.task?.id ?? null,
      approvalId: blockedStep.approval?.id ?? null,
      reason: blockedStep.reason ?? null,
      phase: blockedStep.task?.executionPhase ?? null,
    },
    approvedExecution: {
      taskStatus: approvedStep.task?.status ?? null,
      executor: approvedStep.execution?.executor ?? null,
      wouldExecute: approvedInvocation.summary.wouldExecute,
    },
    deniedExecution: {
      taskStatus: denied.task?.status ?? null,
      approvalStatus: denied.approval?.status ?? null,
    },
    history: history.summary,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("approval.") || type.startsWith("capability.") || type.startsWith("task.")),
}, null, 2));
EOF
