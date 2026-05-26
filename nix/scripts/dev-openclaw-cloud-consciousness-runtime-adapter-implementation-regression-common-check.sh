#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OBSERVER_CHECK="${PHASE23_OBSERVER_CHECK:-false}"
PORT_BASE="${PHASE23_PORT_BASE:-8560}"
CLOUD_DIR="$REPO_ROOT/.artifacts/openclaw-cloud-consciousness"
PROVIDER_RESPONSE_FILE="$CLOUD_DIR/provider-response-rehearsal.jsonl"
RUNBOOK_FILE="$CLOUD_DIR/live-provider-call-runbook.jsonl"
EXECUTION_PLAN_FILE="$CLOUD_DIR/live-provider-call-execution-plan.jsonl"
PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_23_PLAN.md"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$PORT_BASE}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((PORT_BASE + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((PORT_BASE + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((PORT_BASE + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((PORT_BASE + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((PORT_BASE + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((PORT_BASE + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((PORT_BASE + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((PORT_BASE + 8))}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-23-runtime-adapter-implementation-regression-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-23-runtime-adapter-implementation-regression-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
SCAFFOLD_REGISTRY="openclaw-cloud-consciousness-live-provider-call-runtime-adapter-implementation-v0"
TASK_REGISTRY="openclaw-cloud-consciousness-live-provider-runtime-adapter-implementation-task-v0"

. "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-fixtures.sh"

post_json() {
  local url="$1"
  local payload="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data "$payload"
}

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
seed_live_provider_call_prerequisites "$CLOUD_DIR" "$PROVIDER_RESPONSE_FILE" "$RUNBOOK_FILE" "$EXECUTION_PLAN_FILE" "phase23-prereq"
cleanup() {
  rm -f "${SCAFFOLD_FILE:-}" "${TASK_FILE:-}" "${APPROVED_FILE:-}" "${STEP_FILE:-}" "${HTML_FILE:-}" "${CLIENT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT
"$SCRIPT_DIR/dev-up.sh"

SCAFFOLD_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-call-runtime-adapter-implementation" > "$SCAFFOLD_FILE"

if [[ "$OBSERVER_CHECK" == "true" ]]; then
  HTML_FILE="$(mktemp)"
  CLIENT_FILE="$(mktemp)"
  curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
  curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
  node - <<'EOF' "$SCAFFOLD_REGISTRY" "$TASK_REGISTRY" "$SCAFFOLD_FILE" "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const scaffoldRegistry = process.argv[2];
const taskRegistry = process.argv[3];
const scaffold = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const html = fs.readFileSync(process.argv[5], "utf8");
const client = fs.readFileSync(process.argv[6], "utf8");
for (const token of [
  "Cloud Consciousness Live Provider Runtime Adapter Implementation",
  "cloud-consciousness-live-provider-call-runtime-adapter-implementation-panel",
  "cloud-live-runtime-adapter-impl-ready",
]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of [
  "/cloud-consciousness/live-provider-call-runtime-adapter-implementation",
  "/cloud-consciousness/live-provider-runtime-adapter-implementation-tasks",
  scaffoldRegistry,
  taskRegistry,
]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
if (!scaffold.ok || scaffold.summary?.ready !== true) {
  throw new Error(`Observer Phase 23 scaffold prerequisite should be ready: ${JSON.stringify(scaffold.summary)}`);
}
console.log(JSON.stringify({ observerOpenClawCloudConsciousnessRuntimeAdapterImplementationRegression: { status: "passed", scaffoldRegistry, taskRegistry } }, null, 2));
EOF
  exit 0
fi

TASK_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
post_json "$CORE_URL/cloud-consciousness/live-provider-runtime-adapter-implementation-tasks" '{"confirm":true}' > "$TASK_FILE"
approval_id="$(node -e 'const fs=require("node:fs"); const data=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); if(!data.approval?.id) throw new Error("missing approval id"); console.log(data.approval.id)' "$TASK_FILE")"
post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"phase-23-check","reason":"Approve deferred runtime adapter implementation regression shell."}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"

node - <<'EOF' "$SCAFFOLD_REGISTRY" "$TASK_REGISTRY" "$PLAN_DOC" "$SCAFFOLD_FILE" "$TASK_FILE" "$STEP_FILE"
const fs = require("node:fs");
const scaffoldRegistry = process.argv[2];
const taskRegistry = process.argv[3];
const doc = fs.readFileSync(process.argv[4], "utf8");
const scaffold = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const task = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const step = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-runtime-adapter-implementation-regression",
  "Phase 20-22 runtime adapter implementation chain",
  "no adapter implementation, SDK load, credential value read, endpoint contact, network egress, or live provider call",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 23 plan doc missing ${token}`);
}
if (
  !scaffold.ok
  || scaffold.registry !== scaffoldRegistry
  || scaffold.summary?.ready !== true
  || scaffold.summary?.implementsRuntimeAdapter !== false
  || scaffold.summary?.networkEgress !== false
) {
  throw new Error(`Phase 20 scaffold regression failed: ${JSON.stringify(scaffold.summary)}`);
}
if (
  !task.ok
  || task.registry !== taskRegistry
  || task.task?.status !== "queued"
  || task.approval?.status !== "pending"
  || task.task?.cloudConsciousnessLiveProviderRuntimeAdapterImplementation?.implementationStatus !== "task_shell_only"
) {
  throw new Error(`Phase 21 task shell regression failed: ${JSON.stringify(task)}`);
}
const shell = step.task?.cloudConsciousnessLiveProviderRuntimeAdapterImplementation;
if (
  !step.ok
  || shell?.registry !== taskRegistry
  || shell?.implementationStatus !== "deferred_after_approval"
  || !step.task?.phaseHistory?.some((entry) => entry.phase === "cloud_consciousness_live_provider_runtime_adapter_implementation_deferred")
) {
  throw new Error(`Phase 22 deferred regression failed: ${JSON.stringify(step)}`);
}
if (
  shell.implementsRuntimeAdapter !== false
  || shell.providerSdkLoaded !== false
  || shell.providerCredentialRead !== false
  || shell.credentialValueRead !== false
  || shell.endpointContacted !== false
  || shell.networkEgress !== false
  || shell.transmitsExternally !== false
  || shell.liveProviderCallEnabled !== false
) {
  throw new Error(`Phase 23 regression must keep live provider activity disabled: ${JSON.stringify(shell)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessRuntimeAdapterImplementationRegression: { status: "passed", taskId: step.task.id, scaffoldRegistry, taskRegistry } }, null, 2));
EOF
