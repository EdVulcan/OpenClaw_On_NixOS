#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-command-branch-fixture"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-7700}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-7701}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-7702}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-7703}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-7704}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-7705}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-7706}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-7707}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-7770}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="${OPENCLAW_SYSTEM_COMMAND_ALLOWLIST:-ls,printf}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-command-branch-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-command-branch-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
printf 'branch fixture\n' > "$FIXTURE_DIR/note.txt"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${PLAN_FILE:-}" \
    "${STEP_FILE:-}" \
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

PLAN_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Sovereign body branches on command transcript\",\"type\":\"system_task\",\"policy\":{\"intent\":\"system.command.execute\"},\"actions\":[{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"params\":{\"command\":\"ls\",\"args\":[\"-1\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"when\":{\"previousStdoutIncludes\":\"note.txt\",\"previousExitCode\":0},\"params\":{\"command\":\"printf\",\"args\":[\"found-note\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"when\":{\"previousStdoutIncludes\":\"missing.txt\"},\"params\":{\"command\":\"printf\",\"args\":[\"should-not-run\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}}]}" > "$PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=140" > "$EVENTS_FILE"

node - <<'EOF' "$PLAN_FILE" "$STEP_FILE" "$HISTORY_FILE" "$EVENTS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const plan = readJson(2);
const step = readJson(3);
const history = readJson(4);
const events = readJson(5);

const actionSteps = (plan.plan?.steps ?? []).filter((item) => item.kind === "system.command.execute");
if (actionSteps.length !== 3 || !actionSteps[1].when?.previousStdoutIncludes || !actionSteps[2].when?.previousStdoutIncludes) {
  throw new Error("command branch plan should preserve when conditions");
}
if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error("operator should complete the branching command task");
}

const transcript = step.execution?.commandTranscript ?? [];
if (transcript.length !== 3) {
  throw new Error(`expected three transcript entries including skipped branch: ${JSON.stringify(transcript)}`);
}
if (transcript[0].command !== "ls" || !transcript[0].stdout.includes("note.txt") || transcript[0].skipped === true) {
  throw new Error(`first command should list note.txt: ${JSON.stringify(transcript[0])}`);
}
if (transcript[1].command !== "printf" || transcript[1].stdout !== "found-note" || transcript[1].skipped === true) {
  throw new Error(`second command should run after matching stdout condition: ${JSON.stringify(transcript[1])}`);
}
if (
  transcript[2].command !== "printf"
  || transcript[2].skipped !== true
  || transcript[2].skipReason !== "previous_stdout_missing_text"
  || transcript[2].stdout !== ""
) {
  throw new Error(`third command should be skipped by transcript condition: ${JSON.stringify(transcript[2])}`);
}

const invocations = step.execution?.capabilityInvocations ?? [];
if (invocations.length !== 2 || invocations.some((item) => item.capabilityId !== "act.system.command.execute")) {
  throw new Error(`only two command capabilities should be invoked: ${JSON.stringify(invocations)}`);
}
if (history.summary?.total !== 2 || history.summary?.invoked !== 2 || history.summary?.byCapability?.["act.system.command.execute"] !== 2) {
  throw new Error(`capability history should only include executed branches: ${JSON.stringify(history.summary)}`);
}
const outcomeTranscript = step.task?.outcome?.details?.commandTranscript ?? [];
if (outcomeTranscript[2]?.skipped !== true || outcomeTranscript[1]?.stdout !== "found-note") {
  throw new Error("task outcome should persist branch transcript including skipped step");
}

const eventTypes = (events.items ?? []).map((event) => event.type);
const executedCount = eventTypes.filter((type) => type === "system.command.executed").length;
if (executedCount !== 2 || !eventTypes.includes("task.completed")) {
  throw new Error(`audit should record only executed command branches plus task completion: ${JSON.stringify(eventTypes)}`);
}

console.log(JSON.stringify({
  sovereignCommandBranch: {
    task: {
      status: step.task?.status ?? null,
      executor: step.execution?.executor ?? null,
    },
    transcript: transcript.map((entry) => ({
      command: entry.command,
      skipped: entry.skipped === true,
      skipReason: entry.skipReason ?? null,
      stdout: entry.stdout.trim(),
    })),
    invokedCommands: invocations.length,
    history: history.summary,
    audit: {
      systemCommandExecuted: executedCount,
      taskCompleted: eventTypes.includes("task.completed"),
    },
  },
}, null, 2));
EOF
