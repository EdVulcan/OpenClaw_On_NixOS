#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-native-acpx-codex-bridge-compatibility-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10220}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10221}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10222}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10223}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10224}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10225}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10226}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10227}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10228}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-native-acpx-codex-bridge-compatibility-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-native-acpx-codex-bridge-compatibility-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

OPENCLAW_POST_JSON_DATA_FLAG="-d"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-wait-helper.sh"

state_has_acpx_records() {
  node - <<'EOF' "$OPENCLAW_CORE_STATE_FILE"
const fs = require("node:fs");
const file = process.argv[2];
if (!fs.existsSync(file)) {
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, "utf8"));
process.exit((data.acpxBridgeSessionRecords ?? []).length === 2 ? 0 : 1);
EOF
}

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${INITIAL_FILE:-}" \
    "${FIRST_FILE:-}" \
    "${SECOND_FILE:-}" \
    "${OVERWRITE_FILE:-}" \
    "${BEFORE_RESTART_FILE:-}" \
    "${DRAFT_FILE:-}" \
    "${TASK_FILE:-}" \
    "${BLOCKED_FILE:-}" \
    "${APPROVED_FILE:-}" \
    "${STEP_FILE:-}" \
    "${TASK_STATE_FILE:-}" \
    "${AFTER_RESTART_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh" >/dev/null

INITIAL_FILE="$(mktemp)"
FIRST_FILE="$(mktemp)"
SECOND_FILE="$(mktemp)"
OVERWRITE_FILE="$(mktemp)"
BEFORE_RESTART_FILE="$(mktemp)"
DRAFT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
TASK_STATE_FILE="$(mktemp)"
AFTER_RESTART_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/plugins/native-adapter/acpx-codex-bridge-compatibility?sessionKey=agent:codex:missing" > "$INITIAL_FILE"
post_json "$CORE_URL/plugins/native-adapter/acpx-codex-session-records" '{"sessionKey":"agent:codex:one","agentId":"codex","recordId":"record-one","metadata":{"purpose":"first","authToken":"ACPX_CODEX_SECRET_TOKEN_SHOULD_NOT_LEAK"},"confirm":true}' > "$FIRST_FILE"
post_json "$CORE_URL/plugins/native-adapter/acpx-codex-session-records" '{"sessionKey":"agent:codex:two","agentId":"codex","recordId":"record-two","metadata":{"purpose":"second"},"confirm":true}' > "$SECOND_FILE"
post_json "$CORE_URL/plugins/native-adapter/acpx-codex-session-records" '{"sessionKey":"agent:codex:one","agentId":"codex","recordId":"record-one-updated","metadata":{"purpose":"updated","password":"ACPX_CODEX_SECRET_PASSWORD_SHOULD_NOT_LEAK"},"confirm":true}' > "$OVERWRITE_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/acpx-codex-bridge-compatibility?sessionKey=agent:codex:one" > "$BEFORE_RESTART_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/acpx-codex-bridge-wrapper-draft?sessionKey=agent:codex:one&command=npx.cmd&wrapperName=codex-acp-one" > "$DRAFT_FILE"

node - <<'EOF' "$INITIAL_FILE" "$FIRST_FILE" "$SECOND_FILE" "$OVERWRITE_FILE" "$BEFORE_RESTART_FILE" "$DRAFT_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const initial = readJson(2);
const first = readJson(3);
const second = readJson(4);
const overwrite = readJson(5);
const before = readJson(6);
const draft = readJson(7);
const raw = JSON.stringify({ initial, first, second, overwrite, before, draft });

if (
  !initial.ok
  || initial.registry !== "openclaw-native-acpx-codex-bridge-compatibility-v0"
  || initial.compatibility?.posixCommand !== "npx"
  || initial.compatibility?.windowsCommandLesson !== "npx.cmd"
  || initial.authIsolation?.authJsonRead !== false
  || initial.authIsolation?.credentialValueRead !== false
  || initial.governance?.canReadCredentialValue !== false
  || initial.governance?.canCopyAuthMaterial !== false
  || initial.governance?.canWriteWrapper !== false
  || initial.governance?.canSpawnCodexAcp !== false
  || initial.governance?.observerVisible !== true
  || initial.governance?.observerVisibilityDeferred !== false
  || initial.persistence?.missingSessionReturnsNull !== true
) {
  throw new Error(`initial ACPX/Codex bridge compatibility mismatch: ${JSON.stringify(initial)}`);
}
if (!first.ok || first.summary?.created !== true || first.session?.revision !== 1) {
  throw new Error(`first ACPX/Codex session record should be created: ${JSON.stringify(first)}`);
}
if (!second.ok || second.summary?.created !== true || second.session?.sessionKey !== "agent:codex:two") {
  throw new Error(`second ACPX/Codex session record should be independent: ${JSON.stringify(second)}`);
}
if (
  !overwrite.ok
  || overwrite.summary?.overwritten !== true
  || overwrite.session?.revision !== 2
  || overwrite.session?.acpxRecordId !== "record-one-updated"
  || overwrite.session?.metadata?.password !== "[redacted-key]"
) {
  throw new Error(`ACPX/Codex session overwrite mismatch: ${JSON.stringify(overwrite)}`);
}
if (
  before.persistence?.totalRecords !== 2
  || before.persistence?.selectedRecord?.acpxRecordId !== "record-one-updated"
  || before.persistence?.selectedRecord?.revision !== 2
  || before.persistence?.supportsIndependentSessions !== true
  || before.persistence?.supportsOverwrite !== true
) {
  throw new Error(`ACPX/Codex bridge persistence readback mismatch: ${JSON.stringify(before)}`);
}
if (
  !draft.ok
  || draft.registry !== "openclaw-native-acpx-codex-bridge-wrapper-draft-v0"
  || draft.proposal?.status !== "ready_for_approval_bridge"
  || draft.summary?.readyForApprovalBridge !== true
  || draft.proposal?.wrapper?.relativePath !== ".openclaw/acpx/codex-bridge/codex-acp-one.sh"
  || draft.proposal?.wrapper?.wrapperWritten !== false
  || draft.proposal?.command?.command !== "npx.cmd"
  || draft.proposal?.command?.commandExecuted !== false
  || draft.proposal?.command?.processSpawned !== false
  || draft.proposal?.authIsolation?.credentialValueRead !== false
  || draft.governance?.createsTask !== false
  || draft.governance?.createsApproval !== false
  || draft.governance?.canReadCredentialValue !== false
  || draft.governance?.canCopyAuthMaterial !== false
  || draft.governance?.canWriteWrapper !== false
  || draft.governance?.canExecuteWrapper !== false
  || draft.governance?.canSpawnCodexAcp !== false
  || draft.governance?.canCallProvider !== false
  || draft.governance?.canUseNetwork !== false
  || draft.governance?.futureWrapperWriteRequiresApproval !== true
  || draft.governance?.futureProcessSpawnRequiresApproval !== true
) {
  throw new Error(`ACPX/Codex wrapper draft mismatch: ${JSON.stringify(draft)}`);
}
for (const secret of [
  "ACPX_CODEX_SECRET_TOKEN_SHOULD_NOT_LEAK",
  "ACPX_CODEX_SECRET_PASSWORD_SHOULD_NOT_LEAK",
]) {
  if (raw.includes(secret)) {
    throw new Error(`ACPX/Codex bridge leaked secret-like metadata: ${secret}`);
  }
}
EOF

post_json "$CORE_URL/plugins/native-adapter/acpx-codex-bridge-wrapper-tasks" '{"sessionKey":"agent:codex:one","command":"npx.cmd","wrapperName":"codex-acp-one","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blocked = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (
  !taskResponse.ok
  || taskResponse.registry !== "openclaw-native-acpx-codex-bridge-wrapper-task-v0"
  || taskResponse.task?.type !== "native_acpx_codex_bridge_wrapper_action"
  || taskResponse.governance?.createsTask !== true
  || taskResponse.governance?.createsApproval !== true
  || taskResponse.governance?.canWriteWrapper !== false
  || taskResponse.governance?.canSpawnCodexAcp !== false
) {
  throw new Error(`ACPX/Codex wrapper task response mismatch: ${JSON.stringify(taskResponse)}`);
}
if (
  !blocked.ok
  || blocked.ran !== false
  || blocked.blocked !== true
  || blocked.reason !== "policy_requires_approval"
  || blocked.approval?.id !== taskResponse.approval?.id
) {
  throw new Error(`ACPX/Codex wrapper task should block before approval: ${JSON.stringify(blocked)}`);
}
process.stdout.write(blocked.approval.id);
EOF
)"

task_id="$(node - <<'EOF' "$TASK_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
process.stdout.write(taskResponse.task.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-openclaw-native-acpx-codex-bridge-compatibility-check","reason":"Approve ACPX/Codex wrapper boundary without writing or spawning."}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/tasks/$task_id" > "$TASK_STATE_FILE"

node - <<'EOF' "$TASK_FILE" "$APPROVED_FILE" "$STEP_FILE" "$TASK_STATE_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const path = require("node:path");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const taskResponse = readJson(2);
const approved = readJson(3);
const step = readJson(4);
const taskState = readJson(5);
const workspaceDir = process.argv[6];
const execution = taskState.task?.nativeAcpxCodexBridgeWrapper?.execution;
const wrapperPath = path.join(workspaceDir, ".openclaw/acpx/codex-bridge/codex-acp-one.sh");
if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`ACPX/Codex wrapper approval should be approved and audited: ${JSON.stringify(approved)}`);
}
if (!step.ok || step.ran !== true || step.blocked !== false || step.task?.status !== "completed") {
  throw new Error(`approved ACPX/Codex wrapper task should complete as deferred: ${JSON.stringify(step)}`);
}
if (
  taskState.task?.id !== taskResponse.task?.id
  || taskState.task?.status !== "completed"
  || execution?.registry !== "openclaw-native-acpx-codex-bridge-wrapper-task-execution-v0"
  || execution.approved !== true
  || execution.wrapper?.wrapperWritten !== false
  || execution.command?.commandExecuted !== false
  || execution.command?.processSpawned !== false
  || execution.governance?.canReadCredentialValue !== false
  || execution.governance?.canCopyAuthMaterial !== false
  || execution.governance?.canWriteWrapper !== false
  || execution.governance?.canExecuteWrapper !== false
  || execution.governance?.canSpawnCodexAcp !== false
  || execution.governance?.canUseNetwork !== false
  || fs.existsSync(wrapperPath)
) {
  throw new Error(`ACPX/Codex wrapper task execution mismatch: ${JSON.stringify({ taskState, wrapperPathExists: fs.existsSync(wrapperPath) })}`);
}
EOF

openclaw_wait_until 5 0.05 state_has_acpx_records
"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null
curl --silent --fail "$CORE_URL/plugins/native-adapter/acpx-codex-bridge-compatibility?sessionKey=agent:codex:one" > "$AFTER_RESTART_FILE"

node - <<'EOF' "$AFTER_RESTART_FILE"
const fs = require("node:fs");
const after = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (
  after.persistence?.totalRecords !== 2
  || after.persistence?.selectedRecord?.sessionKey !== "agent:codex:one"
  || after.persistence?.selectedRecord?.acpxRecordId !== "record-one-updated"
  || after.persistence?.selectedRecord?.revision !== 2
  || after.governance?.canReadCredentialValue !== false
  || after.governance?.canWriteWrapper !== false
  || after.governance?.canSpawnCodexAcp !== false
) {
  throw new Error(`ACPX/Codex persisted session records should restore after restart: ${JSON.stringify(after)}`);
}

console.log(JSON.stringify({
  openclawNativeAcpxCodexBridgeCompatibility: {
    registry: after.registry,
    totalRecords: after.persistence.totalRecords,
    selectedSession: after.persistence.selectedRecord.sessionKey,
    revision: after.persistence.selectedRecord.revision,
    credentialValueRead: after.governance.canReadCredentialValue,
    wrapperWritten: after.governance.canWriteWrapper,
    processSpawned: after.governance.canSpawnCodexAcp,
  },
}, null, 2));
EOF
