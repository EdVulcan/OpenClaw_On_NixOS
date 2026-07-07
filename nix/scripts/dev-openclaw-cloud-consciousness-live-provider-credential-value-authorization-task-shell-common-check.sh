#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OBSERVER_CHECK="${PHASE66_OBSERVER_CHECK:-false}"
PORT_BASE="${PHASE66_PORT_BASE:-21500}"
CLOUD_DIR="$REPO_ROOT/.artifacts/openclaw-cloud-consciousness"
PROVIDER_RESPONSE_FILE="$CLOUD_DIR/provider-response-rehearsal.jsonl"
RUNBOOK_FILE="$CLOUD_DIR/live-provider-call-runbook.jsonl"
EXECUTION_PLAN_FILE="$CLOUD_DIR/live-provider-call-execution-plan.jsonl"
PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_66_PLAN.md"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$PORT_BASE}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((PORT_BASE + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((PORT_BASE + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((PORT_BASE + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((PORT_BASE + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((PORT_BASE + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((PORT_BASE + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((PORT_BASE + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((PORT_BASE + 8))}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-66-credential-value-authorization-task-shell-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-66-credential-value-authorization-task-shell-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
TASK_REGISTRY="openclaw-cloud-consciousness-live-provider-real-launch-task-v0"
PREFLIGHT_REGISTRY="openclaw-cloud-consciousness-live-provider-real-launch-execution-preflight-v0"
CREDENTIAL_GATE_REGISTRY="openclaw-cloud-consciousness-live-provider-credential-value-access-gate-v0"
ENDPOINT_GATE_REGISTRY="openclaw-cloud-consciousness-live-provider-endpoint-network-egress-gate-v0"
ROUTE_PREFLIGHT_REGISTRY="openclaw-cloud-consciousness-live-provider-egress-execution-route-task-preflight-v0"
EGRESS_TASK_REGISTRY="openclaw-cloud-consciousness-live-provider-egress-execution-task-v0"
CREDENTIAL_AUTH_ROUTE_REGISTRY="openclaw-cloud-consciousness-live-provider-credential-value-authorization-route-v0"
CREDENTIAL_AUTH_TASK_REGISTRY="openclaw-cloud-consciousness-live-provider-credential-value-authorization-task-v0"
CREDENTIAL_AUTH_TASK_STATUS="credential_value_authorization_task_shell_deferred_after_approval"

. "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-fixtures.sh"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"


"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
seed_live_provider_call_prerequisites "$CLOUD_DIR" "$PROVIDER_RESPONSE_FILE" "$RUNBOOK_FILE" "$EXECUTION_PLAN_FILE" "phase66-prereq"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${TASK_FILE:-}" "${APPROVED_FILE:-}" "${STEP_FILE:-}" "${PREFLIGHT_FILE:-}" "${BEFORE_FILE:-}" "${CREDENTIAL_GATE_FILE:-}" "${ENDPOINT_GATE_FILE:-}" "${ROUTE_PREFLIGHT_FILE:-}" "${EGRESS_TASK_FILE:-}" "${EGRESS_APPROVED_FILE:-}" "${EGRESS_STEP_FILE:-}" "${CREDENTIAL_AUTH_ROUTE_FILE:-}" "${CREDENTIAL_AUTH_TASK_FILE:-}" "${CREDENTIAL_AUTH_APPROVED_FILE:-}" "${CREDENTIAL_AUTH_STEP_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

if [[ "$OBSERVER_CHECK" == "true" ]]; then
  HTML_FILE="$(mktemp)"
  CLIENT_FILE="$(mktemp)"
  curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
  curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
  node - <<'EOF' "$TASK_REGISTRY" "$PREFLIGHT_REGISTRY" "$CREDENTIAL_GATE_REGISTRY" "$ENDPOINT_GATE_REGISTRY" "$ROUTE_PREFLIGHT_REGISTRY" "$EGRESS_TASK_REGISTRY" "$CREDENTIAL_AUTH_ROUTE_REGISTRY" "$CREDENTIAL_AUTH_TASK_REGISTRY" "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const taskRegistry = process.argv[2];
const preflightRegistry = process.argv[3];
const credentialGateRegistry = process.argv[4];
const endpointGateRegistry = process.argv[5];
const routePreflightRegistry = process.argv[6];
const egressTaskRegistry = process.argv[7];
const credentialAuthRouteRegistry = process.argv[8];
const credentialAuthTaskRegistry = process.argv[9];
const html = fs.readFileSync(process.argv[10], "utf8");
const client = fs.readFileSync(process.argv[11], "utf8");
for (const token of [
  "Cloud Consciousness Live Provider Credential Value Authorization Task Shell",
  "cloud-consciousness-live-provider-credential-value-authorization-task-shell-panel",
]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of [
  "/cloud-consciousness/live-provider-credential-value-authorization-tasks",
  "refreshCloudConsciousnessLiveProviderCredentialValueAuthorizationTaskShell",
  "openclaw-cloud-consciousness-live-provider-credential-value-authorization-approved-deferred",
  taskRegistry,
  preflightRegistry,
  credentialGateRegistry,
  endpointGateRegistry,
  routePreflightRegistry,
  egressTaskRegistry,
  credentialAuthRouteRegistry,
  credentialAuthTaskRegistry,
]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
console.log(JSON.stringify({ observerOpenClawCloudConsciousnessCredentialValueAuthorizationTaskShell: { status: "passed", taskRegistry, preflightRegistry, credentialGateRegistry, endpointGateRegistry, routePreflightRegistry, egressTaskRegistry, credentialAuthRouteRegistry, credentialAuthTaskRegistry } }, null, 2));
EOF
  exit 0
fi

BEFORE_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-egress-execution-route-task-preflight" > "$BEFORE_FILE"
TASK_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
PREFLIGHT_FILE="$(mktemp)"
CREDENTIAL_GATE_FILE="$(mktemp)"
ENDPOINT_GATE_FILE="$(mktemp)"
ROUTE_PREFLIGHT_FILE="$(mktemp)"
EGRESS_TASK_FILE="$(mktemp)"
EGRESS_APPROVED_FILE="$(mktemp)"
EGRESS_STEP_FILE="$(mktemp)"
APPROVED_DEFERRED_FILE="$(mktemp)"
CREDENTIAL_AUTH_ROUTE_FILE="$(mktemp)"
CREDENTIAL_AUTH_TASK_FILE="$(mktemp)"
CREDENTIAL_AUTH_APPROVED_FILE="$(mktemp)"
CREDENTIAL_AUTH_STEP_FILE="$(mktemp)"
post_json "$CORE_URL/cloud-consciousness/live-provider-real-launch-tasks" '{"confirm":true}' > "$TASK_FILE"
approval_id="$(node -e 'const fs=require("node:fs"); const data=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); if(!data.approval?.id) throw new Error("missing approval id"); console.log(data.approval.id)' "$TASK_FILE")"
post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"phase-66-check","reason":"Approve real launch task shell before execution preflight and credential value authorization task shell."}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
post_json "$CORE_URL/cloud-consciousness/live-provider-real-launch-execution-preflight" '{"confirm":true}' > "$PREFLIGHT_FILE"
post_json "$CORE_URL/cloud-consciousness/live-provider-credential-value-access-gate" '{"confirm":true}' > "$CREDENTIAL_GATE_FILE"
post_json "$CORE_URL/cloud-consciousness/live-provider-endpoint-network-egress-gate" '{"confirm":true}' > "$ENDPOINT_GATE_FILE"
post_json "$CORE_URL/cloud-consciousness/live-provider-egress-execution-route-task-preflight" '{"confirm":true}' > "$ROUTE_PREFLIGHT_FILE"
post_json "$CORE_URL/cloud-consciousness/live-provider-egress-execution-tasks" '{"confirm":true}' > "$EGRESS_TASK_FILE"
egress_approval_id="$(node -e 'const fs=require("node:fs"); const data=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); if(!data.approval?.id) throw new Error("missing egress approval id"); console.log(data.approval.id)' "$EGRESS_TASK_FILE")"
post_json "$CORE_URL/approvals/$egress_approval_id/approve" '{"approvedBy":"phase-66-check","reason":"Approve credential value authorization task shell while keeping endpoint contact and network egress deferred."}' > "$EGRESS_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$EGRESS_STEP_FILE"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-egress-execution-approved-deferred" > "$APPROVED_DEFERRED_FILE"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-credential-value-authorization-route" > "$CREDENTIAL_AUTH_ROUTE_FILE"
post_json "$CORE_URL/cloud-consciousness/live-provider-credential-value-authorization-tasks" '{"confirm":true}' > "$CREDENTIAL_AUTH_TASK_FILE"
credential_auth_approval_id="$(node -e 'const fs=require("node:fs"); const data=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); if(!data.approval?.id) throw new Error("missing credential auth approval id"); console.log(data.approval.id)' "$CREDENTIAL_AUTH_TASK_FILE")"
post_json "$CORE_URL/approvals/$credential_auth_approval_id/approve" '{"approvedBy":"phase-66-check","reason":"Approve credential value authorization task shell while keeping credential values unread."}' > "$CREDENTIAL_AUTH_APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$CREDENTIAL_AUTH_STEP_FILE"

node - <<'EOF' "$TASK_REGISTRY" "$PREFLIGHT_REGISTRY" "$CREDENTIAL_GATE_REGISTRY" "$ENDPOINT_GATE_REGISTRY" "$ROUTE_PREFLIGHT_REGISTRY" "$EGRESS_TASK_REGISTRY" "$CREDENTIAL_AUTH_ROUTE_REGISTRY" "$CREDENTIAL_AUTH_TASK_REGISTRY" "$CREDENTIAL_AUTH_TASK_STATUS" "$PLAN_DOC" "$BEFORE_FILE" "$PREFLIGHT_FILE" "$CREDENTIAL_GATE_FILE" "$ENDPOINT_GATE_FILE" "$ROUTE_PREFLIGHT_FILE" "$EGRESS_TASK_FILE" "$EGRESS_STEP_FILE" "$APPROVED_DEFERRED_FILE" "$CREDENTIAL_AUTH_ROUTE_FILE" "$CREDENTIAL_AUTH_TASK_FILE" "$CREDENTIAL_AUTH_STEP_FILE"
const fs = require("node:fs");
const taskRegistry = process.argv[2];
const preflightRegistry = process.argv[3];
const credentialGateRegistry = process.argv[4];
const endpointGateRegistry = process.argv[5];
const routePreflightRegistry = process.argv[6];
const egressTaskRegistry = process.argv[7];
const credentialAuthRouteRegistry = process.argv[8];
const credentialAuthTaskRegistry = process.argv[9];
const credentialAuthTaskStatus = process.argv[10];
const doc = fs.readFileSync(process.argv[11], "utf8");
const before = JSON.parse(fs.readFileSync(process.argv[12], "utf8"));
const preflightRecord = JSON.parse(fs.readFileSync(process.argv[13], "utf8"));
const credentialGateRecord = JSON.parse(fs.readFileSync(process.argv[14], "utf8"));
const endpointGateRecord = JSON.parse(fs.readFileSync(process.argv[15], "utf8"));
const routePreflightRecord = JSON.parse(fs.readFileSync(process.argv[16], "utf8"));
const egressTaskRecord = JSON.parse(fs.readFileSync(process.argv[17], "utf8"));
const egressStepRecord = JSON.parse(fs.readFileSync(process.argv[18], "utf8"));
const approvedDeferred = JSON.parse(fs.readFileSync(process.argv[19], "utf8"));
const credentialAuthRoute = JSON.parse(fs.readFileSync(process.argv[20], "utf8"));
const credentialAuthTaskRecord = JSON.parse(fs.readFileSync(process.argv[21], "utf8"));
const credentialAuthStepRecord = JSON.parse(fs.readFileSync(process.argv[22], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-live-provider-credential-value-authorization-task-shell",
  "Requires Phase 65 credential value authorization route evidence",
  "credentialValueAuthorizationTaskApproved: true",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 66 plan doc missing ${token}`);
}
if (before.summary?.endpointNetworkEgressGateFound !== false || before.summary?.ready !== false) {
  throw new Error(`Phase 64 prerequisite chain should start without Phase 62 evidence: ${JSON.stringify(before)}`);
}
if (!preflightRecord.ok || preflightRecord.registry !== preflightRegistry || preflightRecord.status !== "real_launch_execution_preflight_recorded") {
  throw new Error(`Phase 63 prerequisite should record Phase 59 preflight: ${JSON.stringify(preflightRecord)}`);
}
if (!credentialGateRecord.ok || credentialGateRecord.registry !== credentialGateRegistry || credentialGateRecord.status !== "credential_value_access_gate_recorded_denied") {
  throw new Error(`Phase 63 prerequisite should record Phase 60 credential gate: ${JSON.stringify(credentialGateRecord)}`);
}
if (!endpointGateRecord.ok || endpointGateRecord.registry !== endpointGateRegistry || endpointGateRecord.status !== "endpoint_network_egress_gate_recorded_denied") {
  throw new Error(`Phase 63 prerequisite should record Phase 61 endpoint network egress gate: ${JSON.stringify(endpointGateRecord)}`);
}
if (!routePreflightRecord.ok || routePreflightRecord.registry !== routePreflightRegistry || routePreflightRecord.status !== "egress_execution_route_task_preflight_recorded_deferred") {
  throw new Error(`Phase 64 prerequisite should record Phase 62 egress route/task preflight: ${JSON.stringify(routePreflightRecord)}`);
}
const taskShell = egressTaskRecord.task?.cloudConsciousnessLiveProviderEgressExecution;
const completedShell = egressStepRecord.task?.cloudConsciousnessLiveProviderEgressExecution;
if (
  !egressTaskRecord.ok
  || egressTaskRecord.registry !== egressTaskRegistry
  || egressTaskRecord.approval?.status !== "pending"
  || taskShell?.registry !== egressTaskRegistry
  || taskShell?.sourceRegistry !== routePreflightRegistry
  || taskShell?.implementationStatus !== "task_shell_only"
  || taskShell?.egressExecutionTaskCreated !== true
  || taskShell?.egressExecutionTaskApproved !== false
  || !egressStepRecord.ok
  || egressStepRecord.task?.status !== "completed"
  || egressStepRecord.task?.outcome?.details?.phase !== "cloud_consciousness_live_provider_egress_execution_task_shell_deferred"
  || completedShell?.registry !== egressTaskRegistry
  || completedShell?.implementationStatus !== "deferred_after_approval"
  || completedShell?.egressExecutionTaskCreated !== true
  || completedShell?.egressExecutionTaskApproved !== true
  || completedShell?.egressExecutionDeferred !== true
) {
  throw new Error(`Phase 64 prerequisite should create and approve deferred egress execution task shell evidence: ${JSON.stringify({ egressTaskRecord, egressStepRecord })}`);
}
if (
  !approvedDeferred.ok
  || approvedDeferred.registry !== "openclaw-cloud-consciousness-live-provider-egress-execution-approved-deferred-v0"
  || approvedDeferred.summary?.ready !== true
  || approvedDeferred.summary?.approvedDeferredEvidenceFound !== true
  || approvedDeferred.summary?.sourceTaskId !== egressStepRecord.task?.id
) {
  throw new Error(`Phase 66 prerequisite should expose approved deferred egress evidence: ${JSON.stringify(approvedDeferred)}`);
}
if (
  !credentialAuthRoute.ok
  || credentialAuthRoute.registry !== credentialAuthRouteRegistry
  || credentialAuthRoute.status !== "credential_value_authorization_route_ready"
  || credentialAuthRoute.summary?.ready !== true
  || credentialAuthRoute.summary?.credentialValueAuthorizationTaskCreated !== false
) {
  throw new Error(`Phase 66 prerequisite should expose credential value authorization route: ${JSON.stringify(credentialAuthRoute)}`);
}
const credentialTaskShell = credentialAuthTaskRecord.task?.cloudConsciousnessLiveProviderCredentialValueAuthorization;
const completedCredentialShell = credentialAuthStepRecord.task?.cloudConsciousnessLiveProviderCredentialValueAuthorization;
if (
  !credentialAuthTaskRecord.ok
  || credentialAuthTaskRecord.registry !== credentialAuthTaskRegistry
  || credentialAuthTaskRecord.approval?.status !== "pending"
  || credentialTaskShell?.registry !== credentialAuthTaskRegistry
  || credentialTaskShell?.sourceRegistry !== credentialAuthRouteRegistry
  || credentialTaskShell?.implementationStatus !== "task_shell_only"
  || credentialTaskShell?.credentialValueAuthorizationTaskCreated !== true
  || credentialTaskShell?.credentialValueAuthorizationTaskApproved !== false
  || !credentialAuthStepRecord.ok
  || credentialAuthStepRecord.task?.status !== "completed"
  || credentialAuthStepRecord.task?.outcome?.details?.phase !== "cloud_consciousness_live_provider_credential_value_authorization_task_shell_deferred"
  || completedCredentialShell?.registry !== credentialAuthTaskRegistry
  || completedCredentialShell?.implementationStatus !== "deferred_after_approval"
  || completedCredentialShell?.credentialValueAuthorizationTaskCreated !== true
  || completedCredentialShell?.credentialValueAuthorizationTaskApproved !== true
  || completedCredentialShell?.credentialValueAuthorizationDeferred !== true
) {
  throw new Error(`Phase 66 should create and approve deferred credential value authorization task shell: ${JSON.stringify({ credentialAuthTaskRecord, credentialAuthStepRecord })}`);
}
if (
  completedCredentialShell.credentialValueAccessAuthorized !== false
  || completedCredentialShell.credentialValueAccessDenied !== true
  || completedCredentialShell.credentialValueIncluded !== false
  || completedCredentialShell.credentialValueRead !== false
  || completedCredentialShell.credentialValueExposed !== false
  || completedCredentialShell.providerCredentialRead !== false
  || completedCredentialShell.endpointContacted !== false
  || completedCredentialShell.networkEgress !== false
  || completedCredentialShell.liveProviderCallEnabled !== false
) {
  throw new Error(`Phase 66 credential value authorization task shell must not read credentials or perform egress: ${JSON.stringify(credentialAuthStepRecord)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessCredentialValueAuthorizationTaskShell: { status: "passed", taskId: credentialAuthTaskRecord.task.id, taskRegistry, preflightRegistry, credentialGateRegistry, endpointGateRegistry, routePreflightRegistry, egressTaskRegistry, credentialAuthRouteRegistry, credentialAuthTaskRegistry } }, null, 2));
EOF
