import { randomUUID } from "node:crypto";
import { createEventName } from "../../../packages/shared-events/src/event-factory.mjs";

export const NATIVE_ACPX_CODEX_BRIDGE_WRAPPER_TASK_REGISTRY = "openclaw-native-acpx-codex-bridge-wrapper-task-v0";
export const NATIVE_ACPX_CODEX_BRIDGE_WRAPPER_TASK_DRAFT_REGISTRY = "openclaw-native-acpx-codex-bridge-wrapper-task-draft-v0";

function compactWrapperDraft(draft) {
  return {
    registry: draft?.registry ?? null,
    mode: draft?.mode ?? null,
    generatedAt: draft?.generatedAt ?? null,
    identityLevel: draft?.identityLevel ?? null,
    sourceCapability: draft?.sourceCapability ?? null,
    proposal: draft?.proposal ?? null,
    readinessGates: draft?.readinessGates ?? [],
    summary: draft?.summary ?? null,
    governance: draft?.governance ?? null,
    auditEvidence: draft?.auditEvidence ?? null,
    deferredExecutionBoundaries: draft?.deferredExecutionBoundaries ?? [],
  };
}

export function createNativeAcpxCodexBridgeTaskBuilders(deps) {
  const {
    buildNativeAcpxCodexBridgeWrapperDraft,
    autonomyMode,
    createTask,
    createApprovalRequestForTask,
    supersedeOtherActiveTasks,
    reconcileRuntimeState,
    persistState,
    publishEvent,
    publishTaskApprovalIfPending,
    serialiseTask,
    serialisePlanForPublic,
  } = deps;

  function buildNativeAcpxCodexBridgeWrapperTaskDraft({
    sessionKey = null,
    command = null,
    wrapperName = null,
  } = {}) {
    const wrapperDraft = buildNativeAcpxCodexBridgeWrapperDraft({ sessionKey, command, wrapperName });
    const now = new Date().toISOString();
    const ready = wrapperDraft.summary?.readyForApprovalBridge === true;
    const policyRequest = {
      intent: "acpx_codex_bridge.wrapper_action",
      domain: "body_internal",
      risk: "high",
      requiresApproval: true,
      approved: false,
      capabilityId: "act.openclaw.acpx_codex_bridge.wrapper_action",
      tags: [
        "acpx_codex_bridge",
        "explicit_approval_required",
        "wrapper_action_approved_deferred",
      ],
    };
    const policyDecision = {
      id: randomUUID(),
      at: now,
      engine: NATIVE_ACPX_CODEX_BRIDGE_WRAPPER_TASK_REGISTRY,
      stage: "acpx_codex_bridge.wrapper_action.task.materialize",
      subject: {
        taskId: null,
        type: "native_acpx_codex_bridge_wrapper_action",
        goal: "Approve ACPX/Codex bridge wrapper action boundary without executing it",
        targetUrl: null,
        intent: policyRequest.intent,
      },
      domain: policyRequest.domain,
      risk: policyRequest.risk,
      decision: "require_approval",
      reason: "acpx_codex_bridge_wrapper_action_requires_explicit_user_approval",
      approved: false,
      autonomyMode,
      autonomous: false,
    };
    const plan = {
      planId: `plan-${randomUUID()}`,
      strategy: "acpx-codex-bridge-wrapper-action-v0",
      planner: NATIVE_ACPX_CODEX_BRIDGE_WRAPPER_TASK_REGISTRY,
      capabilityAware: true,
      status: ready ? "planned" : "blocked",
      goal: policyDecision.subject.goal,
      targetUrl: null,
      intent: policyRequest.intent,
      createdAt: now,
      updatedAt: now,
      capabilitySummary: {
        total: 4,
        approvalGates: 1,
        ids: [
          "sense.openclaw.acpx_codex_bridge.compatibility",
          "state.openclaw.acpx_codex_bridge.session_metadata",
          "plan.openclaw.acpx_codex_bridge.wrapper_action",
          "act.openclaw.acpx_codex_bridge.wrapper_action",
        ],
        byRisk: {
          low: 2,
          medium: 1,
          high: 1,
        },
      },
      steps: [
        {
          id: "step-review-wrapper-draft",
          kind: "acpx_codex_bridge.wrapper_action_draft",
          phase: "reviewing_wrapper_action_draft",
          title: "Review ACPX/Codex wrapper action draft",
          status: ready ? "pending" : "blocked",
          capabilityId: "plan.openclaw.acpx_codex_bridge.wrapper_action",
          risk: "medium",
          governance: "audit_only",
          requiresApproval: false,
          params: {
            sourceRegistry: wrapperDraft.registry,
            proposalId: wrapperDraft.proposal?.id ?? null,
            sessionKey: wrapperDraft.proposal?.session?.requestedSessionKey ?? null,
            readyForApprovalBridge: ready,
            wrapperWritten: false,
            processSpawned: false,
          },
        },
        {
          id: "step-user-approval",
          kind: "approval.gate",
          phase: "waiting_for_approval",
          title: "Wait for explicit user approval before wrapper action boundary",
          status: "pending",
          capabilityId: "govern.policy.evaluate",
          risk: "high",
          governance: "require_approval",
          requiresApproval: true,
        },
        {
          id: "step-record-approved-deferred-boundary",
          kind: "acpx_codex_bridge.wrapper_action_approved_deferred",
          phase: "approved_deferred_boundary",
          title: "Record approved ACPX/Codex wrapper boundary without writing or spawning",
          status: "pending",
          capabilityId: "act.openclaw.acpx_codex_bridge.wrapper_action",
          risk: "high",
          governance: "require_approval",
          requiresApproval: true,
          params: {
            canReadCredentialValue: false,
            canCopyAuthMaterial: false,
            canWriteWrapper: false,
            canExecuteWrapper: false,
            canSpawnCodexAcp: false,
            canCallProvider: false,
            canUseNetwork: false,
          },
        },
      ],
      governance: {
        mode: "acpx_codex_bridge_wrapper_action_task_plan",
        runtimeOwner: "openclaw_on_nixos",
        readyForApprovalBridge: ready,
        requiresExplicitApproval: true,
        canReadCredentialValue: false,
        canCopyAuthMaterial: false,
        canWriteWrapper: false,
        canExecuteWrapper: false,
        canSpawnCodexAcp: false,
        canCallProvider: false,
        canUseNetwork: false,
      },
    };

    return {
      ok: true,
      registry: NATIVE_ACPX_CODEX_BRIDGE_WRAPPER_TASK_DRAFT_REGISTRY,
      mode: "approval-gated-acpx-codex-bridge-wrapper-task-draft",
      generatedAt: now,
      sourceRegistry: wrapperDraft.registry,
      sourceMode: wrapperDraft.mode,
      wrapperDraft: compactWrapperDraft(wrapperDraft),
      plan,
      policy: {
        request: policyRequest,
        decision: policyDecision,
      },
      governance: {
        mode: "acpx_codex_bridge_wrapper_task_draft",
        runtimeOwner: "openclaw_on_nixos",
        createsTask: false,
        createsApproval: false,
        canExecuteWithoutApproval: false,
        readyForApprovalBridge: ready,
        canReadCredentialValue: false,
        canCopyAuthMaterial: false,
        canWriteWrapper: false,
        canExecuteWrapper: false,
        canSpawnCodexAcp: false,
        canCallProvider: false,
        canUseNetwork: false,
        requiresExplicitApprovalBeforeWrapperAction: true,
      },
    };
  }

  async function createNativeAcpxCodexBridgeWrapperTask({
    sessionKey = null,
    command = null,
    wrapperName = null,
    confirm = false,
  } = {}) {
    if (confirm !== true) {
      throw new Error("ACPX/Codex bridge wrapper task creation requires confirm=true.");
    }

    const draft = buildNativeAcpxCodexBridgeWrapperTaskDraft({ sessionKey, command, wrapperName });
    if (draft.wrapperDraft?.summary?.readyForApprovalBridge !== true) {
      throw new Error("ACPX/Codex bridge wrapper task requires persisted session metadata.");
    }
    const task = createTask({
      goal: draft.plan.goal,
      type: "native_acpx_codex_bridge_wrapper_action",
      workViewStrategy: "acpx-codex-bridge-wrapper-action",
      plan: draft.plan,
      policy: draft.policy.request,
    }, { skipInitialPolicy: true });
    task.policy = draft.policy;
    task.nativeAcpxCodexBridgeWrapper = {
      registry: NATIVE_ACPX_CODEX_BRIDGE_WRAPPER_TASK_REGISTRY,
      mode: "approval-gated-acpx-codex-bridge-wrapper-task",
      sessionKey,
      command,
      wrapperName,
      sourceRegistry: draft.sourceRegistry,
      sourceMode: draft.sourceMode,
      wrapperDraft: draft.wrapperDraft,
      execution: null,
      governance: draft.governance,
    };
    const approval = createApprovalRequestForTask(task, draft.policy.decision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent(createEventName("task.created"), { task: serialiseTask(task), planner: NATIVE_ACPX_CODEX_BRIDGE_WRAPPER_TASK_REGISTRY });
    await publishTaskApprovalIfPending(task);
    await publishEvent(createEventName("task.planned"), { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
    await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent(createEventName("task.phase_changed"), {
      task: serialiseTask(reclaimedTask),
    })));

    return {
      ok: true,
      registry: NATIVE_ACPX_CODEX_BRIDGE_WRAPPER_TASK_REGISTRY,
      mode: "approval-gated-acpx-codex-bridge-wrapper-task",
      generatedAt: new Date().toISOString(),
      sourceRegistry: draft.registry,
      sourceMode: draft.mode,
      wrapperDraft: draft.wrapperDraft,
      task,
      approval,
      governance: {
        mode: "acpx_codex_bridge_wrapper_task_approval_gated",
        runtimeOwner: "openclaw_on_nixos",
        createsTask: true,
        createsApproval: true,
        canExecuteWithoutApproval: false,
        canReadCredentialValue: false,
        canCopyAuthMaterial: false,
        canWriteWrapper: false,
        canExecuteWrapper: false,
        canSpawnCodexAcp: false,
        canCallProvider: false,
        canUseNetwork: false,
        executed: false,
        requiresExplicitApprovalBeforeWrapperAction: true,
      },
    };
  }

  return {
    buildNativeAcpxCodexBridgeWrapperTaskDraft,
    createNativeAcpxCodexBridgeWrapperTask,
  };
}
