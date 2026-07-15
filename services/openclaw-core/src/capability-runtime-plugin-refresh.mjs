const EVIDENCE_CAPABILITY_ID = "sense.openclaw.plugin_runtime.refresh_evidence";
const TASK_CAPABILITY_ID = "act.openclaw.plugin_runtime.refresh_task";

function buildBlockedTaskResult(reason) {
  return {
    ok: false,
    blocked: true,
    reason,
    registry: "openclaw-native-plugin-runtime-refresh-task-v0",
    mode: "capability-runtime-plugin-refresh-task",
    governance: {
      createsTask: false,
      createsApproval: false,
      canRefreshReadModel: true,
      canImportModule: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
    },
  };
}

export function createPluginRuntimeRefreshCapabilityHandlers({
  buildNativePluginRuntimeRefreshEvidence,
  createNativePluginRuntimeRefreshTask,
} = {}) {
  async function callBackend(capability, request) {
    if (capability.id === EVIDENCE_CAPABILITY_ID) {
      if (typeof buildNativePluginRuntimeRefreshEvidence !== "function") {
        throw new Error("Native plugin runtime refresh evidence builder is unavailable.");
      }
      return { handled: true, result: buildNativePluginRuntimeRefreshEvidence() };
    }
    if (capability.id === TASK_CAPABILITY_ID) {
      if (request.params?.confirm !== true) {
        return {
          handled: true,
          result: buildBlockedTaskResult("operator_confirmation_required"),
        };
      }
      if (typeof createNativePluginRuntimeRefreshTask !== "function") {
        throw new Error("Native plugin runtime refresh task builder is unavailable.");
      }
      return {
        handled: true,
        result: await createNativePluginRuntimeRefreshTask({ confirm: true }),
      };
    }
    return { handled: false, result: null };
  }

  function summariseResult(capability, result) {
    if (capability.id === EVIDENCE_CAPABILITY_ID) {
      return {
        kind: "plugin_runtime.refresh_evidence",
        ok: result?.ok === true,
        readModelRefreshed: result?.summary?.readModelRefreshed === true,
        activeGenerationSequence: result?.runtimeState?.activeGenerationSequence ?? null,
        canImportModule: result?.governance?.canImportModule === true,
        canExecutePluginCode: result?.governance?.canExecutePluginCode === true,
        canActivateRuntime: result?.governance?.canActivateRuntime === true,
        noTaskCreation: result?.governance?.canCreateTask === false,
        noApprovalCreation: result?.governance?.canCreateApproval === false,
        noProviderEgress: result?.governance?.canCallProvider === false,
      };
    }
    if (capability.id === TASK_CAPABILITY_ID) {
      return {
        kind: "plugin_runtime.refresh_task",
        ok: result?.ok === true,
        blocked: result?.blocked === true,
        reason: result?.reason ?? null,
        taskId: result?.task?.id ?? null,
        approvalId: result?.approval?.id ?? null,
        createsTask: result?.governance?.createsTask === true,
        createsApproval: result?.governance?.createsApproval === true,
        canExecuteWithoutApproval: result?.governance?.canExecuteWithoutApproval === true,
        canImportModule: result?.governance?.canImportModule === true,
        canExecutePluginCode: result?.governance?.canExecutePluginCode === true,
        canActivateRuntime: result?.governance?.canActivateRuntime === true,
        noProviderEgress: result?.governance?.canCallProvider !== true,
      };
    }
    return null;
  }

  function validateRequest(capability, request) {
    if (capability.id !== TASK_CAPABILITY_ID || request.params?.confirm === undefined) {
      return null;
    }
    return typeof request.params.confirm === "boolean"
      ? null
      : "Native plugin runtime refresh confirm must be a boolean.";
  }

  return { callBackend, summariseResult, validateRequest };
}
