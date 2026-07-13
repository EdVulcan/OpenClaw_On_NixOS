import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { observerClientRuntimeEngineeringRecommendationScript } from "../src/client-script-runtime-engineering-recommendation.mjs";

function element() {
  return { disabled: true, textContent: "" };
}

function createContext() {
  const nodes = {
    action: element(),
    review: element(),
    control: element(),
    button: element(),
    json: element(),
  };
  const calls = [];
  const messages = [];
  const context = {
    GOVERNED_PLAN_TODO_SUGGESTION_CONTROLS: {
      create_verification_task: {
        controlId: "engineering-verification-task-button",
        run: async () => calls.push("engineering-verification-task-button"),
      },
    },
    engineeringLoopStateRecommendation: nodes.action,
    engineeringLoopStateRecommendationReview: nodes.review,
    engineeringLoopStateRecommendationControl: nodes.control,
    engineeringLoopRecommendationUseButton: nodes.button,
    engineeringLoopRecommendationJson: nodes.json,
    formatError: (error) => String(error?.message ?? error),
    setControlMessage: (message) => messages.push(message),
  };
  vm.runInNewContext(observerClientRuntimeEngineeringRecommendationScript, context);
  return { context, nodes, calls, messages };
}

function validRecommendation(overrides = {}) {
  return {
    registry: "openclaw-cloud-consciousness-live-provider-engineering-recommendation-v0",
    contract: "engineering_recommendation_v0",
    actionId: "create_verification_task",
    label: "Create governed verification task",
    reason: "The current bounded evidence supports a verification task.",
    confidence: 0.88,
    existingObserverControlId: "engineering-verification-task-button",
    existingCapabilityId: "act.openclaw.engineering_tool.verify",
    requiresOperatorReview: true,
    requiresApproval: true,
    createsTaskAutomatically: false,
    createsApprovalAutomatically: false,
    executesAutomatically: false,
    ...overrides,
  };
}

test("Observer renders a valid transient recommendation and reuses the existing control", async () => {
  const fixture = createContext();
  fixture.context.renderEngineeringRecommendationFromOperatorResult({
    execution: { recommendation: validRecommendation() },
  });

  assert.equal(fixture.nodes.action.textContent, "create_verification_task");
  assert.equal(fixture.nodes.review.textContent, "required");
  assert.equal(fixture.nodes.control.textContent, "engineering-verification-task-button");
  assert.equal(fixture.nodes.button.disabled, false);
  assert.equal(JSON.parse(fixture.nodes.json.textContent).status, "valid_transient_recommendation");

  await fixture.context.useEngineeringRecommendation();
  assert.deepEqual(fixture.calls, ["engineering-verification-task-button"]);
  assert.equal(fixture.nodes.review.textContent, "operator selected");
  assert.match(fixture.messages.at(-1), /approval and operator execution remain required/);
});

test("Observer blocks an invalid recommendation before invoking any control", () => {
  const fixture = createContext();
  fixture.context.renderEngineeringRecommendationFromOperatorResult({
    execution: { recommendation: validRecommendation({ executesAutomatically: true }) },
  });

  assert.equal(fixture.nodes.action.textContent, "blocked");
  assert.equal(fixture.nodes.review.textContent, "blocked");
  assert.equal(fixture.nodes.button.disabled, true);
  assert.equal(JSON.parse(fixture.nodes.json.textContent).status, "invalid_transient_recommendation");
  assert.deepEqual(fixture.calls, []);
});
