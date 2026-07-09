#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-native-engineering-verification-evidence-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PROMPT_SECRET="ENGINEERING_VERIFICATION_EVIDENCE_PROMPT_SECRET_DO_NOT_LEAK"
TOOL_SECRET="ENGINEERING_VERIFICATION_EVIDENCE_TOOL_SECRET_DO_NOT_LEAK"

source "$SCRIPT_DIR/openclaw-engineering-verification-evidence-fixture.sh"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10060}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10061}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10062}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10063}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10064}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10065}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10066}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10067}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10068}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-engineering-verification-evidence-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-engineering-verification-evidence-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
prepare_engineering_verification_evidence_fixture "$WORKSPACE_DIR" "$PROMPT_SECRET" "$TOOL_SECRET"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${TASK_FILE:-}" \
    "${BLOCKED_FILE:-}" \
    "${APPROVED_FILE:-}" \
    "${STEP_FILE:-}" \
    "${TRANSCRIPTS_FILE:-}" \
    "${EVIDENCE_FILE:-}" \
    "${GENERIC_EVIDENCE_FILE:-}" \
    "${ADAPTER_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

OPENCLAW_POST_JSON_DATA_FLAG="-d"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"

"$SCRIPT_DIR/dev-up.sh"

TASK_FILE="$(mktemp)"
BLOCKED_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
TRANSCRIPTS_FILE="$(mktemp)"
EVIDENCE_FILE="$(mktemp)"
GENERIC_EVIDENCE_FILE="$(mktemp)"
ADAPTER_FILE="$(mktemp)"

post_json "$CORE_URL/plugins/native-adapter/source-command-proposals/tasks" '{"proposalId":"openclaw:typecheck","query":"verify","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_FILE"

read -r approval_id task_id < <(node - <<'EOF' "$TASK_FILE" "$BLOCKED_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blocked = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!taskResponse.ok || taskResponse.registry !== "openclaw-source-command-task-v0" || taskResponse.task?.status !== "queued") {
  throw new Error(`source command task should be queued behind approval: ${JSON.stringify(taskResponse)}`);
}
if (!blocked.ok || blocked.ran !== false || blocked.blocked !== true || blocked.reason !== "policy_requires_approval") {
  throw new Error(`operator should block before approval: ${JSON.stringify(blocked)}`);
}
if (!blocked.approval?.id || blocked.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose matching approval: ${JSON.stringify(blocked.approval)}`);
}
process.stdout.write(`${blocked.approval.id} ${taskResponse.task.id}\n`);
EOF
)

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-openclaw-native-engineering-verification-evidence-check","reason":"approve verification evidence fixture command"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=10" > "$TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/engineering-verification/evidence?taskId=$task_id&maxOutputChars=1000" > "$EVIDENCE_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/engineering-verification/evidence?limit=8&maxOutputChars=1000" > "$GENERIC_EVIDENCE_FILE"
curl --silent --fail "$CORE_URL/plugins/openclaw-native-plugin-adapter" > "$ADAPTER_FILE"

node - <<'EOF' "$TASK_FILE" "$APPROVED_FILE" "$STEP_FILE" "$TRANSCRIPTS_FILE" "$EVIDENCE_FILE" "$GENERIC_EVIDENCE_FILE" "$ADAPTER_FILE" "$WORKSPACE_DIR" "$PROMPT_SECRET" "$TOOL_SECRET"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const taskResponse = readJson(2);
const approved = readJson(3);
const step = readJson(4);
const transcripts = readJson(5);
const evidence = readJson(6);
const genericEvidence = readJson(7);
const adapter = readJson(8);
const workspaceDir = process.argv[9];
const promptSecret = process.argv[10];
const toolSecret = process.argv[11];
const raw = JSON.stringify({ taskResponse, step, transcripts, evidence, genericEvidence, adapter });

if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`approval should enable audited command execution: ${JSON.stringify(approved)}`);
}
if (!step.ok || step.ran !== true || step.blocked !== false || step.task?.status !== "completed") {
  throw new Error(`approved verification fixture should complete: ${JSON.stringify(step)}`);
}
if (!String(step.execution?.commandTranscript?.[0]?.stdout ?? "").includes("engineering-verification-evidence-ok")) {
  throw new Error(`execution transcript should contain verification output: ${JSON.stringify(step.execution?.commandTranscript)}`);
}
if (transcripts.items?.[0]?.taskId !== taskResponse.task?.id || transcripts.items?.[0]?.command !== "npm") {
  throw new Error(`command ledger should reference completed task: ${JSON.stringify(transcripts.items?.[0])}`);
}
if (
  !evidence.ok
  || evidence.registry !== "openclaw-native-engineering-verification-evidence-v0"
  || evidence.mode !== "completed-command-transcript-verification-evidence"
  || evidence.sourceCapability?.sourceToolName !== "cc_verify"
  || evidence.capability?.id !== "sense.openclaw.engineering_tool.verify_evidence"
  || evidence.summary?.total !== 1
  || evidence.summary?.passed !== 1
  || evidence.summary?.attachedToCompletedTasks !== 1
  || evidence.governance?.canExecuteCommand !== false
  || evidence.governance?.canCreateTask !== false
  || evidence.governance?.canCreateApproval !== false
  || evidence.bounds?.noCommandExecution !== true
  || evidence.auditEvidence?.operation !== "verification_evidence"
) {
  throw new Error(`verification evidence mismatch: ${JSON.stringify(evidence)}`);
}
const item = evidence.evidence?.[0];
if (
  item?.taskId !== taskResponse.task?.id
  || item.ok !== true
  || item.commandShape?.command !== "npm"
  || item.commandShape?.cwd !== workspaceDir
  || item.result?.exitCode !== 0
  || item.result?.timedOut !== false
  || !String(item.result?.stdout ?? "").includes("engineering-verification-evidence-ok")
  || item.attachment?.attachedToTaskCompletion !== true
  || item.retryPolicy?.maxRetries !== 0
) {
  throw new Error(`verification evidence item mismatch: ${JSON.stringify(item)}`);
}
if (genericEvidence.summary?.total < 1 || genericEvidence.evidence?.[0]?.taskId !== taskResponse.task?.id) {
  throw new Error(`generic verification evidence should include latest command transcript: ${JSON.stringify(genericEvidence)}`);
}
if (
  !adapter.implementedCapabilities?.includes("sense.openclaw.engineering_tool.verify_evidence")
  || adapter.summary?.canReadEngineeringVerificationEvidence !== true
) {
  throw new Error(`native adapter missing verification evidence capability: ${JSON.stringify(adapter)}`);
}
for (const secret of [promptSecret, toolSecret]) {
  if (raw.includes(secret)) {
    throw new Error(`verification evidence leaked prompt/tool content: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawNativeEngineeringVerificationEvidence: {
    registry: evidence.registry,
    taskId: taskResponse.task.id,
    passed: evidence.summary.passed,
    attached: evidence.summary.attachedToCompletedTasks,
    command: item.commandShape.command,
  },
}, null, 2));
EOF
