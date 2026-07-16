const CAPABILITY_ID = "sense.openclaw.workspace_edit_target_select";

function requireBuilder(builder) {
  if (typeof builder !== "function") {
    throw new Error("Native OpenClaw workspace edit target selection builder is not configured.");
  }
  return builder;
}

export function createWorkspaceEditTargetCapabilityHandlers({
  buildNativeOpenClawWorkspaceEditTargetSelection,
} = {}) {
  function callBackend(capability, request) {
    if (capability.id !== CAPABILITY_ID) {
      return { handled: false, result: null };
    }
    return {
      handled: true,
      result: requireBuilder(buildNativeOpenClawWorkspaceEditTargetSelection)({
        workspacePath: request.params?.workspacePath,
        scope: request.params?.scope,
        query: request.params?.query ?? request.params?.q,
        limit: request.params?.limit,
      }),
    };
  }

  function summariseResult(capability, result) {
    if (capability.id !== CAPABILITY_ID) return null;
    const summary = result?.summary ?? {};
    const governance = result?.governance ?? {};
    return {
      kind: "openclaw.workspace_edit_target_select",
      ok: result?.ok === true,
      registry: result?.registry ?? null,
      scope: result?.query?.scope ?? null,
      candidateCount: summary.candidateCount ?? 0,
      selected: summary.selected === true,
      selectedTarget: result?.selectedTarget?.relativePath ?? null,
      canFeedPatchProposal: summary.canFeedPatchProposal === true,
      noSourceContentExposure: summary.exposesSourceFileContent === false
        && governance.exposesSourceFileContent === false,
      noMutation: summary.canMutate === false && governance.canMutate === false,
      noTaskCreation: summary.createsTask === false && governance.createsTask === false,
      noApprovalCreation: summary.createsApproval === false && governance.createsApproval === false,
      noPluginExecution: summary.canExecutePluginCode === false
        && governance.canExecutePluginCode === false
        && summary.canExecuteToolCode === false
        && governance.canExecuteToolCode === false,
      noRuntimeActivation: summary.canActivateRuntime === false
        && governance.canActivateRuntime === false,
      canCallProvider: summary.canCallProvider === true || governance.canCallProvider === true,
      canUseNetwork: summary.canUseNetwork === true || governance.canUseNetwork === true,
      noProviderEgress: summary.canCallProvider === false
        && summary.canUseNetwork === false
        && governance.canCallProvider === false
        && governance.canUseNetwork === false,
    };
  }

  return { callBackend, summariseResult };
}
