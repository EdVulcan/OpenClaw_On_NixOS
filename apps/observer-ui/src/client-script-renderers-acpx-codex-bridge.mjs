export const observerClientAcpxCodexBridgeRenderersScript = `function renderAcpxCodexBridgeCompatibility(data) {
  const compatibility = data?.compatibility ?? {};
  const authIsolation = data?.authIsolation ?? {};
  const persistence = data?.persistence ?? {};
  const governance = data?.governance ?? {};
  const wrapperDraft = data?.wrapperDraft ?? null;
  const draftSummary = wrapperDraft?.summary ?? {};
  const draftProposal = wrapperDraft?.proposal ?? {};
  const draftGovernance = wrapperDraft?.governance ?? {};
  const records = Array.isArray(persistence.records) ? persistence.records : [];
  const selected = persistence.selectedRecord ?? null;
  const deferred = Array.isArray(data?.deferredExecutionBoundaries) ? data.deferredExecutionBoundaries : [];
  const draftDeferred = Array.isArray(wrapperDraft?.deferredExecutionBoundaries) ? wrapperDraft.deferredExecutionBoundaries : [];

  acpxCodexBridgeRegistry.textContent = data?.registry ?? "openclaw-native-acpx-codex-bridge-compatibility-v0";
  acpxCodexBridgeSessions.textContent = String(persistence.totalRecords ?? records.length);
  acpxCodexBridgeSelected.textContent = selected?.sessionKey ?? persistence.selectedSessionKey ?? "none";
  acpxCodexBridgeDraft.textContent = draftSummary.readyForApprovalBridge ? "ready" : (draftProposal.status ?? "blocked");
  acpxCodexBridgeAuth.textContent = authIsolation.credentialValueRead ? "credential-read" : "isolated";
  acpxCodexBridgeRuntime.textContent = governance.canSpawnCodexAcp || governance.canExecuteWrapper ? "enabled" : "blocked";
  acpxCodexBridgeMode.textContent = data?.mode ?? "compatibility-and-persistence-evidence";

  acpxCodexBridgeJson.textContent = [
    "ACPX/Codex bridge compatibility: maps enhanced bridge lessons into OpenClaw-native compatibility and session persistence evidence.",
    "This does not read CODEX_HOME, read auth.json/config.toml, copy auth material, write wrappers, execute npx/npx.cmd, spawn ACP/Codex, call providers, or use network egress.",
    \`Registry: \${data?.registry ?? "openclaw-native-acpx-codex-bridge-compatibility-v0"}\`,
    \`Mode: \${data?.mode ?? "compatibility-and-persistence-evidence"}\`,
    \`Identity: \${data?.identityLevel ?? "Level 1: stable user-space control plane"}\`,
    \`Capability: \${data?.auditEvidence?.capabilityId ?? "sense.openclaw.acpx_codex_bridge.compatibility"}\`,
    \`Compatibility: runtime=\${compatibility.currentRuntimeSubject ?? "unknown"} target=\${compatibility.targetBridge ?? "unknown"} posix=\${compatibility.posixCommand ?? "unknown"} windowsLesson=\${compatibility.windowsCommandLesson ?? "unknown"} override=\${Boolean(compatibility.commandOverrideSupportedByContract)} wrapperDrafted=\${Boolean(compatibility.wrapperCommandDrafted)} wrapperWritten=\${Boolean(compatibility.wrapperWritten)} processSpawned=\${Boolean(compatibility.codexAcpProcessSpawned)}\`,
    \`Auth: CODEX_HOME=\${Boolean(authIsolation.sourceCodexHomeRead)} authJson=\${Boolean(authIsolation.authJsonRead)} configToml=\${Boolean(authIsolation.configTomlRead)} copied=\${Boolean(authIsolation.authMaterialCopied)} credentialValue=\${Boolean(authIsolation.credentialValueRead)} secretWrapper=\${Boolean(authIsolation.secretValuesEmbeddedInWrapper)}\`,
    \`Persistence: registry=\${persistence.registry ?? "openclaw-native-acpx-codex-session-persistence-v0"} ready=\${Boolean(persistence.storeReady)} records=\${persistence.totalRecords ?? records.length}/\${persistence.maxRecords ?? "n/a"} selected=\${selected?.sessionKey ?? persistence.selectedSessionKey ?? "none"} missingNull=\${Boolean(persistence.missingSessionReturnsNull)} overwrite=\${Boolean(persistence.supportsOverwrite)} independent=\${Boolean(persistence.supportsIndependentSessions)}\`,
    \`Governance: persist=\${Boolean(governance.canPersistSessionMetadata)} credentialRead=\${Boolean(governance.canReadCredentialValue)} authCopy=\${Boolean(governance.canCopyAuthMaterial)} wrapperWrite=\${Boolean(governance.canWriteWrapper)} wrapperExec=\${Boolean(governance.canExecuteWrapper)} spawn=\${Boolean(governance.canSpawnCodexAcp)} provider=\${Boolean(governance.canCallProvider)} network=\${Boolean(governance.canUseNetwork)} observer=\${Boolean(governance.observerVisible)}\`,
    wrapperDraft ? \`Wrapper capability: \${wrapperDraft.auditEvidence?.capabilityId ?? "plan.openclaw.acpx_codex_bridge.wrapper_action"}\` : null,
    wrapperDraft ? \`Wrapper draft: registry=\${wrapperDraft.registry ?? "unknown"} status=\${draftProposal.status ?? "unknown"} ready=\${Boolean(draftSummary.readyForApprovalBridge)} path=\${draftProposal.wrapper?.relativePath ?? "none"} command=\${draftProposal.command?.command ?? "npx"} args=\${(draftProposal.command?.args ?? []).join(" ")}\` : null,
    wrapperDraft ? \`Wrapper governance: draft=\${Boolean(draftGovernance.canDraftWrapperAction)} task=\${Boolean(draftGovernance.createsTask)} approval=\${Boolean(draftGovernance.createsApproval)} credentialRead=\${Boolean(draftGovernance.canReadCredentialValue)} authCopy=\${Boolean(draftGovernance.canCopyAuthMaterial)} write=\${Boolean(draftGovernance.canWriteWrapper)} exec=\${Boolean(draftGovernance.canExecuteWrapper)} spawn=\${Boolean(draftGovernance.canSpawnCodexAcp)} provider=\${Boolean(draftGovernance.canCallProvider)} network=\${Boolean(draftGovernance.canUseNetwork)}\` : null,
    \`Audit: operation=\${data?.auditEvidence?.operation ?? "acpx_codex_bridge_compatibility_read"} evidence=\${data?.auditEvidence?.evidenceKind ?? "missing"} persisted=\${Boolean(data?.auditEvidence?.persisted)}\`,
    "",
    ...records.slice(0, 8).map((record) => \`\${record.sessionKey ?? "session"} agent=\${record.agentId ?? "unknown"} record=\${record.acpxRecordId ?? "unknown"} revision=\${record.revision ?? 0} credentialRead=\${Boolean(record.credentialValueRead)} copied=\${Boolean(record.authMaterialCopied)} wrapper=\${Boolean(record.wrapperWritten)} spawn=\${Boolean(record.processSpawned)}\`),
    "",
    ...deferred.map((boundary) => \`deferred: \${boundary}\`),
    ...draftDeferred.map((boundary) => \`draft deferred: \${boundary}\`),
  ].filter(Boolean).join("\\n");
}

`;
