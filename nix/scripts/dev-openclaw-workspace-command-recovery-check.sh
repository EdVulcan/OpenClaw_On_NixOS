#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-workspace-command-recovery-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8840}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8841}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8842}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8843}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8844}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8845}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8846}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8847}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8910}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-workspace-command-recovery-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-workspace-command-recovery-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

write_package_json() {
  local script_body="$1"
  cat > "$WORKSPACE_DIR/package.json" <<JSON
{
  "name": "openclaw",
  "version": "0.0.0-command-recovery-fixture",
  "private": true,
  "scripts": {
    "typecheck": "$script_body"
  },
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
JSON
}

write_package_json 'node -e \"process.stderr.write('\''workspace-command-recovery-fail'\''); process.exit(7)\"'
cat > "$WORKSPACE_DIR/package-lock.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-command-recovery-fixture",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw",
      "version": "0.0.0-command-recovery-fixture"
    }
  }
}
JSON

cleanup() {
  rm -f \
    "${TASK_FILE:-}" \
    "${BLOCKED_STEP_FILE:-}" \
    "${APPROVED_FILE:-}" \
    "${FAIL_STEP_FILE:-}" \
    "${RECOVERED_FILE:-}" \
    "${COMMANDS_AFTER_RECOVERY_FILE:-}" \
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
APPROVED_FILE="$(mktemp)"
FAIL_STEP_FILE="$(mktemp)"
RECOVERED_FILE="$(mktemp)"
COMMANDS_AFTER_RECOVERY_FILE="$(mktemp)"
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
  throw new Error(`workspace command task should be queued behind approval: ${JSON.stringify(taskResponse)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before initial workspace command approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-openclaw-workspace-command-recovery-check","reason":"approve failing fixture workspace command"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$FAIL_STEP_FILE"

failed_task_id="$(node - <<'EOF' "$FAIL_STEP_FILE"
const fs = require("node:fs");
const failStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!failStep.ok || failStep.ran !== true || failStep.task?.status !== "failed") {
  throw new Error(`approved workspace command should fail before recovery: ${JSON.stringify(failStep)}`);
}
if (failStep.task?.restorable !== true) {
  throw new Error(`failed workspace command should be recoverable: ${JSON.stringify(failStep.task)}`);
}
if (!String(failStep.task?.outcome?.reason ?? "").includes("exit code 7")) {
  throw new Error(`failed workspace command should explain exit code 7: ${JSON.stringify(failStep.task?.outcome)}`);
}
if (failStep.task?.plan?.status !== "failed") {
  throw new Error(`failed workspace command should mark its plan failed: ${JSON.stringify(failStep.task?.plan)}`);
}

process.stdout.write(failStep.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$failed_task_id/recover" '{}' > "$RECOVERED_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_RECOVERY_FILE"

recovered_approval_id="$(node - <<'EOF' "$FAIL_STEP_FILE" "$RECOVERED_FILE" "$COMMANDS_AFTER_RECOVERY_FILE"
const fs = require("node:fs");
const failStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const commandSummary = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

if (!recovered.ok || recovered.task?.status !== "queued") {
  throw new Error(`recovered workspace command should be queued: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.recovery?.recoveredFromTaskId !== failStep.task?.id) {
  throw new Error(`recovered task should link to failed source: ${JSON.stringify(recovered.task?.recovery)}`);
}
if (recovered.recoveredFromTask?.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`source task should link to recovered task: ${JSON.stringify(recovered.recoveredFromTask)}`);
}
if (recovered.task?.targetUrl !== null || recovered.task?.workViewStrategy !== "workspace-command") {
  throw new Error(`recovered workspace command should stay a system/workspace task: ${JSON.stringify(recovered.task)}`);
}
if (recovered.task?.policy?.request?.approved === true || recovered.task?.policy?.decision?.approved === true) {
  throw new Error(`recovered workspace command must not inherit prior approval: ${JSON.stringify(recovered.task.policy)}`);
}
if (recovered.task?.approval?.required !== true || recovered.task?.approval?.status !== "pending") {
  throw new Error(`recovered workspace command should require fresh approval: ${JSON.stringify(recovered.task.approval)}`);
}
if (recovered.task?.plan?.status !== "planned" || recovered.task?.plan?.planId === failStep.task?.plan?.planId) {
  throw new Error(`recovered workspace command should get a fresh planned plan: ${JSON.stringify(recovered.task.plan)}`);
}
const actionStep = (recovered.task?.plan?.steps ?? []).find((step) => step.phase === "acting_on_target");
if (
  actionStep?.capabilityId !== "act.system.command.execute"
  || actionStep.status !== "pending"
  || actionStep.params?.command !== "npm"
  || actionStep.params?.args?.join(" ") !== "run typecheck"
) {
  throw new Error(`recovered workspace command should preserve the pending command plan: ${JSON.stringify(actionStep)}`);
}
if (commandSummary.summary?.total !== 1 || commandSummary.summary?.failed !== 1) {
  throw new Error(`recovering should not execute another command before approval: ${JSON.stringify(commandSummary.summary)}`);
}

process.stdout.write(recovered.task.approval.requestId);
EOF
)"

write_package_json 'node -e \"process.stdout.write('\''workspace-command-recovery-ok'\'')\"'
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"
post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-openclaw-workspace-command-recovery-check","reason":"approve recovered fixture workspace command"}' > "$RECOVERED_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks/summary" > "$TASK_SUMMARY_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=10" > "$TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=160" > "$EVENTS_FILE"

node - <<'EOF' \
  "$FAIL_STEP_FILE" \
  "$RECOVERED_FILE" \
  "$BLOCKED_STEP_FILE" \
  "$RECOVERED_APPROVED_FILE" \
  "$RECOVERED_STEP_FILE" \
  "$TASK_SUMMARY_FILE" \
  "$TRANSCRIPTS_FILE" \
  "$HISTORY_FILE" \
  "$APPROVALS_FILE" \
  "$EVENTS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const failStep = readJson(2);
const recovered = readJson(3);
const blockedStep = readJson(4);
const recoveredApproved = readJson(5);
const recoveredStep = readJson(6);
const taskSummary = readJson(7);
const transcripts = readJson(8);
const history = readJson(9);
const approvals = readJson(10);
const events = readJson(11);

if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block recovered command until fresh approval: ${JSON.stringify(blockedStep)}`);
}
if (blockedStep.approval?.id !== recovered.task?.approval?.requestId) {
  throw new Error(`blocked recovered command should expose the recovered approval: ${JSON.stringify(blockedStep.approval)}`);
}
if (recoveredApproved.approval?.status !== "approved" || recoveredApproved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`recovered approval should convert task to audited execution: ${JSON.stringify(recoveredApproved)}`);
}
if (!recoveredStep.ok || recoveredStep.ran !== true || recoveredStep.task?.status !== "completed") {
  throw new Error(`approved recovered workspace command should complete: ${JSON.stringify(recoveredStep)}`);
}
if (recoveredStep.task?.recovery?.recoveredFromTaskId !== failStep.task?.id) {
  throw new Error(`completed recovered task should preserve recovery link: ${JSON.stringify(recoveredStep.task?.recovery)}`);
}
if (recoveredStep.execution?.commandTranscript?.[0]?.exitCode !== 0) {
  throw new Error(`recovered command transcript should show success: ${JSON.stringify(recoveredStep.execution?.commandTranscript)}`);
}
if (!String(recoveredStep.execution?.commandTranscript?.[0]?.stdout ?? "").includes("workspace-command-recovery-ok")) {
  throw new Error(`recovered command should capture success stdout: ${JSON.stringify(recoveredStep.execution?.commandTranscript?.[0])}`);
}
if (taskSummary.summary?.counts?.failed !== 1 || taskSummary.summary?.counts?.completed !== 1 || taskSummary.summary?.counts?.active !== 0) {
  throw new Error(`task summary should show one failed source, one completed recovery, and no active tasks: ${JSON.stringify(taskSummary.summary)}`);
}
if (transcripts.summary?.total !== 2 || transcripts.summary?.failed !== 1 || transcripts.summary?.executed !== 1 || transcripts.summary?.taskCount !== 2) {
  throw new Error(`command transcript summary should include failed source and successful recovery: ${JSON.stringify(transcripts.summary)}`);
}
const recoveredRecord = (transcripts.items ?? []).find((item) => item.taskId === recoveredStep.task?.id);
const failedRecord = (transcripts.items ?? []).find((item) => item.taskId === failStep.task?.id);
if (recoveredRecord?.state !== "executed" || failedRecord?.state !== "failed") {
  throw new Error(`transcript ledger should preserve both source and recovered outcomes: ${JSON.stringify(transcripts.items)}`);
}
if (history.summary?.total !== 2 || history.summary?.invoked !== 2 || history.summary?.blocked !== 0) {
  throw new Error(`capability history should record failed and recovered command invocations: ${JSON.stringify(history.summary)}`);
}
if ((approvals.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error(`recovery flow should leave no pending approvals after completion: ${JSON.stringify(approvals.items)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.approved", "task.recovered", "capability.invoked", "system.command.executed", "task.failed", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  openclawWorkspaceCommandRecovery: {
    sourceTask: {
      id: failStep.task.id,
      status: failStep.task.status,
      restorable: failStep.task.restorable,
      recoveredByTaskId: recovered.recoveredFromTask?.recoveredByTaskId ?? null,
    },
    recoveredTask: {
      id: recoveredStep.task.id,
      status: recoveredStep.task.status,
      recoveredFromTaskId: recoveredStep.task.recovery?.recoveredFromTaskId ?? null,
      freshApprovalId: recovered.task?.approval?.requestId ?? null,
    },
    transcripts: transcripts.summary,
    capabilityHistory: history.summary,
    approvals: (approvals.items ?? []).map((approval) => ({
      id: approval.id,
      status: approval.status,
      taskId: approval.taskId,
    })),
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("approval.") || type.startsWith("capability.") || type.startsWith("system.command") || type.startsWith("task.")),
}, null, 2));
EOF
