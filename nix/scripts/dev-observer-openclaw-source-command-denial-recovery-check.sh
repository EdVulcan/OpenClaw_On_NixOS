#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-source-command-denial-recovery-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
PROMPT_SECRET="OBSERVER_SOURCE_COMMAND_DENIAL_RECOVERY_PROMPT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9870}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9871}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9872}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9873}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9874}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9875}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9876}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9877}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9940}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-source-command-denial-recovery-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-source-command-denial-recovery-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$TOOLS_DIR" "$DOCS_TOOLS_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "private": true,
  "scripts": {
    "typecheck": "printf observer-source-command-denial-recovery-ok"
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
Observer must expose source command denial and recovery through approval and recovery controls.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/command-runner.md" <<'MD'
# Command Runner
Observer visibility for denied and recovered source command tasks.
MD
cat > "$TOOLS_DIR/command-tool.ts" <<'TS'
export function observerSourceCommandDenialRecoveryTool() {
  const secret = "OBSERVER_SOURCE_COMMAND_DENIAL_RECOVERY_TOOL_SECRET_DO_NOT_LEAK";
  return { kind: "observer-source-command-denial-recovery", secret };
}
TS
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createObserverSourceCommandDenialRecoveryContract() {
  return { capabilityId: "observer-source-command-denial-recovery" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type ObserverSourceCommandDenialRecoveryManifest = { pluginId: string };
TS

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${TASK_FILE:-}" "${BLOCKED_STEP_FILE:-}" "${DENIED_FILE:-}" "${RECOVERED_FILE:-}" "${COMMANDS_AFTER_RECOVERY_FILE:-}" "${HISTORY_AFTER_RECOVERY_FILE:-}" "${RECOVERED_BLOCKED_STEP_FILE:-}" "${RECOVERED_APPROVED_FILE:-}" "${RECOVERED_STEP_FILE:-}" "${TASKS_FILE:-}" "${TRANSCRIPTS_FILE:-}" "${HISTORY_FILE:-}" "${APPROVALS_FILE:-}" "${EVENTS_FILE:-}"
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
TRANSCRIPTS_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
post_json "$CORE_URL/plugins/native-adapter/source-command-proposals/tasks" '{"proposalId":"openclaw:typecheck","query":"command","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

for (const token of [
  "source-command-task-button",
  "deny-latest-button",
  "recover-latest-failed-task-button",
  "recover-selected-task-button",
  "task-recoverable-count",
  "command-ledger-json",
  "capability-history-json",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing source command denial recovery token ${token}`);
  }
}
for (const token of [
  "createSourceCommandApprovalTask",
  "/plugins/native-adapter/source-command-proposals/tasks",
  "resolveLatestApproval(\"deny\")",
  "recoverLatestFailedTask",
  "recoverSelectedTask",
  "/tasks/${sourceTask.id}/recover",
  "approval.denied",
  "task.recovered",
  "system.command.executed",
  "refreshCommandLedger",
  "refreshCapabilityHistory",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing source command denial recovery token ${token}`);
  }
}
if (!taskResponse.ok || taskResponse.registry !== "openclaw-source-command-task-v0" || taskResponse.task?.status !== "queued") {
  throw new Error(`observer source command denial recovery should create queued source task: ${JSON.stringify(taskResponse)}`);
}
if (taskResponse.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`observer source task should persist provenance: ${JSON.stringify(taskResponse.task?.sourceCommand)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before observer source denial: ${JSON.stringify(blockedStep)}`);
}
process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/deny" '{"deniedBy":"dev-observer-openclaw-source-command-denial-recovery-check","reason":"deny observer source command before recovery"}' > "$DENIED_FILE"
denied_task_id="$(node - <<'EOF' "$DENIED_FILE"
const fs = require("node:fs");
const denied = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!denied.ok || denied.approval?.status !== "denied" || denied.task?.status !== "failed" || denied.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0" || denied.task?.restorable !== true) {
  throw new Error(`observer source command denial mismatch: ${JSON.stringify(denied)}`);
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
if (!recovered.ok || recovered.task?.status !== "queued" || recovered.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`observer recovered source command should preserve provenance: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.recovery?.recoveredFromTaskId !== denied.task?.id || recovered.recoveredFromTask?.recoveredByTaskId !== recovered.task?.id) {
  throw new Error(`observer recovered source command should preserve recovery links: ${JSON.stringify(recovered)}`);
}
if (recovered.task?.policy?.request?.approved === true || recovered.task?.policy?.decision?.decision !== "require_approval" || recovered.task?.approval?.status !== "pending") {
  throw new Error(`observer recovered source command should require fresh approval: ${JSON.stringify(recovered.task)}`);
}
if (commandSummary.summary?.total !== 0 || history.summary?.total !== 0) {
  throw new Error(`observer recovered source command must not execute before fresh approval: ${JSON.stringify({ commandSummary, history })}`);
}
process.stdout.write(recovered.task.approval.requestId);
EOF
)"

post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_BLOCKED_STEP_FILE"
post_json "$CORE_URL/approvals/$recovered_approval_id/approve" '{"approvedBy":"dev-observer-openclaw-source-command-denial-recovery-check","reason":"approve recovered observer source command"}' > "$RECOVERED_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$TASKS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=10" > "$TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=180" > "$EVENTS_FILE"

node - <<'EOF' "$DENIED_FILE" "$RECOVERED_FILE" "$RECOVERED_BLOCKED_STEP_FILE" "$RECOVERED_APPROVED_FILE" "$RECOVERED_STEP_FILE" "$TASKS_FILE" "$TRANSCRIPTS_FILE" "$HISTORY_FILE" "$APPROVALS_FILE" "$EVENTS_FILE" "$PROMPT_SECRET"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const denied = readJson(2);
const recovered = readJson(3);
const recoveredBlockedStep = readJson(4);
const recoveredApproved = readJson(5);
const recoveredStep = readJson(6);
const tasks = readJson(7);
const transcripts = readJson(8);
const history = readJson(9);
const approvals = readJson(10);
const events = readJson(11);
const promptSecret = process.argv[12];
const raw = JSON.stringify({ denied, recovered, recoveredStep, transcripts });

if (!recoveredBlockedStep.ok || recoveredBlockedStep.blocked !== true || recoveredBlockedStep.reason !== "policy_requires_approval") {
  throw new Error(`observer recovered source command should block until fresh approval: ${JSON.stringify(recoveredBlockedStep)}`);
}
if (recoveredApproved.approval?.status !== "approved" || recoveredApproved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`observer recovered source command approval mismatch: ${JSON.stringify(recoveredApproved)}`);
}
if (!recoveredStep.ok || recoveredStep.ran !== true || recoveredStep.task?.status !== "completed" || recoveredStep.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`observer recovered source command execution mismatch: ${JSON.stringify(recoveredStep)}`);
}
if (!String(recoveredStep.execution?.commandTranscript?.[0]?.stdout ?? "").includes("observer-source-command-denial-recovery-ok")) {
  throw new Error(`observer recovered source command should capture stdout: ${JSON.stringify(recoveredStep.execution?.commandTranscript?.[0])}`);
}
if (tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.completed !== 1 || tasks.summary?.counts?.active !== 0) {
  throw new Error(`observer task summary mismatch: ${JSON.stringify(tasks.summary)}`);
}
if (transcripts.summary?.total !== 1 || transcripts.items?.[0]?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`observer command ledger should show recovered source command provenance: ${JSON.stringify(transcripts)}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`observer capability history mismatch: ${JSON.stringify(history.summary)}`);
}
if (approvals.summary?.counts?.denied !== 1 || approvals.summary?.counts?.approved !== 1 || approvals.summary?.counts?.pending !== 0) {
  throw new Error(`observer approval summary mismatch: ${JSON.stringify(approvals.summary)}`);
}
const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.denied", "approval.approved", "task.recovered", "capability.invoked", "system.command.executed", "task.failed", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}
for (const secret of [promptSecret, "OBSERVER_SOURCE_COMMAND_DENIAL_RECOVERY_TOOL_SECRET_DO_NOT_LEAK"]) {
  if (raw.includes(secret)) {
    throw new Error(`observer source command denial recovery leaked prompt/tool content: ${secret}`);
  }
}
console.log(JSON.stringify({
  observerOpenClawSourceCommandDenialRecovery: {
    deniedTask: {
      id: denied.task.id,
      status: denied.task.status,
      sourceCommand: denied.task.sourceCommand,
    },
    recoveredTask: {
      id: recoveredStep.task.id,
      status: recoveredStep.task.status,
      sourceCommand: recoveredStep.task.sourceCommand,
    },
    commandLedger: transcripts.summary,
    capabilityHistory: history.summary,
    approvals: approvals.summary,
  },
}, null, 2));
EOF
