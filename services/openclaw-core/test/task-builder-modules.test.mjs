import test from "node:test";
import assert from "node:assert/strict";

import { createBodyEvidenceTaskBuilders } from "../src/body-evidence-task-builders.mjs";
import { createSystemdTaskBuilders } from "../src/systemd-task-builders.mjs";

function createTaskLifecycleHarness(overrides = {}) {
  const calls = [];
  const events = [];
  const fetchUrls = [];
  let taskCounter = 0;
  const deps = {
    fetchJson: async (url) => {
      fetchUrls.push(url);
      return overrides.fetchJson ? overrides.fetchJson(url) : {};
    },
    systemSenseUrl: "http://127.0.0.1:4106",
    evaluatePolicyIntent: (input, context) => ({
      id: `policy-${context.stage}`,
      decision: "require_approval",
      domain: input.policy?.domain ?? "body_internal",
      risk: input.policy?.risk ?? "medium",
      reason: "approval_required",
      approved: false,
      autonomyMode: "guardian",
      autonomous: false,
      input,
      context,
    }),
    createTask: (input, options) => {
      calls.push({ name: "createTask", input, options });
      taskCounter += 1;
      return {
        id: `task-${taskCounter}`,
        phase: "queued",
        ...input,
      };
    },
    createApprovalRequestForTask: (task, policy) => {
      calls.push({ name: "createApprovalRequestForTask", taskId: task.id, policy });
      const approval = {
        id: `approval-${task.id}`,
        status: "pending",
        required: true,
      };
      task.approval = approval;
      return approval;
    },
    supersedeOtherActiveTasks: () => {
      calls.push({ name: "supersedeOtherActiveTasks" });
      return [{ id: "reclaimed-task", type: "old_task", phase: "superseded" }];
    },
    reconcileRuntimeState: () => {
      calls.push({ name: "reconcileRuntimeState" });
    },
    persistState: () => {
      calls.push({ name: "persistState" });
    },
    publishEvent: async (name, body) => {
      events.push({ name, body });
    },
    publishTaskApprovalIfPending: async (task) => {
      events.push({ name: "approval.pending", body: { taskId: task.id } });
    },
    serialiseTask: (task) => ({
      id: task.id,
      type: task.type,
      goal: task.goal,
      phase: task.phase,
      approval: task.approval ?? null,
      policy: task.policy ?? null,
      plan: task.plan ?? null,
      systemdRepair: task.systemdRepair ?? null,
      systemdNextRepair: task.systemdNextRepair ?? null,
      bodyEvidenceLedgerDirectory: task.bodyEvidenceLedgerDirectory ?? null,
      bodyEvidenceLedgerFirstRecord: task.bodyEvidenceLedgerFirstRecord ?? null,
      bodyEvidenceLedgerFollowupRecord: task.bodyEvidenceLedgerFollowupRecord ?? null,
    }),
    serialisePlanForPublic: (plan) => plan,
    SYSTEMD_REPAIR_EXECUTION_TASK_REGISTRY: "openclaw-systemd-repair-execution-task-v0",
    SYSTEMD_NEXT_REPAIR_TASK_SHELL_REGISTRY: "openclaw-systemd-next-repair-task-shell-v0",
    SYSTEMD_NEXT_REPAIR_REAL_EXECUTION_REGISTRY: "openclaw-systemd-next-repair-real-execution-v0",
    SYSTEMD_REPAIR_REAL_EXECUTION_UNIT: "openclaw-browser-runtime.service",
    SYSTEMD_REPAIR_RESTART_HELPER: "/run/current-system/sw/bin/openclaw-systemd-restart-openclaw-browser-runtime",
    SYSTEMD_REPAIR_AUTH_DELEGATION: "sudo-nopasswd-fixed-helper",
    ...overrides.deps,
  };

  return { deps, calls, events, fetchUrls };
}

function createSystemdDryRunEnvelope(unit = "openclaw-browser-runtime.service") {
  return {
    ok: true,
    registry: "openclaw-systemd-repair-dry-run-v0",
    target: { unit },
    source: {
      inventoryRegistry: "openclaw-systemd-unit-inventory-v0",
      planRegistry: "openclaw-systemd-repair-plan-v0",
    },
    plan: {
      registry: "openclaw-systemd-repair-plan-v0",
      source: { inventoryRegistry: "openclaw-systemd-unit-inventory-v0" },
    },
    dryRun: {
      command: "systemctl",
      args: ["restart", unit],
    },
  };
}

test("systemd task builders create draft envelopes and preserve real-execution guard", async () => {
  const { deps, fetchUrls } = createTaskLifecycleHarness({
    fetchJson: () => createSystemdDryRunEnvelope(),
  });
  const builders = createSystemdTaskBuilders(deps);

  const draft = await builders.buildSystemdRepairExecutionTaskDraft({
    unit: "openclaw-browser-runtime",
  });

  assert.equal(fetchUrls[0], "http://127.0.0.1:4106/system/systemd/repair-dry-run?unit=openclaw-browser-runtime.service");
  assert.equal(draft.registry, "openclaw-systemd-repair-execution-task-v0");
  assert.equal(draft.mode, "operator-reviewed-execution-task-draft");
  assert.equal(draft.draft.policy.decision.context.stage, "systemd_repair_execution_task.draft");
  assert.equal(draft.draft.systemdRepair.execution.shellOnly, true);
  assert.equal(draft.draft.plan.steps[1].capabilityId, "act.system.heal");

  await assert.rejects(
    () => builders.buildSystemdRepairExecutionTaskDraft({
      unit: "openclaw-system-sense.service",
      execute: true,
    }),
    /Real systemd repair execution is limited/,
  );
});

test("systemd task builders enforce confirm gates and publish task lifecycle events", async () => {
  const { deps, calls, events } = createTaskLifecycleHarness({
    fetchJson: () => createSystemdDryRunEnvelope(),
  });
  const builders = createSystemdTaskBuilders(deps);

  await assert.rejects(
    () => builders.createSystemdRepairExecutionTask({ confirm: false }),
    /requires confirm=true/,
  );

  const result = await builders.createSystemdRepairExecutionTask({
    unit: "openclaw-browser-runtime.service",
    confirm: true,
  });

  assert.equal(result.task.type, "systemd_repair_execution_task");
  assert.equal(result.approval.status, "pending");
  assert.deepEqual(
    calls.map((call) => call.name),
    [
      "createTask",
      "createApprovalRequestForTask",
      "supersedeOtherActiveTasks",
      "reconcileRuntimeState",
      "persistState",
    ],
  );
  assert.deepEqual(
    events.map((event) => event.name),
    ["task.created", "approval.pending", "task.planned", "task.phase_changed"],
  );
});

test("systemd candidate task shell preserves route-review failure boundary", async () => {
  const { deps } = createTaskLifecycleHarness({
    fetchJson: () => ({
      ok: true,
      registry: "openclaw-systemd-repair-candidate-task-route-v0",
      routeDecision: {
        existingRouteAvailable: false,
      },
    }),
  });
  const builders = createSystemdTaskBuilders(deps);

  await assert.rejects(
    () => builders.createSystemdRepairCandidateTaskShell({ confirm: true }),
    /not covered by an existing operator-reviewed task route/,
  );
});

test("body evidence task builders enforce confirm and route-review gates", async () => {
  const { deps } = createTaskLifecycleHarness({
    fetchJson: () => ({
      ok: true,
      registry: "openclaw-body-evidence-ledger-storage-root-route-review-v0",
      decision: { selectedSlice: "wrong-slice" },
      evidence: { rootInsideWorkspace: false },
    }),
  });
  const builders = createBodyEvidenceTaskBuilders(deps);

  await assert.rejects(
    () => builders.createBodyEvidenceLedgerDirectoryTaskShell({ confirm: false }),
    /requires confirm=true/,
  );
  await assert.rejects(
    () => builders.createBodyEvidenceLedgerDirectoryTaskShell({ confirm: true }),
    /requires a workspace-bounded storage-root route review/,
  );
});

test("body evidence task builders create ledger directory task shells with lifecycle events", async () => {
  const { deps, calls, events, fetchUrls } = createTaskLifecycleHarness({
    fetchJson: () => ({
      ok: true,
      registry: "openclaw-body-evidence-ledger-storage-root-route-review-v0",
      decision: { selectedSlice: "openclaw-body-evidence-ledger-directory-task" },
      evidence: {
        selectedRootId: "workspace-artifacts",
        selectedDisplayPath: ".artifacts/openclaw-body-evidence-ledger",
        rootInsideWorkspace: true,
      },
    }),
  });
  const builders = createBodyEvidenceTaskBuilders(deps);

  const result = await builders.createBodyEvidenceLedgerDirectoryTaskShell({ confirm: true });

  assert.equal(fetchUrls[0], "http://127.0.0.1:4106/system/route/body-evidence-ledger-storage-root-route-review");
  assert.equal(result.registry, "openclaw-body-evidence-ledger-directory-task-v0");
  assert.equal(result.task.type, "body_evidence_ledger_directory_task");
  assert.equal(result.ledgerDirectory.rootInsideWorkspace, true);
  assert.equal(result.governance.canCreateDirectory, false);
  assert.deepEqual(
    calls.map((call) => call.name),
    [
      "createTask",
      "createApprovalRequestForTask",
      "supersedeOtherActiveTasks",
      "reconcileRuntimeState",
      "persistState",
    ],
  );
  assert.deepEqual(
    events.map((event) => event.name),
    ["task.created", "approval.pending", "task.planned", "task.phase_changed"],
  );
});
