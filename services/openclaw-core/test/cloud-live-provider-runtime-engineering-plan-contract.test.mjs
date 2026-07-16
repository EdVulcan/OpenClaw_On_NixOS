import test from "node:test";
import assert from "node:assert/strict";

import {
  CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_CONTRACT,
  CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_REGISTRY,
  buildCloudLiveProviderEngineeringPlanInstruction,
  parseCloudLiveProviderEngineeringPlan,
} from "../src/cloud-live-provider-runtime-engineering-plan-contract.mjs";

function planPayload(overrides = {}) {
  return {
    planSummary: "Review bounded evidence and prepare the next governed engineering step.",
    todos: [
      { id: "review-evidence", description: "Review the latest bounded verification evidence." },
      { id: "select-check", description: "Select one existing governed check for the current task." },
    ],
    requiresOperatorReview: true,
    ...overrides,
  };
}

test("engineering plan instruction keeps the response bounded and review-only", () => {
  const instruction = buildCloudLiveProviderEngineeringPlanInstruction();

  assert.match(instruction, /planSummary/);
  assert.match(instruction, /1 to 8/);
  assert.match(instruction, /requiresOperatorReview must be true/);
  assert.match(instruction, /file paths, URLs, credentials/);
});

test("valid engineering plan is normalised for explicit workbench review", () => {
  const result = parseCloudLiveProviderEngineeringPlan({
    contract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_CONTRACT,
    assistantContent: JSON.stringify(planPayload()),
    responseContentHash: "a".repeat(64),
  });

  assert.equal(result.ok, true);
  assert.equal(result.plan.registry, CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_REGISTRY);
  assert.equal(result.plan.todos.length, 2);
  assert.equal(result.plan.todos[0].status, "pending");
  assert.equal(result.plan.todos[0].source, "provider_transient_plan");
  assert.equal(result.plan.createsTaskAutomatically, false);
  assert.equal(result.evidence.planTodoCount, 2);
  assert.equal(result.evidence.contentIncluded, false);
  assert.equal(result.evidence.responseContentHash, "a".repeat(64));
});

test("fenced JSON plans are accepted while content remains out of evidence", () => {
  const result = parseCloudLiveProviderEngineeringPlan({
    contract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_CONTRACT,
    assistantContent: `\n\`\`\`json\n${JSON.stringify(planPayload())}\n\`\`\`\n`,
    responseContentHash: "b".repeat(64),
  });

  assert.equal(result.ok, true);
  assert.equal(result.plan.todos[1].id, "select-check");
  assert.doesNotMatch(JSON.stringify(result.evidence), /Review the latest/);
});

test("paths, unknown keys, duplicate ids, and automatic review bypasses fail closed", () => {
  for (const [payload, reason] of [
    [planPayload({ planSummary: "Edit /tmp/project directly." }), "provider_engineering_plan_fields_invalid"],
    [planPayload({ command: "rm -rf" }), "provider_engineering_plan_keys_not_allowed"],
    [planPayload({ todos: [{ id: "same", description: "First" }, { id: "same", description: "Second" }] }), "provider_engineering_plan_todo_fields_invalid"],
    [planPayload({ requiresOperatorReview: false }), "provider_engineering_plan_fields_invalid"],
  ]) {
    const result = parseCloudLiveProviderEngineeringPlan({
      contract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_CONTRACT,
      assistantContent: JSON.stringify(payload),
      responseContentHash: "c".repeat(64),
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
    assert.equal(result.evidence.contentIncluded, false);
  }
});

test("unsupported contracts and empty responses fail closed", () => {
  const unsupported = parseCloudLiveProviderEngineeringPlan({
    contract: "engineering_plan_v99",
    assistantContent: JSON.stringify(planPayload()),
  });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.reason, "provider_engineering_plan_contract_not_supported");

  const empty = parseCloudLiveProviderEngineeringPlan({
    contract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_CONTRACT,
    assistantContent: "",
  });
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, "provider_engineering_plan_empty_response");
});
