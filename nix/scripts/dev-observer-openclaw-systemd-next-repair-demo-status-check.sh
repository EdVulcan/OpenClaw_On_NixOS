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
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-systemd-next-repair-demo-status-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-systemd-next-repair-demo-status-check.json}"

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

post_json() {
  local url="$1"
  local payload="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data "$payload"
}

"$SCRIPT_DIR/dev-up.sh"

prepare_body_evidence_timeline_readiness "$CORE_URL" "Approve one next repair execution before observer next repair demo status."

created_directory="$(post_json "$CORE_URL/body/evidence-ledger/directory-tasks" '{"confirm":true}')"
directory_approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$created_directory")"
post_json "$CORE_URL/approvals/$directory_approval_id/approve" '{"approvedBy":"observer-milestone-check","reason":"Approve bounded ledger directory creation before observer next repair demo status."}' >/dev/null
post_json "$CORE_URL/operator/step" '{}' >/dev/null

created_record_task="$(post_json "$CORE_URL/body/evidence-ledger/first-record-tasks" '{"confirm":true}')"
record_approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$created_record_task")"
post_json "$CORE_URL/approvals/$record_approval_id/approve" '{"approvedBy":"observer-milestone-check","reason":"Approve one bounded bootstrap append before observer next repair demo status."}' >/dev/null
post_json "$CORE_URL/operator/step" '{}' >/dev/null

created="$(post_json "$CORE_URL/system/systemd/next-repair-tasks" '{"confirm":true,"execute":true}')"
approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$created")"
post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"observer-milestone-check","reason":"Approve one next repair execution before Observer demo status."}' >/dev/null
post_json "$CORE_URL/operator/step" '{}' >/dev/null

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
status="$(curl --silent --fail "$CORE_URL/phase-2/next-repair-demo-status")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$status"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const status = JSON.parse(process.argv[4]);

for (const token of [
  "Phase 2 Next Repair Demo",
  "phase2-next-repair-demo-status-panel",
  "phase2-next-repair-demo-status",
  "phase2-next-repair-demo-evidence",
  "phase2-next-repair-demo-target",
  "phase2-next-repair-demo-mutation",
  "phase2-next-repair-demo-json",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of [
  "/phase-2/next-repair-demo-status",
  "refreshPhase2NextRepairDemoStatus",
  "openclaw-systemd-next-repair-demo-status-v0",
  "openclaw-body-evidence-timeline",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (!status.ok || status.registry !== "openclaw-systemd-next-repair-demo-status-v0" || status.status !== "demo_ready") {
  throw new Error(`Observer source should expose next repair demo status: ${JSON.stringify(status)}`);
}
if (status.summary?.ready !== true
  || status.summary?.targetUnit !== "openclaw-system-sense.service"
  || status.summary?.command !== "systemctl restart openclaw-system-sense.service") {
  throw new Error(`Observer next repair demo status summary should cite execution evidence: ${JSON.stringify(status.summary)}`);
}
if (status.governance?.executesCommand !== false || status.governance?.hostMutation !== false) {
  throw new Error(`Observer next repair demo status should be read-only: ${JSON.stringify(status.governance)}`);
}

console.log(JSON.stringify({
  observerOpenClawSystemdNextRepairDemoStatus: {
    status: "passed",
    panel: "Phase 2 Next Repair Demo",
    registry: status.registry,
    target: status.summary.targetUnit,
    command: status.summary.command,
    exitCode: status.summary.exitCode,
    next: status.next?.recommendedSlice,
  },
}, null, 2));
EOF
