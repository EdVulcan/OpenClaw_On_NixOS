export const observerClientNativeRuntimeRefreshRenderersScript = `function renderNativePluginRuntimeRefreshEvidence(data) {
  const summary = data?.summary ?? {};
  const runtime = data?.runtimeState ?? {};
  const governance = data?.governance ?? {};
  const actions = Array.isArray(data?.lifecycleActions) ? data.lifecycleActions : [];
  const deferred = Array.isArray(data?.deferredExecutionBoundaries) ? data.deferredExecutionBoundaries : [];
  nativePluginRuntimeRefreshRegistry.textContent = data?.registry ?? "openclaw-native-plugin-runtime-refresh-evidence-v0";
  nativePluginRuntimeRefreshState.textContent = summary.readModelRefreshed ? "refreshed" : "unknown";
  nativePluginRuntimeRefreshBlocked.textContent = String(summary.blockedActions ?? 0);
  nativePluginRuntimeRefreshRuntime.textContent = governance.canActivateRuntime ? "enabled" : "blocked";
  nativePluginRuntimeRefreshMode.textContent = data?.mode ?? "governed-runtime-refresh-evidence-only";

  nativePluginRuntimeRefreshJson.textContent = [
    "Native plugin runtime refresh evidence: recomputes the native plugin registry read model and reports activation/cache boundaries.",
    "This does not import plugin modules, execute plugin code, activate runtime, invalidate module caches, mutate install state, create tasks, create approvals, call providers, or import enhanced source code.",
    \`Registry: \${data?.registry ?? "openclaw-native-plugin-runtime-refresh-evidence-v0"}\`,
    \`Mode: \${data?.mode ?? "governed-runtime-refresh-evidence-only"}\`,
    \`Identity: \${data?.identityLevel ?? "Level 1: stable user-space control plane"}\`,
    \`Capability: \${data?.capability?.id ?? "sense.openclaw.plugin_runtime.refresh_evidence"} risk=\${data?.capability?.risk ?? "medium"} approval=\${Boolean(data?.capability?.approvalRequired)}\`,
    \`Runtime: owner=\${runtime.runtimeOwner ?? "unknown"} activationMode=\${runtime.activationMode ?? "unknown"} validation=\${Boolean(runtime.validationOk)} plugins=\${runtime.totalPlugins ?? 0} capabilities=\${runtime.totalCapabilities ?? 0} loader=\${Boolean(runtime.activeLoader)} loadedModules=\${runtime.loadedPluginModules ?? 0}\`,
    \`Summary: readModelRefreshed=\${Boolean(summary.readModelRefreshed)} refreshReady=\${Boolean(summary.refreshEvidenceReady)} blocked=\${summary.blockedActions ?? 0} deferred=\${summary.deferredActions ?? 0} activationReady=\${Boolean(summary.activationReady)}\`,
    \`Governance: refreshReadModel=\${Boolean(governance.canRefreshReadModel)} invalidateDiscovery=\${Boolean(governance.canInvalidateDiscoveryCache)} invalidateModule=\${Boolean(governance.canInvalidateModuleCache)} importModule=\${Boolean(governance.canImportModule)} executePlugin=\${Boolean(governance.canExecutePluginCode)} activateRuntime=\${Boolean(governance.canActivateRuntime)} mutateInstall=\${Boolean(governance.canMutatePluginInstallState)}\`,
    \`Audit: operation=\${data?.auditEvidence?.operation ?? "plugin_runtime_refresh_evidence"} evidence=\${data?.auditEvidence?.evidenceKind ?? "missing"} persisted=\${Boolean(data?.auditEvidence?.persisted)}\`,
    "",
    ...actions.slice(0, 8).map((action) => \`\${action.status ?? "unknown"} \${action.id ?? "action"} imports=\${Boolean(action.importsModule)} activates=\${Boolean(action.activatesRuntime)} evidence=\${action.evidence ?? "none"}\`),
    "",
    ...deferred.map((boundary) => \`deferred: \${boundary}\`),
  ].join("\\n");
}

`;
