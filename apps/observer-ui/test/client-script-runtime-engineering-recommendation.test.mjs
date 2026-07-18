import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { observerClientRuntimeEngineeringRecommendationScript } from "../src/client-script-runtime-engineering-recommendation.mjs";

function element() {
  return { disabled: true, textContent: "" };
}

function createContext({ taskResponses = new Map() } = {}) {
  const nodes = {
    action: element(),
    review: element(),
    control: element(),
    button: element(),
    json: element(),
  };
  const calls = [];
  const messages = [];
  const recommendationLinks = [];
  const fetchCalls = [];
  const context = {
    GOVERNED_PLAN_TODO_SUGGESTION_CONTROLS: {
      create_verification_task: {
        controlId: "engineering-verification-task-button",
        capabilityId: "act.openclaw.engineering_tool.verify",
        requiresApproval: true,
        run: async () => calls.push("engineering-verification-task-button"),
      },
      observe_current_screen: {
        controlId: "invoke-screen-observation-button",
        capabilityId: "sense.screen.observe",
        requiresApproval: false,
        run: async () => calls.push("screenObservation"),
      },
      create_semantic_click_task: {
        controlId: "create-semantic-click-task-button",
        capabilityId: "plan.openclaw.browser.semantic_click_task",
        requiresApproval: true,
        run: async (link) => recommendationLinks.push(link),
      },
    },
    engineeringLoopStateRecommendation: nodes.action,
    engineeringLoopStateRecommendationReview: nodes.review,
    engineeringLoopStateRecommendationControl: nodes.control,
    engineeringLoopRecommendationUseButton: nodes.button,
    engineeringLoopRecommendationJson: nodes.json,
    formatError: (error) => String(error?.message ?? error),
    setControlMessage: (message) => messages.push(message),
    invokeCapabilityFromUi: async (key) => calls.push(key),
    createOperatorReviewedSemanticClickTask: async (link) => recommendationLinks.push(link),
    observerConfig: { coreUrl: "http://core.invalid" },
    fetchJson: async (url) => {
      fetchCalls.push(url);
      const taskId = decodeURIComponent(new URL(url).pathname.split("/").at(-1));
      if (!taskResponses.has(taskId)) {
        throw new Error(`Task ${taskId} is unavailable.`);
      }
      return { task: taskResponses.get(taskId) };
    },
    taskHistoryFocus: "latest-finished",
    selectedHistoryTaskId: null,
    latestHistoryTask: null,
    currentTaskState: null,
    taskDetailIdInput: element(),
    taskHistoryMeta: element(),
    taskHistoryJson: element(),
    formatTaskFocusLabel: (focus, task) => `${focus}:${task?.id ?? "none"}`,
    renderTaskSummary: (task) => `incident=${task?.outcome?.details?.incidentReceipt?.receiptHash ?? "none"}`,
    renderPlanPanel: () => {},
    renderEngineeringVerificationFollowupReadback: () => {},
    renderCommandTranscriptFromTask: () => {},
  };
  context.GOVERNED_PLAN_TODO_SUGGESTION_CONTROLS.review_systemd_incident_evidence = {
    controlId: "load-selected-task-button",
    capabilityId: null,
    requiresApproval: false,
    run: async (link) => context.reviewBoundSystemdIncidentEvidence(link),
  };
  vm.runInNewContext(observerClientRuntimeEngineeringRecommendationScript, context);
  return { context, nodes, calls, messages, recommendationLinks, fetchCalls };
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
  assert.match(fixture.messages.at(-1), /operator selection remains required/);
});

test("Observer uses the existing bounded screen capability for a reviewed screen recommendation", async () => {
  const fixture = createContext();
  fixture.context.renderEngineeringRecommendationFromOperatorResult({
    execution: {
      recommendation: validRecommendation({
        actionId: "observe_current_screen",
        label: "Observe the current trusted AI work view",
        reason: "Refresh the current work-view observation.",
        confidence: 0.84,
        existingObserverControlId: "invoke-screen-observation-button",
        existingCapabilityId: "sense.screen.observe",
        requiresApproval: false,
      }),
    },
  });

  assert.equal(fixture.nodes.action.textContent, "observe_current_screen");
  assert.equal(fixture.nodes.control.textContent, "invoke-screen-observation-button");
  assert.equal(fixture.nodes.button.disabled, false);

  await fixture.context.useEngineeringRecommendation();
  assert.deepEqual(fixture.calls, ["screenObservation"]);
  assert.equal(fixture.nodes.review.textContent, "operator selected");
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

test("Observer blocks a recommendation whose capability or approval contract diverges", () => {
  for (const overrides of [
    { existingCapabilityId: "sense.screen.observe" },
    { requiresApproval: false },
  ]) {
    const fixture = createContext();
    fixture.context.renderEngineeringRecommendationFromOperatorResult({
      execution: { recommendation: validRecommendation(overrides) },
    });

    assert.equal(fixture.nodes.button.disabled, true);
    assert.equal(JSON.parse(fixture.nodes.json.textContent).status, "invalid_transient_recommendation");
    assert.deepEqual(fixture.calls, []);
  }
});

test("Observer carries the completed provider source task into the reviewed semantic-click control", async () => {
  const fixture = createContext();
  fixture.context.renderEngineeringRecommendationFromOperatorResult({
    task: { id: "provider-task-42" },
    execution: {
      recommendation: validRecommendation({
        actionId: "create_semantic_click_task",
        label: "Create a reviewed semantic click task",
        reason: "The current work-view target matches the bounded recommendation.",
        existingObserverControlId: "create-semantic-click-task-button",
        existingCapabilityId: "plan.openclaw.browser.semantic_click_task",
      }),
    },
  });

  const readback = JSON.parse(fixture.nodes.json.textContent);
  assert.equal(readback.sourceTaskId, "provider-task-42");
  await fixture.context.useEngineeringRecommendation();

  assert.deepEqual(JSON.parse(JSON.stringify(fixture.recommendationLinks)), [{
    sourceTaskId: "provider-task-42",
    sourceRegistry: "openclaw-cloud-consciousness-live-provider-engineering-recommendation-v0",
    contract: "engineering_recommendation_v0",
    actionId: "create_semantic_click_task",
    expectedObserverControlId: "create-semantic-click-task-button",
    existingCapabilityId: "plan.openclaw.browser.semantic_click_task",
    requiresApproval: true,
    createsTaskAutomatically: false,
    createsApprovalAutomatically: false,
    executesAutomatically: false,
  }]);
});

test("Observer blocks a semantic-click recommendation without a provider source task", async () => {
  const fixture = createContext();
  fixture.context.renderEngineeringRecommendationFromOperatorResult({
    execution: {
      recommendation: validRecommendation({
        actionId: "create_semantic_click_task",
        existingObserverControlId: "create-semantic-click-task-button",
        existingCapabilityId: "plan.openclaw.browser.semantic_click_task",
      }),
    },
  });

  await assert.rejects(
    () => fixture.context.useEngineeringRecommendation(),
    /missing its completed provider source task/u,
  );
  assert.deepEqual(fixture.recommendationLinks, []);
});

function systemdIncidentTasks({ persistedActionId = "review_systemd_incident_evidence" } = {}) {
  const receiptHash = `sha256:${"a".repeat(64)}`;
  const incidentTask = {
    id: "incident-task-17",
    type: "system_repair_task",
    outcome: {
      details: {
        incidentReceipt: {
          registry: "openclaw-systemd-repair-incident-receipt-v0",
          taskId: "incident-task-17",
          receiptHash,
          target: { unit: "openclaw-event-hub.service" },
          restoredHealthy: true,
        },
        recoveryEvidence: { status: "restored" },
      },
    },
  };
  const providerTask = {
    id: "provider-task-17",
    cloudConsciousnessLiveProviderEgressExecution: {
      recommendation: {
        registry: "openclaw-cloud-consciousness-live-provider-engineering-recommendation-v0",
        contract: "engineering_recommendation_v0",
        valid: true,
        actionId: persistedActionId,
        existingObserverControlId: "load-selected-task-button",
        existingCapabilityId: null,
        requiresOperatorReview: true,
        requiresApproval: false,
      },
      responseContract: "engineering_recommendation_v0",
      contextPacket: {
        sourceTaskId: incidentTask.id,
        systemdIncidentReceiptHash: receiptHash,
      },
      systemdIncidentContext: {
        registry: "openclaw-systemd-incident-provider-context-v0",
        sourceTaskId: incidentTask.id,
        sourceReceiptHash: receiptHash,
        target: { unit: "openclaw-event-hub.service" },
      },
    },
  };
  return { providerTask, incidentTask };
}

test("Observer opens only the incident task bound to a reviewed systemd recommendation", async () => {
  const { providerTask, incidentTask } = systemdIncidentTasks();
  const fixture = createContext({
    taskResponses: new Map([
      [providerTask.id, providerTask],
      [incidentTask.id, incidentTask],
    ]),
  });
  fixture.context.renderEngineeringRecommendationFromOperatorResult({
    task: { id: providerTask.id },
    execution: {
      recommendation: validRecommendation({
        actionId: "review_systemd_incident_evidence",
        label: "Review the bound systemd incident receipt and recovery evidence",
        reason: "Review the fixed incident evidence before selecting another governed action.",
        existingObserverControlId: "load-selected-task-button",
        existingCapabilityId: null,
        requiresApproval: false,
      }),
    },
  });

  await fixture.context.useEngineeringRecommendation();

  assert.deepEqual(fixture.fetchCalls, [
    "http://core.invalid/tasks/provider-task-17",
    "http://core.invalid/tasks/incident-task-17",
  ]);
  assert.equal(fixture.context.selectedHistoryTaskId, incidentTask.id);
  assert.equal(fixture.context.taskDetailIdInput.value, incidentTask.id);
  assert.match(fixture.context.taskHistoryJson.textContent, /sha256:a{64}/u);
  assert.equal(fixture.nodes.review.textContent, "operator selected");
});

test("Observer rejects a mismatched stored systemd recommendation before changing task detail", async () => {
  const { providerTask, incidentTask } = systemdIncidentTasks({
    persistedActionId: "create_verification_task",
  });
  const fixture = createContext({
    taskResponses: new Map([
      [providerTask.id, providerTask],
      [incidentTask.id, incidentTask],
    ]),
  });
  fixture.context.taskDetailIdInput.value = "previous-task";
  fixture.context.renderEngineeringRecommendationFromOperatorResult({
    task: { id: providerTask.id },
    execution: {
      recommendation: validRecommendation({
        actionId: "review_systemd_incident_evidence",
        existingObserverControlId: "load-selected-task-button",
        existingCapabilityId: null,
        requiresApproval: false,
      }),
    },
  });

  await assert.rejects(
    () => fixture.context.useEngineeringRecommendation(),
    /not bound to one stored systemd incident context/u,
  );
  assert.deepEqual(fixture.fetchCalls, ["http://core.invalid/tasks/provider-task-17"]);
  assert.equal(fixture.context.taskDetailIdInput.value, "previous-task");
  assert.equal(fixture.context.selectedHistoryTaskId, null);
});

test("Observer rejects a changed incident receipt before changing task detail", async () => {
  const { providerTask, incidentTask } = systemdIncidentTasks();
  incidentTask.outcome.details.incidentReceipt.receiptHash = `sha256:${"b".repeat(64)}`;
  const fixture = createContext({
    taskResponses: new Map([
      [providerTask.id, providerTask],
      [incidentTask.id, incidentTask],
    ]),
  });
  fixture.context.taskDetailIdInput.value = "previous-task";
  fixture.context.renderEngineeringRecommendationFromOperatorResult({
    task: { id: providerTask.id },
    execution: {
      recommendation: validRecommendation({
        actionId: "review_systemd_incident_evidence",
        existingObserverControlId: "load-selected-task-button",
        existingCapabilityId: null,
        requiresApproval: false,
      }),
    },
  });

  await assert.rejects(
    () => fixture.context.useEngineeringRecommendation(),
    /incident receipt is unavailable or has changed/u,
  );
  assert.deepEqual(fixture.fetchCalls, [
    "http://core.invalid/tasks/provider-task-17",
    "http://core.invalid/tasks/incident-task-17",
  ]);
  assert.equal(fixture.context.taskDetailIdInput.value, "previous-task");
  assert.equal(fixture.context.selectedHistoryTaskId, null);
});
