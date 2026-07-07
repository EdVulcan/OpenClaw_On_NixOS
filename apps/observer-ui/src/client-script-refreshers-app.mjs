export const observerClientAppRefreshersScript = `async function refreshOperatorState() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/operator/state\`);
    renderOperatorState(data.operator);
    if (operatorLoopJson.textContent === "No operator run yet." || operatorLoopJson.textContent === "Unable to read operator state.") {
      operatorLoopJson.textContent = [
        \`Status: \${data.operator?.status ?? "idle"}\`,
        \`Blocked: \${Boolean(data.operator?.blocked)}\`,
        \`Reason: \${data.operator?.reason ?? "none"}\`,
        \`Next Task: \${data.operator?.nextTask?.id ?? "none"}\`,
      ].join("\\n");
    }
  } catch {
    operatorLoopStatus.textContent = "offline";
    operatorLoopBlocked.textContent = "unknown";
    operatorLoopNext.textContent = "unknown";
    operatorLoopJson.textContent = "Unable to read operator state.";
  }
}

async function refreshPolicyState() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/policy/state\`);
    renderPolicyState(data.policy);
  } catch {
    policyEngine.textContent = "offline";
    policyDecision.textContent = "unknown";
    policyDomain.textContent = "unknown";
    policyJson.textContent = "Unable to read policy state.";
  }
}

async function refreshApprovalState() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/approvals?limit=10\`);
    renderApprovalState(data);
  } catch {
    latestPendingApproval = null;
    approvalPendingCount.textContent = "0";
    approvalLatest.textContent = "unknown";
    approvalJson.textContent = "Unable to read approval inbox.";
  }
}

async function refreshCapabilityState() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/capabilities\`);
    renderCapabilityState(data);
  } catch {
    capabilityRegistry.textContent = "offline";
    capabilityOnline.textContent = "0";
    capabilityApproval.textContent = "unknown";
    capabilityJson.textContent = "Unable to read body capabilities.";
  }
}

async function refreshCapabilityHistory() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/capabilities/invocations?limit=8\`);
    renderCapabilityHistory(data);
  } catch {
    capabilityHistoryTotal.textContent = "0";
    capabilityHistoryInvoked.textContent = "0";
    capabilityHistoryBlocked.textContent = "0";
    capabilityHistoryLatest.textContent = "unknown";
    capabilityHistoryJson.textContent = "Unable to read capability invocation history.";
  }
}

async function refreshCommandLedger() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/commands/transcripts?limit=8\`);
    renderCommandLedger(data);
  } catch {
    commandLedgerTotal.textContent = "0";
    commandLedgerExecuted.textContent = "0";
    commandLedgerFailed.textContent = "0";
    commandLedgerSkipped.textContent = "0";
    commandLedgerTasks.textContent = "unknown";
    commandLedgerJson.textContent = "Unable to read command transcript ledger.";
  }
}

async function refreshFilesystemLedger() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/filesystem/changes?limit=8\`);
    renderFilesystemLedger(data);
  } catch {
    filesystemLedgerTotal.textContent = "0";
    filesystemLedgerMkdir.textContent = "0";
    filesystemLedgerWrites.textContent = "0";
    filesystemLedgerTasks.textContent = "unknown";
    filesystemLedgerJson.textContent = "Unable to read filesystem change ledger.";
  }
}

async function refreshFilesystemReadLedger() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/filesystem/reads?limit=8\`);
    renderFilesystemReadLedger(data);
  } catch {
    filesystemReadLedgerTotal.textContent = "0";
    filesystemReadLedgerMetadata.textContent = "0";
    filesystemReadLedgerQuery.textContent = "0";
    filesystemReadLedgerReadText.textContent = "0";
    filesystemReadLedgerTasks.textContent = "unknown";
    filesystemReadLedgerJson.textContent = "Unable to read filesystem read ledger.";
  }
}

async function refreshWorkspaceRegistry() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/workspaces\`);
    renderWorkspaceRegistry(data);
  } catch {
    workspaceRegistry.textContent = "offline";
    workspaceDetected.textContent = "0";
    workspaceMissing.textContent = "unknown";
    workspaceNode.textContent = "0";
    workspaceMode.textContent = "unknown";
    workspaceJson.textContent = "Unable to read OpenClaw workspace registry.";
  }
}

async function refreshWorkspaceCommandProposals() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/workspaces/command-proposals\`);
    renderWorkspaceCommandProposals(data);
  } catch {
    workspaceCommandRegistry.textContent = "offline";
    workspaceCommandTotal.textContent = "0";
    workspaceCommandValidation.textContent = "0";
    workspaceCommandBuild.textContent = "0";
    workspaceCommandRuntime.textContent = "0";
    workspaceCommandMode.textContent = "unknown";
    workspaceCommandJson.textContent = "Unable to read workspace command proposals.";
  }
}

async function refreshSourceCommandProposals() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/source-command-proposals?query=command&limit=12\`);
    renderSourceCommandProposals(data);
  } catch {
    sourceCommandRegistry.textContent = "offline";
    sourceCommandTotal.textContent = "0";
    sourceCommandTools.textContent = "0";
    sourceCommandPrompts.textContent = "0";
    sourceCommandMode.textContent = "unknown";
    sourceCommandJson.textContent = "Unable to read source-derived command proposals.";
  }
}

async function refreshSourceCommandPlanDraft() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/source-command-proposals/plan?proposalId=openclaw:typecheck&query=command\`);
    renderSourceCommandPlanDraft(data);
  } catch {
    sourceCommandPlanRegistry.textContent = "offline";
    sourceCommandPlanProposal.textContent = "none";
    sourceCommandPlanDecision.textContent = "unknown";
    sourceCommandPlanTask.textContent = "false";
    sourceCommandPlanMode.textContent = "unknown";
    sourceCommandPlanJson.textContent = "Unable to read source-derived command plan draft.";
  }
}

async function refreshWorkspaceMigrationMap() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/workspaces/openclaw-migration-map\`);
    renderWorkspaceMigrationMap(data);
  } catch {
    workspaceMigrationRegistry.textContent = "offline";
    workspaceMigrationTotal.textContent = "0";
    workspaceMigrationCapabilities.textContent = "0";
    workspaceMigrationHigh.textContent = "0";
    workspaceMigrationMode.textContent = "unknown";
    workspaceMigrationJson.textContent = "Unable to read OpenClaw source migration map.";
  }
}

async function refreshWorkspaceMigrationPlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/workspaces/openclaw-migration-plan\`);
    renderWorkspaceMigrationPlan(data);
  } catch {
    workspaceMigrationPlanRegistry.textContent = "offline";
    workspaceMigrationPlanTotal.textContent = "0";
    workspaceMigrationPlanCandidates.textContent = "0";
    workspaceMigrationPlanBacklog.textContent = "0";
    workspaceMigrationPlanMode.textContent = "unknown";
    workspaceMigrationPlanJson.textContent = "Unable to read OpenClaw source migration plan.";
  }
}

async function refreshPluginSdkContractReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/workspaces/openclaw-plugin-sdk-contract-review\`);
    renderPluginSdkContractReview(data);
  } catch {
    pluginSdkReviewRegistry.textContent = "offline";
    pluginSdkReviewTotal.textContent = "0";
    pluginSdkReviewManifest.textContent = "0";
    pluginSdkReviewTypes.textContent = "0";
    pluginSdkReviewExports.textContent = "0";
    pluginSdkReviewMode.textContent = "unknown";
    pluginSdkReviewJson.textContent = "Unable to read plugin SDK contract review.";
  }
}

async function refreshPluginSdkSourceReviewScope() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/workspaces/openclaw-plugin-sdk-source-review-scope\`);
    renderPluginSdkSourceReviewScope(data);
  } catch {
    pluginSdkSourceScopeRegistry.textContent = "offline";
    pluginSdkSourceScopeTotal.textContent = "0";
    pluginSdkSourceScopeContent.textContent = "unknown";
    pluginSdkSourceScopeApproval.textContent = "unknown";
    pluginSdkSourceScopeMode.textContent = "unknown";
    pluginSdkSourceScopeJson.textContent = "Unable to read plugin SDK source review scope.";
  }
}

async function refreshPluginSdkSourceContentReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/workspaces/openclaw-plugin-sdk-source-content-review\`);
    renderPluginSdkSourceContentReview(data);
  } catch {
    pluginSdkSourceContentRegistry.textContent = "offline";
    pluginSdkSourceContentRead.textContent = "0";
    pluginSdkSourceContentExports.textContent = "0";
    pluginSdkSourceContentRaw.textContent = "unknown";
    pluginSdkSourceContentMode.textContent = "unknown";
    pluginSdkSourceContentJson.textContent = "Unable to read plugin SDK source content review.";
  }
}

async function refreshPluginSdkNativeContractTests() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/workspaces/openclaw-plugin-sdk-native-contract-tests\`);
    renderPluginSdkNativeContractTests(data);
  } catch {
    pluginSdkNativeTestsRegistry.textContent = "offline";
    pluginSdkNativeTestsRequired.textContent = "0/0";
    pluginSdkNativeTestsSource.textContent = "0";
    pluginSdkNativeTestsCaps.textContent = "0";
    pluginSdkNativeTestsMode.textContent = "unknown";
    pluginSdkNativeTestsJson.textContent = "Unable to read plugin SDK native contract tests.";
  }
}

async function refreshNativeSdkContractImplementation() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/openclaw-native-plugin-sdk-contract-implementation\`);
    renderNativeSdkContractImplementation(data);
  } catch {
    nativeSdkImplementationRegistry.textContent = "offline";
    nativeSdkImplementationSlots.textContent = "0/0";
    nativeSdkImplementationReadOnly.textContent = "0";
    nativeSdkImplementationExecutable.textContent = "0";
    nativeSdkImplementationMode.textContent = "unknown";
    nativeSdkImplementationJson.textContent = "Unable to read native SDK contract implementation.";
  }
}

async function refreshOpenClawToolCatalog() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/openclaw-tool-catalog\`);
    renderOpenClawToolCatalog(data);
  } catch {
    openclawToolCatalogRegistry.textContent = "offline";
    openclawToolCatalogTools.textContent = "0";
    openclawToolCatalogDocs.textContent = "0";
    openclawToolCatalogCategories.textContent = "0";
    openclawToolCatalogMode.textContent = "unknown";
    openclawToolCatalogJson.textContent = "Unable to read OpenClaw tool catalog.";
  }
}

async function refreshPluginManifestMap() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/openclaw-plugin-manifest-map\`);
    renderPluginManifestMap(data);
  } catch {
    pluginManifestMapRegistry.textContent = "offline";
    pluginManifestMapManifests.textContent = "0";
    pluginManifestMapCategories.textContent = "0";
    pluginManifestMapAuth.textContent = "0";
    pluginManifestMapMode.textContent = "unknown";
    pluginManifestMapJson.textContent = "Unable to read OpenClaw plugin manifest map.";
  }
}

async function refreshPluginCapabilityPlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/plugin-capability-plan?limit=40\`);
    renderPluginCapabilityPlan(data);
  } catch {
    pluginCapabilityPlanRegistry.textContent = "offline";
    pluginCapabilityPlanCandidates.textContent = "0";
    pluginCapabilityPlanBlocked.textContent = "0";
    pluginCapabilityPlanApproval.textContent = "0";
    pluginCapabilityPlanRuntime.textContent = "unknown";
    pluginCapabilityPlanJson.textContent = "Unable to read OpenClaw plugin capability plan.";
  }
}

async function refreshPluginCandidateContractTests() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/plugin-candidate-contract-tests?category=search_and_web&limit=8\`);
    renderPluginCandidateContractTests(data);
  } catch {
    pluginCandidateContractTestsRegistry.textContent = "offline";
    pluginCandidateContractTestsCategory.textContent = "unknown";
    pluginCandidateContractTestsRequired.textContent = "0/0";
    pluginCandidateContractTestsContracts.textContent = "0";
    pluginCandidateContractTestsRuntime.textContent = "unknown";
    pluginCandidateContractTestsJson.textContent = "Unable to read OpenClaw plugin candidate contract tests.";
  }
}

async function refreshPluginSearchWebAdapterContract() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/plugin-search-web-adapter-contract?limit=8\`);
    renderPluginSearchWebAdapterContract(data);
  } catch {
    pluginSearchWebContractRegistry.textContent = "offline";
    pluginSearchWebContractProviders.textContent = "0";
    pluginSearchWebContractRequired.textContent = "0/0";
    pluginSearchWebContractNetwork.textContent = "unknown";
    pluginSearchWebContractRuntime.textContent = "unknown";
    pluginSearchWebContractJson.textContent = "Unable to read OpenClaw search/web adapter contract.";
  }
}

async function refreshPluginSearchWebRuntimePreflight() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/plugin-search-web-adapter-runtime-preflight?providerContractId=openclaw.web-search&limit=8\`);
    renderPluginSearchWebRuntimePreflight(data);
  } catch {
    pluginSearchWebPreflightRegistry.textContent = "offline";
    pluginSearchWebPreflightEnvelope.textContent = "missing";
    pluginSearchWebPreflightApproval.textContent = "unknown";
    pluginSearchWebPreflightNetwork.textContent = "unknown";
    pluginSearchWebPreflightRuntime.textContent = "unknown";
    pluginSearchWebPreflightJson.textContent = "Unable to read OpenClaw search/web runtime preflight.";
  }
}

async function refreshPluginSearchWebRuntimeActivationPlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/plugin-search-web-adapter-runtime-activation-plan?providerContractId=openclaw.web-search&limit=8\`);
    renderPluginSearchWebRuntimeActivationPlan(data);
  } catch {
    pluginSearchWebActivationRegistry.textContent = "offline";
    pluginSearchWebActivationStatus.textContent = "unknown";
    pluginSearchWebActivationRequired.textContent = "0/0";
    pluginSearchWebActivationNetwork.textContent = "unknown";
    pluginSearchWebActivationRuntime.textContent = "unknown";
    pluginSearchWebActivationJson.textContent = "Unable to read OpenClaw search/web runtime activation plan.";
  }
}

async function refreshPluginSearchWebProviderRuntimeSandbox() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/plugin-search-web-adapter-provider-runtime-sandbox?providerContractId=openclaw.web-search&limit=8\`);
    renderPluginSearchWebProviderRuntimeSandbox(data);
  } catch {
    pluginSearchWebSandboxRegistry.textContent = "offline";
    pluginSearchWebSandboxStatus.textContent = "unknown";
    pluginSearchWebSandboxRequired.textContent = "0/0";
    pluginSearchWebSandboxNetwork.textContent = "unknown";
    pluginSearchWebSandboxRuntime.textContent = "unknown";
    pluginSearchWebSandboxJson.textContent = "Unable to read OpenClaw search/web provider runtime sandbox contract.";
  }
}

async function refreshToolCatalogAdapter() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/tool-catalog\`);
    renderToolCatalogAdapter(data);
  } catch {
    toolCatalogAdapterRegistry.textContent = "offline";
    toolCatalogAdapterMatches.textContent = "0";
    toolCatalogAdapterCategories.textContent = "0";
    toolCatalogAdapterExecution.textContent = "unknown";
    toolCatalogAdapterMode.textContent = "unknown";
    toolCatalogAdapterJson.textContent = "Unable to read native tool catalog adapter.";
  }
}

async function refreshSemanticIndex() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/workspace-semantic-index?scope=tools&limit=24\`);
    renderSemanticIndex(data);
  } catch {
    semanticIndexRegistry.textContent = "offline";
    semanticIndexFiles.textContent = "0";
    semanticIndexExports.textContent = "0";
    semanticIndexSource.textContent = "unknown";
    semanticIndexMode.textContent = "unknown";
    semanticIndexJson.textContent = "Unable to read native workspace semantic index.";
  }
}

async function refreshSymbolLookup() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/workspace-symbol-lookup?scope=tools&query=tool&limit=16\`);
    renderSymbolLookup(data);
  } catch {
    symbolLookupRegistry.textContent = "offline";
    symbolLookupMatches.textContent = "0";
    symbolLookupFiles.textContent = "0";
    symbolLookupExecution.textContent = "unknown";
    symbolLookupMode.textContent = "unknown";
    symbolLookupJson.textContent = "Unable to run native workspace symbol lookup.";
  }
}

async function refreshEditTargetSelection() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/workspace-edit-target-selection?scope=tools&query=edit&limit=8\`);
    renderEditTargetSelection(data);
  } catch {
    editTargetSelectionRegistry.textContent = "offline";
    editTargetSelectionCandidates.textContent = "0";
    editTargetSelectionSelected.textContent = "none";
    editTargetSelectionSource.textContent = "unknown";
    editTargetSelectionMode.textContent = "unknown";
    editTargetSelectionJson.textContent = "Unable to select native OpenClaw workspace edit targets.";
  }
}

async function refreshPromptSemantics() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/prompt-semantics?query=edit&limit=24\`);
    renderPromptSemantics(data);
  } catch {
    promptSemanticsRegistry.textContent = "offline";
    promptSemanticsFiles.textContent = "0";
    promptSemanticsChecks.textContent = "0";
    promptSemanticsContent.textContent = "unknown";
    promptSemanticsMode.textContent = "unknown";
    promptSemanticsJson.textContent = "Unable to read native OpenClaw prompt semantics.";
  }
}

async function refreshWorkspaceTextWriteDraft() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/workspace-text-write/draft?relativePath=scratch/observer-native-write.txt\`);
    renderWorkspaceTextWriteDraft(data);
  } catch {
    workspaceTextWriteRegistry.textContent = "offline";
    workspaceTextWriteCapability.textContent = "unknown";
    workspaceTextWriteApproval.textContent = "unknown";
    workspaceTextWriteContent.textContent = "unknown";
    workspaceTextWriteMode.textContent = "unknown";
    workspaceTextWriteJson.textContent = "Unable to read native workspace text write draft.";
  }
}

async function refreshWorkspacePatchApplyDraft() {
  try {
    const edits = encodeURIComponent(JSON.stringify([
      { search: "before", replacement: "after", occurrence: 1 },
      { search: "omega", replacement: "zeta", occurrence: 1 },
    ]));
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/workspace-patch-apply/draft?relativePath=scratch/observer-native-edit.txt&edits=\${edits}&contextLines=0\`);
    renderWorkspacePatchApplyDraft(data);
  } catch {
    workspacePatchApplyRegistry.textContent = "offline";
    workspacePatchApplyCapability.textContent = "unknown";
    workspacePatchApplyApproval.textContent = "unknown";
    workspacePatchApplyPreview.textContent = "unknown";
    workspacePatchApplyMode.textContent = "unknown";
    workspacePatchApplyJson.textContent = "Unable to read native workspace patch apply draft.";
  }
}

async function refreshNativePluginContract() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/openclaw-native-plugin-contract\`);
    renderNativePluginContract(data);
  } catch {
    nativePluginContractRegistry.textContent = "offline";
    nativePluginContractOwner.textContent = "unknown";
    nativePluginContractTotal.textContent = "0";
    nativePluginContractApproval.textContent = "0";
    nativePluginContractMutation.textContent = "0";
    nativePluginContractValidation.textContent = "unknown";
    nativePluginContractJson.textContent = "Unable to read native plugin contract.";
  }
}

async function refreshNativePluginRegistry() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/openclaw-native-plugin-registry\`);
    renderNativePluginRegistry(data);
  } catch {
    nativePluginRegistryId.textContent = "offline";
    nativePluginRegistryTotal.textContent = "0";
    nativePluginRegistryCapabilities.textContent = "0";
    nativePluginRegistryActivation.textContent = "unknown";
    nativePluginRegistryValidation.textContent = "unknown";
    nativePluginRegistryJson.textContent = "Unable to read native plugin registry.";
  }
}

async function refreshFormalIntegrationReadiness() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/openclaw-formal-integration-readiness\`);
    renderFormalIntegrationReadiness(data);
  } catch {
    integrationReadinessRegistry.textContent = "offline";
    integrationReadinessStatus.textContent = "unknown";
    integrationReadinessRequired.textContent = "0/0";
    integrationReadinessRuntime.textContent = "unknown";
    integrationReadinessMode.textContent = "unknown";
    integrationReadinessJson.textContent = "Unable to read formal integration readiness.";
  }
}

async function refreshNativePluginAdapter() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/openclaw-native-plugin-adapter\`);
    renderNativePluginAdapter(data);
  } catch {
    nativePluginAdapterRegistry.textContent = "offline";
    nativePluginAdapterStatus.textContent = "unknown";
    nativePluginAdapterImplemented.textContent = "0";
    nativePluginAdapterRuntime.textContent = "unknown";
    nativePluginAdapterMode.textContent = "unknown";
    nativePluginAdapterJson.textContent = "Unable to read native plugin adapter.";
  }
}

async function refreshNativePluginPreflight() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/runtime-preflight\`);
    renderNativePluginPreflight(data);
  } catch {
    nativePluginPreflightRegistry.textContent = "offline";
    nativePluginPreflightEnvelope.textContent = "unknown";
    nativePluginPreflightApproval.textContent = "unknown";
    nativePluginPreflightRuntime.textContent = "unknown";
    nativePluginPreflightMode.textContent = "unknown";
    nativePluginPreflightJson.textContent = "Unable to read native plugin runtime preflight.";
  }
}

async function refreshNativePluginActivationPlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/runtime-activation-plan\`);
    renderNativePluginActivationPlan(data);
  } catch {
    nativePluginActivationRegistry.textContent = "offline";
    nativePluginActivationStatus.textContent = "unknown";
    nativePluginActivationRequired.textContent = "0/0";
    nativePluginActivationRuntime.textContent = "unknown";
    nativePluginActivationMode.textContent = "unknown";
    nativePluginActivationJson.textContent = "Unable to read native plugin runtime activation plan.";
  }
}

async function refreshNativePluginRuntimeAdapterContract() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/runtime-adapter-contract\`);
    renderNativePluginRuntimeAdapterContract(data);
  } catch {
    nativePluginRuntimeContractRegistry.textContent = "offline";
    nativePluginRuntimeContractStatus.textContent = "unknown";
    nativePluginRuntimeContractRequired.textContent = "0/0";
    nativePluginRuntimeContractRuntime.textContent = "unknown";
    nativePluginRuntimeContractMode.textContent = "unknown";
    nativePluginRuntimeContractJson.textContent = "Unable to read native plugin runtime adapter contract.";
  }
}

async function refreshNativePluginInvokePlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/invoke-plan\`);
    renderNativePluginInvokePlan(data);
  } catch {
    nativePluginInvokePlanRegistry.textContent = "offline";
    nativePluginInvokePlanCapability.textContent = "unknown";
    nativePluginInvokePlanDecision.textContent = "unknown";
    nativePluginInvokePlanRuntime.textContent = "unknown";
    nativePluginInvokePlanMode.textContent = "unknown";
    nativePluginInvokePlanJson.textContent = "Unable to read native plugin invoke plan.";
  }
}

async function refreshWorkspaceCommandPlanDraft() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/workspaces/command-proposals/plan?proposalId=openclaw:typecheck\`);
    renderWorkspaceCommandPlanDraft(data);
  } catch {
    workspaceCommandPlanRegistry.textContent = "offline";
    workspaceCommandPlanProposal.textContent = "unknown";
    workspaceCommandPlanDecision.textContent = "unknown";
    workspaceCommandPlanApproval.textContent = "unknown";
    workspaceCommandPlanTask.textContent = "false";
    workspaceCommandPlanMode.textContent = "unknown";
    workspaceCommandPlanJson.textContent = "Unable to read workspace command plan draft.";
  }
}

async function invokeCapabilityFromUi(kind) {
  const requests = {
    vitals: {
      capabilityId: "sense.system.vitals",
      intent: "system.observe",
    },
    process: {
      capabilityId: "sense.process.list",
      intent: "process.list",
      params: { limit: 10 },
    },
    commandDryRun: {
      capabilityId: "act.system.command.dry_run",
      intent: "system.command",
      params: { command: "rm", args: ["-rf", "/tmp/openclaw-danger"] },
    },
    approvedCommandDryRun: {
      capabilityId: "act.system.command.dry_run",
      intent: "system.command",
      approved: true,
      params: { command: "rm", args: ["-rf", "/tmp/openclaw-danger"] },
    },
  };
  const body = requests[kind];
  if (!body) {
    throw new Error(\`Unknown capability invocation kind: \${kind}\`);
  }

  const result = await fetchJson(\`\${observerConfig.coreUrl}/capabilities/invoke\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  renderCapabilityInvocation(result);
  setControlMessage(result.invoked
    ? \`Capability invoked: \${result.capability?.id ?? body.capabilityId}\`
    : \`Capability blocked: \${result.reason ?? "unknown"}\`);
  await refreshCapabilityState();
  await refreshCapabilityHistory();
  await refreshPolicyState();
  await refreshAuditState();
}

async function resolveLatestApproval(action) {
  if (!latestPendingApproval?.id) {
    throw new Error("No pending approval request.");
  }

  const result = await fetchJson(\`\${observerConfig.coreUrl}/approvals/\${latestPendingApproval.id}/\${action}\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      reason: action === "approve" ? "Approved from Observer UI." : "Denied from Observer UI.",
    }),
  });
  setControlMessage(\`Approval \${action} completed: \${result.approval?.id ?? latestPendingApproval.id}\`);
  await refreshApprovalState();
  await refreshPolicyState();
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshOperatorState();
}

function renderTaskSummary(task, { includeRecovery = true, includeOutcome = true } = {}) {
  if (!task) {
    return "No task selected.";
  }

  const taskLastAction = deriveTaskLastAction(task);
  const lines = [
    \`ID: \${task.id}\`,
    \`Goal: \${task.goal}\`,
    \`Type: \${task.type}\`,
    \`Status: \${task.status}\`,
    \`Phase: \${task.executionPhase ?? "queued"}\`,
    \`Target URL: \${task.targetUrl ?? "none"}\`,
    \`Work View Strategy: \${task.workViewStrategy ?? "none"}\`,
    \`Work View Session: \${task.workView?.sessionId ?? "none"}\`,
    \`Work View URL: \${task.workView?.activeUrl ?? "none"}\`,
    \`Work View: \${task.workView?.status ?? "none"} / \${task.workView?.visibility ?? "none"}\`,
    \`Policy: \${task.policy?.decision?.decision ?? "none"} / \${task.policy?.decision?.domain ?? "none"}\`,
    \`Task Lens: \${describeTaskRelationship(task)}\`,
  ];

  if (includeOutcome) {
    lines.push(\`Outcome: \${task.outcome?.kind ?? "open"}\${task.outcome?.summary ? \` - \${task.outcome.summary}\` : ""}\`);
    if (task.outcome?.reason) {
      lines.push(\`Failure Reason: \${task.outcome.reason}\`);
    }
    const taskVerification = task.outcome?.details?.verification ?? null;
    const taskWorkViewSummary = task.outcome?.details?.workViewSummary ?? taskVerification?.workViewSummary ?? null;
    const taskActionEvidence = task.outcome?.details?.actionEvidence ?? taskVerification?.actionEvidence ?? null;
    const taskRecoveryEvidence = task.outcome?.details?.recoveryEvidence ?? task.recovery?.recoveryEvidence ?? null;
    const taskPostExecutionVerification = task.outcome?.details?.postExecutionVerification ?? null;
    if (taskVerification) {
      lines.push(\`Verification: \${taskVerification.ok === true ? "passed" : taskVerification.ok === false ? "failed" : "unknown"}\`);
    }
    if (taskWorkViewSummary) {
      lines.push(\`Verification Work View Summary: \${taskWorkViewSummary.summaryText ?? "none"}\`);
      lines.push(\`Verification Work View URL: \${taskWorkViewSummary.url ?? "none"}\`);
      lines.push(\`Verification Visible Text: \${(taskWorkViewSummary.visibleTextBlocks ?? []).join(" | ") || "none"}\`);
    }
    if (taskActionEvidence) {
      lines.push(\`Action Evidence: \${taskActionEvidence.actionCount ?? 0} action(s), degraded=\${taskActionEvidence.degradedCount ?? 0}\`);
      lines.push(\`Action Evidence Observed URL: \${taskActionEvidence.observedAfterActions?.url ?? "none"}\`);
      lines.push(\`Action Evidence Kinds: \${(taskActionEvidence.actions ?? []).map((action) => action.kind).join(" -> ") || "none"}\`);
    }
    if (taskRecoveryEvidence) {
      lines.push(\`Recovery Evidence: \${taskRecoveryEvidence.reason ?? "none"}\`);
      lines.push(\`Recovery Evidence Observed URL: \${taskRecoveryEvidence.observedUrl ?? "none"}\`);
      lines.push(\`Recovery Recommendation: \${taskRecoveryEvidence.recommendation?.strategy ?? "none"} -> \${taskRecoveryEvidence.recommendation?.targetUrl ?? "none"}\`);
    }
    if (taskPostExecutionVerification) {
      const summary = taskPostExecutionVerification.summary ?? {};
      lines.push(\`Post Execution Verification: \${taskPostExecutionVerification.registry ?? "unknown"} / \${taskPostExecutionVerification.mode ?? "unknown"}\`);
      lines.push(\`Post Verification Unit: \${taskPostExecutionVerification.targetUnit ?? "unknown"} before=\${summary.beforeActiveState ?? "unknown"} after=\${summary.afterActiveState ?? "unknown"}\`);
      lines.push(\`Post Verification Health: beforeServiceOk=\${summary.beforeServiceOk ?? "unknown"} afterServiceOk=\${summary.afterServiceOk ?? "unknown"} noAutomaticRecovery=\${Boolean(summary.noAutomaticRecovery)}\`);
    }
    if (task.bodyEvidenceLedgerFirstRecord) {
      const firstRecord = task.bodyEvidenceLedgerFirstRecord;
      lines.push(\`Body Evidence Ledger First Record: \${firstRecord.plannedRecordType ?? "unknown"} appended=\${Boolean(firstRecord.recordAppended)} storageWritten=\${Boolean(firstRecord.durableStorageWritten)}\`);
      lines.push(\`Body Evidence Ledger File: \${firstRecord.ledgerFileDisplayPath ?? "pending"} recordId=\${firstRecord.recordId ?? "pending"} hash=\${firstRecord.contentHash ?? "pending"}\`);
    }
    if (task.bodyEvidenceLedgerFollowupRecord) {
      const followupRecord = task.bodyEvidenceLedgerFollowupRecord;
      lines.push(\`Body Evidence Ledger Follow-up Record: \${followupRecord.plannedRecordType ?? "unknown"} sequence=\${followupRecord.plannedSequence ?? "unknown"} appended=\${Boolean(followupRecord.recordAppended)} storageWritten=\${Boolean(followupRecord.durableStorageWritten)}\`);
      lines.push(\`Body Evidence Ledger Follow-up File: \${followupRecord.ledgerFileDisplayPath ?? "pending"} recordId=\${followupRecord.recordId ?? "pending"} previous=\${followupRecord.previousRecordId ?? "pending"} hash=\${followupRecord.contentHash ?? "pending"}\`);
    }
  }

  if (includeRecovery) {
    lines.push(\`Recovery: \${task.recovery?.recoveredFromTaskId ? \`attempt \${task.recovery?.attempt ?? 1} from \${task.recovery.recoveredFromTaskId}\` : "original task"}\`);
    lines.push(\`Recovered By: \${task.recoveredByTaskId ?? "none"}\`);
    lines.push(\`Recoverable: \${task.restorable ? "yes" : "no"}\`);
  }

  if (task.plan) {
    const steps = Array.isArray(task.plan.steps) ? task.plan.steps : [];
    const completed = steps.filter((step) => step.status === "completed").length;
    lines.push(\`Plan: \${task.plan.strategy ?? "unknown"} / \${task.plan.status ?? "unknown"}\`);
    lines.push(\`Plan Steps: \${completed}/\${steps.length} completed\`);
  }

  lines.push(\`Last Action: \${taskLastAction?.kind ?? "none"}\${taskLastAction ? \` (degraded: \${taskLastAction.degraded})\` : ""}\`);
  lines.push(\`Recent Phases: \${(task.phaseHistory ?? []).slice(-4).map((entry) => entry.phase).join(" -> ") || "none"}\`);
  lines.push(\`Created: \${formatTimestamp(task.createdAt)}\`);
  lines.push(\`Updated: \${formatTimestamp(task.updatedAt)}\`);
  lines.push(\`Closed: \${formatTimestamp(task.closedAt)}\`);
  return lines.join("\\n");
}

function describeTaskRelationship(task) {
  if (!task) {
    return "none";
  }

  if (task.isCurrentTask) {
    return "current active task";
  }

  if (currentTaskState?.recovery?.recoveredFromTaskId === task.id) {
    return "ancestor of current recovered task";
  }

  if (task.recoveredByTaskId && task.recoveredByTaskId === currentTaskState?.id) {
    return "recovered into current active task";
  }

  if (task.isActive) {
    return "active task";
  }

  if (currentTaskState?.workView?.sessionId && task.workView?.sessionId === currentTaskState.workView.sessionId) {
    return "shares work view session with current task";
  }

  return "historical task";
}

function renderTaskSection(title, tasks) {
  if (!tasks.length) {
    return "";
  }

  return \`<section class="task-section">
    <h3>\${escapeHtml(title)}</h3>
    \${tasks.map((task) => renderTaskCard(task)).join("")}
  </section>\`;
}

function getDesiredWorkViewUrl() {
  return desiredWorkViewUrl || "https://example.com/work-view";
}

function getSelectedHistoryTaskId() {
  const value = taskDetailIdInput.value.trim();
  return value || null;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { ok: false, error: await response.text() };

  if (!response.ok) {
    throw new Error(payload?.error ?? \`Request failed with status \${response.status}\`);
  }

  return payload;
}

function addEventItem(event) {
  const item = document.createElement("li");
  item.textContent = \`[\${event.timestamp}] \${event.type} from \${event.source}\`;
  eventsList.prepend(item);
  while (eventsList.children.length > 30) {
    eventsList.removeChild(eventsList.lastChild);
  }
}

async function refreshHealth() {
  try {
    const [core, hub, sessionManager, screen, screenAct, systemSense, systemHeal] = await Promise.all([
      fetchJson(\`\${observerConfig.coreUrl}/health\`),
      fetchJson(\`\${observerConfig.eventHubUrl}/health\`),
      fetchJson(\`\${observerConfig.sessionManagerUrl}/health\`),
      fetchJson(\`\${observerConfig.screenSenseUrl}/health\`),
      fetchJson(\`\${observerConfig.screenActUrl}/health\`),
      fetchJson(\`\${observerConfig.systemSenseUrl}/health\`),
      fetchJson(\`\${observerConfig.systemHealUrl}/health\`),
    ]);

    setHealthPill(coreHealth, !!core.ok, core.ok ? "healthy" : "unhealthy");
    setHealthPill(eventhubHealth, !!hub.ok, hub.ok ? "healthy" : "unhealthy");
    setHealthPill(sessionManagerHealth, !!sessionManager.ok, sessionManager.ok ? "healthy" : "unhealthy");
    setHealthPill(screenHealth, !!screen.ok, screen.ok ? "healthy" : "unhealthy");
    setHealthPill(screenActHealth, !!screenAct.ok, screenAct.ok ? "healthy" : "unhealthy");
    setHealthPill(systemHealthPill, !!systemSense.ok, systemSense.ok ? "healthy" : "unhealthy");
    setHealthPill(systemHealHealth, !!systemHeal.ok, systemHeal.ok ? "healthy" : "unhealthy");
  } catch (error) {
    setHealthPill(coreHealth, false, "offline");
    setHealthPill(eventhubHealth, false, "offline");
    setHealthPill(sessionManagerHealth, false, "offline");
    setHealthPill(screenHealth, false, "offline");
    setHealthPill(screenActHealth, false, "offline");
    setHealthPill(systemHealthPill, false, "offline");
    setHealthPill(systemHealHealth, false, "offline");
  }
}

async function refreshMvpRoute() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/mvp/route\`);
    const summary = data.summary ?? {};
    mvpRouteCurrent.textContent = data.mainline?.current ?? "unknown";
    mvpRouteTrunk.textContent = data.mainline?.trunk ?? "unknown";
    mvpRouteComplete.textContent = \`\${summary.complete ?? 0}/\${summary.totalPhases ?? 0}\`;
    mvpRouteNext.textContent = data.mainline?.nextRecommendedTrunk ?? summary.next ?? "unknown";
    mvpRouteJson.textContent = [
      \`Registry: \${data.registry ?? "unknown"}\`,
      \`MVP Boundary: \${data.whitepaper?.mvpBoundary ?? "unknown"}\`,
      \`Current: \${data.mainline?.current ?? "unknown"}\`,
      \`Next Recommended Trunk: \${data.mainline?.nextRecommendedTrunk ?? "unknown"}\`,
      \`Next Milestone: \${data.mainline?.nextRecommendedMilestone ?? "unknown"}\`,
      \`Guardrail: \${(data.guardrails?.afterEachMilestone ?? []).join("; ") || "none"}\`,
      \`Avoid: \${(data.guardrails?.avoidLoops ?? []).join("; ") || "none"}\`,
      "",
      JSON.stringify(data.phases ?? [], null, 2),
    ].join("\\n");
  } catch {
    mvpRouteCurrent.textContent = "offline";
    mvpRouteJson.textContent = "Unable to read MVP route alignment.";
  }
}

async function refreshPhase2RepairDemoStatus() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-2/repair-demo-status\`);
    const summary = data.summary ?? {};
    const checklist = data.checklist ?? [];
    phase2RepairDemoStatus.textContent = data.status ?? "unknown";
    phase2RepairDemoEvidence.textContent = \`\${summary.passed ?? 0}/\${summary.total ?? checklist.length}\`;
    phase2RepairDemoTarget.textContent = summary.targetUnit ?? "openclaw-browser-runtime.service";
    phase2RepairDemoNext.textContent = data.route?.nextRecommendedSlice ?? "demo evidence bundle";
    phase2RepairDemoJson.textContent = [
      \`Registry: \${data.registry ?? "unknown"}\`,
      \`Mode: \${data.mode ?? "unknown"} readOnly=\${Boolean(data.governance?.readOnly)} executesCommand=\${Boolean(data.governance?.executesCommand)}\`,
      \`Status: \${data.status ?? "unknown"} demoReady=\${Boolean(summary.demoReady)}\`,
      \`Task: \${summary.latestTaskId ?? "none"} outcome=\${summary.latestOutcome ?? "none"}\`,
      \`Command: \${summary.command ?? "none"} exitCode=\${summary.exitCode ?? "none"}\`,
      \`Body: before=\${summary.beforeActiveState ?? "unknown"} after=\${summary.afterActiveState ?? "unknown"} serviceOk=\${summary.beforeServiceOk ?? "unknown"}->\${summary.afterServiceOk ?? "unknown"}\`,
      \`No Automatic Recovery: \${Boolean(summary.noAutomaticRecovery)}\`,
      \`Next: \${data.route?.nextRecommendedSlice ?? "unknown"} avoidsSafetyBoundaryLoop=\${Boolean(data.route?.avoidsSafetyBoundaryLoop)}\`,
      "",
      ...(checklist.map((item) => \`[\${item.status ?? "unknown"}] \${item.id ?? "check"} :: \${item.label ?? "no label"} evidence=\${item.evidence ?? "none"}\`)),
    ].join("\\n");
  } catch {
    phase2RepairDemoStatus.textContent = "offline";
    phase2RepairDemoEvidence.textContent = "0/0";
    phase2RepairDemoTarget.textContent = "offline";
    phase2RepairDemoNext.textContent = "unknown";
    phase2RepairDemoJson.textContent = "Unable to read Phase 2 repair demo status.";
  }
}

async function refreshPhase2NextRepairDemoStatus() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-2/next-repair-demo-status\`);
    const summary = data.summary ?? {};
    const governance = data.governance ?? {};
    const checklist = data.checklist ?? [];
    phase2NextRepairDemoStatus.textContent = data.status ?? "unknown";
    phase2NextRepairDemoEvidence.textContent = \`\${summary.passedChecks ?? 0}/\${summary.totalChecks ?? checklist.length}\`;
    phase2NextRepairDemoTarget.textContent = summary.targetUnit ?? "openclaw-system-sense.service";
    phase2NextRepairDemoMutation.textContent = String(Boolean(governance.hostMutation));
    phase2NextRepairDemoJson.textContent = [
      \`Registry: \${data.registry ?? "openclaw-systemd-next-repair-demo-status-v0"}\`,
      \`Mode: \${data.mode ?? "unknown"} readsTaskHistoryOnly=\${Boolean(governance.readsTaskHistoryOnly)} createsTask=\${Boolean(governance.createsTask)} executesCommand=\${Boolean(governance.executesCommand)} mutation=\${Boolean(governance.hostMutation)}\`,
      \`Status: \${data.status ?? "unknown"} ready=\${Boolean(summary.ready)} target=\${summary.targetUnit ?? "unknown"}\`,
      \`Outcome: \${summary.outcome ?? "none"} hostMutationAttempted=\${Boolean(summary.hostMutationAttempted)} executionSucceeded=\${summary.executionSucceeded ?? "unknown"}\`,
      \`Command: \${summary.command ?? "none"} exitCode=\${summary.exitCode ?? "none"}\`,
      \`Next: \${data.next?.recommendedSlice ?? "openclaw-body-evidence-timeline"} boundary=\${data.next?.boundary ?? "read-only body memory"}\`,
      "",
      ...(checklist.map((item) => \`[\${item.status ?? "unknown"}] \${item.id ?? "check"} :: \${item.label ?? "no label"} evidence=\${typeof item.evidence === "string" ? item.evidence : JSON.stringify(item.evidence ?? null)}\`)),
    ].join("\\n");
  } catch {
    phase2NextRepairDemoStatus.textContent = "offline";
    phase2NextRepairDemoEvidence.textContent = "0/0";
    phase2NextRepairDemoTarget.textContent = "offline";
    phase2NextRepairDemoMutation.textContent = "false";
    phase2NextRepairDemoJson.textContent = "Unable to read Phase 2 next repair demo status.";
  }
}

async function refreshPhase2DemoControlRoom() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-2/demo-control-room\`);
    const summary = data.summary ?? {};
    const governance = data.governance ?? {};
    const evidence = data.evidence ?? {};
    phase2DemoControlRoomStatus.textContent = data.status ?? "unknown";
    phase2DemoControlRoomPanels.textContent = \`\${summary.availablePanels ?? 0}/\${summary.totalPanels ?? 0}\`;
    phase2DemoControlRoomSlice.textContent = summary.selectedSlice ?? "unknown";
    phase2DemoControlRoomMutation.textContent = String(Boolean(governance.mutatesHost));
    phase2DemoControlRoomJson.textContent = [
      \`Registry: \${data.registry ?? "unknown"}\`,
      \`Mode: \${data.mode ?? "unknown"} readOnly=\${Boolean(governance.readOnly)} createsTask=\${Boolean(governance.createsTask)} executesCommand=\${Boolean(governance.executesCommand)} mutatesHost=\${Boolean(governance.mutatesHost)}\`,
      \`Status: \${data.status ?? "unknown"} ready=\${Boolean(summary.ready)} panels=\${summary.availablePanels ?? 0}/\${summary.totalPanels ?? 0}\`,
      \`Route: track=\${summary.selectedTrack ?? "unknown"} slice=\${summary.selectedSlice ?? "unknown"} avoidsSafetyBoundaryLoop=\${Boolean(summary.avoidsSafetyBoundaryLoop)}\`,
      \`Repair Demo: status=\${summary.repairDemoStatus ?? "unknown"} ready=\${Boolean(summary.repairDemoReady)} target=\${evidence.repairDemo?.targetUnit ?? "unknown"}\`,
      \`Body Governance: ready=\${Boolean(summary.bodyGovernanceReady)} routeReview=\${data.source?.routeReviewRegistry ?? "unknown"}\`,
      \`Panels: \${(data.panels ?? []).map((panel) => \`\${panel.id}=\${panel.status}\`).join(", ")}\`,
      \`Script: \${(data.operatorScript ?? []).join(" | ")}\`,
      \`Next: \${data.next?.recommendedSlice ?? "demo walkthrough"}\`,
    ].join("\\n");
  } catch {
    phase2DemoControlRoomStatus.textContent = "offline";
    phase2DemoControlRoomPanels.textContent = "0/0";
    phase2DemoControlRoomSlice.textContent = "unknown";
    phase2DemoControlRoomMutation.textContent = "false";
    phase2DemoControlRoomJson.textContent = "Unable to read Phase 2 demo control room.";
  }
}

async function refreshPhase2DemoWalkthrough() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-2/demo-walkthrough\`);
    const summary = data.summary ?? {};
    const governance = data.governance ?? {};
    phase2DemoWalkthroughStatus.textContent = data.status ?? "unknown";
    phase2DemoWalkthroughSteps.textContent = \`\${summary.readySteps ?? 0}/\${summary.totalSteps ?? 0}\`;
    phase2DemoWalkthroughControlRoom.textContent = String(Boolean(summary.controlRoomReady));
    phase2DemoWalkthroughMutation.textContent = String(Boolean(governance.mutatesHost));
    phase2DemoWalkthroughJson.textContent = [
      \`Registry: \${data.registry ?? "unknown"}\`,
      \`Mode: \${data.mode ?? "unknown"} readOnly=\${Boolean(governance.readOnly)} createsTask=\${Boolean(governance.createsTask)} executesCommand=\${Boolean(governance.executesCommand)} mutatesHost=\${Boolean(governance.mutatesHost)}\`,
      \`Status: \${data.status ?? "unknown"} ready=\${Boolean(summary.ready)} steps=\${summary.readySteps ?? 0}/\${summary.totalSteps ?? 0}\`,
      \`Evidence: controlRoomReady=\${Boolean(summary.controlRoomReady)} bodyGovernanceReady=\${Boolean(summary.bodyGovernanceReady)} repairDemoReady=\${Boolean(summary.repairDemoReady)}\`,
      \`Steps: \${(data.steps ?? []).map((step) => \`\${step.id}=\${step.status}\`).join(", ")}\`,
      \`Script: \${(data.script ?? []).join(" | ")}\`,
      \`Next: \${data.next?.recommendedSlice ?? "demo readiness exit"}\`,
    ].join("\\n");
  } catch {
    phase2DemoWalkthroughStatus.textContent = "offline";
    phase2DemoWalkthroughSteps.textContent = "0/0";
    phase2DemoWalkthroughControlRoom.textContent = "false";
    phase2DemoWalkthroughMutation.textContent = "false";
    phase2DemoWalkthroughJson.textContent = "Unable to read Phase 2 demo walkthrough.";
  }
}

async function refreshPhase2DemoReadinessExit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-2/demo-readiness-exit\`);
    const summary = data.summary ?? {};
    const governance = data.governance ?? {};
    const operatorOutcome = data.operatorOutcome ?? {};
    const completedBlock = data.completedBlock ?? {};
    phase2DemoReadinessExitStatus.textContent = data.status ?? "unknown";
    phase2DemoReadinessExitChecks.textContent = \`\${summary.passed ?? 0}/\${summary.total ?? 0}\`;
    phase2DemoReadinessExitSafe.textContent = String(Boolean(operatorOutcome.safeToDemo));
    phase2DemoReadinessExitMutation.textContent = String(Boolean(governance.mutatesHost));
    phase2DemoReadinessExitJson.textContent = [
      \`Registry: \${data.registry ?? "unknown"}\`,
      \`Mode: \${data.mode ?? "unknown"} readOnly=\${Boolean(governance.readOnly)} createsTask=\${Boolean(governance.createsTask)} executesCommand=\${Boolean(governance.executesCommand)} mutatesHost=\${Boolean(governance.mutatesHost)}\`,
      \`Status: \${data.status ?? "unknown"} ready=\${Boolean(summary.ready)} checks=\${summary.passed ?? 0}/\${summary.total ?? 0}\`,
      \`Outcome: safeToDemo=\${Boolean(operatorOutcome.safeToDemo)} hiddenMutation=\${Boolean(operatorOutcome.hiddenMutation)}\`,
      \`Completed: \${completedBlock.name ?? "unknown"} claim=\${completedBlock.completionClaim ?? "unknown"}\`,
      \`Slices: \${(completedBlock.completedSlices ?? []).join(", ")}\`,
      \`Checks: \${(data.exitChecks ?? []).map((check) => \`\${check.id}=\${Boolean(check.passed)}\`).join(", ")}\`,
      \`Next: \${data.next?.recommendedSlice ?? "next capability route review"}\`,
    ].join("\\n");
  } catch {
    phase2DemoReadinessExitStatus.textContent = "offline";
    phase2DemoReadinessExitChecks.textContent = "0/0";
    phase2DemoReadinessExitSafe.textContent = "false";
    phase2DemoReadinessExitMutation.textContent = "false";
    phase2DemoReadinessExitJson.textContent = "Unable to read Phase 2 demo readiness exit.";
  }
}

async function refreshPhase2NextCapabilityRoute() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-2/next-capability-route-review\`);
    const decision = data.decision ?? {};
    const governance = data.governance ?? {};
    const evidence = data.evidence ?? {};
    const nextSlice = data.next?.recommendedSlice ?? "openclaw-body-evidence-ledger-plan";
    phase2NextCapabilityTrack.textContent = decision.selectedTrack ?? "unknown";
    phase2NextCapabilitySlice.textContent = decision.selectedSlice ?? nextSlice;
    phase2NextCapabilityCreatesTask.textContent = String(Boolean(governance.createsTask));
    phase2NextCapabilityMutation.textContent = String(Boolean(governance.mutatesHost));
    phase2NextCapabilityJson.textContent = [
      \`Registry: \${data.registry ?? "unknown"}\`,
      \`Mode: \${data.mode ?? "unknown"} readOnly=\${Boolean(governance.readOnly)} createsTask=\${Boolean(governance.createsTask)} executesCommand=\${Boolean(governance.executesCommand)} mutatesHost=\${Boolean(governance.mutatesHost)}\`,
      \`Decision: \${decision.status ?? "unknown"} track=\${decision.selectedTrack ?? "unknown"} slice=\${decision.selectedSlice ?? "unknown"}\`,
      \`Rationale: \${decision.rationale ?? "none"}\`,
      \`Avoid: \${(decision.notSelected ?? []).join(", ") || "none"}\`,
      \`Evidence: demoReady=\${Boolean(evidence.demoReady)} exitChecks=\${evidence.demoExitChecks ?? "0/0"} candidateDemoReady=\${Boolean(evidence.candidateDemoReady)} timelineReady=\${Boolean(evidence.bodyEvidenceTimelineReady)} followupReadinessReady=\${Boolean(evidence.bodyEvidenceLedgerFollowupRecordReadinessReady)} followupTask=\${evidence.bodyEvidenceLedgerFollowupTaskId ?? "none"} candidateUnit=\${evidence.candidateDemoSelectedUnit ?? "none"} completed=\${evidence.completedDemoBlock?.completionClaim ?? "unknown"}\`,
      \`Candidates: \${(data.candidates ?? []).map((candidate) => \`\${candidate.track}:\${candidate.firstSlice}:recommended=\${Boolean(candidate.recommended)}\`).join(", ")}\`,
      \`Next: \${nextSlice}\`,
    ].join("\\n");
  } catch {
    phase2NextCapabilityTrack.textContent = "offline";
    phase2NextCapabilitySlice.textContent = "unknown";
    phase2NextCapabilityCreatesTask.textContent = "false";
    phase2NextCapabilityMutation.textContent = "false";
    phase2NextCapabilityJson.textContent = "Unable to read Phase 2 next capability route review.";
  }
}

async function refreshPhase2CompletionReadiness() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-2/completion-readiness\`);
    const summary = data.summary ?? {};
    const governance = data.governance ?? {};
    phase2CompletionReadinessReady.textContent = String(Boolean(summary.ready));
    phase2CompletionReadinessChecks.textContent = \`\${summary.passed ?? 0}/\${summary.total ?? 0}\`;
    phase2CompletionReadinessPercent.textContent = String(summary.completionPercent ?? 0);
    phase2CompletionReadinessMutation.textContent = String(Boolean(governance.mutatesHost));
    phase2CompletionReadinessJson.textContent = [
      \`Registry: \${data.registry ?? "openclaw-phase-2-completion-readiness-v0"}\`,
      \`Mode: \${data.mode ?? "unknown"} status=\${data.status ?? "unknown"} ready=\${Boolean(summary.ready)} percent=\${summary.completionPercent ?? 0}\`,
      \`Checks: \${summary.passed ?? 0}/\${summary.total ?? 0} firstRepair=\${Boolean(summary.firstRepairDemoReady)} nextRepair=\${Boolean(summary.nextRepairDemoReady)} candidate=\${Boolean(summary.candidateDemoReady)} demoExit=\${Boolean(summary.demoExitReady)} governance=\${Boolean(summary.bodyGovernanceReady)} ledgerRecords=\${summary.durableBodyMemoryRecords ?? 0}\`,
      \`Follow-up: record=\${summary.followupRecordId ?? "none"}\`,
      \`Governance: readOnly=\${Boolean(governance.readOnly)} createsTask=\${Boolean(governance.createsTask)} createsApproval=\${Boolean(governance.createsApproval)} executesCommand=\${Boolean(governance.executesCommand)} mutatesHost=\${Boolean(governance.mutatesHost)} scheduler=\${Boolean(governance.schedulesWork)} backgroundWriter=\${Boolean(governance.backgroundWriter)} writesLedger=\${Boolean(governance.writesLedger)}\`,
      \`Next: \${data.next?.recommendedSlice ?? "unknown"} boundary=\${data.next?.boundary ?? "unknown"}\`,
    ].join("\\n");
  } catch {
    phase2CompletionReadinessReady.textContent = "false";
    phase2CompletionReadinessChecks.textContent = "0/0";
    phase2CompletionReadinessPercent.textContent = "0";
    phase2CompletionReadinessMutation.textContent = "false";
    phase2CompletionReadinessJson.textContent = "Unable to read Phase 2 completion readiness.";
  }
}

async function refreshPhase2Exit() {
  try {
    const phase2ExitNextFallback = "openclaw-phase-3-plan";
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-2/exit\`);
    const summary = data.summary ?? {};
    const governance = data.governance ?? {};
    phase2ExitComplete.textContent = String(Boolean(summary.complete));
    phase2ExitPercent.textContent = String(summary.completionPercent ?? 0);
    phase2ExitNext.textContent = data.next?.recommendedSlice ?? phase2ExitNextFallback;
    phase2ExitMutation.textContent = String(Boolean(governance.mutatesHost));
    phase2ExitJson.textContent = [
      \`Registry: \${data.registry ?? "openclaw-phase-2-exit-v0"}\`,
      \`Mode: \${data.mode ?? "unknown"} status=\${data.status ?? "unknown"} complete=\${Boolean(summary.complete)} percent=\${summary.completionPercent ?? 0}\`,
      \`Readiness: status=\${summary.readinessStatus ?? "unknown"} checks=\${summary.passed ?? 0}/\${summary.total ?? 0} records=\${summary.durableBodyMemoryRecords ?? 0} followup=\${summary.followupRecordId ?? "none"}\`,
      \`Completed: \${data.completedPhase?.completionClaim ?? "unknown"} tracks=\${(data.completedPhase?.completedTracks ?? []).length}\`,
      \`Governance: readOnly=\${Boolean(governance.readOnly)} createsTask=\${Boolean(governance.createsTask)} createsApproval=\${Boolean(governance.createsApproval)} executesCommand=\${Boolean(governance.executesCommand)} mutatesHost=\${Boolean(governance.mutatesHost)} scheduler=\${Boolean(governance.schedulesWork)} backgroundWriter=\${Boolean(governance.backgroundWriter)} writesLedger=\${Boolean(governance.writesLedger)}\`,
      \`Next: \${data.next?.recommendedSlice ?? phase2ExitNextFallback} boundary=\${data.next?.boundary ?? "unknown"}\`,
    ].join("\\n");
  } catch {
    phase2ExitComplete.textContent = "false";
    phase2ExitPercent.textContent = "0";
    phase2ExitNext.textContent = "openclaw-phase-3-plan";
    phase2ExitMutation.textContent = "false";
    phase2ExitJson.textContent = "Unable to read Phase 2 exit gate.";
  }
}

async function refreshPhase3Plan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-3/plan\`);
    const summary = data.summary ?? {};
    const governance = data.governance ?? {};
    phase3PlanReady.textContent = String(Boolean(summary.ready));
    phase3PlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-phase-3-background-work-view";
    phase3PlanForeground.textContent = String(Boolean(governance.stealsForeground));
    phase3PlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-3-plan-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown") + " ready=" + Boolean(summary.ready),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Let it work without stealing the foreground."),
      "Slices: " + ((data.selectedSlices ?? []).join(", ") || "none"),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    phase3PlanReady.textContent = "false";
    phase3PlanNext.textContent = "unknown";
    phase3PlanForeground.textContent = "false";
    phase3PlanJson.textContent = "Unable to read Phase 3 plan.";
  }
}

async function refreshPhase3BackgroundWorkView() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-3/background-work-view\`);
    const summary = data.summary ?? {};
    const workView = data.current?.workView ?? {};
    phase3BackgroundReady.textContent = String(Boolean(summary.ready));
    phase3BackgroundVisibility.textContent = workView.visibility ?? data.workViewContract?.defaultVisibility ?? "hidden";
    phase3BackgroundMode.textContent = workView.mode ?? data.workViewContract?.defaultMode ?? "background";
    phase3BackgroundJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-3-background-work-view-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " checks=" + (summary.passed ?? 0) + "/" + (summary.total ?? 0),
      "Default: visibility=" + (data.workViewContract?.defaultVisibility ?? "hidden") + " mode=" + (data.workViewContract?.defaultMode ?? "background"),
      "Current: visibility=" + (workView.visibility ?? "unknown") + " mode=" + (workView.mode ?? "unknown") + " capture=" + (workView.captureStrategy ?? "unknown"),
    ].join("\\n");
  } catch {
    phase3BackgroundReady.textContent = "false";
    phase3BackgroundVisibility.textContent = "unknown";
    phase3BackgroundMode.textContent = "unknown";
    phase3BackgroundJson.textContent = "Unable to read Phase 3 background work view.";
  }
}

async function refreshPhase3OperatorInterruptControls() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-3/operator-interrupt-controls\`);
    const summary = data.summary ?? {};
    phase3ControlsReady.textContent = String(Boolean(summary.ready));
    phase3ControlsTakeover.textContent = String(Boolean(summary.takeoverSupported));
    phase3ControlsHiddenAutomation.textContent = String(Boolean(summary.hiddenAutomation));
    phase3ControlsJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-3-operator-interrupt-controls-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Controls: " + ((data.controls ?? []).map((control) => control.id + " " + control.endpoint).join(" | ") || "none"),
      "Operator: status=" + (data.operator?.status ?? "unknown") + " blocked=" + Boolean(data.operator?.blocked),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    phase3ControlsReady.textContent = "false";
    phase3ControlsTakeover.textContent = "false";
    phase3ControlsHiddenAutomation.textContent = "false";
    phase3ControlsJson.textContent = "Unable to read Phase 3 operator controls.";
  }
}

async function refreshPhase3CompletionReadiness() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-3/completion-readiness\`);
    const summary = data.summary ?? {};
    phase3ReadinessReady.textContent = String(Boolean(summary.ready));
    phase3ReadinessChecks.textContent = (summary.passed ?? 0) + "/" + (summary.total ?? 0);
    phase3ReadinessPercent.textContent = String(summary.completionPercent ?? 0);
    phase3ReadinessJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-3-completion-readiness-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Foreground Steal: " + Boolean(summary.foregroundStealByDefault),
      "Tracks: " + ((data.completedTracks ?? []).map((track) => track.id + "=" + track.status).join(" | ") || "none"),
    ].join("\\n");
  } catch {
    phase3ReadinessReady.textContent = "false";
    phase3ReadinessChecks.textContent = "0/0";
    phase3ReadinessPercent.textContent = "0";
    phase3ReadinessJson.textContent = "Unable to read Phase 3 completion readiness.";
  }
}

async function refreshPhase3Exit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-3/exit\`);
    const summary = data.summary ?? {};
    phase3ExitComplete.textContent = String(Boolean(summary.complete));
    phase3ExitPercent.textContent = String(summary.completionPercent ?? 0);
    phase3ExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-phase-4-plan";
    phase3ExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-3-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Completed: " + (data.completedPhase?.completionClaim ?? "unknown"),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-phase-4-plan"),
    ].join("\\n");
  } catch {
    phase3ExitComplete.textContent = "false";
    phase3ExitPercent.textContent = "0";
    phase3ExitNext.textContent = "openclaw-phase-4-plan";
    phase3ExitJson.textContent = "Unable to read Phase 3 exit gate.";
  }
}

async function refreshPhase4Plan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-4/plan\`);
    const summary = data.summary ?? {};
    const governance = data.governance ?? {};
    phase4PlanReady.textContent = String(Boolean(summary.ready));
    phase4PlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-phase-4-self-heal-loop";
    phase4PlanRealRepair.textContent = String(Boolean(governance.realHostRepair));
    phase4PlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-4-plan-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown") + " ready=" + Boolean(summary.ready),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Let it care for its body."),
      "Slices: " + ((data.selectedSlices ?? []).join(", ") || "none"),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    phase4PlanReady.textContent = "false";
    phase4PlanNext.textContent = "unknown";
    phase4PlanRealRepair.textContent = "false";
    phase4PlanJson.textContent = "Unable to read Phase 4 plan.";
  }
}

async function refreshPhase4SelfHealLoop() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-4/self-heal-loop\`);
    const summary = data.summary ?? {};
    phase4SelfHealReady.textContent = String(Boolean(summary.ready));
    phase4SelfHealExecuted.textContent = String(summary.executedRepairs ?? 0);
    phase4SelfHealSkipped.textContent = String(summary.skippedHighRisk ?? 0);
    phase4SelfHealJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-4-self-heal-loop-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " checks=" + (summary.passed ?? 0) + "/" + (summary.total ?? 0),
      "Diagnosis: " + (data.diagnosis?.status ?? "unknown") + " steps=" + (data.diagnosis?.planSteps ?? 0),
      "Maintenance: run=" + (data.maintenance?.latestRunId ?? "none") + " status=" + (data.maintenance?.status ?? "unknown") + " executed=" + (summary.executedRepairs ?? 0) + " skipped=" + (summary.skippedHighRisk ?? 0),
    ].join("\\n");
  } catch {
    phase4SelfHealReady.textContent = "false";
    phase4SelfHealExecuted.textContent = "0";
    phase4SelfHealSkipped.textContent = "0";
    phase4SelfHealJson.textContent = "Unable to read Phase 4 self-heal loop.";
  }
}

async function refreshPhase4HealHistoryEvidence() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-4/heal-history-evidence\`);
    const summary = data.summary ?? {};
    const history = data.history ?? {};
    phase4HistoryReady.textContent = String(Boolean(summary.ready));
    phase4HistoryHealCount.textContent = String(history.healCount ?? 0);
    phase4HistoryMaintenanceCount.textContent = String(history.maintenanceCount ?? 0);
    phase4HistoryJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-4-heal-history-evidence-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " checks=" + (summary.passed ?? 0) + "/" + (summary.total ?? 0),
      "History: heal=" + (history.healCount ?? 0) + " maintenance=" + (history.maintenanceCount ?? 0) + " latestRun=" + (history.latestRunId ?? "none"),
      "Evidence: executed=" + (history.executedRepairs ?? 0) + " skipped=" + (history.skippedHighRisk ?? 0),
    ].join("\\n");
  } catch {
    phase4HistoryReady.textContent = "false";
    phase4HistoryHealCount.textContent = "0";
    phase4HistoryMaintenanceCount.textContent = "0";
    phase4HistoryJson.textContent = "Unable to read Phase 4 heal history evidence.";
  }
}

async function refreshPhase4CompletionReadiness() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-4/completion-readiness\`);
    const summary = data.summary ?? {};
    phase4ReadinessReady.textContent = String(Boolean(summary.ready));
    phase4ReadinessChecks.textContent = (summary.passed ?? 0) + "/" + (summary.total ?? 0);
    phase4ReadinessPercent.textContent = String(summary.completionPercent ?? 0);
    phase4ReadinessJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-4-completion-readiness-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Evidence: services=" + (summary.servicesObserved ?? 0) + " executed=" + (summary.executedRepairs ?? 0) + " skipped=" + (summary.skippedHighRisk ?? 0),
      "Tracks: " + ((data.completedTracks ?? []).map((track) => track.id + "=" + track.status).join(" | ") || "none"),
    ].join("\\n");
  } catch {
    phase4ReadinessReady.textContent = "false";
    phase4ReadinessChecks.textContent = "0/0";
    phase4ReadinessPercent.textContent = "0";
    phase4ReadinessJson.textContent = "Unable to read Phase 4 completion readiness.";
  }
}

async function refreshPhase4Exit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-4/exit\`);
    const summary = data.summary ?? {};
    phase4ExitComplete.textContent = String(Boolean(summary.complete));
    phase4ExitPercent.textContent = String(summary.completionPercent ?? 0);
    phase4ExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-phase-5-plan";
    phase4ExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-4-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Completed: " + (data.completedPhase?.completionClaim ?? "unknown"),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-phase-5-plan"),
    ].join("\\n");
  } catch {
    phase4ExitComplete.textContent = "false";
    phase4ExitPercent.textContent = "0";
    phase4ExitNext.textContent = "openclaw-phase-5-plan";
    phase4ExitJson.textContent = "Unable to read Phase 4 exit gate.";
  }
}

async function refreshPhase5Plan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-5/plan\`);
    const summary = data.summary ?? {};
    const governance = data.governance ?? {};
    phase5PlanReady.textContent = String(Boolean(summary.ready));
    phase5PlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-phase-5-deployment-inventory";
    phase5PlanReleaseAction.textContent = String(Boolean(governance.releaseAction));
    phase5PlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-5-plan-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown") + " ready=" + Boolean(summary.ready),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Make deployment and rollback controllable."),
      "Slices: " + ((data.selectedSlices ?? []).join(", ") || "none"),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    phase5PlanReady.textContent = "false";
    phase5PlanNext.textContent = "unknown";
    phase5PlanReleaseAction.textContent = "false";
    phase5PlanJson.textContent = "Unable to read Phase 5 plan.";
  }
}

async function refreshPhase5DeploymentInventory() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-5/deployment-inventory\`);
    const summary = data.summary ?? {};
    phase5DeploymentReady.textContent = String(Boolean(summary.ready));
    phase5DeploymentServices.textContent = String(summary.servicesObserved ?? 0);
    phase5DeploymentModules.textContent = String(summary.modulesObserved ?? 0);
    phase5DeploymentJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-5-deployment-inventory-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " checks=" + (summary.passed ?? 0) + "/" + (summary.total ?? 0),
      "Deployment: model=" + (data.deployment?.model ?? "unknown") + " profile=" + (data.deployment?.hostProfile ?? "unknown"),
      "Inventory: services=" + (summary.servicesObserved ?? 0) + " modules=" + (summary.modulesObserved ?? 0) + " scripts=" + (summary.scriptsObserved ?? 0),
    ].join("\\n");
  } catch {
    phase5DeploymentReady.textContent = "false";
    phase5DeploymentServices.textContent = "0";
    phase5DeploymentModules.textContent = "0";
    phase5DeploymentJson.textContent = "Unable to read Phase 5 deployment inventory.";
  }
}

async function refreshPhase5RollbackReadiness() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-5/rollback-readiness\`);
    const summary = data.summary ?? {};
    phase5RollbackReady.textContent = String(Boolean(summary.ready));
    phase5RollbackSurfaces.textContent = String(summary.rollbackSurfaces ?? 0);
    phase5RollbackExecuted.textContent = String(Boolean(summary.rollbackExecuted));
    phase5RollbackJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-5-rollback-readiness-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " checks=" + (summary.passed ?? 0) + "/" + (summary.total ?? 0),
      "Rollback: surfaces=" + (summary.rollbackSurfaces ?? 0) + " executed=" + Boolean(summary.rollbackExecuted),
      "Boundary: " + (data.rollback?.operatorBoundary ?? "read-only"),
    ].join("\\n");
  } catch {
    phase5RollbackReady.textContent = "false";
    phase5RollbackSurfaces.textContent = "0";
    phase5RollbackExecuted.textContent = "false";
    phase5RollbackJson.textContent = "Unable to read Phase 5 rollback readiness.";
  }
}

async function refreshPhase5ReleaseControlReadiness() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-5/release-control-readiness\`);
    const summary = data.summary ?? {};
    phase5ReleaseReady.textContent = String(Boolean(summary.ready));
    phase5ReleasePercent.textContent = String(summary.completionPercent ?? 0);
    phase5ReleaseMutation.textContent = String(Boolean(summary.mutatesHost));
    phase5ReleaseJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-5-release-control-readiness-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Controls: " + ((data.controls ?? []).join(" | ") || "none"),
      "Tracks: " + ((data.completedTracks ?? []).map((track) => track.id + "=" + track.status).join(" | ") || "none"),
    ].join("\\n");
  } catch {
    phase5ReleaseReady.textContent = "false";
    phase5ReleasePercent.textContent = "0";
    phase5ReleaseMutation.textContent = "false";
    phase5ReleaseJson.textContent = "Unable to read Phase 5 release control readiness.";
  }
}

async function refreshPhase5Exit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-5/exit\`);
    const summary = data.summary ?? {};
    phase5ExitComplete.textContent = String(Boolean(summary.complete));
    phase5ExitPercent.textContent = String(summary.completionPercent ?? 0);
    phase5ExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-mvp-final-readiness";
    phase5ExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-5-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Completed: " + (data.completedPhase?.completionClaim ?? "unknown"),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-mvp-final-readiness"),
    ].join("\\n");
  } catch {
    phase5ExitComplete.textContent = "false";
    phase5ExitPercent.textContent = "0";
    phase5ExitNext.textContent = "openclaw-mvp-final-readiness";
    phase5ExitJson.textContent = "Unable to read Phase 5 exit gate.";
  }
}

async function refreshMvpFinalReadiness() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/mvp/final-readiness\`);
    const summary = data.summary ?? {};
    mvpFinalComplete.textContent = String(Boolean(summary.complete));
    mvpFinalCriteria.textContent = (summary.criteriaPassed ?? 0) + "/" + (summary.criteriaTotal ?? 0);
    mvpFinalNext.textContent = data.next?.recommendedSlice ?? "openclaw-post-mvp-plan";
    mvpFinalJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-mvp-final-readiness-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Criteria: " + (summary.criteriaPassed ?? 0) + "/" + (summary.criteriaTotal ?? 0),
      "Boundary: " + (data.whitepaperAlignment?.nextBoundary ?? "post-MVP plan required"),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-post-mvp-plan"),
    ].join("\\n");
  } catch {
    mvpFinalComplete.textContent = "false";
    mvpFinalCriteria.textContent = "0/0";
    mvpFinalNext.textContent = "openclaw-post-mvp-plan";
    mvpFinalJson.textContent = "Unable to read MVP final readiness.";
  }
}

async function refreshPostMvpPlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/post-mvp/plan\`);
    const summary = data.summary ?? {};
    postMvpPlanReady.textContent = String(Boolean(summary.ready));
    postMvpPlanTrunk.textContent = summary.selectedTrunk ?? "unknown";
    postMvpPlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-phase-6-consciousness-memory-plan";
    postMvpPlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-post-mvp-plan-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Theme: " + (data.whitepaperAlignment?.selectedTheme ?? "Give the body a memory-bearing task mind."),
      "Selected: " + (summary.selectedTrunk ?? "unknown"),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-phase-6-consciousness-memory-plan"),
    ].join("\\n");
  } catch {
    postMvpPlanReady.textContent = "false";
    postMvpPlanTrunk.textContent = "unknown";
    postMvpPlanNext.textContent = "openclaw-phase-6-consciousness-memory-plan";
    postMvpPlanJson.textContent = "Unable to read post-MVP plan.";
  }
}

async function refreshPhase6Plan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/plan\`);
    const summary = data.summary ?? {};
    phase6PlanReady.textContent = String(Boolean(summary.ready));
    phase6PlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-phase-6-memory-substrate-inventory";
    phase6PlanWritesMemory.textContent = String(Boolean(summary.writesMemory));
    phase6PlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-consciousness-memory-plan-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Give the body a memory-bearing task mind."),
      "Slices: " + ((data.selectedSlices ?? []).join(", ") || "none"),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    phase6PlanReady.textContent = "false";
    phase6PlanNext.textContent = "unknown";
    phase6PlanWritesMemory.textContent = "false";
    phase6PlanJson.textContent = "Unable to read Phase 6 plan.";
  }
}

async function refreshPhase6MemorySubstrateInventory() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/memory-substrate-inventory\`);
    const summary = data.summary ?? {};
    phase6MemoryReady.textContent = String(Boolean(summary.ready));
    phase6MemorySources.textContent = String(summary.sourceCount ?? 0);
    phase6MemoryWritable.textContent = String(summary.writableSources ?? 0);
    phase6MemoryJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-memory-substrate-inventory-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " sources=" + (summary.sourceCount ?? 0) + " writable=" + (summary.writableSources ?? 0),
      "Sources: " + ((data.memorySources ?? []).map((source) => source.id).join(", ") || "none"),
    ].join("\\n");
  } catch {
    phase6MemoryReady.textContent = "false";
    phase6MemorySources.textContent = "0";
    phase6MemoryWritable.textContent = "0";
    phase6MemoryJson.textContent = "Unable to read Phase 6 memory substrate inventory.";
  }
}

async function refreshPhase6ConsciousnessContextEnvelope() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/consciousness-context-envelope\`);
    const summary = data.summary ?? {};
    phase6ContextReady.textContent = String(Boolean(summary.ready));
    phase6ContextPointers.textContent = String(summary.memoryPointers ?? 0);
    phase6ContextTransmitted.textContent = String(Boolean(summary.transmitted));
    phase6ContextJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-consciousness-context-envelope-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " pointers=" + (summary.memoryPointers ?? 0) + " transmitted=" + Boolean(summary.transmitted),
      "Schema: " + (data.envelope?.schema ?? "unknown"),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    phase6ContextReady.textContent = "false";
    phase6ContextPointers.textContent = "0";
    phase6ContextTransmitted.textContent = "false";
    phase6ContextJson.textContent = "Unable to read Phase 6 consciousness context envelope.";
  }
}

async function refreshPhase6TaskOrchestrationRecords() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/task-orchestration-records\`);
    const summary = data.summary ?? {};
    phase6OrchestrationReady.textContent = String(Boolean(summary.ready));
    phase6OrchestrationRecords.textContent = String(summary.recordCount ?? 0);
    phase6OrchestrationScheduled.textContent = String(summary.scheduledTasks ?? 0);
    phase6OrchestrationJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-task-orchestration-records-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " records=" + (summary.recordCount ?? 0) + " scheduled=" + (summary.scheduledTasks ?? 0),
      "Records: " + ((data.records ?? []).map((record) => record.id + "=" + record.status).join(" | ") || "none"),
    ].join("\\n");
  } catch {
    phase6OrchestrationReady.textContent = "false";
    phase6OrchestrationRecords.textContent = "0";
    phase6OrchestrationScheduled.textContent = "0";
    phase6OrchestrationJson.textContent = "Unable to read Phase 6 task orchestration records.";
  }
}

async function refreshPhase6MemoryWriteRouteReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/memory-write-route-review\`);
    const summary = data.summary ?? {};
    phase6RouteReady.textContent = String(Boolean(summary.ready));
    phase6RouteSelected.textContent = summary.selectedSlice ?? "unknown";
    phase6RouteWritesMemory.textContent = String(Boolean(summary.writesMemory));
    phase6RouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-memory-write-route-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " selected=" + (summary.selectedSlice ?? "unknown"),
      "Deferred: " + (data.decision?.deferredSlice ?? "unknown"),
      "Writes Memory: " + Boolean(summary.writesMemory) + " cloud=" + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    phase6RouteReady.textContent = "false";
    phase6RouteSelected.textContent = "unknown";
    phase6RouteWritesMemory.textContent = "false";
    phase6RouteJson.textContent = "Unable to read Phase 6 memory write route review.";
  }
}

async function refreshPhase6Exit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/exit\`);
    const summary = data.summary ?? {};
    phase6ExitComplete.textContent = String(Boolean(summary.complete));
    phase6ExitPercent.textContent = String(summary.completionPercent ?? 0);
    phase6ExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-long-term-memory-write-plan";
    phase6ExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Evidence: sources=" + (summary.memorySources ?? 0) + " pointers=" + (summary.memoryPointers ?? 0) + " records=" + (summary.orchestrationRecords ?? 0),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-long-term-memory-write-plan"),
    ].join("\\n");
  } catch {
    phase6ExitComplete.textContent = "false";
    phase6ExitPercent.textContent = "0";
    phase6ExitNext.textContent = "openclaw-long-term-memory-write-plan";
    phase6ExitJson.textContent = "Unable to read Phase 6 exit gate.";
  }
}

async function refreshLongTermMemoryWritePlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/write-plan\`);
    const summary = data.summary ?? {};
    longTermMemoryPlanReady.textContent = String(Boolean(summary.ready));
    longTermMemoryPlanScope.textContent = data.storage?.file ?? "unknown";
    longTermMemoryPlanWrites.textContent = String(Boolean(summary.writesMemory));
    longTermMemoryPlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-write-plan-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Give the body its first governed long-term memory write."),
      "Scope: " + (data.storage?.file ?? "unknown"),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    longTermMemoryPlanReady.textContent = "false";
    longTermMemoryPlanScope.textContent = "unknown";
    longTermMemoryPlanWrites.textContent = "false";
    longTermMemoryPlanJson.textContent = "Unable to read long-term memory write plan.";
  }
}

async function refreshLongTermMemorySchema() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/schema\`);
    const summary = data.summary ?? {};
    longTermMemorySchemaReady.textContent = String(Boolean(summary.ready));
    longTermMemorySchemaFields.textContent = String(summary.requiredFieldCount ?? 0);
    longTermMemorySchemaCloud.textContent = String(Boolean(summary.callsCloudModel));
    longTermMemorySchemaJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-schema-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Schema: " + (data.schema?.id ?? "unknown"),
      "Fields: " + ((data.schema?.requiredFields ?? []).join(", ") || "none"),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    longTermMemorySchemaReady.textContent = "false";
    longTermMemorySchemaFields.textContent = "0";
    longTermMemorySchemaCloud.textContent = "false";
    longTermMemorySchemaJson.textContent = "Unable to read long-term memory schema.";
  }
}

async function refreshLongTermMemoryProposal() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/proposal\`);
    const summary = data.summary ?? {};
    longTermMemoryProposalReady.textContent = String(Boolean(summary.ready));
    longTermMemoryProposalType.textContent = summary.memoryType ?? "unknown";
    longTermMemoryProposalBulk.textContent = String(Boolean(summary.bulkImport));
    longTermMemoryProposalJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-proposal-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Proposal: " + (data.proposal?.id ?? "unknown"),
      "Type: " + (summary.memoryType ?? "unknown"),
      "Source: " + (data.proposal?.sourceRegistry ?? "unknown"),
    ].join("\\n");
  } catch {
    longTermMemoryProposalReady.textContent = "false";
    longTermMemoryProposalType.textContent = "unknown";
    longTermMemoryProposalBulk.textContent = "false";
    longTermMemoryProposalJson.textContent = "Unable to read long-term memory proposal.";
  }
}

async function refreshLongTermMemoryWriteRouteReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/write-route-review\`);
    const summary = data.summary ?? {};
    longTermMemoryRouteReady.textContent = String(Boolean(summary.ready));
    longTermMemoryRouteSelected.textContent = summary.selectedSlice ?? "unknown";
    longTermMemoryRouteWrites.textContent = String(Boolean(summary.writesMemory));
    longTermMemoryRouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-write-route-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Selected: " + (summary.selectedSlice ?? "unknown"),
      "Can Append After Approval: " + Boolean(data.decision?.canAppendAfterApproval),
      "Writes Now: " + Boolean(summary.writesMemory),
    ].join("\\n");
  } catch {
    longTermMemoryRouteReady.textContent = "false";
    longTermMemoryRouteSelected.textContent = "unknown";
    longTermMemoryRouteWrites.textContent = "false";
    longTermMemoryRouteJson.textContent = "Unable to read long-term memory write route review.";
  }
}

async function refreshLongTermMemoryWriteTask() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/write-route-review\`);
    const summary = data.summary ?? {};
    longTermMemoryTaskReady.textContent = String(Boolean(summary.ready));
    longTermMemoryTaskCreates.textContent = "true";
    longTermMemoryTaskApproval.textContent = data.decision?.canCreateTask === true ? "required" : "blocked";
    longTermMemoryTaskJson.textContent = [
      "Registry: openclaw-long-term-memory-write-task-v0",
      "Route: " + (data.registry ?? "openclaw-long-term-memory-write-route-review-v0"),
      "Ready: " + Boolean(summary.ready),
      "Creates Task: true",
      "Approval: required before JSONL append",
    ].join("\\n");
  } catch {
    longTermMemoryTaskReady.textContent = "false";
    longTermMemoryTaskCreates.textContent = "false";
    longTermMemoryTaskApproval.textContent = "unknown";
    longTermMemoryTaskJson.textContent = "Unable to read long-term memory write task boundary.";
  }
}

async function refreshLongTermMemoryApprovedWrite() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/readback\`);
    const summary = data.summary ?? {};
    longTermMemoryApprovedRecords.textContent = String(summary.recordCount ?? 0);
    longTermMemoryApprovedLatest.textContent = summary.latestRecordId ?? "none";
    longTermMemoryApprovedCloud.textContent = String(Boolean(summary.callsCloudModel));
    longTermMemoryApprovedJson.textContent = [
      "Registry: openclaw-long-term-memory-approved-write-v0",
      "Readback: " + (data.registry ?? "openclaw-long-term-memory-readback-v0"),
      "Records: " + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    longTermMemoryApprovedRecords.textContent = "0";
    longTermMemoryApprovedLatest.textContent = "none";
    longTermMemoryApprovedCloud.textContent = "false";
    longTermMemoryApprovedJson.textContent = "No approved long-term memory write evidence yet.";
  }
}

async function refreshLongTermMemoryReadback() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/readback\`);
    const summary = data.summary ?? {};
    longTermMemoryReadbackReady.textContent = String(Boolean(summary.ready));
    longTermMemoryReadbackRecords.textContent = String(summary.recordCount ?? 0);
    longTermMemoryReadbackHash.textContent = summary.latestContentHash ?? "none";
    longTermMemoryReadbackJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-readback-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " records=" + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Hash: " + (summary.latestContentHash ?? "none"),
    ].join("\\n");
  } catch {
    longTermMemoryReadbackReady.textContent = "false";
    longTermMemoryReadbackRecords.textContent = "0";
    longTermMemoryReadbackHash.textContent = "none";
    longTermMemoryReadbackJson.textContent = "Unable to read long-term memory readback.";
  }
}

async function refreshLongTermMemoryExit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/exit\`);
    const summary = data.summary ?? {};
    longTermMemoryExitComplete.textContent = String(Boolean(summary.complete));
    longTermMemoryExitPercent.textContent = String(summary.completionPercent ?? 0);
    longTermMemoryExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-context-review";
    longTermMemoryExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Records: " + (summary.recordCount ?? 0),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-context-review"),
    ].join("\\n");
  } catch {
    longTermMemoryExitComplete.textContent = "false";
    longTermMemoryExitPercent.textContent = "0";
    longTermMemoryExitNext.textContent = "openclaw-cloud-consciousness-context-review";
    longTermMemoryExitJson.textContent = "Unable to read long-term memory exit gate.";
  }
}

`;
