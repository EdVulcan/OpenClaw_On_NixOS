import * as liveProviderPhaseGovernance from "./cloud-live-provider-runtime-governance.mjs";

const EXECUTION_ROUTE_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-route-v0";
const EXECUTION_TASK_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-task-v0";
const EXECUTION_TASK_SLUG =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-task-shell";
const EXECUTION_APPROVED_DEFERRED_SLUG =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-approved-deferred";
const EXECUTION_TASK_TYPE =
  "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_task";
const EXECUTION_TASK_FIELD =
  "cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecution";
const EXECUTION_TASK_DEFERRED_PHASE =
  "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_task_shell_deferred";

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

export function createCredentialLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskShellRuntime(context) {
  const {
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionRoute,
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

  async function createCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTask({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read result envelope creation execution attempt local-read result envelope creation execution task creation requires confirm=true.");
    }

    const route = await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionRoute();
    if (route.summary?.ready !== true || route.next?.recommendedSlice !== EXECUTION_TASK_SLUG) {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read result envelope creation execution attempt local-read result envelope creation execution task requires a ready Phase 127 execution route.");
    }

    const policyRequest = {
      intent: "cloud_consciousness.live_provider_call.credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_task",
      domain: "cross_boundary",
      risk: "high",
      requiresApproval: true,
      audit: true,
      tags: ["cloud_consciousness", "live_provider_call", "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution", "operator_reviewed"],
    };
    const goal = "Prepare approval-gated credential value local read result envelope creation execution task shell without reading credential values or creating result envelopes";
    const policyDecision = evaluatePolicyIntent({
      type: EXECUTION_TASK_TYPE,
      goal,
      policy: policyRequest,
    }, {
      stage: "cloud_consciousness.live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_task.draft",
      type: EXECUTION_TASK_TYPE,
      goal,
    });

    const task = createTask({
      goal,
      type: EXECUTION_TASK_TYPE,
      workViewStrategy: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution",
      policy: policyRequest,
      plan: {
        planner: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-task-v0",
        strategy: "approval-gated-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-shell",
        summary: "Create an approval-gated credential value local read result envelope creation execution task shell while keeping credential values unread, result envelopes uncreated, and endpoint/network activity disabled.",
        governance: liveProviderPhaseGovernance.phase128Governance({
          createsTask: true,
          createsApproval: true,
          credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated: true,
        }),
        steps: [
          {
            id: "review-credential-value-local-read-result-envelope-creation-execution-route",
            phase: "review_live_provider_credential_value_local_read_result_envelope_creation_execution_route",
            title: "Review Phase 127 credential value local read result envelope creation execution route",
            status: "pending",
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before credential value local read result envelope creation execution shell can be recorded",
            status: "pending",
            capabilityId: "act.system.command.dry_run",
            requiresApproval: true,
            risk: "high",
          },
          {
            id: "defer-credential-value-local-read-result-envelope-creation-execution",
            phase: EXECUTION_TASK_DEFERRED_PHASE,
            title: "Record local read result envelope creation execution task shell and defer credential value reads, envelope creation, and provider egress",
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
    task[EXECUTION_TASK_FIELD] = {
      registry: EXECUTION_TASK_REGISTRY,
      sourceRegistry: EXECUTION_ROUTE_REGISTRY,
      sourceTaskId: route.summary?.sourceTaskId ?? null,
      implementationStatus: "task_shell_only",
      credentialReference: route.decision?.credentialReference ?? "openclaw://credential/provider/live-provider-fixture",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded:
        route.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded === true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskApproved: false,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionDeferred: true,
      ...deferredCredentialFlags(),
    };

    const approval = createApprovalRequestForTask(task, policyDecision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent("task.created", {
      task: serialiseTask(task),
      planner: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-task-v0",
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
      registry: EXECUTION_TASK_REGISTRY,
      mode: "approval-gated-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-task",
      generatedAt: new Date().toISOString(),
      sourceRegistry: EXECUTION_ROUTE_REGISTRY,
      route,
      task,
      approval,
      governance: liveProviderPhaseGovernance.phase128Governance({
        createsTask: true,
        createsApproval: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated: true,
      }),
    };
  }

  function isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTask(task) {
    return task?.type === EXECUTION_TASK_TYPE
      && task?.[EXECUTION_TASK_FIELD]?.registry === EXECUTION_TASK_REGISTRY;
  }

  async function executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTask(task) {
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
    task[EXECUTION_TASK_FIELD] = {
      ...(task[EXECUTION_TASK_FIELD] ?? {}),
      implementationStatus: "deferred_after_approval",
      approvedAt: approval.updatedAt,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionDeferred: true,
      ...deferredCredentialFlags(),
    };
    appendTaskPhase(task, EXECUTION_TASK_DEFERRED_PHASE, {
      taskRegistry: EXECUTION_TASK_REGISTRY,
      recordedAt,
      sourcePhase: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_route",
      deferredSlice: EXECUTION_APPROVED_DEFERRED_SLUG,
      reason: "credential value local read result envelope creation execution task shell approved; credential value read, result envelope creation, endpoint contact, and network egress remain deferred",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionDeferred: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    });
    completeTask(task, {
      summary: "Approved credential value local read result envelope creation execution task shell recorded; credential values remain unread and result envelopes remain uncreated.",
      taskRegistry: EXECUTION_TASK_REGISTRY,
      phase: EXECUTION_TASK_DEFERRED_PHASE,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionDeferred: true,
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
      executor: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-task-v0",
      status: "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_task_shell_deferred_after_approval",
      task,
      governance: liveProviderPhaseGovernance.phase128Governance({
        createsTask: true,
        createsApproval: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskApproved: true,
      }),
      summary: {
        ready: true,
        implementationStatus: "deferred_after_approval",
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskApproved: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionDeferred: true,
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
    createCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTask,
    isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTask,
    executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTask,
  };
}
