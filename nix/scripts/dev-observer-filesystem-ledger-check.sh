#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-filesystem-ledger-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/observer-ledger-workspace"
TARGET_FILE="$WORKSPACE_DIR/observer.txt"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8500}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8501}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8502}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8503}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8504}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8505}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8506}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8507}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8570}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-filesystem-ledger-check.json}"

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

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Observer shows filesystem ledger\",\"type\":\"system_task\",\"policy\":{\"intent\":\"filesystem.mkdir\"},\"actions\":[{\"kind\":\"filesystem.mkdir\",\"intent\":\"filesystem.mkdir\",\"params\":{\"path\":\"$WORKSPACE_DIR\",\"recursive\":true}},{\"kind\":\"filesystem.write\",\"intent\":\"filesystem.write\",\"params\":{\"path\":\"$TARGET_FILE\",\"content\":\"observer-filesystem-ledger\",\"overwrite\":false}}]}" >/dev/null
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/filesystem/changes?limit=8" > "$LEDGER_FILE"
curl --silent --fail "$CORE_URL/filesystem/changes/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$STEP_FILE" "$LEDGER_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR" "$TARGET_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const step = readJson(4);
const ledger = readJson(5);
const summary = readJson(6);
const workspaceDir = process.argv[7];
const targetFile = process.argv[8];

const requiredHtml = [
  "filesystem-ledger-total",
  "filesystem-ledger-mkdir",
  "filesystem-ledger-writes",
  "filesystem-ledger-tasks",
  "filesystem-ledger-json",
];
const requiredClient = [
  "/filesystem/changes?limit=8",
  "renderFilesystemLedger",
  "refreshFilesystemLedger",
  "filesystemLedgerWrites",
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
  throw new Error(`operator should complete filesystem ledger task: ${JSON.stringify(step.task)}`);
}

const expectedSummary = ledger.summary ?? {};
if (
  expectedSummary.total !== 2
  || expectedSummary.mkdir !== 1
  || expectedSummary.write_text !== 1
  || expectedSummary.taskCount !== 1
  || expectedSummary.byCapability?.["act.filesystem.mkdir"] !== 1
  || expectedSummary.byCapability?.["act.filesystem.write_text"] !== 1
) {
  throw new Error(`filesystem ledger should summarize mkdir and write entries: ${JSON.stringify(expectedSummary)}`);
}
if (JSON.stringify(expectedSummary) !== JSON.stringify(summary.summary)) {
  throw new Error(`filesystem ledger list and summary endpoints should agree: ${JSON.stringify({ list: expectedSummary, summary: summary.summary })}`);
}

const mkdir = (ledger.items ?? []).find((item) => item.change === "mkdir");
const write = (ledger.items ?? []).find((item) => item.change === "write_text");
if (!mkdir || mkdir.path !== workspaceDir || mkdir.created !== true) {
  throw new Error(`ledger should expose mkdir change: ${JSON.stringify(ledger.items)}`);
}
if (!write || write.path !== targetFile || write.contentBytes !== Buffer.byteLength("observer-filesystem-ledger")) {
  throw new Error(`ledger should expose write_text change: ${JSON.stringify(ledger.items)}`);
}

console.log(JSON.stringify({
  observerFilesystemLedger: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/filesystem/changes?limit=8",
      "/filesystem/changes/summary",
      "renderFilesystemLedger",
    ],
    summary: expectedSummary,
    examples: ledger.items.map((item) => ({
      change: item.change,
      path: item.path,
      contentBytes: item.contentBytes,
      created: item.created,
    })),
  },
}, null, 2));
EOF
