#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-workspace-command-recovery-persistence-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8870}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8871}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8872}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8873}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8874}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8875}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8876}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8877}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8940}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-workspace-command-recovery-persistence-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-workspace-command-recovery-persistence-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

write_package_json() {
  local script_body="$1"
  cat > "$WORKSPACE_DIR/package.json" <<JSON
{
  "name": "openclaw",
  "version": "0.0.0-command-recovery-persistence-fixture",
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

write_package_json 'node -e \"process.stderr.write('\''workspace-command-recovery-persist-fail'\''); process.exit(7)\"'
cat > "$WORKSPACE_DIR/package-lock.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-command-recovery-persistence-fixture",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw",
      "version": "0.0.0-command-recovery-persistence-fixture"
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
    "${PRE_RESTART_TASKS_FILE:-}" \
    "${PRE_RESTART_APPROVALS_FILE:-}" \
    "${PRE_RESTART_TRANSCRIPTS_FILE:-}" \
    "${POST_RECOVERY_RESTART_TASKS_FILE:-}" \
    "${POST_RECOVERY_RESTART_APPROVALS_FILE:-}" \
    "${POST_RECOVERY_RESTART_TRANSCRIPTS_FILE:-}" \
    "${POST_RECOVERY_RESTART_LATEST_FAILED_FILE:-}" \
    "${RECOVERED_APPROVED_FILE:-}" \
    "${RECOVERED_STEP_FILE:-}" \
    "${PRE_FINAL_RESTART_TASKS_FILE:-}" \
    "${PRE_FINAL_RESTART_TRANSCRIPTS_FILE:-}" \
    "${PRE_FINAL_RESTART_HISTORY_FILE:-}" \
    "${POST_FINAL_RESTART_TASKS_FILE:-}" \
    "${POST_FINAL_RESTART_TRANSCRIPTS_FILE:-}" \
    "${POST_FINAL_RESTART_HISTORY_FILE:-}" \
    "${POST_FINAL_RESTART_APPROVALS_FILE:-}"
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
PRE_RESTART_TASKS_FILE="$(mktemp)"
PRE_RESTART_APPROVALS_FILE="$(mktemp)"
PRE_RESTART_TRANSCRIPTS_FILE="$(mktemp)"
POST_RECOVERY_RESTART_TASKS_FILE="$(mktemp)"
POST_RECOVERY_RESTART_APPROVALS_FILE="$(mktemp)"
POST_RECOVERY_RESTART_TRANSCRIPTS_FILE="$(mktemp)"
POST_RECOVERY_RESTART_LATEST_FAILED_FILE="$(mktemp)"
RECOVERED_APPROVED_FILE="$(mktemp)"
RECOVERED_STEP_FILE="$(mktemp)"
PRE_FINAL_RESTART_TASKS_FILE="$(mktemp)"
PRE_FINAL_RESTART_TRANSCRIPTS_FILE="$(mktemp)"
PRE_FINAL_RESTART_HISTORY_FILE="$(mktemp)"
POST_FINAL_RESTART_TASKS_FILE="$(mktemp)"
POST_FINAL_RESTART_TRANSCRIPTS_FILE="$(mktemp)"
POST_FINAL_RESTART_HISTORY_FILE="$(mktemp)"
POST_FINAL_RESTART_APPROVALS_FILE="$(mktemp)"

post_json "$CORE_URL/workspaces/command-proposals/tasks" '{"proposalId":"openclaw:typecheck","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!taskResponse.ok || taskResponse.mode !== "approval-gated" || taskResponse.task?.status !== "queued") {
  throw new Error(`workspace command persistence fixture should start approval-gated: ${JSON.stringify(taskResponse)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before first approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-openclaw-workspace-command-recovery-persistence-check","reason":"approve failing fixture workspace command"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$FAIL_STEP_FILE"

failed_task_id="$(node - <<'EOF' "$FAIL_STEP_FILE"
const fs = require("node:fs");
const failStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!failStep.ok || failStep.ran !== true || failStep.task?.status !== "failed" || failStep.task?.restorable !== true) {
  throw new Error(`approved workspace command should fail as recoverable: ${JSON.stringify(failStep)}`);
}
if (!String(failStep.task?.outcome?.reason ?? "").includes("exit code 7")) {
  throw new Error(`failed workspace command should explain exit code 7: ${JSON.stringify(failStep.task?.outcome)}`);
}

process.stdout.write(failStep.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$failed_task_id/recover" '{}' > "$RECOVERED_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$PRE_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$PRE_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$PRE_RESTART_TRANSCRIPTS_FILE"

recovered_approval_id="$(node - <<'EOF' "$FAIL_STEP_FILE" "$RECOVERED_FILE" "$PRE_RESTART_TASKS_FILE" "$PRE_RESTART_APPROVALS_FILE" "$PRE_RESTART_TRANSCRIPTS_FILE"
const fs = require("node:fs");
const failStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const tasks = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const approvals = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const transcripts = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));

if (!recovered.ok || recovered.task?.status !== "queued") {
  throw new Error(`recovered workspace command should be queued before restart: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.recovery?.recoveredFromTaskId !== failStep.task?.id) {
  throw new Error(`recovered task should link to failed source before restart: ${JSON.stringify(recovered.task?.recovery)}`);
}
if (recovered.recoveredFromTask?.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`source task should link to recovered task before restart: ${JSON.stringify(recovered.recoveredFromTask)}`);
}
if (recovered.task?.approval?.required !== true || recovered.task?.approval?.status !== "pending") {
  throw new Error(`recovered task should require approval before restart: ${JSON.stringify(recovered.task?.approval)}`);
}
if (tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.queued !== 1 || tasks.summary?.counts?.recoverable !== 1) {
  throw new Error(`task summary should expose failed source and queued recovery before restart: ${JSON.stringify(tasks.summary)}`);
}
if (!(approvals.items ?? []).some((approval) => approval.id === recovered.task.approval.requestId && approval.status === "pending")) {
  throw new Error(`fresh recovered approval should be pending before restart: ${JSON.stringify(approvals.items)}`);
}
if (transcripts.summary?.total !== 1 || transcripts.summary?.failed !== 1) {
  throw new Error(`only the failed source command should be in transcript ledger before restart: ${JSON.stringify(transcripts.summary)}`);
}

process.stdout.write(recovered.task.approval.requestId);
EOF
)"

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$CORE_URL/tasks?limit=8" > "$POST_RECOVERY_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$POST_RECOVERY_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$POST_RECOVERY_RESTART_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/tasks/latest-failed" > "$POST_RECOVERY_RESTART_LATEST_FAILED_FILE"

node - <<'EOF' "$FAIL_STEP_FILE" "$RECOVERED_FILE" "$PRE_RESTART_TASKS_FILE" "$POST_RECOVERY_RESTART_TASKS_FILE" "$PRE_RESTART_APPROVALS_FILE" "$POST_RECOVERY_RESTART_APPROVALS_FILE" "$PRE_RESTART_TRANSCRIPTS_FILE" "$POST_RECOVERY_RESTART_TRANSCRIPTS_FILE" "$POST_RECOVERY_RESTART_LATEST_FAILED_FILE"
const fs = require("node:fs");
const failStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const tasksBefore = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const tasksAfter = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const approvalsBefore = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const approvalsAfter = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
const transcriptsBefore = JSON.parse(fs.readFileSync(process.argv[8], "utf8"));
const transcriptsAfter = JSON.parse(fs.readFileSync(process.argv[9], "utf8"));
const latestFailed = JSON.parse(fs.readFileSync(process.argv[10], "utf8"));

const sourceAfter = (tasksAfter.items ?? []).find((task) => task.id === failStep.task?.id);
const recoveredAfter = (tasksAfter.items ?? []).find((task) => task.id === recovered.task?.id);
if (!sourceAfter || sourceAfter.status !== "failed" || sourceAfter.recoveredByTaskId !== recovered.task?.id || sourceAfter.restorable !== true) {
  throw new Error(`failed source should survive restart with recovery link: ${JSON.stringify(sourceAfter)}`);
}
if (!recoveredAfter || recoveredAfter.status !== "queued" || recoveredAfter.recovery?.recoveredFromTaskId !== sourceAfter.id) {
  throw new Error(`queued recovered task should survive restart: ${JSON.stringify(recoveredAfter)}`);
}
if (recoveredAfter.approval?.requestId !== recovered.task?.approval?.requestId || recoveredAfter.approval?.status !== "pending") {
  throw new Error(`recovered task pending approval should survive restart: ${JSON.stringify(recoveredAfter.approval)}`);
}
if (!(approvalsAfter.items ?? []).some((approval) => approval.id === recoveredAfter.approval.requestId && approval.status === "pending")) {
  throw new Error(`approval inbox should restore pending recovered approval: ${JSON.stringify(approvalsAfter.items)}`);
}
if (latestFailed.task?.id !== sourceAfter.id || latestFailed.task?.restorable !== true) {
  throw new Error(`latest failed should restore the recoverable source: ${JSON.stringify(latestFailed)}`);
}
if (JSON.stringify(tasksBefore.summary?.counts) !== JSON.stringify(tasksAfter.summary?.counts)) {
  throw new Error(`task counts changed across recovery restart: ${JSON.stringify({ before: tasksBefore.summary, after: tasksAfter.summary })}`);
}
if (JSON.stringify(approvalsBefore.summary) !== JSON.stringify(approvalsAfter.summary)) {
  throw new Error(`approval summary changed across recovery restart: ${JSON.stringify({ before: approvalsBefore.summary, after: approvalsAfter.summary })}`);
}
if (JSON.stringify(transcriptsBefore.summary) !== JSON.stringify(transcriptsAfter.summary)) {
  throw new Error(`transcript summary changed across recovery restart: ${JSON.stringify({ before: transcriptsBefore.summary, after: transcriptsAfter.summary })}`);
}
EOF

write_package_json 'node -e \"process.stdout.write('\''workspace-command-recovery-persist-ok'\'')\"'
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"
post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-openclaw-workspace-command-recovery-persistence-check","reason":"approve recovered fixture workspace command after restart"}' > "$RECOVERED_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$PRE_FINAL_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$PRE_FINAL_RESTART_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$PRE_FINAL_RESTART_HISTORY_FILE"

node - <<'EOF' "$BLOCKED_STEP_FILE" "$RECOVERED_APPROVED_FILE" "$RECOVERED_STEP_FILE" "$PRE_FINAL_RESTART_TASKS_FILE" "$PRE_FINAL_RESTART_TRANSCRIPTS_FILE" "$PRE_FINAL_RESTART_HISTORY_FILE"
const fs = require("node:fs");
const blockedStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recoveredApproved = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const recoveredStep = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const tasks = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const transcripts = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const history = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));

if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should still block recovered task after restart until approval: ${JSON.stringify(blockedStep)}`);
}
if (recoveredApproved.approval?.status !== "approved" || recoveredApproved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`approval after restart should allow audited execution: ${JSON.stringify(recoveredApproved)}`);
}
if (!recoveredStep.ok || recoveredStep.ran !== true || recoveredStep.task?.status !== "completed") {
  throw new Error(`recovered command should complete after restart approval: ${JSON.stringify(recoveredStep)}`);
}
if (!String(recoveredStep.execution?.commandTranscript?.[0]?.stdout ?? "").includes("workspace-command-recovery-persist-ok")) {
  throw new Error(`recovered command should capture success stdout: ${JSON.stringify(recoveredStep.execution?.commandTranscript?.[0])}`);
}
if (tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.completed !== 1 || tasks.summary?.counts?.active !== 0) {
  throw new Error(`task summary should show one failed source and one completed recovery: ${JSON.stringify(tasks.summary)}`);
}
if (transcripts.summary?.total !== 2 || transcripts.summary?.failed !== 1 || transcripts.summary?.executed !== 1) {
  throw new Error(`transcript ledger should show failed source and completed recovery: ${JSON.stringify(transcripts.summary)}`);
}
if (history.summary?.total !== 2 || history.summary?.invoked !== 2 || history.summary?.blocked !== 0) {
  throw new Error(`capability history should show both command invocations: ${JSON.stringify(history.summary)}`);
}
EOF

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$CORE_URL/tasks?limit=8" > "$POST_FINAL_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$POST_FINAL_RESTART_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$POST_FINAL_RESTART_HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$POST_FINAL_RESTART_APPROVALS_FILE"

node - <<'EOF' \
  "$FAIL_STEP_FILE" \
  "$RECOVERED_FILE" \
  "$PRE_FINAL_RESTART_TASKS_FILE" \
  "$POST_FINAL_RESTART_TASKS_FILE" \
  "$PRE_FINAL_RESTART_TRANSCRIPTS_FILE" \
  "$POST_FINAL_RESTART_TRANSCRIPTS_FILE" \
  "$PRE_FINAL_RESTART_HISTORY_FILE" \
  "$POST_FINAL_RESTART_HISTORY_FILE" \
  "$POST_FINAL_RESTART_APPROVALS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const failStep = readJson(2);
const recovered = readJson(3);
const tasksBefore = readJson(4);
const tasksAfter = readJson(5);
const transcriptsBefore = readJson(6);
const transcriptsAfter = readJson(7);
const historyBefore = readJson(8);
const historyAfter = readJson(9);
const approvalsAfter = readJson(10);

if (JSON.stringify(tasksBefore.summary?.counts) !== JSON.stringify(tasksAfter.summary?.counts)) {
  throw new Error(`completed recovery task counts changed across final restart: ${JSON.stringify({ before: tasksBefore.summary, after: tasksAfter.summary })}`);
}
if (JSON.stringify(transcriptsBefore.summary) !== JSON.stringify(transcriptsAfter.summary)) {
  throw new Error(`completed recovery transcript summary changed across final restart: ${JSON.stringify({ before: transcriptsBefore.summary, after: transcriptsAfter.summary })}`);
}
if (JSON.stringify(historyBefore.summary) !== JSON.stringify(historyAfter.summary)) {
  throw new Error(`completed recovery capability history changed across final restart: ${JSON.stringify({ before: historyBefore.summary, after: historyAfter.summary })}`);
}

const source = (tasksAfter.items ?? []).find((task) => task.id === failStep.task?.id);
const recoveredTask = (tasksAfter.items ?? []).find((task) => task.id === recovered.task?.id);
if (!source || source.status !== "failed" || source.recoveredByTaskId !== recovered.task?.id || source.restorable !== true) {
  throw new Error(`failed source should survive final restart with recovery link: ${JSON.stringify(source)}`);
}
if (!recoveredTask || recoveredTask.status !== "completed" || recoveredTask.recovery?.recoveredFromTaskId !== source.id) {
  throw new Error(`completed recovered task should survive final restart: ${JSON.stringify(recoveredTask)}`);
}
if ((approvalsAfter.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error(`final restart should not resurrect pending approvals: ${JSON.stringify(approvalsAfter.items)}`);
}

const failedRecord = (transcriptsAfter.items ?? []).find((item) => item.taskId === source.id);
const recoveredRecord = (transcriptsAfter.items ?? []).find((item) => item.taskId === recoveredTask.id);
if (failedRecord?.state !== "failed" || recoveredRecord?.state !== "executed") {
  throw new Error(`transcript ledger should restore failed and recovered command outcomes: ${JSON.stringify(transcriptsAfter.items)}`);
}

console.log(JSON.stringify({
  openclawWorkspaceCommandRecoveryPersistence: {
    stateFile: process.env.OPENCLAW_CORE_STATE_FILE ?? null,
    sourceTask: {
      id: source.id,
      status: source.status,
      restorable: source.restorable,
      recoveredByTaskId: source.recoveredByTaskId,
    },
    recoveredTask: {
      id: recoveredTask.id,
      status: recoveredTask.status,
      recoveredFromTaskId: recoveredTask.recovery?.recoveredFromTaskId ?? null,
    },
    summaries: {
      tasks: tasksAfter.summary?.counts ?? null,
      transcripts: transcriptsAfter.summary ?? null,
      capabilityHistory: historyAfter.summary ?? null,
      approvals: approvalsAfter.summary ?? null,
    },
  },
}, null, 2));
EOF
