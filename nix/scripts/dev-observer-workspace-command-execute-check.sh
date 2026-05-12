#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-workspace-command-execute-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8810}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8811}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8812}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8813}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8814}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8815}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8816}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8817}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8880}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-workspace-command-execute-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-workspace-command-execute-check-events.jsonl}"

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
  "version": "0.0.0-observer-command-execute-fixture",
  "private": true,
  "scripts": {
    "typecheck": "printf observer-workspace-exec-ok"
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
  "version": "0.0.0-observer-command-execute-fixture",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw",
      "version": "0.0.0-observer-command-execute-fixture"
    }
  }
}
JSON

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
post_json "$CORE_URL/workspaces/command-proposals/tasks" '{"proposalId":"openclaw:typecheck","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!taskResponse.ok || taskResponse.mode !== "approval-gated" || taskResponse.task?.status !== "queued") {
  throw new Error(`observer workspace command task should be queued behind approval: ${JSON.stringify(taskResponse)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before observer workspace command approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-observer-workspace-command-execute-check","reason":"approve observer fixture workspace command"}' > "$APPROVED_FILE"
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
  "$WORKSPACE_DIR"
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

const requiredHtml = [
  "workspace-command-task-button",
  "approve-latest-button",
  "operator-step-button",
  "command-transcript-json",
  "command-ledger-json",
];
const requiredClient = [
  "createWorkspaceCommandApprovalTask",
  "resolveLatestApproval",
  "runOperatorStepFromUi",
  "system.command.executed",
  "refreshCommandLedger",
  "refreshCapabilityHistory",
  "/commands/transcripts?limit=8",
];

for (const token of requiredHtml) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of requiredClient) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}

if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`Observer approval flow should convert task to audited execution: ${JSON.stringify(approved)}`);
}
if (!execStep.ok || execStep.ran !== true || execStep.blocked !== false || execStep.task?.status !== "completed") {
  throw new Error(`Observer workspace command should execute to completion after approval: ${JSON.stringify(execStep)}`);
}

const invocation = execStep.execution?.capabilityInvocations?.[0];
if (
  invocation?.capabilityId !== "act.system.command.execute"
  || invocation.invoked !== true
  || invocation.summary?.wouldExecute !== true
  || invocation.summary?.exitCode !== 0
  || !String(invocation.summary?.stdout ?? "").includes("observer-workspace-exec-ok")
) {
  throw new Error(`Observer workspace command invocation mismatch: ${JSON.stringify(invocation)}`);
}

const transcript = execStep.execution?.commandTranscript?.[0];
if (
  transcript?.command !== "npm"
  || transcript.exitCode !== 0
  || !String(transcript.stdout ?? "").includes("observer-workspace-exec-ok")
) {
  throw new Error(`Observer workspace command transcript mismatch: ${JSON.stringify(transcript)}`);
}
if (commandsAfter.summary?.total !== (commandsBefore.summary?.total ?? 0) + 1) {
  throw new Error(`Observer workspace command execution should add one command transcript: ${JSON.stringify({ before: commandsBefore.summary, after: commandsAfter.summary })}`);
}
if (transcripts.items?.[0]?.taskId !== taskResponse.task?.id || transcripts.items?.[0]?.command !== "npm") {
  throw new Error(`Observer command ledger should reference executed workspace command task: ${JSON.stringify(transcripts.items?.[0])}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`Observer capability history should record one successful command execution: ${JSON.stringify(history.summary)}`);
}
if (history.items?.[0]?.request?.cwd !== workspaceDir || history.items?.[0]?.request?.command !== "npm") {
  throw new Error(`Observer capability history should preserve bounded command metadata: ${JSON.stringify(history.items?.[0]?.request)}`);
}
if ((approvals.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error(`Observer workspace command execution should leave no pending approvals: ${JSON.stringify(approvals.items)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.approved", "capability.invoked", "system.command.executed", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  observerWorkspaceCommandExecute: {
    htmlControls: requiredHtml,
    clientHooks: [
      "Create approval task",
      "Approve latest approval",
      "Operator step",
      "Immediate command ledger refresh",
      "system.command.executed subscription",
    ],
    task: {
      id: execStep.task.id,
      status: execStep.task.status,
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
