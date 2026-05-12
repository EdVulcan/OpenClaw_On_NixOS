#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-command-chain-fixture"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-7600}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-7601}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-7602}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-7603}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-7604}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-7605}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-7606}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-7607}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-7670}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="${OPENCLAW_SYSTEM_COMMAND_ALLOWLIST:-pwd,ls,printf}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-command-chain-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-command-chain-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
printf 'chain fixture\n' > "$FIXTURE_DIR/note.txt"
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

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Sovereign body chains command results\",\"type\":\"system_task\",\"policy\":{\"intent\":\"system.command.execute\"},\"actions\":[{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"params\":{\"command\":\"pwd\",\"args\":[],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"params\":{\"command\":\"ls\",\"args\":[\"-1\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"params\":{\"command\":\"printf\",\"args\":[\"chain-complete\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}}]}" > "$PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=140" > "$EVENTS_FILE"

node - <<'EOF' "$PLAN_FILE" "$STEP_FILE" "$HISTORY_FILE" "$EVENTS_FILE" "$FIXTURE_DIR"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const plan = readJson(2);
const step = readJson(3);
const history = readJson(4);
const events = readJson(5);
const fixtureDir = process.argv[6];

const actionSteps = (plan.plan?.steps ?? []).filter((item) => item.kind === "system.command.execute");
if (actionSteps.length !== 3 || actionSteps.some((item) => item.capabilityId !== "act.system.command.execute")) {
  throw new Error("command chain plan should contain three execute capability steps");
}
if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error("operator should complete the command chain");
}
if (step.execution?.executor !== "capability-invoke-v1") {
  throw new Error("command chain should execute through capability invoke");
}

const invocations = step.execution?.capabilityInvocations ?? [];
if (invocations.length !== 3 || invocations.some((item) => item.capabilityId !== "act.system.command.execute" || item.invoked !== true)) {
  throw new Error(`expected three command execute invocations: ${JSON.stringify(invocations)}`);
}

const transcript = step.execution?.commandTranscript ?? [];
if (transcript.length !== 3) {
  throw new Error(`expected three transcript entries: ${JSON.stringify(transcript)}`);
}
if (!transcript[0].stdout.trim().endsWith(fixtureDir)) {
  throw new Error(`pwd transcript should expose fixture cwd: ${JSON.stringify(transcript[0])}`);
}
if (!transcript[1].stdout.includes("note.txt")) {
  throw new Error(`ls transcript should expose fixture file: ${JSON.stringify(transcript[1])}`);
}
if (transcript[2].stdout !== "chain-complete") {
  throw new Error(`printf transcript should capture final stdout: ${JSON.stringify(transcript[2])}`);
}
if (transcript.some((item) => item.exitCode !== 0 || item.timedOut !== false)) {
  throw new Error(`all command transcript entries should complete cleanly: ${JSON.stringify(transcript)}`);
}

const outcomeTranscript = step.task?.outcome?.details?.commandTranscript ?? [];
if (outcomeTranscript.length !== 3 || outcomeTranscript[2]?.stdout !== "chain-complete") {
  throw new Error("completed task outcome should persist the command transcript");
}
if (history.summary?.total !== 3 || history.summary?.invoked !== 3 || history.summary?.byCapability?.["act.system.command.execute"] !== 3) {
  throw new Error(`capability history should persist all command chain invocations: ${JSON.stringify(history.summary)}`);
}

const eventTypes = (events.items ?? []).map((event) => event.type);
const executedCount = eventTypes.filter((type) => type === "system.command.executed").length;
if (executedCount !== 3 || !eventTypes.includes("task.completed")) {
  throw new Error(`audit log should contain three command execution events and task.completed: ${JSON.stringify(eventTypes)}`);
}

console.log(JSON.stringify({
  sovereignCommandChain: {
    task: {
      status: step.task?.status ?? null,
      executor: step.execution?.executor ?? null,
      transcriptEntries: transcript.length,
    },
    transcript: transcript.map((entry) => ({
      command: entry.command,
      exitCode: entry.exitCode,
      stdout: entry.stdout.trim(),
    })),
    history: history.summary,
    audit: {
      systemCommandExecuted: executedCount,
      taskCompleted: eventTypes.includes("task.completed"),
    },
  },
}, null, 2));
EOF
