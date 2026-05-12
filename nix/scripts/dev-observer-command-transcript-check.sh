#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-command-transcript-fixture"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-7900}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-7901}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-7902}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-7903}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-7904}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-7905}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-7906}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-7907}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-7970}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="${OPENCLAW_SYSTEM_COMMAND_ALLOWLIST:-false,printf}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-command-transcript-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp"

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${PLAN_FILE:-}" \
    "${STEP_FILE:-}" \
    "${FOCUS_FILE:-}"
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
PLAN_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
FOCUS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Observer shows command transcript recovery\",\"type\":\"system_task\",\"policy\":{\"intent\":\"system.command.execute\"},\"actions\":[{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"onFailure\":\"continue\",\"params\":{\"command\":\"false\",\"args\":[],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"when\":{\"previousExitCode\":1},\"params\":{\"command\":\"printf\",\"args\":[\"observer-recovered\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"when\":{\"previousExitCode\":99},\"params\":{\"command\":\"printf\",\"args\":[\"observer-should-skip\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}}]}" > "$PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/tasks/focus/latest-finished" > "$FOCUS_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$PLAN_FILE" "$STEP_FILE" "$FOCUS_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const plan = readJson(4);
const step = readJson(5);
const focus = readJson(6);

const requiredHtml = [
  "command-transcript-count",
  "command-transcript-executed",
  "command-transcript-skipped",
  "command-transcript-failed",
  "command-transcript-json",
];
const requiredClient = [
  "renderCommandTranscript",
  "renderCommandTranscriptFromTask",
  "commandTranscript",
  "skipReason",
  "failed:exit_",
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

const actionSteps = (plan.plan?.steps ?? []).filter((item) => item.kind === "system.command.execute");
if (actionSteps.length !== 3 || actionSteps[0].onFailure !== "continue" || actionSteps[1].when?.previousExitCode !== 1) {
  throw new Error(`planned command transcript task should preserve recovery metadata: ${JSON.stringify(actionSteps)}`);
}
if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error(`operator should complete transcript task: ${JSON.stringify(step.task)}`);
}

const operatorTranscript = step.execution?.commandTranscript ?? [];
const taskTranscript = focus.task?.outcome?.details?.commandTranscript ?? [];
if (operatorTranscript.length !== 3 || taskTranscript.length !== 3) {
  throw new Error(`operator and task focus should expose transcript entries: ${JSON.stringify({ operatorTranscript, taskTranscript })}`);
}
if (operatorTranscript[0].exitCode !== 1 || operatorTranscript[1].stdout !== "observer-recovered" || operatorTranscript[2].skipped !== true) {
  throw new Error(`operator transcript should include failed, recovered, and skipped entries: ${JSON.stringify(operatorTranscript)}`);
}
if (taskTranscript[2].skipReason !== "previous_exit_code_mismatch" || taskTranscript[0].command !== "false") {
  throw new Error(`task outcome transcript should persist skip reason and failed command: ${JSON.stringify(taskTranscript)}`);
}

console.log(JSON.stringify({
  observerCommandTranscript: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/operator/step",
      "/tasks/focus/latest-finished",
      "renderCommandTranscript",
    ],
    operatorTranscript: operatorTranscript.map((entry) => ({
      command: entry.command,
      exitCode: entry.exitCode,
      skipped: entry.skipped === true,
      skipReason: entry.skipReason ?? null,
      stdout: entry.stdout,
    })),
    taskTranscriptPersisted: taskTranscript.length,
  },
}, null, 2));
EOF
