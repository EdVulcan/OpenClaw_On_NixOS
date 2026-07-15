import test from "node:test";
import assert from "node:assert/strict";

import { createCapabilityRuntime } from "../src/capability-runtime.mjs";

function createHarness() {
  const events = [];
  const calls = { evidence: 0, task: 0 };
  const state = {
    tasks: new Map(),
    runtimeState: {},
    capabilityInvocationLog: [],
    MAX_CAPABILITY_INVOCATION_ENTRIES: 20,
    CAPABILITY_HEALTH_TIMEOUT_MS: 50,
    CROSS_BOUNDARY_INTENTS: new Set(),
    persistState: () => {},
  };
  const client = {
    eventHubUrl: "http://127.0.0.1:4201",
    sessionManagerUrl: "http://127.0.0.1:4202",
    browserRuntimeUrl: "http://127.0.0.1:4203",
    screenSenseUrl: "http://127.0.0.1:4204",
    screenActUrl: "http://127.0.0.1:4205",
    systemSenseUrl: "http://127.0.0.1:4206",
    systemHealUrl: "http://127.0.0.1:4207",
    fetchJson: async () => ({ ok: true }),
    postJson: async () => ({ ok: true }),
  };
  const runtime = createCapabilityRuntime({
    host: "127.0.0.1",
    port: 4200,
    client,
    state,
    pluginReview: {},
    taskManager: {},
    policyEvaluator: {
      evaluatePolicyIntent: (input) => ({
        id: "policy-plugin-refresh-test",
        decision: "audit_only",
        domain: input.domain,
        risk: input.risk,
        reason: "body_internal_audit",
        approved: input.approved,
      }),
      recordPolicyDecision: (decision) => decision,
      isPolicyExecutionAllowed: () => true,
    },
    pluginRuntime: {
      buildNativePluginRuntimeRefreshEvidence: () => {
        calls.evidence += 1;
        return {
          ok: true,
          registry: "openclaw-native-plugin-runtime-refresh-evidence-v0",
          runtimeState: {
            activeGenerationSequence: 1,
            activeLoader: false,
            loadedPluginModules: 0,
          },
          summary: {
            readModelRefreshed: true,
          },
          governance: {
            canCreateTask: false,
            canCreateApproval: false,
            canCallProvider: false,
            canImportModule: false,
            canExecutePluginCode: false,
            canActivateRuntime: false,
          },
        };
      },
      createNativePluginRuntimeRefreshTask: async ({ confirm }) => {
        calls.task += 1;
        assert.equal(confirm, true);
        return {
          ok: true,
          registry: "openclaw-native-plugin-runtime-refresh-task-v0",
          task: { id: "refresh-task-1", status: "pending" },
          approval: { id: "refresh-approval-1", status: "pending" },
          governance: {
            createsTask: true,
            createsApproval: true,
            canExecuteWithoutApproval: false,
            canImportModule: false,
            canExecutePluginCode: false,
            canActivateRuntime: false,
            canCallProvider: false,
          },
        };
      },
    },
    publishEvent: async (name, body) => events.push({ name, body }),
    fetchImpl: async () => ({
      ok: true,
      statusText: "OK",
      json: async () => ({ ok: true, service: "test-service" }),
    }),
    now: () => "2026-07-15T00:00:00.000Z",
  });
  return { runtime, state, events, calls };
}

test("capability runtime exposes fixed plugin refresh evidence", async () => {
  const { runtime, state, events, calls } = createHarness();
  const registry = await runtime.buildCapabilityRegistry();
  const capability = registry.capabilities.find((item) => item.id === "sense.openclaw.plugin_runtime.refresh_evidence");

  assert.equal(capability?.kind, "sensor");
  assert.equal(capability?.governance, "audit_only");
  assert.equal(capability?.available, true);

  const response = await runtime.invokeCapability({
    capabilityId: "sense.openclaw.plugin_runtime.refresh_evidence",
  });

  assert.equal(response.response.invoked, true);
  assert.equal(response.response.result.registry, "openclaw-native-plugin-runtime-refresh-evidence-v0");
  assert.equal(response.response.summary.kind, "plugin_runtime.refresh_evidence");
  assert.equal(response.response.summary.readModelRefreshed, true);
  assert.equal(response.response.summary.noTaskCreation, true);
  assert.equal(response.response.summary.noApprovalCreation, true);
  assert.equal(response.response.summary.noProviderEgress, true);
  assert.equal(calls.evidence, 1);
  assert.equal(calls.task, 0);
  assert.equal(state.capabilityInvocationLog.length, 1);
  assert.deepEqual(events.map((event) => event.name), ["policy.evaluated", "capability.invoked"]);
});

test("capability runtime keeps plugin refresh task creation explicitly confirmed", async () => {
  const { runtime, events, calls } = createHarness();

  const blocked = await runtime.invokeCapability({
    capabilityId: "act.openclaw.plugin_runtime.refresh_task",
    params: { confirm: false },
  });
  assert.equal(blocked.response.invoked, true);
  assert.equal(blocked.response.result.blocked, true);
  assert.equal(blocked.response.result.reason, "operator_confirmation_required");
  assert.equal(blocked.response.summary.kind, "plugin_runtime.refresh_task");
  assert.equal(blocked.response.summary.createsTask, false);
  assert.equal(calls.task, 0);

  const created = await runtime.invokeCapability({
    capabilityId: "act.openclaw.plugin_runtime.refresh_task",
    params: { confirm: true },
  });
  assert.equal(created.response.invoked, true);
  assert.equal(created.response.result.task.id, "refresh-task-1");
  assert.equal(created.response.result.approval.status, "pending");
  assert.equal(created.response.summary.createsTask, true);
  assert.equal(created.response.summary.createsApproval, true);
  assert.equal(created.response.summary.canExecuteWithoutApproval, false);
  assert.equal(created.response.summary.noProviderEgress, true);
  assert.equal(calls.task, 1);
  assert.deepEqual(events.map((event) => event.name), [
    "policy.evaluated",
    "capability.invoked",
    "policy.evaluated",
    "capability.invoked",
  ]);
});

test("capability runtime rejects a non-boolean plugin refresh confirmation", async () => {
  const { runtime, events, calls } = createHarness();
  const response = await runtime.invokeCapability({
    capabilityId: "act.openclaw.plugin_runtime.refresh_task",
    params: { confirm: "yes" },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.response.error, "Native plugin runtime refresh confirm must be a boolean.");
  assert.equal(calls.task, 0);
  assert.deepEqual(events, []);
});
