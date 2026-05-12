#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-workspace-command-execute-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8790}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8791}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8792}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8793}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8794}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8795}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8796}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8797}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8860}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-workspace-command-execute-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-workspace-command-execute-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-command-execute-fixture",
  "private": true,
  "scripts": {
    "typecheck": "printf workspace-command-exec-ok"
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
  "version": "0.0.0-command-execute-fixture",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw",
      "version": "0.0.0-command-execute-fixture"
    }
  }
}
JSON

cleanup() {
  rm -f \
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

curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_BEFORE_FILE"
post_json "$CORE_URL/workspaces/command-proposals/tasks" '{"proposalId":"openclaw:typecheck","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!taskResponse.ok || taskResponse.mode !== "approval-gated" || taskResponse.task?.status !== "queued") {
  throw new Error(`workspace command task should be queued behind approval: ${JSON.stringify(taskResponse)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before workspace command approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-openclaw-workspace-command-execute-check","reason":"approve fixture workspace command"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$EXEC_STEP_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=10" > "$TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=120" > "$EVENTS_FILE"

node - <<'EOF' \
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
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const commandsBefore = readJson(2);
const taskResponse = readJson(3);
const blockedStep = readJson(4);
const approved = readJson(5);
const execStep = readJson(6);
const commandsAfter = readJson(7);
const transcripts = readJson(8);
const history = readJson(9);
const approvals = readJson(10);
const events = readJson(11);
const workspaceDir = process.argv[12];

if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`approval should convert task to audited execution: ${JSON.stringify(approved)}`);
}
if (!execStep.ok || execStep.ran !== true || execStep.blocked !== false || execStep.task?.status !== "completed") {
  throw new Error(`approved workspace command should execute to completion: ${JSON.stringify(execStep)}`);
}
if (execStep.execution?.executor !== "capability-invoke-v1") {
  throw new Error(`workspace command should execute through capability invoke: ${JSON.stringify(execStep.execution)}`);
}

const invocation = execStep.execution?.capabilityInvocations?.[0];
if (
  invocation?.capabilityId !== "act.system.command.execute"
  || invocation.invoked !== true
  || invocation.summary?.kind !== "command.execute"
  || invocation.summary?.wouldExecute !== true
  || invocation.summary?.exitCode !== 0
  || !String(invocation.summary?.stdout ?? "").includes("workspace-command-exec-ok")
) {
  throw new Error(`workspace command invocation mismatch: ${JSON.stringify(invocation)}`);
}

const transcript = execStep.execution?.commandTranscript?.[0];
if (
  transcript?.command !== "npm"
  || transcript.exitCode !== 0
  || !String(transcript.stdout ?? "").includes("workspace-command-exec-ok")
) {
  throw new Error(`workspace command transcript mismatch: ${JSON.stringify(transcript)}`);
}
if (commandsAfter.summary?.total !== (commandsBefore.summary?.total ?? 0) + 1) {
  throw new Error(`workspace command execution should add one command transcript: ${JSON.stringify({ before: commandsBefore.summary, after: commandsAfter.summary })}`);
}
if (transcripts.items?.[0]?.taskId !== taskResponse.task?.id || transcripts.items?.[0]?.command !== "npm") {
  throw new Error(`command transcript ledger should reference executed workspace command task: ${JSON.stringify(transcripts.items?.[0])}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`capability history should record one successful command execution: ${JSON.stringify(history.summary)}`);
}
if (history.items?.[0]?.request?.cwd !== workspaceDir || history.items?.[0]?.request?.command !== "npm") {
  throw new Error(`capability history should preserve bounded command request metadata: ${JSON.stringify(history.items?.[0]?.request)}`);
}
if ((approvals.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error(`workspace command execution should leave no pending approvals: ${JSON.stringify(approvals.items)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.approved", "capability.invoked", "system.command.executed", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  openclawWorkspaceCommandExecute: {
    task: {
      id: execStep.task.id,
      status: execStep.task.status,
      policy: execStep.task.policy,
    },
    approvalGate: {
      blockedBeforeApproval: blockedStep.blocked,
      approvalId: blockedStep.approval.id,
      approvedStatus: approved.approval.status,
    },
    command: {
      executable: transcript.command,
      cwd: workspaceDir,
      exitCode: transcript.exitCode,
      stdout: transcript.stdout,
    },
    commandLedger: commandsAfter.summary,
    capabilityHistory: history.summary,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("approval.") || type.startsWith("capability.") || type.startsWith("system.command") || type.startsWith("task.")),
}, null, 2));
EOF
