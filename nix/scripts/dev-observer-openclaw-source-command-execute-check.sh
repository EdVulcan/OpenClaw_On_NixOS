#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-source-command-execute-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
PROMPT_SECRET="OBSERVER_SOURCE_COMMAND_EXECUTE_PROMPT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9850}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9851}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9852}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9853}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9854}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9855}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9856}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9857}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9920}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-source-command-execute-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-source-command-execute-check-events.jsonl}"

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
    "typecheck": "printf observer-source-command-exec-ok"
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
Observer source command execution must show approval, operator, command ledger, and capability history controls.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/command-runner.md" <<'MD'
# Command Runner
Observer must keep source command execution visible through governed ledgers.
MD
cat > "$TOOLS_DIR/command-tool.ts" <<'TS'
export function observerSourceCommandExecuteTool() {
  const secret = "OBSERVER_SOURCE_COMMAND_EXECUTE_TOOL_SECRET_DO_NOT_LEAK";
  return { kind: "observer-source-command-execute", secret };
}
TS
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createObserverSourceCommandExecuteContract() {
  return { capabilityId: "observer-source-command-execute" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type ObserverSourceCommandExecuteManifest = { pluginId: string };
TS

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${COMMANDS_BEFORE_FILE:-}" \
    "${TASK_FILE:-}" \
    "${BLOCKED_STEP_FILE:-}" \
    "${APPROVED_FILE:-}" \
    "${EXEC_STEP_FILE:-}" \
    "${COMMANDS_AFTER_FILE:-}" \
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
COMMANDS_BEFORE_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_STEP_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
EXEC_STEP_FILE="$(mktemp)"
COMMANDS_AFTER_FILE="$(mktemp)"
TRANSCRIPTS_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_BEFORE_FILE"
post_json "$CORE_URL/plugins/native-adapter/source-command-proposals/tasks" '{"proposalId":"openclaw:typecheck","query":"command","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!taskResponse.ok || taskResponse.registry !== "openclaw-source-command-task-v0" || taskResponse.task?.status !== "queued") {
  throw new Error(`observer source command task should be queued behind approval: ${JSON.stringify(taskResponse)}`);
}
if (taskResponse.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`observer source command task should persist source provenance: ${JSON.stringify(taskResponse.task?.sourceCommand)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before observer source command approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-observer-openclaw-source-command-execute-check","reason":"approve observer source-derived fixture command"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$EXEC_STEP_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=120" > "$EVENTS_FILE"

node - <<'EOF' \
  "$HTML_FILE" \
  "$CLIENT_FILE" \
  "$COMMANDS_BEFORE_FILE" \
  "$TASK_FILE" \
  "$BLOCKED_STEP_FILE" \
  "$APPROVED_FILE" \
  "$EXEC_STEP_FILE" \
  "$COMMANDS_AFTER_FILE" \
  "$TRANSCRIPTS_FILE" \
  "$HISTORY_FILE" \
  "$APPROVALS_FILE" \
  "$EVENTS_FILE" \
  "$WORKSPACE_DIR" \
  "$PROMPT_SECRET"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const commandsBefore = readJson(4);
const taskResponse = readJson(5);
const blockedStep = readJson(6);
const approved = readJson(7);
const execStep = readJson(8);
const commandsAfter = readJson(9);
const transcripts = readJson(10);
const history = readJson(11);
const approvals = readJson(12);
const events = readJson(13);
const workspaceDir = process.argv[14];
const promptSecret = process.argv[15];
const raw = JSON.stringify({ html, client, taskResponse, execStep, transcripts });

for (const token of [
  "source-command-task-button",
  "Create Source Command Approval Task",
  "approve-latest-button",
  "operator-step-button",
  "command-transcript-json",
  "command-ledger-json",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer source command execute HTML missing ${token}`);
  }
}
for (const token of [
  "createSourceCommandApprovalTask",
  "/plugins/native-adapter/source-command-proposals/tasks",
  "resolveLatestApproval",
  "runOperatorStepFromUi",
  "system.command.executed",
  "refreshCommandLedger",
  "refreshCapabilityHistory",
  "/commands/transcripts?limit=8",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer source command execute client missing ${token}`);
  }
}
if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`Observer source approval flow should convert task to audited execution: ${JSON.stringify(approved)}`);
}
if (!execStep.ok || execStep.ran !== true || execStep.blocked !== false || execStep.task?.status !== "completed") {
  throw new Error(`Observer source command should execute to completion after approval: ${JSON.stringify(execStep)}`);
}
if (execStep.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`Observer executed source command task should preserve provenance: ${JSON.stringify(execStep.task?.sourceCommand)}`);
}

const invocation = execStep.execution?.capabilityInvocations?.[0];
if (
  invocation?.capabilityId !== "act.system.command.execute"
  || invocation.invoked !== true
  || invocation.summary?.wouldExecute !== true
  || invocation.summary?.exitCode !== 0
  || !String(invocation.summary?.stdout ?? "").includes("observer-source-command-exec-ok")
) {
  throw new Error(`Observer source command invocation mismatch: ${JSON.stringify(invocation)}`);
}

const transcript = execStep.execution?.commandTranscript?.[0];
if (
  transcript?.command !== "npm"
  || transcript.exitCode !== 0
  || !String(transcript.stdout ?? "").includes("observer-source-command-exec-ok")
) {
  throw new Error(`Observer source command transcript mismatch: ${JSON.stringify(transcript)}`);
}
if (commandsAfter.summary?.total !== (commandsBefore.summary?.total ?? 0) + 1) {
  throw new Error(`Observer source command execution should add one command transcript: ${JSON.stringify({ before: commandsBefore.summary, after: commandsAfter.summary })}`);
}
if (
  transcripts.items?.[0]?.taskId !== taskResponse.task?.id
  || transcripts.items?.[0]?.command !== "npm"
  || transcripts.items?.[0]?.sourceCommand?.registry !== "openclaw-source-command-task-v0"
) {
  throw new Error(`Observer source command ledger should reference executed source command task: ${JSON.stringify(transcripts.items?.[0])}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`Observer capability history should record one successful source command execution: ${JSON.stringify(history.summary)}`);
}
if (history.items?.[0]?.request?.cwd !== workspaceDir || history.items?.[0]?.request?.command !== "npm") {
  throw new Error(`Observer capability history should preserve bounded source command metadata: ${JSON.stringify(history.items?.[0]?.request)}`);
}
if ((approvals.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error(`Observer source command execution should leave no pending approvals: ${JSON.stringify(approvals.items)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.approved", "capability.invoked", "system.command.executed", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}
for (const secret of [
  promptSecret,
  "OBSERVER_SOURCE_COMMAND_EXECUTE_TOOL_SECRET_DO_NOT_LEAK",
]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer source command execution leaked prompt/tool content: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawSourceCommandExecute: {
    htmlControls: [
      "Create source command task",
      "Approve latest approval",
      "Operator step",
      "Command ledger",
    ],
    task: {
      id: execStep.task.id,
      status: execStep.task.status,
      sourceCommand: execStep.task.sourceCommand,
      policy: execStep.task.policy,
    },
    command: {
      executable: transcript.command,
      cwd: workspaceDir,
      exitCode: transcript.exitCode,
      stdout: transcript.stdout,
    },
    commandLedger: commandsAfter.summary,
    capabilityHistory: history.summary,
    blockedBeforeApproval: blockedStep.blocked,
    approvalStatus: approved.approval.status,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("approval.") || type.startsWith("capability.") || type.startsWith("system.command") || type.startsWith("task.")),
}, null, 2));
EOF
