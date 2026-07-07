import * as liveProviderPhaseGovernance from "./cloud-live-provider-runtime-governance.mjs";

const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_FINAL_READINESS_PREFLIGHT_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-final-readiness-preflight-v0";
const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_ROUTE_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-route-v0";
const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_TASK_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-task-v0";
const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_APPROVED_DEFERRED_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-approved-deferred-v0";
const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_FINAL_READINESS_PREFLIGHT_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-final-readiness-preflight-v0";

export function createCredentialLocalReadExecutionLocalReadAttemptLocalReadRuntime(context) {
  const {
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptFinalReadinessPreflight,
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

  async function buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadRoute() {
    const finalReadinessPreflight = await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptFinalReadinessPreflight();
    const decision = {
      decision: "route_to_approval_gated_credential_value_local_read_execution_local_read_attempt_local_read_task",
      selectedSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-task-shell",
      reason: "The local-read attempt final readiness preflight is recorded; the next whitepaper-aligned gate is a separate approval-gated bounded local-read task shell before any credential value can be read into a local-only result envelope.",
      requiredBeforeCredentialValueRead: [
        "separate approval-gated credential value local read attempt local-read task shell",
        "redaction-safe local read result envelope that never exposes the credential value to logs or Observer",
        "explicit proof that endpoint/network egress remains unauthorized",
        "provider request assembly and egress remain separately gated after local read evidence",
      ],
      credentialReference: finalReadinessPreflight.preflight?.credentialReference ?? "openclaw://credential/provider/live-provider-fixture",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: false,
      credentialValueRead: false,
      credentialValueIncluded: false,
      credentialValueExposed: false,
      providerCredentialRead: false,
    };
    const checks = [
      {
        id: "phase-94-local-read-attempt-final-readiness-preflight-recorded",
        label: "Phase 94 credential value local-read attempt final readiness preflight is recorded",
        passed: finalReadinessPreflight.summary?.ready === true
          && finalReadinessPreflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptFinalReadinessPreflightRecorded === true,
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
        id: "local-read-attempt-local-read-task-not-created",
        label: "Local-read attempt local-read route does not create a credential value local read task",
        passed: decision.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated === false,
        evidence: decision.selectedSlice,
      },
      {
        id: "no-endpoint-network-or-live-call",
        label: "Local-read attempt local-read route does not contact endpoints, transmit externally, or enable live provider calls",
        passed: finalReadinessPreflight.summary?.endpointContacted === false
          && finalReadinessPreflight.summary?.networkEgress === false
          && finalReadinessPreflight.summary?.transmitsExternally === false
          && finalReadinessPreflight.summary?.liveProviderCallEnabled === false,
        evidence: "credential_value_local_read_execution_local_read_attempt_local_read_route_only",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    const ready = passed === checks.length;
    return {
      ok: true,
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_ROUTE_REGISTRY,
      mode: "phase_95_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_route",
      generatedAt: new Date().toISOString(),
      status: ready ? "credential_value_local_read_execution_local_read_attempt_local_read_route_ready" : "waiting_for_phase_94_local_read_execution_local_read_attempt_final_readiness_preflight",
      governance: liveProviderPhaseGovernance.phase95Governance(),
      decision,
      checks,
      summary: {
        ready,
        complete: ready,
        passed,
        total: checks.length,
        completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
        phase: "phase-95",
        finalReadinessPreflightFound: finalReadinessPreflight.summary?.ready === true,
        credentialValueLocalReadExecutionLocalReadAttemptFinalReadinessPreflightRecorded: finalReadinessPreflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptFinalReadinessPreflightRecorded === true,
        sourceTaskId: finalReadinessPreflight.summary?.sourceTaskId ?? null,
        sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_FINAL_READINESS_PREFLIGHT_REGISTRY,
        selectedSlice: decision.selectedSlice,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: false,
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
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-task-shell",
        boundary: "credential value reads, local read result envelopes, endpoint contact, network egress, provider response creation, rollback execution, host mutation, and live provider calls remain separate future gates",
      },
    };
  }

  async function createCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read task creation requires confirm=true.");
    }

    const route = await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadRoute();
    if (route.summary?.ready !== true
      || route.next?.recommendedSlice !== "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-task-shell") {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read task requires a ready Phase 95 local-read route.");
    }

    const policyRequest = {
      intent: "cloud_consciousness.live_provider_call.credential_value_local_read_execution_local_read_attempt_local_read_task",
      domain: "cross_boundary",
      risk: "high",
      requiresApproval: true,
      audit: true,
      tags: ["cloud_consciousness", "live_provider_call", "credential_value_local_read_execution_local_read_attempt_local_read", "operator_reviewed"],
    };
    const goal = "Prepare approval-gated credential value local read execution local-read attempt local-read task shell without reading credential values";
    const policyDecision = evaluatePolicyIntent({
      type: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_task",
      goal,
      policy: policyRequest,
    }, {
      stage: "cloud_consciousness.live_provider_credential_value_local_read_execution_local_read_attempt_local_read_task.draft",
      type: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_task",
      goal,
    });

    const task = createTask({
      goal,
      type: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_task",
      workViewStrategy: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read",
      policy: policyRequest,
      plan: {
        planner: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-task-v0",
        strategy: "approval-gated-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-shell",
        summary: "Create an approval-gated credential value local read execution local-read attempt local-read task shell while keeping credential values unread and endpoint/network activity disabled.",
        governance: liveProviderPhaseGovernance.phase96Governance({ createsTask: true, createsApproval: true, credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: true }),
        steps: [
          {
            id: "review-credential-value-local-read-execution-local-read-attempt-local-read-route",
            phase: "review_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_route",
            title: "Review Phase 95 credential value local read execution local-read attempt local-read route",
            status: "pending",
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before credential value local read execution local-read attempt local-read shell can be recorded",
            status: "pending",
            capabilityId: "act.system.command.dry_run",
            requiresApproval: true,
            risk: "high",
          },
          {
            id: "defer-credential-value-local-read-execution-local-read-attempt-local-read",
            phase: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_task_shell_deferred",
            title: "Record local read execution local-read attempt local-read task shell and defer credential value reads",
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
    task.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalRead = {
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_TASK_REGISTRY,
      sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_ROUTE_REGISTRY,
      sourceTaskId: route.summary?.sourceTaskId ?? null,
      implementationStatus: "task_shell_only",
      credentialReference: route.decision?.credentialReference ?? "openclaw://credential/provider/live-provider-fixture",
      credentialValueLocalReadExecutionLocalReadAttemptFinalReadinessPreflightRecorded: route.summary?.credentialValueLocalReadExecutionLocalReadAttemptFinalReadinessPreflightRecorded === true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: false,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred: true,
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
      planner: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-task-v0",
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
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_TASK_REGISTRY,
      mode: "approval-gated-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-task",
      generatedAt: new Date().toISOString(),
      sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_ROUTE_REGISTRY,
      route,
      task,
      approval,
      governance: liveProviderPhaseGovernance.phase96Governance({ createsTask: true, createsApproval: true, credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: true }),
    };
  }

  function isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask(task) {
    return task?.type === "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_task"
      && task?.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalRead?.registry
        === CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_TASK_REGISTRY;
  }

  function findLatestApprovedDeferredCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask() {
    const candidates = (typeof listTasks === "function" ? listTasks() : [])
      .filter((task) => {
        const shell = task?.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalRead ?? {};
        return isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask(task)
          && task.status === "completed"
          && (shell.implementationStatus === "deferred_after_approval"
            || shell.implementationStatus === "credential_value_local_read_execution_local_read_attempt_local_read_final_readiness_preflight_recorded")
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated === true
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved === true
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred === true
          && shell.credentialValueIncluded === false
          && shell.credentialValueRead === false
          && shell.credentialValueExposed === false
          && shell.providerCredentialRead === false
          && shell.endpointContacted === false
          && shell.networkEgress === false
          && shell.liveProviderCallEnabled === false
          && task.outcome?.details?.phase === "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_task_shell_deferred";
      })
      .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
    return candidates[0]?.id ? getTaskById(candidates[0].id) ?? candidates[0] : null;
  }

  async function buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadApprovedDeferred() {
    const task = findLatestApprovedDeferredCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask();
    const shell = task?.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalRead ?? {};
    const checks = [
      {
        id: "credential-value-local-read-execution-local-read-attempt-local-read-task-approved",
        label: "Credential value local read execution local-read attempt local-read task shell was approved",
        passed: Boolean(task)
          && task.approval?.status === "approved"
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved === true,
        evidence: task?.approval?.requestId ?? null,
      },
      {
        id: "credential-value-local-read-execution-local-read-attempt-local-read-remains-deferred",
        label: "Approved credential value local read execution local-read attempt local-read remains deferred",
        passed: (shell.implementationStatus === "deferred_after_approval"
            || shell.implementationStatus === "credential_value_local_read_execution_local_read_attempt_local_read_final_readiness_preflight_recorded")
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred === true,
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
        label: "Approved deferred local-read evidence has no endpoint contact, network egress, or live provider call",
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
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_APPROVED_DEFERRED_REGISTRY,
      mode: "phase_97_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_approved_deferred",
      generatedAt: new Date().toISOString(),
      status: ready ? "credential_value_local_read_execution_local_read_attempt_local_read_approved_deferred_ready" : "waiting_for_phase_96_approved_deferred_local_read_execution_local_read_attempt_local_read_task_shell",
      governance: liveProviderPhaseGovernance.phase97Governance({
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved === true,
      }),
      checks,
      summary: {
        ready,
        complete: ready,
        passed,
        total: checks.length,
        completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
        phase: "phase-97",
        approvedDeferredEvidenceFound: Boolean(task),
        sourceTaskId: task?.id ?? null,
        sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_TASK_REGISTRY,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred === true,
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
        task: task ? serialiseTask(task) : null,
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-final-readiness-preflight",
        boundary: "actual credential value reads, local read result envelopes, endpoint contact, network egress, provider response creation, rollback execution, host mutation, and live provider calls remain separate future gates",
      },
    };
  }

  async function buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflight() {
    const approvedDeferred = await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadApprovedDeferred();
    const task = findLatestApprovedDeferredCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask();
    const shell = task?.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalRead ?? {};
    const preflight = {
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_FINAL_READINESS_PREFLIGHT_REGISTRY,
      sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_APPROVED_DEFERRED_REGISTRY,
      sourceTaskId: task?.id ?? null,
      preflightState: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded === true ? "recorded_deferred" : "ready_to_record_deferred",
      credentialReference: shell.credentialReference ?? "openclaw://credential/provider/live-provider-fixture",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded === true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved === true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred === true,
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
        id: "phase-97-local-read-approved-deferred-ready",
        label: "Phase 97 approved-deferred credential value local-read evidence is ready",
        passed: approvedDeferred.summary?.ready === true
          && approvedDeferred.summary?.approvedDeferredEvidenceFound === true
          && Boolean(task),
        evidence: task?.id ?? null,
      },
      {
        id: "local-read-approved-but-still-deferred",
        label: "Credential value local-read task is approved but remains deferred",
        passed: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved === true
          && shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred === true,
        evidence: shell.implementationStatus ?? null,
      },
      {
        id: "credential-value-local-read-final-readiness-preflight-state",
        label: "Final credential value local-read readiness preflight is local-only and does not read credentials",
        passed: preflight.credentialValueRead === false
          && preflight.credentialValueIncluded === false
          && preflight.credentialValueExposed === false
          && preflight.providerCredentialRead === false,
        evidence: preflight.preflightState,
      },
      {
        id: "no-endpoint-network-or-live-call",
        label: "Local-read final readiness preflight does not contact endpoints, transmit externally, or enable live provider calls",
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
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_FINAL_READINESS_PREFLIGHT_REGISTRY,
      mode: "phase_98_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_final_readiness_preflight",
      generatedAt: new Date().toISOString(),
      status: ready ? "credential_value_local_read_execution_local_read_attempt_local_read_final_readiness_preflight_ready_deferred" : "waiting_for_phase_97_local_read_execution_local_read_attempt_local_read_approved_deferred",
      governance: liveProviderPhaseGovernance.phase98Governance({
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded === true,
      }),
      preflight,
      checks,
      summary: {
        ready,
        complete: ready,
        passed,
        total: checks.length,
        completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
        phase: "phase-98",
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadApprovedDeferredRequired: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadApprovedDeferredFound: Boolean(task),
        sourceTaskId: task?.id ?? null,
        sourceRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_APPROVED_DEFERRED_REGISTRY,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved === true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred: shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred === true,
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
        localReadTask: task ? serialiseTask(task) : null,
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-route",
        boundary: "actual credential value reads, local read result envelopes, endpoint contact, network egress, provider response creation, rollback execution, host mutation, and live provider calls remain separate future gates",
      },
    };
  }

  async function recordCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflight({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read final readiness preflight requires confirm=true.");
    }

    const preflight = await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflight();
    if (preflight.summary?.credentialValueLocalReadExecutionLocalReadAttemptLocalReadApprovedDeferredFound !== true) {
      throw new Error("Cloud consciousness live provider credential value local read execution local-read attempt local-read final readiness preflight requires Phase 97 approved deferred local-read evidence.");
    }

    const task = findLatestApprovedDeferredCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask();
    if (!task) {
      throw new Error("Unable to locate approved deferred credential value local read execution local-read attempt local-read task for final readiness preflight.");
    }

    const recordedAt = new Date().toISOString();
    task.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalRead = {
      ...(task.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalRead ?? {}),
      implementationStatus: "credential_value_local_read_execution_local_read_attempt_local_read_final_readiness_preflight_recorded",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_FINAL_READINESS_PREFLIGHT_REGISTRY,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecordedAt: recordedAt,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflight: {
        ...preflight.preflight,
        preflightState: "recorded_deferred",
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded: true,
      },
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred: true,
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
    appendTaskPhase(task, "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_final_readiness_preflight", {
      preflightRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_FINAL_READINESS_PREFLIGHT_REGISTRY,
      recordedAt,
      sourcePhase: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_task_shell_deferred",
      preflight: {
        ...preflight.preflight,
        preflightState: "recorded_deferred",
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded: true,
      },
      nextSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-route",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded: true,
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
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_FINAL_READINESS_PREFLIGHT_REGISTRY,
      mode: "phase_98_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_final_readiness_preflight_recorded",
      generatedAt: recordedAt,
      status: "credential_value_local_read_execution_local_read_attempt_local_read_final_readiness_preflight_recorded_deferred",
      task: serialiseTask(task),
      preflight: await buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflight(),
      governance: liveProviderPhaseGovernance.phase98Governance({ credentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflightRecorded: true }),
    };
  }

  async function executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask(task) {
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
    task.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalRead = {
      ...(task.cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalRead ?? {}),
      implementationStatus: "deferred_after_approval",
      approvedAt: approval.updatedAt,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred: true,
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
    appendTaskPhase(task, "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_task_shell_deferred", {
      taskRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_TASK_REGISTRY,
      recordedAt,
      sourcePhase: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_route",
      deferredSlice: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-approved-deferred",
      reason: "credential value local read execution local-read attempt local-read task shell approved; credential value read remains deferred",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred: true,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    });
    completeTask(task, {
      summary: "Approved credential value local read execution local-read attempt local-read task shell recorded; credential values remain unread.",
      taskRegistry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_CREDENTIAL_VALUE_LOCAL_READ_EXECUTION_LOCAL_READ_ATTEMPT_LOCAL_READ_TASK_REGISTRY,
      phase: "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_task_shell_deferred",
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: true,
      credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred: true,
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
      executor: "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-task-v0",
      status: "credential_value_local_read_execution_local_read_attempt_local_read_task_shell_deferred_after_approval",
      task,
      governance: liveProviderPhaseGovernance.phase96Governance({
        createsTask: true,
        createsApproval: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: true,
      }),
      summary: {
        ready: true,
        implementationStatus: "deferred_after_approval",
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskCreated: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadTaskApproved: true,
        credentialValueLocalReadExecutionLocalReadAttemptLocalReadDeferred: true,
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
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadRoute,
    createCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask,
    isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask,
    executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadTask,
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadApprovedDeferred,
    buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflight,
    recordCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflight,
  };
}
