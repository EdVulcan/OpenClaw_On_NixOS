import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { observerClientEngineeringVerificationFollowupRenderersScript } from "../src/client-script-renderers-engineering-verification-followup.mjs";

function element() {
  return { textContent: "" };
}

function createContext() {
  return {
    engineeringLoopStateFollowup: element(),
    engineeringLoopStateFollowupSource: element(),
    engineeringLoopStateFollowupBinding: element(),
    engineeringLoopStateFollowupExecution: element(),
    engineeringLoopStateJson: element(),
  };
}

function task(overrides = {}) {
  return {
    id: "mutation-task-1",
    outcome: {
      details: {
        verificationFollowup: {
          registry: "openclaw-native-engineering-verification-followup-v0",
          triggered: true,
          executed: true,
          ok: true,
          sourceTaskId: "mutation-task-1",
          mutationHash: "a".repeat(64),
          autonomyMode: "sovereign_body",
          scriptName: "typecheck",
          proposalId: "openclaw:typecheck",
          verificationTask: { id: "verification-task-1", status: "completed" },
          ...overrides,
        },
      },
    },
  };
}

test("Observer renders a bound sovereign verification follow-up in Engineering Loop State", () => {
  const context = createContext();
  vm.runInNewContext(observerClientEngineeringVerificationFollowupRenderersScript, context);

  context.renderEngineeringVerificationFollowupReadback(task());

  assert.equal(context.engineeringLoopStateFollowup.textContent, "passed");
  assert.equal(context.engineeringLoopStateFollowupSource.textContent, "mutation-task-1".slice(0, 12));
  assert.equal(context.engineeringLoopStateFollowupBinding.textContent, "source-match hash-present:aaaaaaaaaaaa");
  assert.equal(context.engineeringLoopStateFollowupExecution.textContent, "passed");
  assert.match(context.engineeringLoopStateJson.textContent, /Sovereign Verification Follow-up: passed/u);
  assert.match(context.engineeringLoopStateJson.textContent, /Mutation Binding: source-match hash-present:aaaaaaaaaaaa/u);
  assert.match(context.engineeringLoopStateJson.textContent, /Validation: script=typecheck proposal=openclaw:typecheck task=verification-task-1 taskStatus=completed/u);
});

test("Observer reports pending or mismatched follow-up evidence without creating control actions", () => {
  const context = createContext();
  vm.runInNewContext(observerClientEngineeringVerificationFollowupRenderersScript, context);

  context.renderEngineeringVerificationFollowupReadback(task({
    executed: false,
    ok: null,
    sourceTaskId: "other-task",
    mutationHash: "not-a-hash",
    verificationTask: { id: "verification-task-2", status: "queued" },
  }));

  assert.equal(context.engineeringLoopStateFollowup.textContent, "queued");
  assert.equal(context.engineeringLoopStateFollowupBinding.textContent, "source-mismatch hash-invalid");
  assert.equal(context.engineeringLoopStateFollowupExecution.textContent, "not executed");
  assert.match(context.engineeringLoopStateJson.textContent, /Execution: executed=false ok=pending autonomy=sovereign_body/u);
});

test("Observer clears follow-up readback when the selected task has no follow-up", () => {
  const context = createContext();
  vm.runInNewContext(observerClientEngineeringVerificationFollowupRenderersScript, context);
  context.engineeringLoopStateJson.textContent = "Kind: write\n\nVerification Follow-up:\nold evidence";

  context.renderEngineeringVerificationFollowupReadback({ id: "ordinary-task" });

  assert.equal(context.engineeringLoopStateFollowup.textContent, "none");
  assert.equal(context.engineeringLoopStateFollowupBinding.textContent, "none");
  assert.equal(context.engineeringLoopStateJson.textContent, "Kind: write");
});
