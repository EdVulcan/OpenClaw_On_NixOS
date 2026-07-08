export const observerClientCloudContextRefreshersScript = `async function refreshCloudConsciousnessContextReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/context-review\`);
    const summary = data.summary ?? {};
    cloudContextReviewReady.textContent = String(Boolean(summary.ready));
    cloudContextReviewCall.textContent = String(Boolean(summary.callsCloudModel));
    cloudContextReviewNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-envelope-schema";
    cloudContextReviewJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-context-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Prepare the first cloud-consciousness context without transmitting it."),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    cloudContextReviewReady.textContent = "false";
    cloudContextReviewCall.textContent = "false";
    cloudContextReviewNext.textContent = "openclaw-cloud-consciousness-envelope-schema";
    cloudContextReviewJson.textContent = "Unable to read cloud consciousness context review.";
  }
}

async function refreshCloudConsciousnessEnvelopeSchema() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/envelope-schema\`);
    const summary = data.summary ?? {};
    cloudEnvelopeSchemaReady.textContent = String(Boolean(summary.ready));
    cloudEnvelopeSchemaFields.textContent = String(summary.requiredFieldCount ?? 0);
    cloudEnvelopeSchemaTransmission.textContent = String(Boolean(summary.transmitsExternally));
    cloudEnvelopeSchemaJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-envelope-schema-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Schema: " + (data.schema?.id ?? "unknown"),
      "Fields: " + ((data.schema?.requiredFields ?? []).join(", ") || "none"),
      "Transmission: " + Boolean(summary.transmitsExternally),
    ].join("\\n");
  } catch {
    cloudEnvelopeSchemaReady.textContent = "false";
    cloudEnvelopeSchemaFields.textContent = "0";
    cloudEnvelopeSchemaTransmission.textContent = "false";
    cloudEnvelopeSchemaJson.textContent = "Unable to read cloud consciousness envelope schema.";
  }
}

async function refreshCloudConsciousnessContextPackage() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/context-package\`);
    const summary = data.summary ?? {};
    cloudContextPackageReady.textContent = String(Boolean(summary.ready));
    cloudContextPackageMemory.textContent = String(summary.memoryRecordCount ?? 0);
    cloudContextPackageSecrets.textContent = String(Boolean(summary.includesSecrets));
    cloudContextPackageJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-context-package-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Package: " + (data.package?.id ?? "unknown"),
      "Memory Records: " + (summary.memoryRecordCount ?? 0),
      "Transmitted: " + Boolean(summary.transmitsExternally),
    ].join("\\n");
  } catch {
    cloudContextPackageReady.textContent = "false";
    cloudContextPackageMemory.textContent = "0";
    cloudContextPackageSecrets.textContent = "false";
    cloudContextPackageJson.textContent = "Unable to read cloud consciousness context package.";
  }
}

async function refreshCloudConsciousnessRedactionReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/redaction-review\`);
    const summary = data.summary ?? {};
    cloudRedactionReady.textContent = String(Boolean(summary.ready));
    cloudRedactionRejected.textContent = String(summary.rejectedContentCount ?? 0);
    cloudRedactionSecrets.textContent = String(Boolean(summary.includesSecrets));
    cloudRedactionJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-redaction-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Policy: " + (data.redaction?.policy ?? "unknown"),
      "Rejected: " + ((data.redaction?.rejectedContent ?? []).join(", ") || "none"),
      "Secrets: " + Boolean(summary.includesSecrets),
    ].join("\\n");
  } catch {
    cloudRedactionReady.textContent = "false";
    cloudRedactionRejected.textContent = "0";
    cloudRedactionSecrets.textContent = "false";
    cloudRedactionJson.textContent = "Unable to read cloud consciousness redaction review.";
  }
}

async function refreshCloudConsciousnessTransmissionRouteReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/transmission-route-review\`);
    const summary = data.summary ?? {};
    cloudRouteReady.textContent = String(Boolean(summary.ready));
    cloudRouteSelected.textContent = summary.selectedSlice ?? "unknown";
    cloudRouteCall.textContent = String(Boolean(summary.callsCloudModel));
    cloudRouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-transmission-route-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Selected: " + (summary.selectedSlice ?? "unknown"),
      "Deferred: " + (summary.deferredSlice ?? "unknown"),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    cloudRouteReady.textContent = "false";
    cloudRouteSelected.textContent = "unknown";
    cloudRouteCall.textContent = "false";
    cloudRouteJson.textContent = "Unable to read cloud consciousness transmission route review.";
  }
}

async function refreshCloudConsciousnessHandoffTask() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/transmission-route-review\`);
    const summary = data.summary ?? {};
    cloudHandoffTaskReady.textContent = String(Boolean(summary.ready));
    cloudHandoffTaskCreates.textContent = "true";
    cloudHandoffTaskApproval.textContent = data.decision?.canCreateTask === true ? "required" : "blocked";
    cloudHandoffTaskJson.textContent = [
      "Registry: openclaw-cloud-consciousness-handoff-task-v0",
      "Route: " + (data.registry ?? "openclaw-cloud-consciousness-transmission-route-review-v0"),
      "Ready: " + Boolean(summary.ready),
      "Creates Task: true",
      "Provider Call: deferred",
    ].join("\\n");
  } catch {
    cloudHandoffTaskReady.textContent = "false";
    cloudHandoffTaskCreates.textContent = "false";
    cloudHandoffTaskApproval.textContent = "unknown";
    cloudHandoffTaskJson.textContent = "Unable to read cloud consciousness handoff task boundary.";
  }
}

async function refreshCloudConsciousnessApprovedHandoff() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/handoff-readback\`);
    const summary = data.summary ?? {};
    cloudApprovedHandoffRecords.textContent = String(summary.recordCount ?? 0);
    cloudApprovedHandoffLatest.textContent = summary.latestRecordId ?? "none";
    cloudApprovedHandoffTransmitted.textContent = String(Boolean(summary.transmitsExternally));
    cloudApprovedHandoffJson.textContent = [
      "Registry: openclaw-cloud-consciousness-approved-handoff-v0",
      "Readback: " + (data.registry ?? "openclaw-cloud-consciousness-handoff-readback-v0"),
      "Records: " + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Transmitted: " + Boolean(summary.transmitsExternally),
    ].join("\\n");
  } catch {
    cloudApprovedHandoffRecords.textContent = "0";
    cloudApprovedHandoffLatest.textContent = "none";
    cloudApprovedHandoffTransmitted.textContent = "false";
    cloudApprovedHandoffJson.textContent = "No approved local handoff evidence yet.";
  }
}

async function refreshCloudConsciousnessHandoffReadback() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/handoff-readback\`);
    const summary = data.summary ?? {};
    cloudHandoffReadbackReady.textContent = String(Boolean(summary.ready));
    cloudHandoffReadbackRecords.textContent = String(summary.recordCount ?? 0);
    cloudHandoffReadbackHash.textContent = summary.latestContentHash ?? "none";
    cloudHandoffReadbackJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-handoff-readback-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " records=" + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Hash: " + (summary.latestContentHash ?? "none"),
    ].join("\\n");
  } catch {
    cloudHandoffReadbackReady.textContent = "false";
    cloudHandoffReadbackRecords.textContent = "0";
    cloudHandoffReadbackHash.textContent = "none";
    cloudHandoffReadbackJson.textContent = "Unable to read cloud consciousness handoff readback.";
  }
}

async function refreshCloudConsciousnessExit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/exit\`);
    const summary = data.summary ?? {};
    cloudExitComplete.textContent = String(Boolean(summary.complete));
    cloudExitPercent.textContent = String(summary.completionPercent ?? 0);
    cloudExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-provider-adapter-plan";
    cloudExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Records: " + (summary.recordCount ?? 0),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-provider-adapter-plan"),
    ].join("\\n");
  } catch {
    cloudExitComplete.textContent = "false";
    cloudExitPercent.textContent = "0";
    cloudExitNext.textContent = "openclaw-cloud-consciousness-provider-adapter-plan";
    cloudExitJson.textContent = "Unable to read cloud consciousness exit gate.";
  }
}

async function refreshCloudConsciousnessProviderAdapterPlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-adapter-plan\`);
    const summary = data.summary ?? {};
    cloudProviderPlanReady.textContent = String(Boolean(summary.ready));
    cloudProviderPlanCall.textContent = String(Boolean(summary.callsCloudModel));
    cloudProviderPlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-provider-contract";
    cloudProviderPlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-provider-adapter-plan-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Define and dry-run a cloud-consciousness provider adapter without external transmission."),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    cloudProviderPlanReady.textContent = "false";
    cloudProviderPlanCall.textContent = "false";
    cloudProviderPlanNext.textContent = "openclaw-cloud-consciousness-provider-contract";
    cloudProviderPlanJson.textContent = "Unable to read cloud consciousness provider adapter plan.";
  }
}

async function refreshCloudConsciousnessProviderContract() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-contract\`);
    const summary = data.summary ?? {};
    cloudProviderContractReady.textContent = String(Boolean(summary.ready));
    cloudProviderContractMethods.textContent = String(summary.requiredMethodCount ?? 0);
    cloudProviderContractSdk.textContent = String(Boolean(summary.providerSdkLoaded));
    cloudProviderContractJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-provider-contract-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Contract: " + (data.contract?.id ?? "unknown"),
      "Methods: " + ((data.contract?.requiredMethods ?? []).join(", ") || "none"),
      "SDK Loaded: " + Boolean(summary.providerSdkLoaded),
    ].join("\\n");
  } catch {
    cloudProviderContractReady.textContent = "false";
    cloudProviderContractMethods.textContent = "0";
    cloudProviderContractSdk.textContent = "false";
    cloudProviderContractJson.textContent = "Unable to read cloud consciousness provider contract.";
  }
}

async function refreshCloudConsciousnessProviderRequestEnvelope() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-request-envelope\`);
    const summary = data.summary ?? {};
    cloudProviderEnvelopeReady.textContent = String(Boolean(summary.ready));
    cloudProviderEnvelopeSource.textContent = summary.sourceHandoffRecordId ?? "none";
    cloudProviderEnvelopeSecrets.textContent = String(Boolean(summary.providerCredentialIncluded));
    cloudProviderEnvelopeJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-provider-request-envelope-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Envelope: " + (data.envelope?.id ?? "unknown"),
      "Source: " + (summary.sourceHandoffRecordId ?? "none"),
      "Transmitted: " + Boolean(summary.transmitsExternally),
    ].join("\\n");
  } catch {
    cloudProviderEnvelopeReady.textContent = "false";
    cloudProviderEnvelopeSource.textContent = "none";
    cloudProviderEnvelopeSecrets.textContent = "false";
    cloudProviderEnvelopeJson.textContent = "Unable to read cloud consciousness provider request envelope.";
  }
}

async function refreshCloudConsciousnessProviderDryRunRouteReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-dry-run-route-review\`);
    const summary = data.summary ?? {};
    cloudProviderRouteReady.textContent = String(Boolean(summary.ready));
    cloudProviderRouteSelected.textContent = summary.selectedSlice ?? "unknown";
    cloudProviderRouteCall.textContent = String(Boolean(summary.callsCloudModel));
    cloudProviderRouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-provider-dry-run-route-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Selected: " + (summary.selectedSlice ?? "unknown"),
      "Deferred: " + (summary.deferredSlice ?? "unknown"),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    cloudProviderRouteReady.textContent = "false";
    cloudProviderRouteSelected.textContent = "unknown";
    cloudProviderRouteCall.textContent = "false";
    cloudProviderRouteJson.textContent = "Unable to read cloud consciousness provider dry-run route review.";
  }
}

async function refreshCloudConsciousnessProviderDryRunTask() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-dry-run-route-review\`);
    const summary = data.summary ?? {};
    cloudProviderTaskReady.textContent = String(Boolean(summary.ready));
    cloudProviderTaskCreates.textContent = "true";
    cloudProviderTaskApproval.textContent = data.decision?.canCreateTask === true ? "required" : "blocked";
    cloudProviderTaskJson.textContent = [
      "Registry: openclaw-cloud-consciousness-provider-dry-run-task-v0",
      "Route: " + (data.registry ?? "openclaw-cloud-consciousness-provider-dry-run-route-review-v0"),
      "Ready: " + Boolean(summary.ready),
      "Creates Task: true",
      "Provider Call: dry-run only",
    ].join("\\n");
  } catch {
    cloudProviderTaskReady.textContent = "false";
    cloudProviderTaskCreates.textContent = "false";
    cloudProviderTaskApproval.textContent = "unknown";
    cloudProviderTaskJson.textContent = "Unable to read cloud consciousness provider dry-run task boundary.";
  }
}

async function refreshCloudConsciousnessApprovedProviderDryRun() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-dry-run-readback\`);
    const summary = data.summary ?? {};
    cloudProviderApprovedRecords.textContent = String(summary.recordCount ?? 0);
    cloudProviderApprovedLatest.textContent = summary.latestRecordId ?? "none";
    cloudProviderApprovedTransmitted.textContent = String(Boolean(summary.transmitsExternally));
    cloudProviderApprovedJson.textContent = [
      "Registry: openclaw-cloud-consciousness-approved-provider-dry-run-v0",
      "Readback: " + (data.registry ?? "openclaw-cloud-consciousness-provider-dry-run-readback-v0"),
      "Records: " + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Transmitted: " + Boolean(summary.transmitsExternally),
    ].join("\\n");
  } catch {
    cloudProviderApprovedRecords.textContent = "0";
    cloudProviderApprovedLatest.textContent = "none";
    cloudProviderApprovedTransmitted.textContent = "false";
    cloudProviderApprovedJson.textContent = "No approved provider dry-run evidence yet.";
  }
}

async function refreshCloudConsciousnessProviderDryRunReadback() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-dry-run-readback\`);
    const summary = data.summary ?? {};
    cloudProviderReadbackReady.textContent = String(Boolean(summary.ready));
    cloudProviderReadbackRecords.textContent = String(summary.recordCount ?? 0);
    cloudProviderReadbackHash.textContent = summary.latestContentHash ?? "none";
    cloudProviderReadbackJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-provider-dry-run-readback-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " records=" + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Hash: " + (summary.latestContentHash ?? "none"),
    ].join("\\n");
  } catch {
    cloudProviderReadbackReady.textContent = "false";
    cloudProviderReadbackRecords.textContent = "0";
    cloudProviderReadbackHash.textContent = "none";
    cloudProviderReadbackJson.textContent = "Unable to read cloud consciousness provider dry-run readback.";
  }
}

async function refreshCloudConsciousnessProviderAdapterExit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-adapter-exit\`);
    const summary = data.summary ?? {};
    cloudProviderExitComplete.textContent = String(Boolean(summary.complete));
    cloudProviderExitPercent.textContent = String(summary.completionPercent ?? 0);
    cloudProviderExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-real-provider-call-plan";
    cloudProviderExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-provider-adapter-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Records: " + (summary.recordCount ?? 0),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-real-provider-call-plan"),
    ].join("\\n");
  } catch {
    cloudProviderExitComplete.textContent = "false";
    cloudProviderExitPercent.textContent = "0";
    cloudProviderExitNext.textContent = "openclaw-cloud-consciousness-real-provider-call-plan";
    cloudProviderExitJson.textContent = "Unable to read cloud consciousness provider adapter exit gate.";
  }
}

async function refreshCloudConsciousnessRealProviderCallPlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/real-provider-call-plan\`);
    const summary = data.summary ?? {};
    cloudRealProviderPlanReady.textContent = String(Boolean(summary.ready));
    cloudRealProviderPlanCall.textContent = String(Boolean(summary.callsCloudModel));
    cloudRealProviderPlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-provider-egress-contract";
    cloudRealProviderPlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-real-provider-call-plan-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Prepare the real provider-call path with a local response rehearsal, without external transmission."),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    cloudRealProviderPlanReady.textContent = "false";
    cloudRealProviderPlanCall.textContent = "false";
    cloudRealProviderPlanNext.textContent = "openclaw-cloud-consciousness-provider-egress-contract";
    cloudRealProviderPlanJson.textContent = "Unable to read real provider call plan.";
  }
}

async function refreshCloudConsciousnessProviderEgressContract() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-egress-contract\`);
    const summary = data.summary ?? {};
    cloudEgressContractReady.textContent = String(Boolean(summary.ready));
    cloudEgressContractPreflights.textContent = String(summary.requiredPreflightCount ?? 0);
    cloudEgressContractTransmits.textContent = String(Boolean(summary.transmitsExternally));
    cloudEgressContractJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-provider-egress-contract-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Contract: " + (data.contract?.id ?? "unknown"),
      "Required: " + ((data.contract?.requiredBeforeLiveCall ?? []).join(", ") || "none"),
      "Transmits: " + Boolean(summary.transmitsExternally),
    ].join("\\n");
  } catch {
    cloudEgressContractReady.textContent = "false";
    cloudEgressContractPreflights.textContent = "0";
    cloudEgressContractTransmits.textContent = "false";
    cloudEgressContractJson.textContent = "Unable to read provider egress contract.";
  }
}

async function refreshCloudConsciousnessProviderCredentialPreflight() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-credential-preflight\`);
    const summary = data.summary ?? {};
    cloudCredentialPreflightReady.textContent = String(Boolean(summary.ready));
    cloudCredentialPreflightRead.textContent = String(Boolean(summary.providerCredentialRead));
    cloudCredentialPreflightLive.textContent = String(Boolean(data.preflight?.liveCallPermitted));
    cloudCredentialPreflightJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-provider-credential-preflight-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Endpoint Env: " + (data.preflight?.endpointEnv ?? "unknown"),
      "Credential Env: " + (data.preflight?.credentialEnv ?? "unknown"),
      "Credential Read: " + Boolean(summary.providerCredentialRead),
    ].join("\\n");
  } catch {
    cloudCredentialPreflightReady.textContent = "false";
    cloudCredentialPreflightRead.textContent = "false";
    cloudCredentialPreflightLive.textContent = "false";
    cloudCredentialPreflightJson.textContent = "Unable to read provider credential preflight.";
  }
}

async function refreshCloudConsciousnessProviderRequestRedactionReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-request-redaction-review\`);
    const summary = data.summary ?? {};
    cloudRequestRedactionReady.textContent = String(Boolean(summary.ready));
    cloudRequestRedactionRejected.textContent = String(summary.rejectedContentCount ?? 0);
    cloudRequestRedactionSecrets.textContent = String(Boolean(summary.includesSecrets));
    cloudRequestRedactionJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-provider-request-redaction-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Policy: " + (data.redaction?.policy ?? "unknown"),
      "Rejected: " + ((data.redaction?.rejectedContent ?? []).join(", ") || "none"),
      "Secrets: " + Boolean(summary.includesSecrets),
    ].join("\\n");
  } catch {
    cloudRequestRedactionReady.textContent = "false";
    cloudRequestRedactionRejected.textContent = "0";
    cloudRequestRedactionSecrets.textContent = "false";
    cloudRequestRedactionJson.textContent = "Unable to read provider request redaction review.";
  }
}

async function refreshCloudConsciousnessRealProviderCallRouteReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/real-provider-call-route-review\`);
    const summary = data.summary ?? {};
    cloudRealProviderRouteReady.textContent = String(Boolean(summary.ready));
    cloudRealProviderRouteSelected.textContent = summary.selectedSlice ?? "unknown";
    cloudRealProviderRouteCall.textContent = String(Boolean(summary.callsCloudModel));
    cloudRealProviderRouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-real-provider-call-route-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Selected: " + (summary.selectedSlice ?? "unknown"),
      "Deferred: " + (summary.deferredSlice ?? "unknown"),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    cloudRealProviderRouteReady.textContent = "false";
    cloudRealProviderRouteSelected.textContent = "unknown";
    cloudRealProviderRouteCall.textContent = "false";
    cloudRealProviderRouteJson.textContent = "Unable to read real provider call route review.";
  }
}

async function refreshCloudConsciousnessRealProviderCallTask() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/real-provider-call-route-review\`);
    const summary = data.summary ?? {};
    cloudRealProviderTaskReady.textContent = String(Boolean(summary.ready));
    cloudRealProviderTaskCreates.textContent = "true";
    cloudRealProviderTaskApproval.textContent = data.decision?.canCreateTask === true ? "required" : "blocked";
    cloudRealProviderTaskJson.textContent = [
      "Registry: openclaw-cloud-consciousness-real-provider-call-task-v0",
      "Route: " + (data.registry ?? "openclaw-cloud-consciousness-real-provider-call-route-review-v0"),
      "Ready: " + Boolean(summary.ready),
      "Creates Task: true",
      "Provider Call: rehearsal only",
    ].join("\\n");
  } catch {
    cloudRealProviderTaskReady.textContent = "false";
    cloudRealProviderTaskCreates.textContent = "false";
    cloudRealProviderTaskApproval.textContent = "unknown";
    cloudRealProviderTaskJson.textContent = "Unable to read real provider call task boundary.";
  }
}

async function refreshCloudConsciousnessApprovedProviderCallRehearsal() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-response-readback\`);
    const summary = data.summary ?? {};
    cloudCallRehearsalRecords.textContent = String(summary.recordCount ?? 0);
    cloudCallRehearsalLatest.textContent = summary.latestRecordId ?? "none";
    cloudCallRehearsalTransmitted.textContent = String(Boolean(summary.transmitsExternally));
    cloudCallRehearsalJson.textContent = [
      "Registry: openclaw-cloud-consciousness-approved-provider-call-rehearsal-v0",
      "Readback: " + (data.registry ?? "openclaw-cloud-consciousness-provider-response-readback-v0"),
      "Records: " + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Transmitted: " + Boolean(summary.transmitsExternally),
    ].join("\\n");
  } catch {
    cloudCallRehearsalRecords.textContent = "0";
    cloudCallRehearsalLatest.textContent = "none";
    cloudCallRehearsalTransmitted.textContent = "false";
    cloudCallRehearsalJson.textContent = "No approved provider call rehearsal evidence yet.";
  }
}

async function refreshCloudConsciousnessProviderResponseReadback() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/provider-response-readback\`);
    const summary = data.summary ?? {};
    cloudResponseReadbackReady.textContent = String(Boolean(summary.ready));
    cloudResponseReadbackRecords.textContent = String(summary.recordCount ?? 0);
    cloudResponseReadbackHash.textContent = summary.latestContentHash ?? "none";
    cloudResponseReadbackJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-provider-response-readback-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " records=" + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Hash: " + (summary.latestContentHash ?? "none"),
    ].join("\\n");
  } catch {
    cloudResponseReadbackReady.textContent = "false";
    cloudResponseReadbackRecords.textContent = "0";
    cloudResponseReadbackHash.textContent = "none";
    cloudResponseReadbackJson.textContent = "Unable to read provider response readback.";
  }
}

async function refreshCloudConsciousnessRealProviderCallExit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/real-provider-call-exit\`);
    const summary = data.summary ?? {};
    cloudRealProviderExitComplete.textContent = String(Boolean(summary.complete));
    cloudRealProviderExitPercent.textContent = String(summary.completionPercent ?? 0);
    cloudRealProviderExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-runbook";
    cloudRealProviderExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-real-provider-call-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Records: " + (summary.recordCount ?? 0),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-call-runbook"),
    ].join("\\n");
  } catch {
    cloudRealProviderExitComplete.textContent = "false";
    cloudRealProviderExitPercent.textContent = "0";
    cloudRealProviderExitNext.textContent = "openclaw-cloud-consciousness-live-provider-call-runbook";
    cloudRealProviderExitJson.textContent = "Unable to read real provider call exit gate.";
  }
}

`;
