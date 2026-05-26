const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_RUNTIME_IMPLEMENTATION_TASK_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-runtime-implementation-task-v0";

function phase18Governance(extra = {}) {
  return {
    phase: "phase-18",
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

export function createCloudLiveProviderRuntimeImplementation(deps) {
  const {
    buildRuntimeImplementationPlan,
    createTask,
    createApprovalRequestForTask,
    evaluatePolicyIntent,
    publishEvent,
    publishTaskApprovalIfPending,
    supersedeOtherActiveTasks,
    reconcileRuntimeState,
    persistState,
    serialiseTask,
  } = deps;

  async function createCloudConsciousnessLiveProviderRuntimeImplementationTask({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Cloud consciousness live provider runtime implementation task creation requires confirm=true.");
    }

    const implementationPlan = await buildRuntimeImplementationPlan();
    if (implementationPlan.summary?.ready !== true) {
      throw new Error("Cloud consciousness live provider runtime implementation task requires a ready Phase 17 implementation plan.");
    }

    const policyRequest = {
      intent: "cloud_consciousness.live_provider_call.runtime_implementation",
      domain: "cross_boundary",
      risk: "high",
      requiresApproval: true,
      audit: true,
      tags: ["cloud_consciousness", "live_provider_call", "runtime_implementation_shell", "operator_reviewed"],
    };
    const goal = "Prepare reviewed live provider-call runtime implementation task without enabling egress";
    const policyDecision = evaluatePolicyIntent({
      type: "cloud_consciousness_live_provider_runtime_implementation_task",
      goal,
      policy: policyRequest,
    }, {
      stage: "cloud_consciousness.live_provider_runtime_implementation_task.draft",
      type: "cloud_consciousness_live_provider_runtime_implementation_task",
      goal,
    });

    const task = createTask({
      goal,
      type: "cloud_consciousness_live_provider_runtime_implementation_task",
      workViewStrategy: "cloud-consciousness-live-provider-runtime-implementation",
      policy: policyRequest,
      plan: {
        planner: "cloud-consciousness-live-provider-runtime-implementation-task-v0",
        strategy: "approval-gated-cloud-consciousness-live-provider-runtime-implementation-shell",
        summary: "Create an approval-gated runtime implementation shell while keeping SDK, credential, endpoint, and network activity disabled.",
        governance: phase18Governance({ createsTask: true, createsApproval: true }),
        steps: [
          {
            id: "review-runtime-implementation-plan",
            phase: "review_live_provider_runtime_implementation_plan",
            title: "Review Phase 17 runtime implementation plan and launch-review evidence",
            status: "pending",
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before runtime implementation work can be considered",
            status: "pending",
            capabilityId: "act.system.command.dry_run",
            requiresApproval: true,
            risk: "high",
          },
          {
            id: "defer-runtime-implementation",
            phase: "cloud_consciousness_live_provider_runtime_implementation_deferred",
            title: "Record approved runtime implementation shell and defer SDK, credential, endpoint, and network work",
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
    task.cloudConsciousnessLiveProviderRuntimeImplementation = {
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_RUNTIME_IMPLEMENTATION_TASK_REGISTRY,
      implementationPlanRegistry: implementationPlan.registry,
      implementationStatus: "task_shell_only",
      providerSdkLoaded: false,
      providerCredentialRead: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      transmitsExternally: false,
      liveProviderCallEnabled: false,
    };

    const approval = createApprovalRequestForTask(task, policyDecision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent("task.created", {
      task: serialiseTask(task),
      planner: "cloud-consciousness-live-provider-runtime-implementation-task-v0",
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
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_RUNTIME_IMPLEMENTATION_TASK_REGISTRY,
      mode: "approval-gated-cloud-consciousness-live-provider-runtime-implementation-task",
      generatedAt: new Date().toISOString(),
      sourceRegistry: implementationPlan.registry,
      implementationPlan,
      task,
      approval,
      governance: phase18Governance({ createsTask: true, createsApproval: true }),
    };
  }

  return {
    createCloudConsciousnessLiveProviderRuntimeImplementationTask,
  };
}
