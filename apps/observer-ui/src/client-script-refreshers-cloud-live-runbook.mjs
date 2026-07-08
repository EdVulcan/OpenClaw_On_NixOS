export const observerClientCloudLiveRunbookRefreshersScript = `async function refreshCloudConsciousnessLiveProviderCallRunbook() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-call-runbook\`);
    const summary = data.summary ?? {};
    cloudLiveRunbookReady.textContent = String(Boolean(summary.ready));
    cloudLiveRunbookEnabled.textContent = String(Boolean(summary.liveProviderCallEnabled));
    cloudLiveRunbookNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-operator-checklist";
    cloudLiveRunbookJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-call-runbook-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Prepare the live provider-call runbook without enabling external transmission."),
      "Live Enabled: " + Boolean(summary.liveProviderCallEnabled),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    cloudLiveRunbookReady.textContent = "false";
    cloudLiveRunbookEnabled.textContent = "false";
    cloudLiveRunbookNext.textContent = "openclaw-cloud-consciousness-live-provider-operator-checklist";
    cloudLiveRunbookJson.textContent = "Unable to read live provider call runbook.";
  }
}

async function refreshCloudConsciousnessLiveProviderOperatorChecklist() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-operator-checklist\`);
    const summary = data.summary ?? {};
    cloudLiveChecklistReady.textContent = String(Boolean(summary.ready));
    cloudLiveChecklistItems.textContent = String(summary.checklistItemCount ?? 0);
    cloudLiveChecklistTransmits.textContent = String(Boolean(summary.transmitsExternally));
    cloudLiveChecklistJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-operator-checklist-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Items: " + ((data.checklist?.operatorMustConfirm ?? []).join(", ") || "none"),
      "Transmits: " + Boolean(summary.transmitsExternally),
    ].join("\\n");
  } catch {
    cloudLiveChecklistReady.textContent = "false";
    cloudLiveChecklistItems.textContent = "0";
    cloudLiveChecklistTransmits.textContent = "false";
    cloudLiveChecklistJson.textContent = "Unable to read live provider operator checklist.";
  }
}

async function refreshCloudConsciousnessLiveProviderEgressTranscriptSchema() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-egress-transcript-schema\`);
    const summary = data.summary ?? {};
    cloudLiveTranscriptReady.textContent = String(Boolean(summary.ready));
    cloudLiveTranscriptFields.textContent = String(summary.requiredFieldCount ?? 0);
    cloudLiveTranscriptStatus.textContent = data.schema?.phase11AllowedStatus ?? "unknown";
    cloudLiveTranscriptJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-egress-transcript-schema-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Schema: " + (data.schema?.id ?? "unknown"),
      "Fields: " + ((data.schema?.requiredFields ?? []).join(", ") || "none"),
      "Allowed Status: " + (data.schema?.phase11AllowedStatus ?? "unknown"),
    ].join("\\n");
  } catch {
    cloudLiveTranscriptReady.textContent = "false";
    cloudLiveTranscriptFields.textContent = "0";
    cloudLiveTranscriptStatus.textContent = "unknown";
    cloudLiveTranscriptJson.textContent = "Unable to read live provider egress transcript schema.";
  }
}

async function refreshCloudConsciousnessLiveProviderFinalAuthorizationReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-final-authorization-review\`);
    const summary = data.summary ?? {};
    cloudLiveAuthReady.textContent = String(Boolean(summary.ready));
    cloudLiveAuthEnabled.textContent = String(Boolean(summary.liveProviderCallEnabled));
    cloudLiveAuthCredential.textContent = String(Boolean(summary.providerCredentialRead));
    cloudLiveAuthJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-final-authorization-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Authorization: " + (data.authorization?.status ?? "unknown"),
      "Response: " + (data.authorization?.reviewedResponseRecordId ?? "none"),
      "Live Enabled: " + Boolean(summary.liveProviderCallEnabled),
    ].join("\\n");
  } catch {
    cloudLiveAuthReady.textContent = "false";
    cloudLiveAuthEnabled.textContent = "false";
    cloudLiveAuthCredential.textContent = "false";
    cloudLiveAuthJson.textContent = "Unable to read live provider final authorization review.";
  }
}

async function refreshCloudConsciousnessLiveProviderRunbookRouteReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-runbook-route-review\`);
    const summary = data.summary ?? {};
    cloudLiveRouteReady.textContent = String(Boolean(summary.ready));
    cloudLiveRouteSelected.textContent = summary.selectedSlice ?? "unknown";
    cloudLiveRouteCall.textContent = String(Boolean(summary.callsCloudModel));
    cloudLiveRouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-runbook-route-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Selected: " + (summary.selectedSlice ?? "unknown"),
      "Deferred: " + (summary.deferredSlice ?? "unknown"),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    cloudLiveRouteReady.textContent = "false";
    cloudLiveRouteSelected.textContent = "unknown";
    cloudLiveRouteCall.textContent = "false";
    cloudLiveRouteJson.textContent = "Unable to read live provider runbook route review.";
  }
}

async function refreshCloudConsciousnessLiveProviderRunbookTask() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-runbook-route-review\`);
    const summary = data.summary ?? {};
    cloudLiveTaskReady.textContent = String(Boolean(summary.ready));
    cloudLiveTaskCreates.textContent = "true";
    cloudLiveTaskApproval.textContent = data.decision?.canCreateTask === true ? "required" : "blocked";
    cloudLiveTaskJson.textContent = [
      "Registry: openclaw-cloud-consciousness-live-provider-call-runbook-task-v0",
      "Route: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-runbook-route-review-v0"),
      "Ready: " + Boolean(summary.ready),
      "Creates Task: true",
      "Provider Call: runbook only",
    ].join("\\n");
  } catch {
    cloudLiveTaskReady.textContent = "false";
    cloudLiveTaskCreates.textContent = "false";
    cloudLiveTaskApproval.textContent = "unknown";
    cloudLiveTaskJson.textContent = "Unable to read live provider runbook task boundary.";
  }
}

async function refreshCloudConsciousnessApprovedLiveProviderRunbook() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-runbook-readback\`);
    const summary = data.summary ?? {};
    cloudLiveApprovedRecords.textContent = String(summary.recordCount ?? 0);
    cloudLiveApprovedLatest.textContent = summary.latestRecordId ?? "none";
    cloudLiveApprovedEnabled.textContent = String(Boolean(summary.liveProviderCallEnabled));
    cloudLiveApprovedJson.textContent = [
      "Registry: openclaw-cloud-consciousness-approved-live-provider-runbook-v0",
      "Readback: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-runbook-readback-v0"),
      "Records: " + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Live Enabled: " + Boolean(summary.liveProviderCallEnabled),
    ].join("\\n");
  } catch {
    cloudLiveApprovedRecords.textContent = "0";
    cloudLiveApprovedLatest.textContent = "none";
    cloudLiveApprovedEnabled.textContent = "false";
    cloudLiveApprovedJson.textContent = "No approved live provider runbook evidence yet.";
  }
}

async function refreshCloudConsciousnessLiveProviderRunbookReadback() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-runbook-readback\`);
    const summary = data.summary ?? {};
    cloudLiveReadbackReady.textContent = String(Boolean(summary.ready));
    cloudLiveReadbackRecords.textContent = String(summary.recordCount ?? 0);
    cloudLiveReadbackHash.textContent = summary.latestContentHash ?? "none";
    cloudLiveReadbackJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-runbook-readback-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " records=" + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Hash: " + (summary.latestContentHash ?? "none"),
    ].join("\\n");
  } catch {
    cloudLiveReadbackReady.textContent = "false";
    cloudLiveReadbackRecords.textContent = "0";
    cloudLiveReadbackHash.textContent = "none";
    cloudLiveReadbackJson.textContent = "Unable to read live provider runbook readback.";
  }
}

async function refreshCloudConsciousnessLiveProviderCallRunbookExit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-call-runbook-exit\`);
    const summary = data.summary ?? {};
    cloudLiveExitComplete.textContent = String(Boolean(summary.complete));
    cloudLiveExitPercent.textContent = String(summary.completionPercent ?? 0);
    cloudLiveExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-execution-plan";
    cloudLiveExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-call-runbook-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Records: " + (summary.recordCount ?? 0),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-execution-plan"),
    ].join("\\n");
  } catch {
    cloudLiveExitComplete.textContent = "false";
    cloudLiveExitPercent.textContent = "0";
    cloudLiveExitNext.textContent = "openclaw-cloud-consciousness-live-provider-call-execution-plan";
    cloudLiveExitJson.textContent = "Unable to read live provider call runbook exit gate.";
  }
}

async function refreshCloudConsciousnessLiveProviderCallExecutionPlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-call-execution-plan\`);
    const binding = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-endpoint-credential-binding\`).catch(() => null);
    const summary = data.summary ?? {};
    const bindingSummary = binding?.summary ?? {};
    cloudLiveExecPlanReady.textContent = String(Boolean(summary.ready));
    cloudLiveExecPlanEnabled.textContent = String(Boolean(summary.liveProviderCallEnabled));
    cloudLiveExecPlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-endpoint-credential-binding";
    cloudLiveExecPlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-call-execution-plan-v0"),
      "Binding Registry: " + (binding?.registry ?? "openclaw-cloud-consciousness-live-provider-endpoint-credential-binding-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Live enabled: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint contacted: " + Boolean(bindingSummary.endpointContacted),
      "Credential value read: " + Boolean(bindingSummary.credentialValueRead),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-endpoint-credential-binding"),
    ].join("\\n");
  } catch {
    cloudLiveExecPlanReady.textContent = "false";
    cloudLiveExecPlanEnabled.textContent = "false";
    cloudLiveExecPlanNext.textContent = "openclaw-cloud-consciousness-live-provider-endpoint-credential-binding";
    cloudLiveExecPlanJson.textContent = "Unable to read live provider execution plan.";
  }
}

async function refreshCloudConsciousnessLiveProviderExecutionRouteReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-execution-route-review\`);
    const schema = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-execution-transcript-schema\`).catch(() => null);
    const summary = data.summary ?? {};
    cloudLiveExecRouteReady.textContent = String(Boolean(summary.ready));
    cloudLiveExecRouteSelected.textContent = summary.selectedSlice ?? "none";
    cloudLiveExecRouteCall.textContent = String(Boolean(summary.callsCloudModel));
    cloudLiveExecRouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-execution-route-review-v0"),
      "Schema Registry: " + (schema?.registry ?? "openclaw-cloud-consciousness-live-provider-execution-transcript-schema-v0"),
      "Task Registry: openclaw-cloud-consciousness-live-provider-call-execution-plan-task-v0",
      "Task Endpoint: /cloud-consciousness/live-provider-execution-plan-tasks",
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Selected: " + (summary.selectedSlice ?? "none"),
      "Deferred: " + (summary.deferredSlice ?? "none"),
      "Transcript Schema: " + (schema?.schema?.id ?? "openclaw.cloud_consciousness.live_provider.execution_plan_transcript.v0"),
      "Calls cloud: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    cloudLiveExecRouteReady.textContent = "false";
    cloudLiveExecRouteSelected.textContent = "none";
    cloudLiveExecRouteCall.textContent = "false";
    cloudLiveExecRouteJson.textContent = "Unable to read live provider execution route review.";
  }
}

async function refreshCloudConsciousnessLiveProviderExecutionPlanReadback() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-execution-plan-readback\`);
    const summary = data.summary ?? {};
    cloudLiveExecReadbackReady.textContent = String(Boolean(summary.ready));
    cloudLiveExecReadbackRecords.textContent = String(summary.recordCount ?? 0);
    cloudLiveExecReadbackHash.textContent = summary.latestContentHash ?? "none";
    cloudLiveExecReadbackJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-execution-plan-readback-v0"),
      "Approved Registry: openclaw-cloud-consciousness-approved-live-provider-execution-plan-v0",
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " records=" + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Hash: " + (summary.latestContentHash ?? "none"),
    ].join("\\n");
  } catch {
    cloudLiveExecReadbackReady.textContent = "false";
    cloudLiveExecReadbackRecords.textContent = "0";
    cloudLiveExecReadbackHash.textContent = "none";
    cloudLiveExecReadbackJson.textContent = "Unable to read live provider execution plan readback.";
  }
}

async function refreshCloudConsciousnessLiveProviderCallExecutionPlanExit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-call-execution-plan-exit\`);
    const summary = data.summary ?? {};
    cloudLiveExecExitComplete.textContent = String(Boolean(summary.complete));
    cloudLiveExecExitPercent.textContent = String(summary.completionPercent ?? 0);
    cloudLiveExecExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-plan";
    cloudLiveExecExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-call-execution-plan-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Records: " + (summary.recordCount ?? 0),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-plan"),
    ].join("\\n");
  } catch {
    cloudLiveExecExitComplete.textContent = "false";
    cloudLiveExecExitPercent.textContent = "0";
    cloudLiveExecExitNext.textContent = "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-plan";
    cloudLiveExecExitJson.textContent = "Unable to read live provider execution plan exit gate.";
  }
}

async function refreshCloudConsciousnessLiveProviderCallRuntimeAdapterPlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-call-runtime-adapter-plan\`);
    const summary = data.summary ?? {};
    cloudLiveRuntimeAdapterPlanReady.textContent = String(Boolean(summary.ready));
    cloudLiveRuntimeAdapterPlanPercent.textContent = String(summary.completionPercent ?? 0);
    cloudLiveRuntimeAdapterPlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-runtime-adapter-task";
    cloudLiveRuntimeAdapterPlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-plan-v0"),
      "Task Endpoint: /cloud-consciousness/live-provider-runtime-adapter-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-runtime-adapter-task-v0",
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "SDK loaded: " + Boolean(summary.providerSdkLoaded),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Live enabled: " + Boolean(summary.liveProviderCallEnabled),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-runtime-adapter-task"),
    ].join("\\n");
  } catch {
    cloudLiveRuntimeAdapterPlanReady.textContent = "false";
    cloudLiveRuntimeAdapterPlanPercent.textContent = "0";
    cloudLiveRuntimeAdapterPlanNext.textContent = "openclaw-cloud-consciousness-live-provider-runtime-adapter-task";
    cloudLiveRuntimeAdapterPlanJson.textContent = "Unable to read live provider runtime adapter plan.";
  }
}

async function refreshCloudConsciousnessLiveProviderRuntimeAdapterExit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-runtime-adapter-exit\`);
    const summary = data.summary ?? {};
    cloudLiveRuntimeAdapterExitComplete.textContent = String(Boolean(summary.complete));
    cloudLiveRuntimeAdapterExitPercent.textContent = String(summary.completionPercent ?? 0);
    cloudLiveRuntimeAdapterExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-final-authorization";
    cloudLiveRuntimeAdapterExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-runtime-adapter-exit-v0"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Creates task: " + Boolean(summary.createsTask),
      "Transmits externally: " + Boolean(summary.transmitsExternally),
      "Live enabled: " + Boolean(summary.liveProviderCallEnabled),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-final-authorization"),
    ].join("\\n");
  } catch {
    cloudLiveRuntimeAdapterExitComplete.textContent = "false";
    cloudLiveRuntimeAdapterExitPercent.textContent = "0";
    cloudLiveRuntimeAdapterExitNext.textContent = "openclaw-cloud-consciousness-live-provider-call-final-authorization";
    cloudLiveRuntimeAdapterExitJson.textContent = "Unable to read live provider runtime adapter exit gate.";
  }
}

async function refreshCloudConsciousnessLiveProviderCallFinalAuthorization() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-call-final-authorization\`);
    const summary = data.summary ?? {};
    cloudLiveFinalAuthReady.textContent = String(Boolean(summary.ready));
    cloudLiveFinalAuthGranted.textContent = String(Boolean(summary.grantsFinalAuthorization));
    cloudLiveFinalAuthNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-operator-launch-review";
    cloudLiveFinalAuthJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-call-final-authorization-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Final authorization granted: " + Boolean(summary.grantsFinalAuthorization),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live enabled: " + Boolean(summary.liveProviderCallEnabled),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-operator-launch-review"),
    ].join("\\n");
  } catch {
    cloudLiveFinalAuthReady.textContent = "false";
    cloudLiveFinalAuthGranted.textContent = "false";
    cloudLiveFinalAuthNext.textContent = "openclaw-cloud-consciousness-live-provider-call-operator-launch-review";
    cloudLiveFinalAuthJson.textContent = "Unable to read live provider final authorization gate.";
  }
}

async function refreshCloudConsciousnessLiveProviderCallOperatorLaunchReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-call-operator-launch-review\`);
    const summary = data.summary ?? {};
    cloudLiveLaunchReviewReady.textContent = String(Boolean(summary.ready));
    cloudLiveLaunchReviewAuthorized.textContent = String(Boolean(summary.launchAuthorized));
    cloudLiveLaunchReviewNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-plan";
    cloudLiveLaunchReviewJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-call-operator-launch-review-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Launch authorized: " + Boolean(summary.launchAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live enabled: " + Boolean(summary.liveProviderCallEnabled),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-plan"),
    ].join("\\n");
  } catch {
    cloudLiveLaunchReviewReady.textContent = "false";
    cloudLiveLaunchReviewAuthorized.textContent = "false";
    cloudLiveLaunchReviewNext.textContent = "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-plan";
    cloudLiveLaunchReviewJson.textContent = "Unable to read live provider operator launch review.";
  }
}

async function refreshCloudConsciousnessLiveProviderCallRuntimeImplementationPlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-call-runtime-implementation-plan\`);
    const summary = data.summary ?? {};
    cloudLiveRuntimeImplPlanReady.textContent = String(Boolean(summary.ready));
    cloudLiveRuntimeImplPlanImplemented.textContent = String(Boolean(summary.implementsRuntimeAdapter));
    cloudLiveRuntimeImplPlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-task";
    cloudLiveRuntimeImplPlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-plan-v0"),
      "Task Endpoint: /cloud-consciousness/live-provider-runtime-implementation-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-runtime-implementation-task-v0",
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Runtime implemented: " + Boolean(summary.implementsRuntimeAdapter),
      "SDK loaded: " + Boolean(summary.providerSdkLoaded),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-task"),
    ].join("\\n");
  } catch {
    cloudLiveRuntimeImplPlanReady.textContent = "false";
    cloudLiveRuntimeImplPlanImplemented.textContent = "false";
    cloudLiveRuntimeImplPlanNext.textContent = "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-task";
    cloudLiveRuntimeImplPlanJson.textContent = "Unable to read live provider runtime implementation plan.";
  }
}

async function refreshCloudConsciousnessLiveProviderCallRuntimeAdapterImplementation() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-call-runtime-adapter-implementation\`);
    const summary = data.summary ?? {};
    cloudLiveRuntimeAdapterImplReady.textContent = String(Boolean(summary.ready));
    cloudLiveRuntimeAdapterImplInterface.textContent = String(Boolean(summary.definesRuntimeAdapterInterface));
    cloudLiveRuntimeAdapterImplNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-implementation-task";
    cloudLiveRuntimeAdapterImplJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-implementation-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Interface defined: " + Boolean(summary.definesRuntimeAdapterInterface),
      "Runtime implemented: " + Boolean(summary.implementsRuntimeAdapter),
      "SDK loaded: " + Boolean(summary.providerSdkLoaded),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Task Endpoint: /cloud-consciousness/live-provider-runtime-adapter-implementation-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-runtime-adapter-implementation-task-v0",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-implementation-task"),
    ].join("\\n");
  } catch {
    cloudLiveRuntimeAdapterImplReady.textContent = "false";
    cloudLiveRuntimeAdapterImplInterface.textContent = "false";
    cloudLiveRuntimeAdapterImplNext.textContent = "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-implementation-task";
    cloudLiveRuntimeAdapterImplJson.textContent = "Unable to read live provider runtime adapter implementation scaffold.";
  }
}

async function refreshCloudConsciousnessLiveProviderRuntimeAdapterModuleContract() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-runtime-adapter-module-contract\`);
    const summary = data.summary ?? {};
    cloudLiveRuntimeAdapterModuleReady.textContent = String(Boolean(summary.ready));
    cloudLiveRuntimeAdapterModuleBoundary.textContent = String(Boolean(summary.moduleBoundaryDefined));
    cloudLiveRuntimeAdapterModuleNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-runtime-adapter-module-task";
    cloudLiveRuntimeAdapterModuleJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-runtime-adapter-module-contract-v0"),
      "Module: " + (data.moduleContract?.module ?? "services/openclaw-core/src/cloud-live-provider-runtime-adapter.mjs"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Module boundary: " + Boolean(summary.moduleBoundaryDefined),
      "Runtime implemented: " + Boolean(summary.implementsRuntimeAdapter),
      "SDK loaded: " + Boolean(summary.providerSdkLoaded),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Task Endpoint: /cloud-consciousness/live-provider-runtime-adapter-module-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-runtime-adapter-module-task-v0",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-runtime-adapter-module-task"),
    ].join("\\n");
  } catch {
    cloudLiveRuntimeAdapterModuleReady.textContent = "false";
    cloudLiveRuntimeAdapterModuleBoundary.textContent = "false";
    cloudLiveRuntimeAdapterModuleNext.textContent = "openclaw-cloud-consciousness-live-provider-runtime-adapter-module-task";
    cloudLiveRuntimeAdapterModuleJson.textContent = "Unable to read live provider runtime adapter module contract.";
  }
}

async function refreshCloudConsciousnessLiveProviderRequestBuilder() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-request-builder\`);
    const summary = data.summary ?? {};
    cloudLiveProviderRequestBuilderReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderRequestBuilderMessages.textContent = String(summary.messageCount ?? 0);
    cloudLiveProviderRequestBuilderNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-request-builder-task";
    cloudLiveProviderRequestBuilderJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-request-builder-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Messages: " + (summary.messageCount ?? 0),
      "Credential value included: " + Boolean(summary.credentialValueIncluded),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Task Endpoint: /cloud-consciousness/live-provider-request-builder-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-request-builder-task-v0",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-request-builder-task"),
    ].join("\\n");
  } catch {
    cloudLiveProviderRequestBuilderReady.textContent = "false";
    cloudLiveProviderRequestBuilderMessages.textContent = "0";
    cloudLiveProviderRequestBuilderNext.textContent = "openclaw-cloud-consciousness-live-provider-request-builder-task";
    cloudLiveProviderRequestBuilderJson.textContent = "Unable to read live provider request builder.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialReferenceResolver() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-reference-resolver\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialReferenceResolverReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialReferenceResolverReferenceOnly.textContent = String(Boolean(summary.referenceOnly));
    cloudLiveProviderCredentialReferenceResolverNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-reference-resolver-task";
    cloudLiveProviderCredentialReferenceResolverJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-reference-resolver-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Credential reference present: " + Boolean(summary.credentialReferencePresent),
      "Valid reference: " + Boolean(summary.validReference),
      "Reference only: " + Boolean(summary.referenceOnly),
      "Credential value included: " + Boolean(summary.credentialValueIncluded),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Task Endpoint: /cloud-consciousness/live-provider-credential-reference-resolver-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-credential-reference-resolver-task-v0",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-reference-resolver-task"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialReferenceResolverReady.textContent = "false";
    cloudLiveProviderCredentialReferenceResolverReferenceOnly.textContent = "false";
    cloudLiveProviderCredentialReferenceResolverNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-reference-resolver-task";
    cloudLiveProviderCredentialReferenceResolverJson.textContent = "Unable to read live provider credential reference resolver.";
  }
}

async function refreshCloudConsciousnessLiveProviderNoNetworkSender() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-no-network-sender\`);
    const summary = data.summary ?? {};
    cloudLiveProviderNoNetworkSenderReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderNoNetworkSenderDispatch.textContent = String(Boolean(summary.dispatchDeferred));
    cloudLiveProviderNoNetworkSenderNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-send-provider-request-task";
    cloudLiveProviderNoNetworkSenderJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-send-provider-request-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Dispatch deferred: " + Boolean(summary.dispatchDeferred),
      "Reference only: " + Boolean(summary.referenceOnly),
      "Credential value included: " + Boolean(summary.credentialValueIncluded),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Task Endpoint: /cloud-consciousness/live-provider-no-network-sender-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-no-network-sender-task-v0",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-send-provider-request-task"),
    ].join("\\n");
  } catch {
    cloudLiveProviderNoNetworkSenderReady.textContent = "false";
    cloudLiveProviderNoNetworkSenderDispatch.textContent = "false";
    cloudLiveProviderNoNetworkSenderNext.textContent = "openclaw-cloud-consciousness-live-provider-send-provider-request-task";
    cloudLiveProviderNoNetworkSenderJson.textContent = "Unable to read live provider no-network sender.";
  }
}

async function refreshCloudConsciousnessLiveProviderEgressTranscriptRecorder() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-egress-transcript-recorder\`);
    const summary = data.summary ?? {};
    cloudLiveProviderEgressTranscriptRecorderReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderEgressTranscriptRecorderLocal.textContent = String(Boolean(summary.localOnly));
    cloudLiveProviderEgressTranscriptRecorderNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-egress-transcript-recorder-task";
    cloudLiveProviderEgressTranscriptRecorderJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-egress-transcript-recorder-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Transcript recorded: " + Boolean(summary.transcriptRecorded),
      "Local only: " + Boolean(summary.localOnly),
      "Dispatch deferred: " + Boolean(summary.dispatchDeferred),
      "Reference only: " + Boolean(summary.referenceOnly),
      "Credential value included: " + Boolean(summary.credentialValueIncluded),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Task Endpoint: /cloud-consciousness/live-provider-egress-transcript-recorder-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-egress-transcript-recorder-task-v0",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-egress-transcript-recorder-task"),
    ].join("\\n");
  } catch {
    cloudLiveProviderEgressTranscriptRecorderReady.textContent = "false";
    cloudLiveProviderEgressTranscriptRecorderLocal.textContent = "false";
    cloudLiveProviderEgressTranscriptRecorderNext.textContent = "openclaw-cloud-consciousness-live-provider-egress-transcript-recorder-task";
    cloudLiveProviderEgressTranscriptRecorderJson.textContent = "Unable to read live provider egress transcript recorder.";
  }
}

async function refreshCloudConsciousnessLiveProviderResponseVerifier() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-response-verifier\`);
    const summary = data.summary ?? {};
    cloudLiveProviderResponseVerifierReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderResponseVerifierVerified.textContent = String(Boolean(summary.responseVerified));
    cloudLiveProviderResponseVerifierNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-response-verifier-task";
    cloudLiveProviderResponseVerifierJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-response-verifier-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Response verified: " + Boolean(summary.responseVerified),
      "Local only: " + Boolean(summary.localOnly),
      "Response source: " + (summary.responseSource ?? "local_rehearsal_readback"),
      "Safe readback: " + Boolean(summary.safeReadback),
      "Transcript deferred: " + Boolean(summary.transcriptDeferred),
      "Credential value included: " + Boolean(summary.credentialValueIncluded),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Task Endpoint: /cloud-consciousness/live-provider-response-verifier-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-response-verifier-task-v0",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-response-verifier-task"),
    ].join("\\n");
  } catch {
    cloudLiveProviderResponseVerifierReady.textContent = "false";
    cloudLiveProviderResponseVerifierVerified.textContent = "false";
    cloudLiveProviderResponseVerifierNext.textContent = "openclaw-cloud-consciousness-live-provider-response-verifier-task";
    cloudLiveProviderResponseVerifierJson.textContent = "Unable to read live provider response verifier.";
  }
}

async function refreshCloudConsciousnessLiveProviderRollbackNote() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-rollback-note\`);
    const summary = data.summary ?? {};
    cloudLiveProviderRollbackNoteReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderRollbackNoteExecuted.textContent = String(Boolean(summary.rollbackExecuted));
    cloudLiveProviderRollbackNoteNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-rollback-note-task";
    cloudLiveProviderRollbackNoteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-rollback-note-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Rollback note ready: " + Boolean(summary.rollbackNoteReady),
      "Local only: " + Boolean(summary.localOnly),
      "Rollback required: " + Boolean(summary.rollbackRequired),
      "Rollback executed: " + Boolean(summary.rollbackExecuted),
      "Rollback command created: " + Boolean(summary.rollbackCommandCreated),
      "Host mutation: " + Boolean(summary.hostMutation),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Task Endpoint: /cloud-consciousness/live-provider-rollback-note-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-rollback-note-task-v0",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-rollback-note-task"),
    ].join("\\n");
  } catch {
    cloudLiveProviderRollbackNoteReady.textContent = "false";
    cloudLiveProviderRollbackNoteExecuted.textContent = "false";
    cloudLiveProviderRollbackNoteNext.textContent = "openclaw-cloud-consciousness-live-provider-rollback-note-task";
    cloudLiveProviderRollbackNoteJson.textContent = "Unable to read live provider rollback note.";
  }
}

async function refreshCloudConsciousnessLiveProviderRuntimeAdapterCompletion() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-runtime-adapter-completion\`);
    const summary = data.summary ?? {};
    cloudLiveProviderRuntimeAdapterCompletionReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderRuntimeAdapterCompletionMethods.textContent = \`\${summary.readyMethodCount ?? 0}/\${summary.methodCount ?? 0}\`;
    cloudLiveProviderRuntimeAdapterCompletionNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-task";
    cloudLiveProviderRuntimeAdapterCompletionJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-runtime-adapter-completion-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Methods: " + (summary.readyMethodCount ?? 0) + "/" + (summary.methodCount ?? 0),
      "Adapter complete: " + Boolean(summary.localRuntimeAdapterComplete),
      "Method table closed: " + Boolean(summary.adapterMethodTableClosed),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Rollback executed: " + Boolean(summary.rollbackExecuted),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Task Endpoint: /cloud-consciousness/live-provider-runtime-adapter-closure-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-task-v0",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-task"),
    ].join("\\n");
  } catch {
    cloudLiveProviderRuntimeAdapterCompletionReady.textContent = "false";
    cloudLiveProviderRuntimeAdapterCompletionMethods.textContent = "0/0";
    cloudLiveProviderRuntimeAdapterCompletionNext.textContent = "openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-task";
    cloudLiveProviderRuntimeAdapterCompletionJson.textContent = "Unable to read live provider runtime adapter completion.";
  }
}

async function refreshCloudConsciousnessLiveProviderRuntimeAdapterClosure() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-runtime-adapter-closure-exit\`);
    const summary = data.summary ?? {};
    cloudLiveProviderRuntimeAdapterClosureComplete.textContent = String(Boolean(summary.complete));
    cloudLiveProviderRuntimeAdapterClosurePercent.textContent = String(summary.completionPercent ?? 0);
    cloudLiveProviderRuntimeAdapterClosureNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-real-launch-route-review";
    cloudLiveProviderRuntimeAdapterClosureJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-runtime-adapter-closure-exit-v0"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Methods: " + (summary.implementedMethodCount ?? 0) + "/" + (summary.methodCount ?? 0),
      "Adapter complete: " + Boolean(summary.localRuntimeAdapterComplete),
      "Method table closed: " + Boolean(summary.adapterMethodTableClosed),
      "Creates approval: " + Boolean(summary.createsApproval),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Rollback executed: " + Boolean(summary.rollbackExecuted),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-real-launch-route-review"),
    ].join("\\n");
  } catch {
    cloudLiveProviderRuntimeAdapterClosureComplete.textContent = "false";
    cloudLiveProviderRuntimeAdapterClosurePercent.textContent = "0";
    cloudLiveProviderRuntimeAdapterClosureNext.textContent = "openclaw-cloud-consciousness-live-provider-real-launch-route-review";
    cloudLiveProviderRuntimeAdapterClosureJson.textContent = "Unable to read live provider runtime adapter closure.";
  }
}

`;
