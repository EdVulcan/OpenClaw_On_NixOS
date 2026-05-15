#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-source-command-task-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
PROMPT_SECRET="SOURCE_COMMAND_TASK_PROMPT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9820}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9821}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9822}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9823}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9824}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9825}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9826}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9827}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9890}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-source-command-task-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-source-command-task-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$TOOLS_DIR" "$DOCS_TOOLS_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "private": true,
  "scripts": {
    "dev": "echo source-command-task-secret-dev",
    "test": "echo source-command-task-secret-test",
    "typecheck": "echo source-command-task-secret-typecheck"
  }
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "packages/*"
YAML
cat > "$WORKSPACE_DIR/TOOLS.md" <<EOF
# Tools
Source command tasks must create a pending approval before any shell or process execution.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/command-runner.md" <<'MD'
# Command Runner
Create approval-gated command tasks from source-derived command plans without executing them.
MD
cat > "$TOOLS_DIR/command-tool.ts" <<'TS'
export function commandTaskTool() {
  const secret = "SOURCE_COMMAND_TASK_TOOL_SECRET_DO_NOT_LEAK";
  return { kind: "command-task", secret };
}
TS
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createSourceCommandTaskContract() {
  return { capabilityId: "source-command-task" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type SourceCommandTaskManifest = { pluginId: string };
TS

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
  -X POST "$CORE_URL/plugins/native-adapter/source-command-proposals/tasks" \
  -H 'content-type: application/json' \
  -d '{"proposalId":"openclaw:typecheck"}' | grep -qx "400"
post_json "$CORE_URL/plugins/native-adapter/source-command-proposals/tasks" '{"proposalId":"openclaw:typecheck","query":"command","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"
curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10" > "$PENDING_FILE"
curl --silent --fail "$CORE_URL/tasks/summary" > "$TASKS_AFTER_FILE"
curl --silent --fail "$CORE_URL/approvals/summary" > "$APPROVALS_AFTER_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_FILE"

node - <<'EOF' "$TASKS_BEFORE_FILE" "$APPROVALS_BEFORE_FILE" "$COMMANDS_BEFORE_FILE" "$REJECTED_FILE" "$TASK_FILE" "$BLOCKED_STEP_FILE" "$PENDING_FILE" "$TASKS_AFTER_FILE" "$APPROVALS_AFTER_FILE" "$COMMANDS_AFTER_FILE" "$WORKSPACE_DIR" "$PROMPT_SECRET"
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
const promptSecret = process.argv[13];
const rawTask = JSON.stringify(taskResponse);

if (rejected.ok !== false || !String(rejected.error ?? "").includes("confirm=true")) {
  throw new Error(`source command task creation should require explicit confirmation: ${JSON.stringify(rejected)}`);
}
if (!taskResponse.ok || taskResponse.registry !== "openclaw-source-command-task-v0" || taskResponse.mode !== "approval-gated-source-command") {
  throw new Error(`source command task should expose approval-gated source mode: ${JSON.stringify(taskResponse)}`);
}
if (
  taskResponse.sourceRegistry !== "openclaw-source-command-plan-draft-v0"
  || taskResponse.sourceCommandPlan?.registry !== "openclaw-source-command-plan-draft-v0"
  || taskResponse.sourceCommandSignals?.registry !== "openclaw-source-command-proposals-v0"
  || taskResponse.sourceCommandProposal?.sourceCommand?.registry !== "openclaw-source-command-proposals-v0"
  || taskResponse.sourceCommandTask?.registry !== "openclaw-source-command-task-v0"
  || taskResponse.sourceCommandTask?.workspaceTaskRegistry !== "workspace-command-task-v0"
) {
  throw new Error(`source command task envelope mismatch: ${JSON.stringify(taskResponse)}`);
}
if (
  taskResponse.sourceCommandProposal?.id !== "openclaw:typecheck"
  || taskResponse.sourceCommandProposal?.command !== "pnpm"
  || taskResponse.sourceCommandProposal?.args?.join(" ") !== "run typecheck"
  || taskResponse.sourceCommandProposal?.workspacePath !== workspaceDir
) {
  throw new Error(`source command task should reference selected source proposal: ${JSON.stringify(taskResponse.sourceCommandProposal)}`);
}
if (
  taskResponse.governance?.createsTask !== true
  || taskResponse.governance?.createsApproval !== true
  || taskResponse.governance?.canExecuteWithoutApproval !== false
  || taskResponse.governance?.executed !== false
  || taskResponse.governance?.requiresExplicitApproval !== true
  || taskResponse.governance?.exposesScriptBodies !== false
  || taskResponse.governance?.exposesPromptContent !== false
  || taskResponse.governance?.exposesSourceFileContent !== false
) {
  throw new Error(`source command task governance mismatch: ${JSON.stringify(taskResponse.governance)}`);
}
const task = taskResponse.task ?? {};
if (
  task.status !== "queued"
  || task.policy?.decision?.decision !== "require_approval"
  || task.policy?.decision?.reason !== "workspace_command_requires_explicit_user_approval"
  || task.approval?.required !== true
  || task.plan?.capabilitySummary?.ids?.includes("act.system.command.execute") !== true
) {
  throw new Error(`source command task should be queued behind explicit approval: ${JSON.stringify(task)}`);
}
if (!taskResponse.approval?.id || taskResponse.approval?.status !== "pending" || taskResponse.approval?.taskId !== task.id) {
  throw new Error(`source command task should create a linked pending approval: ${JSON.stringify(taskResponse.approval)}`);
}
if (taskResponse.sourceCommandTask?.taskId !== task.id || taskResponse.sourceCommandTask?.approvalId !== taskResponse.approval.id) {
  throw new Error(`source command task metadata should link task and approval: ${JSON.stringify(taskResponse.sourceCommandTask)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block instead of executing source command task: ${JSON.stringify(blockedStep)}`);
}
if (blockedStep.task?.id !== task.id || blockedStep.approval?.id !== taskResponse.approval.id) {
  throw new Error(`blocked operator step should point at source command task approval: ${JSON.stringify(blockedStep)}`);
}
if (pending.items?.length !== 1 || pending.items[0].id !== taskResponse.approval.id) {
  throw new Error(`approval inbox should contain source command pending approval: ${JSON.stringify(pending.items)}`);
}
if (tasksAfter.summary?.counts?.total !== (tasksBefore.summary?.counts?.total ?? 0) + 1) {
  throw new Error(`source command task should create one task: ${JSON.stringify({ before: tasksBefore.summary, after: tasksAfter.summary })}`);
}
if (
  approvalsAfter.summary?.counts?.total !== (approvalsBefore.summary?.counts?.total ?? 0) + 1
  || approvalsAfter.summary?.counts?.pending !== (approvalsBefore.summary?.counts?.pending ?? 0) + 1
) {
  throw new Error(`source command task should create one pending approval: ${JSON.stringify({ before: approvalsBefore.summary, after: approvalsAfter.summary })}`);
}
if (commandsAfter.summary?.total !== commandsBefore.summary?.total) {
  throw new Error(`source command task must not execute command before approval: ${JSON.stringify({ before: commandsBefore.summary, after: commandsAfter.summary })}`);
}
for (const secret of [
  promptSecret,
  "source-command-task-secret-dev",
  "source-command-task-secret-test",
  "source-command-task-secret-typecheck",
  "SOURCE_COMMAND_TASK_TOOL_SECRET_DO_NOT_LEAK",
]) {
  if (rawTask.includes(secret)) {
    throw new Error(`source command task response leaked body content: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawSourceCommandTask: {
    registry: taskResponse.registry,
    mode: taskResponse.mode,
    sourceRegistry: taskResponse.sourceRegistry,
    proposal: taskResponse.sourceCommandProposal.id,
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
      "POST /plugins/native-adapter/source-command-proposals/tasks",
    ],
  },
}, null, 2));
EOF
