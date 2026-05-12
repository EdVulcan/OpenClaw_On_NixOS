#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-workspace-command-failure-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8830}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8831}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8832}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8833}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8834}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8835}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8836}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8837}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8900}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-workspace-command-failure-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-workspace-command-failure-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-command-failure-fixture",
  "private": true,
  "scripts": {
    "typecheck": "node -e \"process.stderr.write('workspace-command-fail'); process.exit(7)\""
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
  "version": "0.0.0-command-failure-fixture",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw",
      "version": "0.0.0-command-failure-fixture"
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
    "${FAIL_STEP_FILE:-}" \
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
FAIL_STEP_FILE="$(mktemp)"
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
  throw new Error(`operator should block before failed workspace command approval: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-openclaw-workspace-command-failure-check","reason":"approve failing fixture workspace command"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$FAIL_STEP_FILE"
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
  "$FAIL_STEP_FILE" \
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
const failStep = readJson(6);
const commandsAfter = readJson(7);
const transcripts = readJson(8);
const history = readJson(9);
const approvals = readJson(10);
const events = readJson(11);
const workspaceDir = process.argv[12];

if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`approval should convert failing workspace command to audited execution: ${JSON.stringify(approved)}`);
}
if (!failStep.ok || failStep.ran !== true || failStep.blocked !== false || failStep.task?.status !== "failed") {
  throw new Error(`approved failing workspace command should fail the task: ${JSON.stringify(failStep)}`);
}
if (!String(failStep.task?.outcome?.reason ?? "").includes("exit code 7")) {
  throw new Error(`failed workspace command should explain exit code 7: ${JSON.stringify(failStep.task?.outcome)}`);
}
if (failStep.execution?.executor !== "capability-invoke-v1") {
  throw new Error(`failing workspace command should execute through capability invoke: ${JSON.stringify(failStep.execution)}`);
}

const invocation = failStep.execution?.capabilityInvocations?.[0];
if (
  invocation?.capabilityId !== "act.system.command.execute"
  || invocation.invoked !== true
  || invocation.summary?.kind !== "command.execute"
  || invocation.summary?.wouldExecute !== true
  || invocation.summary?.exitCode !== 7
  || !String(invocation.summary?.stderr ?? "").includes("workspace-command-fail")
) {
  throw new Error(`failing workspace command invocation mismatch: ${JSON.stringify(invocation)}`);
}

const transcript = failStep.execution?.commandTranscript?.[0];
if (
  transcript?.command !== "npm"
  || transcript.exitCode !== 7
  || !String(transcript.stderr ?? "").includes("workspace-command-fail")
) {
  throw new Error(`failing workspace command transcript mismatch: ${JSON.stringify(transcript)}`);
}
if (commandsAfter.summary?.total !== (commandsBefore.summary?.total ?? 0) + 1 || commandsAfter.summary?.failed !== 1) {
  throw new Error(`failing workspace command should add one failed command transcript: ${JSON.stringify({ before: commandsBefore.summary, after: commandsAfter.summary })}`);
}
if (transcripts.items?.[0]?.taskId !== taskResponse.task?.id || transcripts.items?.[0]?.command !== "npm" || transcripts.items?.[0]?.state !== "failed") {
  throw new Error(`command transcript ledger should reference failed workspace command task: ${JSON.stringify(transcripts.items?.[0])}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`capability history should record one failed command invocation attempt: ${JSON.stringify(history.summary)}`);
}
if (history.items?.[0]?.request?.cwd !== workspaceDir || history.items?.[0]?.request?.command !== "npm") {
  throw new Error(`capability history should preserve failed command request metadata: ${JSON.stringify(history.items?.[0]?.request)}`);
}
if ((approvals.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error(`failing workspace command should leave no pending approvals: ${JSON.stringify(approvals.items)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.approved", "capability.invoked", "system.command.executed", "task.failed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}
if (eventTypes.has("task.completed")) {
  throw new Error(`failing workspace command should not emit task.completed: ${JSON.stringify([...eventTypes])}`);
}

console.log(JSON.stringify({
  openclawWorkspaceCommandFailure: {
    task: {
      id: failStep.task.id,
      status: failStep.task.status,
      reason: failStep.task.outcome?.reason ?? null,
      policy: failStep.task.policy,
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
      stderr: transcript.stderr,
    },
    commandLedger: commandsAfter.summary,
    capabilityHistory: history.summary,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("approval.") || type.startsWith("capability.") || type.startsWith("system.command") || type.startsWith("task.")),
}, null, 2));
EOF
