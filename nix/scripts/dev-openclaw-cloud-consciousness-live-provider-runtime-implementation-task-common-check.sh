#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OBSERVER_CHECK="${PHASE18_OBSERVER_CHECK:-false}"
PORT_BASE="${PHASE18_PORT_BASE:-8460}"
CLOUD_DIR="$REPO_ROOT/.artifacts/openclaw-cloud-consciousness"
PROVIDER_RESPONSE_FILE="$CLOUD_DIR/provider-response-rehearsal.jsonl"
RUNBOOK_FILE="$CLOUD_DIR/live-provider-call-runbook.jsonl"
EXECUTION_PLAN_FILE="$CLOUD_DIR/live-provider-call-execution-plan.jsonl"
PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_18_PLAN.md"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$PORT_BASE}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((PORT_BASE + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((PORT_BASE + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((PORT_BASE + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((PORT_BASE + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((PORT_BASE + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((PORT_BASE + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((PORT_BASE + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((PORT_BASE + 8))}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-18-runtime-implementation-task-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-18-runtime-implementation-task-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
REGISTRY="openclaw-cloud-consciousness-live-provider-runtime-implementation-task-v0"

. "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-fixtures.sh"

post_json() {
  local url="$1"
  local payload="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data "$payload"
}

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
seed_live_provider_call_prerequisites "$CLOUD_DIR" "$PROVIDER_RESPONSE_FILE" "$RUNBOOK_FILE" "$EXECUTION_PLAN_FILE" "phase18-prereq"
cleanup() {
  rm -f "${DATA_FILE:-}" "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${TASK_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT
"$SCRIPT_DIR/dev-up.sh"

DATA_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-call-runtime-implementation-plan" > "$DATA_FILE"

if [[ "$OBSERVER_CHECK" == "true" ]]; then
  HTML_FILE="$(mktemp)"
  CLIENT_FILE="$(mktemp)"
  curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
  curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
  node - <<'EOF' "$REGISTRY" "$DATA_FILE" "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const registry = process.argv[2];
const data = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const html = fs.readFileSync(process.argv[4], "utf8");
const client = fs.readFileSync(process.argv[5], "utf8");
for (const token of [
  "Cloud Consciousness Live Provider Runtime Implementation Plan",
  "cloud-consciousness-live-provider-call-runtime-implementation-plan-panel",
  "cloud-live-runtime-impl-plan-ready",
]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of [
  "/cloud-consciousness/live-provider-runtime-implementation-tasks",
  registry,
  "refreshCloudConsciousnessLiveProviderCallRuntimeImplementationPlan",
]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
if (!data.ok || data.summary?.ready !== true || data.next?.recommendedSlice !== "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-task") {
  throw new Error(`Observer Phase 18 task route should be visible from Phase 17 plan: ${JSON.stringify(data.summary)}`);
}
console.log(JSON.stringify({ observerOpenClawCloudConsciousnessRuntimeImplementationTask: { status: "passed", registry } }, null, 2));
EOF
  exit 0
fi

TASK_FILE="$(mktemp)"
post_json "$CORE_URL/cloud-consciousness/live-provider-runtime-implementation-tasks" '{"confirm":true}' > "$TASK_FILE"

node - <<'EOF' "$REGISTRY" "$PLAN_DOC" "$DATA_FILE" "$TASK_FILE"
const fs = require("node:fs");
const registry = process.argv[2];
const doc = fs.readFileSync(process.argv[3], "utf8");
const plan = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const task = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-live-provider-runtime-implementation-task",
  "Create the live provider-call runtime implementation task shell without implementing runtime code",
  "cloud-live-provider-runtime-implementation.mjs",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 18 plan doc missing ${token}`);
}
if (!plan.ok || plan.summary?.ready !== true || plan.next?.recommendedSlice !== "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-task") {
  throw new Error(`Phase 17 plan prerequisite should be ready: ${JSON.stringify(plan.summary)}`);
}
if (
  !task.ok
  || task.registry !== registry
  || task.task?.type !== "cloud_consciousness_live_provider_runtime_implementation_task"
  || task.approval?.status !== "pending"
  || task.task?.cloudConsciousnessLiveProviderRuntimeImplementation?.implementationStatus !== "task_shell_only"
) {
  throw new Error(`Phase 18 runtime implementation task should be approval-gated shell only: ${JSON.stringify(task)}`);
}
const shell = task.task.cloudConsciousnessLiveProviderRuntimeImplementation;
if (
  shell.providerSdkLoaded !== false
  || shell.providerCredentialRead !== false
  || shell.credentialValueRead !== false
  || shell.endpointContacted !== false
  || shell.networkEgress !== false
  || shell.liveProviderCallEnabled !== false
) {
  throw new Error(`Phase 18 shell must keep all live activity disabled: ${JSON.stringify(shell)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessRuntimeImplementationTask: { status: "passed", taskId: task.task.id, approvalId: task.approval.id, registry } }, null, 2));
EOF
