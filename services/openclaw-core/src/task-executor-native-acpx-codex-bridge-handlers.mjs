import { createEventName } from "../../../packages/shared-events/src/event-factory.mjs";
import { isNativeAcpxCodexBridgeWrapperTask } from "./task-recovery.mjs";

export const NATIVE_ACPX_CODEX_BRIDGE_WRAPPER_EXECUTION_REGISTRY = "openclaw-native-acpx-codex-bridge-wrapper-task-execution-v0";

function isApproved(task, approvals) {
  const approval = task?.approval?.requestId ? approvals.get(task.approval.requestId) : null;
  return task?.policy?.decision?.approved === true
    || task?.policy?.request?.approved === true
    || task?.approval?.status === "approved"
    || approval?.status === "approved";
}

function buildWrapperExecutionRecord({ task, draft, approval }) {
  const generatedAt = new Date().toISOString();
  return {
    registry: NATIVE_ACPX_CODEX_BRIDGE_WRAPPER_EXECUTION_REGISTRY,
    mode: "approval-gated-acpx-codex-bridge-wrapper-approved-deferred",
    generatedAt,
    taskId: task.id,
    approvalId: approval?.id ?? task.approval?.requestId ?? null,
    approved: true,
    sourceDraft: {
      registry: draft?.registry ?? null,
      proposalId: draft?.proposal?.id ?? null,
      status: draft?.proposal?.status ?? null,
      readyForApprovalBridge: draft?.summary?.readyForApprovalBridge === true,
    },
    wrapper: {
      relativePath: draft?.proposal?.wrapper?.relativePath ?? null,
      wrapperWritten: false,
      contentPreviewExposed: false,
    },
    command: {
      command: draft?.proposal?.command?.command ?? null,
      args: draft?.proposal?.command?.args ?? [],
      commandExecuted: false,
      processSpawned: false,
    },
    governance: {
      mode: "acpx_codex_bridge_wrapper_action_approved_deferred",
      runtimeOwner: "openclaw_on_nixos",
      canReadCredentialValue: false,
      canCopyAuthMaterial: false,
      canWriteWrapper: false,
      canExecuteWrapper: false,
      canSpawnCodexAcp: false,
      canCallProvider: false,
      canUseNetwork: false,
      taskCreated: true,
      approvalCreated: true,
      approved: true,
      executed: false,
    },
    auditEvidence: {
      operation: "acpx_codex_bridge_wrapper_action_approved_deferred",
      capabilityId: "act.openclaw.acpx_codex_bridge.wrapper_action",
      approved: true,
      generatedAt,
      persisted: true,
      evidenceKind: "task_outcome_embedded_audit_evidence",
    },
  };
}

export function createNativeAcpxCodexBridgeTaskHandlers({
  state,
  taskManager,
  approvalEngine,
  policyEvaluator,
  planBuilder,
  publishEvent,
}) {
  const { approvals } = state;
  const { serialiseTask, isActiveTask, setTaskPhase, completeTask } = taskManager;
  const { serialiseApproval } = approvalEngine;
  const { ensureTaskPolicy } = policyEvaluator;

  async function executeNativeAcpxCodexBridgeWrapperTask(task) {
    if (!isActiveTask(task)) {
      throw new Error("ACPX/Codex bridge wrapper task is not active.");
    }

    const policy = ensureTaskPolicy(task, { stage: "acpx_codex_bridge.wrapper_action.execute" });
    await publishEvent(createEventName("policy.evaluated"), { task: serialiseTask(task), policy: policy.decision });
    const approval = task.approval?.requestId ? approvals.get(task.approval.requestId) : null;
    if (!isApproved(task, approvals)) {
      const waitingTask = await setTaskPhase(task, "waiting_for_approval", {
        status: "queued",
        details: {
          executor: "acpx-codex-bridge-wrapper-action-v0",
          reason: "policy_requires_approval",
          approvalId: approval?.id ?? task.approval?.requestId ?? null,
          canWriteWrapper: false,
          canSpawnCodexAcp: false,
        },
      });
      await publishEvent(createEventName("task.blocked"), {
        task: serialiseTask(waitingTask),
        reason: "policy_requires_approval",
        executor: "acpx-codex-bridge-wrapper-action-v0",
      });
      return {
        task: waitingTask,
        blocked: true,
        reason: "policy_requires_approval",
        actions: [],
        capabilityInvocations: [],
        commandTranscript: [],
        verification: null,
        policy: policy.decision,
        approval: approval ? serialiseApproval(approval) : null,
        governance: {
          mode: "acpx_codex_bridge_wrapper_waiting_for_approval",
          executed: false,
          canReadCredentialValue: false,
          canCopyAuthMaterial: false,
          canWriteWrapper: false,
          canExecuteWrapper: false,
          canSpawnCodexAcp: false,
          canCallProvider: false,
          canUseNetwork: false,
        },
      };
    }

    await setTaskPhase(task, "approved_deferred_boundary", {
      status: "running",
      details: {
        executor: "acpx-codex-bridge-wrapper-action-v0",
        approvalId: approval?.id ?? task.approval?.requestId ?? null,
        canReadCredentialValue: false,
        canWriteWrapper: false,
        canSpawnCodexAcp: false,
      },
    });
    const metadata = task.nativeAcpxCodexBridgeWrapper ?? {};
    const draft = planBuilder.buildNativeAcpxCodexBridgeWrapperDraft({
      sessionKey: metadata.sessionKey ?? null,
      command: metadata.command ?? null,
      wrapperName: metadata.wrapperName ?? null,
    });
    const execution = buildWrapperExecutionRecord({ task, draft, approval });
    task.nativeAcpxCodexBridgeWrapper = {
      ...metadata,
      registry: metadata.registry ?? "openclaw-native-acpx-codex-bridge-wrapper-task-v0",
      mode: metadata.mode ?? "approval-gated-acpx-codex-bridge-wrapper-task",
      wrapperDraft: draft,
      execution,
      governance: {
        ...(metadata.governance ?? {}),
        executed: false,
        canReadCredentialValue: false,
        canCopyAuthMaterial: false,
        canWriteWrapper: false,
        canExecuteWrapper: false,
        canSpawnCodexAcp: false,
        canCallProvider: false,
        canUseNetwork: false,
      },
    };
    const completedTask = completeTask(task, {
      executor: "acpx-codex-bridge-wrapper-action-v0",
      summary: "ACPX/Codex bridge wrapper action approved and recorded as deferred.",
      acpxCodexBridgeWrapperExecution: execution,
      verification: {
        ok: true,
        checks: [
          {
            name: "wrapper_write_deferred",
            ok: execution.governance.canWriteWrapper === false,
            expected: false,
            actual: execution.governance.canWriteWrapper,
          },
          {
            name: "process_spawn_deferred",
            ok: execution.governance.canSpawnCodexAcp === false,
            expected: false,
            actual: execution.governance.canSpawnCodexAcp,
          },
          {
            name: "credential_value_read_blocked",
            ok: execution.governance.canReadCredentialValue === false,
            expected: false,
            actual: execution.governance.canReadCredentialValue,
          },
          {
            name: "network_egress_blocked",
            ok: execution.governance.canUseNetwork === false,
            expected: false,
            actual: execution.governance.canUseNetwork,
          },
        ],
      },
    });
    await publishEvent(createEventName("task.completed"), {
      task: serialiseTask(completedTask),
      executor: "acpx-codex-bridge-wrapper-action-v0",
      acpxCodexBridgeWrapperExecution: execution,
    });

    return {
      task: completedTask,
      blocked: false,
      reason: null,
      actions: [],
      capabilityInvocations: [],
      commandTranscript: [],
      verification: completedTask.outcome?.details?.verification ?? null,
      execution,
      policy: policy.decision,
      approval: approval ? serialiseApproval(approval) : null,
      governance: execution.governance,
    };
  }

  return [
    {
      name: "acpx-codex-bridge-wrapper-action",
      predicate: isNativeAcpxCodexBridgeWrapperTask,
      execute: executeNativeAcpxCodexBridgeWrapperTask,
    },
  ];
}
