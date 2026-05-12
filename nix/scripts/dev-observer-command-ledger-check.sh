#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-command-ledger-fixture"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8100}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8101}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8102}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8103}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8104}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8105}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8106}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8107}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8170}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="${OPENCLAW_SYSTEM_COMMAND_ALLOWLIST:-false,printf}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-command-ledger-check.json}"

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
    "${STEP_FILE:-}" \
    "${LEDGER_FILE:-}" \
    "${SUMMARY_FILE:-}"
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
STEP_FILE="$(mktemp)"
LEDGER_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Observer shows command ledger\",\"type\":\"system_task\",\"policy\":{\"intent\":\"system.command.execute\"},\"actions\":[{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"onFailure\":\"continue\",\"params\":{\"command\":\"false\",\"args\":[],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"when\":{\"previousExitCode\":1},\"params\":{\"command\":\"printf\",\"args\":[\"observer-ledger\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}},{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"when\":{\"previousExitCode\":99},\"params\":{\"command\":\"printf\",\"args\":[\"observer-ledger-skip\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}}]}" >/dev/null
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts?limit=8" > "$LEDGER_FILE"
curl --silent --fail "$CORE_URL/commands/transcripts/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$STEP_FILE" "$LEDGER_FILE" "$SUMMARY_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const step = readJson(4);
const ledger = readJson(5);
const summary = readJson(6);

const requiredHtml = [
  "command-ledger-total",
  "command-ledger-executed",
  "command-ledger-failed",
  "command-ledger-skipped",
  "command-ledger-tasks",
  "command-ledger-json",
];
const requiredClient = [
  "/commands/transcripts?limit=8",
  "renderCommandLedger",
  "refreshCommandLedger",
  "commandLedgerFailed",
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

if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error(`operator should complete command ledger task: ${JSON.stringify(step.task)}`);
}

const expectedSummary = ledger.summary ?? {};
if (
  expectedSummary.total !== 3
  || expectedSummary.executed !== 1
  || expectedSummary.failed !== 1
  || expectedSummary.skipped !== 1
  || expectedSummary.taskCount !== 1
  || expectedSummary.byCommand?.false !== 1
  || expectedSummary.byCommand?.printf !== 2
) {
  throw new Error(`command ledger should summarize failed, executed, and skipped entries: ${JSON.stringify(expectedSummary)}`);
}
if (JSON.stringify(expectedSummary) !== JSON.stringify(summary.summary)) {
  throw new Error(`ledger list and summary endpoints should agree: ${JSON.stringify({ list: expectedSummary, summary: summary.summary })}`);
}

const states = (ledger.items ?? []).map((item) => `${item.command}:${item.state}:${item.exitCode ?? "n/a"}:${item.skipReason ?? "none"}:${item.stdout ?? ""}`);
for (const token of [
  "false:failed:1:none:",
  "printf:executed:0:none:observer-ledger",
  "printf:skipped:n/a:previous_exit_code_mismatch:",
]) {
  if (!states.includes(token)) {
    throw new Error(`ledger should expose ${token}: ${JSON.stringify(states)}`);
  }
}

console.log(JSON.stringify({
  observerCommandLedger: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/commands/transcripts?limit=8",
      "/commands/transcripts/summary",
      "renderCommandLedger",
    ],
    summary: expectedSummary,
    examples: ledger.items.map((item) => ({
      command: item.command,
      state: item.state,
      exitCode: item.exitCode,
      skipReason: item.skipReason,
      stdout: item.stdout,
    })),
  },
}, null, 2));
EOF
