#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-filesystem-ledger-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/ledger-workspace"
TARGET_FILE="$WORKSPACE_DIR/ledger.txt"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8400}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8401}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8402}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8403}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8404}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8405}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8406}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8407}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8470}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-filesystem-ledger-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-filesystem-ledger-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${STEP_FILE:-}" \
    "${CHANGES_BEFORE_FILE:-}" \
    "${SUMMARY_BEFORE_FILE:-}" \
    "${CHANGES_AFTER_FILE:-}" \
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
CHANGES_BEFORE_FILE="$(mktemp)"
SUMMARY_BEFORE_FILE="$(mktemp)"
CHANGES_AFTER_FILE="$(mktemp)"
SUMMARY_AFTER_FILE="$(mktemp)"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Ledger records filesystem workspace changes\",\"type\":\"system_task\",\"policy\":{\"intent\":\"filesystem.mkdir\"},\"actions\":[{\"kind\":\"filesystem.mkdir\",\"intent\":\"filesystem.mkdir\",\"params\":{\"path\":\"$WORKSPACE_DIR\",\"recursive\":true}},{\"kind\":\"filesystem.write\",\"intent\":\"filesystem.write\",\"params\":{\"path\":\"$TARGET_FILE\",\"content\":\"filesystem-ledger-ready\",\"overwrite\":false}},{\"kind\":\"filesystem.metadata\",\"intent\":\"filesystem.metadata\",\"params\":{\"path\":\"$TARGET_FILE\"}}]}" >/dev/null
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/filesystem/changes?limit=10" > "$CHANGES_BEFORE_FILE"
curl --silent --fail "$CORE_URL/filesystem/changes/summary" > "$SUMMARY_BEFORE_FILE"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
"$SCRIPT_DIR/dev-up.sh"

curl --silent --fail "$CORE_URL/filesystem/changes?limit=10" > "$CHANGES_AFTER_FILE"
curl --silent --fail "$CORE_URL/filesystem/changes/summary" > "$SUMMARY_AFTER_FILE"

node - <<'EOF' "$STEP_FILE" "$CHANGES_BEFORE_FILE" "$SUMMARY_BEFORE_FILE" "$CHANGES_AFTER_FILE" "$SUMMARY_AFTER_FILE" "$WORKSPACE_DIR" "$TARGET_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const step = readJson(2);
const changesBefore = readJson(3);
const summaryBefore = readJson(4);
const changesAfter = readJson(5);
const summaryAfter = readJson(6);
const workspaceDir = process.argv[7];
const targetFile = process.argv[8];

if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error(`filesystem ledger task should complete: ${JSON.stringify(step.task)}`);
}
const taskId = step.task?.id;
if (!taskId) {
  throw new Error("completed task should expose an id");
}

function assertSummary(label, summary) {
  if (
    summary?.total !== 2
    || summary?.mkdir !== 1
    || summary?.write_text !== 1
    || summary?.taskCount !== 1
    || summary?.taskIds?.[0] !== taskId
    || summary?.byCapability?.["act.filesystem.mkdir"] !== 1
    || summary?.byCapability?.["act.filesystem.write_text"] !== 1
    || summary?.byPolicy?.audit_only !== 2
  ) {
    throw new Error(`${label} filesystem change summary mismatch: ${JSON.stringify(summary)}`);
  }
}

assertSummary("before restart", changesBefore.summary);
assertSummary("summary endpoint before restart", summaryBefore.summary);
assertSummary("after restart", changesAfter.summary);
assertSummary("summary endpoint after restart", summaryAfter.summary);

const beforeItems = changesBefore.items ?? [];
const afterItems = changesAfter.items ?? [];
for (const items of [beforeItems, afterItems]) {
  const mkdir = items.find((item) => item.change === "mkdir");
  const write = items.find((item) => item.change === "write_text");
  if (!mkdir || mkdir.path !== workspaceDir || mkdir.created !== true || mkdir.taskId !== taskId) {
    throw new Error(`filesystem ledger should include mkdir change: ${JSON.stringify(items)}`);
  }
  if (!write || write.path !== targetFile || write.contentBytes !== Buffer.byteLength("filesystem-ledger-ready") || write.taskId !== taskId) {
    throw new Error(`filesystem ledger should include write_text change: ${JSON.stringify(items)}`);
  }
}

if (JSON.stringify(changesBefore.summary) !== JSON.stringify(changesAfter.summary)) {
  throw new Error(`filesystem change summary should survive restart unchanged: ${JSON.stringify({ before: changesBefore.summary, after: changesAfter.summary })}`);
}

console.log(JSON.stringify({
  sovereignFilesystemLedger: {
    before: changesBefore.summary,
    after: changesAfter.summary,
    examples: afterItems.map((item) => ({
      taskId: item.taskId,
      capabilityId: item.capabilityId,
      change: item.change,
      path: item.path,
      contentBytes: item.contentBytes,
      created: item.created,
    })),
    endpoints: [
      "/filesystem/changes?limit=10",
      "/filesystem/changes/summary",
    ],
  },
}, null, 2));
EOF
