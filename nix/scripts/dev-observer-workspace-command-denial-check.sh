#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-workspace-command-denial-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8900}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8901}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8902}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8903}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8904}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8905}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8906}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8907}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8970}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-workspace-command-denial-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-workspace-command-denial-check-events.jsonl}"

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
  "version": "0.0.0-observer-command-denial-fixture",
  "private": true,
  "scripts": {
    "typecheck": "printf observer-workspace-command-denial-should-not-run"
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
  "version": "0.0.0-observer-command-denial-fixture",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw",
      "version": "0.0.0-observer-command-denial-fixture"
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
    "${DENIED_FILE:-}" \
    "${AFTER_DENY_STEP_FILE:-}" \
    "${TASKS_FILE:-}" \
    "${LATEST_FAILED_FILE:-}" \
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
DENIED_FILE="$(mktemp)"
AFTER_DENY_STEP_FILE="$(mktemp)"
TASKS_FILE="$(mktemp)"
LATEST_FAILED_FILE="$(mktemp)"
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

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_STEP_FILE" "$COMMANDS_BEFORE_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const commandsBefore = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

if (!taskResponse.ok || taskResponse.mode !== "approval-gated" || taskResponse.task?.status !== "queued") {
  throw new Error(`observer denial fixture should create an approval-gated workspace command task: ${JSON.stringify(taskResponse)}`);
}
if (taskResponse.task?.policy?.decision?.decision !== "require_approval") {
  throw new Error(`observer denial fixture should start with require_approval: ${JSON.stringify(taskResponse.task?.policy)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before observer workspace command denial: ${JSON.stringify(blockedStep)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose linked approval: ${JSON.stringify(blockedStep.approval)}`);
}
if (commandsBefore.summary?.total !== 0) {
  throw new Error(`observer denial fixture should start without command transcripts: ${JSON.stringify(commandsBefore.summary)}`);
}

process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/deny" '{"deniedBy":"dev-observer-workspace-command-denial-check","reason":"deny observer fixture workspace command"}' > "$DENIED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$AFTER_DENY_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$TASKS_FILE"
curl --silent --fail "$CORE_URL/tasks/latest-failed" > "$LATEST_FAILED_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$APPROVALS_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=120" > "$EVENTS_FILE"

node - <<'EOF' \
  "$HTML_FILE" \
  "$CLIENT_FILE" \
  "$TASK_FILE" \
  "$BLOCKED_STEP_FILE" \
  "$DENIED_FILE" \
  "$AFTER_DENY_STEP_FILE" \
  "$TASKS_FILE" \
  "$LATEST_FAILED_FILE" \
  "$COMMANDS_AFTER_FILE" \
  "$TRANSCRIPTS_FILE" \
  "$HISTORY_FILE" \
  "$APPROVALS_FILE" \
  "$EVENTS_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const taskResponse = readJson(4);
const blockedStep = readJson(5);
const denied = readJson(6);
const afterDenyStep = readJson(7);
const tasks = readJson(8);
const latestFailed = readJson(9);
const commandsAfter = readJson(10);
const transcripts = readJson(11);
const history = readJson(12);
const approvals = readJson(13);
const events = readJson(14);

const requiredHtml = [
  "workspace-command-task-button",
  "deny-latest-button",
  "approval-pending-count",
  "approval-json",
  "task-failed-count",
  "task-recoverable-count",
  "command-ledger-total",
  "capability-history-total",
];
const requiredClient = [
  "createWorkspaceCommandApprovalTask",
  "resolveLatestApproval",
  "resolveLatestApproval(\"deny\")",
  "approval.denied",
  "task.failed",
  "refreshApprovalState",
  "refreshTaskList",
  "refreshCommandLedger",
  "/commands/transcripts?limit=8",
  "/capabilities/invocations?limit=8",
];

for (const token of requiredHtml) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing denial visibility/control token ${token}`);
  }
}
for (const token of requiredClient) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing denial visibility/control token ${token}`);
  }
}

if (!denied.ok || denied.approval?.status !== "denied" || denied.task?.status !== "failed") {
  throw new Error(`Observer denial should fail the workspace command task: ${JSON.stringify(denied)}`);
}
if (denied.task?.outcome?.reason !== "Approval denied by user.") {
  throw new Error(`Observer denied workspace command should record user-denial reason: ${JSON.stringify(denied.task?.outcome)}`);
}
if (denied.task?.approval?.required !== false || denied.task?.approval?.status !== "denied") {
  throw new Error(`Observer denied workspace command should resolve approval gate: ${JSON.stringify(denied.task?.approval)}`);
}
if (denied.task?.policy?.request?.approved === true || denied.task?.policy?.decision?.approved === true) {
  throw new Error(`Observer denied workspace command must not become approved: ${JSON.stringify(denied.task?.policy)}`);
}
if (afterDenyStep.ok !== true || afterDenyStep.ran !== false || afterDenyStep.blocked !== false) {
  throw new Error(`operator should have no Observer-denied workspace command to execute: ${JSON.stringify(afterDenyStep)}`);
}
if (latestFailed.task?.id !== denied.task?.id || latestFailed.task?.restorable !== true) {
  throw new Error(`latest failed should expose Observer-denied workspace command as recoverable history: ${JSON.stringify(latestFailed)}`);
}
if (tasks.summary?.counts?.failed !== 1 || tasks.summary?.counts?.active !== 0 || tasks.summary?.counts?.queued !== 0 || tasks.summary?.counts?.recoverable !== 1) {
  throw new Error(`Observer task summary should show one failed recoverable denial and no active work: ${JSON.stringify(tasks.summary)}`);
}
if (commandsAfter.summary?.total !== 0 || commandsAfter.summary?.failed !== 0 || commandsAfter.summary?.executed !== 0) {
  throw new Error(`Observer-denied workspace command must not create command transcripts: ${JSON.stringify(commandsAfter.summary)}`);
}
if ((transcripts.items ?? []).length !== 0 || transcripts.summary?.total !== 0) {
  throw new Error(`Observer command transcript ledger should remain empty after denial: ${JSON.stringify(transcripts)}`);
}
if (history.summary?.total !== 0 || history.summary?.invoked !== 0 || history.summary?.blocked !== 0) {
  throw new Error(`Observer-denied workspace command must not invoke command capability: ${JSON.stringify(history.summary)}`);
}
if (approvals.summary?.counts?.denied !== 1 || approvals.summary?.counts?.pending !== 0 || approvals.summary?.counts?.approved !== 0) {
  throw new Error(`Observer approval summary should show one denied approval and no pending approvals: ${JSON.stringify(approvals.summary)}`);
}
if (approvals.items?.[0]?.id !== blockedStep.approval?.id || approvals.items?.[0]?.status !== "denied") {
  throw new Error(`Observer approval inbox should show denied workspace command approval: ${JSON.stringify(approvals.items?.[0])}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.denied", "task.failed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}
for (const forbidden of ["approval.approved", "capability.invoked", "system.command.executed", "task.completed"]) {
  if (eventTypes.has(forbidden)) {
    throw new Error(`Observer-denied workspace command should not emit ${forbidden}: ${JSON.stringify([...eventTypes])}`);
  }
}

console.log(JSON.stringify({
  observerWorkspaceCommandDenial: {
    htmlControls: [
      "Create approval task",
      "Deny latest approval",
      "Approval inbox",
      "Task summary",
      "Command ledger",
      "Capability history",
    ],
    clientHooks: [
      "resolveLatestApproval deny",
      "approval.denied refresh",
      "task.failed command-ledger refresh",
    ],
    task: {
      id: denied.task.id,
      status: denied.task.status,
      reason: denied.task.outcome?.reason ?? null,
      restorable: denied.task.restorable,
      originalTaskId: taskResponse.task?.id ?? null,
    },
    approval: {
      id: denied.approval.id,
      status: denied.approval.status,
      deniedBy: denied.approval.deniedBy,
    },
    operator: {
      blockedBeforeDenial: blockedStep.blocked,
      ranAfterDenial: afterDenyStep.ran,
    },
    commandLedger: commandsAfter.summary,
    capabilityHistory: history.summary,
    approvals: approvals.summary,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("approval.") || type.startsWith("capability.") || type.startsWith("system.command") || type.startsWith("task.")),
}, null, 2));
EOF
