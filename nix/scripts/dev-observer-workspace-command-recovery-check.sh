#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-workspace-command-recovery-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8860}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8861}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8862}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8863}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8864}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8865}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8866}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8867}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8930}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-workspace-command-recovery-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-workspace-command-recovery-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

write_package_json() {
  local script_body="$1"
  cat > "$WORKSPACE_DIR/package.json" <<JSON
{
  "name": "openclaw",
  "version": "0.0.0-observer-command-recovery-fixture",
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

write_package_json 'node -e \"process.stderr.write('\''observer-workspace-recovery-fail'\''); process.exit(7)\"'
cat > "$WORKSPACE_DIR/package-lock.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-command-recovery-fixture",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw",
      "version": "0.0.0-observer-command-recovery-fixture"
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
    "${APPROVED_FILE:-}" \
    "${FAIL_STEP_FILE:-}" \
    "${RECOVERED_FILE:-}" \
    "${COMMANDS_AFTER_RECOVERY_FILE:-}" \
    "${RECOVERED_APPROVED_FILE:-}" \
    "${RECOVERED_STEP_FILE:-}" \
    "${TASKS_FILE:-}" \
    "${LATEST_FAILED_FILE:-}" \
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
APPROVED_FILE="$(mktemp)"
FAIL_STEP_FILE="$(mktemp)"
RECOVERED_FILE="$(mktemp)"
COMMANDS_AFTER_RECOVERY_FILE="$(mktemp)"
RECOVERED_APPROVED_FILE="$(mktemp)"
RECOVERED_STEP_FILE="$(mktemp)"
TASKS_FILE="$(mktemp)"
LATEST_FAILED_FILE="$(mktemp)"
RECOVERED_DETAIL_FILE="$(mktemp)"
TRANSCRIPTS_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
post_json "$CORE_URL/workspaces/command-proposals/tasks" '{"proposalId":"openclaw:typecheck","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!taskResponse.ok || taskResponse.mode !== "approval-gated" || taskResponse.task?.status !== "queued") {
  throw new Error(`observer recovery fixture should create an approval-gated workspace command task: ${JSON.stringify(taskResponse)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before observer recovery fixture approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-observer-workspace-command-recovery-check","reason":"approve failing observer recovery fixture command"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$FAIL_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks/latest-failed" > "$LATEST_FAILED_FILE"

failed_task_id="$(node - <<'EOF' "$FAIL_STEP_FILE" "$LATEST_FAILED_FILE"
const fs = require("node:fs");
const failStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const latestFailed = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!failStep.ok || failStep.ran !== true || failStep.task?.status !== "failed") {
  throw new Error(`observer recovery fixture command should fail after approval: ${JSON.stringify(failStep)}`);
}
if (failStep.task?.restorable !== true || latestFailed.task?.id !== failStep.task?.id || latestFailed.task?.restorable !== true) {
  throw new Error(`observer should be able to identify the failed workspace command as recoverable: ${JSON.stringify({ failStep: failStep.task, latestFailed })}`);
}
if (!String(failStep.task?.outcome?.reason ?? "").includes("exit code 7")) {
  throw new Error(`observer recovery fixture failure should explain exit code 7: ${JSON.stringify(failStep.task?.outcome)}`);
}

process.stdout.write(failStep.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$failed_task_id/recover" '{}' > "$RECOVERED_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_RECOVERY_FILE"

recovered_task_id="$(node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$FAIL_STEP_FILE" "$RECOVERED_FILE" "$COMMANDS_AFTER_RECOVERY_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const failStep = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const commandSummary = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));

const requiredHtml = [
  "recover-latest-failed-task-button",
  "recover-selected-task-button",
  "task-recoverable-count",
  "task-history-json",
];
const requiredClient = [
  "recoverLatestFailedTask",
  "recoverSelectedTask",
  "/tasks/${sourceTask.id}/recover",
  "task.recovered",
  "approval.created",
  "refreshApprovalState",
  "Recoverable:",
  "Recovered By:",
  "data-task-action=\"recover\"",
];

for (const token of requiredHtml) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing recovery token ${token}`);
  }
}
for (const token of requiredClient) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing recovery token ${token}`);
  }
}

if (!recovered.ok || recovered.task?.status !== "queued") {
  throw new Error(`observer recovery should create a queued recovered task: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.recovery?.recoveredFromTaskId !== failStep.task?.id) {
  throw new Error(`observer recovery should link recovered task to failed source: ${JSON.stringify(recovered.task?.recovery)}`);
}
if (recovered.recoveredFromTask?.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`observer recovery should expose recoveredByTaskId on the failed source: ${JSON.stringify(recovered.recoveredFromTask)}`);
}
if (recovered.task?.approval?.required !== true || recovered.task?.approval?.status !== "pending") {
  throw new Error(`observer recovery should leave recovered workspace command behind fresh approval: ${JSON.stringify(recovered.task?.approval)}`);
}
if (recovered.task?.policy?.request?.approved === true || recovered.task?.policy?.decision?.approved === true) {
  throw new Error(`observer recovery should not inherit prior approval: ${JSON.stringify(recovered.task?.policy)}`);
}
if (commandSummary.summary?.total !== 1 || commandSummary.summary?.failed !== 1) {
  throw new Error(`observer recovery should not execute another command before fresh approval: ${JSON.stringify(commandSummary.summary)}`);
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

write_package_json 'node -e \"process.stdout.write('\''observer-workspace-recovery-ok'\'')\"'
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"
post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-observer-workspace-command-recovery-check","reason":"approve recovered observer fixture command"}' > "$RECOVERED_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$TASKS_FILE"
curl --silent --fail "$CORE_URL/tasks/$recovered_task_id" > "$RECOVERED_DETAIL_FILE"
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
  "$TASKS_FILE" \
  "$RECOVERED_DETAIL_FILE" \
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
const tasks = readJson(7);
const recoveredDetail = readJson(8);
const transcripts = readJson(9);
const history = readJson(10);
const approvals = readJson(11);
const events = readJson(12);

if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`observer recovered command should block until fresh approval: ${JSON.stringify(blockedStep)}`);
}
if (blockedStep.approval?.id !== recovered.task?.approval?.requestId) {
  throw new Error(`observer recovered command should expose its fresh approval: ${JSON.stringify(blockedStep.approval)}`);
}
if (recoveredApproved.approval?.status !== "approved" || recoveredApproved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`observer recovered approval should convert task to audited execution: ${JSON.stringify(recoveredApproved)}`);
}
if (!recoveredStep.ok || recoveredStep.ran !== true || recoveredStep.task?.status !== "completed") {
  throw new Error(`observer recovered workspace command should complete after approval: ${JSON.stringify(recoveredStep)}`);
}
if (recoveredStep.task?.recovery?.recoveredFromTaskId !== failStep.task?.id) {
  throw new Error(`observer recovered task should preserve recovery metadata: ${JSON.stringify(recoveredStep.task?.recovery)}`);
}
if (!String(recoveredStep.execution?.commandTranscript?.[0]?.stdout ?? "").includes("observer-workspace-recovery-ok")) {
  throw new Error(`observer recovered command should capture success stdout: ${JSON.stringify(recoveredStep.execution?.commandTranscript?.[0])}`);
}
if (tasks.summary?.counts?.recoverable < 1 || tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.completed !== 1) {
  throw new Error(`observer task list summary should expose failed source, completed recovery, and recoverable history: ${JSON.stringify(tasks.summary)}`);
}
if (recoveredDetail.task?.id !== recoveredStep.task?.id || recoveredDetail.task?.recovery?.recoveredFromTaskId !== failStep.task?.id) {
  throw new Error(`observer task detail should expose recovered task metadata: ${JSON.stringify(recoveredDetail)}`);
}
if (transcripts.summary?.total !== 2 || transcripts.summary?.failed !== 1 || transcripts.summary?.executed !== 1) {
  throw new Error(`observer command ledger should show failed source and successful recovery: ${JSON.stringify(transcripts.summary)}`);
}
if (history.summary?.total !== 2 || history.summary?.invoked !== 2 || history.summary?.blocked !== 0) {
  throw new Error(`observer capability history should include both command invocations: ${JSON.stringify(history.summary)}`);
}
if ((approvals.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error(`observer recovery should leave no pending approvals after completion: ${JSON.stringify(approvals.items)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.approved", "task.recovered", "capability.invoked", "system.command.executed", "task.failed", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  observerWorkspaceCommandRecovery: {
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
    observerTaskSummary: tasks.summary?.counts ?? null,
    commandLedger: transcripts.summary,
    capabilityHistory: history.summary,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("approval.") || type.startsWith("capability.") || type.startsWith("system.command") || type.startsWith("task.")),
}, null, 2));
EOF
