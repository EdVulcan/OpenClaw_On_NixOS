import * as liveProviderPhaseGovernance from "./cloud-live-provider-runtime-governance.mjs";

const EXECUTION_ATTEMPT_ROUTE_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-route-v0";
const EXECUTION_ATTEMPT_TASK_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-task-v0";
const EXECUTION_ATTEMPT_TASK_SLUG =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-task-shell";
const EXECUTION_ATTEMPT_APPROVED_DEFERRED_SLUG =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-approved-deferred";
const EXECUTION_ATTEMPT_TASK_TYPE =
  "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_attempt_task";
const EXECUTION_ATTEMPT_TASK_FIELD =
  "cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttempt";
const EXECUTION_ATTEMPT_TASK_DEFERRED_PHASE =
  "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_attempt_task_shell_deferred";
const EXECUTION_FINAL_READINESS_RECORDED_FIELD =
  "credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionFinalReadinessPreflightRecorded";
const EXECUTION_ATTEMPT_TASK_CREATED_FIELD =
  "credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTaskCreated";
const EXECUTION_ATTEMPT_TASK_APPROVED_FIELD =
  "credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTaskApproved";
const EXECUTION_ATTEMPT_TASK_DEFERRED_FIELD =
  "credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptDeferred";

function deferredCredentialFlags() {
  return {
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
}

export function createCredentialLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTaskShellRuntime(context) {
  const {
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptRoute,
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
  } = context;

  async function createCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTask({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read result envelope creation execution attempt local-read result envelope creation execution attempt task creation requires confirm=true.");
    }

    const route = await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptRoute();
    if (route.summary?.ready !== true || route.next?.recommendedSlice !== EXECUTION_ATTEMPT_TASK_SLUG) {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read result envelope creation execution attempt local-read result envelope creation execution attempt task requires a ready Phase 131 execution attempt route.");
    }

    const policyRequest = {
      intent: "cloud_consciousness.live_provider_call.credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_attempt_task",
      domain: "cross_boundary",
      risk: "high",
      requiresApproval: true,
      audit: true,
      tags: ["cloud_consciousness", "live_provider_call", "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_attempt", "operator_reviewed"],
    };
    const goal = "Prepare approval-gated credential value local read result envelope creation execution attempt task shell without reading credential values or creating result envelopes";
    const policyDecision = evaluatePolicyIntent({
      type: EXECUTION_ATTEMPT_TASK_TYPE,
      goal,
      policy: policyRequest,
    }, {
      stage: "cloud_consciousness.live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_attempt_task.draft",
      type: EXECUTION_ATTEMPT_TASK_TYPE,
      goal,
    });

    const task = createTask({
      goal,
      type: EXECUTION_ATTEMPT_TASK_TYPE,
      workViewStrategy: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt",
      policy: policyRequest,
      plan: {
        planner: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-task-v0",
        strategy: "approval-gated-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-shell",
        summary: "Create an approval-gated credential value local read result envelope creation execution attempt task shell while keeping credential values unread, result envelopes uncreated, and endpoint/network activity disabled.",
        governance: liveProviderPhaseGovernance.phase132Governance({
          createsTask: true,
          createsApproval: true,
          [EXECUTION_ATTEMPT_TASK_CREATED_FIELD]: true,
        }),
        steps: [
          {
            id: "review-credential-value-local-read-result-envelope-creation-execution-attempt-route",
            phase: "review_live_provider_credential_value_local_read_result_envelope_creation_execution_attempt_route",
            title: "Review Phase 131 credential value local read result envelope creation execution attempt route",
            status: "pending",
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before credential value local read result envelope creation execution attempt shell can be recorded",
            status: "pending",
            capabilityId: "act.system.command.dry_run",
            requiresApproval: true,
            risk: "high",
          },
          {
            id: "defer-credential-value-local-read-result-envelope-creation-execution-attempt",
            phase: EXECUTION_ATTEMPT_TASK_DEFERRED_PHASE,
            title: "Record local read result envelope creation execution attempt task shell and defer credential value reads, envelope creation, and provider egress",
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
    task[EXECUTION_ATTEMPT_TASK_FIELD] = {
      registry: EXECUTION_ATTEMPT_TASK_REGISTRY,
      sourceRegistry: EXECUTION_ATTEMPT_ROUTE_REGISTRY,
      sourceTaskId: route.summary?.sourceTaskId ?? null,
      implementationStatus: "task_shell_only",
      credentialReference: route.decision?.credentialReference ?? "openclaw://credential/provider/live-provider-fixture",
      [EXECUTION_FINAL_READINESS_RECORDED_FIELD]:
        route.summary?.[EXECUTION_FINAL_READINESS_RECORDED_FIELD] === true,
      [EXECUTION_ATTEMPT_TASK_CREATED_FIELD]: true,
      [EXECUTION_ATTEMPT_TASK_APPROVED_FIELD]: false,
      [EXECUTION_ATTEMPT_TASK_DEFERRED_FIELD]: true,
      ...deferredCredentialFlags(),
    };

    const approval = createApprovalRequestForTask(task, policyDecision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent("task.created", {
      task: serialiseTask(task),
      planner: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-task-v0",
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
      registry: EXECUTION_ATTEMPT_TASK_REGISTRY,
      mode: "approval-gated-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-task",
      generatedAt: new Date().toISOString(),
      sourceRegistry: EXECUTION_ATTEMPT_ROUTE_REGISTRY,
      route,
      task,
      approval,
      governance: liveProviderPhaseGovernance.phase132Governance({
        createsTask: true,
        createsApproval: true,
        [EXECUTION_ATTEMPT_TASK_CREATED_FIELD]: true,
      }),
    };
  }

  function isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTask(task) {
    return task?.type === EXECUTION_ATTEMPT_TASK_TYPE
      && task?.[EXECUTION_ATTEMPT_TASK_FIELD]?.registry === EXECUTION_ATTEMPT_TASK_REGISTRY;
  }

  async function executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTask(task) {
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
    task[EXECUTION_ATTEMPT_TASK_FIELD] = {
      ...(task[EXECUTION_ATTEMPT_TASK_FIELD] ?? {}),
      implementationStatus: "deferred_after_approval",
      approvedAt: approval.updatedAt,
      [EXECUTION_ATTEMPT_TASK_CREATED_FIELD]: true,
      [EXECUTION_ATTEMPT_TASK_APPROVED_FIELD]: true,
      [EXECUTION_ATTEMPT_TASK_DEFERRED_FIELD]: true,
      ...deferredCredentialFlags(),
    };
    appendTaskPhase(task, EXECUTION_ATTEMPT_TASK_DEFERRED_PHASE, {
      taskRegistry: EXECUTION_ATTEMPT_TASK_REGISTRY,
      recordedAt,
      sourcePhase: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_attempt_route",
      deferredSlice: EXECUTION_ATTEMPT_APPROVED_DEFERRED_SLUG,
      reason: "credential value local read result envelope creation execution attempt task shell approved; credential value read, result envelope creation, endpoint contact, and network egress remain deferred",
      [EXECUTION_ATTEMPT_TASK_CREATED_FIELD]: true,
      [EXECUTION_ATTEMPT_TASK_APPROVED_FIELD]: true,
      [EXECUTION_ATTEMPT_TASK_DEFERRED_FIELD]: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    });
    completeTask(task, {
      summary: "Approved credential value local read result envelope creation execution attempt task shell recorded; credential values remain unread and result envelopes remain uncreated.",
      taskRegistry: EXECUTION_ATTEMPT_TASK_REGISTRY,
      phase: EXECUTION_ATTEMPT_TASK_DEFERRED_PHASE,
      [EXECUTION_ATTEMPT_TASK_CREATED_FIELD]: true,
      [EXECUTION_ATTEMPT_TASK_APPROVED_FIELD]: true,
      [EXECUTION_ATTEMPT_TASK_DEFERRED_FIELD]: true,
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
      executor: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-task-v0",
      status: "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_attempt_task_shell_deferred_after_approval",
      task,
      governance: liveProviderPhaseGovernance.phase132Governance({
        createsTask: true,
        createsApproval: true,
        [EXECUTION_ATTEMPT_TASK_CREATED_FIELD]: true,
        [EXECUTION_ATTEMPT_TASK_APPROVED_FIELD]: true,
      }),
      summary: {
        ready: true,
        implementationStatus: "deferred_after_approval",
        [EXECUTION_ATTEMPT_TASK_CREATED_FIELD]: true,
        [EXECUTION_ATTEMPT_TASK_APPROVED_FIELD]: true,
        [EXECUTION_ATTEMPT_TASK_DEFERRED_FIELD]: true,
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

  return {
    createCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTask,
    isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTask,
    executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTask,
  };
}
