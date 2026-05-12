#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-command-recovery-fixture"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-7800}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-7801}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-7802}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-7803}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-7804}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-7805}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-7806}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-7807}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-7870}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="${OPENCLAW_SYSTEM_COMMAND_ALLOWLIST:-false,printf}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-command-recovery-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-command-recovery-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${RECOVERY_PLAN_FILE:-}" \
    "${RECOVERY_STEP_FILE:-}" \
    "${FAIL_PLAN_FILE:-}" \
    "${FAIL_STEP_FILE:-}" \
    "${HISTORY_FILE:-}" \
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

RECOVERY_PLAN_FILE="$(mktemp)"
RECOVERY_STEP_FILE="$(mktemp)"
FAIL_PLAN_FILE="$(mktemp)"
FAIL_STEP_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Sovereign body recovers from a failing command branch\",\"type\":\"system_task\",\"policy\":{\"intent\":\"system.command.execute\"},\"actions\":[{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"onFailure\":\"continue\",\"params\":{\"command\":\"false\",\"args\":[],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"when\":{\"previousExitCode\":1},\"params\":{\"command\":\"printf\",\"args\":[\"recovered-from-exit\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"when\":{\"previousExitCode\":99},\"params\":{\"command\":\"printf\",\"args\":[\"should-not-run\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}}]}" > "$RECOVERY_PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERY_STEP_FILE"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Sovereign body fails command task without recovery policy\",\"type\":\"system_task\",\"policy\":{\"intent\":\"system.command.execute\"},\"actions\":[{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"params\":{\"command\":\"false\",\"args\":[],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"params\":{\"command\":\"printf\",\"args\":[\"should-not-run-after-failure\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}}]}" > "$FAIL_PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$FAIL_STEP_FILE"

curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=160" > "$EVENTS_FILE"

node - <<'EOF' "$RECOVERY_PLAN_FILE" "$RECOVERY_STEP_FILE" "$FAIL_PLAN_FILE" "$FAIL_STEP_FILE" "$HISTORY_FILE" "$EVENTS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const recoveryPlan = readJson(2);
const recoveryStep = readJson(3);
const failPlan = readJson(4);
const failStep = readJson(5);
const history = readJson(6);
const events = readJson(7);

const recoveryActions = (recoveryPlan.plan?.steps ?? []).filter((item) => item.kind === "system.command.execute");
if (recoveryActions.length !== 3 || recoveryActions[0].onFailure !== "continue" || recoveryActions[1].when?.previousExitCode !== 1) {
  throw new Error(`recovery plan should preserve onFailure and exit-code branch metadata: ${JSON.stringify(recoveryActions)}`);
}
if (!recoveryStep.ok || recoveryStep.ran !== true || recoveryStep.task?.status !== "completed") {
  throw new Error(`operator should complete the recovered command task: ${JSON.stringify(recoveryStep.task)}`);
}
const recoveryTranscript = recoveryStep.execution?.commandTranscript ?? [];
if (recoveryTranscript.length !== 3) {
  throw new Error(`expected recovered transcript with failed, recovered, and skipped entries: ${JSON.stringify(recoveryTranscript)}`);
}
if (recoveryTranscript[0].command !== "false" || recoveryTranscript[0].exitCode !== 1 || recoveryTranscript[0].skipped === true) {
  throw new Error(`first recovery command should record exit code 1 without skipping: ${JSON.stringify(recoveryTranscript[0])}`);
}
if (recoveryTranscript[1].command !== "printf" || recoveryTranscript[1].stdout !== "recovered-from-exit") {
  throw new Error(`second recovery command should branch from previous exit code: ${JSON.stringify(recoveryTranscript[1])}`);
}
if (recoveryTranscript[2].skipped !== true || recoveryTranscript[2].skipReason !== "previous_exit_code_mismatch") {
  throw new Error(`third recovery command should be skipped by exit-code mismatch: ${JSON.stringify(recoveryTranscript[2])}`);
}

const failActions = (failPlan.plan?.steps ?? []).filter((item) => item.kind === "system.command.execute");
if (failActions.length !== 2 || failActions[0].onFailure !== null) {
  throw new Error(`default failure plan should not opt into recovery continuation: ${JSON.stringify(failActions)}`);
}
if (!failStep.ok || failStep.ran !== true || failStep.task?.status !== "failed") {
  throw new Error(`operator should fail unrecovered command task: ${JSON.stringify(failStep.task)}`);
}
const failTranscript = failStep.execution?.commandTranscript ?? [];
if (failTranscript.length !== 1 || failTranscript[0].command !== "false" || failTranscript[0].exitCode !== 1) {
  throw new Error(`failed task should persist only the failing command transcript: ${JSON.stringify(failTranscript)}`);
}
if (!String(failStep.task?.outcome?.reason ?? "").includes("exit code 1")) {
  throw new Error(`failed task should explain the non-zero exit code: ${JSON.stringify(failStep.task?.outcome)}`);
}

const invocationItems = history.items ?? [];
if (history.summary?.total !== 3 || history.summary?.invoked !== 3 || history.summary?.byCapability?.["act.system.command.execute"] !== 3) {
  throw new Error(`capability history should include three actual command invocations: ${JSON.stringify(history.summary)}`);
}
if (invocationItems.some((item) => item.blocked === true || item.summary?.kind !== "command.execute")) {
  throw new Error(`command recovery should be autonomous and audited, not approval-blocked: ${JSON.stringify(invocationItems)}`);
}

const eventTypes = (events.items ?? []).map((event) => event.type);
const executedCount = eventTypes.filter((type) => type === "system.command.executed").length;
if (executedCount !== 3 || !eventTypes.includes("task.completed") || !eventTypes.includes("task.failed")) {
  throw new Error(`audit should record three command executions plus completion and failure: ${JSON.stringify(eventTypes)}`);
}

console.log(JSON.stringify({
  sovereignCommandRecovery: {
    recoveredTask: {
      status: recoveryStep.task?.status ?? null,
      transcript: recoveryTranscript.map((entry) => ({
        command: entry.command,
        exitCode: entry.exitCode,
        skipped: entry.skipped === true,
        skipReason: entry.skipReason ?? null,
        stdout: entry.stdout,
      })),
    },
    failedTask: {
      status: failStep.task?.status ?? null,
      reason: failStep.task?.outcome?.reason ?? null,
      transcript: failTranscript.map((entry) => ({
        command: entry.command,
        exitCode: entry.exitCode,
      })),
    },
    history: history.summary,
    audit: {
      systemCommandExecuted: executedCount,
      taskCompleted: eventTypes.includes("task.completed"),
      taskFailed: eventTypes.includes("task.failed"),
    },
  },
}, null, 2));
EOF
