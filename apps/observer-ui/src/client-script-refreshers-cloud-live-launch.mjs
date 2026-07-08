export const observerClientCloudLiveLaunchRefreshersScript = `async function refreshCloudConsciousnessLiveProviderRealLaunchRouteReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-real-launch-route-review\`);
    const summary = data.summary ?? {};
    cloudLiveProviderRealLaunchRouteReviewReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderRealLaunchRouteReviewSelected.textContent = summary.selectedSlice ?? "openclaw-cloud-consciousness-live-provider-real-launch-task";
    cloudLiveProviderRealLaunchRouteReviewLaunch.textContent = summary.launchAuthorized === true ? "authorized" : "not authorized";
    cloudLiveProviderRealLaunchRouteReviewJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-real-launch-route-review-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Selected: " + (summary.selectedSlice ?? "openclaw-cloud-consciousness-live-provider-real-launch-task"),
      "Adapter complete: " + Boolean(summary.localRuntimeAdapterComplete),
      "Method table closed: " + Boolean(summary.adapterMethodTableClosed),
      "Launch authorized: " + Boolean(summary.launchAuthorized),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Rollback executed: " + Boolean(summary.rollbackExecuted),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Task Endpoint: /cloud-consciousness/live-provider-real-launch-tasks",
      "Task Registry: openclaw-cloud-consciousness-live-provider-real-launch-task-v0",
      "Deferred Status: real_launch_deferred_after_approval",
      "Execution Preflight: openclaw-cloud-consciousness-live-provider-real-launch-execution-preflight",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-real-launch-task"),
    ].join("\\n");
  } catch {
    cloudLiveProviderRealLaunchRouteReviewReady.textContent = "false";
    cloudLiveProviderRealLaunchRouteReviewSelected.textContent = "openclaw-cloud-consciousness-live-provider-real-launch-task";
    cloudLiveProviderRealLaunchRouteReviewLaunch.textContent = "not authorized";
    cloudLiveProviderRealLaunchRouteReviewJson.textContent = "Unable to read live provider real launch route review.";
  }
}

async function refreshCloudConsciousnessLiveProviderRealLaunchExecutionPreflight() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-real-launch-execution-preflight\`);
    const summary = data.summary ?? {};
    cloudLiveProviderRealLaunchExecutionPreflightReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderRealLaunchExecutionPreflightSource.textContent = summary.sourceTaskId ?? "none";
    cloudLiveProviderRealLaunchExecutionPreflightLaunch.textContent = summary.launchAuthorized === true ? "authorized" : "not authorized";
    cloudLiveProviderRealLaunchExecutionPreflightJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-real-launch-execution-preflight-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Recorded: " + Boolean(summary.executionPreflightRecorded),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Approved deferred evidence: " + Boolean(summary.approvedDeferredEvidenceFound),
      "Launch authorized: " + Boolean(summary.launchAuthorized),
      "Launch executed: " + Boolean(summary.launchExecuted),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Rollback executed: " + Boolean(summary.rollbackExecuted),
      "Host mutation: " + Boolean(summary.hostMutation),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Record Endpoint: /cloud-consciousness/live-provider-real-launch-execution-preflight",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-gate"),
    ].join("\\n");
  } catch {
    cloudLiveProviderRealLaunchExecutionPreflightReady.textContent = "false";
    cloudLiveProviderRealLaunchExecutionPreflightSource.textContent = "none";
    cloudLiveProviderRealLaunchExecutionPreflightLaunch.textContent = "not authorized";
    cloudLiveProviderRealLaunchExecutionPreflightJson.textContent = "Unable to read live provider real launch execution preflight.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueAccessGate() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-access-gate\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueAccessGateReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueAccessGateCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueAccessGateNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-endpoint-network-egress-gate";
    cloudLiveProviderCredentialValueAccessGateJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-gate-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Recorded: " + Boolean(summary.credentialValueAccessGateRecorded),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Execution preflight found: " + Boolean(summary.executionPreflightFound),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential access denied: " + Boolean(summary.credentialValueAccessDenied),
      "Credential value included: " + Boolean(summary.credentialValueIncluded),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Credential value exposed: " + Boolean(summary.credentialValueExposed),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Rollback executed: " + Boolean(summary.rollbackExecuted),
      "Host mutation: " + Boolean(summary.hostMutation),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Record Endpoint: /cloud-consciousness/live-provider-credential-value-access-gate",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-endpoint-network-egress-gate"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueAccessGateReady.textContent = "false";
    cloudLiveProviderCredentialValueAccessGateCredential.textContent = "not read";
    cloudLiveProviderCredentialValueAccessGateNext.textContent = "openclaw-cloud-consciousness-live-provider-endpoint-network-egress-gate";
    cloudLiveProviderCredentialValueAccessGateJson.textContent = "Unable to read live provider credential value access gate.";
  }
}

async function refreshCloudConsciousnessLiveProviderEndpointNetworkEgressGate() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-endpoint-network-egress-gate\`);
    const summary = data.summary ?? {};
    cloudLiveProviderEndpointNetworkEgressGateReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderEndpointNetworkEgressGateEndpoint.textContent = summary.endpointContacted === true ? "contacted" : "not contacted";
    cloudLiveProviderEndpointNetworkEgressGateNetwork.textContent = summary.networkEgress === true ? "egress" : "no egress";
    cloudLiveProviderEndpointNetworkEgressGateNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-egress-execution-route-task-preflight";
    cloudLiveProviderEndpointNetworkEgressGateJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-endpoint-network-egress-gate-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Recorded: " + Boolean(summary.endpointNetworkEgressGateRecorded),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Credential value access gate found: " + Boolean(summary.credentialValueAccessGateFound),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential access denied: " + Boolean(summary.credentialValueAccessDenied),
      "Endpoint egress authorized: " + Boolean(summary.endpointNetworkEgressAuthorized),
      "Endpoint egress denied: " + Boolean(summary.endpointNetworkEgressDenied),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Rollback executed: " + Boolean(summary.rollbackExecuted),
      "Host mutation: " + Boolean(summary.hostMutation),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Record Endpoint: /cloud-consciousness/live-provider-endpoint-network-egress-gate",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-egress-execution-route-task-preflight"),
    ].join("\\n");
  } catch {
    cloudLiveProviderEndpointNetworkEgressGateReady.textContent = "false";
    cloudLiveProviderEndpointNetworkEgressGateEndpoint.textContent = "not contacted";
    cloudLiveProviderEndpointNetworkEgressGateNetwork.textContent = "no egress";
    cloudLiveProviderEndpointNetworkEgressGateNext.textContent = "openclaw-cloud-consciousness-live-provider-egress-execution-route-task-preflight";
    cloudLiveProviderEndpointNetworkEgressGateJson.textContent = "Unable to read live provider endpoint network egress gate.";
  }
}

async function refreshCloudConsciousnessLiveProviderEgressExecutionRouteTaskPreflight() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-egress-execution-route-task-preflight\`);
    const summary = data.summary ?? {};
    cloudLiveProviderEgressExecutionRouteTaskPreflightReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderEgressExecutionRouteTaskPreflightTask.textContent = summary.egressExecutionTaskCreated === true ? "created" : "not created";
    cloudLiveProviderEgressExecutionRouteTaskPreflightNetwork.textContent = summary.networkEgress === true ? "egress" : "no egress";
    cloudLiveProviderEgressExecutionRouteTaskPreflightNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-egress-execution-task-shell";
    cloudLiveProviderEgressExecutionRouteTaskPreflightJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-egress-execution-route-task-preflight-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Recorded: " + Boolean(summary.egressExecutionRouteTaskPreflightRecorded),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Endpoint network egress gate found: " + Boolean(summary.endpointNetworkEgressGateFound),
      "Egress execution task created: " + Boolean(summary.egressExecutionTaskCreated),
      "Egress execution task approved: " + Boolean(summary.egressExecutionTaskApproved),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential access denied: " + Boolean(summary.credentialValueAccessDenied),
      "Endpoint egress authorized: " + Boolean(summary.endpointNetworkEgressAuthorized),
      "Endpoint egress denied: " + Boolean(summary.endpointNetworkEgressDenied),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Rollback executed: " + Boolean(summary.rollbackExecuted),
      "Host mutation: " + Boolean(summary.hostMutation),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Record Endpoint: /cloud-consciousness/live-provider-egress-execution-route-task-preflight",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-egress-execution-task-shell"),
    ].join("\\n");
  } catch {
    cloudLiveProviderEgressExecutionRouteTaskPreflightReady.textContent = "false";
    cloudLiveProviderEgressExecutionRouteTaskPreflightTask.textContent = "not created";
    cloudLiveProviderEgressExecutionRouteTaskPreflightNetwork.textContent = "no egress";
    cloudLiveProviderEgressExecutionRouteTaskPreflightNext.textContent = "openclaw-cloud-consciousness-live-provider-egress-execution-task-shell";
    cloudLiveProviderEgressExecutionRouteTaskPreflightJson.textContent = "Unable to read live provider egress execution route task preflight.";
  }
}

async function refreshCloudConsciousnessLiveProviderEgressExecutionTaskShell() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-egress-execution-route-task-preflight\`);
    const summary = data.summary ?? {};
    cloudLiveProviderEgressExecutionTaskShellReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderEgressExecutionTaskShellApproval.textContent = "required";
    cloudLiveProviderEgressExecutionTaskShellNetwork.textContent = summary.networkEgress === true ? "egress" : "no egress";
    cloudLiveProviderEgressExecutionTaskShellNext.textContent = "openclaw-cloud-consciousness-live-provider-egress-execution-approved-deferred";
    cloudLiveProviderEgressExecutionTaskShellJson.textContent = [
      "Task Registry: openclaw-cloud-consciousness-live-provider-egress-execution-task-v0",
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Source Registry: " + (summary.sourceRegistry ?? "openclaw-cloud-consciousness-live-provider-egress-execution-route-task-preflight-v0"),
      "Approval: required before task execution",
      "Task Endpoint: /cloud-consciousness/live-provider-egress-execution-tasks",
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Rollback executed: " + Boolean(summary.rollbackExecuted),
      "Host mutation: " + Boolean(summary.hostMutation),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Next: openclaw-cloud-consciousness-live-provider-egress-execution-approved-deferred",
    ].join("\\n");
  } catch {
    cloudLiveProviderEgressExecutionTaskShellReady.textContent = "false";
    cloudLiveProviderEgressExecutionTaskShellApproval.textContent = "required";
    cloudLiveProviderEgressExecutionTaskShellNetwork.textContent = "no egress";
    cloudLiveProviderEgressExecutionTaskShellNext.textContent = "openclaw-cloud-consciousness-live-provider-egress-execution-task-shell";
    cloudLiveProviderEgressExecutionTaskShellJson.textContent = "Unable to read live provider egress execution task shell readiness.";
  }
}

async function refreshCloudConsciousnessLiveProviderEgressExecutionApprovedDeferred() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-egress-execution-approved-deferred\`);
    const summary = data.summary ?? {};
    cloudLiveProviderEgressExecutionApprovedDeferredReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderEgressExecutionApprovedDeferredSource.textContent = summary.sourceTaskId ?? "none";
    cloudLiveProviderEgressExecutionApprovedDeferredNetwork.textContent = summary.networkEgress === true ? "egress" : "no egress";
    cloudLiveProviderEgressExecutionApprovedDeferredNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-authorization-route";
    cloudLiveProviderEgressExecutionApprovedDeferredJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-egress-execution-approved-deferred-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Approved deferred evidence found: " + Boolean(summary.approvedDeferredEvidenceFound),
      "Egress execution task created: " + Boolean(summary.egressExecutionTaskCreated),
      "Egress execution task approved: " + Boolean(summary.egressExecutionTaskApproved),
      "Egress execution deferred: " + Boolean(summary.egressExecutionDeferred),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Endpoint egress authorized: " + Boolean(summary.endpointNetworkEgressAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Provider response created: " + Boolean(summary.providerResponseCreated),
      "Rollback executed: " + Boolean(summary.rollbackExecuted),
      "Host mutation: " + Boolean(summary.hostMutation),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint: /cloud-consciousness/live-provider-egress-execution-approved-deferred",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-authorization-route"),
    ].join("\\n");
  } catch {
    cloudLiveProviderEgressExecutionApprovedDeferredReady.textContent = "false";
    cloudLiveProviderEgressExecutionApprovedDeferredSource.textContent = "none";
    cloudLiveProviderEgressExecutionApprovedDeferredNetwork.textContent = "no egress";
    cloudLiveProviderEgressExecutionApprovedDeferredNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-authorization-route";
    cloudLiveProviderEgressExecutionApprovedDeferredJson.textContent = "Unable to read live provider egress execution approved deferred evidence.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueAuthorizationRoute() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-authorization-route\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueAuthorizationRouteReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueAuthorizationRouteCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueAuthorizationRouteNetwork.textContent = summary.networkEgress === true ? "egress" : "no egress";
    cloudLiveProviderCredentialValueAuthorizationRouteNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-authorization-task-shell";
    cloudLiveProviderCredentialValueAuthorizationRouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-value-authorization-route-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Selected: " + (summary.selectedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-authorization-task-shell"),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Approved deferred evidence found: " + Boolean(summary.approvedDeferredEvidenceFound),
      "Credential authorization task created: " + Boolean(summary.credentialValueAuthorizationTaskCreated),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential access denied: " + Boolean(summary.credentialValueAccessDenied),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint: /cloud-consciousness/live-provider-credential-value-authorization-route",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-authorization-task-shell"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueAuthorizationRouteReady.textContent = "false";
    cloudLiveProviderCredentialValueAuthorizationRouteCredential.textContent = "not read";
    cloudLiveProviderCredentialValueAuthorizationRouteNetwork.textContent = "no egress";
    cloudLiveProviderCredentialValueAuthorizationRouteNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-authorization-task-shell";
    cloudLiveProviderCredentialValueAuthorizationRouteJson.textContent = "Unable to read live provider credential value authorization route.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueAuthorizationTaskShell() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-authorization-route\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueAuthorizationTaskShellReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueAuthorizationTaskShellApproval.textContent = "required";
    cloudLiveProviderCredentialValueAuthorizationTaskShellCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueAuthorizationTaskShellNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-authorization-approved-deferred";
    cloudLiveProviderCredentialValueAuthorizationTaskShellJson.textContent = [
      "Task Registry: openclaw-cloud-consciousness-live-provider-credential-value-authorization-task-v0",
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Source Registry: " + (summary.sourceRegistry ?? "openclaw-cloud-consciousness-live-provider-credential-value-authorization-route-v0"),
      "Approval: required before authorization shell can be completed",
      "Task Endpoint: /cloud-consciousness/live-provider-credential-value-authorization-tasks",
      "Credential authorization task created: " + Boolean(summary.credentialValueAuthorizationTaskCreated),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Next: openclaw-cloud-consciousness-live-provider-credential-value-authorization-approved-deferred",
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueAuthorizationTaskShellReady.textContent = "false";
    cloudLiveProviderCredentialValueAuthorizationTaskShellApproval.textContent = "required";
    cloudLiveProviderCredentialValueAuthorizationTaskShellCredential.textContent = "not read";
    cloudLiveProviderCredentialValueAuthorizationTaskShellNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-authorization-task-shell";
    cloudLiveProviderCredentialValueAuthorizationTaskShellJson.textContent = "Unable to read live provider credential value authorization task shell readiness.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueAuthorizationApprovedDeferred() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-authorization-approved-deferred\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueAuthorizationApprovedDeferredReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueAuthorizationApprovedDeferredSource.textContent = summary.sourceTaskId ?? "none";
    cloudLiveProviderCredentialValueAuthorizationApprovedDeferredCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueAuthorizationApprovedDeferredNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-readiness-preflight";
    cloudLiveProviderCredentialValueAuthorizationApprovedDeferredJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-value-authorization-approved-deferred-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Approved deferred evidence found: " + Boolean(summary.approvedDeferredEvidenceFound),
      "Credential authorization task created: " + Boolean(summary.credentialValueAuthorizationTaskCreated),
      "Credential authorization task approved: " + Boolean(summary.credentialValueAuthorizationTaskApproved),
      "Credential authorization deferred: " + Boolean(summary.credentialValueAuthorizationDeferred),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint: /cloud-consciousness/live-provider-credential-value-authorization-approved-deferred",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-readiness-preflight"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueAuthorizationApprovedDeferredReady.textContent = "false";
    cloudLiveProviderCredentialValueAuthorizationApprovedDeferredSource.textContent = "none";
    cloudLiveProviderCredentialValueAuthorizationApprovedDeferredCredential.textContent = "not read";
    cloudLiveProviderCredentialValueAuthorizationApprovedDeferredNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-readiness-preflight";
    cloudLiveProviderCredentialValueAuthorizationApprovedDeferredJson.textContent = "Unable to read live provider credential value authorization approved deferred evidence.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueReadinessPreflight() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-readiness-preflight\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueReadinessPreflightReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueReadinessPreflightSource.textContent = summary.sourceTaskId ?? "none";
    cloudLiveProviderCredentialValueReadinessPreflightCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueReadinessPreflightNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-read-task-shell";
    cloudLiveProviderCredentialValueReadinessPreflightJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-value-readiness-preflight-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Approved deferred evidence found: " + Boolean(summary.credentialValueAuthorizationApprovedDeferredFound),
      "Readiness preflight recorded: " + Boolean(summary.credentialValueReadinessPreflightRecorded),
      "Credential authorization task approved: " + Boolean(summary.credentialValueAuthorizationTaskApproved),
      "Credential authorization deferred: " + Boolean(summary.credentialValueAuthorizationDeferred),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint: /cloud-consciousness/live-provider-credential-value-readiness-preflight",
      "Record Endpoint: /cloud-consciousness/live-provider-credential-value-readiness-preflight",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-read-task-shell"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueReadinessPreflightReady.textContent = "false";
    cloudLiveProviderCredentialValueReadinessPreflightSource.textContent = "none";
    cloudLiveProviderCredentialValueReadinessPreflightCredential.textContent = "not read";
    cloudLiveProviderCredentialValueReadinessPreflightNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-read-task-shell";
    cloudLiveProviderCredentialValueReadinessPreflightJson.textContent = "Unable to read live provider credential value readiness preflight.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueReadTaskShell() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-readiness-preflight\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueReadTaskShellReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueReadTaskShellApproval.textContent = "required";
    cloudLiveProviderCredentialValueReadTaskShellCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueReadTaskShellNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-read-approved-deferred";
    cloudLiveProviderCredentialValueReadTaskShellJson.textContent = [
      "Task Registry: openclaw-cloud-consciousness-live-provider-credential-value-read-task-v0",
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Source Registry: " + (summary.sourceRegistry ?? "openclaw-cloud-consciousness-live-provider-credential-value-readiness-preflight-v0"),
      "Approval: required before read shell can be completed",
      "Task Endpoint: /cloud-consciousness/live-provider-credential-value-read-tasks",
      "Readiness preflight recorded: " + Boolean(summary.credentialValueReadinessPreflightRecorded),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Provider credential read: " + Boolean(summary.providerCredentialRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Next: openclaw-cloud-consciousness-live-provider-credential-value-read-approved-deferred",
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueReadTaskShellReady.textContent = "false";
    cloudLiveProviderCredentialValueReadTaskShellApproval.textContent = "required";
    cloudLiveProviderCredentialValueReadTaskShellCredential.textContent = "not read";
    cloudLiveProviderCredentialValueReadTaskShellNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-read-task-shell";
    cloudLiveProviderCredentialValueReadTaskShellJson.textContent = "Unable to read live provider credential value read task shell readiness.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueReadApprovedDeferred() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-read-approved-deferred\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueReadApprovedDeferredReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueReadApprovedDeferredSource.textContent = summary.sourceTaskId ?? "none";
    cloudLiveProviderCredentialValueReadApprovedDeferredCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueReadApprovedDeferredNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-route";
    cloudLiveProviderCredentialValueReadApprovedDeferredJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-value-read-approved-deferred-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Approved deferred evidence found: " + Boolean(summary.approvedDeferredEvidenceFound),
      "Credential read task created: " + Boolean(summary.credentialValueReadTaskCreated),
      "Credential read task approved: " + Boolean(summary.credentialValueReadTaskApproved),
      "Credential read deferred: " + Boolean(summary.credentialValueReadDeferred),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Provider credential read: " + Boolean(summary.providerCredentialRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint: /cloud-consciousness/live-provider-credential-value-read-approved-deferred",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-route"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueReadApprovedDeferredReady.textContent = "false";
    cloudLiveProviderCredentialValueReadApprovedDeferredSource.textContent = "none";
    cloudLiveProviderCredentialValueReadApprovedDeferredCredential.textContent = "not read";
    cloudLiveProviderCredentialValueReadApprovedDeferredNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-route";
    cloudLiveProviderCredentialValueReadApprovedDeferredJson.textContent = "Unable to read live provider credential value read approved deferred evidence.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueAccessAuthorizationRoute() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-access-authorization-route\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueAccessAuthorizationRouteReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueAccessAuthorizationRouteCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationRouteNetwork.textContent = summary.networkEgress === true ? "egress" : "no egress";
    cloudLiveProviderCredentialValueAccessAuthorizationRouteNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-task-shell";
    cloudLiveProviderCredentialValueAccessAuthorizationRouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-route-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Selected: " + (summary.selectedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-task-shell"),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Approved deferred evidence found: " + Boolean(summary.approvedDeferredEvidenceFound),
      "Access authorization task created: " + Boolean(summary.credentialValueAccessAuthorizationTaskCreated),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Provider credential read: " + Boolean(summary.providerCredentialRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint: /cloud-consciousness/live-provider-credential-value-access-authorization-route",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-task-shell"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueAccessAuthorizationRouteReady.textContent = "false";
    cloudLiveProviderCredentialValueAccessAuthorizationRouteCredential.textContent = "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationRouteNetwork.textContent = "no egress";
    cloudLiveProviderCredentialValueAccessAuthorizationRouteNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-task-shell";
    cloudLiveProviderCredentialValueAccessAuthorizationRouteJson.textContent = "Unable to read live provider credential value access authorization route.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueAccessAuthorizationTaskShell() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-access-authorization-route\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueAccessAuthorizationTaskShellReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueAccessAuthorizationTaskShellApproval.textContent = "required";
    cloudLiveProviderCredentialValueAccessAuthorizationTaskShellCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationTaskShellNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-approved-deferred";
    cloudLiveProviderCredentialValueAccessAuthorizationTaskShellJson.textContent = [
      "Task Registry: openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-task-v0",
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Source Registry: " + (summary.sourceRegistry ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-route-v0"),
      "Approval: required before access authorization shell can be completed",
      "Task Endpoint: /cloud-consciousness/live-provider-credential-value-access-authorization-tasks",
      "Access authorization task created: " + Boolean(summary.credentialValueAccessAuthorizationTaskCreated),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Provider credential read: " + Boolean(summary.providerCredentialRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Next: openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-approved-deferred",
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueAccessAuthorizationTaskShellReady.textContent = "false";
    cloudLiveProviderCredentialValueAccessAuthorizationTaskShellApproval.textContent = "required";
    cloudLiveProviderCredentialValueAccessAuthorizationTaskShellCredential.textContent = "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationTaskShellNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-task-shell";
    cloudLiveProviderCredentialValueAccessAuthorizationTaskShellJson.textContent = "Unable to read live provider credential value access authorization task shell readiness.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueAccessAuthorizationApprovedDeferred() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-access-authorization-approved-deferred\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueAccessAuthorizationApprovedDeferredReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueAccessAuthorizationApprovedDeferredSource.textContent = summary.sourceTaskId ?? "none";
    cloudLiveProviderCredentialValueAccessAuthorizationApprovedDeferredCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationApprovedDeferredNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-final-readiness-preflight";
    cloudLiveProviderCredentialValueAccessAuthorizationApprovedDeferredJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-approved-deferred-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Approved deferred evidence: " + Boolean(summary.approvedDeferredEvidenceFound),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Source Registry: " + (summary.sourceRegistry ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-task-v0"),
      "Access authorization task approved: " + Boolean(summary.credentialValueAccessAuthorizationTaskApproved),
      "Access authorization deferred: " + Boolean(summary.credentialValueAccessAuthorizationDeferred),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Provider credential read: " + Boolean(summary.providerCredentialRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint: /cloud-consciousness/live-provider-credential-value-access-authorization-approved-deferred",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-final-readiness-preflight"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueAccessAuthorizationApprovedDeferredReady.textContent = "false";
    cloudLiveProviderCredentialValueAccessAuthorizationApprovedDeferredSource.textContent = "none";
    cloudLiveProviderCredentialValueAccessAuthorizationApprovedDeferredCredential.textContent = "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationApprovedDeferredNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-final-readiness-preflight";
    cloudLiveProviderCredentialValueAccessAuthorizationApprovedDeferredJson.textContent = "Unable to read live provider credential value access authorization approved deferred evidence.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueFinalReadinessPreflight() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-final-readiness-preflight\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueFinalReadinessPreflightReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueFinalReadinessPreflightSource.textContent = summary.sourceTaskId ?? "none";
    cloudLiveProviderCredentialValueFinalReadinessPreflightCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueFinalReadinessPreflightNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-route";
    cloudLiveProviderCredentialValueFinalReadinessPreflightJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-value-final-readiness-preflight-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Recorded: " + Boolean(summary.credentialValueFinalReadinessPreflightRecorded),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Source Registry: " + (summary.sourceRegistry ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-approved-deferred-v0"),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Provider credential read: " + Boolean(summary.providerCredentialRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint: /cloud-consciousness/live-provider-credential-value-final-readiness-preflight",
      "Record Endpoint: /cloud-consciousness/live-provider-credential-value-final-readiness-preflight",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-route"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueFinalReadinessPreflightReady.textContent = "false";
    cloudLiveProviderCredentialValueFinalReadinessPreflightSource.textContent = "none";
    cloudLiveProviderCredentialValueFinalReadinessPreflightCredential.textContent = "not read";
    cloudLiveProviderCredentialValueFinalReadinessPreflightNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-route";
    cloudLiveProviderCredentialValueFinalReadinessPreflightJson.textContent = "Unable to read live provider credential value final readiness preflight.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueAccessAuthorizationDecisionRoute() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-access-authorization-decision-route\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionRouteReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionRouteCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionRouteNetwork.textContent = summary.networkEgress === true ? "egress" : "no egress";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionRouteNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-task-shell";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionRouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-route-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Source Registry: " + (summary.sourceRegistry ?? "openclaw-cloud-consciousness-live-provider-credential-value-final-readiness-preflight-v0"),
      "Selected: " + (summary.selectedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-task-shell"),
      "Decision task created: " + Boolean(summary.credentialValueAccessAuthorizationDecisionTaskCreated),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Provider credential read: " + Boolean(summary.providerCredentialRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint: /cloud-consciousness/live-provider-credential-value-access-authorization-decision-route",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-task-shell"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionRouteReady.textContent = "false";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionRouteCredential.textContent = "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionRouteNetwork.textContent = "no egress";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionRouteNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-task-shell";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionRouteJson.textContent = "Unable to read live provider credential value access authorization decision route.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueAccessAuthorizationDecisionTaskShell() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-access-authorization-decision-route\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionTaskShellReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionTaskShellApproval.textContent = "required";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionTaskShellCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionTaskShellNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-approved-deferred";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionTaskShellJson.textContent = [
      "Task Registry: openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-task-v0",
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Source Registry: " + (summary.sourceRegistry ?? "openclaw-cloud-consciousness-live-provider-credential-value-final-readiness-preflight-v0"),
      "Approval: required before decision shell can be completed",
      "Task Endpoint: /cloud-consciousness/live-provider-credential-value-access-authorization-decision-tasks",
      "Decision task created: " + Boolean(summary.credentialValueAccessAuthorizationDecisionTaskCreated),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Provider credential read: " + Boolean(summary.providerCredentialRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Next: openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-approved-deferred",
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionTaskShellReady.textContent = "false";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionTaskShellApproval.textContent = "required";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionTaskShellCredential.textContent = "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionTaskShellNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-task-shell";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionTaskShellJson.textContent = "Unable to read live provider credential value access authorization decision task shell readiness.";
  }
}

async function refreshCloudConsciousnessLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferred() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/cloud-consciousness/live-provider-credential-value-access-authorization-decision-approved-deferred\`);
    const summary = data.summary ?? {};
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferredReady.textContent = String(Boolean(summary.ready));
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferredSource.textContent = summary.sourceTaskId ?? "none";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferredCredential.textContent = summary.credentialValueRead === true ? "read" : "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferredNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorized-local-proof";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferredJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-approved-deferred-v0"),
      "Ready: " + Boolean(summary.ready) + " percent=" + (summary.completionPercent ?? 0),
      "Approved deferred evidence: " + Boolean(summary.approvedDeferredEvidenceFound),
      "Source Task: " + (summary.sourceTaskId ?? "none"),
      "Source Registry: " + (summary.sourceRegistry ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorization-decision-task-v0"),
      "Decision task approved: " + Boolean(summary.credentialValueAccessAuthorizationDecisionTaskApproved),
      "Decision deferred: " + Boolean(summary.credentialValueAccessAuthorizationDecisionDeferred),
      "Credential access authorized: " + Boolean(summary.credentialValueAccessAuthorized),
      "Credential value read: " + Boolean(summary.credentialValueRead),
      "Provider credential read: " + Boolean(summary.providerCredentialRead),
      "Endpoint contacted: " + Boolean(summary.endpointContacted),
      "Network egress: " + Boolean(summary.networkEgress),
      "Live provider call: " + Boolean(summary.liveProviderCallEnabled),
      "Endpoint: /cloud-consciousness/live-provider-credential-value-access-authorization-decision-approved-deferred",
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-live-provider-credential-value-access-authorized-local-proof"),
    ].join("\\n");
  } catch {
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferredReady.textContent = "false";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferredSource.textContent = "none";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferredCredential.textContent = "not read";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferredNext.textContent = "openclaw-cloud-consciousness-live-provider-credential-value-access-authorized-local-proof";
    cloudLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferredJson.textContent = "Unable to read live provider credential value access authorization decision approved deferred evidence.";
  }
}

`;
