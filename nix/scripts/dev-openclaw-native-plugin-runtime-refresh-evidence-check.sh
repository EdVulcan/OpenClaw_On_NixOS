#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10180}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10181}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10182}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10183}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10184}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10185}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10186}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10187}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10188}"
unset OPENCLAW_WORKSPACE_ROOTS
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-native-plugin-runtime-refresh-evidence-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-native-plugin-runtime-refresh-evidence-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

OPENCLAW_POST_JSON_DATA_FLAG="-d"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-wait-helper.sh"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${REFRESH_FILE:-}" \
    "${CAPABILITY_EVIDENCE_FILE:-}" \
    "${CAPABILITY_TASK_FILE:-}" \
    "${HISTORY_FILE:-}" \
    "${APPROVALS_FILE:-}" \
    "${TASK_FILE:-}" \
    "${BLOCKED_FILE:-}" \
    "${APPROVED_FILE:-}" \
    "${STEP_FILE:-}" \
    "${TASK_STATE_FILE:-}" \
    "${REFRESH_AFTER_FILE:-}" \
    "${REFRESH_AFTER_RESTART_FILE:-}" \
    "${TASK_AFTER_RESTART_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

REFRESH_FILE="$(mktemp)"
CAPABILITY_EVIDENCE_FILE="$(mktemp)"
CAPABILITY_TASK_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
BLOCKED_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
TASK_STATE_FILE="$(mktemp)"
REFRESH_AFTER_FILE="$(mktemp)"
REFRESH_AFTER_RESTART_FILE="$(mktemp)"
TASK_AFTER_RESTART_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/plugins/native-adapter/runtime-refresh-evidence" > "$REFRESH_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$CORE_URL/approvals?status=pending&limit=10" > "$APPROVALS_FILE"

node - <<'EOF' "$REFRESH_FILE" "$HISTORY_FILE" "$APPROVALS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const refresh = readJson(2);
const history = readJson(3);
const approvals = readJson(4);

if (
  !refresh.ok
  || refresh.registry !== "openclaw-native-plugin-runtime-refresh-evidence-v0"
  || refresh.mode !== "governed-runtime-refresh-evidence-only"
  || refresh.capability?.id !== "sense.openclaw.plugin_runtime.refresh_evidence"
  || refresh.runtimeState?.readModelRefreshed !== true
  || refresh.runtimeState?.activeGenerationId !== "native-registry-generation-1"
  || refresh.runtimeState?.activeGenerationSequence !== 1
  || typeof refresh.runtimeState?.activeGenerationHash !== "string"
  || refresh.runtimeState?.activeLoader !== false
  || refresh.runtimeState?.loadedPluginModules !== 0
  || refresh.summary?.readModelRefreshed !== true
  || refresh.summary?.canImportModule !== false
  || refresh.summary?.canExecutePluginCode !== false
  || refresh.summary?.canActivateRuntime !== false
  || refresh.summary?.createsTask !== false
  || refresh.summary?.createsApproval !== false
  || refresh.governance?.canInvalidateModuleCache !== false
  || refresh.governance?.canImportModule !== false
  || refresh.governance?.canActivateRuntime !== false
  || refresh.auditEvidence?.operation !== "plugin_runtime_refresh_evidence"
) {
  throw new Error(`runtime refresh evidence mismatch: ${JSON.stringify(refresh)}`);
}
for (const id of [
  "recompute_native_contract_registry",
  "report_runtime_activation_gates",
  "defer_module_cache_invalidation",
  "block_plugin_module_load",
  "block_runtime_activation",
]) {
  if (!refresh.lifecycleActions?.some((action) => action.id === id)) {
    throw new Error(`runtime refresh evidence missing lifecycle action ${id}: ${JSON.stringify(refresh.lifecycleActions)}`);
  }
}
if ((history.items ?? []).length !== 0) {
  throw new Error(`runtime refresh evidence must not invoke capabilities: ${JSON.stringify(history.items)}`);
}
if ((approvals.items ?? []).length !== 0) {
  throw new Error(`runtime refresh evidence must not create approvals: ${JSON.stringify(approvals.items)}`);
}
console.log(JSON.stringify({
  openclawNativePluginRuntimeRefreshEvidence: {
    registry: refresh.registry,
    readModelRefreshed: refresh.summary.readModelRefreshed,
    blockedActions: refresh.summary.blockedActions,
    activationReady: refresh.summary.activationReady,
  },
}, null, 2));
EOF

post_json "$CORE_URL/capabilities/invoke" '{"capabilityId":"sense.openclaw.plugin_runtime.refresh_evidence"}' > "$CAPABILITY_EVIDENCE_FILE"
post_json "$CORE_URL/capabilities/invoke" '{"capabilityId":"act.openclaw.plugin_runtime.refresh_task","params":{"confirm":true}}' > "$CAPABILITY_TASK_FILE"

node - <<'EOF' "$CAPABILITY_EVIDENCE_FILE" "$CAPABILITY_TASK_FILE" "$TASK_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const evidence = readJson(2);
const task = readJson(3);
if (
  !evidence.ok
  || evidence.invoked !== true
  || evidence.capability?.id !== "sense.openclaw.plugin_runtime.refresh_evidence"
  || evidence.result?.registry !== "openclaw-native-plugin-runtime-refresh-evidence-v0"
  || evidence.summary?.kind !== "plugin_runtime.refresh_evidence"
  || evidence.summary?.readModelRefreshed !== true
  || evidence.summary?.noTaskCreation !== true
  || evidence.summary?.noApprovalCreation !== true
  || evidence.summary?.noProviderEgress !== true
  || evidence.result?.governance?.canImportModule !== false
  || evidence.result?.governance?.canExecutePluginCode !== false
  || evidence.result?.governance?.canActivateRuntime !== false
) {
  throw new Error(`common plugin refresh evidence capability mismatch: ${JSON.stringify(evidence)}`);
}
if (
  !task.ok
  || task.invoked !== true
  || task.capability?.id !== "act.openclaw.plugin_runtime.refresh_task"
  || task.result?.ok !== true
  || task.result?.task?.type !== "native_plugin_runtime_refresh"
  || task.result?.approval?.status !== "pending"
  || task.summary?.kind !== "plugin_runtime.refresh_task"
  || task.summary?.createsTask !== true
  || task.summary?.createsApproval !== true
  || task.summary?.canExecuteWithoutApproval !== false
) {
  throw new Error(`common plugin refresh task creation boundary mismatch: ${JSON.stringify(task)}`);
}
if (task.result?.governance?.canImportModule !== false || task.result?.governance?.canExecutePluginCode !== false || task.result?.governance?.canActivateRuntime !== false) {
  throw new Error(`common plugin refresh task widened the runtime boundary: ${JSON.stringify(task)}`);
}
const commonTaskResult = task.result;
fs.writeFileSync(process.argv[4], JSON.stringify(commonTaskResult));
console.log(JSON.stringify({
  commonPluginRuntimeRefreshCapability: {
    evidence: evidence.summary.kind,
    task: task.summary.kind,
    confirmationRequired: true,
    taskCreated: task.summary.createsTask,
    noModuleLoad: evidence.result.governance.canImportModule === false,
  },
}, null, 2));
EOF

post_json "$CORE_URL/operator/step" '{}' > "$BLOCKED_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE" "$BLOCKED_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const blocked = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (
  !taskResponse.ok
  || taskResponse.registry !== "openclaw-native-plugin-runtime-refresh-task-v0"
  || taskResponse.task?.type !== "native_plugin_runtime_refresh"
  || taskResponse.governance?.createsTask !== true
  || taskResponse.governance?.createsApproval !== true
  || taskResponse.governance?.canRefreshReadModel !== true
  || taskResponse.governance?.canImportModule !== false
  || taskResponse.governance?.canExecutePluginCode !== false
  || taskResponse.governance?.canActivateRuntime !== false
  || taskResponse.task?.plan?.registryGeneration?.id !== "native-registry-generation-1"
  || taskResponse.task?.plan?.registryGeneration?.sequence !== 1
  || taskResponse.task?.plan?.steps?.[0]?.params?.registryGeneration?.sequence !== 1
) {
  throw new Error(`runtime refresh task response mismatch: ${JSON.stringify(taskResponse)}`);
}
if (
  !blocked.ok
  || blocked.ran !== false
  || blocked.blocked !== true
  || blocked.reason !== "policy_requires_approval"
  || blocked.approval?.id !== taskResponse.approval?.id
) {
  throw new Error(`runtime refresh task should block before approval: ${JSON.stringify(blocked)}`);
}
process.stdout.write(blocked.approval.id);
EOF
)"

task_id="$(node - <<'EOF' "$TASK_FILE"
const fs = require("node:fs");
const taskResponse = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
process.stdout.write(taskResponse.task.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-openclaw-native-plugin-runtime-refresh-evidence-check","reason":"Approve read-model-only runtime refresh task."}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/tasks/$task_id" > "$TASK_STATE_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/runtime-refresh-evidence" > "$REFRESH_AFTER_FILE"

node - <<'EOF' "$TASK_FILE" "$APPROVED_FILE" "$STEP_FILE" "$TASK_STATE_FILE" "$REFRESH_AFTER_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const taskResponse = readJson(2);
const approved = readJson(3);
const step = readJson(4);
const taskState = readJson(5);
const refreshAfter = readJson(6);

if (approved.approval?.status !== "approved" || approved.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error(`runtime refresh approval should be approved and audited: ${JSON.stringify(approved)}`);
}
if (!step.ok || step.ran !== true || step.blocked !== false || step.task?.status !== "completed") {
  throw new Error(`approved runtime refresh task should run to completion: ${JSON.stringify(step)}`);
}
const execution = taskState.task?.nativePluginRuntimeRefresh?.execution;
if (
  taskState.task?.id !== taskResponse.task?.id
  || taskState.task?.status !== "completed"
  || execution?.registry !== "openclaw-native-plugin-runtime-refresh-task-execution-v0"
  || execution.readModelRefreshed !== true
  || execution.governance?.canRefreshReadModel !== true
  || execution.governance?.canInvalidateModuleCache !== false
  || execution.governance?.canImportModule !== false
  || execution.governance?.canExecutePluginCode !== false
  || execution.governance?.canActivateRuntime !== false
  || execution.governance?.canMutatePluginInstallState !== false
  || execution.runtimeRefreshEvidence?.summary?.readModelRefreshed !== true
  || execution.generation?.previousId !== "native-registry-generation-1"
  || execution.generation?.previousSequence !== 1
  || execution.generation?.currentId !== "native-registry-generation-2"
  || execution.generation?.currentSequence !== 2
  || execution.runtimeState?.activeGenerationId !== execution.generation.currentId
  || execution.runtimeState?.activeGenerationSequence !== execution.generation.currentSequence
  || taskState.task?.plan?.registryGeneration?.id !== execution.generation.previousId
  || taskState.task?.plan?.registryGeneration?.sequence !== execution.generation.previousSequence
  || refreshAfter.runtimeState?.activeGenerationId !== execution.generation.currentId
  || refreshAfter.runtimeState?.activeGenerationSequence !== execution.generation.currentSequence
) {
  throw new Error(`runtime refresh task readback mismatch: ${JSON.stringify(taskState)}`);
}
if (taskState.task?.outcome?.details?.verification?.ok !== true) {
  throw new Error(`runtime refresh task should record successful verification: ${JSON.stringify(taskState.task?.outcome)}`);
}
console.log(JSON.stringify({
  openclawNativePluginRuntimeRefreshTask: {
    taskId: taskState.task.id,
    registry: execution.registry,
    readModelRefreshed: execution.readModelRefreshed,
    approvalStatus: approved.approval.status,
    canImportModule: execution.governance.canImportModule,
    canActivateRuntime: execution.governance.canActivateRuntime,
  },
}, null, 2));
EOF

wait_for_persisted_runtime_generation() {
  [[ -f "$OPENCLAW_CORE_STATE_FILE" ]] \
    && node -e 'const fs=require("node:fs"); const data=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(data.runtime?.nativePluginRegistryGeneration?.active?.id === "native-registry-generation-2" && data.runtime?.nativePluginRegistryGeneration?.active?.sequence === 2 ? 0 : 1);' "$OPENCLAW_CORE_STATE_FILE"
}

openclaw_wait_until 3 0.05 wait_for_persisted_runtime_generation
"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$CORE_URL/plugins/native-adapter/runtime-refresh-evidence" > "$REFRESH_AFTER_RESTART_FILE"
curl --silent --fail "$CORE_URL/tasks/$task_id" > "$TASK_AFTER_RESTART_FILE"

node - <<'EOF' "$TASK_STATE_FILE" "$REFRESH_AFTER_FILE" "$REFRESH_AFTER_RESTART_FILE" "$TASK_AFTER_RESTART_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const taskBeforeRestart = readJson(2);
const refreshBeforeRestart = readJson(3);
const refreshAfterRestart = readJson(4);
const taskAfterRestart = readJson(5);
const persisted = JSON.parse(fs.readFileSync(process.env.OPENCLAW_CORE_STATE_FILE, "utf8"));
const executionBeforeRestart = taskBeforeRestart.task?.nativePluginRuntimeRefresh?.execution;
const executionAfterRestart = taskAfterRestart.task?.nativePluginRuntimeRefresh?.execution;
const persistedGeneration = persisted.runtime?.nativePluginRegistryGeneration;

if (
  refreshAfterRestart.runtimeState?.activeGenerationId !== "native-registry-generation-2"
  || refreshAfterRestart.runtimeState?.activeGenerationSequence !== 2
  || refreshAfterRestart.runtimeState?.activeGenerationHash !== refreshBeforeRestart.runtimeState?.activeGenerationHash
  || taskAfterRestart.task?.id !== taskBeforeRestart.task?.id
  || taskAfterRestart.task?.status !== "completed"
  || executionAfterRestart?.generation?.currentId !== "native-registry-generation-2"
  || executionAfterRestart?.generation?.currentSequence !== 2
  || executionAfterRestart?.generation?.previousId !== "native-registry-generation-1"
  || executionAfterRestart?.generation?.previousSequence !== 1
  || executionAfterRestart?.runtimeState?.activeGenerationHash !== executionBeforeRestart?.runtimeState?.activeGenerationHash
  || persistedGeneration?.version !== "openclaw-native-plugin-registry-generation-state-v0"
  || persistedGeneration?.active?.id !== "native-registry-generation-2"
  || persistedGeneration?.active?.sequence !== 2
  || "registry" in (persistedGeneration?.active ?? {})
  || "registry" in (persistedGeneration?.previous ?? {})
) {
  throw new Error(`runtime refresh generation did not survive core restart: ${JSON.stringify({ refreshAfterRestart, taskAfterRestart, persistedGeneration })}`);
}

console.log(JSON.stringify({
  openclawNativePluginRuntimeRefreshPersistence: {
    taskId: taskAfterRestart.task.id,
    activeGeneration: refreshAfterRestart.runtimeState.activeGenerationId,
    sequence: refreshAfterRestart.runtimeState.activeGenerationSequence,
    hashStable: refreshAfterRestart.runtimeState.activeGenerationHash === refreshBeforeRestart.runtimeState.activeGenerationHash,
    taskReadbackRestored: taskAfterRestart.task.id === taskBeforeRestart.task.id,
    compactState: true,
  },
}, null, 2));
EOF
