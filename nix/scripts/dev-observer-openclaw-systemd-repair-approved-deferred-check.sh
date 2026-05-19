#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5920}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5921}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5922}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5923}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5924}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5925}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5926}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5927}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5990}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-systemd-repair-approved-deferred-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-systemd-repair-approved-deferred-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f \
  "$OPENCLAW_CORE_STATE_FILE" \
  "$OPENCLAW_CORE_STATE_FILE.tmp" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"

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

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
created="$(post_json "$CORE_URL/system/systemd/repair-execution-tasks" '{"unit":"openclaw-browser-runtime.service","confirm":true}')"
approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$created")"
approved="$(post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"observer-milestone-check","reason":"Approve systemd repair task shell for Observer deferred visibility."}')"
step="$(post_json "$CORE_URL/operator/step" '{}')"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$created" "$approved" "$step"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const created = JSON.parse(process.argv[4]);
const approved = JSON.parse(process.argv[5]);
const step = JSON.parse(process.argv[6]);

const requiredHtml = [
  "Systemd Repair Execution Task",
  "systemd-repair-execution-task-executed",
  "systemd-repair-execution-task-json",
];
const requiredClient = [
  "createSystemdRepairExecutionTask",
  "refreshSystemdRepairExecutionTaskDraft",
  "refreshApprovalState",
  "refreshOperatorState",
  "Execution: shellOnly=",
  "executed=",
  "hostMutation=",
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
if (!created.ok || created.approval?.status !== "pending") {
  throw new Error(`Observer source should create pending task approval: ${JSON.stringify(created)}`);
}
if (!approved.ok || approved.approval?.status !== "approved") {
  throw new Error(`Observer source should expose approved approval: ${JSON.stringify(approved)}`);
}
const finalTask = step.task;
if (!step.ok || step.ran !== true || finalTask?.outcome?.kind !== "systemd_repair_execution_deferred") {
  throw new Error(`Observer source should expose approved deferred operator result: ${JSON.stringify(step)}`);
}
if (finalTask.outcome?.details?.hostMutation !== false || finalTask.outcome?.details?.executed !== false) {
  throw new Error(`Observer source should expose no host mutation after approval: ${JSON.stringify(finalTask.outcome)}`);
}

console.log(JSON.stringify({
  observerOpenClawSystemdRepairApprovedDeferred: {
    status: "passed",
    panel: "Systemd Repair Execution Task",
    taskId: finalTask.id,
    approvalId: approved.approval.id,
    outcome: finalTask.outcome.kind,
    executed: finalTask.outcome.details.executed,
    hostMutation: finalTask.outcome.details.hostMutation,
  },
}, null, 2));
EOF
