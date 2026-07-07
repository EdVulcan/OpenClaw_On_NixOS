#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5980}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5981}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5982}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5983}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5984}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5985}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5986}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5987}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6050}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-phase-2-repair-demo-status-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-phase-2-repair-demo-status-check.json}"

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

# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"


"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
created="$(post_json "$CORE_URL/system/systemd/repair-execution-tasks" '{"unit":"openclaw-browser-runtime.service","confirm":true,"execute":true}')"
approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$created")"
approved="$(post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"observer-milestone-check","reason":"Create Observer Phase 2 repair demo evidence source."}')"
step="$(post_json "$CORE_URL/operator/step" '{}')"
demo_status="$(curl --silent --fail "$CORE_URL/phase-2/repair-demo-status")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$created" "$approved" "$step" "$demo_status"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const created = JSON.parse(process.argv[4]);
const approved = JSON.parse(process.argv[5]);
const step = JSON.parse(process.argv[6]);
const demoStatus = JSON.parse(process.argv[7]);

for (const token of [
  "Phase 2 Repair Demo",
  "phase2-repair-demo-status-panel",
  "phase2-repair-demo-status",
  "phase2-repair-demo-evidence",
  "phase2-repair-demo-json",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of [
  "refreshPhase2RepairDemoStatus",
  "/phase-2/repair-demo-status",
  "phase2RepairDemoStatus",
  "phase2RepairDemoEvidence",
  "avoidsSafetyBoundaryLoop",
  "No Automatic Recovery",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (!created.ok || !approved.ok || approved.approval?.status !== "approved" || !step.task?.outcome?.details?.postExecutionVerification) {
  throw new Error(`Observer source should create post-verification repair evidence: ${JSON.stringify({ created, approved, step })}`);
}
if (!demoStatus.ok || demoStatus.status !== "demo_ready" || demoStatus.summary?.latestTaskId !== step.task.id) {
  throw new Error(`Observer source should expose demo-ready repair status: ${JSON.stringify(demoStatus)}`);
}
if (demoStatus.governance?.readOnly !== true
  || demoStatus.governance?.createsTask !== false
  || demoStatus.governance?.executesCommand !== false
  || demoStatus.governance?.triggersRecovery !== false) {
  throw new Error(`Observer demo status should be read-only evidence: ${JSON.stringify(demoStatus.governance)}`);
}

console.log(JSON.stringify({
  observerOpenClawPhase2RepairDemoStatus: {
    status: "passed",
    panel: "Phase 2 Repair Demo",
    registry: demoStatus.registry,
    demoStatus: demoStatus.status,
    latestTaskId: demoStatus.summary.latestTaskId,
    evidence: `${demoStatus.summary.passed}/${demoStatus.summary.total}`,
  },
}, null, 2));
EOF
