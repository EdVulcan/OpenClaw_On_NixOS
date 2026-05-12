#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-workspace-command-task-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8700}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8701}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8702}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8703}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8704}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8705}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8706}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8707}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8770}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-workspace-command-task-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-workspace-command-task-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-command-task-fixture",
  "private": true,
  "scripts": {
    "typecheck": "echo observer-secret-typecheck-task-body"
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
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${COMMANDS_BEFORE_FILE:-}" \
    "${TASK_FILE:-}" \
    "${BLOCKED_STEP_FILE:-}" \
    "${PENDING_FILE:-}" \
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

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
COMMANDS_BEFORE_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_STEP_FILE="$(mktemp)"
PENDING_FILE="$(mktemp)"
COMMANDS_AFTER_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_BEFORE_FILE"
post_json "$CORE_URL/workspaces/command-proposals/tasks" '{"proposalId":"openclaw:typecheck","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"
curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10" > "$PENDING_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$COMMANDS_BEFORE_FILE" "$TASK_FILE" "$BLOCKED_STEP_FILE" "$PENDING_FILE" "$COMMANDS_AFTER_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const commandsBefore = readJson(4);
const taskResponse = readJson(5);
const blockedStep = readJson(6);
const pending = readJson(7);
const commandsAfter = readJson(8);
const workspaceDir = process.argv[9];
const rawTask = JSON.stringify(taskResponse);
const secretBody = "observer-secret-typecheck-task-body";

const requiredHtml = [
  "workspace-command-task-button",
  "Create Approval Task",
];
const requiredClient = [
  "/workspaces/command-proposals/tasks",
  "createWorkspaceCommandApprovalTask",
  "proposalId: \"openclaw:typecheck\"",
  "confirm: true",
  "refreshApprovalState",
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
if (!taskResponse.approval?.id || taskResponse.approval.status !== "pending" || taskResponse.approval.taskId !== taskResponse.task?.id) {
  throw new Error(`workspace command task should create a pending approval: ${JSON.stringify(taskResponse.approval)}`);
}
if (
  taskResponse.task?.status !== "queued"
  || taskResponse.task?.policy?.decision?.decision !== "require_approval"
  || taskResponse.task?.approval?.required !== true
) {
  throw new Error(`workspace command task should be queued behind approval: ${JSON.stringify(taskResponse.task)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block instead of executing workspace command task: ${JSON.stringify(blockedStep)}`);
}
if (pending.items?.length !== 1 || pending.items[0].id !== taskResponse.approval.id) {
  throw new Error(`approval inbox should expose workspace command approval: ${JSON.stringify(pending.items)}`);
}
if (commandsAfter.summary?.total !== commandsBefore.summary?.total) {
  throw new Error(`observer-created workspace command task must not execute command before approval: ${JSON.stringify({ before: commandsBefore.summary, after: commandsAfter.summary })}`);
}
if (rawTask.includes(secretBody)) {
  throw new Error("observer workspace command task response must not expose package.json script body");
}

console.log(JSON.stringify({
  observerWorkspaceCommandTask: {
    htmlControls: requiredHtml,
    clientApis: [
      "POST /workspaces/command-proposals/tasks",
      "createWorkspaceCommandApprovalTask",
      "refreshApprovalState",
    ],
    task: {
      id: taskResponse.task.id,
      status: taskResponse.task.status,
      approval: taskResponse.task.approval,
      policy: taskResponse.task.policy,
    },
    approval: {
      id: taskResponse.approval.id,
      status: taskResponse.approval.status,
    },
    operatorGate: {
      blocked: blockedStep.blocked,
      reason: blockedStep.reason,
    },
    unchangedCommandLedger: commandsAfter.summary,
  },
}, null, 2));
EOF
