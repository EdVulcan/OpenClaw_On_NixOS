import test from "node:test";
import assert from "node:assert/strict";

import { createNativeAcpxCodexBridgeBuilders } from "../src/native-acpx-codex-bridge-builders.mjs";
import { createNativeAcpxCodexBridgeTaskBuilders } from "../src/native-acpx-codex-bridge-task-builders.mjs";
import { createTaskLifecycleHarness } from "./task-builder-harness.mjs";

function createHarness() {
  const acpxState = {
    acpxBridgeSessionRecords: new Map(),
    MAX_ACPX_BRIDGE_SESSION_RECORDS: 100,
    persistState: () => {},
  };
  const acpx = createNativeAcpxCodexBridgeBuilders({
    state: acpxState,
    publishEvent: async () => {},
  });
  const taskHarness = createTaskLifecycleHarness();
  const builders = createNativeAcpxCodexBridgeTaskBuilders({
    buildNativeAcpxCodexBridgeWrapperDraft: acpx.buildNativeAcpxCodexBridgeWrapperDraft,
    autonomyMode: "guardian",
    createTask: taskHarness.deps.createTask,
    createApprovalRequestForTask: taskHarness.deps.createApprovalRequestForTask,
    supersedeOtherActiveTasks: taskHarness.deps.supersedeOtherActiveTasks,
    reconcileRuntimeState: taskHarness.deps.reconcileRuntimeState,
    persistState: taskHarness.deps.persistState,
    publishEvent: taskHarness.deps.publishEvent,
    publishTaskApprovalIfPending: taskHarness.deps.publishTaskApprovalIfPending,
    serialiseTask: taskHarness.deps.serialiseTask,
    serialisePlanForPublic: taskHarness.deps.serialisePlanForPublic,
  });
  return { acpx, builders, taskHarness };
}

test("native ACPX/Codex bridge wrapper task builder creates approval-gated tasks only from ready drafts", async () => {
  const { acpx, builders, taskHarness } = createHarness();

  const blockedDraft = builders.buildNativeAcpxCodexBridgeWrapperTaskDraft({
    sessionKey: "agent:codex:missing",
  });
  assert.equal(blockedDraft.registry, "openclaw-native-acpx-codex-bridge-wrapper-task-draft-v0");
  assert.equal(blockedDraft.wrapperDraft.summary.readyForApprovalBridge, false);
  assert.equal(blockedDraft.governance.createsTask, false);
  assert.equal(blockedDraft.governance.createsApproval, false);
  await assert.rejects(
    () => builders.createNativeAcpxCodexBridgeWrapperTask({
      sessionKey: "agent:codex:missing",
      confirm: true,
    }),
    /requires persisted session metadata/,
  );

  await acpx.recordNativeAcpxCodexSession({
    sessionKey: "agent:codex:ready",
    recordId: "record-ready",
    metadata: { purpose: "task", token: "must-not-leak" },
    confirm: true,
  });
  await assert.rejects(
    () => builders.createNativeAcpxCodexBridgeWrapperTask({
      sessionKey: "agent:codex:ready",
      confirm: false,
    }),
    /confirm=true/,
  );
  const created = await builders.createNativeAcpxCodexBridgeWrapperTask({
    sessionKey: "agent:codex:ready",
    command: "npx.cmd",
    wrapperName: "codex-acp-ready",
    confirm: true,
  });

  assert.equal(created.registry, "openclaw-native-acpx-codex-bridge-wrapper-task-v0");
  assert.equal(created.task.type, "native_acpx_codex_bridge_wrapper_action");
  assert.equal(created.task.plan.strategy, "acpx-codex-bridge-wrapper-action-v0");
  assert.equal(created.task.nativeAcpxCodexBridgeWrapper.execution, null);
  assert.equal(created.task.nativeAcpxCodexBridgeWrapper.wrapperDraft.summary.readyForApprovalBridge, true);
  assert.equal(created.governance.createsTask, true);
  assert.equal(created.governance.createsApproval, true);
  assert.equal(created.governance.canWriteWrapper, false);
  assert.equal(created.governance.canSpawnCodexAcp, false);
  assert.equal(taskHarness.calls.filter((call) => call.name === "createTask").length, 1);
  assert.equal(taskHarness.calls.filter((call) => call.name === "createApprovalRequestForTask").length, 1);
  assert.equal(taskHarness.events.filter((event) => event.name === "task.created").length, 1);
  assert.equal(taskHarness.events.filter((event) => event.name === "approval.pending").length, 1);
  assert.equal(taskHarness.events.filter((event) => event.name === "task.planned").length, 1);
});
