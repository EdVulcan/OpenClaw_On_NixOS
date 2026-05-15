#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-source-command-persistence-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9900}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9901}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9902}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9903}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9904}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9905}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9906}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9907}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9970}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-source-command-persistence-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-source-command-persistence-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$TOOLS_DIR" "$DOCS_TOOLS_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

write_package_json() {
  local script_body="$1"
  cat > "$WORKSPACE_DIR/package.json" <<JSON
{
  "name": "openclaw",
  "private": true,
  "scripts": {
    "typecheck": "$script_body"
  }
}
JSON
}

write_package_json 'node -e \"process.stderr.write('\''source-command-persistence-fail'\''); process.exit(7)\"'
cat > "$WORKSPACE_DIR/package-lock.json" <<'JSON'
{"name":"openclaw","lockfileVersion":3,"requires":true,"packages":{"":{"name":"openclaw"}}}
JSON
cat > "$WORKSPACE_DIR/TOOLS.md" <<'MD'
# Tools
Source command persistence keeps approved command provenance across restarts.
MD
cat > "$DOCS_TOOLS_DIR/command-runner.md" <<'MD'
# Command Runner
Persist source-derived command approvals, recovery chains, and transcripts.
MD
cat > "$TOOLS_DIR/command-tool.ts" <<'TS'
export function sourceCommandPersistenceTool() {
  return { kind: "source-command-persistence" };
}
TS
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createSourceCommandPersistenceContract() {
  return { capabilityId: "source-command-persistence" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type SourceCommandPersistenceManifest = { pluginId: string };
TS

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
    "${PRE_RESTART_HISTORY_FILE:-}" \
    "${POST_RECOVERY_RESTART_TASKS_FILE:-}" \
    "${POST_RECOVERY_RESTART_APPROVALS_FILE:-}" \
    "${POST_RECOVERY_RESTART_TRANSCRIPTS_FILE:-}" \
    "${POST_RECOVERY_RESTART_HISTORY_FILE:-}" \
    "${POST_RECOVERY_RESTART_LATEST_FAILED_FILE:-}" \
    "${RECOVERED_APPROVED_FILE:-}" \
    "${RECOVERED_STEP_FILE:-}" \
    "${PRE_FINAL_RESTART_TASKS_FILE:-}" \
    "${PRE_FINAL_RESTART_APPROVALS_FILE:-}" \
    "${PRE_FINAL_RESTART_TRANSCRIPTS_FILE:-}" \
    "${PRE_FINAL_RESTART_HISTORY_FILE:-}" \
    "${POST_FINAL_RESTART_TASKS_FILE:-}" \
    "${POST_FINAL_RESTART_APPROVALS_FILE:-}" \
    "${POST_FINAL_RESTART_TRANSCRIPTS_FILE:-}" \
    "${POST_FINAL_RESTART_HISTORY_FILE:-}"
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
PRE_RESTART_HISTORY_FILE="$(mktemp)"
POST_RECOVERY_RESTART_TASKS_FILE="$(mktemp)"
POST_RECOVERY_RESTART_APPROVALS_FILE="$(mktemp)"
POST_RECOVERY_RESTART_TRANSCRIPTS_FILE="$(mktemp)"
POST_RECOVERY_RESTART_HISTORY_FILE="$(mktemp)"
POST_RECOVERY_RESTART_LATEST_FAILED_FILE="$(mktemp)"
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

post_json "$CORE_URL/plugins/native-adapter/source-command-proposals/tasks" '{"proposalId":"openclaw:typecheck","query":"command","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!taskResponse.ok || taskResponse.registry !== "openclaw-source-command-task-v0" || taskResponse.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`source command persistence fixture should create a provenance-bearing task: ${JSON.stringify(taskResponse)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block source command before first approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked source approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-openclaw-source-command-persistence-check","reason":"approve failing source-derived fixture command"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$FAIL_STEP_FILE"

failed_task_id="$(node - <<'EOF' "$APPROVED_FILE" "$FAIL_STEP_FILE"
const fs = require("node:fs");
const approved = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const failStep = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (approved.approval?.status !== "approved" || approved.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`approved source command should retain provenance: ${JSON.stringify(approved)}`);
}
if (!failStep.ok || failStep.ran !== true || failStep.task?.status !== "failed" || failStep.task?.restorable !== true || failStep.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`approved source command should fail as recoverable with provenance: ${JSON.stringify(failStep)}`);
}
if (!String(failStep.task?.outcome?.reason ?? "").includes("exit code 7")) {
  throw new Error(`failed source command should explain exit code 7: ${JSON.stringify(failStep.task?.outcome)}`);
}

process.stdout.write(failStep.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$failed_task_id/recover" '{}' > "$RECOVERED_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$PRE_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$PRE_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$PRE_RESTART_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$PRE_RESTART_HISTORY_FILE"

recovered_approval_id="$(node - <<'EOF' "$FAIL_STEP_FILE" "$RECOVERED_FILE" "$PRE_RESTART_TASKS_FILE" "$PRE_RESTART_APPROVALS_FILE" "$PRE_RESTART_TRANSCRIPTS_FILE" "$PRE_RESTART_HISTORY_FILE"
const fs = require("node:fs");
const failStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const tasks = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const approvals = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const transcripts = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const history = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));

if (!recovered.ok || recovered.task?.status !== "queued" || recovered.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`recovered source command should be queued with provenance before restart: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.recovery?.recoveredFromTaskId !== failStep.task?.id) {
  throw new Error(`recovered source task should link to failed source before restart: ${JSON.stringify(recovered.task?.recovery)}`);
}
if (recovered.recoveredFromTask?.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`failed source task should link to recovered task before restart: ${JSON.stringify(recovered.recoveredFromTask)}`);
}
if (recovered.task?.approval?.required !== true || recovered.task?.approval?.status !== "pending") {
  throw new Error(`recovered source task should require fresh approval before restart: ${JSON.stringify(recovered.task?.approval)}`);
}
if (tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.queued !== 1 || tasks.summary?.counts?.recoverable !== 1) {
  throw new Error(`task summary should expose failed source and queued recovery before restart: ${JSON.stringify(tasks.summary)}`);
}
if (!(tasks.items ?? []).every((task) => task.sourceCommand?.registry === "openclaw-source-command-task-v0")) {
  throw new Error(`all source command tasks should retain provenance before restart: ${JSON.stringify(tasks.items)}`);
}
if (!(approvals.items ?? []).some((approval) => approval.id === recovered.task.approval.requestId && approval.status === "pending")) {
  throw new Error(`fresh recovered source approval should be pending before restart: ${JSON.stringify(approvals.items)}`);
}
if (transcripts.summary?.total !== 1 || transcripts.summary?.failed !== 1 || transcripts.items?.[0]?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`failed source command should be in transcript ledger before restart: ${JSON.stringify(transcripts)}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`capability history should contain first source command invocation before restart: ${JSON.stringify(history.summary)}`);
}

process.stdout.write(recovered.task.approval.requestId);
EOF
)"

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$CORE_URL/tasks?limit=8" > "$POST_RECOVERY_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$POST_RECOVERY_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$POST_RECOVERY_RESTART_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$POST_RECOVERY_RESTART_HISTORY_FILE"
curl --silent --fail "$CORE_URL/tasks/latest-failed" > "$POST_RECOVERY_RESTART_LATEST_FAILED_FILE"

node - <<'EOF' "$FAIL_STEP_FILE" "$RECOVERED_FILE" "$PRE_RESTART_TASKS_FILE" "$POST_RECOVERY_RESTART_TASKS_FILE" "$PRE_RESTART_APPROVALS_FILE" "$POST_RECOVERY_RESTART_APPROVALS_FILE" "$PRE_RESTART_TRANSCRIPTS_FILE" "$POST_RECOVERY_RESTART_TRANSCRIPTS_FILE" "$PRE_RESTART_HISTORY_FILE" "$POST_RECOVERY_RESTART_HISTORY_FILE" "$POST_RECOVERY_RESTART_LATEST_FAILED_FILE"
const fs = require("node:fs");
const failStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recovered = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const tasksBefore = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const tasksAfter = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const approvalsBefore = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const approvalsAfter = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
const transcriptsBefore = JSON.parse(fs.readFileSync(process.argv[8], "utf8"));
const transcriptsAfter = JSON.parse(fs.readFileSync(process.argv[9], "utf8"));
const historyBefore = JSON.parse(fs.readFileSync(process.argv[10], "utf8"));
const historyAfter = JSON.parse(fs.readFileSync(process.argv[11], "utf8"));
const latestFailed = JSON.parse(fs.readFileSync(process.argv[12], "utf8"));

const sourceAfter = (tasksAfter.items ?? []).find((task) => task.id === failStep.task?.id);
const recoveredAfter = (tasksAfter.items ?? []).find((task) => task.id === recovered.task?.id);
if (!sourceAfter || sourceAfter.status !== "failed" || sourceAfter.recoveredByTaskId !== recovered.task?.id || sourceAfter.restorable !== true || sourceAfter.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`failed source command should survive restart with recovery link and provenance: ${JSON.stringify(sourceAfter)}`);
}
if (!recoveredAfter || recoveredAfter.status !== "queued" || recoveredAfter.recovery?.recoveredFromTaskId !== sourceAfter.id || recoveredAfter.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`queued recovered source command should survive restart with provenance: ${JSON.stringify(recoveredAfter)}`);
}
if (recoveredAfter.approval?.requestId !== recovered.task?.approval?.requestId || recoveredAfter.approval?.status !== "pending") {
  throw new Error(`recovered source pending approval should survive restart: ${JSON.stringify(recoveredAfter.approval)}`);
}
if (!(approvalsAfter.items ?? []).some((approval) => approval.id === recoveredAfter.approval.requestId && approval.status === "pending")) {
  throw new Error(`approval inbox should restore pending recovered source approval: ${JSON.stringify(approvalsAfter.items)}`);
}
if (latestFailed.task?.id !== sourceAfter.id || latestFailed.task?.restorable !== true || latestFailed.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`latest failed should restore recoverable source command: ${JSON.stringify(latestFailed)}`);
}
if (JSON.stringify(tasksBefore.summary?.counts) !== JSON.stringify(tasksAfter.summary?.counts)) {
  throw new Error(`task counts changed across source recovery restart: ${JSON.stringify({ before: tasksBefore.summary, after: tasksAfter.summary })}`);
}
if (JSON.stringify(approvalsBefore.summary) !== JSON.stringify(approvalsAfter.summary)) {
  throw new Error(`approval summary changed across source recovery restart: ${JSON.stringify({ before: approvalsBefore.summary, after: approvalsAfter.summary })}`);
}
if (JSON.stringify(transcriptsBefore.summary) !== JSON.stringify(transcriptsAfter.summary) || !(transcriptsAfter.items ?? []).every((item) => item.sourceCommand?.registry === "openclaw-source-command-task-v0")) {
  throw new Error(`transcript ledger changed or lost provenance across source recovery restart: ${JSON.stringify({ before: transcriptsBefore, after: transcriptsAfter })}`);
}
if (JSON.stringify(historyBefore.summary) !== JSON.stringify(historyAfter.summary)) {
  throw new Error(`capability history changed across source recovery restart: ${JSON.stringify({ before: historyBefore.summary, after: historyAfter.summary })}`);
}
EOF

write_package_json 'node -e \"process.stdout.write('\''source-command-persistence-ok'\'')\"'
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"
post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-openclaw-source-command-persistence-check","reason":"approve recovered source-derived fixture command after restart"}' > "$RECOVERED_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$PRE_FINAL_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$PRE_FINAL_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$PRE_FINAL_RESTART_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$PRE_FINAL_RESTART_HISTORY_FILE"

node - <<'EOF' "$BLOCKED_STEP_FILE" "$RECOVERED_APPROVED_FILE" "$RECOVERED_STEP_FILE" "$PRE_FINAL_RESTART_TASKS_FILE" "$PRE_FINAL_RESTART_APPROVALS_FILE" "$PRE_FINAL_RESTART_TRANSCRIPTS_FILE" "$PRE_FINAL_RESTART_HISTORY_FILE"
const fs = require("node:fs");
const blockedStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recoveredApproved = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const recoveredStep = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const tasks = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const approvals = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const transcripts = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
const history = JSON.parse(fs.readFileSync(process.argv[8], "utf8"));

if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should still block recovered source task after restart until approval: ${JSON.stringify(blockedStep)}`);
}
if (recoveredApproved.approval?.status !== "approved" || recoveredApproved.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0" || recoveredApproved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`source approval after restart should allow audited execution with provenance: ${JSON.stringify(recoveredApproved)}`);
}
if (!recoveredStep.ok || recoveredStep.ran !== true || recoveredStep.task?.status !== "completed" || recoveredStep.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`recovered source command should complete after restart approval: ${JSON.stringify(recoveredStep)}`);
}
if (!String(recoveredStep.execution?.commandTranscript?.[0]?.stdout ?? "").includes("source-command-persistence-ok")) {
  throw new Error(`recovered source command should capture success stdout: ${JSON.stringify(recoveredStep.execution?.commandTranscript?.[0])}`);
}
if (tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.completed !== 1 || tasks.summary?.counts?.active !== 0) {
  throw new Error(`task summary should show one failed source and one completed recovery: ${JSON.stringify(tasks.summary)}`);
}
if (approvals.summary?.counts?.approved !== 2 || approvals.summary?.counts?.pending !== 0) {
  throw new Error(`approval summary should show both source gates approved and no pending approvals: ${JSON.stringify(approvals.summary)}`);
}
if (transcripts.summary?.total !== 2 || transcripts.summary?.failed !== 1 || transcripts.summary?.executed !== 1 || !(transcripts.items ?? []).every((item) => item.sourceCommand?.registry === "openclaw-source-command-task-v0")) {
  throw new Error(`transcript ledger should show failed source and completed recovery with provenance: ${JSON.stringify(transcripts)}`);
}
if (history.summary?.total !== 2 || history.summary?.invoked !== 2 || history.summary?.blocked !== 0) {
  throw new Error(`capability history should show both source command invocations: ${JSON.stringify(history.summary)}`);
}
EOF

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$CORE_URL/tasks?limit=8" > "$POST_FINAL_RESTART_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$POST_FINAL_RESTART_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$POST_FINAL_RESTART_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$POST_FINAL_RESTART_HISTORY_FILE"

node - <<'EOF' \
  "$FAIL_STEP_FILE" \
  "$RECOVERED_FILE" \
  "$PRE_FINAL_RESTART_TASKS_FILE" \
  "$POST_FINAL_RESTART_TASKS_FILE" \
  "$PRE_FINAL_RESTART_APPROVALS_FILE" \
  "$POST_FINAL_RESTART_APPROVALS_FILE" \
  "$PRE_FINAL_RESTART_TRANSCRIPTS_FILE" \
  "$POST_FINAL_RESTART_TRANSCRIPTS_FILE" \
  "$PRE_FINAL_RESTART_HISTORY_FILE" \
  "$POST_FINAL_RESTART_HISTORY_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const failStep = readJson(2);
const recovered = readJson(3);
const tasksBefore = readJson(4);
const tasksAfter = readJson(5);
const approvalsBefore = readJson(6);
const approvalsAfter = readJson(7);
const transcriptsBefore = readJson(8);
const transcriptsAfter = readJson(9);
const historyBefore = readJson(10);
const historyAfter = readJson(11);

if (JSON.stringify(tasksBefore.summary?.counts) !== JSON.stringify(tasksAfter.summary?.counts)) {
  throw new Error(`completed source recovery task counts changed across final restart: ${JSON.stringify({ before: tasksBefore.summary, after: tasksAfter.summary })}`);
}
if (JSON.stringify(approvalsBefore.summary) !== JSON.stringify(approvalsAfter.summary)) {
  throw new Error(`completed source recovery approval summary changed across final restart: ${JSON.stringify({ before: approvalsBefore.summary, after: approvalsAfter.summary })}`);
}
if (JSON.stringify(transcriptsBefore.summary) !== JSON.stringify(transcriptsAfter.summary)) {
  throw new Error(`completed source recovery transcript summary changed across final restart: ${JSON.stringify({ before: transcriptsBefore.summary, after: transcriptsAfter.summary })}`);
}
if (JSON.stringify(historyBefore.summary) !== JSON.stringify(historyAfter.summary)) {
  throw new Error(`completed source recovery capability history changed across final restart: ${JSON.stringify({ before: historyBefore.summary, after: historyAfter.summary })}`);
}

const source = (tasksAfter.items ?? []).find((task) => task.id === failStep.task?.id);
const recoveredTask = (tasksAfter.items ?? []).find((task) => task.id === recovered.task?.id);
if (!source || source.status !== "failed" || source.recoveredByTaskId !== recovered.task?.id || source.restorable !== true || source.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`failed source command should survive final restart with recovery link and provenance: ${JSON.stringify(source)}`);
}
if (!recoveredTask || recoveredTask.status !== "completed" || recoveredTask.recovery?.recoveredFromTaskId !== source.id || recoveredTask.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`completed recovered source command should survive final restart with provenance: ${JSON.stringify(recoveredTask)}`);
}
if ((approvalsAfter.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error(`final restart should not resurrect pending source command approvals: ${JSON.stringify(approvalsAfter.items)}`);
}

const failedRecord = (transcriptsAfter.items ?? []).find((item) => item.taskId === source.id);
const recoveredRecord = (transcriptsAfter.items ?? []).find((item) => item.taskId === recoveredTask.id);
if (failedRecord?.state !== "failed" || failedRecord?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`failed source transcript should survive final restart with provenance: ${JSON.stringify(failedRecord)}`);
}
if (recoveredRecord?.state !== "executed" || recoveredRecord?.sourceCommand?.registry !== "openclaw-source-command-task-v0" || !String(recoveredRecord.stdout ?? "").includes("source-command-persistence-ok")) {
  throw new Error(`recovered source transcript should survive final restart with provenance and stdout: ${JSON.stringify(recoveredRecord)}`);
}

console.log(JSON.stringify({
  openclawSourceCommandPersistence: {
    stateFile: process.env.OPENCLAW_CORE_STATE_FILE ?? null,
    sourceTask: {
      id: source.id,
      status: source.status,
      restorable: source.restorable,
      recoveredByTaskId: source.recoveredByTaskId,
      sourceRegistry: source.sourceCommand?.registry ?? null,
    },
    recoveredTask: {
      id: recoveredTask.id,
      status: recoveredTask.status,
      recoveredFromTaskId: recoveredTask.recovery?.recoveredFromTaskId ?? null,
      sourceRegistry: recoveredTask.sourceCommand?.registry ?? null,
    },
    summaries: {
      tasks: tasksAfter.summary?.counts ?? null,
      approvals: approvalsAfter.summary ?? null,
      transcripts: transcriptsAfter.summary ?? null,
      capabilityHistory: historyAfter.summary ?? null,
    },
  },
}, null, 2));
EOF
