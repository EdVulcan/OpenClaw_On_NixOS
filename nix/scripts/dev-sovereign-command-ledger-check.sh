#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-command-ledger-fixture"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8000}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8001}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8002}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8003}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8004}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8005}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8006}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8007}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8070}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="${OPENCLAW_SYSTEM_COMMAND_ALLOWLIST:-false,printf}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-command-ledger-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-command-ledger-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

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
    "${LEDGER_BEFORE_FILE:-}" \
    "${SUMMARY_BEFORE_FILE:-}" \
    "${LEDGER_AFTER_FILE:-}" \
    "${SUMMARY_AFTER_FILE:-}"
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
LEDGER_BEFORE_FILE="$(mktemp)"
SUMMARY_BEFORE_FILE="$(mktemp)"
LEDGER_AFTER_FILE="$(mktemp)"
SUMMARY_AFTER_FILE="$(mktemp)"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Ledger records recovered command transcript\",\"type\":\"system_task\",\"policy\":{\"intent\":\"system.command.execute\"},\"actions\":[{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"onFailure\":\"continue\",\"params\":{\"command\":\"false\",\"args\":[],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"when\":{\"previousExitCode\":1},\"params\":{\"command\":\"printf\",\"args\":[\"ledger-recovered\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"when\":{\"previousExitCode\":99},\"params\":{\"command\":\"printf\",\"args\":[\"ledger-skip\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}}]}" > "$RECOVERY_PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$RECOVERY_STEP_FILE"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Ledger records unrecovered command failure\",\"type\":\"system_task\",\"policy\":{\"intent\":\"system.command.execute\"},\"actions\":[{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"params\":{\"command\":\"false\",\"args\":[],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}}]}" > "$FAIL_PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$FAIL_STEP_FILE"

curl --silent --fail "$CORE_URL/commands/transcripts?limit=10" > "$LEDGER_BEFORE_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$SUMMARY_BEFORE_FILE"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
"$SCRIPT_DIR/dev-up.sh"

curl --silent --fail "$CORE_URL/commands/transcripts?limit=10" > "$LEDGER_AFTER_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$SUMMARY_AFTER_FILE"

node - <<'EOF' "$RECOVERY_STEP_FILE" "$FAIL_STEP_FILE" "$LEDGER_BEFORE_FILE" "$SUMMARY_BEFORE_FILE" "$LEDGER_AFTER_FILE" "$SUMMARY_AFTER_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const recoveryStep = readJson(2);
const failStep = readJson(3);
const ledgerBefore = readJson(4);
const summaryBefore = readJson(5);
const ledgerAfter = readJson(6);
const summaryAfter = readJson(7);

if (recoveryStep.task?.status !== "completed") {
  throw new Error(`recovery task should complete: ${JSON.stringify(recoveryStep.task)}`);
}
if (failStep.task?.status !== "failed") {
  throw new Error(`unrecovered task should fail: ${JSON.stringify(failStep.task)}`);
}

function assertSummary(label, summary) {
  if (
    summary?.total !== 4
    || summary?.executed !== 1
    || summary?.failed !== 2
    || summary?.skipped !== 1
    || summary?.taskCount !== 2
    || summary?.byCommand?.false !== 2
    || summary?.byCommand?.printf !== 2
    || summary?.byTaskStatus?.completed !== 3
    || summary?.byTaskStatus?.failed !== 1
  ) {
    throw new Error(`${label} command transcript summary mismatch: ${JSON.stringify(summary)}`);
  }
  if (!Array.isArray(summary.taskIds) || summary.taskIds.length !== 2) {
    throw new Error(`${label} summary should expose task ids: ${JSON.stringify(summary)}`);
  }
}

assertSummary("before restart", ledgerBefore.summary);
assertSummary("summary endpoint before restart", summaryBefore.summary);
assertSummary("after restart", ledgerAfter.summary);
assertSummary("summary endpoint after restart", summaryAfter.summary);

const statesBefore = (ledgerBefore.items ?? []).map((item) => `${item.command}:${item.state}:${item.exitCode ?? "n/a"}:${item.skipReason ?? "none"}`);
const statesAfter = (ledgerAfter.items ?? []).map((item) => `${item.command}:${item.state}:${item.exitCode ?? "n/a"}:${item.skipReason ?? "none"}`);
for (const token of [
  "false:failed:1:none",
  "printf:executed:0:none",
  "printf:skipped:n/a:previous_exit_code_mismatch",
]) {
  if (!statesBefore.includes(token) || !statesAfter.includes(token)) {
    throw new Error(`ledger should include ${token} before and after restart: ${JSON.stringify({ statesBefore, statesAfter })}`);
  }
}

if (JSON.stringify(ledgerBefore.summary) !== JSON.stringify(ledgerAfter.summary)) {
  throw new Error(`ledger summary should survive restart unchanged: ${JSON.stringify({ before: ledgerBefore.summary, after: ledgerAfter.summary })}`);
}

console.log(JSON.stringify({
  sovereignCommandLedger: {
    before: ledgerBefore.summary,
    after: ledgerAfter.summary,
    examples: ledgerAfter.items.slice(0, 4).map((item) => ({
      taskId: item.taskId,
      taskStatus: item.taskStatus,
      command: item.command,
      state: item.state,
      exitCode: item.exitCode,
      skipReason: item.skipReason,
      stdout: item.stdout,
    })),
    endpoints: [
      "/commands/transcripts?limit=10",
      "/commands/transcripts/summary",
    ],
  },
}, null, 2));
EOF
