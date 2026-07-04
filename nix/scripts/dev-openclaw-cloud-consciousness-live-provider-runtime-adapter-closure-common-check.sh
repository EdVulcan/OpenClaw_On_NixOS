#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CHECK_KIND="${PHASE52_55_CHECK_KIND:?PHASE52_55_CHECK_KIND is required}"
OBSERVER_CHECK="${PHASE52_55_OBSERVER_CHECK:-false}"
PORT_BASE="${PHASE52_55_PORT_BASE:-19240}"
CLOUD_DIR="$REPO_ROOT/.artifacts/openclaw-cloud-consciousness"
PROVIDER_RESPONSE_FILE="$CLOUD_DIR/provider-response-rehearsal.jsonl"
RUNBOOK_FILE="$CLOUD_DIR/live-provider-call-runbook.jsonl"
EXECUTION_PLAN_FILE="$CLOUD_DIR/live-provider-call-execution-plan.jsonl"
MODULE_FILE="$REPO_ROOT/services/openclaw-core/src/cloud-live-provider-runtime-adapter.mjs"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$PORT_BASE}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((PORT_BASE + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((PORT_BASE + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((PORT_BASE + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((PORT_BASE + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((PORT_BASE + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((PORT_BASE + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((PORT_BASE + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((PORT_BASE + 8))}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-52-55-$CHECK_KIND-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-52-55-$CHECK_KIND-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
COMPLETION_REGISTRY="openclaw-cloud-consciousness-live-provider-runtime-adapter-completion-v0"
CLOSURE_TASK_REGISTRY="openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-task-v0"
CLOSURE_EXIT_REGISTRY="openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-exit-v0"

. "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-fixtures.sh"

post_json() {
  local url="$1"
  local payload="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data "$payload"
}

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
seed_live_provider_call_prerequisites "$CLOUD_DIR" "$PROVIDER_RESPONSE_FILE" "$RUNBOOK_FILE" "$EXECUTION_PLAN_FILE" "phase52-55-prereq"
cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${COMPLETION_FILE:-}" "${EXIT_FILE:-}" "${TASK_FILE:-}" "${APPROVED_FILE:-}" "${STEP_FILE:-}" "${BEFORE_FILE:-}" "${AFTER_FILE:-}" "${REJECT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT
"$SCRIPT_DIR/dev-up.sh"

case "$CHECK_KIND" in
  completion)
    PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_52_PLAN.md"
    ;;
  closure-task)
    PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_53_PLAN.md"
    ;;
  approved-closure-deferred)
    PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_54_PLAN.md"
    ;;
  closure-regression|closure-exit)
    PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_55_PLAN.md"
    ;;
  *)
    echo "Unknown Phase 52-55 check kind: $CHECK_KIND" >&2
    exit 1
    ;;
esac

if [[ "$OBSERVER_CHECK" == "true" ]]; then
  HTML_FILE="$(mktemp)"
  CLIENT_FILE="$(mktemp)"
  curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
  curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
  node - <<'EOF' "$CHECK_KIND" "$COMPLETION_REGISTRY" "$CLOSURE_TASK_REGISTRY" "$CLOSURE_EXIT_REGISTRY" "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const kind = process.argv[2];
const completionRegistry = process.argv[3];
const closureTaskRegistry = process.argv[4];
const closureExitRegistry = process.argv[5];
const html = fs.readFileSync(process.argv[6], "utf8");
const client = fs.readFileSync(process.argv[7], "utf8");
for (const token of [
  "Cloud Consciousness Live Provider Runtime Adapter Completion",
  "cloud-consciousness-live-provider-runtime-adapter-completion-panel",
  "Cloud Consciousness Live Provider Runtime Adapter Closure",
  "cloud-consciousness-live-provider-runtime-adapter-closure-panel",
]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of [
  "/cloud-consciousness/live-provider-runtime-adapter-completion",
  "/cloud-consciousness/live-provider-runtime-adapter-closure-exit",
  "/cloud-consciousness/live-provider-runtime-adapter-closure-tasks",
  "refreshCloudConsciousnessLiveProviderRuntimeAdapterCompletion",
  "refreshCloudConsciousnessLiveProviderRuntimeAdapterClosure",
  completionRegistry,
  closureTaskRegistry,
  closureExitRegistry,
]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
console.log(JSON.stringify({ observerOpenClawCloudConsciousnessRuntimeAdapterClosure: { status: "passed", kind, completionRegistry, closureTaskRegistry, closureExitRegistry } }, null, 2));
EOF
  exit 0
fi

COMPLETION_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-runtime-adapter-completion" > "$COMPLETION_FILE"

if [[ "$CHECK_KIND" == "completion" ]]; then
  node - <<'EOF' "$COMPLETION_REGISTRY" "$PLAN_DOC" "$COMPLETION_FILE"
const fs = require("node:fs");
const registry = process.argv[2];
const doc = fs.readFileSync(process.argv[3], "utf8");
const completion = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-live-provider-runtime-adapter-completion",
  "buildProviderRequest",
  "buildRollbackNote",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 52 plan doc missing ${token}`);
}
if (!completion.ok || completion.registry !== registry) {
  throw new Error(`Unexpected completion registry: ${JSON.stringify(completion)}`);
}
const summary = completion.summary ?? {};
if (
  summary.ready !== true
  || summary.completionPercent !== 100
  || summary.methodCount !== 6
  || summary.implementedMethodCount !== 6
  || summary.readyMethodCount !== 6
  || summary.localRuntimeAdapterComplete !== true
  || summary.adapterMethodTableClosed !== true
  || summary.localOnly !== true
  || summary.dispatchDeferred !== true
  || summary.endpointContacted !== false
  || summary.networkEgress !== false
  || summary.providerResponseCreated !== false
  || summary.rollbackExecuted !== false
  || summary.liveProviderCallEnabled !== false
) {
  throw new Error(`Phase 52 completion should close six local methods without live activity: ${JSON.stringify(summary)}`);
}
for (const name of ["buildProviderRequest", "resolveCredentialReference", "sendProviderRequest", "recordEgressTranscript", "verifyProviderResponse", "buildRollbackNote"]) {
  if (!completion.methodClosures?.some((method) => method.name === name && method.ready === true)) {
    throw new Error(`Phase 52 completion missing ready method ${name}: ${JSON.stringify(completion.methodClosures)}`);
  }
}
if (completion.next?.recommendedSlice !== "openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-task") {
  throw new Error(`Phase 52 should route to closure task: ${JSON.stringify(completion.next)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessRuntimeAdapterCompletion: { status: "passed", registry, methodCount: summary.methodCount } }, null, 2));
EOF
  exit 0
fi

if [[ "$CHECK_KIND" == "closure-task" ]]; then
  REJECT_FILE="$(mktemp)"
  status="$(curl --silent --output "$REJECT_FILE" --write-out "%{http_code}" -X POST "$CORE_URL/cloud-consciousness/live-provider-runtime-adapter-closure-tasks" -H 'content-type: application/json' --data '{}')"
  if [[ "$status" != "400" ]]; then
    echo "Expected closure task without confirm=true to fail, got $status" >&2
    cat "$REJECT_FILE" >&2
    exit 1
  fi
  TASK_FILE="$(mktemp)"
  post_json "$CORE_URL/cloud-consciousness/live-provider-runtime-adapter-closure-tasks" '{"confirm":true}' > "$TASK_FILE"
  node - <<'EOF' "$CLOSURE_TASK_REGISTRY" "$PLAN_DOC" "$COMPLETION_FILE" "$TASK_FILE"
const fs = require("node:fs");
const registry = process.argv[2];
const doc = fs.readFileSync(process.argv[3], "utf8");
const completion = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const task = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-task",
  "approval-gated runtime adapter closure task shell",
  "live provider launch separate",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 53 plan doc missing ${token}`);
}
if (completion.summary?.ready !== true || completion.summary?.methodCount !== 6) {
  throw new Error(`Phase 53 prerequisite completion not ready: ${JSON.stringify(completion.summary)}`);
}
const shell = task.task?.cloudConsciousnessLiveProviderRuntimeAdapterClosure;
if (
  !task.ok
  || task.registry !== registry
  || task.task?.type !== "cloud_consciousness_live_provider_runtime_adapter_closure_task"
  || task.approval?.status !== "pending"
  || shell?.implementationStatus !== "task_shell_only"
  || shell?.localRuntimeAdapterComplete !== true
  || shell?.adapterMethodTableClosed !== true
  || shell?.methodCount !== 6
  || shell?.implementedMethodCount !== 6
  || shell?.networkEgress !== false
  || shell?.liveProviderCallEnabled !== false
) {
  throw new Error(`Phase 53 closure task should be approval-gated shell only: ${JSON.stringify(task)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessRuntimeAdapterClosureTask: { status: "passed", taskId: task.task.id, approvalId: task.approval.id, registry } }, null, 2));
EOF
  exit 0
fi

if [[ "$CHECK_KIND" == "approved-closure-deferred" || "$CHECK_KIND" == "closure-regression" ]]; then
  TASK_FILE="$(mktemp)"
  APPROVED_FILE="$(mktemp)"
  STEP_FILE="$(mktemp)"
  BEFORE_FILE="$(mktemp)"
  AFTER_FILE="$(mktemp)"
  sha256sum "$MODULE_FILE" | awk '{print $1}' > "$BEFORE_FILE"
  post_json "$CORE_URL/cloud-consciousness/live-provider-runtime-adapter-closure-tasks" '{"confirm":true}' > "$TASK_FILE"
  approval_id="$(node -e 'const fs=require("node:fs"); const data=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); if(!data.approval?.id) throw new Error("missing approval id"); console.log(data.approval.id)' "$TASK_FILE")"
  post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"phase-52-55-check","reason":"Approve runtime adapter closure deferred shell."}' > "$APPROVED_FILE"
  post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
  sha256sum "$MODULE_FILE" | awk '{print $1}' > "$AFTER_FILE"
  node - <<'EOF' "$CHECK_KIND" "$CLOSURE_TASK_REGISTRY" "$PLAN_DOC" "$COMPLETION_FILE" "$TASK_FILE" "$STEP_FILE" "$BEFORE_FILE" "$AFTER_FILE"
const fs = require("node:fs");
const kind = process.argv[2];
const registry = process.argv[3];
const doc = fs.readFileSync(process.argv[4], "utf8");
const completion = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const task = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const step = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
const beforeHash = fs.readFileSync(process.argv[8], "utf8").trim();
const afterHash = fs.readFileSync(process.argv[9], "utf8").trim();
const docTokens = kind === "closure-regression"
  ? ["openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-regression", "all six local methods remain ready", "no live provider launch occurs"]
  : ["openclaw-cloud-consciousness-approved-live-provider-runtime-adapter-closure-deferred", "runtime_adapter_closure_deferred_after_approval", "live provider launch remains a separate route"];
for (const token of docTokens) {
  if (!doc.includes(token)) throw new Error(`Phase closure plan doc missing ${token}`);
}
if (beforeHash !== afterHash) {
  throw new Error(`Runtime adapter module source should not change: ${beforeHash} !== ${afterHash}`);
}
if (!completion.ok || completion.summary?.ready !== true || completion.summary?.methodCount !== 6) {
  throw new Error(`Completion prerequisite should be ready: ${JSON.stringify(completion.summary)}`);
}
if (!task.ok || task.registry !== registry || task.task?.cloudConsciousnessLiveProviderRuntimeAdapterClosure?.implementationStatus !== "task_shell_only") {
  throw new Error(`Closure task shell failed: ${JSON.stringify(task)}`);
}
const shell = step.task?.cloudConsciousnessLiveProviderRuntimeAdapterClosure;
if (!step.ok || shell?.registry !== registry || shell?.implementationStatus !== "deferred_after_approval") {
  throw new Error(`Closure task should defer after approval: ${JSON.stringify(step)}`);
}
if (
  shell.localRuntimeAdapterComplete !== true
  || shell.adapterMethodTableClosed !== true
  || shell.methodCount !== 6
  || shell.implementedMethodCount !== 6
  || shell.dispatchDeferred !== true
  || shell.credentialValueRead !== false
  || shell.endpointContacted !== false
  || shell.networkEgress !== false
  || shell.providerResponseCreated !== false
  || shell.rollbackExecuted !== false
  || shell.rollbackCommandCreated !== false
  || shell.hostMutation !== false
  || shell.liveProviderCallEnabled !== false
) {
  throw new Error(`Approved closure must not enable live provider activity: ${JSON.stringify(shell)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessRuntimeAdapterClosureDeferred: { status: "passed", kind, taskId: step.task.id, registry } }, null, 2));
EOF
  exit 0
fi

if [[ "$CHECK_KIND" == "closure-exit" ]]; then
  EXIT_FILE="$(mktemp)"
  curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-runtime-adapter-closure-exit" > "$EXIT_FILE"
  node - <<'EOF' "$CLOSURE_EXIT_REGISTRY" "$PLAN_DOC" "$COMPLETION_FILE" "$EXIT_FILE"
const fs = require("node:fs");
const registry = process.argv[2];
const doc = fs.readFileSync(process.argv[3], "utf8");
const completion = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const exitGate = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-exit",
  "separate operator-reviewed live launch route",
  "Phase 55 is complete",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 55 plan doc missing ${token}`);
}
if (!exitGate.ok || exitGate.registry !== registry) {
  throw new Error(`Unexpected closure exit registry: ${JSON.stringify(exitGate)}`);
}
const summary = exitGate.summary ?? {};
if (
  completion.summary?.ready !== true
  || summary.complete !== true
  || summary.completionPercent !== 100
  || summary.localRuntimeAdapterComplete !== true
  || summary.adapterMethodTableClosed !== true
  || summary.methodCount !== 6
  || summary.implementedMethodCount !== 6
  || summary.credentialValueRead !== false
  || summary.endpointContacted !== false
  || summary.networkEgress !== false
  || summary.providerResponseCreated !== false
  || summary.rollbackExecuted !== false
  || summary.hostMutation !== false
  || summary.liveProviderCallEnabled !== false
) {
  throw new Error(`Phase 55 exit should close local adapter without live launch: ${JSON.stringify(summary)}`);
}
if (exitGate.next?.recommendedSlice !== "openclaw-cloud-consciousness-live-provider-real-launch-route-review") {
  throw new Error(`Phase 55 exit should route to separate live launch review: ${JSON.stringify(exitGate.next)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessRuntimeAdapterClosureExit: { status: "passed", registry, methodCount: summary.methodCount } }, null, 2));
EOF
  exit 0
fi

echo "Unhandled Phase 52-55 check kind: $CHECK_KIND" >&2
exit 1
