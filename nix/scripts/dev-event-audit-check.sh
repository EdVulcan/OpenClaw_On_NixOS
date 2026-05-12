#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6300}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6301}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6302}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6303}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6304}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6305}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6306}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6307}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6370}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-event-audit-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-event-audit-check.jsonl}"

EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${BODY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_event() {
  local body="$1"
  BODY_FILE="$(mktemp)"
  printf '%s' "$body" > "$BODY_FILE"
  curl --silent --fail -X POST "$EVENT_HUB_URL/events" -H 'content-type: application/json' --data-binary "@$BODY_FILE" >/dev/null
  rm -f "$BODY_FILE"
  BODY_FILE=""
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

for (const token of ["Audit Ledger", "audit-total", "audit-summary"]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of ["/events/audit/summary", "refreshAuditState"]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
EOF

post_event '{"type":"task.created","source":"event-audit-check","payload":{"taskId":"audit-task-1","goal":"audit ledger check"}}'
post_event '{"type":"task.completed","source":"event-audit-check","payload":{"taskId":"audit-task-1","status":"completed"}}'
post_event '{"type":"policy.evaluated","source":"event-audit-check","payload":{"domain":"cross_boundary","decision":"require_approval"}}'
post_event '{"type":"system.updated","source":"event-audit-check","payload":{"alerts":0}}'
post_event '{"type":"heal.completed","source":"event-audit-check","payload":{"action":"restart-service","service":"browserRuntime"}}'

audit_all="$(curl --silent --fail "$EVENT_HUB_URL/events/audit?source=event-audit-check&limit=5")"
audit_policy="$(curl --silent --fail "$EVENT_HUB_URL/events/audit?type=policy.evaluated&source=event-audit-check&limit=10")"
audit_summary="$(curl --silent --fail "$EVENT_HUB_URL/events/audit/summary")"

node - <<'EOF' "$OPENCLAW_EVENT_LOG_FILE" "$audit_all" "$audit_policy" "$audit_summary"
const fs = require("node:fs");
const logFile = process.argv[2];
const auditAll = JSON.parse(process.argv[3]);
const auditPolicy = JSON.parse(process.argv[4]);
const auditSummary = JSON.parse(process.argv[5]);

if (!fs.existsSync(logFile)) {
  throw new Error(`Audit log was not created at ${logFile}`);
}

const lines = fs.readFileSync(logFile, "utf8").trim().split(/\r?\n/).filter(Boolean);
if (lines.length < 5) {
  throw new Error("Audit log should contain at least the five posted events.");
}

for (const line of lines) {
  JSON.parse(line);
}

if (auditAll.count !== 5 || auditAll.items.at(-1)?.type !== "heal.completed") {
  throw new Error("Audit limit query should return the last five events in order.");
}
if (auditPolicy.count !== 1 || auditPolicy.items[0]?.type !== "policy.evaluated") {
  throw new Error("Audit query should filter by type and source.");
}
if (!auditSummary.ok || auditSummary.audit?.total < 5) {
  throw new Error("Audit summary should report persisted events.");
}
for (const type of ["task.created", "task.completed", "policy.evaluated", "system.updated", "heal.completed"]) {
  if (!auditSummary.audit.byType?.[type]) {
    throw new Error(`Audit summary missing type ${type}`);
  }
}
if (auditSummary.audit.bySource?.["event-audit-check"] !== 5) {
  throw new Error("Audit summary should group the synthetic check source.");
}
EOF

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
"$SCRIPT_DIR/dev-up.sh" >/dev/null

restored_policy="$(curl --silent --fail "$EVENT_HUB_URL/events/audit?type=policy.evaluated&source=event-audit-check&limit=10")"
restored_summary="$(curl --silent --fail "$EVENT_HUB_URL/events/audit/summary")"

node - <<'EOF' "$restored_policy" "$restored_summary" "$OPENCLAW_EVENT_LOG_FILE"
const restoredPolicy = JSON.parse(process.argv[2]);
const restoredSummary = JSON.parse(process.argv[3]);
const logFile = process.argv[4];

if (restoredPolicy.count < 1 || restoredPolicy.items[0]?.payload?.decision !== "require_approval") {
  throw new Error("Audit log should remain queryable after event-hub restart.");
}
if (!restoredSummary.ok || restoredSummary.audit?.logFile !== logFile || restoredSummary.audit?.total < 5) {
  throw new Error("Restored audit summary should point at the same durable log.");
}

console.log(JSON.stringify({
  eventAudit: {
    logFile,
    persistedEvents: restoredSummary.audit.total,
    taskEvents: (restoredSummary.audit.byType?.["task.created"] ?? 0) + (restoredSummary.audit.byType?.["task.completed"] ?? 0),
    policyEvents: restoredSummary.audit.byType?.["policy.evaluated"] ?? 0,
    systemEvents: restoredSummary.audit.byType?.["system.updated"] ?? 0,
    healEvents: restoredSummary.audit.byType?.["heal.completed"] ?? 0,
    restoredAfterRestart: true,
  },
}, null, 2));
EOF
