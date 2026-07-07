#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6650}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6651}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6652}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6653}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6654}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6655}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6656}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6657}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6720}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-systemd-next-repair-real-execution-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-systemd-next-repair-real-execution-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
LEDGER_DIR="$REPO_ROOT/.artifacts/openclaw-body-evidence-ledger"
. "$SCRIPT_DIR/dev-body-evidence-prereqs.sh"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f \
  "$OPENCLAW_CORE_STATE_FILE" \
  "$OPENCLAW_CORE_STATE_FILE.tmp" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
rm -rf "$LEDGER_DIR"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"


"$SCRIPT_DIR/dev-up.sh"

prepare_body_evidence_timeline_readiness "$CORE_URL" "Approve one next repair execution before observer next repair real execution."

created_directory="$(post_json "$CORE_URL/body/evidence-ledger/directory-tasks" '{"confirm":true}')"
directory_approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$created_directory")"
post_json "$CORE_URL/approvals/$directory_approval_id/approve" '{"approvedBy":"observer-milestone-check","reason":"Approve bounded ledger directory creation before observer next repair real execution."}' >/dev/null
post_json "$CORE_URL/operator/step" '{}' >/dev/null

created_record_task="$(post_json "$CORE_URL/body/evidence-ledger/first-record-tasks" '{"confirm":true}')"
record_approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$created_record_task")"
post_json "$CORE_URL/approvals/$record_approval_id/approve" '{"approvedBy":"observer-milestone-check","reason":"Approve one bounded bootstrap append before observer next repair real execution."}' >/dev/null
post_json "$CORE_URL/operator/step" '{}' >/dev/null

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
created="$(post_json "$CORE_URL/system/systemd/next-repair-tasks" '{"confirm":true,"execute":true}')"
approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$created")"
approved="$(post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"observer-milestone-check","reason":"Approve Observer-visible next real systemd repair execution attempt."}')"
step="$(post_json "$CORE_URL/operator/step" '{}')"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$created" "$approved" "$step"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const created = JSON.parse(process.argv[4]);
const approved = JSON.parse(process.argv[5]);
const step = JSON.parse(process.argv[6]);

for (const token of [
  "Create Next Repair Real Execution Task",
  "create-systemd-next-repair-real-execution-button",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of [
  "createSystemdNextRepairRealExecutionTask",
  "execute: true",
  "realExecutionEnabled=",
  "systemd.next_repair.execution_completed",
  "systemd.next_repair.execution_failed",
  "openclaw-systemd-next-repair-real-execution-v0",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (!created.ok || created.registry !== "openclaw-systemd-next-repair-real-execution-v0" || created.governance?.realExecutionEnabled !== true) {
  throw new Error(`Observer source should create explicit next real execution task: ${JSON.stringify(created)}`);
}
if (created.task?.systemdNextRepair?.target?.unit !== "openclaw-system-sense.service"
  || created.approval?.status !== "pending") {
  throw new Error(`Observer source should expose next real execution approval: ${JSON.stringify(created)}`);
}
if (!approved.ok || approved.approval?.status !== "approved") {
  throw new Error(`Observer source should approve next real execution task: ${JSON.stringify(approved)}`);
}
const finalTask = step.task;
if (!step.ok || step.ran !== true || !["systemd_next_repair_execution_completed", "systemd_next_repair_execution_failed"].includes(finalTask?.outcome?.kind)) {
  throw new Error(`Observer source should expose next real execution operator result: ${JSON.stringify(step)}`);
}
const details = finalTask.outcome?.details ?? {};
if (details.hostMutationAttempted !== true
  || details.executed !== true
  || details.commandTranscript?.[0]?.command !== "systemctl restart openclaw-system-sense.service") {
  throw new Error(`Observer source should expose next real execution evidence: ${JSON.stringify(details)}`);
}

console.log(JSON.stringify({
  observerOpenClawSystemdNextRepairRealExecution: {
    status: "passed",
    panel: "Next Repair Task Shell",
    taskId: finalTask.id,
    approvalId: approved.approval.id,
    outcome: finalTask.outcome.kind,
    command: details.commandTranscript[0].command,
    exitCode: details.commandTranscript[0].exitCode,
    hostMutationAttempted: details.hostMutationAttempted,
  },
}, null, 2));
EOF
