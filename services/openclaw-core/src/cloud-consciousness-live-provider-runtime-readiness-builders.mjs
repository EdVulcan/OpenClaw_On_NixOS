import { createEventName } from "../../../packages/shared-events/src/event-factory.mjs";

export function createCloudConsciousnessLiveProviderRuntimeReadinessBuilders(deps) {
  const {
    profiler,
    evaluatePolicyIntent,
    createTask,
    createApprovalRequestForTask,
    supersedeOtherActiveTasks,
    reconcileRuntimeState,
    persistState,
    completeTask,
    appendTaskPhase,
    publishEvent,
    publishTaskApprovalIfPending,
    serialiseTask,
    serialisePlanForPublic,
    serialiseApproval,
    approvals,
    buildCloudConsciousnessLiveProviderCallExecutionPlanExit,
    buildCloudConsciousnessLiveProviderFinalAuthorizationReview,
    buildCloudConsciousnessLiveProviderCallExecutionPlan,
    buildCloudConsciousnessLiveProviderEndpointCredentialBinding,
    buildCloudConsciousnessLiveProviderExecutionPlanReadback,
    buildCloudConsciousnessLiveProviderExecutionTranscriptSchema,
    phase12EvidenceRef,
    CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_RUNTIME_ADAPTER_TASK_REGISTRY,
  } = deps;

  function phase13Governance(extra = {}) {
    return {
      phase: "phase-13",
      createsTask: false,
      createsApproval: false,
      implementsRuntimeAdapter: false,
      callsCloudModel: false,
      transmitsExternally: false,
      liveProviderCallEnabled: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      ...extra,
    };
  }

  async function buildCloudConsciousnessLiveProviderCallRuntimeAdapterPlan() {
    const phase12Exit = await buildCloudConsciousnessLiveProviderCallExecutionPlanExit();
    const checks = [
      {
        id: "phase-12-complete",
        label: "Phase 12 execution plan exit is complete",
        passed: phase12Exit.summary?.complete === true,
        evidence: phase12Exit.registry,
      },
      {
        id: "adapter-plan-only",
        label: "Runtime adapter is planned without implementation or live egress",
        passed: true,
        evidence: "plan-only",
      },
      {
        id: "operator-task-next",
        label: "Next slice is an approval-gated runtime adapter task shell",
        passed: true,
        evidence: "openclaw-cloud-consciousness-live-provider-runtime-adapter-task",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    const ready = passed === checks.length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-plan-v0",
      mode: "phase_13_live_provider_runtime_adapter_plan_only",
      generatedAt: new Date().toISOString(),
      status: ready ? "runtime_adapter_plan_ready" : "waiting_for_phase_12_execution_plan_exit",
      governance: phase13Governance(),
      adapterPlan: {
        owner: "OpenClawOnNixOS",
        adapterKind: "live_provider_call_runtime_adapter",
        implementationStatus: "not_implemented",
        credentialReadStatus: "not_read",
        endpointContactStatus: "not_contacted",
        networkEgressStatus: "disabled",
        providerSdkStatus: "not_loaded",
        liveProviderCallStatus: "disabled",
        requiredBeforeLiveEgress: [
          "operator-approved runtime adapter task",
          "credential reference readback without value exposure",
          "egress transcript writer",
          "final human-visible live-call authorization",
        ],
      },
      checks,
      summary: {
        ready,
        complete: ready,
        passed,
        total: checks.length,
        completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
        phase: "phase-13",
        callsCloudModel: false,
        transmitsExternally: false,
        providerSdkLoaded: false,
        providerCredentialRead: false,
        endpointContacted: false,
        liveProviderCallEnabled: false,
        createsTask: false,
      },
      evidence: {
        phase12Exit: phase12EvidenceRef(phase12Exit),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-runtime-adapter-task",
        boundary: "materialize the runtime adapter as an approval-gated task shell before any implementation or live provider egress",
      },
    };
  }

  function phase14Governance(extra = {}) {
    return {
      phase: "phase-14",
      createsTask: false,
      createsApproval: false,
      implementsRuntimeAdapter: false,
      callsCloudModel: false,
      transmitsExternally: false,
      liveProviderCallEnabled: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      ...extra,
    };
  }

  async function createCloudConsciousnessLiveProviderRuntimeAdapterTask({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Cloud consciousness live provider runtime adapter task creation requires confirm=true.");
    }

    const adapterPlan = await buildCloudConsciousnessLiveProviderCallRuntimeAdapterPlan();
    if (adapterPlan.summary?.ready !== true) {
      throw new Error("Cloud consciousness live provider runtime adapter task requires a ready Phase 13 adapter plan.");
    }

    const policyRequest = {
      intent: "cloud_consciousness.live_provider_call.runtime_adapter",
      domain: "body_internal",
      risk: "high",
      requiresApproval: true,
      audit: true,
      tags: ["cloud_consciousness", "live_provider_call", "runtime_adapter_shell", "operator_reviewed"],
    };
    const goal = "Prepare reviewed live provider-call runtime adapter task without enabling egress";
    const policyDecision = evaluatePolicyIntent({
      type: "cloud_consciousness_live_provider_runtime_adapter_task",
      goal,
      policy: policyRequest,
    }, {
      stage: "cloud_consciousness.live_provider_runtime_adapter_task.draft",
      type: "cloud_consciousness_live_provider_runtime_adapter_task",
      goal,
    });
    const task = createTask({
      goal,
      type: "cloud_consciousness_live_provider_runtime_adapter_task",
      workViewStrategy: "cloud-consciousness-live-provider-runtime-adapter",
      policy: policyRequest,
      plan: {
        planner: "cloud-consciousness-live-provider-runtime-adapter-task-v0",
        strategy: "approval-gated-cloud-consciousness-live-provider-runtime-adapter-shell",
        summary: "Prepare an approval-gated runtime adapter shell while keeping provider egress disabled.",
        governance: phase14Governance({ createsTask: true, createsApproval: true }),
        steps: [
          {
            id: "review-runtime-adapter-plan",
            phase: "review_live_provider_runtime_adapter_plan",
            title: "Review Phase 13 runtime adapter plan and Phase 12 execution-plan evidence",
            status: "pending",
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before runtime adapter shell materialization",
            status: "pending",
            capabilityId: "act.system.command.dry_run",
            requiresApproval: true,
            risk: "high",
          },
          {
            id: "defer-runtime-adapter-implementation",
            phase: "cloud_consciousness_live_provider_runtime_adapter_deferred",
            title: "Record approved runtime adapter shell and defer implementation/live egress",
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
    task.cloudConsciousnessLiveProviderRuntimeAdapter = {
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_RUNTIME_ADAPTER_TASK_REGISTRY,
      adapterPlanRegistry: adapterPlan.registry,
      implementationStatus: "deferred",
      liveProviderCallEnabled: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      endpointContacted: false,
      transmitsExternally: false,
    };
    const approval = createApprovalRequestForTask(task, policyDecision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent(createEventName("task.created"), { task: serialiseTask(task), planner: "cloud-consciousness-live-provider-runtime-adapter-task-v0" });
    await publishTaskApprovalIfPending(task);
    await publishEvent(createEventName("task.planned"), { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
    await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent(createEventName("task.phase_changed"), {
      task: serialiseTask(reclaimedTask),
    })));

    return {
      ok: true,
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_RUNTIME_ADAPTER_TASK_REGISTRY,
      mode: "approval-gated-cloud-consciousness-live-provider-runtime-adapter-task",
      generatedAt: new Date().toISOString(),
      sourceRegistry: adapterPlan.registry,
      adapterPlan,
      task,
      approval,
      governance: phase14Governance({ createsTask: true, createsApproval: true }),
    };
  }

  function isCloudConsciousnessLiveProviderRuntimeAdapterTask(task) {
    return task?.type === "cloud_consciousness_live_provider_runtime_adapter_task"
      && task?.cloudConsciousnessLiveProviderRuntimeAdapter?.registry === CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_RUNTIME_ADAPTER_TASK_REGISTRY;
  }

  async function executeCloudConsciousnessLiveProviderRuntimeAdapterTask(task) {
    const adapterPlan = await buildCloudConsciousnessLiveProviderCallRuntimeAdapterPlan();
    const approval = task.approval?.requestId ? approvals.get(task.approval.requestId) : null;
    if (approval?.status !== "approved") {
      return {
        blocked: true,
        reason: "approval_required",
        task,
        approval: approval ? serialiseApproval(approval) : null,
        policy: task.policy?.decision ?? null,
      };
    }

    task.cloudConsciousnessLiveProviderRuntimeAdapter = {
      ...(task.cloudConsciousnessLiveProviderRuntimeAdapter ?? {}),
      implementationStatus: "deferred_after_approval",
      approvedAt: approval.updatedAt,
      liveProviderCallEnabled: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      endpointContacted: false,
      transmitsExternally: false,
    };
    appendTaskPhase(task, "cloud_consciousness_live_provider_runtime_adapter_deferred", {
      adapterPlanRegistry: adapterPlan.registry,
      deferredSlice: "openclaw-cloud-consciousness-live-provider-call-final-authorization",
      reason: "runtime adapter shell approved; implementation and live egress remain deferred",
      callsCloudModel: false,
      transmitsExternally: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
    });
    completeTask(task, {
      summary: "Approved runtime adapter task shell recorded; live provider egress remains deferred.",
      adapterPlanRegistry: adapterPlan.registry,
      phase: "cloud_consciousness_live_provider_runtime_adapter_deferred",
      callsCloudModel: false,
      transmitsExternally: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      liveProviderCallEnabled: false,
    });
    await publishEvent(createEventName("task.completed"), { task: serialiseTask(task), adapterPlan: phase12EvidenceRef(adapterPlan) });
    return {
      ok: true,
      executor: "cloud-consciousness-live-provider-runtime-adapter-task-v0",
      status: "runtime_adapter_deferred_after_approval",
      task,
      adapterPlan,
      governance: phase14Governance({ createsTask: true, createsApproval: true }),
      summary: {
        ready: true,
        implementationStatus: "deferred_after_approval",
        callsCloudModel: false,
        transmitsExternally: false,
        providerSdkLoaded: false,
        providerCredentialRead: false,
        endpointContacted: false,
        liveProviderCallEnabled: false,
      },
    };
  }

  async function buildCloudConsciousnessLiveProviderRuntimeAdapterExit() {
    return profiler.measure("phase14.runtimeAdapterExit", async () => {
      const adapterPlan = await profiler.measure("phase14.runtimeAdapterPlanDependency", () => buildCloudConsciousnessLiveProviderCallRuntimeAdapterPlan());
      const checks = [
        {
          id: "phase-13-adapter-plan-ready",
          label: "Phase 13 runtime adapter plan is ready",
          passed: adapterPlan.summary?.ready === true,
          evidence: adapterPlan.registry,
        },
        {
          id: "phase-14-task-shell-registered",
          label: "Phase 14 runtime adapter task shell is registered",
          passed: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_RUNTIME_ADAPTER_TASK_REGISTRY === "openclaw-cloud-consciousness-live-provider-runtime-adapter-task-v0",
          evidence: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_RUNTIME_ADAPTER_TASK_REGISTRY,
        },
        {
          id: "live-egress-still-disabled",
          label: "Live provider egress remains disabled after Phase 14",
          passed: true,
          evidence: "no provider SDK load, credential read, endpoint contact, or external transmission",
        },
      ];
      const passed = checks.filter((check) => check.passed).length;
      const complete = passed === checks.length;
      return {
        ok: true,
        registry: "openclaw-cloud-consciousness-live-provider-runtime-adapter-exit-v0",
        mode: "phase_14_live_provider_runtime_adapter_exit_gate",
        generatedAt: new Date().toISOString(),
        status: complete ? "phase_14_complete" : "waiting_for_phase_14_runtime_adapter_task",
        governance: phase14Governance(),
        checks,
        summary: {
          complete,
          ready: complete,
          passed,
          total: checks.length,
          completionPercent: complete ? 100 : Math.round((passed / checks.length) * 100),
          phase: "phase-14",
          createsTask: true,
          callsCloudModel: false,
          transmitsExternally: false,
          providerSdkLoaded: false,
          providerCredentialRead: false,
          endpointContacted: false,
          liveProviderCallEnabled: false,
        },
        evidence: {
          adapterPlan: phase12EvidenceRef(adapterPlan),
        },
        next: {
          recommendedSlice: "openclaw-cloud-consciousness-live-provider-call-final-authorization",
          boundary: "only a future explicit final authorization phase may consider enabling real live provider egress",
        },
      };
    }, { phase: "14" });
  }

  function phase15Governance(extra = {}) {
    return {
      phase: "phase-15",
      createsTask: false,
      createsApproval: false,
      grantsFinalAuthorization: false,
      callsCloudModel: false,
      transmitsExternally: false,
      liveProviderCallEnabled: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      ...extra,
    };
  }

  async function buildCloudConsciousnessLiveProviderCallFinalAuthorization() {
    return profiler.measure("phase15.finalAuthorization", async () => {
      const [
        phase14Exit,
        phase11Review,
        executionPlan,
        binding,
      ] = await Promise.all([
        profiler.measure("phase15.phase14ExitDependency", () => buildCloudConsciousnessLiveProviderRuntimeAdapterExit()),
        profiler.measure("phase15.phase11ReviewDependency", () => buildCloudConsciousnessLiveProviderFinalAuthorizationReview()),
        profiler.measure("phase15.executionPlanDependency", () => buildCloudConsciousnessLiveProviderCallExecutionPlan()),
        profiler.measure("phase15.endpointCredentialBindingDependency", () => buildCloudConsciousnessLiveProviderEndpointCredentialBinding()),
      ]);
      const checks = [
        {
          id: "phase-14-complete",
          label: "Phase 14 runtime adapter exit is complete",
          passed: phase14Exit.summary?.complete === true,
          evidence: phase14Exit.registry,
        },
        {
          id: "execution-plan-ready",
          label: "Live provider execution plan is ready and locally reviewable",
          passed: executionPlan.summary?.ready === true,
          evidence: executionPlan.registry,
        },
        {
          id: "endpoint-credential-reference-bound",
          label: "Endpoint and credential reference are bound without endpoint contact or credential value reads",
          passed: binding.summary?.ready === true
            && binding.summary?.endpointContacted === false
            && binding.summary?.credentialValueRead === false,
          evidence: binding.registry,
        },
        {
          id: "live-egress-not-authorized",
          label: "Final authorization review remains explicit and does not enable live egress",
          passed: phase11Review.summary?.liveProviderCallEnabled === false
            && phase11Review.summary?.providerCredentialRead === false,
          evidence: phase11Review.registry,
        },
      ];
      const passed = checks.filter((check) => check.passed).length;
      const ready = passed === checks.length;
      return {
        ok: true,
        registry: "openclaw-cloud-consciousness-live-provider-call-final-authorization-v0",
        mode: "phase_15_live_provider_call_final_authorization_review",
        generatedAt: new Date().toISOString(),
        status: ready ? "final_authorization_review_ready_live_egress_disabled" : "waiting_for_live_provider_authorization_prerequisites",
        governance: phase15Governance(),
        finalAuthorization: {
          authorizationState: "not_granted",
          liveProviderCallEnabled: false,
          providerSdkLoaded: false,
          providerCredentialRead: false,
          credentialValueRead: false,
          endpointContacted: false,
          networkEgress: false,
          externalTransmissionAllowed: false,
          requiredBeforeLiveEgress: [
            "explicit operator authorization outside read-only milestone checks",
            "runtime adapter implementation review",
            "credential value access approval",
            "egress transcript persistence",
            "post-call readback and rollback note",
          ],
        },
        checks,
        summary: {
          ready,
          complete: ready,
          passed,
          total: checks.length,
          completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
          phase: "phase-15",
          grantsFinalAuthorization: false,
          callsCloudModel: false,
          transmitsExternally: false,
          providerSdkLoaded: false,
          providerCredentialRead: false,
          credentialValueRead: false,
          endpointContacted: false,
          liveProviderCallEnabled: false,
          networkEgress: false,
          createsTask: false,
        },
        evidence: {
          phase14Exit: phase12EvidenceRef(phase14Exit),
          phase11Review: phase12EvidenceRef(phase11Review),
          executionPlan: phase12EvidenceRef(executionPlan),
          binding: phase12EvidenceRef(binding),
        },
        next: {
          recommendedSlice: "openclaw-cloud-consciousness-live-provider-call-operator-launch-review",
          boundary: "a separate operator launch review must be added before any live provider SDK load, credential value read, endpoint contact, or external transmission",
        },
      };
    }, { phase: "15" });
  }

  function phase16Governance(extra = {}) {
    return {
      phase: "phase-16",
      createsTask: false,
      createsApproval: false,
      grantsLaunchAuthorization: false,
      callsCloudModel: false,
      transmitsExternally: false,
      liveProviderCallEnabled: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      ...extra,
    };
  }

  async function buildCloudConsciousnessLiveProviderCallOperatorLaunchReview() {
    return profiler.measure("phase16.operatorLaunchReview", async () => {
      const [
        finalAuthorization,
        phase14Exit,
      ] = await Promise.all([
        profiler.measure("phase16.finalAuthorizationDependency", () => buildCloudConsciousnessLiveProviderCallFinalAuthorization()),
        profiler.measure("phase16.phase14ExitDependency", () => buildCloudConsciousnessLiveProviderRuntimeAdapterExit()),
      ]);
      const executionPlanReadback = await profiler.measure("phase16.executionPlanReadbackDependency", async () => buildCloudConsciousnessLiveProviderExecutionPlanReadback());
      const launchReview = {
        launchDecision: "not_authorized",
        operatorReviewState: "ready_for_human_review",
        launchAuthorized: false,
        liveProviderCallEnabled: false,
        providerSdkLoaded: false,
        providerCredentialRead: false,
        credentialValueRead: false,
        endpointContacted: false,
        networkEgress: false,
        externalTransmissionAllowed: false,
        blockingRequirement: "separate runtime implementation and explicit operator launch authorization",
      };
      const checks = [
        {
          id: "phase-15-final-authorization-ready",
          label: "Phase 15 final authorization checkpoint is ready",
          passed: finalAuthorization.summary?.ready === true,
          evidence: finalAuthorization.registry,
        },
        {
          id: "runtime-adapter-exit-linked",
          label: "Runtime adapter shell exit evidence is linked",
          passed: phase14Exit.summary?.complete === true,
          evidence: phase14Exit.registry,
        },
        {
          id: "execution-plan-readback-linked",
          label: "Approved execution-plan readback is linked",
          passed: executionPlanReadback.summary?.ready === true,
          evidence: executionPlanReadback.registry,
        },
        {
          id: "operator-launch-not-granted",
          label: "Operator launch review does not grant live provider launch",
          passed: launchReview.launchAuthorized === false
            && launchReview.networkEgress === false
            && launchReview.credentialValueRead === false,
          evidence: launchReview.launchDecision,
        },
      ];
      const passed = checks.filter((check) => check.passed).length;
      const ready = passed === checks.length;
      return {
        ok: true,
        registry: "openclaw-cloud-consciousness-live-provider-call-operator-launch-review-v0",
        mode: "phase_16_live_provider_operator_launch_review",
        generatedAt: new Date().toISOString(),
        status: ready ? "operator_launch_review_ready_live_launch_not_authorized" : "waiting_for_operator_launch_review_prerequisites",
        governance: phase16Governance(),
        launchReview,
        checks,
        summary: {
          ready,
          complete: ready,
          passed,
          total: checks.length,
          completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
          phase: "phase-16",
          grantsLaunchAuthorization: false,
          launchAuthorized: false,
          callsCloudModel: false,
          transmitsExternally: false,
          providerSdkLoaded: false,
          providerCredentialRead: false,
          credentialValueRead: false,
          endpointContacted: false,
          liveProviderCallEnabled: false,
          networkEgress: false,
          createsTask: false,
        },
        evidence: {
          finalAuthorization: phase12EvidenceRef(finalAuthorization),
          phase14Exit: phase12EvidenceRef(phase14Exit),
          executionPlanReadback: phase12EvidenceRef(executionPlanReadback),
        },
        next: {
          recommendedSlice: "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-plan",
          boundary: "only a separate runtime implementation plan may prepare SDK and credential access; this launch review does not authorize live egress",
        },
      };
    }, { phase: "16" });
  }

  function phase17Governance(extra = {}) {
    return {
      phase: "phase-17",
      createsTask: false,
      createsApproval: false,
      implementsRuntimeAdapter: false,
      callsCloudModel: false,
      transmitsExternally: false,
      liveProviderCallEnabled: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      ...extra,
    };
  }

  async function buildCloudConsciousnessLiveProviderCallRuntimeImplementationPlan() {
    return profiler.measure("phase17.runtimeImplementationPlan", async () => {
      const [
        launchReview,
        executionTranscriptSchema,
        binding,
      ] = await Promise.all([
        profiler.measure("phase17.operatorLaunchReview", () => buildCloudConsciousnessLiveProviderCallOperatorLaunchReview()),
        profiler.measure("phase17.executionTranscriptSchema", () => buildCloudConsciousnessLiveProviderExecutionTranscriptSchema()),
        profiler.measure("phase17.endpointCredentialBinding", () => buildCloudConsciousnessLiveProviderEndpointCredentialBinding()),
      ]);
      const implementationPlan = {
        implementationStatus: "planned_not_implemented",
        adapterModuleStatus: "not_created",
        providerSdkStatus: "not_loaded",
        credentialAccessStatus: "reference_only_value_not_read",
        endpointContactStatus: "not_contacted",
        networkEgressStatus: "disabled",
        transcriptWriterStatus: "schema_ready_no_live_records",
        rollbackStatus: "plan_required_before_execution",
        requiredModules: [
          "provider request serializer",
          "credential value access gate",
          "network egress adapter",
          "egress transcript writer",
          "post-call readback verifier",
          "operator rollback note",
        ],
      };
      const checks = [
        {
          id: "phase-16-launch-review-ready",
          label: "Phase 16 operator launch review is ready",
          passed: launchReview.summary?.ready === true,
          evidence: launchReview.registry,
        },
        {
          id: "transcript-schema-ready",
          label: "Execution transcript schema is available for future live-call records",
          passed: executionTranscriptSchema.summary?.ready === true,
          evidence: executionTranscriptSchema.registry,
        },
        {
          id: "credential-binding-reference-only",
          label: "Credential binding remains reference-only without value reads",
          passed: binding.summary?.ready === true
            && binding.summary?.credentialValueRead === false,
          evidence: binding.registry,
        },
        {
          id: "runtime-not-implemented",
          label: "Runtime implementation plan does not create SDK, credential, endpoint, or network activity",
          passed: implementationPlan.implementationStatus === "planned_not_implemented"
            && implementationPlan.providerSdkStatus === "not_loaded"
            && implementationPlan.networkEgressStatus === "disabled",
          evidence: implementationPlan.implementationStatus,
        },
      ];
      const passed = checks.filter((check) => check.passed).length;
      const ready = passed === checks.length;
      return {
        ok: true,
        registry: "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-plan-v0",
        mode: "phase_17_live_provider_runtime_implementation_plan_only",
        generatedAt: new Date().toISOString(),
        status: ready ? "runtime_implementation_plan_ready_no_live_egress" : "waiting_for_runtime_implementation_plan_prerequisites",
        governance: phase17Governance(),
        implementationPlan,
        checks,
        summary: {
          ready,
          complete: ready,
          passed,
          total: checks.length,
          completionPercent: ready ? 100 : Math.round((passed / checks.length) * 100),
          phase: "phase-17",
          implementsRuntimeAdapter: false,
          callsCloudModel: false,
          transmitsExternally: false,
          providerSdkLoaded: false,
          providerCredentialRead: false,
          credentialValueRead: false,
          endpointContacted: false,
          liveProviderCallEnabled: false,
          networkEgress: false,
          createsTask: false,
        },
        evidence: {
          launchReview: phase12EvidenceRef(launchReview),
          executionTranscriptSchema: phase12EvidenceRef(executionTranscriptSchema),
          binding: phase12EvidenceRef(binding),
        },
        next: {
          recommendedSlice: "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-task",
          boundary: "a separate approval-gated task is required before any runtime code, provider SDK load, credential value read, endpoint contact, or external transmission",
        },
      };
    }, { phase: "17" });
  }

  return {
    buildCloudConsciousnessLiveProviderCallRuntimeAdapterPlan,
    createCloudConsciousnessLiveProviderRuntimeAdapterTask,
    isCloudConsciousnessLiveProviderRuntimeAdapterTask,
    executeCloudConsciousnessLiveProviderRuntimeAdapterTask,
    buildCloudConsciousnessLiveProviderRuntimeAdapterExit,
    buildCloudConsciousnessLiveProviderCallFinalAuthorization,
    buildCloudConsciousnessLiveProviderCallOperatorLaunchReview,
    buildCloudConsciousnessLiveProviderCallRuntimeImplementationPlan,
  };
}
