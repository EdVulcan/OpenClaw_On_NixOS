#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OBSERVER_CHECK="${PHASE59_OBSERVER_CHECK:-false}"
PORT_BASE="${PHASE59_PORT_BASE:-20800}"
CLOUD_DIR="$REPO_ROOT/.artifacts/openclaw-cloud-consciousness"
PROVIDER_RESPONSE_FILE="$CLOUD_DIR/provider-response-rehearsal.jsonl"
RUNBOOK_FILE="$CLOUD_DIR/live-provider-call-runbook.jsonl"
EXECUTION_PLAN_FILE="$CLOUD_DIR/live-provider-call-execution-plan.jsonl"
PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_59_PLAN.md"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$PORT_BASE}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((PORT_BASE + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((PORT_BASE + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((PORT_BASE + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((PORT_BASE + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((PORT_BASE + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((PORT_BASE + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((PORT_BASE + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((PORT_BASE + 8))}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-59-real-launch-execution-preflight-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-59-real-launch-execution-preflight-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
TASK_REGISTRY="openclaw-cloud-consciousness-live-provider-real-launch-task-v0"
PREFLIGHT_REGISTRY="openclaw-cloud-consciousness-live-provider-real-launch-execution-preflight-v0"
PREFLIGHT_STATUS="real_launch_execution_preflight_recorded"

. "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-fixtures.sh"

post_json() {
  local url="$1"
  local payload="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data "$payload"
}

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
seed_live_provider_call_prerequisites "$CLOUD_DIR" "$PROVIDER_RESPONSE_FILE" "$RUNBOOK_FILE" "$EXECUTION_PLAN_FILE" "phase59-prereq"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${TASK_FILE:-}" "${APPROVED_FILE:-}" "${STEP_FILE:-}" "${PREFLIGHT_FILE:-}" "${BEFORE_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

if [[ "$OBSERVER_CHECK" == "true" ]]; then
  HTML_FILE="$(mktemp)"
  CLIENT_FILE="$(mktemp)"
  curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
  curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
  node - <<'EOF' "$TASK_REGISTRY" "$PREFLIGHT_REGISTRY" "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const taskRegistry = process.argv[2];
const preflightRegistry = process.argv[3];
const html = fs.readFileSync(process.argv[4], "utf8");
const client = fs.readFileSync(process.argv[5], "utf8");
for (const token of [
  "Cloud Consciousness Live Provider Real Launch Execution Preflight",
  "cloud-consciousness-live-provider-real-launch-execution-preflight-panel",
]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of [
  "/cloud-consciousness/live-provider-real-launch-execution-preflight",
  "refreshCloudConsciousnessLiveProviderRealLaunchExecutionPreflight",
  "openclaw-cloud-consciousness-live-provider-credential-value-access-gate",
  taskRegistry,
  preflightRegistry,
]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
console.log(JSON.stringify({ observerOpenClawCloudConsciousnessRealLaunchExecutionPreflight: { status: "passed", taskRegistry, preflightRegistry } }, null, 2));
EOF
  exit 0
fi

BEFORE_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-real-launch-execution-preflight" > "$BEFORE_FILE"
TASK_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
PREFLIGHT_FILE="$(mktemp)"
post_json "$CORE_URL/cloud-consciousness/live-provider-real-launch-tasks" '{"confirm":true}' > "$TASK_FILE"
approval_id="$(node -e 'const fs=require("node:fs"); const data=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); if(!data.approval?.id) throw new Error("missing approval id"); console.log(data.approval.id)' "$TASK_FILE")"
post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"phase-59-check","reason":"Approve real launch task shell before execution preflight."}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
post_json "$CORE_URL/cloud-consciousness/live-provider-real-launch-execution-preflight" '{"confirm":true}' > "$PREFLIGHT_FILE"

node - <<'EOF' "$TASK_REGISTRY" "$PREFLIGHT_REGISTRY" "$PREFLIGHT_STATUS" "$PLAN_DOC" "$BEFORE_FILE" "$STEP_FILE" "$PREFLIGHT_FILE"
const fs = require("node:fs");
const taskRegistry = process.argv[2];
const preflightRegistry = process.argv[3];
const preflightStatus = process.argv[4];
const doc = fs.readFileSync(process.argv[5], "utf8");
const before = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const step = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
const recorded = JSON.parse(fs.readFileSync(process.argv[8], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-live-provider-real-launch-execution-preflight",
  "Requires Phase 58 approved deferred evidence",
  "executionPreflightRecorded: true",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 59 plan doc missing ${token}`);
}
if (before.summary?.approvedDeferredEvidenceFound !== false || before.summary?.ready !== false) {
  throw new Error(`Phase 59 preflight should wait for Phase 58 evidence before approval: ${JSON.stringify(before)}`);
}
if (
  !step.ok
  || step.task?.outcome?.details?.phase !== "cloud_consciousness_live_provider_real_launch_deferred"
  || step.task?.cloudConsciousnessLiveProviderRealLaunch?.implementationStatus !== "deferred_after_approval"
) {
  throw new Error(`Phase 59 prerequisite step should produce Phase 58 deferred evidence: ${JSON.stringify(step)}`);
}
const shell = recorded.task?.cloudConsciousnessLiveProviderRealLaunch;
const preflight = recorded.preflight;
if (
  !recorded.ok
  || recorded.registry !== preflightRegistry
  || recorded.status !== preflightStatus
  || preflight?.registry !== preflightRegistry
  || preflight?.summary?.ready !== true
  || preflight?.summary?.approvedDeferredEvidenceFound !== true
  || shell?.registry !== taskRegistry
  || shell?.implementationStatus !== "execution_preflight_recorded"
  || shell?.executionPreflightRecorded !== true
  || shell?.executionPreflightRegistry !== preflightRegistry
  || !Array.isArray(shell?.executionPreflightChecklist)
  || shell.executionPreflightChecklist.length < 6
) {
  throw new Error(`Phase 59 should record preflight evidence on approved deferred task: ${JSON.stringify(recorded)}`);
}
if (
  shell.launchAuthorized !== false
  || shell.launchExecuted !== false
  || shell.credentialValueRead !== false
  || shell.endpointContacted !== false
  || shell.networkEgress !== false
  || shell.providerResponseCreated !== false
  || shell.rollbackExecuted !== false
  || shell.hostMutation !== false
  || shell.liveProviderCallEnabled !== false
  || preflight.summary.credentialValueRead !== false
  || preflight.summary.endpointContacted !== false
  || preflight.summary.networkEgress !== false
  || preflight.summary.providerResponseCreated !== false
  || preflight.summary.rollbackExecuted !== false
  || preflight.summary.hostMutation !== false
  || preflight.summary.liveProviderCallEnabled !== false
) {
  throw new Error(`Phase 59 preflight must not perform live launch activity: ${JSON.stringify(recorded)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessRealLaunchExecutionPreflight: { status: "passed", taskId: recorded.task.id, taskRegistry, preflightRegistry } }, null, 2));
EOF
