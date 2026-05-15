#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-source-command-denial-recovery-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
PROMPT_SECRET="SOURCE_COMMAND_DENIAL_RECOVERY_PROMPT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9860}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9861}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9862}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9863}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9864}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9865}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9866}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9867}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9930}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-source-command-denial-recovery-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-source-command-denial-recovery-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$TOOLS_DIR" "$DOCS_TOOLS_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "private": true,
  "scripts": {
    "typecheck": "printf source-command-denial-recovery-ok"
  }
}
JSON
cat > "$WORKSPACE_DIR/package-lock.json" <<'JSON'
{
  "name": "openclaw",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw"
    }
  }
}
JSON
cat > "$WORKSPACE_DIR/TOOLS.md" <<EOF
# Tools
Denied source command tasks require fresh approval before recovery execution.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/command-runner.md" <<'MD'
# Command Runner
Recover source-derived command tasks only through a fresh approval gate.
MD
cat > "$TOOLS_DIR/command-tool.ts" <<'TS'
export function commandDenialRecoveryTool() {
  const secret = "SOURCE_COMMAND_DENIAL_RECOVERY_TOOL_SECRET_DO_NOT_LEAK";
  return { kind: "command-denial-recovery", secret };
}
TS
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createSourceCommandDenialRecoveryContract() {
  return { capabilityId: "source-command-denial-recovery" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type SourceCommandDenialRecoveryManifest = { pluginId: string };
TS

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

post_json "$CORE_URL/plugins/native-adapter/source-command-proposals/tasks" '{"proposalId":"openclaw:typecheck","query":"command","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!taskResponse.ok || taskResponse.registry !== "openclaw-source-command-task-v0" || taskResponse.task?.status !== "queued") {
  throw new Error(`source command task should be queued behind approval before denial: ${JSON.stringify(taskResponse)}`);
}
if (taskResponse.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`source command task should persist source provenance before denial: ${JSON.stringify(taskResponse.task?.sourceCommand)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before denied source command approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/deny" '{"deniedBy":"dev-openclaw-source-command-denial-recovery-check","reason":"deny source-derived fixture command before recovery"}' > "$DENIED_FILE"

denied_task_id="$(node - <<'EOF' "$DENIED_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!denied.ok || denied.approval?.status !== "denied" || denied.task?.status !== "failed") {
  throw new Error(`denying source command approval should fail the task: ${JSON.stringify(denied)}`);
}
if (denied.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`denied source command should retain provenance: ${JSON.stringify(denied.task?.sourceCommand)}`);
}
if (denied.task?.outcome?.reason !== "Approval denied by user.") {
  throw new Error(`denied source command should record user-denial reason: ${JSON.stringify(denied.task?.outcome)}`);
}
if (denied.task?.restorable !== true) {
  throw new Error(`denied source command should remain recoverable: ${JSON.stringify(denied.task)}`);
}
if (denied.task?.policy?.request?.approved === true || denied.task?.policy?.decision?.approved === true) {
  throw new Error(`denied source command must not become approved: ${JSON.stringify(denied.task?.policy)}`);
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
  throw new Error(`recovering a denied source command should create a queued task: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`recovered source command should preserve source provenance: ${JSON.stringify(recovered.task?.sourceCommand)}`);
}
if (recovered.task?.recovery?.recoveredFromTaskId !== denied.task?.id) {
  throw new Error(`recovered source command should link to denied source: ${JSON.stringify(recovered.task?.recovery)}`);
}
if (recovered.recoveredFromTask?.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`denied source command should link to recovered task: ${JSON.stringify(recovered.recoveredFromTask)}`);
}
if (recovered.task?.policy?.request?.approved === true || recovered.task?.policy?.decision?.approved === true) {
  throw new Error(`recovered denied source command must not inherit approval: ${JSON.stringify(recovered.task.policy)}`);
}
if (recovered.task?.policy?.decision?.decision !== "require_approval") {
  throw new Error(`recovered denied source command should require approval again: ${JSON.stringify(recovered.task.policy)}`);
}
if (recovered.task?.approval?.required !== true || recovered.task?.approval?.status !== "pending") {
  throw new Error(`recovered denied source command should have a fresh pending approval: ${JSON.stringify(recovered.task.approval)}`);
}
if (recovered.task?.approval?.requestId === denied.approval?.id) {
  throw new Error(`recovered denied source command should not reuse original approval id: ${JSON.stringify(recovered.task.approval)}`);
}
if (commandSummary.summary?.total !== 0 || commandSummary.summary?.executed !== 0 || commandSummary.summary?.failed !== 0) {
  throw new Error(`recovering a denied source command must not execute before fresh approval: ${JSON.stringify(commandSummary.summary)}`);
}
if (history.summary?.total !== 0 || history.summary?.invoked !== 0 || history.summary?.blocked !== 0) {
  throw new Error(`recovering a denied source command must not invoke command capability before fresh approval: ${JSON.stringify(history.summary)}`);
}

process.stdout.write(recovered.task.approval.requestId);
EOF
)"

post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_BLOCKED_STEP_FILE"
post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-openclaw-source-command-denial-recovery-check","reason":"approve recovered denied source-derived fixture command"}' > "$RECOVERED_APPROVED_FILE"
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
  "$EVENTS_FILE" \
  "$PROMPT_SECRET"
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
const promptSecret = process.argv[12];
const raw = JSON.stringify({ denied, recovered, recoveredStep, transcripts });

if (!recoveredBlockedStep.ok || recoveredBlockedStep.ran !== false || recoveredBlockedStep.blocked !== true || recoveredBlockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block recovered denied source command until fresh approval: ${JSON.stringify(recoveredBlockedStep)}`);
}
if (recoveredApproved.approval?.status !== "approved" || recoveredApproved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`fresh recovered approval should convert source command task to audited execution: ${JSON.stringify(recoveredApproved)}`);
}
if (!recoveredStep.ok || recoveredStep.ran !== true || recoveredStep.task?.status !== "completed") {
  throw new Error(`approved recovered denied source command should complete: ${JSON.stringify(recoveredStep)}`);
}
if (recoveredStep.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`completed recovered source command should preserve provenance: ${JSON.stringify(recoveredStep.task?.sourceCommand)}`);
}
if (recoveredStep.task?.recovery?.recoveredFromTaskId !== denied.task?.id) {
  throw new Error(`completed recovered source command should preserve recovery link: ${JSON.stringify(recoveredStep.task?.recovery)}`);
}
if (!String(recoveredStep.execution?.commandTranscript?.[0]?.stdout ?? "").includes("source-command-denial-recovery-ok")) {
  throw new Error(`recovered source command should capture success stdout: ${JSON.stringify(recoveredStep.execution?.commandTranscript?.[0])}`);
}
if (taskSummary.summary?.counts?.failed !== 1 || taskSummary.summary?.counts?.completed !== 1 || taskSummary.summary?.counts?.active !== 0) {
  throw new Error(`task summary should show one denied failed source, one completed recovery, and no active tasks: ${JSON.stringify(taskSummary.summary)}`);
}
if (
  transcripts.summary?.total !== 1
  || transcripts.items?.[0]?.taskId !== recoveredStep.task?.id
  || transcripts.items?.[0]?.sourceCommand?.registry !== "openclaw-source-command-task-v0"
) {
  throw new Error(`command transcript ledger should include only the approved recovered source command execution: ${JSON.stringify(transcripts)}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`capability history should include only the approved recovered source command invocation: ${JSON.stringify(history.summary)}`);
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
for (const secret of [promptSecret, "SOURCE_COMMAND_DENIAL_RECOVERY_TOOL_SECRET_DO_NOT_LEAK"]) {
  if (raw.includes(secret)) {
    throw new Error(`source command denial recovery leaked prompt/tool content: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawSourceCommandDenialRecovery: {
    deniedTask: {
      id: denied.task.id,
      status: denied.task.status,
      sourceCommand: denied.task.sourceCommand,
      recoveredByTaskId: recovered.recoveredFromTask?.recoveredByTaskId ?? null,
    },
    recoveredTask: {
      id: recoveredStep.task.id,
      status: recoveredStep.task.status,
      sourceCommand: recoveredStep.task.sourceCommand,
      recoveredFromTaskId: recoveredStep.task.recovery?.recoveredFromTaskId ?? null,
    },
    commandLedger: transcripts.summary,
    capabilityHistory: history.summary,
    approvals: approvals.summary,
  },
}, null, 2));
EOF
