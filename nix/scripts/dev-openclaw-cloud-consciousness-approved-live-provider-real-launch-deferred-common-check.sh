#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OBSERVER_CHECK="${PHASE58_OBSERVER_CHECK:-false}"
PORT_BASE="${PHASE58_PORT_BASE:-20700}"
CLOUD_DIR="$REPO_ROOT/.artifacts/openclaw-cloud-consciousness"
PROVIDER_RESPONSE_FILE="$CLOUD_DIR/provider-response-rehearsal.jsonl"
RUNBOOK_FILE="$CLOUD_DIR/live-provider-call-runbook.jsonl"
EXECUTION_PLAN_FILE="$CLOUD_DIR/live-provider-call-execution-plan.jsonl"
PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_58_PLAN.md"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$PORT_BASE}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((PORT_BASE + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((PORT_BASE + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((PORT_BASE + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((PORT_BASE + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((PORT_BASE + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((PORT_BASE + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((PORT_BASE + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((PORT_BASE + 8))}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-58-real-launch-deferred-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-58-real-launch-deferred-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
TASK_REGISTRY="openclaw-cloud-consciousness-live-provider-real-launch-task-v0"
DEFERRED_STATUS="real_launch_deferred_after_approval"

. "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-fixtures.sh"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"


"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
seed_live_provider_call_prerequisites "$CLOUD_DIR" "$PROVIDER_RESPONSE_FILE" "$RUNBOOK_FILE" "$EXECUTION_PLAN_FILE" "phase58-prereq"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${TASK_FILE:-}" "${APPROVED_FILE:-}" "${STEP_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

if [[ "$OBSERVER_CHECK" == "true" ]]; then
  HTML_FILE="$(mktemp)"
  CLIENT_FILE="$(mktemp)"
  curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
  curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
  node - <<'EOF' "$TASK_REGISTRY" "$DEFERRED_STATUS" "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const taskRegistry = process.argv[2];
const deferredStatus = process.argv[3];
const html = fs.readFileSync(process.argv[4], "utf8");
const client = fs.readFileSync(process.argv[5], "utf8");
for (const token of [
  "Cloud Consciousness Live Provider Real Launch Route Review",
  "cloud-consciousness-live-provider-real-launch-route-review-panel",
]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of [
  "/cloud-consciousness/live-provider-real-launch-tasks",
  taskRegistry,
  deferredStatus,
  "openclaw-cloud-consciousness-live-provider-real-launch-execution-preflight",
]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
console.log(JSON.stringify({ observerOpenClawCloudConsciousnessApprovedRealLaunchDeferred: { status: "passed", taskRegistry, deferredStatus } }, null, 2));
EOF
  exit 0
fi

TASK_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
post_json "$CORE_URL/cloud-consciousness/live-provider-real-launch-tasks" '{"confirm":true}' > "$TASK_FILE"
approval_id="$(node -e 'const fs=require("node:fs"); const data=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); if(!data.approval?.id) throw new Error("missing approval id"); console.log(data.approval.id)' "$TASK_FILE")"
post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"phase-58-check","reason":"Approve real launch task shell while keeping execution deferred."}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
node - <<'EOF' "$TASK_REGISTRY" "$DEFERRED_STATUS" "$PLAN_DOC" "$TASK_FILE" "$STEP_FILE"
const fs = require("node:fs");
const taskRegistry = process.argv[2];
const deferredStatus = process.argv[3];
const doc = fs.readFileSync(process.argv[4], "utf8");
const task = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const step = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-approved-live-provider-real-launch-deferred",
  "real_launch_deferred_after_approval",
  "launchExecutionDeferred: true",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 58 plan doc missing ${token}`);
}
if (!task.ok || task.registry !== taskRegistry || task.approval?.status !== "pending") {
  throw new Error(`Phase 58 should start from a pending real launch task shell: ${JSON.stringify(task)}`);
}
const shell = step.task?.cloudConsciousnessLiveProviderRealLaunch;
if (!step.ok || step.task?.outcome?.details?.phase !== "cloud_consciousness_live_provider_real_launch_deferred" || shell?.implementationStatus !== "deferred_after_approval") {
  throw new Error(`Phase 58 operator step should defer after approval: ${JSON.stringify(step)}`);
}
if (
  shell.operatorApprovalCaptured !== true
  || shell.launchExecutionDeferred !== true
  || shell.launchAuthorized !== false
  || shell.launchExecuted !== false
  || shell.credentialValueRead !== false
  || shell.endpointContacted !== false
  || shell.networkEgress !== false
  || shell.providerResponseCreated !== false
  || shell.rollbackExecuted !== false
  || shell.hostMutation !== false
  || shell.liveProviderCallEnabled !== false
) {
  throw new Error(`Approved real launch task must remain deferred without live activity: ${JSON.stringify(shell)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessApprovedRealLaunchDeferred: { status: "passed", taskId: step.task.id, taskRegistry, deferredStatus } }, null, 2));
EOF
