#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TARGET_URL="https://www.baidu.com"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6500}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6501}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6502}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6503}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6504}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6505}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6506}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6507}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6570}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-approval-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-approval-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}"
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
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");

for (const token of ["Approval Inbox", "approval-pending-count", "approve-latest-button", "deny-latest-button"]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of ["/approvals?limit=10", "approval.created", "approval.approved", "approval.denied", "refreshApprovalState"]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
EOF

blocked_task="$(post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Upload requires approval\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_URL\",\"policy\":{\"intent\":\"data.upload\"},\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"approved upload\"}}]}")"
pending_approvals="$(curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10")"
blocked_step="$(post_json "$CORE_URL/operator/step" '{}')"
approval_id="$(node - <<'EOF' "$pending_approvals" "$blocked_step"
const pending = JSON.parse(process.argv[2]);
const blocked = JSON.parse(process.argv[3]);
if (!pending.ok || pending.count !== 1 || pending.summary?.pendingCount !== 1) {
  throw new Error("expected one pending approval request");
}
if (!blocked.ok || blocked.ran !== false || blocked.blocked !== true || blocked.reason !== "policy_requires_approval") {
  throw new Error("operator should block on approval request");
}
if (!blocked.approval?.id || blocked.approval.id !== pending.items[0].id) {
  throw new Error("operator response should point at the pending approval");
}
process.stdout.write(pending.items[0].id);
EOF
)"

approved="$(post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-approval-check","reason":"test approval"}')"
after_approve="$(curl --silent --fail "$CORE_URL/approvals/summary")"
run_result="$(post_json "$CORE_URL/operator/run" '{"maxSteps":2}')"

denied_task="$(post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Denied upload stays inside user sovereignty\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_URL\",\"policy\":{\"intent\":\"data.upload\"},\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"denied upload\"}}]}")"
deny_pending="$(curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10")"
deny_id="$(node - <<'EOF' "$deny_pending"
const pending = JSON.parse(process.argv[2]);
if (!pending.ok || pending.count !== 1) {
  throw new Error("expected one pending approval request for denial path");
}
process.stdout.write(pending.items[0].id);
EOF
)"
denied="$(post_json "$CORE_URL/approvals/$deny_id/deny" '{"deniedBy":"dev-approval-check","reason":"test denial"}')"
final_approvals="$(curl --silent --fail "$CORE_URL/approvals?limit=10")"
approval_events="$(curl --silent --fail "$EVENT_HUB_URL/events/audit?source=openclaw-core&limit=50")"

node - <<'EOF' "$blocked_task" "$pending_approvals" "$blocked_step" "$approved" "$after_approve" "$run_result" "$denied_task" "$denied" "$final_approvals" "$approval_events"
const blockedTask = JSON.parse(process.argv[2]);
const pendingApprovals = JSON.parse(process.argv[3]);
const blockedStep = JSON.parse(process.argv[4]);
const approved = JSON.parse(process.argv[5]);
const afterApprove = JSON.parse(process.argv[6]);
const runResult = JSON.parse(process.argv[7]);
const deniedTask = JSON.parse(process.argv[8]);
const denied = JSON.parse(process.argv[9]);
const finalApprovals = JSON.parse(process.argv[10]);
const approvalEvents = JSON.parse(process.argv[11]);

if (blockedTask.task?.approval?.required !== true || blockedTask.task?.policy?.decision?.decision !== "require_approval") {
  throw new Error("blocked task should carry a required approval");
}
if (pendingApprovals.items[0]?.taskId !== blockedTask.task?.id || pendingApprovals.items[0]?.status !== "pending") {
  throw new Error("pending approval should link to blocked task");
}
if (blockedStep.approval?.status !== "pending") {
  throw new Error("blocked operator step should include pending approval details");
}
if (!approved.ok || approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error("approval should convert task policy to audited execution");
}
if (afterApprove.summary?.counts?.approved !== 1 || afterApprove.summary?.pendingCount !== 0) {
  throw new Error("approval summary should show approved request and no pending requests");
}
if (!runResult.ok || runResult.ran !== true || runResult.steps?.[0]?.task?.status !== "completed") {
  throw new Error("approved task should run to completion");
}
if (runResult.steps?.[0]?.policy?.decision !== "audit_only") {
  throw new Error("approved execution should remain audited");
}
if (deniedTask.task?.approval?.required !== true) {
  throw new Error("denial path task should create pending approval");
}
if (!denied.ok || denied.approval?.status !== "denied" || denied.task?.status !== "failed") {
  throw new Error("denying an approval should fail the active task");
}
const counts = finalApprovals.summary?.counts ?? {};
if (counts.approved !== 1 || counts.denied !== 1 || counts.pending !== 0) {
  throw new Error("final approval counts should show one approved, one denied, and no pending");
}
const eventTypes = new Set((approvalEvents.items ?? []).map((event) => event.type));
for (const type of ["approval.created", "approval.approved", "approval.denied"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  approvalInbox: {
    total: finalApprovals.summary?.counts?.total ?? 0,
    pending: counts.pending,
    approved: counts.approved,
    denied: counts.denied,
  },
  blockedGate: {
    taskId: blockedTask.task?.id ?? null,
    approvalId: pendingApprovals.items[0]?.id ?? null,
    operatorReason: blockedStep.reason,
  },
  approvedExecution: {
    taskStatus: runResult.steps?.[0]?.task?.status ?? null,
    policyDecision: runResult.steps?.[0]?.policy?.decision ?? null,
  },
  deniedExecution: {
    taskStatus: denied.task?.status ?? null,
    approvalStatus: denied.approval?.status ?? null,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("approval.")),
}, null, 2));
EOF
