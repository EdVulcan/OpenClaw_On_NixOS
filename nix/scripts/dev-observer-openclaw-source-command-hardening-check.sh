#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-source-command-hardening-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9890}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9891}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9892}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9893}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9894}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9895}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9896}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9897}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9960}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="npm"
export OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS="15000"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-source-command-hardening-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-source-command-hardening-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$TOOLS_DIR" "$DOCS_TOOLS_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

write_package_json() {
  local script_body="$1"
  cat > "$WORKSPACE_DIR/package.json" <<JSON
{
  "name": "openclaw",
  "private": true,
  "scripts": {
    "typecheck": "$script_body"
  }
}
JSON
}

write_package_json 'node -e \"process.stderr.write('\''observer-source-command-hardening-fail'\''); process.exit(7)\"'
cat > "$WORKSPACE_DIR/package-lock.json" <<'JSON'
{"name":"openclaw","lockfileVersion":3,"requires":true,"packages":{"":{"name":"openclaw"}}}
JSON
cat > "$WORKSPACE_DIR/TOOLS.md" <<'MD'
# Tools
Observer hardening for source-derived command approval and recovery chains.
MD
cat > "$DOCS_TOOLS_DIR/command-runner.md" <<'MD'
# Command Runner
Observer visibility for hardened source-derived command recovery chains.
MD
cat > "$TOOLS_DIR/command-tool.ts" <<'TS'
export function observerSourceCommandHardeningTool() {
  return { kind: "observer-source-command-hardening" };
}
TS
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createObserverSourceCommandHardeningContract() {
  return { capabilityId: "observer-source-command-hardening" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type ObserverSourceCommandHardeningManifest = { pluginId: string };
TS

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${TASK_FILE:-}" "${BLOCKED_STEP_FILE:-}" "${APPROVED_FILE:-}" "${DUP_APPROVE_FILE:-}" "${DUP_DENY_FILE:-}" "${FAIL_STEP_FILE:-}" "${RECOVERED_ONE_FILE:-}" "${DUP_RECOVERY_FILE:-}" "${RECOVERED_ONE_APPROVED_FILE:-}" "${RECOVERED_ONE_FAIL_FILE:-}" "${RECOVERED_TWO_FILE:-}" "${RECOVERED_TWO_APPROVED_FILE:-}" "${RECOVERED_TWO_STEP_FILE:-}" "${FINAL_TASKS_FILE:-}" "${FINAL_APPROVALS_FILE:-}" "${FINAL_TRANSCRIPTS_FILE:-}" "${FINAL_HISTORY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  curl --silent --fail -X POST "$1" -H 'content-type: application/json' -d "$2"
}

post_json_status() {
  curl --silent --output "$3" --write-out "%{http_code}" -X POST "$1" -H 'content-type: application/json' -d "$2"
}

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_STEP_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
DUP_APPROVE_FILE="$(mktemp)"
DUP_DENY_FILE="$(mktemp)"
FAIL_STEP_FILE="$(mktemp)"
RECOVERED_ONE_FILE="$(mktemp)"
DUP_RECOVERY_FILE="$(mktemp)"
RECOVERED_ONE_APPROVED_FILE="$(mktemp)"
RECOVERED_ONE_FAIL_FILE="$(mktemp)"
RECOVERED_TWO_FILE="$(mktemp)"
RECOVERED_TWO_APPROVED_FILE="$(mktemp)"
RECOVERED_TWO_STEP_FILE="$(mktemp)"
FINAL_TASKS_FILE="$(mktemp)"
FINAL_APPROVALS_FILE="$(mktemp)"
FINAL_TRANSCRIPTS_FILE="$(mktemp)"
FINAL_HISTORY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

post_json "$CORE_URL/plugins/native-adapter/source-command-proposals/tasks" '{"proposalId":"openclaw:typecheck","query":"command","confirm":true}' > "$TASK_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_STEP_FILE"

approval_id="$(node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$TASK_FILE" "$BLOCKED_STEP_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const blockedStep = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
for (const token of [
  "source-command-task-button",
  "approve-latest-button",
  "deny-latest-button",
  "recover-latest-failed-task-button",
  "recover-selected-task-button",
  "command-ledger-json",
  "capability-history-json",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer hardening HTML missing ${token}`);
  }
}
for (const token of [
  "createSourceCommandApprovalTask",
  "/plugins/native-adapter/source-command-proposals/tasks",
  "resolveLatestApproval",
  "resolveLatestApproval(\"deny\")",
  "recoverLatestFailedTask",
  "recoverSelectedTask",
  "task.recovered",
  "approval.denied",
  "system.command.executed",
  "refreshCommandLedger",
  "refreshCapabilityHistory",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer hardening client missing ${token}`);
  }
}
if (!taskResponse.ok || taskResponse.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`observer hardening should create source command task: ${JSON.stringify(taskResponse)}`);
}
if (!blockedStep.approval?.id || blockedStep.approval.id !== taskResponse.approval?.id) {
  throw new Error(`blocked step should expose source task approval: ${JSON.stringify(blockedStep)}`);
}
process.stdout.write(blockedStep.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-observer-openclaw-source-command-hardening-check","reason":"approve first failing observer source command"}' > "$APPROVED_FILE"
dup_approve_status="$(post_json_status "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-observer-openclaw-source-command-hardening-check"}' "$DUP_APPROVE_FILE")"
dup_deny_status="$(post_json_status "$CORE_URL/approvals/$approval_id/deny" '{"deniedBy":"dev-observer-openclaw-source-command-hardening-check"}' "$DUP_DENY_FILE")"
post_json "$CORE_URL/operator/step" '{}' > "$FAIL_STEP_FILE"

failed_task_id="$(node - <<'EOF' "$DUP_APPROVE_FILE" "$DUP_DENY_FILE" "$FAIL_STEP_FILE" "$dup_approve_status" "$dup_deny_status"
const fs = require("node:fs");
const duplicateApprove = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const duplicateDeny = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const failStep = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const duplicateApproveStatus = process.argv[5];
const duplicateDenyStatus = process.argv[6];
if (duplicateApproveStatus !== "409" || !String(duplicateApprove.error ?? "").includes("approved")) {
  throw new Error(`duplicate observer source approve should return 409: ${JSON.stringify({ duplicateApproveStatus, duplicateApprove })}`);
}
if (duplicateDenyStatus !== "409" || !String(duplicateDeny.error ?? "").includes("approved")) {
  throw new Error(`deny after observer source approval should return 409: ${JSON.stringify({ duplicateDenyStatus, duplicateDeny })}`);
}
if (!failStep.ok || failStep.ran !== true || failStep.task?.status !== "failed" || failStep.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0" || failStep.task?.restorable !== true) {
  throw new Error(`approved observer source fixture command should fail as recoverable: ${JSON.stringify(failStep)}`);
}
process.stdout.write(failStep.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$failed_task_id/recover" '{}' > "$RECOVERED_ONE_FILE"
dup_recovery_status="$(post_json_status "$CORE_URL/tasks/$failed_task_id/recover" '{}' "$DUP_RECOVERY_FILE")"

recovered_one_approval_id="$(node - <<'EOF' "$FAIL_STEP_FILE" "$RECOVERED_ONE_FILE" "$DUP_RECOVERY_FILE" "$dup_recovery_status"
const fs = require("node:fs");
const failStep = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recoveredOne = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const duplicateRecovery = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const duplicateRecoveryStatus = process.argv[5];
if (!recoveredOne.ok || recoveredOne.task?.status !== "queued" || recoveredOne.task?.recovery?.attempt !== 1 || recoveredOne.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`first observer source recovery should preserve provenance: ${JSON.stringify(recoveredOne)}`);
}
if (recoveredOne.task?.recovery?.recoveredFromTaskId !== failStep.task?.id) {
  throw new Error(`first observer source recovery should link to failed source: ${JSON.stringify(recoveredOne.task?.recovery)}`);
}
if (duplicateRecoveryStatus !== "409" || duplicateRecovery.recoveredByTaskId !== recoveredOne.task?.id) {
  throw new Error(`duplicate observer source recovery should return existing recovery as 409: ${JSON.stringify({ duplicateRecoveryStatus, duplicateRecovery })}`);
}
process.stdout.write(recoveredOne.task.approval.requestId);
EOF
)"

post_json "$CORE_URL/approvals/$recovered_one_approval_id/approve" '{"approvedBy":"dev-observer-openclaw-source-command-hardening-check","reason":"approve first observer source recovery, still failing"}' > "$RECOVERED_ONE_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_ONE_FAIL_FILE"

recovered_one_task_id="$(node - <<'EOF' "$RECOVERED_ONE_FILE" "$RECOVERED_ONE_FAIL_FILE"
const fs = require("node:fs");
const recoveredOne = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recoveredOneFail = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (!recoveredOneFail.ok || recoveredOneFail.ran !== true || recoveredOneFail.task?.status !== "failed" || recoveredOneFail.task?.id !== recoveredOne.task?.id || recoveredOneFail.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`first observer source recovery should fail and remain recoverable: ${JSON.stringify(recoveredOneFail)}`);
}
process.stdout.write(recoveredOneFail.task.id);
EOF
)"

post_json "$CORE_URL/tasks/$recovered_one_task_id/recover" '{}' > "$RECOVERED_TWO_FILE"
write_package_json 'node -e \"process.stdout.write('\''observer-source-command-hardening-ok'\'')\"'

recovered_two_approval_id="$(node - <<'EOF' "$RECOVERED_ONE_FAIL_FILE" "$RECOVERED_TWO_FILE"
const fs = require("node:fs");
const recoveredOneFail = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const recoveredTwo = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (!recoveredTwo.ok || recoveredTwo.task?.status !== "queued" || recoveredTwo.task?.recovery?.attempt !== 2 || recoveredTwo.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`second observer source recovery should preserve provenance: ${JSON.stringify(recoveredTwo)}`);
}
if (recoveredTwo.task?.recovery?.recoveredFromTaskId !== recoveredOneFail.task?.id) {
  throw new Error(`second observer source recovery should link to first recovery failure: ${JSON.stringify(recoveredTwo.task?.recovery)}`);
}
process.stdout.write(recoveredTwo.task.approval.requestId);
EOF
)"

post_json "$CORE_URL/approvals/$recovered_two_approval_id/approve" '{"approvedBy":"dev-observer-openclaw-source-command-hardening-check","reason":"approve second observer source recovery after fixture repair"}' > "$RECOVERED_TWO_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERED_TWO_STEP_FILE"
curl --silent --fail "$CORE_URL/tasks?limit=8" > "$FINAL_TASKS_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$FINAL_APPROVALS_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$FINAL_TRANSCRIPTS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.command.execute&limit=8" > "$FINAL_HISTORY_FILE"

node - <<'EOF' "$FAIL_STEP_FILE" "$RECOVERED_ONE_FAIL_FILE" "$RECOVERED_TWO_STEP_FILE" "$FINAL_TASKS_FILE" "$FINAL_APPROVALS_FILE" "$FINAL_TRANSCRIPTS_FILE" "$FINAL_HISTORY_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const failStep = readJson(2);
const recoveredOneFail = readJson(3);
const recoveredTwoStep = readJson(4);
const tasks = readJson(5);
const approvals = readJson(6);
const transcripts = readJson(7);
const history = readJson(8);
if (!recoveredTwoStep.ok || recoveredTwoStep.ran !== true || recoveredTwoStep.task?.status !== "completed" || recoveredTwoStep.task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
  throw new Error(`second observer source recovery should complete: ${JSON.stringify(recoveredTwoStep)}`);
}
if (!String(recoveredTwoStep.execution?.commandTranscript?.[0]?.stdout ?? "").includes("observer-source-command-hardening-ok")) {
  throw new Error(`second observer source recovery should capture repaired stdout: ${JSON.stringify(recoveredTwoStep.execution?.commandTranscript?.[0])}`);
}
const source = (tasks.items ?? []).find((task) => task.id === failStep.task?.id);
const recoveredOne = (tasks.items ?? []).find((task) => task.id === recoveredOneFail.task?.id);
const recoveredTwo = (tasks.items ?? []).find((task) => task.id === recoveredTwoStep.task?.id);
for (const task of [source, recoveredOne, recoveredTwo]) {
  if (task?.sourceCommand?.registry !== "openclaw-source-command-task-v0") {
    throw new Error(`observer source command provenance should survive hardening chain: ${JSON.stringify(task)}`);
  }
}
if (tasks.summary?.counts?.failed !== 2 || tasks.summary?.counts?.completed !== 1 || tasks.summary?.counts?.active !== 0) {
  throw new Error(`observer task summary should show two failed source links and one completed recovery: ${JSON.stringify(tasks.summary)}`);
}
if (approvals.summary?.counts?.approved !== 3 || approvals.summary?.counts?.pending !== 0) {
  throw new Error(`observer approval summary should show three approved source gates and no pending approvals: ${JSON.stringify(approvals.summary)}`);
}
if (transcripts.summary?.total !== 3 || transcripts.summary?.failed !== 2 || transcripts.summary?.executed !== 1 || !(transcripts.items ?? []).every((item) => item.sourceCommand?.registry === "openclaw-source-command-task-v0")) {
  throw new Error(`observer transcript ledger should show three source command invocations with provenance: ${JSON.stringify(transcripts)}`);
}
if (history.summary?.total !== 3 || history.summary?.invoked !== 3 || history.summary?.blocked !== 0) {
  throw new Error(`observer capability history should show exactly three governed source invocations: ${JSON.stringify(history.summary)}`);
}
console.log(JSON.stringify({
  observerOpenClawSourceCommandHardening: {
    duplicateApprovalClicks: "approve/deny after resolution return 409",
    duplicateRecovery: "a source command task can materialize one direct recovery task",
    recoveryChain: [
      { id: source.id, status: source.status, recoveredByTaskId: source.recoveredByTaskId },
      { id: recoveredOne.id, status: recoveredOne.status, attempt: recoveredOne.recovery?.attempt, recoveredByTaskId: recoveredOne.recoveredByTaskId },
      { id: recoveredTwo.id, status: recoveredTwo.status, attempt: recoveredTwo.recovery?.attempt, recoveredFromTaskId: recoveredTwo.recovery?.recoveredFromTaskId },
    ],
    summaries: {
      tasks: tasks.summary?.counts ?? null,
      approvals: approvals.summary ?? null,
      transcripts: transcripts.summary ?? null,
      capabilityHistory: history.summary ?? null,
    },
  },
}, null, 2));
EOF
