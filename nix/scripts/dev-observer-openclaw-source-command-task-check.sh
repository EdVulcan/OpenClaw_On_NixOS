#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-source-command-task-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
PROMPT_SECRET="OBSERVER_SOURCE_COMMAND_TASK_PROMPT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9830}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9831}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9832}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9833}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9834}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9835}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9836}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9837}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9900}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-source-command-task-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-source-command-task-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
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
    "dev": "echo observer-source-command-task-secret-dev",
    "test": "echo observer-source-command-task-secret-test",
    "typecheck": "echo observer-source-command-task-secret-typecheck"
  }
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "packages/*"
YAML
cat > "$WORKSPACE_DIR/TOOLS.md" <<EOF
# Tools
Observer source command tasks create approvals but do not execute shell commands.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/command-runner.md" <<'MD'
# Command Runner
Expose source command task controls that remain approval-gated.
MD
cat > "$TOOLS_DIR/command-tool.ts" <<'TS'
export function observerCommandTaskTool() {
  const secret = "OBSERVER_SOURCE_COMMAND_TASK_TOOL_SECRET_DO_NOT_LEAK";
  return { kind: "observer-command-task", secret };
}
TS
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createObserverSourceCommandTaskContract() {
  return { capabilityId: "observer-source-command-task" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type ObserverSourceCommandTaskManifest = { pluginId: string };
TS

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
post_json "$CORE_URL/plugins/native-adapter/source-command-proposals/tasks" '{"proposalId":"openclaw:typecheck","query":"command","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"
curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10" > "$PENDING_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$COMMANDS_AFTER_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$COMMANDS_BEFORE_FILE" "$TASK_FILE" "$BLOCKED_STEP_FILE" "$PENDING_FILE" "$COMMANDS_AFTER_FILE" "$WORKSPACE_DIR" "$PROMPT_SECRET"
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
const promptSecret = process.argv[10];
const raw = JSON.stringify({ html, client, taskResponse });

for (const token of [
  "source-command-task-button",
  "Create Source Command Approval Task",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer source command task HTML missing ${token}`);
  }
}
for (const token of [
  "/plugins/native-adapter/source-command-proposals/tasks",
  "createSourceCommandApprovalTask",
  "proposalId: \"openclaw:typecheck\"",
  "query: \"command\"",
  "confirm: true",
  "refreshSourceCommandPlanDraft",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer source command task client missing ${token}`);
  }
}
if (!taskResponse.ok || taskResponse.registry !== "openclaw-source-command-task-v0" || taskResponse.mode !== "approval-gated-source-command") {
  throw new Error(`source command task should expose approval-gated mode: ${JSON.stringify(taskResponse)}`);
}
if (
  taskResponse.sourceCommandProposal?.id !== "openclaw:typecheck"
  || taskResponse.sourceCommandProposal?.command !== "pnpm"
  || taskResponse.sourceCommandProposal?.args?.join(" ") !== "run typecheck"
  || taskResponse.sourceCommandProposal?.workspacePath !== workspaceDir
  || taskResponse.sourceCommandPlan?.registry !== "openclaw-source-command-plan-draft-v0"
  || taskResponse.sourceCommandTask?.registry !== "openclaw-source-command-task-v0"
) {
  throw new Error(`observer source command task should reference selected source proposal: ${JSON.stringify(taskResponse)}`);
}
if (!taskResponse.approval?.id || taskResponse.approval.status !== "pending" || taskResponse.approval.taskId !== taskResponse.task?.id) {
  throw new Error(`source command task should create a pending approval: ${JSON.stringify(taskResponse.approval)}`);
}
if (
  taskResponse.task?.status !== "queued"
  || taskResponse.task?.policy?.decision?.decision !== "require_approval"
  || taskResponse.task?.approval?.required !== true
) {
  throw new Error(`source command task should be queued behind approval: ${JSON.stringify(taskResponse.task)}`);
}
if (!blockedStep.ok || blockedStep.ran !== false || blockedStep.blocked !== true || blockedStep.reason !== "policy_requires_approval") {
  throw new Error(`operator should block instead of executing source command task: ${JSON.stringify(blockedStep)}`);
}
if (pending.items?.length !== 1 || pending.items[0].id !== taskResponse.approval.id) {
  throw new Error(`approval inbox should expose source command approval: ${JSON.stringify(pending.items)}`);
}
if (commandsAfter.summary?.total !== commandsBefore.summary?.total) {
  throw new Error(`observer-created source command task must not execute command before approval: ${JSON.stringify({ before: commandsBefore.summary, after: commandsAfter.summary })}`);
}
for (const secret of [
  promptSecret,
  "observer-source-command-task-secret-dev",
  "observer-source-command-task-secret-test",
  "observer-source-command-task-secret-typecheck",
  "OBSERVER_SOURCE_COMMAND_TASK_TOOL_SECRET_DO_NOT_LEAK",
]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer source command task leaked body content: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawSourceCommandTask: {
    htmlControls: [
      "source-command-task-button",
      "Create Source Command Approval Task",
    ],
    clientApis: [
      "POST /plugins/native-adapter/source-command-proposals/tasks",
      "createSourceCommandApprovalTask",
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
