const CAPABILITY_ID = "sense.openclaw.engineering_tool_surface_inventory";

function requireBuilder(builder) {
  if (typeof builder !== "function") {
    throw new Error("Native engineering tool surface inventory builder is not configured.");
  }
  return builder;
}

export function createEngineeringToolSurfaceCapabilityHandlers({
  buildNativeEngineeringToolSurfaceInventory,
} = {}) {
  function callBackend(capability, request) {
    if (capability.id !== CAPABILITY_ID) {
      return { handled: false, result: null };
    }
    return {
      handled: true,
      result: requireBuilder(buildNativeEngineeringToolSurfaceInventory)({
        workspacePath: request.params?.workspacePath,
      }),
    };
  }

  function summariseResult(capability, result) {
    if (capability.id !== CAPABILITY_ID) return null;
    const summary = result?.summary ?? {};
    const governance = result?.governance ?? {};
    return {
      kind: "engineering.tool_surface_inventory",
      ok: result?.ok === true,
      registry: result?.registry ?? null,
      workspaceId: result?.workspace?.id ?? null,
      totalTools: summary.totalTools ?? 0,
      coveredTools: summary.coveredTools ?? 0,
      sourceFilesPresent: summary.sourceFilesPresent ?? 0,
      sourceFilesExpected: summary.sourceFilesExpected ?? 0,
      readOnlyContracts: summary.readOnlyContracts ?? 0,
      mutationProposalContracts: summary.mutationProposalContracts ?? 0,
      planningStateContracts: summary.planningStateContracts ?? 0,
      verificationContracts: summary.verificationContracts ?? 0,
      lspContracts: summary.lspContracts ?? 0,
      sourceIndexReadable: summary.canReadSourceIndex === true,
      nextRecommendedSlice: summary.nextRecommendedSlice ?? null,
      noSourceContentExposure: summary.exposesSourceFileContent === false
        && governance.exposesSourceFileContent === false,
      noModuleImport: summary.canImportModule === false
        && governance.canImportModule === false,
      noToolExecution: summary.canExecuteToolCode === false
        && governance.canExecuteToolCode === false,
      noVerificationExecution: summary.canRunVerification === false
        && governance.canRunVerification === false,
      noLspStart: summary.canStartLsp === false
        && governance.canStartLsp === false,
      noMutation: summary.canMutate === false
        && governance.canMutate === false,
      noTaskCreation: summary.createsTask === false
        && governance.createsTask === false,
      noApprovalCreation: summary.createsApproval === false
        && governance.createsApproval === false,
      noProviderEgress: governance.canCallProvider === false
        && governance.canUseNetwork === false,
    };
  }

  return { callBackend, summariseResult };
}
