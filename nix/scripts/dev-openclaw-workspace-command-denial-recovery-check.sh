#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-workspace-command-denial-recovery-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8910}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8911}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8912}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8913}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8914}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8915}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8916}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8917}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8980}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-workspace-command-denial-recovery-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-workspace-command-denial-recovery-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-command-denial-recovery-fixture",
  "private": true,
  "scripts": {
    "typecheck": "printf workspace-command-denial-recovery-ok"
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
  "version": "0.0.0-command-denial-recovery-fixture",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw",
      "version": "0.0.0-command-denial-recovery-fixture"
    }
  }
}
JSON

cleanup() {
  rm -f \
    "${TASK_FILE:-}" \
    "${BLOCKED_STEP_FILE:-}" \
    "${DENIED_FILE:-}" \
    "${RECOVERED_FILE:-}" \
    "${COMMANDS_AFTER_RECOVERY_FILE:-}" \
    "${HISTORY_AFTER_RECOVERY_FILE:-}" \
    "${RECOVERED_BLOCKED_STEP_FILE:-}" \
    "${RECOVERED_APPROVED_FILE:-}" \
    "${RECOVERED_STEP_FILE:-}" \
    "${TASK_SUMMARY_FILE:-}" \
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

TASK_FILE="$(mktemp)"
BLOCKED_STEP_FILE="$(mktemp)"
DENIED_FILE="$(mktemp)"
RECOVERED_FILE="$(mktemp)"
COMMANDS_AFTER_RECOVERY_FILE="$(mktemp)"
HISTORY_AFTER_RECOVERY_FILE="$(mktemp)"
RECOVERED_BLOCKED_STEP_FILE="$(mktemp)"
RECOVERED_APPROVED_FILE="$(mktemp)"
RECOVERED_STEP_FILE="$(mktemp)"
TASK_SUMMARY_FILE="$(mktemp)"
TRANSCRIPTS_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

post_json "$CORE_URL/workspaces/command-proposals/tasks" '{"proposalId":"openclaw:typecheck","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!taskResponse.ok || taskResponse.mode !== "approval-gated" || taskResponse.task?.status !== "queued") {
  throw new Error(`workspace command task should be queued behind approval before denial: ${JSON.stringify(taskResponse)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before denied workspace command approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/deny" '{"deniedBy":"dev-openclaw-workspace-command-denial-recovery-check","reason":"deny fixture workspace command before recovery"}' > "$DENIED_FILE"

denied_task_id="$(node - <<'EOF' "$DENIED_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!denied.ok || denied.approval?.status !== "denied" || denied.task?.status !== "failed") {
  throw new Error(`denying workspace command approval should fail the task: ${JSON.stringify(denied)}`);
}
if (denied.task?.outcome?.reason !== "Approval denied by user.") {
  throw new Error(`denied workspace command should record user-denial reason: ${JSON.stringify(denied.task?.outcome)}`);
}
if (denied.task?.restorable !== true) {
  throw new Error(`denied workspace command should remain recoverable: ${JSON.stringify(denied.task)}`);
}
if (denied.task?.approval?.required !== false || denied.task?.approval?.status !== "denied") {
  throw new Error(`denied workspace command should resolve its original approval gate: ${JSON.stringify(denied.task?.approval)}`);
}
if (denied.task?.policy?.request?.approved === true || denied.task?.policy?.decision?.approved === true) {
  throw new Error(`denied workspace command must not become approved: ${JSON.stringify(denied.task?.policy)}`);
}

process.stdout.write(denied.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$denied_task_id/recover" '{}' > "$RECOVERED_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_RECOVERY_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$HISTORY_AFTER_RECOVERY_FILE"

recovered_approval_id="$(node - <<'EOF' "$DENIED_FILE" "$RECOVERED_FILE" "$COMMANDS_AFTER_RECOVERY_FILE" "$HISTORY_AFTER_RECOVERY_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const commandSummary = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const history = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

if (!recovered.ok || recovered.task?.status !== "queued") {
  throw new Error(`recovering a denied workspace command should create a queued task: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.recovery?.recoveredFromTaskId !== denied.task?.id) {
  throw new Error(`recovered task should link to denied source: ${JSON.stringify(recovered.task?.recovery)}`);
}
if (recovered.recoveredFromTask?.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`denied source task should link to recovered task: ${JSON.stringify(recovered.recoveredFromTask)}`);
}
if (recovered.task?.policy?.request?.approved === true || recovered.task?.policy?.decision?.approved === true) {
  throw new Error(`recovered denied workspace command must not inherit approval: ${JSON.stringify(recovered.task.policy)}`);
}
if (recovered.task?.policy?.decision?.decision !== "require_approval") {
  throw new Error(`recovered denied workspace command should require approval again: ${JSON.stringify(recovered.task.policy)}`);
}
if (recovered.task?.approval?.required !== true || recovered.task?.approval?.status !== "pending") {
  throw new Error(`recovered denied workspace command should have a fresh pending approval: ${JSON.stringify(recovered.task.approval)}`);
}
if (recovered.task?.approval?.requestId === denied.approval?.id) {
  throw new Error(`recovered denied workspace command should not reuse original approval id: ${JSON.stringify(recovered.task.approval)}`);
}
if (recovered.task?.plan?.status !== "planned") {
  throw new Error(`recovered denied workspace command should get a fresh planned plan: ${JSON.stringify(recovered.task.plan)}`);
}
const actionStep = (recovered.task?.plan?.steps ?? []).find((step) => step.phase === "acting_on_target");
if (
  actionStep?.capabilityId !== "act.system.command.execute"
  || actionStep.status !== "pending"
  || actionStep.params?.command !== "npm"
  || actionStep.params?.args?.join(" ") !== "run typecheck"
) {
  throw new Error(`recovered denied workspace command should preserve the pending command plan: ${JSON.stringify(actionStep)}`);
}
if (commandSummary.summary?.total !== 0 || commandSummary.summary?.executed !== 0 || commandSummary.summary?.failed !== 0) {
  throw new Error(`recovering a denied command must not execute before fresh approval: ${JSON.stringify(commandSummary.summary)}`);
}
if (history.summary?.total !== 0 || history.summary?.invoked !== 0 || history.summary?.blocked !== 0) {
  throw new Error(`recovering a denied command must not invoke command capability before fresh approval: ${JSON.stringify(history.summary)}`);
}

process.stdout.write(recovered.task.approval.requestId);
EOF
)"

post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_BLOCKED_STEP_FILE"
post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-openclaw-workspace-command-denial-recovery-check","reason":"approve recovered denied fixture workspace command"}' > "$RECOVERED_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks/summary" > "$TASK_SUMMARY_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=10" > "$TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=160" > "$EVENTS_FILE"

node - <<'EOF' \
  "$DENIED_FILE" \
  "$RECOVERED_FILE" \
  "$RECOVERED_BLOCKED_STEP_FILE" \
  "$RECOVERED_APPROVED_FILE" \
  "$RECOVERED_STEP_FILE" \
  "$TASK_SUMMARY_FILE" \
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
const taskSummary = readJson(7);
const transcripts = readJson(8);
const history = readJson(9);
const approvals = readJson(10);
const events = readJson(11);

if (!recoveredBlockedStep.ok || recoveredBlockedStep.ran !== false || recoveredBlockedStep.blocked !== true || recoveredBlockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block recovered denied command until fresh approval: ${JSON.stringify(recoveredBlockedStep)}`);
}
if (recoveredBlockedStep.approval?.id !== recovered.task?.approval?.requestId) {
  throw new Error(`blocked recovered denied command should expose its fresh approval: ${JSON.stringify(recoveredBlockedStep.approval)}`);
}
if (recoveredApproved.approval?.status !== "approved" || recoveredApproved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`fresh recovered approval should convert task to audited execution: ${JSON.stringify(recoveredApproved)}`);
}
if (!recoveredStep.ok || recoveredStep.ran !== true || recoveredStep.task?.status !== "completed") {
  throw new Error(`approved recovered denied workspace command should complete: ${JSON.stringify(recoveredStep)}`);
}
if (recoveredStep.task?.recovery?.recoveredFromTaskId !== denied.task?.id) {
  throw new Error(`completed recovered denied task should preserve recovery link: ${JSON.stringify(recoveredStep.task?.recovery)}`);
}
if (recoveredStep.execution?.commandTranscript?.[0]?.exitCode !== 0) {
  throw new Error(`recovered denied command transcript should show success: ${JSON.stringify(recoveredStep.execution?.commandTranscript)}`);
}
if (!String(recoveredStep.execution?.commandTranscript?.[0]?.stdout ?? "").includes("workspace-command-denial-recovery-ok")) {
  throw new Error(`recovered denied command should capture success stdout: ${JSON.stringify(recoveredStep.execution?.commandTranscript?.[0])}`);
}
if (taskSummary.summary?.counts?.failed !== 1 || taskSummary.summary?.counts?.completed !== 1 || taskSummary.summary?.counts?.active !== 0) {
  throw new Error(`task summary should show one denied failed source, one completed recovery, and no active tasks: ${JSON.stringify(taskSummary.summary)}`);
}
if (transcripts.summary?.total !== 1 || transcripts.summary?.executed !== 1 || transcripts.summary?.failed !== 0 || transcripts.summary?.taskCount !== 1) {
  throw new Error(`command transcript summary should include only the approved recovered execution: ${JSON.stringify(transcripts.summary)}`);
}
if (transcripts.items?.[0]?.taskId !== recoveredStep.task?.id || transcripts.items?.[0]?.state !== "executed") {
  throw new Error(`command transcript ledger should not include the denied source task: ${JSON.stringify(transcripts.items)}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`capability history should include only the approved recovered command invocation: ${JSON.stringify(history.summary)}`);
}
if (approvals.summary?.counts?.denied !== 1 || approvals.summary?.counts?.approved !== 1 || approvals.summary?.counts?.pending !== 0) {
  throw new Error(`approval summary should show original denial plus fresh recovered approval: ${JSON.stringify(approvals.summary)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.denied", "approval.approved", "task.recovered", "capability.invoked", "system.command.executed", "task.failed", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  openclawWorkspaceCommandDenialRecovery: {
    deniedTask: {
      id: denied.task.id,
      status: denied.task.status,
      reason: denied.task.outcome?.reason ?? null,
      restorable: denied.task.restorable,
      recoveredByTaskId: recovered.recoveredFromTask?.recoveredByTaskId ?? null,
    },
    recoveredTask: {
      id: recoveredStep.task.id,
      status: recoveredStep.task.status,
      recoveredFromTaskId: recoveredStep.task.recovery?.recoveredFromTaskId ?? null,
      freshApprovalId: recovered.task?.approval?.requestId ?? null,
    },
    commandLedger: transcripts.summary,
    capabilityHistory: history.summary,
    approvals: approvals.summary,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("approval.") || type.startsWith("capability.") || type.startsWith("system.command") || type.startsWith("task.")),
}, null, 2));
EOF
