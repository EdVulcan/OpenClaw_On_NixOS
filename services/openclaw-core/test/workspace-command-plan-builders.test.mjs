import test from "node:test";
import assert from "node:assert/strict";

import { createWorkspaceCommandPlanBuilders } from "../src/workspace-command-plan-builders.mjs";

function createBuilders({ autonomyMode = "supervised", proposalOverrides = {} } = {}) {
  const workspaceProposal = {
    id: "proposal-a",
    workspaceId: "openclaw",
    workspaceName: "OpenClaw",
    scriptName: "typecheck",
    command: "npm",
    args: ["run", "typecheck"],
    cwd: "/repo",
    risk: "medium",
    category: "validation",
    packageManager: "npm",
    workspacePath: "/repo",
    usesShell: false,
    ...proposalOverrides,
  };
  return createWorkspaceCommandPlanBuilders({
    buildWorkspaceCommandProposals: () => ({
      registry: "workspace-command-proposals-v0",
      items: [workspaceProposal],
    }),
    buildOpenClawSourceCommandProposals: () => ({
      registry: "openclaw-source-command-proposals-v0",
      sourceCommandSignals: { registry: "openclaw-source-command-signals-v0" },
      items: [{
        ...workspaceProposal,
        sourceCommand: { absorbedFromEnhancedOpenClaw: true },
        usesShell: false,
      }],
    }),
    buildRulePlan: (input) => ({
      planner: "rule-plan",
      input,
      steps: [{
        id: "step-command-1",
        phase: "acting_on_target",
        kind: "system.command.execute",
        intent: "system.command.execute",
        capabilityId: "act.system.command.execute",
        requiresApproval: true,
        governance: "require_approval",
        params: input.actions[0].params,
      }],
    }),
    autonomyMode,
  });
}

test("workspace command plan builders preserve plan-only governance", () => {
  const builders = createBuilders();
  const draft = builders.buildWorkspaceCommandPlanDraft({ proposalId: "proposal-a" });

  assert.equal(draft.registry, "workspace-command-plan-draft-v0");
  assert.equal(draft.sourceRegistry, "workspace-command-proposals-v0");
  assert.equal(draft.draft.action.params.timeoutMs, 300000);
  assert.equal(draft.draft.policy.decision.autonomyMode, "supervised");
  assert.equal(draft.draft.governance.createsTask, false);
  assert.equal(draft.draft.governance.canExecute, false);
});

test("workspace command plan builders preserve source command overlays", () => {
  const builders = createBuilders();
  const draft = builders.buildOpenClawSourceCommandPlanDraft({ proposalId: "proposal-a" });

  assert.equal(draft.registry, "openclaw-source-command-plan-draft-v0");
  assert.equal(draft.sourceCommandSignals.registry, "openclaw-source-command-signals-v0");
  assert.equal(draft.sourceCommandPlan.commandShape.command, "npm");
  assert.equal(draft.sourceCommandPlan.commandShape.usesShell, false);
  assert.equal(draft.governance.canMutate, false);
  assert.equal(draft.governance.requiresExplicitApprovalBeforeExecution, true);
});

test("guardian mode keeps low-risk validation behind explicit approval", () => {
  const builders = createBuilders({
    autonomyMode: "guardian",
    proposalOverrides: { risk: "low" },
  });
  const draft = builders.buildWorkspaceCommandPlanDraft({ proposalId: "proposal-a" });

  assert.equal(draft.draft.policy.decision.decision, "require_approval");
  assert.equal(draft.draft.policy.request.requiresApproval, true);
  assert.equal(draft.draft.governance.autoAuthorized, false);
  assert.equal(draft.draft.plan.steps.some((step) => step.autonomousExecution), false);
});

test("sovereign body grants only the fixed low-risk validation command shape", () => {
  const builders = createBuilders({
    autonomyMode: "sovereign_body",
    proposalOverrides: { risk: "low" },
  });
  const draft = builders.buildOpenClawSourceCommandPlanDraft({ proposalId: "proposal-a" });
  const commandStep = draft.draft.plan.steps.find((step) => step.phase === "acting_on_target");

  assert.equal(draft.draft.policy.decision.decision, "audit_only");
  assert.equal(draft.draft.policy.request.requiresApproval, false);
  assert.equal(draft.draft.governance.autoAuthorized, true);
  assert.equal(draft.draft.governance.canExecuteWithoutApproval, true);
  assert.equal(draft.governance.requiresExplicitApprovalBeforeExecution, false);
  assert.equal(commandStep.requiresApproval, false);
  assert.equal(commandStep.baseRequiresApproval, true);
  assert.equal(commandStep.autonomousExecution.mode, "sovereign_body_audit_only");
  assert.equal(commandStep.autonomousExecution.scriptName, "typecheck");
  assert.equal(commandStep.autonomousExecution.usesShell, false);
});

test("sovereign body keeps build and runtime scripts approval-gated", () => {
  for (const proposal of [
    { scriptName: "build", category: "build", args: ["run", "build"] },
    { scriptName: "dev", category: "runtime", risk: "medium", args: ["run", "dev"] },
    { scriptName: "start", category: "runtime", risk: "medium", args: ["run", "start"] },
  ]) {
    const builders = createBuilders({
      autonomyMode: "sovereign_body",
      proposalOverrides: { ...proposal },
    });
    const draft = builders.buildWorkspaceCommandPlanDraft({ proposalId: "proposal-a" });
    assert.equal(draft.draft.policy.decision.decision, "require_approval", proposal.scriptName);
    assert.equal(draft.draft.governance.autoAuthorized, false, proposal.scriptName);
    assert.equal(draft.draft.plan.steps.some((step) => step.autonomousExecution), false, proposal.scriptName);
  }
});

test("workspace command plan builders preserve missing proposal errors", () => {
  const builders = createBuilders();

  assert.throws(
    () => builders.buildWorkspaceCommandPlanDraft({ proposalId: "missing" }),
    /Workspace command proposal was not found/,
  );
  assert.throws(
    () => builders.buildOpenClawSourceCommandPlanDraft({ proposalId: "missing" }),
    /OpenClaw source command proposal was not found/,
  );
});
