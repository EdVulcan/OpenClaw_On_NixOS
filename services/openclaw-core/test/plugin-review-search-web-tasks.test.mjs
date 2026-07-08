import test from "node:test";
import assert from "node:assert/strict";

import { createPluginReviewSearchWebTasks } from "../src/plugin-review-search-web-tasks.mjs";

function createDraft(registry, planGoal = "search web task") {
  return {
    registry,
    mode: "draft",
    adapter: {
      id: "openclaw.search_web.native-adapter",
    },
    provider: {
      id: "provider-1",
    },
    providerContract: {
      id: "provider-contract-1",
    },
    query: {
      present: true,
      contentExposed: false,
    },
    activationPlan: {
      registry: "openclaw-plugin-search-web-adapter-runtime-activation-plan-v0",
    },
    sandboxContract: {
      registry: "openclaw-plugin-search-web-adapter-provider-runtime-sandbox-v0",
    },
    plan: {
      goal: planGoal,
      steps: [],
    },
    policy: {
      request: {
        intent: "plugin.search_web",
      },
      decision: {
        decision: "requires_approval",
      },
    },
  };
}

function createSearchWebTaskHarness() {
  const events = [];
  const calls = {
    persisted: 0,
    reconciled: 0,
    approvalsPublished: 0,
  };
  let nextTask = 1;

  const builders = createPluginReviewSearchWebTasks({
    buildOpenClawPluginSearchWebAdapterTaskDraft: () => createDraft("openclaw-plugin-search-web-adapter-task-draft-v0"),
    buildOpenClawPluginSearchWebAdapterRuntimeActivationTaskDraft: () => createDraft("openclaw-plugin-search-web-adapter-runtime-activation-task-draft-v0", "runtime activation"),
    buildOpenClawPluginSearchWebAdapterProviderRuntimeSandboxTaskDraft: () => createDraft("openclaw-plugin-search-web-adapter-provider-runtime-sandbox-task-draft-v0", "provider sandbox"),
    createApprovalRequestForTask: (task, decision) => ({
      id: `approval-${task.id}`,
      taskId: task.id,
      decision,
    }),
    createTask: (task) => ({
      ...task,
      id: `task-${nextTask++}`,
      status: "queued",
    }),
    persistState: () => {
      calls.persisted += 1;
    },
    publishEvent: async (type, payload) => {
      events.push({ type, payload });
    },
    publishTaskApprovalIfPending: async () => {
      calls.approvalsPublished += 1;
    },
    reconcileRuntimeState: () => {
      calls.reconciled += 1;
    },
    serialisePlanForPublic: (plan) => ({
      goal: plan.goal,
    }),
    serialiseTask: (task) => ({
      id: task.id,
      type: task.type,
      status: task.status,
    }),
    supersedeOtherActiveTasks: () => [
      {
        id: "reclaimed-task",
        type: "old",
        status: "superseded",
      },
    ],
  });

  return { builders, calls, events };
}

test("plugin review search-web task builders enforce confirm and publish approval-gated tasks", async () => {
  const { builders, calls, events } = createSearchWebTaskHarness();

  await assert.rejects(
    () => builders.createOpenClawPluginSearchWebAdapterTask({ confirm: false }),
    /requires confirm=true/,
  );

  const adapter = await builders.createOpenClawPluginSearchWebAdapterTask({ confirm: true });
  const activation = await builders.createOpenClawPluginSearchWebAdapterRuntimeActivationTask({ confirm: true });
  const sandbox = await builders.createOpenClawPluginSearchWebAdapterProviderRuntimeSandboxTask({ confirm: true });

  assert.equal(adapter.registry, "openclaw-plugin-search-web-adapter-task-v0");
  assert.equal(adapter.task.type, "openclaw_search_web_adapter_invocation");
  assert.equal(adapter.governance.createsApproval, true);
  assert.equal(activation.registry, "openclaw-plugin-search-web-adapter-runtime-activation-task-v0");
  assert.equal(activation.task.type, "openclaw_search_web_runtime_activation");
  assert.equal(activation.governance.canUseNetwork, false);
  assert.equal(sandbox.registry, "openclaw-plugin-search-web-adapter-provider-runtime-sandbox-task-v0");
  assert.equal(sandbox.task.type, "openclaw_search_web_provider_runtime_sandbox");
  assert.equal(sandbox.governance.canActivateRuntime, false);
  assert.equal(calls.persisted, 3);
  assert.equal(calls.reconciled, 3);
  assert.equal(calls.approvalsPublished, 3);
  assert.equal(events.filter((event) => event.type === "task.created").length, 3);
  assert.equal(events.filter((event) => event.type === "task.planned").length, 3);
  assert.equal(events.filter((event) => event.type === "task.phase_changed").length, 3);
});
