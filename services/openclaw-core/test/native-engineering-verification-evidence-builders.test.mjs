import test from "node:test";
import assert from "node:assert/strict";

import { buildNativeEngineeringVerificationEvidence } from "../src/native-engineering-verification-evidence-builders.mjs";

function completedTask({ id = "task-1", transcript = [] } = {}) {
  return {
    id,
    status: "completed",
    goal: "Run verification",
    closedAt: "2026-07-09T06:00:00.000Z",
    sourceCommand: { registry: "openclaw-source-command-task-v0" },
    outcome: {
      kind: "completed",
      details: {
        commandTranscript: transcript,
      },
      at: "2026-07-09T06:00:00.000Z",
    },
  };
}

test("native engineering verification evidence attaches successful transcript to completed task", () => {
  const transcriptEntry = {
    invocationId: "invocation-1",
    command: "npm",
    exitCode: 0,
    timedOut: false,
    stdout: "verify ok\n",
    stderr: "",
  };
  const task = completedTask({ transcript: [transcriptEntry] });
  const response = buildNativeEngineeringVerificationEvidence({
    transcriptRecords: [{
      ...transcriptEntry,
      taskId: task.id,
      taskStatus: "completed",
      taskClosedAt: task.closedAt,
      sourceCommand: task.sourceCommand,
      taskOutcome: "completed",
      index: 0,
      state: "executed",
      capabilityId: "act.system.command.execute",
    }],
    capabilityInvocations: [{
      id: "invocation-1",
      capability: { id: "act.system.command.execute" },
      request: { taskId: task.id, command: "npm", cwd: "/tmp/openclaw" },
      summary: { exitCode: 0, timedOut: false },
    }],
    tasks: new Map([[task.id, task]]),
    taskId: task.id,
  });

  assert.equal(response.ok, true);
  assert.equal(response.registry, "openclaw-native-engineering-verification-evidence-v0");
  assert.equal(response.sourceCapability.sourceToolName, "cc_verify");
  assert.equal(response.capability.id, "sense.openclaw.engineering_tool.verify_evidence");
  assert.equal(response.governance.canExecuteCommand, false);
  assert.equal(response.governance.canCreateTask, false);
  assert.equal(response.summary.total, 1);
  assert.equal(response.summary.passed, 1);
  assert.equal(response.evidence[0].ok, true);
  assert.equal(response.evidence[0].commandShape.command, "npm");
  assert.equal(response.evidence[0].commandShape.cwd, "/tmp/openclaw");
  assert.equal(response.evidence[0].attachment.attachedToTaskCompletion, true);
  assert.equal(response.evidence[0].validation.failedChecks.length, 0);
  assert.equal(response.auditEvidence.evidenceKind, "response_embedded_audit_evidence");
});

test("native engineering verification evidence records failures and output budgets", () => {
  const transcriptEntry = {
    invocationId: "invocation-2",
    command: "npm",
    exitCode: 7,
    timedOut: false,
    stdout: "0123456789",
    stderr: "stderr",
  };
  const task = completedTask({ id: "task-2", transcript: [transcriptEntry] });
  const response = buildNativeEngineeringVerificationEvidence({
    transcriptRecords: [{
      ...transcriptEntry,
      taskId: task.id,
      taskStatus: "completed",
      taskClosedAt: task.closedAt,
      taskOutcome: "completed",
      index: 0,
      state: "failed",
      capabilityId: "act.system.command.execute",
    }],
    tasks: [task],
    maxOutputChars: 5,
  });

  assert.equal(response.summary.total, 1);
  assert.equal(response.summary.failed, 1);
  assert.equal(response.summary.outputTruncated, 1);
  assert.equal(response.evidence[0].ok, false);
  assert.equal(response.evidence[0].result.stdout, "01234");
  assert.equal(response.evidence[0].result.stderr, "");
  assert.equal(response.evidence[0].result.outputTruncated, true);
  assert.equal(
    response.evidence[0].validation.failedChecks.some((check) => check.name === "exit_code_zero"),
    true,
  );
});

test("native engineering verification evidence filters by task id without executing", () => {
  const response = buildNativeEngineeringVerificationEvidence({
    transcriptRecords: [
      { taskId: "task-a", index: 0, command: "npm", exitCode: 0, timedOut: false, stdout: "a", stderr: "" },
      { taskId: "task-b", index: 0, command: "npm", exitCode: 0, timedOut: false, stdout: "b", stderr: "" },
    ],
    tasks: new Map(),
    taskId: "task-b",
    limit: 99,
  });

  assert.equal(response.query.limit, 50);
  assert.equal(response.summary.total, 1);
  assert.equal(response.evidence[0].taskId, "task-b");
  assert.equal(response.governance.canExecuteCommand, false);
  assert.equal(response.deferredExecutionBoundaries.includes("no shell invocation"), true);
});
