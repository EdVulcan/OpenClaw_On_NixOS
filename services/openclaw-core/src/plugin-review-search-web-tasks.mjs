export function createPluginReviewSearchWebTasks({
  buildOpenClawPluginSearchWebAdapterProviderRuntimeSandboxTaskDraft,
  buildOpenClawPluginSearchWebAdapterRuntimeActivationTaskDraft,
  buildOpenClawPluginSearchWebAdapterTaskDraft,
  createApprovalRequestForTask,
  createTask,
  persistState,
  publishEvent,
  publishTaskApprovalIfPending,
  reconcileRuntimeState,
  serialisePlanForPublic,
  serialiseTask,
  supersedeOtherActiveTasks,
} = {}) {
async function createOpenClawPluginSearchWebAdapterTask({
  workspacePath = null,
  providerContractId = null,
  query = "openclaw native integration",
  limit = 8,
  confirm = false,
} = {}) {
  if (confirm !== true) {
    throw new Error("Search/web adapter task creation requires confirm=true.");
  }

  const draft = buildOpenClawPluginSearchWebAdapterTaskDraft({
    workspacePath,
    providerContractId,
    query,
    limit,
  });
  const task = createTask({
    goal: draft.plan.goal,
    type: "openclaw_search_web_adapter_invocation",
    workViewStrategy: "openclaw-search-web-adapter",
    plan: draft.plan,
    policy: draft.policy.request,
  }, { skipInitialPolicy: true });
  task.policy = draft.policy;
  const approval = createApprovalRequestForTask(task, draft.policy.decision);
  const reclaimedTasks = supersedeOtherActiveTasks(task.id);
  reconcileRuntimeState();
  persistState();

  await publishEvent("task.created", { task: serialiseTask(task), planner: "openclaw-plugin-search-web-adapter-task-v0" });
  await publishTaskApprovalIfPending(task);
  await publishEvent("task.planned", { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
  await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
    task: serialiseTask(reclaimedTask),
  })));

  return {
    ok: true,
    registry: "openclaw-plugin-search-web-adapter-task-v0",
    mode: "approval-gated-search-web-task",
    generatedAt: new Date().toISOString(),
    sourceRegistry: draft.registry,
    adapter: draft.adapter,
    providerContract: draft.providerContract,
    query: draft.query,
    task,
    approval,
    governance: {
      mode: "plugin_search_web_adapter_task_approval_gated",
      runtimeOwner: "openclaw_on_nixos",
      createsTask: true,
      createsApproval: true,
      canExecuteWithoutApproval: false,
      canReadManifestMetadata: true,
      exposesManifestBodies: false,
      exposesAuthEnvVarNames: false,
      exposesEndpointHosts: false,
      exposesQueryContent: false,
      canUseNetwork: false,
      canImportModule: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
      canMutate: false,
      executed: false,
      requiresExplicitApprovalBeforeNetworkUse: true,
      requiresRuntimePreflightBeforeExecution: true,
    },
  };
}

async function createOpenClawPluginSearchWebAdapterRuntimeActivationTask({
  workspacePath = null,
  providerContractId = null,
  query = "openclaw native integration",
  limit = 8,
  confirm = false,
} = {}) {
  if (confirm !== true) {
    throw new Error("Search/web runtime activation task creation requires confirm=true.");
  }

  const draft = buildOpenClawPluginSearchWebAdapterRuntimeActivationTaskDraft({
    workspacePath,
    providerContractId,
    query,
    limit,
  });
  const task = createTask({
    goal: draft.plan.goal,
    type: "openclaw_search_web_runtime_activation",
    workViewStrategy: "openclaw-search-web-runtime-activation",
    plan: draft.plan,
    policy: draft.policy.request,
  }, { skipInitialPolicy: true });
  task.policy = draft.policy;
  const approval = createApprovalRequestForTask(task, draft.policy.decision);
  const reclaimedTasks = supersedeOtherActiveTasks(task.id);
  reconcileRuntimeState();
  persistState();

  await publishEvent("task.created", { task: serialiseTask(task), planner: "openclaw-plugin-search-web-adapter-runtime-activation-task-v0" });
  await publishTaskApprovalIfPending(task);
  await publishEvent("task.planned", { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
  await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
    task: serialiseTask(reclaimedTask),
  })));

  return {
    ok: true,
    registry: "openclaw-plugin-search-web-adapter-runtime-activation-task-v0",
    mode: "approval-gated-search-web-runtime-activation-task",
    generatedAt: new Date().toISOString(),
    sourceRegistry: draft.registry,
    sourceMode: draft.mode,
    adapter: draft.adapter,
    provider: draft.provider,
    query: draft.query,
    activationPlan: draft.activationPlan,
    task,
    approval,
    governance: {
      mode: "plugin_search_web_runtime_activation_task_approval_gated",
      runtimeOwner: "openclaw_on_nixos",
      createsTask: true,
      createsApproval: true,
      canExecuteWithoutApproval: false,
      canReadManifestMetadata: true,
      canResolveProviderMetadata: true,
      exposesManifestBodies: false,
      exposesAuthEnvVarNames: false,
      exposesEndpointHosts: false,
      exposesSourceFileContent: false,
      exposesQueryContent: false,
      canUseNetwork: false,
      canImportModule: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
      canMutate: false,
      executed: false,
      requiresExplicitApprovalBeforeNetworkRuntimeActivation: true,
      requiresRuntimeAdapterBeforeExecution: true,
    },
  };
}

async function createOpenClawPluginSearchWebAdapterProviderRuntimeSandboxTask({
  workspacePath = null,
  providerContractId = null,
  query = "openclaw native integration",
  limit = 8,
  confirm = false,
} = {}) {
  if (confirm !== true) {
    throw new Error("Search/web provider runtime sandbox task creation requires confirm=true.");
  }

  const draft = buildOpenClawPluginSearchWebAdapterProviderRuntimeSandboxTaskDraft({
    workspacePath,
    providerContractId,
    query,
    limit,
  });
  const task = createTask({
    goal: draft.plan.goal,
    type: "openclaw_search_web_provider_runtime_sandbox",
    workViewStrategy: "openclaw-search-web-provider-runtime-sandbox",
    plan: draft.plan,
    policy: draft.policy.request,
  }, { skipInitialPolicy: true });
  task.policy = draft.policy;
  const approval = createApprovalRequestForTask(task, draft.policy.decision);
  const reclaimedTasks = supersedeOtherActiveTasks(task.id);
  reconcileRuntimeState();
  persistState();

  await publishEvent("task.created", { task: serialiseTask(task), planner: "openclaw-plugin-search-web-adapter-provider-runtime-sandbox-task-v0" });
  await publishTaskApprovalIfPending(task);
  await publishEvent("task.planned", { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
  await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
    task: serialiseTask(reclaimedTask),
  })));

  return {
    ok: true,
    registry: "openclaw-plugin-search-web-adapter-provider-runtime-sandbox-task-v0",
    mode: "approval-gated-search-web-provider-runtime-sandbox-task",
    generatedAt: new Date().toISOString(),
    sourceRegistry: draft.registry,
    sourceMode: draft.mode,
    adapter: draft.adapter,
    provider: draft.provider,
    query: draft.query,
    sandboxContract: draft.sandboxContract,
    task,
    approval,
    governance: {
      mode: "plugin_search_web_provider_runtime_sandbox_task_approval_gated",
      runtimeOwner: "openclaw_on_nixos",
      createsTask: true,
      createsApproval: true,
      canExecuteWithoutApproval: false,
      canReadManifestMetadata: true,
      canResolveProviderMetadata: true,
      exposesManifestBodies: false,
      exposesAuthEnvVarNames: false,
      exposesEndpointHosts: false,
      exposesSourceFileContent: false,
      exposesQueryContent: false,
      canUseNetwork: false,
      canImportModule: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
      canMutate: false,
      executed: false,
      requiresExplicitApprovalBeforeProviderRuntimeSandbox: true,
      requiresRuntimeAdapterBeforeExecution: true,
    },
  };
}

  return {
    createOpenClawPluginSearchWebAdapterTask,
    createOpenClawPluginSearchWebAdapterRuntimeActivationTask,
    createOpenClawPluginSearchWebAdapterProviderRuntimeSandboxTask,
  };
}
