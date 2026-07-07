import test from "node:test";
import assert from "node:assert/strict";

import { createTaskExecutor } from "../src/task-executor.mjs";

function createExecutorHarness(overrides = {}) {
  const state = {
    tasks: new Map(),
    approvals: new Map(),
    policyAuditLog: [],
    capabilityInvocationLog: [],
    runtimeState: {},
    persistState: () => {},
    updateRuntimeState: () => {},
    ...overrides.state,
  };

  const executor = createTaskExecutor({
    client: {
      sessionManagerUrl: "http://127.0.0.1:4102",
      screenSenseUrl: "http://127.0.0.1:4104",
      screenActUrl: "http://127.0.0.1:4105",
      systemSenseUrl: "http://127.0.0.1:4106",
      fetchJson: async () => ({ ok: true }),
      postJson: async () => ({ ok: true }),
    },
    state,
    taskManager: {
      serialiseTask: (task) => task,
      buildTaskSummary: () => ({ total: state.tasks.size }),
    },
    planBuilder: {},
    approvalEngine: {},
    workspaceOps: {},
    policyEvaluator: {},
    publishEvent: async () => {},
    ...overrides.deps,
  });

  return { executor, state };
}

test("command transcript read model sorts, classifies, and summarises task outcomes", () => {
  const { executor, state } = createExecutorHarness();
  state.tasks.set("task-old", {
    id: "task-old",
    goal: "Older transcript task",
    status: "completed",
    closedAt: "2026-07-08T00:00:00.000Z",
    sourceCommand: "openclaw old",
    outcome: {
      kind: "completed",
      details: {
        commandTranscript: [
          {
            stepId: "old-step",
            actionKind: "command",
            capabilityId: "act.command.exec",
            invocationId: "invoke-old",
            command: "echo old",
            exitCode: 0,
            stdout: "old\n",
          },
        ],
      },
    },
  });
  state.tasks.set("task-new", {
    id: "task-new",
    goal: "Newer transcript task",
    status: "failed",
    closedAt: "2026-07-08T01:00:00.000Z",
    outcome: {
      kind: "failed",
      details: {
        commandTranscript: [
          {
            stepId: "failed-step",
            actionKind: "command",
            capabilityId: "act.command.exec",
            command: "false",
            exitCode: 1,
            stderr: "failed\n",
          },
          {
            stepId: "skipped-step",
            command: "echo skipped",
            skipped: true,
            skipReason: "previous_exit_code_mismatch",
          },
        ],
      },
    },
  });

  const records = executor.listCommandTranscriptRecords({ limit: 10 });
  assert.deepEqual(records.map((record) => record.state), ["failed", "skipped", "executed"]);
  assert.deepEqual(records.map((record) => record.taskId), ["task-new", "task-new", "task-old"]);
  assert.equal(records[0].exitCode, 1);
  assert.equal(records[1].skipReason, "previous_exit_code_mismatch");

  const summary = executor.serialiseCommandTranscriptSummary(executor.buildCommandTranscriptSummary());
  assert.equal(summary.total, 3);
  assert.equal(summary.executed, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.taskCount, 2);
  assert.deepEqual(summary.taskIds, ["task-new", "task-old"]);
  assert.equal(summary.byCommand.false, 1);
  assert.equal(summary.byCommand["echo skipped"], 1);
  assert.equal(summary.byTaskStatus.completed, 1);
  assert.equal(summary.byTaskStatus.failed, 2);
  assert.equal(summary.latestAt, "2026-07-08T01:00:00.000Z");
});

test("filesystem invocation read models ignore blocked entries and count policy/task ids", () => {
  const { executor, state } = createExecutorHarness();
  state.capabilityInvocationLog.push(
    {
      id: "mkdir-1",
      at: "2026-07-08T00:01:00.000Z",
      invoked: true,
      blocked: false,
      capability: { id: "act.filesystem.mkdir" },
      request: { taskId: "task-a", path: "/tmp/openclaw" },
      summary: { path: "/tmp/openclaw", created: true, recursive: true },
      policy: { decision: "audit_only" },
    },
    {
      id: "write-1",
      at: "2026-07-08T00:02:00.000Z",
      invoked: true,
      capability: { id: "act.filesystem.write_text" },
      request: { taskId: "task-b", path: "/tmp/openclaw/file.txt" },
      summary: { path: "/tmp/openclaw/file.txt", contentBytes: 7, overwrite: true },
      policy: { decision: "require_approval" },
    },
    {
      id: "append-blocked",
      at: "2026-07-08T00:03:00.000Z",
      invoked: true,
      blocked: true,
      capability: { id: "act.filesystem.append_text" },
      request: { taskId: "task-c", path: "/tmp/openclaw/file.txt" },
      policy: { decision: "deny" },
    },
    {
      id: "read-1",
      at: "2026-07-08T00:04:00.000Z",
      invoked: true,
      capability: { id: "sense.filesystem.read" },
      request: { taskId: "task-a", operation: "read-text", path: "/tmp/openclaw/file.txt" },
      summary: { path: "/tmp/openclaw/file.txt", contentBytes: 7, encoding: "utf8" },
      policy: { decision: "audit_only" },
    },
    {
      id: "read-blocked",
      at: "2026-07-08T00:05:00.000Z",
      invoked: true,
      blocked: true,
      capability: { id: "sense.filesystem.read" },
      request: { taskId: "task-d", operation: "metadata", path: "/tmp/openclaw/file.txt" },
      policy: { decision: "deny" },
    },
  );

  const changes = executor.listFilesystemChangeRecords({ limit: 10 });
  assert.deepEqual(changes.map((record) => record.id), ["write-1", "mkdir-1"]);
  assert.deepEqual(changes.map((record) => record.change), ["write_text", "mkdir"]);

  const changeSummary = executor.serialiseFilesystemChangeSummary(executor.buildFilesystemChangeSummary());
  assert.equal(changeSummary.total, 2);
  assert.equal(changeSummary.mkdir, 1);
  assert.equal(changeSummary.write_text, 1);
  assert.equal(changeSummary.append_text, 0);
  assert.equal(changeSummary.taskCount, 2);
  assert.deepEqual(changeSummary.taskIds, ["task-b", "task-a"]);
  assert.equal(changeSummary.byPolicy.audit_only, 1);
  assert.equal(changeSummary.byPolicy.require_approval, 1);

  const reads = executor.listFilesystemReadRecords({ limit: 10 });
  assert.equal(reads.length, 1);
  assert.equal(reads[0].id, "read-1");
  assert.equal(reads[0].operation, "read_text");

  const readSummary = executor.serialiseFilesystemReadSummary(executor.buildFilesystemReadSummary());
  assert.equal(readSummary.total, 1);
  assert.equal(readSummary.read_text, 1);
  assert.equal(readSummary.metadata, 0);
  assert.equal(readSummary.taskCount, 1);
  assert.deepEqual(readSummary.taskIds, ["task-a"]);
  assert.equal(readSummary.byCapability["sense.filesystem.read"], 1);
  assert.equal(readSummary.byPolicy.audit_only, 1);
});
