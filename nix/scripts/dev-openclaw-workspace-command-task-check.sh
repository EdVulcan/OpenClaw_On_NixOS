#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-workspace-command-task-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8690}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8691}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8692}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8693}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8694}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8695}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8696}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8697}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8760}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-workspace-command-task-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-workspace-command-task-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-command-task-fixture",
  "private": true,
  "scripts": {
    "typecheck": "echo secret-typecheck-task-body"
  },
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "apps/*"
  - "packages/*"
YAML

cleanup() {
  rm -f \
    "${TASKS_BEFORE_FILE:-}" \
    "${APPROVALS_BEFORE_FILE:-}" \
    "${COMMANDS_BEFORE_FILE:-}" \
    "${REJECTED_FILE:-}" \
    "${TASK_FILE:-}" \
    "${BLOCKED_STEP_FILE:-}" \
    "${PENDING_FILE:-}" \
    "${TASKS_AFTER_FILE:-}" \
    "${APPROVALS_AFTER_FILE:-}" \
    "${COMMANDS_AFTER_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

"$SCRIPT_DIR/dev-up.sh"

TASKS_BEFORE_FILE="$(mktemp)"
APPROVALS_BEFORE_FILE="$(mktemp)"
COMMANDS_BEFORE_FILE="$(mktemp)"
REJECTED_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_STEP_FILE="$(mktemp)"
PENDING_FILE="$(mktemp)"
TASKS_AFTER_FILE="$(mktemp)"
APPROVALS_AFTER_FILE="$(mktemp)"
COMMANDS_AFTER_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/tasks/summary" > "$TASKS_BEFORE_FILE"
curl --silent --fail "$CORE_URL/approvals/summary" > "$APPROVALS_BEFORE_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_BEFORE_FILE"
curl --silent --output "$REJECTED_FILE" --write-out "%{http_code}" \
  -X POST "$CORE_URL/workspaces/command-proposals/tasks" \
  -H 'content-type: application/json' \
  -d '{"proposalId":"openclaw:typecheck"}' | grep -qx "400"
post_json "$CORE_URL/workspaces/command-proposals/tasks" '{"proposalId":"openclaw:typecheck","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"
curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10" > "$PENDING_FILE"
curl --silent --fail "$CORE_URL/tasks/summary" > "$TASKS_AFTER_FILE"
curl --silent --fail "$CORE_URL/approvals/summary" > "$APPROVALS_AFTER_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_FILE"

node - <<'EOF' "$TASKS_BEFORE_FILE" "$APPROVALS_BEFORE_FILE" "$COMMANDS_BEFORE_FILE" "$REJECTED_FILE" "$TASK_FILE" "$BLOCKED_STEP_FILE" "$PENDING_FILE" "$TASKS_AFTER_FILE" "$APPROVALS_AFTER_FILE" "$COMMANDS_AFTER_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const tasksBefore = readJson(2);
const approvalsBefore = readJson(3);
const commandsBefore = readJson(4);
const rejected = readJson(5);
const taskResponse = readJson(6);
const blockedStep = readJson(7);
const pending = readJson(8);
const tasksAfter = readJson(9);
const approvalsAfter = readJson(10);
const commandsAfter = readJson(11);
const workspaceDir = process.argv[12];
const rawTask = JSON.stringify(taskResponse);
const secretBody = "secret-typecheck-task-body";

if (rejected.ok !== false || !String(rejected.error ?? "").includes("confirm=true")) {
  throw new Error(`workspace command task creation should require explicit confirmation: ${JSON.stringify(rejected)}`);
}
if (!taskResponse.ok || taskResponse.registry !== "workspace-command-task-v0" || taskResponse.mode !== "approval-gated") {
  throw new Error(`workspace command task should expose approval-gated mode: ${JSON.stringify(taskResponse)}`);
}
if (
  taskResponse.proposal?.id !== "openclaw:typecheck"
  || taskResponse.proposal?.command !== "pnpm"
  || taskResponse.proposal?.args?.join(" ") !== "run typecheck"
  || taskResponse.proposal?.cwd !== workspaceDir
) {
  throw new Error(`workspace command task should reference selected proposal: ${JSON.stringify(taskResponse.proposal)}`);
}
if (
  taskResponse.governance?.createsTask !== true
  || taskResponse.governance?.createsApproval !== true
  || taskResponse.governance?.canExecuteWithoutApproval !== false
  || taskResponse.governance?.executed !== false
  || taskResponse.governance?.requiresExplicitApproval !== true
  || taskResponse.governance?.exposesScriptBody !== false
) {
  throw new Error(`workspace command task governance mismatch: ${JSON.stringify(taskResponse.governance)}`);
}
const task = taskResponse.task ?? {};
if (
  task.status !== "queued"
  || task.policy?.decision?.decision !== "require_approval"
  || task.policy?.decision?.reason !== "workspace_command_requires_explicit_user_approval"
  || task.approval?.required !== true
  || task.plan?.capabilitySummary?.ids?.includes("act.system.command.execute") !== true
) {
  throw new Error(`workspace command task should be queued behind explicit approval: ${JSON.stringify(task)}`);
}
if (!taskResponse.approval?.id || taskResponse.approval?.status !== "pending" || taskResponse.approval?.taskId !== task.id) {
  throw new Error(`workspace command task should create a linked pending approval: ${JSON.stringify(taskResponse.approval)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block instead of executing workspace command task: ${JSON.stringify(blockedStep)}`);
}
if (blockedStep.task?.id !== task.id || blockedStep.approval?.id !== taskResponse.approval.id) {
  throw new Error(`blocked operator step should point at workspace command task approval: ${JSON.stringify(blockedStep)}`);
}
if (pending.items?.length !== 1 || pending.items[0].id !== taskResponse.approval.id) {
  throw new Error(`approval inbox should contain workspace command pending approval: ${JSON.stringify(pending.items)}`);
}
if (tasksAfter.summary?.counts?.total !== (tasksBefore.summary?.counts?.total ?? 0) + 1) {
  throw new Error(`workspace command task should create one task: ${JSON.stringify({ before: tasksBefore.summary, after: tasksAfter.summary })}`);
}
if (
  approvalsAfter.summary?.counts?.total !== (approvalsBefore.summary?.counts?.total ?? 0) + 1
  || approvalsAfter.summary?.counts?.pending !== (approvalsBefore.summary?.counts?.pending ?? 0) + 1
) {
  throw new Error(`workspace command task should create one pending approval: ${JSON.stringify({ before: approvalsBefore.summary, after: approvalsAfter.summary })}`);
}
if (commandsAfter.summary?.total !== commandsBefore.summary?.total) {
  throw new Error(`workspace command task must not execute command before approval: ${JSON.stringify({ before: commandsBefore.summary, after: commandsAfter.summary })}`);
}
if (rawTask.includes(secretBody)) {
  throw new Error("workspace command task response must not expose package.json script body");
}

console.log(JSON.stringify({
  openclawWorkspaceCommandTask: {
    registry: taskResponse.registry,
    mode: taskResponse.mode,
    proposal: {
      id: taskResponse.proposal.id,
      command: taskResponse.proposal.command,
      args: taskResponse.proposal.args,
      cwd: taskResponse.proposal.cwd,
    },
    task: {
      id: task.id,
      status: task.status,
      policy: task.policy,
      approval: task.approval,
      capabilitySummary: task.plan.capabilitySummary,
    },
    approval: {
      id: taskResponse.approval.id,
      status: taskResponse.approval.status,
      reason: taskResponse.approval.reason,
    },
    operatorGate: {
      blocked: blockedStep.blocked,
      reason: blockedStep.reason,
    },
    unchangedCommandLedger: commandsAfter.summary,
    endpoints: [
      "POST /workspaces/command-proposals/tasks",
    ],
  },
}, null, 2));
EOF
