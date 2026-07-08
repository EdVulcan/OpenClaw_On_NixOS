import test from "node:test";
import assert from "node:assert/strict";

import { createWorkspaceCommandPlanBuilders } from "../src/workspace-command-plan-builders.mjs";

function createBuilders() {
  const workspaceProposal = {
    id: "proposal-a",
    workspaceId: "openclaw",
    workspaceName: "OpenClaw",
    scriptName: "typecheck",
    command: "npm",
    args: ["run", "typecheck"],
    cwd: "/repo",
    risk: "medium",
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
    }),
    autonomyMode: "supervised",
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
