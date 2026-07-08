import * as liveProviderPhaseGovernance from "./cloud-live-provider-runtime-governance.mjs";

const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_EXECUTION_ATTEMPT_LOCAL_READ_FINAL_READINESS_PREFLIGHT_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-final-readiness-preflight-v0";
const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_EXECUTION_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_ROUTE_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-route-v0";

export function createCredentialLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeRuntime(context) {
  const {
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadFinalReadinessPreflight,
  } = context;

  async function buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeRoute() {
    const finalReadinessPreflight =
      await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadFinalReadinessPreflight();
    const decision = {
      decision: "route_to_approval_gated_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_task",
      selectedSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-task-shell",
      reason: "The result envelope creation execution attempt local-read final readiness preflight is recorded; the next whitepaper-aligned gate is a separate approval-gated local-read result envelope task shell before any credential value is read, represented, or transmitted.",
      requiredBeforeCredentialValueRead: [
        "separate approval-gated credential value local read result envelope creation execution attempt local-read result envelope task shell",
        "redaction-safe local-read result envelope contract that never exposes credential values",
        "explicit proof that credential value reads and result envelope creation remain separately gated",
        "endpoint contact, network egress, provider response creation, rollback execution, host mutation, launch execution, and live provider calls remain separately gated",
      ],
      credentialReference: finalReadinessPreflight.preflight?.credentialReference ?? "openclaw://credential/provider/live-provider-fixture",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadFinalReadinessPreflightRecorded:
        finalReadinessPreflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadFinalReadinessPreflightRecorded === true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeTaskCreated: false,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
      credentialValueRead: false,
      credentialValueIncluded: false,
      credentialValueExposed: false,
      providerCredentialRead: false,
    };
    const checks = [
      {
        id: "phase-118-result-envelope-creation-execution-attempt-local-read-final-readiness-preflight-recorded",
        label: "Phase 118 credential value result envelope creation execution attempt local-read final readiness preflight is recorded",
        passed: finalReadinessPreflight.summary?.ready === true
          && finalReadinessPreflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadFinalReadinessPreflightRecorded === true,
        evidence: finalReadinessPreflight.summary?.sourceTaskId ?? null,
      },
      {
        id: "credential-value-still-unread",
        label: "Credential value remains unread, unexposed, and outside provider reads",
        passed: finalReadinessPreflight.summary?.credentialValueRead === false
          && finalReadinessPreflight.summary?.credentialValueIncluded === false
          && finalReadinessPreflight.summary?.credentialValueExposed === false
          && finalReadinessPreflight.summary?.providerCredentialRead === false
          && decision.credentialValueRead === false,
        evidence: decision.credentialReference,
      },
      {
        id: "result-envelope-creation-execution-attempt-local-read-result-envelope-task-not-created",
        label: "Result envelope creation execution attempt local-read result envelope route does not create a task or result envelope",
        passed: decision.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeTaskCreated === false
          && decision.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated === false,
        evidence: decision.selectedSlice,
      },
      {
        id: "no-endpoint-network-rollback-mutation-launch-or-live-call",
        label: "Result envelope creation execution attempt local-read result envelope route does not contact endpoints, transmit externally, roll back, mutate host state, launch, or enable live provider calls",
        passed: finalReadinessPreflight.summary?.endpointContacted === false
          && finalReadinessPreflight.summary?.networkEgress === false
          && finalReadinessPreflight.summary?.providerResponseCreated === false
          && finalReadinessPreflight.summary?.rollbackExecuted === false
          && finalReadinessPreflight.summary?.rollbackCommandCreated === false
          && finalReadinessPreflight.summary?.hostMutation === false
          && finalReadinessPreflight.summary?.transmitsExternally === false
          && finalReadinessPreflight.summary?.liveProviderCallEnabled === false
          && finalReadinessPreflight.summary?.launchAuthorized === false
          && finalReadinessPreflight.summary?.launchExecuted === false,
        evidence: "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_route_only",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    const ready = passed === checks.length;
    return {
      ok: true,
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_EXECUTION_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_ROUTE_REGISTRY,
      mode: "phase_119_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_route",
      generatedAt: new Date().toISOString(),
      status: ready ? "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_route_ready" : "waiting_for_phase_118_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_final_readiness_preflight",
      governance: liveProviderPhaseGovernance.phase119Governance({
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadFinalReadinessPreflightRecorded:
          finalReadinessPreflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadFinalReadinessPreflightRecorded === true,
      }),
      decision,
      checks,
      summary: {
        ready,
        complete: ready,
        passed,
        total: checks.length,
        completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
        phase: "phase-119",
        finalReadinessPreflightFound: finalReadinessPreflight.summary?.ready === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadFinalReadinessPreflightRecorded:
          finalReadinessPreflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadFinalReadinessPreflightRecorded === true,
        sourceTaskId: finalReadinessPreflight.summary?.sourceTaskId ?? null,
        sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_EXECUTION_ATTEMPT_LOCAL_READ_FINAL_READINESS_PREFLIGHT_REGISTRY,
        selectedSlice: decision.selectedSlice,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeTaskCreated: false,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
        credentialValueIncluded: false,
        credentialValueRead: false,
        credentialValueExposed: false,
        providerCredentialRead: false,
        endpointNetworkEgressAuthorized: false,
        endpointNetworkEgressDenied: true,
        endpointContacted: false,
        networkEgress: false,
        providerResponseCreated: false,
        rollbackExecuted: false,
        rollbackCommandCreated: false,
        hostMutation: false,
        transmitsExternally: false,
        liveProviderCallEnabled: false,
        launchAuthorized: false,
        launchExecuted: false,
      },
      evidence: {
        finalReadinessPreflight,
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-task-shell",
        boundary: "credential value reads, local read result envelope creation, endpoint contact, network egress, provider response creation, rollback execution, host mutation, launch execution, and live provider calls remain separate future gates",
      },
    };
  }

  return {
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeRoute,
  };
}
