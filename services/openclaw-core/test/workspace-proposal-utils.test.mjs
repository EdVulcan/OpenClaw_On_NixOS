import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSourceDerivedProposalBundles,
  buildWorkspacePatchProposalEnvelope,
  normalisePatchMetadataList,
  truncatePatchMetadata,
} from "../src/workspace-proposal-utils.mjs";

test("workspace proposal utils truncate and normalise metadata lists", () => {
  assert.equal(truncatePatchMetadata("abcdef", 5), "ab...");
  assert.deepEqual(
    normalisePatchMetadataList([" typecheck ", "", "test", 42, "verify"], { maxItems: 2 }),
    ["typecheck", "test"],
  );
});

test("workspace proposal utils build source-derived rationale bundles without content exposure", () => {
  const bundles = buildSourceDerivedProposalBundles({
    sourceSignals: {
      sourceRegistries: ["workspace-registry-v0"],
      toolSignals: { matchedTools: 2 },
      semanticSignals: { matchedFiles: 3 },
      promptSignals: { matchedFiles: 1, expectedChecks: ["typecheck", "test"] },
    },
    expectedChecks: ["typecheck"],
    relativePath: "src/example.mjs",
    query: "edit",
    primarySymbol: "example",
    fileRole: "source module",
  });

  assert.equal(bundles.rationaleBundle.registry, "openclaw-rationale-check-bundle-v0");
  assert.equal(bundles.rationaleBundle.contentExposed, false);
  assert.equal(bundles.rationaleBundle.sourceSignals.matchedTools, 2);
  assert.deepEqual(bundles.checkBundle.blockedUntilApproval, [
    "filesystem mutation",
    "workspace write ledger entry",
    "operator execution of generated patch task",
  ]);
  assert.equal(bundles.riskNotes.approvalRequired, true);
});

test("workspace proposal utils build public proposal envelopes with redacted governance", () => {
  const envelope = buildWorkspacePatchProposalEnvelope({
    proposal: {
      id: "proposal-1",
      title: "Patch route",
      rationale: "Use bounded edit.",
      source: "openclaw-source-derived-edit-proposal-v0",
      targetContext: { symbol: "handler", fileRole: "route module" },
      expectedChecks: ["typecheck", "test"],
    },
    target: {
      workspace: { name: "OpenClaw" },
      relativePath: "src/server.mjs",
    },
    capability: {
      id: "act.openclaw.workspace_patch_apply",
      risk: "high",
      approvalRequired: true,
      runtimeOwner: "openclaw_on_nixos",
    },
    safeEdits: [{ kind: "replace_text" }],
    diffPreview: { format: "bounded-line-diff-v0", previewLineCount: 3 },
    validation: {
      structuredPatch: { engine: "patch-validation" },
      preview: { engine: "preview-validation" },
    },
  });

  assert.equal(envelope.id, "proposal-1");
  assert.equal(envelope.registry, "openclaw-native-workspace-edit-proposal-v0");
  assert.equal(envelope.targetContext.symbol, "handler");
  assert.equal(envelope.rationaleBundle.contentExposed, false);
  assert.equal(envelope.governance.createsTaskBeforeApproval, false);
  assert.deepEqual(envelope.dryRun.validationEngines, ["patch-validation", "preview-validation"]);
});
