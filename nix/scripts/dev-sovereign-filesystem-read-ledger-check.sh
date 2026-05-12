#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-filesystem-read-ledger-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/read-ledger-workspace"
TARGET_FILE="$WORKSPACE_DIR/read-ledger-note.txt"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8320}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8321}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8322}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8323}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8324}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8325}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8326}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8327}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8390}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-filesystem-read-ledger-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-filesystem-read-ledger-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${STEP_FILE:-}" \
    "${READS_BEFORE_FILE:-}" \
    "${SUMMARY_BEFORE_FILE:-}" \
    "${READS_AFTER_FILE:-}" \
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

STEP_FILE="$(mktemp)"
READS_BEFORE_FILE="$(mktemp)"
SUMMARY_BEFORE_FILE="$(mktemp)"
READS_AFTER_FILE="$(mktemp)"
SUMMARY_AFTER_FILE="$(mktemp)"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Ledger records filesystem reads without leaking content\",\"type\":\"system_task\",\"policy\":{\"intent\":\"filesystem.mkdir\"},\"actions\":[{\"kind\":\"filesystem.mkdir\",\"intent\":\"filesystem.mkdir\",\"params\":{\"path\":\"$WORKSPACE_DIR\",\"recursive\":true}},{\"kind\":\"filesystem.write_text\",\"intent\":\"filesystem.write_text\",\"params\":{\"path\":\"$TARGET_FILE\",\"content\":\"ledger-readback-content\",\"overwrite\":false}},{\"kind\":\"filesystem.metadata\",\"intent\":\"filesystem.metadata\",\"params\":{\"path\":\"$TARGET_FILE\"}},{\"kind\":\"filesystem.list\",\"intent\":\"filesystem.list\",\"params\":{\"path\":\"$WORKSPACE_DIR\",\"limit\":10}},{\"kind\":\"filesystem.search\",\"intent\":\"filesystem.search\",\"params\":{\"path\":\"$FIXTURE_DIR\",\"query\":\"read-ledger-note\",\"limit\":10}},{\"kind\":\"filesystem.read_text\",\"intent\":\"filesystem.read_text\",\"params\":{\"path\":\"$TARGET_FILE\"}}]}" >/dev/null
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/filesystem/reads?limit=10" > "$READS_BEFORE_FILE"
curl --silent --fail "$CORE_URL/filesystem/reads/summary" > "$SUMMARY_BEFORE_FILE"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
"$SCRIPT_DIR/dev-up.sh"

curl --silent --fail "$CORE_URL/filesystem/reads?limit=10" > "$READS_AFTER_FILE"
curl --silent --fail "$CORE_URL/filesystem/reads/summary" > "$SUMMARY_AFTER_FILE"

node - <<'EOF' "$STEP_FILE" "$READS_BEFORE_FILE" "$SUMMARY_BEFORE_FILE" "$READS_AFTER_FILE" "$SUMMARY_AFTER_FILE" "$WORKSPACE_DIR" "$TARGET_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const step = readJson(2);
const readsBefore = readJson(3);
const summaryBefore = readJson(4);
const readsAfter = readJson(5);
const summaryAfter = readJson(6);
const workspaceDir = process.argv[7];
const targetFile = process.argv[8];
const secretContent = "ledger-readback-content";

if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error(`filesystem read ledger task should complete: ${JSON.stringify(step.task)}`);
}
const taskId = step.task?.id;
if (!taskId) {
  throw new Error("completed task should expose an id");
}

function assertSummary(label, summary) {
  if (
    summary?.total !== 4
    || summary?.metadata !== 1
    || summary?.list !== 1
    || summary?.search !== 1
    || summary?.read_text !== 1
    || summary?.taskCount !== 1
    || summary?.taskIds?.[0] !== taskId
    || summary?.byCapability?.["sense.filesystem.read"] !== 4
    || summary?.byPolicy?.audit_only !== 4
  ) {
    throw new Error(`${label} filesystem read summary mismatch: ${JSON.stringify(summary)}`);
  }
}

assertSummary("before restart", readsBefore.summary);
assertSummary("summary endpoint before restart", summaryBefore.summary);
assertSummary("after restart", readsAfter.summary);
assertSummary("summary endpoint after restart", summaryAfter.summary);

for (const items of [readsBefore.items ?? [], readsAfter.items ?? []]) {
  const byOperation = Object.fromEntries(items.map((item) => [item.operation, item]));
  if (byOperation.metadata?.path !== targetFile || byOperation.metadata?.count !== 1 || byOperation.metadata?.taskId !== taskId) {
    throw new Error(`filesystem read ledger should include metadata read: ${JSON.stringify(items)}`);
  }
  if (byOperation.list?.path !== workspaceDir || byOperation.list?.count < 1 || byOperation.list?.taskId !== taskId) {
    throw new Error(`filesystem read ledger should include list read: ${JSON.stringify(items)}`);
  }
  if (byOperation.search?.count < 1 || byOperation.search?.taskId !== taskId) {
    throw new Error(`filesystem read ledger should include search read: ${JSON.stringify(items)}`);
  }
  if (
    byOperation.read_text?.path !== targetFile
    || byOperation.read_text?.contentBytes !== Buffer.byteLength(secretContent)
    || byOperation.read_text?.encoding !== "utf8"
    || byOperation.read_text?.taskId !== taskId
  ) {
    throw new Error(`filesystem read ledger should include read_text metadata: ${JSON.stringify(items)}`);
  }
  if (JSON.stringify(items).includes(secretContent) || items.some((item) => "content" in item)) {
    throw new Error(`filesystem read ledger must not leak file content: ${JSON.stringify(items)}`);
  }
}

if (JSON.stringify(readsBefore.summary) !== JSON.stringify(readsAfter.summary)) {
  throw new Error(`filesystem read summary should survive restart unchanged: ${JSON.stringify({ before: readsBefore.summary, after: readsAfter.summary })}`);
}

console.log(JSON.stringify({
  sovereignFilesystemReadLedger: {
    before: readsBefore.summary,
    after: readsAfter.summary,
    examples: (readsAfter.items ?? []).map((item) => ({
      taskId: item.taskId,
      capabilityId: item.capabilityId,
      operation: item.operation,
      path: item.path,
      count: item.count,
      contentBytes: item.contentBytes,
      encoding: item.encoding,
    })),
    endpoints: [
      "/filesystem/reads?limit=10",
      "/filesystem/reads/summary",
    ],
  },
}, null, 2));
EOF
