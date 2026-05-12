#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-workspace-command-denial-recovery-persistence-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8940}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8941}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8942}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8943}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8944}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8945}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8946}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8947}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9010}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-workspace-command-denial-recovery-persistence-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-workspace-command-denial-recovery-persistence-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-command-denial-recovery-persistence-fixture",
  "private": true,
  "scripts": {
    "typecheck": "printf observer-workspace-denial-recovery-persist-ok"
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
  "version": "0.0.0-observer-command-denial-recovery-persistence-fixture",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw",
      "version": "0.0.0-observer-command-denial-recovery-persistence-fixture"
    }
  }
}
JSON

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${POST_RESTART_HTML_FILE:-}" \
    "${POST_RESTART_CLIENT_FILE:-}" \
    "${TASK_FILE:-}" \
    "${BLOCKED_STEP_FILE:-}" \
    "${DENIED_FILE:-}" \
    "${RECOVERED_FILE:-}" \
    "${PRE_RESTART_TASKS_FILE:-}" \
    "${PRE_RESTART_APPROVALS_FILE:-}" \
    "${PRE_RESTART_TRANSCRIPTS_FILE:-}" \
    "${POST_RESTART_TASKS_FILE:-}" \
    "${POST_RESTART_APPROVALS_FILE:-}" \
    "${POST_RESTART_TRANSCRIPTS_FILE:-}" \
    "${POST_RESTART_DETAIL_FILE:-}" \
    "${RECOVERED_BLOCKED_STEP_FILE:-}" \
    "${RECOVERED_APPROVED_FILE:-}" \
    "${RECOVERED_STEP_FILE:-}" \
    "${PRE_FINAL_RESTART_TASKS_FILE:-}" \
    "${PRE_FINAL_RESTART_APPROVALS_FILE:-}" \
    "${PRE_FINAL_RESTART_TRANSCRIPTS_FILE:-}" \
    "${PRE_FINAL_RESTART_HISTORY_FILE:-}" \
    "${POST_FINAL_RESTART_TASKS_FILE:-}" \
    "${POST_FINAL_RESTART_APPROVALS_FILE:-}" \
    "${POST_FINAL_RESTART_TRANSCRIPTS_FILE:-}" \
    "${POST_FINAL_RESTART_HISTORY_FILE:-}" \
    "${POST_FINAL_RESTART_DETAIL_FILE:-}"
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
POST_RESTART_HTML_FILE="$(mktemp)"
POST_RESTART_CLIENT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_STEP_FILE="$(mktemp)"
DENIED_FILE="$(mktemp)"
RECOVERED_FILE="$(mktemp)"
PRE_RESTART_TASKS_FILE="$(mktemp)"
PRE_RESTART_APPROVALS_FILE="$(mktemp)"
PRE_RESTART_TRANSCRIPTS_FILE="$(mktemp)"
POST_RESTART_TASKS_FILE="$(mktemp)"
POST_RESTART_APPROVALS_FILE="$(mktemp)"
POST_RESTART_TRANSCRIPTS_FILE="$(mktemp)"
POST_RESTART_DETAIL_FILE="$(mktemp)"
RECOVERED_BLOCKED_STEP_FILE="$(mktemp)"
RECOVERED_APPROVED_FILE="$(mktemp)"
RECOVERED_STEP_FILE="$(mktemp)"
PRE_FINAL_RESTART_TASKS_FILE="$(mktemp)"
PRE_FINAL_RESTART_APPROVALS_FILE="$(mktemp)"
PRE_FINAL_RESTART_TRANSCRIPTS_FILE="$(mktemp)"
PRE_FINAL_RESTART_HISTORY_FILE="$(mktemp)"
POST_FINAL_RESTART_TASKS_FILE="$(mktemp)"
POST_FINAL_RESTART_APPROVALS_FILE="$(mktemp)"
POST_FINAL_RESTART_TRANSCRIPTS_FILE="$(mktemp)"
POST_FINAL_RESTART_HISTORY_FILE="$(mktemp)"
POST_FINAL_RESTART_DETAIL_FILE="$(mktemp)"

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

for (const token of ["deny-latest-button", "recover-latest-failed-task-button", "recover-selected-task-button", "approval-json", "task-history-json"]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing denial recovery persistence token ${token}`);
  }
}
for (const token of ["resolveLatestApproval(\"deny\")", "recoverLatestFailedTask", "recoverSelectedTask", "task.recovered", "approval.denied", "refreshApprovalState"]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing denial recovery persistence token ${token}`);
  }
}
if (!taskResponse.ok || taskResponse.mode !== "approval-gated" || taskResponse.task?.status !== "queued") {
  throw new Error(`observer denial recovery persistence fixture should create approval-gated task: ${JSON.stringify(taskResponse)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before denial: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/deny" '{"deniedBy":"dev-observer-workspace-command-denial-recovery-persistence-check","reason":"deny observer persistence fixture before recovery"}' > "$DENIED_FILE"

denied_task_id="$(node - <<'EOF' "$DENIED_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!denied.ok || denied.approval?.status !== "denied" || denied.task?.status !== "failed") {
  throw new Error(`denial should fail the workspace command task: ${JSON.stringify(denied)}`);
}
if (denied.task?.restorable !== true || denied.task?.approval?.status !== "denied" || denied.task?.approval?.required !== false) {
  throw new Error(`denied task should be recoverable with resolved approval: ${JSON.stringify(denied.task)}`);
}

process.stdout.write(denied.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$denied_task_id/recover" '{}' > "$RECOVERED_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$PRE_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$PRE_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$PRE_RESTART_TRANSCRIPTS_FILE"

recovered_task_id="$(node - <<'EOF' "$DENIED_FILE" "$RECOVERED_FILE" "$PRE_RESTART_TASKS_FILE" "$PRE_RESTART_APPROVALS_FILE" "$PRE_RESTART_TRANSCRIPTS_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const tasks = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const approvals = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const transcripts = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));

if (!recovered.ok || recovered.task?.status !== "queued") {
  throw new Error(`recovering denied command should create queued task: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.recovery?.recoveredFromTaskId !== denied.task?.id || recovered.recoveredFromTask?.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`denial recovery should link source and recovered task: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.approval?.status !== "pending" || recovered.task?.approval?.required !== true || recovered.task?.approval?.requestId === denied.approval?.id) {
  throw new Error(`recovered denied task should require a fresh approval: ${JSON.stringify(recovered.task?.approval)}`);
}
if (tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.queued !== 1 || tasks.summary?.counts?.recoverable !== 1) {
  throw new Error(`task summary should show denied source and queued recovery before restart: ${JSON.stringify(tasks.summary)}`);
}
if (approvals.summary?.counts?.denied !== 1 || approvals.summary?.counts?.pending !== 1) {
  throw new Error(`approval summary should show denied source approval plus fresh pending recovery approval: ${JSON.stringify(approvals.summary)}`);
}
if (transcripts.summary?.total !== 0 || transcripts.summary?.executed !== 0 || transcripts.summary?.failed !== 0) {
  throw new Error(`denied command must not produce command transcripts before recovered approval: ${JSON.stringify(transcripts.summary)}`);
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

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$OBSERVER_URL/" > "$POST_RESTART_HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$POST_RESTART_CLIENT_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$POST_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$POST_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$POST_RESTART_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/tasks/$recovered_task_id" > "$POST_RESTART_DETAIL_FILE"

node - <<'EOF' \
  "$POST_RESTART_HTML_FILE" \
  "$POST_RESTART_CLIENT_FILE" \
  "$DENIED_FILE" \
  "$RECOVERED_FILE" \
  "$PRE_RESTART_TASKS_FILE" \
  "$POST_RESTART_TASKS_FILE" \
  "$PRE_RESTART_APPROVALS_FILE" \
  "$POST_RESTART_APPROVALS_FILE" \
  "$PRE_RESTART_TRANSCRIPTS_FILE" \
  "$POST_RESTART_TRANSCRIPTS_FILE" \
  "$POST_RESTART_DETAIL_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const denied = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const tasksBefore = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const tasksAfter = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
const approvalsBefore = JSON.parse(fs.readFileSync(process.argv[8], "utf8"));
const approvalsAfter = JSON.parse(fs.readFileSync(process.argv[9], "utf8"));
const transcriptsBefore = JSON.parse(fs.readFileSync(process.argv[10], "utf8"));
const transcriptsAfter = JSON.parse(fs.readFileSync(process.argv[11], "utf8"));
const recoveredDetail = JSON.parse(fs.readFileSync(process.argv[12], "utf8"));

for (const token of ["recover-selected-task-button", "approval-json", "task-history-json"]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML should still expose denial recovery state after restart: ${token}`);
  }
}
for (const token of ["recoverSelectedTask", "approval.denied", "task.recovered", "refreshApprovalState"]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client should still expose denial recovery wiring after restart: ${token}`);
  }
}

const sourceAfter = (tasksAfter.items ?? []).find((task) => task.id === denied.task?.id);
const recoveredAfter = (tasksAfter.items ?? []).find((task) => task.id === recovered.task?.id);
if (!sourceAfter || sourceAfter.status !== "failed" || sourceAfter.recoveredByTaskId !== recovered.task?.id || sourceAfter.approval?.status !== "denied") {
  throw new Error(`denied source should survive restart with recovery link: ${JSON.stringify(sourceAfter)}`);
}
if (!recoveredAfter || recoveredAfter.status !== "queued" || recoveredAfter.recovery?.recoveredFromTaskId !== sourceAfter.id || recoveredAfter.approval?.status !== "pending") {
  throw new Error(`queued recovered denied task should survive restart with pending approval: ${JSON.stringify(recoveredAfter)}`);
}
if (recoveredDetail.task?.id !== recoveredAfter.id || recoveredDetail.task?.recovery?.recoveredFromTaskId !== sourceAfter.id) {
  throw new Error(`Observer task detail should restore recovered denied task metadata: ${JSON.stringify(recoveredDetail)}`);
}
if (JSON.stringify(tasksBefore.summary?.counts) !== JSON.stringify(tasksAfter.summary?.counts)) {
  throw new Error(`task counts changed across denial recovery restart: ${JSON.stringify({ before: tasksBefore.summary, after: tasksAfter.summary })}`);
}
if (JSON.stringify(approvalsBefore.summary) !== JSON.stringify(approvalsAfter.summary)) {
  throw new Error(`approval summary changed across denial recovery restart: ${JSON.stringify({ before: approvalsBefore.summary, after: approvalsAfter.summary })}`);
}
if (JSON.stringify(transcriptsBefore.summary) !== JSON.stringify(transcriptsAfter.summary)) {
  throw new Error(`transcript summary changed across denial recovery restart: ${JSON.stringify({ before: transcriptsBefore.summary, after: transcriptsAfter.summary })}`);
}
EOF

post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_BLOCKED_STEP_FILE"
post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-observer-workspace-command-denial-recovery-persistence-check","reason":"approve recovered denied task after restart"}' > "$RECOVERED_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$PRE_FINAL_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$PRE_FINAL_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$PRE_FINAL_RESTART_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$PRE_FINAL_RESTART_HISTORY_FILE"

node - <<'EOF' "$RECOVERED_BLOCKED_STEP_FILE" "$RECOVERED_APPROVED_FILE" "$RECOVERED_STEP_FILE" "$PRE_FINAL_RESTART_TASKS_FILE" "$PRE_FINAL_RESTART_APPROVALS_FILE" "$PRE_FINAL_RESTART_TRANSCRIPTS_FILE" "$PRE_FINAL_RESTART_HISTORY_FILE"
const fs = require("node:fs");
const blockedStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const approved = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const recoveredStep = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const tasks = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const approvals = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const transcripts = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
const history = JSON.parse(fs.readFileSync(process.argv[8], "utf8"));

if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`recovered denied task should still block after restart until approval: ${JSON.stringify(blockedStep)}`);
}
if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`fresh recovered approval after restart should allow audited execution: ${JSON.stringify(approved)}`);
}
if (!recoveredStep.ok || recoveredStep.ran !== true || recoveredStep.task?.status !== "completed") {
  throw new Error(`recovered denied task should complete after post-restart approval: ${JSON.stringify(recoveredStep)}`);
}
if (!String(recoveredStep.execution?.commandTranscript?.[0]?.stdout ?? "").includes("observer-workspace-denial-recovery-persist-ok")) {
  throw new Error(`recovered denied command should capture stdout: ${JSON.stringify(recoveredStep.execution?.commandTranscript?.[0])}`);
}
if (tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.completed !== 1 || tasks.summary?.counts?.active !== 0) {
  throw new Error(`task summary should show denied source and completed recovery before final restart: ${JSON.stringify(tasks.summary)}`);
}
if (approvals.summary?.counts?.denied !== 1 || approvals.summary?.counts?.approved !== 1 || approvals.summary?.counts?.pending !== 0) {
  throw new Error(`approval summary should resolve denial recovery before final restart: ${JSON.stringify(approvals.summary)}`);
}
if (transcripts.summary?.total !== 1 || transcripts.summary?.executed !== 1 || transcripts.summary?.failed !== 0) {
  throw new Error(`command ledger should show only the approved recovered execution: ${JSON.stringify(transcripts.summary)}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`capability history should show only the approved recovered command invocation: ${JSON.stringify(history.summary)}`);
}
EOF

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$CORE_URL/tasks?limit=8" > "$POST_FINAL_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$POST_FINAL_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$POST_FINAL_RESTART_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$POST_FINAL_RESTART_HISTORY_FILE"
curl --silent --fail "$CORE_URL/tasks/$recovered_task_id" > "$POST_FINAL_RESTART_DETAIL_FILE"

node - <<'EOF' \
  "$DENIED_FILE" \
  "$RECOVERED_FILE" \
  "$PRE_FINAL_RESTART_TASKS_FILE" \
  "$POST_FINAL_RESTART_TASKS_FILE" \
  "$PRE_FINAL_RESTART_APPROVALS_FILE" \
  "$POST_FINAL_RESTART_APPROVALS_FILE" \
  "$PRE_FINAL_RESTART_TRANSCRIPTS_FILE" \
  "$POST_FINAL_RESTART_TRANSCRIPTS_FILE" \
  "$PRE_FINAL_RESTART_HISTORY_FILE" \
  "$POST_FINAL_RESTART_HISTORY_FILE" \
  "$POST_FINAL_RESTART_DETAIL_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const denied = readJson(2);
const recovered = readJson(3);
const tasksBefore = readJson(4);
const tasksAfter = readJson(5);
const approvalsBefore = readJson(6);
const approvalsAfter = readJson(7);
const transcriptsBefore = readJson(8);
const transcriptsAfter = readJson(9);
const historyBefore = readJson(10);
const historyAfter = readJson(11);
const recoveredDetail = readJson(12);

if (JSON.stringify(tasksBefore.summary?.counts) !== JSON.stringify(tasksAfter.summary?.counts)) {
  throw new Error(`completed denial recovery task counts changed across final restart: ${JSON.stringify({ before: tasksBefore.summary, after: tasksAfter.summary })}`);
}
if (JSON.stringify(approvalsBefore.summary) !== JSON.stringify(approvalsAfter.summary)) {
  throw new Error(`completed denial recovery approval summary changed across final restart: ${JSON.stringify({ before: approvalsBefore.summary, after: approvalsAfter.summary })}`);
}
if (JSON.stringify(transcriptsBefore.summary) !== JSON.stringify(transcriptsAfter.summary)) {
  throw new Error(`completed denial recovery transcript summary changed across final restart: ${JSON.stringify({ before: transcriptsBefore.summary, after: transcriptsAfter.summary })}`);
}
if (JSON.stringify(historyBefore.summary) !== JSON.stringify(historyAfter.summary)) {
  throw new Error(`completed denial recovery capability history changed across final restart: ${JSON.stringify({ before: historyBefore.summary, after: historyAfter.summary })}`);
}

const source = (tasksAfter.items ?? []).find((task) => task.id === denied.task?.id);
const recoveredTask = (tasksAfter.items ?? []).find((task) => task.id === recovered.task?.id);
if (!source || source.status !== "failed" || source.recoveredByTaskId !== recovered.task?.id || source.approval?.status !== "denied") {
  throw new Error(`denied source should survive final restart with original denial and recovery link: ${JSON.stringify(source)}`);
}
if (!recoveredTask || recoveredTask.status !== "completed" || recoveredTask.recovery?.recoveredFromTaskId !== source.id || recoveredTask.approval?.status !== "approved") {
  throw new Error(`completed recovered denied task should survive final restart: ${JSON.stringify(recoveredTask)}`);
}
if (recoveredDetail.task?.id !== recoveredTask.id || recoveredDetail.task?.recovery?.recoveredFromTaskId !== source.id) {
  throw new Error(`Observer detail endpoint should restore completed recovered denied task: ${JSON.stringify(recoveredDetail)}`);
}
if ((approvalsAfter.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error(`final restart should not resurrect pending approvals: ${JSON.stringify(approvalsAfter.items)}`);
}

console.log(JSON.stringify({
  observerWorkspaceCommandDenialRecoveryPersistence: {
    stateFile: process.env.OPENCLAW_CORE_STATE_FILE ?? null,
    sourceTask: {
      id: source.id,
      status: source.status,
      approval: source.approval?.status ?? null,
      recoveredByTaskId: source.recoveredByTaskId,
    },
    recoveredTask: {
      id: recoveredTask.id,
      status: recoveredTask.status,
      approval: recoveredTask.approval?.status ?? null,
      recoveredFromTaskId: recoveredTask.recovery?.recoveredFromTaskId ?? null,
    },
    observerControls: [
      "deny-latest-button",
      "recover-selected-task-button",
      "task.recovered",
      "refreshApprovalState",
    ],
    summaries: {
      tasks: tasksAfter.summary?.counts ?? null,
      approvals: approvalsAfter.summary ?? null,
      transcripts: transcriptsAfter.summary ?? null,
      capabilityHistory: historyAfter.summary ?? null,
    },
  },
}, null, 2));
EOF
