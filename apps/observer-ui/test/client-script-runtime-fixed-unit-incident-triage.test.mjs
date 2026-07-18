import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { observerClientRuntimeFixedUnitIncidentTriageScript } from "../src/client-script-runtime-fixed-unit-incident-triage.mjs";

function createContext() {
  const calls = [];
  const messages = [];
  const refreshes = [];
  const context = {
    observerConfig: { coreUrl: "http://core.invalid" },
    taskHistoryFocus: "latest-finished",
    selectedHistoryTaskId: null,
    taskDetailIdInput: { value: "" },
    fetchJson: async (url, options) => {
      calls.push({ url, options });
      return {
        task: { id: "triage-task-1", status: "completed" },
        governance: { createsApproval: false, executesRepair: false },
      };
    },
    setControlMessage: (message) => messages.push(message),
    refreshTaskList: async () => refreshes.push("tasks"),
    refreshTaskHistoryDetail: async () => refreshes.push("history"),
    refreshOperatorState: async () => refreshes.push("operator"),
  };
  vm.runInNewContext(observerClientRuntimeFixedUnitIncidentTriageScript, context);
  return { context, calls, messages, refreshes };
}

function incidentTask(overrides = {}) {
  return {
    id: "scheduled-task-1",
    type: "systemd_fixed_unit_incident_task",
    status: "completed",
    systemdIncidentObservation: {
      registry: "openclaw-fixed-unit-incident-observation-v0",
      health: { healthy: false },
    },
    ...overrides,
  };
}

test("Observer exposes triage only for a completed unhealthy scheduler incident", () => {
  const fixture = createContext();

  assert.equal(fixture.context.canCreateFixedUnitIncidentTriage(incidentTask()), true);
  assert.match(fixture.context.renderFixedUnitIncidentTriageAction(incidentTask()), /triage-fixed-unit-incident/u);
  assert.equal(fixture.context.renderFixedUnitIncidentTriageAction(incidentTask({ status: "queued" })), "");
  assert.equal(fixture.context.renderFixedUnitIncidentTriageAction(incidentTask({ type: "systemd_next_repair_task" })), "");
});

test("Observer creates one confirmed local triage task and opens its detail", async () => {
  const fixture = createContext();

  await fixture.context.createFixedUnitIncidentTriageTask("scheduled-task-1");

  assert.equal(fixture.calls[0].url, "http://core.invalid/system/systemd/fixed-unit-incident-triage-tasks");
  assert.deepEqual(JSON.parse(fixture.calls[0].options.body), {
    sourceTaskId: "scheduled-task-1",
    confirm: true,
  });
  assert.equal(fixture.context.taskHistoryFocus, "selected-task");
  assert.equal(fixture.context.selectedHistoryTaskId, "triage-task-1");
  assert.equal(fixture.context.taskDetailIdInput.value, "triage-task-1");
  assert.match(fixture.messages[0], /approvalCreated=false repairExecuted=false/u);
  assert.deepEqual(fixture.refreshes, ["tasks", "history", "operator"]);
});
