#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-filesystem-read-ledger-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/observer-read-ledger-workspace"
TARGET_FILE="$WORKSPACE_DIR/observer-read.txt"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8510}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8511}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8512}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8513}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8514}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8515}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8516}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8517}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8580}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-filesystem-read-ledger-check.json}"

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
    "${READS_FILE:-}" \
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
READS_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Observer shows filesystem read ledger\",\"type\":\"system_task\",\"policy\":{\"intent\":\"filesystem.mkdir\"},\"actions\":[{\"kind\":\"filesystem.mkdir\",\"intent\":\"filesystem.mkdir\",\"params\":{\"path\":\"$WORKSPACE_DIR\",\"recursive\":true}},{\"kind\":\"filesystem.write_text\",\"intent\":\"filesystem.write_text\",\"params\":{\"path\":\"$TARGET_FILE\",\"content\":\"observer-read-ledger-content\",\"overwrite\":false}},{\"kind\":\"filesystem.metadata\",\"intent\":\"filesystem.metadata\",\"params\":{\"path\":\"$TARGET_FILE\"}},{\"kind\":\"filesystem.list\",\"intent\":\"filesystem.list\",\"params\":{\"path\":\"$WORKSPACE_DIR\",\"limit\":10}},{\"kind\":\"filesystem.search\",\"intent\":\"filesystem.search\",\"params\":{\"path\":\"$FIXTURE_DIR\",\"query\":\"observer-read\",\"limit\":10}},{\"kind\":\"filesystem.read_text\",\"intent\":\"filesystem.read_text\",\"params\":{\"path\":\"$TARGET_FILE\"}}]}" >/dev/null
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/filesystem/reads?limit=8" > "$READS_FILE"
curl --silent --fail "$CORE_URL/filesystem/reads/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$STEP_FILE" "$READS_FILE" "$SUMMARY_FILE" "$TARGET_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const step = readJson(4);
const reads = readJson(5);
const summary = readJson(6);
const targetFile = process.argv[7];
const secretContent = "observer-read-ledger-content";

const requiredHtml = [
  "filesystem-read-ledger-total",
  "filesystem-read-ledger-metadata",
  "filesystem-read-ledger-query",
  "filesystem-read-ledger-read-text",
  "filesystem-read-ledger-tasks",
  "filesystem-read-ledger-json",
];
const requiredClient = [
  "/filesystem/reads?limit=8",
  "renderFilesystemReadLedger",
  "refreshFilesystemReadLedger",
  "Content: not displayed or stored in the read ledger.",
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
  throw new Error(`operator should complete filesystem read ledger task: ${JSON.stringify(step.task)}`);
}

const expectedSummary = reads.summary ?? {};
if (
  expectedSummary.total !== 4
  || expectedSummary.metadata !== 1
  || expectedSummary.list !== 1
  || expectedSummary.search !== 1
  || expectedSummary.read_text !== 1
  || expectedSummary.taskCount !== 1
  || expectedSummary.byCapability?.["sense.filesystem.read"] !== 4
) {
  throw new Error(`filesystem read ledger should summarize read operations: ${JSON.stringify(expectedSummary)}`);
}
if (JSON.stringify(expectedSummary) !== JSON.stringify(summary.summary)) {
  throw new Error(`filesystem read ledger list and summary endpoints should agree: ${JSON.stringify({ list: expectedSummary, summary: summary.summary })}`);
}

const items = reads.items ?? [];
const readTextItem = items.find((item) => item.operation === "read_text");
if (!readTextItem || readTextItem.path !== targetFile || readTextItem.contentBytes !== Buffer.byteLength(secretContent) || readTextItem.encoding !== "utf8") {
  throw new Error(`read ledger should expose read_text metadata: ${JSON.stringify(items)}`);
}
for (const operation of ["metadata", "list", "search", "read_text"]) {
  if (!items.some((item) => item.operation === operation)) {
    throw new Error(`read ledger should expose ${operation}: ${JSON.stringify(items)}`);
  }
}
if (JSON.stringify(items).includes(secretContent) || items.some((item) => "content" in item)) {
  throw new Error(`read ledger should not expose file content: ${JSON.stringify(items)}`);
}

console.log(JSON.stringify({
  observerFilesystemReadLedger: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/filesystem/reads?limit=8",
      "/filesystem/reads/summary",
      "renderFilesystemReadLedger",
    ],
    summary: expectedSummary,
    examples: items.map((item) => ({
      operation: item.operation,
      path: item.path,
      count: item.count,
      contentBytes: item.contentBytes,
      encoding: item.encoding,
    })),
  },
}, null, 2));
EOF
