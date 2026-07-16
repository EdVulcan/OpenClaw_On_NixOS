import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { observerClientRuntimeEngineeringPlanScript } from "../src/client-script-runtime-engineering-plan.mjs";

function element() {
  return {
    disabled: true,
    textContent: "",
    listeners: new Map(),
    addEventListener(name, handler) {
      this.listeners.set(name, handler);
    },
  };
}

function validPlan(overrides = {}) {
  return {
    registry: "openclaw-cloud-consciousness-live-provider-engineering-plan-v0",
    contract: "engineering_plan_v0",
    planSummary: "Review bounded evidence before selecting the next governed step.",
    todos: [
      { id: "review", description: "Review the latest bounded evidence.", status: "pending" },
    ],
    requiresOperatorReview: true,
    createsTaskAutomatically: false,
    createsApprovalAutomatically: false,
    executesAutomatically: false,
    ...overrides,
  };
}

test("Observer renders and explicitly saves a transient AI plan through workbench storage", async () => {
  const status = element();
  const applyButton = element();
  const json = element();
  const calls = [];
  const context = {
    engineeringProviderPlanStatus: status,
    engineeringProviderPlanApplyButton: applyButton,
    engineeringProviderPlanJson: json,
    observerConfig: { coreUrl: "http://core.invalid" },
    formatError: (error) => String(error?.message ?? error),
    setControlMessage: (message) => calls.push(["message", message]),
    refreshEngineeringPlanTodoEvidence: async () => calls.push(["refresh"]),
    fetchJson: async (url, options) => {
      calls.push(["fetch", url, options]);
      return {
        invoked: true,
        result: { ok: true, record: { revision: 3 } },
      };
    },
  };

  vm.runInNewContext(observerClientRuntimeEngineeringPlanScript, context);
  context.renderEngineeringPlanFromOperatorResult({
    task: { id: "provider-task-1" },
    execution: {
      contextPacket: { sourceTaskId: "source-task-1" },
      plan: validPlan(),
    },
  });

  assert.equal(status.textContent, "ready_for_review");
  assert.equal(applyButton.disabled, false);
  assert.match(json.textContent, /transient_plan_ready_for_operator_review/);
  assert.match(json.textContent, /source-task-1/);

  await context.applyEngineeringPlanToWorkbench();
  const request = JSON.parse(calls.find(([kind]) => kind === "fetch")[2].body);
  assert.equal(request.capabilityId, "act.openclaw.engineering_context.plan_todo_workbench_state");
  assert.equal(request.approved, true);
  assert.equal(request.params.confirm, true);
  assert.equal(request.params.taskId, "source-task-1");
  assert.equal(request.params.source, "observer_ai_plan_review");
  assert.deepEqual(request.params.todos, [{
    id: "review",
    description: "Review the latest bounded evidence.",
    status: "pending",
  }]);
  assert.equal(status.textContent, "saved_revision_3");
  assert.deepEqual(calls.at(-1), ["refresh"]);
});

test("Observer blocks an AI plan with a path or automatic execution flag", () => {
  const status = element();
  const applyButton = element();
  const json = element();
  const context = {
    engineeringProviderPlanStatus: status,
    engineeringProviderPlanApplyButton: applyButton,
    engineeringProviderPlanJson: json,
    formatError: (error) => String(error?.message ?? error),
  };
  vm.runInNewContext(observerClientRuntimeEngineeringPlanScript, context);

  context.renderEngineeringPlanFromOperatorResult({
    task: { id: "provider-task-1" },
    execution: {
      contextPacket: { sourceTaskId: "source-task-1" },
      plan: validPlan({
        executesAutomatically: true,
        todos: [{ id: "unsafe", description: "Edit /tmp/project now." }],
      }),
    },
  });

  assert.equal(status.textContent, "blocked");
  assert.equal(applyButton.disabled, true);
  assert.match(json.textContent, /No workbench state was changed/);
});

test("Observer blocks a plan summary containing a path before workbench save", () => {
  const status = element();
  const applyButton = element();
  const json = element();
  const context = {
    engineeringProviderPlanStatus: status,
    engineeringProviderPlanApplyButton: applyButton,
    engineeringProviderPlanJson: json,
    formatError: (error) => String(error?.message ?? error),
  };
  vm.runInNewContext(observerClientRuntimeEngineeringPlanScript, context);

  context.renderEngineeringPlanFromOperatorResult({
    task: { id: "provider-task-1" },
    execution: {
      contextPacket: { sourceTaskId: "source-task-1" },
      plan: validPlan({ planSummary: "Review /tmp/project directly." }),
    },
  });

  assert.equal(status.textContent, "blocked");
  assert.equal(applyButton.disabled, true);
  assert.match(json.textContent, /No workbench state was changed/);
});
