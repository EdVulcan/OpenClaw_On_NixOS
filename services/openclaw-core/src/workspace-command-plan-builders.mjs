import { randomUUID } from "node:crypto";

export function createWorkspaceCommandPlanBuilders({
  buildWorkspaceCommandProposals,
  buildOpenClawSourceCommandProposals,
  buildRulePlan,
  autonomyMode,
}) {
  function findWorkspaceCommandProposal({ proposalId = null, workspaceId = null, scriptName = null } = {}) {
    const proposals = buildWorkspaceCommandProposals();
    const match = proposals.items.find((item) => {
      if (proposalId && item.id === proposalId) {
        return true;
      }
      return workspaceId && scriptName && item.workspaceId === workspaceId && item.scriptName === scriptName;
    }) ?? null;

    return {
      proposals,
      proposal: match,
    };
  }

  function buildWorkspaceCommandPlanDraft({ proposalId = null, workspaceId = null, scriptName = null } = {}) {
    const { proposals, proposal } = findWorkspaceCommandProposal({ proposalId, workspaceId, scriptName });
    if (!proposal) {
      throw new Error("Workspace command proposal was not found.");
    }

    const now = new Date().toISOString();
    const goal = `Review execution plan for ${proposal.workspaceName}:${proposal.scriptName}`;
    const policyRequest = {
      intent: "system.command.execute",
      domain: "body_internal",
      risk: proposal.risk,
      requiresApproval: true,
      tags: ["workspace_command", "explicit_approval_required"],
    };
    const action = {
      kind: "system.command.execute",
      intent: "system.command.execute",
      params: {
        command: proposal.command,
        args: proposal.args,
        cwd: proposal.cwd,
        timeoutMs: proposal.risk === "medium" ? 300000 : 120000,
      },
    };
    const plan = buildRulePlan({
      goal,
      type: "system_task",
      intent: "system.command.execute",
      policy: policyRequest,
      targetUrl: null,
      actions: [action],
    });
    const policyDecision = {
      id: randomUUID(),
      at: now,
      engine: "workspace-command-plan-v0",
      stage: "workspace.command.plan",
      subject: {
        taskId: null,
        type: "system_task",
        goal,
        targetUrl: null,
        intent: "system.command.execute",
      },
      domain: "body_internal",
      risk: proposal.risk,
      decision: "require_approval",
      reason: "workspace_command_requires_explicit_user_approval",
      approved: false,
      autonomyMode,
      autonomous: false,
    };

    return {
      registry: "workspace-command-plan-draft-v0",
      mode: "plan-only",
      generatedAt: now,
      sourceRegistry: proposals.registry,
      proposal,
      draft: {
        goal,
        type: "system_task",
        action,
        plan,
        policy: {
          request: policyRequest,
          decision: policyDecision,
        },
        governance: {
          createsTask: false,
          createsApproval: false,
          canExecute: false,
          requiresExplicitApproval: true,
          exposesScriptBody: false,
        },
      },
    };
  }

  function findSourceCommandProposal({
    proposalId = null,
    workspaceId = null,
    scriptName = null,
    workspacePath = null,
    query = "command",
  } = {}) {
    const proposals = buildOpenClawSourceCommandProposals({ workspacePath, query });
    const match = proposals.items.find((item) => {
      if (proposalId && item.id === proposalId) {
        return true;
      }
      return workspaceId && scriptName && item.workspaceId === workspaceId && item.scriptName === scriptName;
    }) ?? null;

    return {
      proposals,
      proposal: match,
    };
  }

  function buildOpenClawSourceCommandPlanDraft({
    proposalId = null,
    workspaceId = null,
    scriptName = null,
    workspacePath = null,
    query = "command",
  } = {}) {
    const { proposals, proposal } = findSourceCommandProposal({
      proposalId,
      workspaceId,
      scriptName,
      workspacePath,
      query,
    });
    if (!proposal) {
      throw new Error("OpenClaw source command proposal was not found.");
    }
    const draft = buildWorkspaceCommandPlanDraft({ proposalId: proposal.id });
    const sourceCommandPlan = {
      registry: "openclaw-source-command-plan-draft-v0",
      mode: "plan-only-source-command",
      sourceProposalRegistry: proposals.registry,
      sourceSignalsRegistry: proposals.sourceCommandSignals?.registry ?? "openclaw-source-command-proposals-v0",
      workspacePlanRegistry: draft.registry,
      proposalId: proposal.id,
      commandShape: {
        command: proposal.command,
        args: proposal.args,
        cwd: proposal.cwd,
        usesShell: proposal.usesShell === true,
      },
      contentExposed: false,
    };

    return {
      ...draft,
      registry: "openclaw-source-command-plan-draft-v0",
      mode: "plan-only-source-command",
      sourceRegistry: proposals.registry,
      sourceCommandProposal: proposal,
      sourceCommandSignals: proposals.sourceCommandSignals,
      sourceCommandPlan,
      draft: {
        ...draft.draft,
        governance: {
          ...(draft.draft?.governance ?? {}),
          mode: "source_command_plan_only",
          sourceAbsorptionMode: "plan_only",
          createsTask: false,
          createsApproval: false,
          canExecute: false,
          canMutate: false,
          requiresExplicitApproval: true,
          exposesScriptBody: false,
          exposesPromptContent: false,
          exposesSourceFileContent: false,
        },
      },
      governance: {
        mode: "source_command_plan_only",
        runtimeOwner: "openclaw_on_nixos",
        sourceProposalRegistry: proposals.registry,
        canExecute: false,
        canMutate: false,
        createsTask: false,
        createsApproval: false,
        exposesScriptBodies: false,
        exposesPromptContent: false,
        exposesSourceFileContent: false,
        requiresExplicitApprovalBeforeExecution: true,
      },
    };
  }

  return {
    findWorkspaceCommandProposal,
    buildWorkspaceCommandPlanDraft,
    findSourceCommandProposal,
    buildOpenClawSourceCommandPlanDraft,
  };
}
