#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-workspace-command-denial-recovery-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8920}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8921}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8922}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8923}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8924}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8925}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8926}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8927}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8990}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-workspace-command-denial-recovery-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-workspace-command-denial-recovery-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-command-denial-recovery-fixture",
  "private": true,
  "scripts": {
    "typecheck": "printf observer-workspace-command-denial-recovery-ok"
  },
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
JSON
cat > "$WORKSPACE_DIR/package-lock.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-command-denial-recovery-fixture",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw",
      "version": "0.0.0-observer-command-denial-recovery-fixture"
    }
  }
}
JSON

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${TASK_FILE:-}" \
    "${BLOCKED_STEP_FILE:-}" \
    "${DENIED_FILE:-}" \
    "${RECOVERED_FILE:-}" \
    "${COMMANDS_AFTER_RECOVERY_FILE:-}" \
    "${HISTORY_AFTER_RECOVERY_FILE:-}" \
    "${RECOVERED_BLOCKED_STEP_FILE:-}" \
    "${RECOVERED_APPROVED_FILE:-}" \
    "${RECOVERED_STEP_FILE:-}" \
    "${TASKS_FILE:-}" \
    "${RECOVERED_DETAIL_FILE:-}" \
    "${TRANSCRIPTS_FILE:-}" \
    "${HISTORY_FILE:-}" \
    "${APPROVALS_FILE:-}" \
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

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_STEP_FILE="$(mktemp)"
DENIED_FILE="$(mktemp)"
RECOVERED_FILE="$(mktemp)"
COMMANDS_AFTER_RECOVERY_FILE="$(mktemp)"
HISTORY_AFTER_RECOVERY_FILE="$(mktemp)"
RECOVERED_BLOCKED_STEP_FILE="$(mktemp)"
RECOVERED_APPROVED_FILE="$(mktemp)"
RECOVERED_STEP_FILE="$(mktemp)"
TASKS_FILE="$(mktemp)"
RECOVERED_DETAIL_FILE="$(mktemp)"
TRANSCRIPTS_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
post_json "$CORE_URL/workspaces/command-proposals/tasks" '{"proposalId":"openclaw:typecheck","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

const requiredHtml = [
  "workspace-command-task-button",
  "deny-latest-button",
  "recover-latest-failed-task-button",
  "recover-selected-task-button",
  "task-recoverable-count",
  "task-history-json",
  "approval-json",
  "command-ledger-total",
  "capability-history-total",
];
const requiredClient = [
  "createWorkspaceCommandApprovalTask",
  "resolveLatestApproval",
  "resolveLatestApproval(\"deny\")",
  "recoverLatestFailedTask",
  "recoverSelectedTask",
  "/tasks/${sourceTask.id}/recover",
  "approval.denied",
  "approval.created",
  "approval.approved",
  "task.recovered",
  "task.failed",
  "task.completed",
  "refreshApprovalState",
  "refreshTaskList",
  "refreshCommandLedger",
  "refreshCapabilityHistory",
  "data-task-action=\"recover\"",
];

for (const token of requiredHtml) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing denial recovery token ${token}`);
  }
}
for (const token of requiredClient) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing denial recovery token ${token}`);
  }
}

if (!taskResponse.ok || taskResponse.mode !== "approval-gated" || taskResponse.task?.status !== "queued") {
  throw new Error(`observer denial recovery fixture should create an approval-gated workspace command task: ${JSON.stringify(taskResponse)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before observer denial recovery fixture approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/deny" '{"deniedBy":"dev-observer-workspace-command-denial-recovery-check","reason":"deny observer fixture workspace command before recovery"}' > "$DENIED_FILE"

denied_task_id="$(node - <<'EOF' "$DENIED_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!denied.ok || denied.approval?.status !== "denied" || denied.task?.status !== "failed") {
  throw new Error(`observer denial recovery should fail the task after denial: ${JSON.stringify(denied)}`);
}
if (denied.task?.outcome?.reason !== "Approval denied by user.") {
  throw new Error(`observer denial recovery should record user-denial reason: ${JSON.stringify(denied.task?.outcome)}`);
}
if (denied.task?.restorable !== true) {
  throw new Error(`observer denied workspace command should remain recoverable: ${JSON.stringify(denied.task)}`);
}
if (denied.task?.approval?.required !== false || denied.task?.approval?.status !== "denied") {
  throw new Error(`observer denied workspace command should resolve original approval gate: ${JSON.stringify(denied.task?.approval)}`);
}

process.stdout.write(denied.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$denied_task_id/recover" '{}' > "$RECOVERED_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_RECOVERY_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$HISTORY_AFTER_RECOVERY_FILE"

recovered_task_id="$(node - <<'EOF' "$DENIED_FILE" "$RECOVERED_FILE" "$COMMANDS_AFTER_RECOVERY_FILE" "$HISTORY_AFTER_RECOVERY_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const commandSummary = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const history = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

if (!recovered.ok || recovered.task?.status !== "queued") {
  throw new Error(`observer denial recovery should create a queued recovered task: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.recovery?.recoveredFromTaskId !== denied.task?.id) {
  throw new Error(`observer denial recovery should link recovered task to denied source: ${JSON.stringify(recovered.task?.recovery)}`);
}
if (recovered.recoveredFromTask?.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`observer denial recovery should expose recoveredByTaskId on denied source: ${JSON.stringify(recovered.recoveredFromTask)}`);
}
if (recovered.task?.policy?.request?.approved === true || recovered.task?.policy?.decision?.approved === true) {
  throw new Error(`observer recovered denied task must not inherit approval: ${JSON.stringify(recovered.task.policy)}`);
}
if (recovered.task?.policy?.decision?.decision !== "require_approval") {
  throw new Error(`observer recovered denied task should require approval again: ${JSON.stringify(recovered.task.policy)}`);
}
if (recovered.task?.approval?.required !== true || recovered.task?.approval?.status !== "pending") {
  throw new Error(`observer recovered denied task should have fresh pending approval: ${JSON.stringify(recovered.task.approval)}`);
}
if (recovered.task?.approval?.requestId === denied.approval?.id) {
  throw new Error(`observer recovered denied task should not reuse original approval id: ${JSON.stringify(recovered.task.approval)}`);
}
if (commandSummary.summary?.total !== 0 || commandSummary.summary?.executed !== 0 || commandSummary.summary?.failed !== 0) {
  throw new Error(`observer denial recovery must not execute before fresh approval: ${JSON.stringify(commandSummary.summary)}`);
}
if (history.summary?.total !== 0 || history.summary?.invoked !== 0 || history.summary?.blocked !== 0) {
  throw new Error(`observer denial recovery must not invoke command capability before fresh approval: ${JSON.stringify(history.summary)}`);
}

process.stdout.write(recovered.task.id);
EOF
)"

recovered_approval_id="$(node - <<'EOF' "$RECOVERED_FILE"
const fs = require("node:fs");
const recovered = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
process.stdout.write(recovered.task.approval.requestId);
EOF
)"

post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_BLOCKED_STEP_FILE"
post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-observer-workspace-command-denial-recovery-check","reason":"approve recovered observer denial fixture command"}' > "$RECOVERED_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$TASKS_FILE"
curl --silent --fail "$CORE_URL/tasks/$recovered_task_id" > "$RECOVERED_DETAIL_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=10" > "$TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=180" > "$EVENTS_FILE"

node - <<'EOF' \
  "$DENIED_FILE" \
  "$RECOVERED_FILE" \
  "$RECOVERED_BLOCKED_STEP_FILE" \
  "$RECOVERED_APPROVED_FILE" \
  "$RECOVERED_STEP_FILE" \
  "$TASKS_FILE" \
  "$RECOVERED_DETAIL_FILE" \
  "$TRANSCRIPTS_FILE" \
  "$HISTORY_FILE" \
  "$APPROVALS_FILE" \
  "$EVENTS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const denied = readJson(2);
const recovered = readJson(3);
const recoveredBlockedStep = readJson(4);
const recoveredApproved = readJson(5);
const recoveredStep = readJson(6);
const tasks = readJson(7);
const recoveredDetail = readJson(8);
const transcripts = readJson(9);
const history = readJson(10);
const approvals = readJson(11);
const events = readJson(12);

if (!recoveredBlockedStep.ok || recoveredBlockedStep.ran !== false || recoveredBlockedStep.blocked !== true || recoveredBlockedStep.reason !== "policy_requires_approval") {
  throw new Error(`observer recovered denied command should block until fresh approval: ${JSON.stringify(recoveredBlockedStep)}`);
}
if (recoveredBlockedStep.approval?.id !== recovered.task?.approval?.requestId) {
  throw new Error(`observer recovered denied command should expose its fresh approval: ${JSON.stringify(recoveredBlockedStep.approval)}`);
}
if (recoveredApproved.approval?.status !== "approved" || recoveredApproved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`observer recovered denied approval should convert task to audited execution: ${JSON.stringify(recoveredApproved)}`);
}
if (!recoveredStep.ok || recoveredStep.ran !== true || recoveredStep.task?.status !== "completed") {
  throw new Error(`observer recovered denied workspace command should complete after approval: ${JSON.stringify(recoveredStep)}`);
}
if (recoveredStep.task?.recovery?.recoveredFromTaskId !== denied.task?.id) {
  throw new Error(`observer recovered denied task should preserve recovery metadata: ${JSON.stringify(recoveredStep.task?.recovery)}`);
}
if (recoveredStep.execution?.commandTranscript?.[0]?.exitCode !== 0) {
  throw new Error(`observer recovered denied command transcript should show success: ${JSON.stringify(recoveredStep.execution?.commandTranscript)}`);
}
if (!String(recoveredStep.execution?.commandTranscript?.[0]?.stdout ?? "").includes("observer-workspace-command-denial-recovery-ok")) {
  throw new Error(`observer recovered denied command should capture success stdout: ${JSON.stringify(recoveredStep.execution?.commandTranscript?.[0])}`);
}
if (tasks.summary?.counts?.recoverable < 1 || tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.completed !== 1 || tasks.summary?.counts?.active !== 0) {
  throw new Error(`observer task list summary should expose denied source, completed recovery, and recoverable history: ${JSON.stringify(tasks.summary)}`);
}
if (recoveredDetail.task?.id !== recoveredStep.task?.id || recoveredDetail.task?.recovery?.recoveredFromTaskId !== denied.task?.id) {
  throw new Error(`observer task detail should expose recovered denied task metadata: ${JSON.stringify(recoveredDetail)}`);
}
if (transcripts.summary?.total !== 1 || transcripts.summary?.executed !== 1 || transcripts.summary?.failed !== 0 || transcripts.summary?.taskCount !== 1) {
  throw new Error(`observer command ledger should show only approved recovered command execution: ${JSON.stringify(transcripts.summary)}`);
}
if (transcripts.items?.[0]?.taskId !== recoveredStep.task?.id || transcripts.items?.[0]?.state !== "executed") {
  throw new Error(`observer command ledger should not include the denied source task: ${JSON.stringify(transcripts.items)}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`observer capability history should include only approved recovered command invocation: ${JSON.stringify(history.summary)}`);
}
if (approvals.summary?.counts?.denied !== 1 || approvals.summary?.counts?.approved !== 1 || approvals.summary?.counts?.pending !== 0) {
  throw new Error(`observer approval summary should show original denial plus fresh recovered approval: ${JSON.stringify(approvals.summary)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.denied", "approval.approved", "task.recovered", "capability.invoked", "system.command.executed", "task.failed", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  observerWorkspaceCommandDenialRecovery: {
    deniedTask: {
      id: denied.task.id,
      status: denied.task.status,
      restorable: denied.task.restorable,
      recoveredByTaskId: recovered.recoveredFromTask?.recoveredByTaskId ?? null,
    },
    recoveredTask: {
      id: recoveredStep.task.id,
      status: recoveredStep.task.status,
      recoveredFromTaskId: recoveredStep.task.recovery?.recoveredFromTaskId ?? null,
      freshApprovalId: recovered.task?.approval?.requestId ?? null,
    },
    observerTaskSummary: tasks.summary?.counts ?? null,
    commandLedger: transcripts.summary,
    capabilityHistory: history.summary,
    approvals: approvals.summary,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("approval.") || type.startsWith("capability.") || type.startsWith("system.command") || type.startsWith("task.")),
}, null, 2));
EOF
