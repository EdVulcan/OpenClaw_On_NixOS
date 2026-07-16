import test from "node:test";
import assert from "node:assert/strict";

import { createEngineeringLspCapabilityHandlers } from "../src/capability-runtime-engineering-lsp.mjs";

test("LSP proposal handlers route existing builders and keep summaries compact", () => {
  const inputs = {};
  const sourceSecret = "source-preview-secret";
  const handlers = createEngineeringLspCapabilityHandlers({
    buildNativeEngineeringLspEvidence: (input) => {
      inputs.evidence = input;
      return {
        ok: true,
        summary: {
          selectedAction: "check",
          selectedLanguage: "typescript",
          detectedLanguages: ["typescript", "python"],
          selectedLanguageFiles: 3,
          configFilesPresent: 1,
        },
        serverReadiness: { status: "not_checked" },
        bounds: {
          noSourceFileContentRead: true,
          noLspServerStart: true,
          noJsonRpcRequest: true,
          noCommandExecution: true,
          noProviderCall: true,
        },
        governance: {
          canReadSourceFileContent: false,
          canStartLspServer: false,
          canSendJsonRpcRequest: false,
          canExecuteCommand: false,
          canMutate: false,
          canCallProvider: false,
        },
      };
    },
    buildNativeEngineeringLspLifecycleDraft: (input) => {
      inputs.lifecycle = input;
      return {
        ok: true,
        summary: {
          selectedLanguage: "typescript",
          lifecycleAction: "start",
          executionReady: false,
          gatesPassed: 2,
          gatesDeferred: 3,
        },
        lifecycleDraft: { status: "draft_only" },
        bounds: {
          noLspServerStart: true,
          noTaskCreation: true,
          noApprovalCreation: true,
          noProviderCall: true,
        },
        governance: {
          canStartLspServer: false,
          canCreateTask: false,
          canCreateApproval: false,
          canMutate: false,
          canCallProvider: false,
        },
      };
    },
    buildNativeEngineeringLspSourceTransferProposal: (input) => {
      inputs.source = input;
      return {
        ok: true,
        summary: {
          language: "typescript",
          textBytes: 42,
          lineCount: 3,
          textSha256: "a".repeat(64),
          previewChars: sourceSecret.length,
          previewTruncated: true,
          didOpenSent: false,
        },
        file: {
          relativePath: "src/app.ts",
          languageId: "typescript",
        },
        sourcePreview: { text: sourceSecret },
        bounds: { noLspServerStart: true, noProviderCall: true },
        governance: {
          canTransferSourceContentToLsp: false,
          canStartLspServer: false,
          canCreateTask: false,
          canMutateWorkspace: false,
          canCallProvider: false,
          futureSourceTransferRequiresApproval: true,
        },
      };
    },
    buildNativeEngineeringLspSymbolRequestProposal: (input) => {
      inputs.symbol = input;
      return {
        ok: true,
        summary: {
          action: "definition",
          method: "textDocument/definition",
          sourceTransferStateFound: false,
          symbolRequestSent: false,
        },
        proposedJsonRpc: { method: "textDocument/definition", params: null },
        bounds: { noJsonRpcSent: true, noLspServerStart: true, noProviderCall: true },
        governance: {
          canSendSymbolRequest: false,
          canStartLspServer: false,
          canCreateTask: false,
          canMutateWorkspace: false,
          canCallProvider: false,
          readyForApprovalTask: false,
        },
      };
    },
  });

  const requests = [
    {
      id: "sense.openclaw.engineering_tool.lsp_evidence",
      params: { workspacePath: "/tmp/workspace", action: "check", language: "typescript", limit: 20 },
    },
    {
      id: "plan.openclaw.engineering_tool.lsp_lifecycle",
      params: { workspacePath: "/tmp/workspace", language: "typescript", lifecycleAction: "start", limit: 20 },
    },
    {
      id: "plan.openclaw.engineering_tool.lsp_source_transfer",
      params: { workspacePath: "/tmp/workspace", language: "typescript", relativePath: "src/app.ts", maxPreviewChars: 80 },
    },
    {
      id: "plan.openclaw.engineering_tool.lsp_symbol_request",
      params: { workspacePath: "/tmp/workspace", language: "typescript", action: "definition", relativePath: "src/app.ts", line: 2, character: 14 },
    },
  ];
  for (const request of requests) {
    const backend = handlers.callBackend({ id: request.id }, { params: request.params });
    assert.equal(backend.handled, true);
  }

  assert.deepEqual(inputs.evidence, {
    ...requests[0].params,
    relativePath: undefined,
    line: undefined,
    character: undefined,
  });
  assert.deepEqual(inputs.lifecycle, requests[1].params);
  assert.deepEqual(inputs.source, {
    ...requests[2].params,
    maxFileSizeBytes: undefined,
  });
  assert.deepEqual(inputs.symbol, requests[3].params);

  const evidenceSummary = handlers.summariseResult(
    { id: requests[0].id },
    handlers.callBackend({ id: requests[0].id }, { params: requests[0].params }).result,
  );
  assert.equal(evidenceSummary.kind, "engineering.lsp_evidence");
  assert.equal(evidenceSummary.noJsonRpcRequest, true);
  assert.equal(evidenceSummary.noProviderEgress, true);

  const sourceBackend = handlers.callBackend({ id: requests[2].id }, { params: requests[2].params });
  const sourceSummary = handlers.summariseResult({ id: requests[2].id }, sourceBackend.result);
  assert.equal(sourceSummary.kind, "engineering.lsp_source_transfer_proposal");
  assert.equal(sourceSummary.noSourceTransfer, true);
  assert.equal(JSON.stringify(sourceSummary).includes(sourceSecret), false);

  const symbolBackend = handlers.callBackend({ id: requests[3].id }, { params: requests[3].params });
  const symbolSummary = handlers.summariseResult({ id: requests[3].id }, symbolBackend.result);
  assert.equal(symbolSummary.kind, "engineering.lsp_symbol_request_proposal");
  assert.equal(symbolSummary.noJsonRpcRequest, true);
  assert.equal(handlers.callBackend({ id: "sense.system.vitals" }, { params: {} }).handled, false);
});
