import test from "node:test";
import assert from "node:assert/strict";

import { createCapabilityRuntime } from "../src/capability-runtime.mjs";

function createRecoveryRuntime({ task, transcriptRecord, events, calls }) {
  const state = {
    tasks: new Map([[task.id, task]]),
    capabilityInvocationLog: [],
    MAX_CAPABILITY_INVOCATION_ENTRIES: 10,
    CAPABILITY_HEALTH_TIMEOUT_MS: 50,
    CROSS_BOUNDARY_INTENTS: new Set(),
    persistState: () => {},
  };
  const client = {
    eventHubUrl: "http://127.0.0.1:4101",
    sessionManagerUrl: "http://127.0.0.1:4102",
    browserRuntimeUrl: "http://127.0.0.1:4103",
    screenSenseUrl: "http://127.0.0.1:4104",
    screenActUrl: "http://127.0.0.1:4105",
    systemSenseUrl: "http://127.0.0.1:4106",
    systemHealUrl: "http://127.0.0.1:4107",
    fetchJson: async () => ({ ok: true }),
    postJson: async (url) => {
      calls.postJson.push(url);
      return { ok: true };
    },
  };
  const policyEvaluator = {
    evaluatePolicyIntent: (input) => ({
      id: "policy-recovery-test",
      decision: "audit_only",
      domain: input.domain,
      risk: input.risk,
      reason: "body_internal_audit",
      approved: input.approved,
    }),
    recordPolicyDecision: (decision) => decision,
    isPolicyExecutionAllowed: () => true,
  };

  return {
    state,
    events,
    runtime: createCapabilityRuntime({
      host: "127.0.0.1",
      port: 4100,
      client,
      state,
      pluginReview: {},
      taskManager: {},
      policyEvaluator,
      publishEvent: async (name, body) => events.push({ name, body }),
      fetchImpl: async () => ({
        ok: true,
        statusText: "OK",
        json: async () => ({ ok: true, service: "test-service" }),
      }),
      listCommandTranscriptRecords: ({ limit }) => {
        calls.transcriptLimits.push(limit);
        return [transcriptRecord];
      },
      now: () => "2026-07-15T00:00:00.000Z",
    }),
  };
}

test("capability runtime exposes read-only engineering recovery evidence", async () => {
  const outputSecret = "RECOVERY_OUTPUT_SECRET_DO_NOT_PERSIST";
  const taskId = "recovery-capability-task";
  const transcript = {
    taskId,
    taskStatus: "failed",
    taskOutcome: "failed",
    index: 0,
    state: "failed",
    command: "npm run typecheck",
    exitCode: 7,
    timedOut: false,
    stdout: outputSecret,
    stderr: "recoverable stderr",
  };
  const task = {
    id: taskId,
    status: "failed",
    targetUrl: "workspace://recovery-capability-task",
    sourceCommand: { registry: "openclaw-source-command-task-v0", command: "npm run typecheck" },
    outcome: {
      kind: "failed",
      details: {
        commandTranscript: [{
          command: transcript.command,
          exitCode: transcript.exitCode,
          timedOut: transcript.timedOut,
        }],
      },
    },
  };
  const events = [];
  const calls = { postJson: [], transcriptLimits: [] };
  const { runtime, state } = createRecoveryRuntime({ task, transcriptRecord: transcript, events, calls });

  const registry = await runtime.buildCapabilityRegistry();
  const capability = registry.capabilities.find((item) => item.id === "sense.openclaw.engineering_tool.recovery_evidence");
  assert.equal(capability?.kind, "sensor");
  assert.equal(capability?.governance, "audit_only");
  assert.equal(capability?.available, true);

  const response = await runtime.invokeCapability({
    capabilityId: "sense.openclaw.engineering_tool.recovery_evidence",
    taskId,
    params: { limit: 4, maxOutputChars: 200 },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.response.invoked, true);
  assert.equal(response.response.result.capability.id, "sense.openclaw.engineering_tool.recovery_evidence");
  assert.equal(response.response.result.summary.totalFailures, 1);
  assert.equal(response.response.result.summary.recoverableFailures, 1);
  assert.equal(response.response.result.failures[0].kind, "verification_command_exit_nonzero");
  assert.equal(response.response.result.failures[0].result.stdout, outputSecret);
  assert.equal(response.response.summary.kind, "engineering.recovery_evidence");
  assert.equal(response.response.summary.noRecoveryTaskCreation, true);
  assert.equal(response.response.summary.noApprovalCreation, true);
  assert.equal(response.response.summary.noCommandExecution, true);
  assert.equal(response.response.summary.noProviderEgress, true);
  assert.deepEqual(calls.transcriptLimits, [100]);
  assert.deepEqual(calls.postJson, []);
  assert.equal(task.status, "failed");
  assert.equal(JSON.stringify(state.capabilityInvocationLog).includes(outputSecret), false);
  assert.equal(JSON.stringify(events).includes(outputSecret), false);
  assert.deepEqual(events.map((event) => event.name), ["policy.evaluated", "capability.invoked"]);
});

test("capability runtime validates recovery task ids before reading ledgers", async () => {
  const events = [];
  const calls = { postJson: [], transcriptLimits: [] };
  const task = { id: "unused-task", status: "failed" };
  const { runtime, state } = createRecoveryRuntime({
    task,
    transcriptRecord: { taskId: task.id },
    events,
    calls,
  });

  const response = await runtime.invokeCapability({
    capabilityId: "sense.openclaw.engineering_tool.recovery_evidence",
    params: { taskId: 42 },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.response.error, "Engineering recovery evidence taskId must be a string.");
  assert.deepEqual(calls.transcriptLimits, []);
  assert.equal(state.capabilityInvocationLog.length, 0);
  assert.deepEqual(events, []);
});
