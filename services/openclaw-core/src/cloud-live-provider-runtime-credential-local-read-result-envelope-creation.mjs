import * as liveProviderPhaseGovernance from "./cloud-live-provider-runtime-governance.mjs";

const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_FINAL_READINESS_PREFLIGHT_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-final-readiness-preflight-v0";
const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_ROUTE_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-route-v0";
const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_TASK_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-task-v0";
const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_APPROVED_DEFERRED_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-approved-deferred-v0";
const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_FINAL_READINESS_PREFLIGHT_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-final-readiness-preflight-v0";

export function createCredentialLocalReadResultEnvelopeCreationRuntime(context) {
  const {
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflight,
    createTask,
    createApprovalRequestForTask,
    evaluatePolicyIntent,
    publishEvent,
    publishTaskApprovalIfPending,
    supersedeOtherActiveTasks,
    reconcileRuntimeState,
    persistState,
    serialiseTask,
    appendTaskPhase,
    completeTask,
    approvals,
    getTaskById,
    listTasks,
  } = context;

  async function buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationRoute() {
    const finalReadinessPreflight = await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflight();
    const decision = {
      decision: "route_to_approval_gated_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task",
      selectedSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-task-shell",
      reason: "The result envelope final readiness preflight is recorded; the next whitepaper-aligned gate is a separate approval-gated result envelope creation task shell before any credential value can be read or represented.",
      requiredBeforeCredentialValueRead: [
        "separate approval-gated credential value local read result envelope creation task shell",
        "redaction-safe result envelope creation contract that never exposes credential values",
        "explicit local-only proof that endpoint/network egress remains unauthorized",
        "provider request assembly and egress remain separately gated after local result envelope creation evidence",
      ],
      credentialReference: finalReadinessPreflight.preflight?.credentialReference ?? "openclaw://credential/provider/live-provider-fixture",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded:
        finalReadinessPreflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded === true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: false,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
      credentialValueRead: false,
      credentialValueIncluded: false,
      credentialValueExposed: false,
      providerCredentialRead: false,
    };
    const checks = [
      {
        id: "phase-102-result-envelope-final-readiness-preflight-recorded",
        label: "Phase 102 credential value result envelope final readiness preflight is recorded",
        passed: finalReadinessPreflight.summary?.ready === true
          && finalReadinessPreflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded === true,
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
        id: "result-envelope-creation-task-not-created",
        label: "Result envelope creation route does not create a task or result envelope",
        passed: decision.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated === false
          && decision.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated === false,
        evidence: decision.selectedSlice,
      },
      {
        id: "no-endpoint-network-or-live-call",
        label: "Result envelope creation route does not contact endpoints, transmit externally, or enable live provider calls",
        passed: finalReadinessPreflight.summary?.endpointContacted === false
          && finalReadinessPreflight.summary?.networkEgress === false
          && finalReadinessPreflight.summary?.transmitsExternally === false
          && finalReadinessPreflight.summary?.liveProviderCallEnabled === false,
        evidence: "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_route_only",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    const ready = passed === checks.length;
    return {
      ok: true,
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_ROUTE_REGISTRY,
      mode: "phase_103_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_route",
      generatedAt: new Date().toISOString(),
      status: ready ? "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_route_ready" : "waiting_for_phase_102_local_read_execution_local_read_attempt_local_read_result_envelope_final_readiness_preflight",
      governance: liveProviderPhaseGovernance.phase103Governance({
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded:
          finalReadinessPreflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded === true,
      }),
      decision,
      checks,
      summary: {
        ready,
        complete: ready,
        passed,
        total: checks.length,
        completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
        phase: "phase-103",
        finalReadinessPreflightFound: finalReadinessPreflight.summary?.ready === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded:
          finalReadinessPreflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded === true,
        sourceTaskId: finalReadinessPreflight.summary?.sourceTaskId ?? null,
        sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_FINAL_READINESS_PREFLIGHT_REGISTRY,
        selectedSlice: decision.selectedSlice,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: false,
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
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-task-shell",
        boundary: "credential value reads, local read result envelope creation, endpoint contact, network egress, provider response creation, rollback execution, host mutation, and live provider calls remain separate future gates",
      },
    };
  }

  async function createCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read result envelope creation task creation requires confirm=true.");
    }

    const route = await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationRoute();
    if (route.summary?.ready !== true
      || route.next?.recommendedSlice !== "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-task-shell") {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read result envelope creation task requires a ready Phase 103 result envelope creation route.");
    }

    const policyRequest = {
      intent: "cloud_consciousness.live_provider_call.credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task",
      domain: "cross_boundary",
      risk: "high",
      requiresApproval: true,
      audit: true,
      tags: ["cloud_consciousness", "live_provider_call", "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation", "operator_reviewed"],
    };
    const goal = "Prepare approval-gated credential value local read result envelope creation task shell without reading credential values or creating envelopes";
    const policyDecision = evaluatePolicyIntent({
      type: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task",
      goal,
      policy: policyRequest,
    }, {
      stage: "cloud_consciousness.live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task.draft",
      type: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task",
      goal,
    });

    const task = createTask({
      goal,
      type: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task",
      workViewStrategy: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation",
      policy: policyRequest,
      plan: {
        planner: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-task-v0",
        strategy: "approval-gated-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-shell",
        summary: "Create an approval-gated credential value local read result envelope creation task shell while keeping credential values unread, result envelopes uncreated, and endpoint/network activity disabled.",
        governance: liveProviderPhaseGovernance.phase104Governance({ createsTask: true, createsApproval: true, credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: true }),
        steps: [
          {
            id: "review-credential-value-local-read-result-envelope-creation-route",
            phase: "review_live_provider_credential_value_local_read_result_envelope_creation_route",
            title: "Review Phase 103 credential value local read result envelope creation route",
            status: "pending",
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before credential value local read result envelope creation shell can be recorded",
            status: "pending",
            capabilityId: "act.system.command.dry_run",
            requiresApproval: true,
            risk: "high",
          },
          {
            id: "defer-credential-value-local-read-result-envelope-creation",
            phase: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task_shell_deferred",
            title: "Record local read result envelope creation task shell and defer credential value reads and envelope creation",
            status: "pending",
            requiresApproval: true,
            executesNow: false,
          },
        ],
      },
    }, { skipInitialPolicy: true });

    task.policy = {
      request: policyRequest,
      decision: policyDecision,
    };
    task.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreation = {
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_TASK_REGISTRY,
      sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_ROUTE_REGISTRY,
      sourceTaskId: route.summary?.sourceTaskId ?? null,
      implementationStatus: "task_shell_only",
      credentialReference: route.decision?.credentialReference ?? "openclaw://credential/provider/live-provider-fixture",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded: route.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded === true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: false,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
      credentialValueRead: false,
      credentialValueIncluded: false,
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
    };

    const approval = createApprovalRequestForTask(task, policyDecision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent("task.created", {
      task: serialiseTask(task),
      planner: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-task-v0",
    });
    await publishTaskApprovalIfPending(task);
    await publishEvent("task.planned", {
      task: serialiseTask(task),
      plan: task.plan,
    });
    await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
      task: serialiseTask(reclaimedTask),
    })));

    return {
      ok: true,
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_TASK_REGISTRY,
      mode: "approval-gated-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-task",
      generatedAt: new Date().toISOString(),
      sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_ROUTE_REGISTRY,
      route,
      task,
      approval,
      governance: liveProviderPhaseGovernance.phase104Governance({ createsTask: true, createsApproval: true, credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: true }),
    };
  }

  function isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask(task) {
    return task?.type === "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task"
      && task?.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreation?.registry
        === CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_TASK_REGISTRY;
  }

  async function executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask(task) {
    const approval = task.approval?.requestId ? approvals.get(task.approval.requestId) : null;
    if (approval?.status !== "approved") {
      return {
        blocked: true,
        reason: "approval_required",
        task,
        approval: approval ? { ...approval } : null,
      };
    }

    const recordedAt = new Date().toISOString();
    task.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreation = {
      ...(task.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreation ?? {}),
      implementationStatus: "deferred_after_approval",
      approvedAt: approval.updatedAt,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
      credentialValueRead: false,
      credentialValueIncluded: false,
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
    };
    appendTaskPhase(task, "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task_shell_deferred", {
      taskRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_TASK_REGISTRY,
      recordedAt,
      sourcePhase: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_route",
      deferredSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-approved-deferred",
      reason: "credential value local read result envelope creation task shell approved; credential value read and result envelope creation remain deferred",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    });
    completeTask(task, {
      summary: "Approved credential value local read result envelope creation task shell recorded; credential values remain unread and result envelopes remain uncreated.",
      taskRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_TASK_REGISTRY,
      phase: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task_shell_deferred",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    });
    reconcileRuntimeState();
    persistState();
    await publishEvent("task.phase_changed", { task: serialiseTask(task) });

    return {
      ok: true,
      executor: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-task-v0",
      status: "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task_shell_deferred_after_approval",
      task,
      governance: liveProviderPhaseGovernance.phase104Governance({
        createsTask: true,
        createsApproval: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: true,
      }),
      summary: {
        ready: true,
        implementationStatus: "deferred_after_approval",
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
        credentialValueIncluded: false,
        credentialValueRead: false,
        credentialValueExposed: false,
        endpointContacted: false,
        networkEgress: false,
        liveProviderCallEnabled: false,
      },
    };
  }

  function findLatestApprovedDeferredCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask() {
    const candidates = (typeof listTasks === "function" ? listTasks() : [])
      .filter((task) => {
        const shell = task?.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreation ?? {};
        return isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask(task)
          && task.status === "completed"
          && (shell.implementationStatus === "deferred_after_approval"
            || shell.implementationStatus === "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_final_readiness_preflight_recorded")
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated === true
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved === true
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred === true
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated === false
          && shell.credentialValueIncluded === false
          && shell.credentialValueRead === false
          && shell.credentialValueExposed === false
          && shell.providerCredentialRead === false
          && shell.endpointContacted === false
          && shell.networkEgress === false
          && shell.liveProviderCallEnabled === false
          && task.outcome?.details?.phase === "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task_shell_deferred";
      })
      .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
    return candidates[0]?.id ? getTaskById(candidates[0].id) ?? candidates[0] : null;
  }

  async function buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationApprovedDeferred() {
    const task = findLatestApprovedDeferredCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask();
    const shell = task?.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreation ?? {};
    const checks = [
      {
        id: "credential-value-local-read-result-envelope-creation-task-approved",
        label: "Credential value local read result envelope creation task shell was approved",
        passed: Boolean(task)
          && task.approval?.status === "approved"
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved === true,
        evidence: task?.approval?.requestId ?? null,
      },
      {
        id: "credential-value-local-read-result-envelope-creation-remains-deferred",
        label: "Approved credential value local read result envelope creation remains deferred and uncreated",
        passed: (shell.implementationStatus === "deferred_after_approval"
            || shell.implementationStatus === "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_final_readiness_preflight_recorded")
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred === true
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated === false,
        evidence: task?.outcome?.details?.phase ?? null,
      },
      {
        id: "credential-value-still-unread",
        label: "Credential value remains unread, unexposed, and outside provider reads",
        passed: shell.credentialValueIncluded === false
          && shell.credentialValueRead === false
          && shell.credentialValueExposed === false
          && shell.providerCredentialRead === false,
        evidence: shell.credentialReference ?? "openclaw://credential/provider/live-provider-fixture",
      },
      {
        id: "no-endpoint-network-or-live-call",
        label: "Approved deferred result envelope creation evidence has no endpoint contact, network egress, or live provider call",
        passed: shell.endpointContacted === false
          && shell.networkEgress === false
          && shell.transmitsExternally === false
          && shell.liveProviderCallEnabled === false,
        evidence: "no_network_activity",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    const ready = passed === checks.length;
    return {
      ok: true,
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_APPROVED_DEFERRED_REGISTRY,
      mode: "phase_105_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_approved_deferred",
      generatedAt: new Date().toISOString(),
      status: ready ? "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_approved_deferred_ready" : "waiting_for_phase_104_approved_deferred_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task_shell",
      governance: liveProviderPhaseGovernance.phase105Governance({
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved === true,
      }),
      checks,
      summary: {
        ready,
        complete: ready,
        passed,
        total: checks.length,
        completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
        phase: "phase-105",
        approvedDeferredEvidenceFound: Boolean(task),
        sourceTaskId: task?.id ?? null,
        sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_TASK_REGISTRY,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred === true,
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
        approvedDeferredTask: task ? serialiseTask(task) : null,
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-final-readiness-preflight",
        boundary: "actual credential value reads, local read result envelope creation, endpoint contact, network egress, provider response creation, rollback execution, host mutation, and live provider calls remain separate future gates",
      },
    };
  }

  async function buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflight() {
    const approvedDeferred = await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationApprovedDeferred();
    const task = findLatestApprovedDeferredCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask();
    const shell = task?.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreation ?? {};
    const preflight = {
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_FINAL_READINESS_PREFLIGHT_REGISTRY,
      sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_APPROVED_DEFERRED_REGISTRY,
      sourceTaskId: task?.id ?? null,
      preflightState: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded === true ? "recorded_deferred" : "ready_to_record_deferred",
      credentialReference: shell.credentialReference ?? "openclaw://credential/provider/live-provider-fixture",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded === true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved === true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred === true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
      credentialValueRead: false,
      credentialValueIncluded: false,
      credentialValueExposed: false,
      providerCredentialRead: false,
      endpointContacted: false,
      networkEgress: false,
      transmitsExternally: false,
      liveProviderCallEnabled: false,
    };
    const checks = [
      {
        id: "phase-105-result-envelope-creation-approved-deferred-ready",
        label: "Phase 105 approved-deferred credential value result envelope creation evidence is ready",
        passed: approvedDeferred.summary?.ready === true
          && approvedDeferred.summary?.approvedDeferredEvidenceFound === true
          && Boolean(task),
        evidence: task?.id ?? null,
      },
      {
        id: "result-envelope-creation-approved-but-still-deferred",
        label: "Credential value result envelope creation task is approved but remains deferred and uncreated",
        passed: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved === true
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred === true
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated === false,
        evidence: shell.implementationStatus ?? null,
      },
      {
        id: "credential-value-result-envelope-creation-final-readiness-preflight-state",
        label: "Final credential value result envelope creation readiness preflight is local-only and does not read credentials or create envelopes",
        passed: preflight.credentialValueRead === false
          && preflight.credentialValueIncluded === false
          && preflight.credentialValueExposed === false
          && preflight.providerCredentialRead === false
          && preflight.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated === false,
        evidence: preflight.preflightState,
      },
      {
        id: "no-endpoint-network-or-live-call",
        label: "Result envelope creation final readiness preflight does not contact endpoints, transmit externally, or enable live provider calls",
        passed: preflight.endpointContacted === false
          && preflight.networkEgress === false
          && preflight.transmitsExternally === false
          && preflight.liveProviderCallEnabled === false,
        evidence: "no_network_activity",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    const ready = passed === checks.length;
    return {
      ok: true,
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_FINAL_READINESS_PREFLIGHT_REGISTRY,
      mode: "phase_106_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_final_readiness_preflight",
      generatedAt: new Date().toISOString(),
      status: ready ? "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_final_readiness_preflight_ready_deferred" : "waiting_for_phase_105_local_read_execution_local_read_attempt_local_read_result_envelope_creation_approved_deferred",
      governance: liveProviderPhaseGovernance.phase106Governance({
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded === true,
      }),
      preflight,
      checks,
      summary: {
        ready,
        complete: ready,
        passed,
        total: checks.length,
        completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
        phase: "phase-106",
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationApprovedDeferredRequired: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationApprovedDeferredFound: Boolean(task),
        sourceTaskId: task?.id ?? null,
        sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_APPROVED_DEFERRED_REGISTRY,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred === true,
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
        approvedDeferred,
        resultEnvelopeCreationTask: task ? serialiseTask(task) : null,
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-route",
        boundary: "actual credential value reads, local read result envelope creation, endpoint contact, network egress, provider response creation, rollback execution, host mutation, and live provider calls remain separate future gates",
      },
    };
  }

  async function recordCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflight({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read result envelope creation final readiness preflight requires confirm=true.");
    }

    const preflight = await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflight();
    if (preflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationApprovedDeferredFound !== true) {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read result envelope creation final readiness preflight requires Phase 105 approved deferred result envelope creation evidence.");
    }

    const task = findLatestApprovedDeferredCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask();
    if (!task) {
      throw new Error("Unable to locate approved deferred credential value local read result envelope creation task for final readiness preflight.");
    }

    const recordedAt = new Date().toISOString();
    task.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreation = {
      ...(task.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreation ?? {}),
      implementationStatus: "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_final_readiness_preflight_recorded",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_FINAL_READINESS_PREFLIGHT_REGISTRY,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecordedAt: recordedAt,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflight: {
        ...preflight.preflight,
        preflightState: "recorded_deferred",
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded: true,
      },
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred: true,
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
    };
    appendTaskPhase(task, "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_final_readiness_preflight", {
      preflightRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_FINAL_READINESS_PREFLIGHT_REGISTRY,
      recordedAt,
      sourcePhase: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_task_shell_deferred",
      preflight: {
        ...preflight.preflight,
        preflightState: "recorded_deferred",
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded: true,
      },
      nextSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-route",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    });
    task.updatedAt = recordedAt;
    reconcileRuntimeState();
    persistState();
    await publishEvent("task.phase_changed", { task: serialiseTask(task) });

    return {
      ok: true,
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_RESULT_ENVELOPE_CREATION_FINAL_READINESS_PREFLIGHT_REGISTRY,
      mode: "phase_106_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_final_readiness_preflight_recorded",
      generatedAt: recordedAt,
      status: "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_final_readiness_preflight_recorded_deferred",
      task: serialiseTask(task),
      preflight: await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflight(),
      governance: liveProviderPhaseGovernance.phase106Governance({ credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded: true }),
    };
  }


  return {
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationRoute,
    createCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask,
    isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask,
    executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTask,
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationApprovedDeferred,
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflight,
    recordCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflight,
  };
}
