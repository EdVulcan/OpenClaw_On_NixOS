#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6480}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6481}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6482}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6483}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6484}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6485}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6486}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6487}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6550}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-body-evidence-ledger-directory-task-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-body-evidence-ledger-directory-task-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
. "$SCRIPT_DIR/dev-body-evidence-prereqs.sh"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f \
  "$OPENCLAW_CORE_STATE_FILE" \
  "$OPENCLAW_CORE_STATE_FILE.tmp" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
rm -rf "$REPO_ROOT/.artifacts/openclaw-body-evidence-ledger"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local payload="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data "$payload"
}

"$SCRIPT_DIR/dev-up.sh"

prepare_body_evidence_timeline_readiness "$CORE_URL" "Approve one next repair execution before observer body evidence ledger directory task."

curl --silent --fail "$SYSTEM_URL/system/health" >/dev/null

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
route_review="$(curl --silent --fail "$SYSTEM_URL/system/route/body-evidence-ledger-storage-root-route-review")"
created="$(post_json "$CORE_URL/body/evidence-ledger/directory-tasks" '{"confirm":true}')"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$route_review" "$created"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const routeReview = JSON.parse(process.argv[4]);
const created = JSON.parse(process.argv[5]);

const requiredHtml = [
  "Body Evidence Ledger Directory Task",
  "body-evidence-ledger-directory-task-panel",
  "body-evidence-ledger-directory-task-ready",
  "body-evidence-ledger-directory-task-target",
  "body-evidence-ledger-directory-task-approval",
  "body-evidence-ledger-directory-task-created",
  "create-body-evidence-ledger-directory-task-button",
  "body-evidence-ledger-directory-task-json",
];
const requiredClient = [
  "/body/evidence-ledger/directory-tasks",
  "createBodyEvidenceLedgerDirectoryTask",
  "refreshBodyEvidenceLedgerDirectoryTask",
  "bodyEvidenceLedgerDirectoryTaskReady",
  "bodyEvidenceLedgerDirectoryTaskTarget",
  "bodyEvidenceLedgerDirectoryTaskApproval",
  "bodyEvidenceLedgerDirectoryTaskCreated",
  "bodyEvidenceLedgerDirectoryTaskJson",
  "openclaw-body-evidence-ledger-directory-task-v0",
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
if (!routeReview.ok || routeReview.decision?.selectedSlice !== "openclaw-body-evidence-ledger-directory-task") {
  throw new Error(`Observer directory task route should be ready: ${JSON.stringify(routeReview)}`);
}
if (!created.ok || created.registry !== "openclaw-body-evidence-ledger-directory-task-v0") {
  throw new Error(`Observer directory task creation should expose registry: ${JSON.stringify(created)}`);
}
if (created.task?.bodyEvidenceLedgerDirectory?.displayPath !== ".artifacts/openclaw-body-evidence-ledger") {
  throw new Error(`Observer directory task should carry target metadata: ${JSON.stringify(created.task)}`);
}
if (created.approval?.status !== "pending" || created.approval?.risk !== "medium") {
  throw new Error(`Observer directory task should create pending medium-risk approval: ${JSON.stringify(created.approval)}`);
}
if (created.governance?.createsTask !== true
  || created.governance?.createsApproval !== true
  || created.governance?.hostMutation !== false
  || created.governance?.directoryCreated !== false
  || created.governance?.durableStorageWritten !== false) {
  throw new Error(`Observer directory task should stop before mkdir and writes: ${JSON.stringify(created.governance)}`);
}

console.log(JSON.stringify({
  observerOpenClawBodyEvidenceLedgerDirectoryTask: {
    status: "passed",
    panel: "Body Evidence Ledger Directory Task",
    registry: created.registry,
    taskId: created.task?.id,
    approvalId: created.approval?.id,
    target: created.task?.bodyEvidenceLedgerDirectory?.displayPath,
    directoryCreated: created.governance?.directoryCreated,
  },
}, null, 2));
EOF
