const LSP_EVIDENCE_CAPABILITY_ID = "sense.openclaw.engineering_tool.lsp_evidence";
const LSP_LIFECYCLE_CAPABILITY_ID = "plan.openclaw.engineering_tool.lsp_lifecycle";
const LSP_SOURCE_TRANSFER_CAPABILITY_ID = "plan.openclaw.engineering_tool.lsp_source_transfer";
const LSP_SYMBOL_REQUEST_CAPABILITY_ID = "plan.openclaw.engineering_tool.lsp_symbol_request";
const SELECTED_TARGET_READ_CAPABILITY_ID = "sense.openclaw.engineering_tool.lsp_selected_target_read_bridge";
const MAX_TARGET_INDEX = 7;
const MAX_CONTEXT_LINES = 20;
const MAX_TASK_ID_CHARS = 200;

function requireBuilder(builder, name) {
  if (typeof builder !== "function") {
    throw new Error(`${name} is not configured.`);
  }
  return builder;
}

function boundedInteger(value, maximum) {
  return Number.isInteger(value) && value >= 0 && value <= maximum;
}

export function createEngineeringLspCapabilityHandlers({
  buildNativeEngineeringLspEvidence,
  buildNativeEngineeringLspLifecycleDraft,
  buildNativeEngineeringLspSourceTransferProposal,
  buildNativeEngineeringLspSymbolRequestProposal,
  buildNativeEngineeringLspSelectedTargetReadBridge,
} = {}) {
  function callBackend(capability, request) {
    const params = request.params ?? {};
    if (capability.id === LSP_EVIDENCE_CAPABILITY_ID) {
      return {
        handled: true,
        result: requireBuilder(
          buildNativeEngineeringLspEvidence,
          "buildNativeEngineeringLspEvidence",
        )({
          workspacePath: params.workspacePath,
          action: params.action,
          language: params.language,
          relativePath: params.relativePath ?? params.path,
          line: params.line,
          character: params.character,
          limit: params.limit,
        }),
      };
    }
    if (capability.id === LSP_LIFECYCLE_CAPABILITY_ID) {
      return {
        handled: true,
        result: requireBuilder(
          buildNativeEngineeringLspLifecycleDraft,
          "buildNativeEngineeringLspLifecycleDraft",
        )({
          workspacePath: params.workspacePath,
          language: params.language,
          lifecycleAction: params.lifecycleAction ?? params.action,
          limit: params.limit,
        }),
      };
    }
    if (capability.id === LSP_SOURCE_TRANSFER_CAPABILITY_ID) {
      return {
        handled: true,
        result: requireBuilder(
          buildNativeEngineeringLspSourceTransferProposal,
          "buildNativeEngineeringLspSourceTransferProposal",
        )({
          workspacePath: params.workspacePath,
          language: params.language,
          relativePath: params.relativePath ?? params.path,
          maxFileSizeBytes: params.maxFileSizeBytes,
          maxPreviewChars: params.maxPreviewChars,
        }),
      };
    }
    if (capability.id === LSP_SYMBOL_REQUEST_CAPABILITY_ID) {
      return {
        handled: true,
        result: requireBuilder(
          buildNativeEngineeringLspSymbolRequestProposal,
          "buildNativeEngineeringLspSymbolRequestProposal",
        )({
          workspacePath: params.workspacePath,
          language: params.language,
          action: params.action,
          relativePath: params.relativePath ?? params.path,
          line: params.line,
          character: params.character,
        }),
      };
    }
    if (capability.id === SELECTED_TARGET_READ_CAPABILITY_ID) {
      return {
        handled: true,
        result: requireBuilder(
          buildNativeEngineeringLspSelectedTargetReadBridge,
          "buildNativeEngineeringLspSelectedTargetReadBridge",
        )({
          workspacePath: params.workspacePath,
          language: params.language,
          taskId: params.taskId,
          targetIndex: params.targetIndex,
          contextLines: params.contextLines,
          includeRead: params.includeRead,
          maxOutputChars: params.maxOutputChars,
          maxFileSizeBytes: params.maxFileSizeBytes,
        }),
      };
    }
    return { handled: false, result: null };
  }

  function validateRequest(capability, request) {
    if (capability.id !== SELECTED_TARGET_READ_CAPABILITY_ID) return null;
    const params = request.params ?? {};
    if (typeof params.taskId !== "string" || !params.taskId.trim()) {
      return "LSP selected-target read requires an explicit taskId.";
    }
    if (params.taskId.trim().length > MAX_TASK_ID_CHARS) {
      return "LSP selected-target taskId is too long.";
    }
    if (params.targetIndex !== undefined && !boundedInteger(params.targetIndex, MAX_TARGET_INDEX)) {
      return `LSP selected-target targetIndex must be an integer from 0 to ${MAX_TARGET_INDEX}.`;
    }
    if (params.contextLines !== undefined && !boundedInteger(params.contextLines, MAX_CONTEXT_LINES)) {
      return `LSP selected-target contextLines must be an integer from 0 to ${MAX_CONTEXT_LINES}.`;
    }
    if (params.includeRead !== undefined && typeof params.includeRead !== "boolean") {
      return "LSP selected-target includeRead must be boolean.";
    }
    return null;
  }

  function summariseResult(capability, result) {
    if (capability.id === LSP_EVIDENCE_CAPABILITY_ID) {
      const summary = result?.summary ?? {};
      const governance = result?.governance ?? {};
      const bounds = result?.bounds ?? {};
      const server = result?.serverReadiness ?? {};
      return {
        kind: "engineering.lsp_evidence",
        ok: result?.ok === true,
        action: summary.selectedAction ?? result?.query?.action ?? null,
        language: summary.selectedLanguage ?? result?.query?.language ?? null,
        detectedLanguages: Array.isArray(summary.detectedLanguages) ? summary.detectedLanguages.length : 0,
        selectedLanguageFiles: summary.selectedLanguageFiles ?? 0,
        configFilesPresent: summary.configFilesPresent ?? 0,
        serverStatus: server.status ?? "not_checked",
        noSourceContentRead: bounds.noSourceFileContentRead === true && governance.canReadSourceFileContent === false,
        noServerStart: bounds.noLspServerStart === true && governance.canStartLspServer === false,
        noJsonRpcRequest: bounds.noJsonRpcRequest === true && governance.canSendJsonRpcRequest === false,
        noCommandExecution: bounds.noCommandExecution === true && governance.canExecuteCommand === false,
        noMutation: governance.canMutate === false,
        noProviderEgress: governance.canCallProvider === false && bounds.noProviderCall === true,
      };
    }
    if (capability.id === LSP_LIFECYCLE_CAPABILITY_ID) {
      const summary = result?.summary ?? {};
      const governance = result?.governance ?? {};
      const bounds = result?.bounds ?? {};
      const draft = result?.lifecycleDraft ?? {};
      return {
        kind: "engineering.lsp_lifecycle",
        ok: result?.ok === true,
        language: summary.selectedLanguage ?? result?.query?.language ?? null,
        lifecycleAction: summary.lifecycleAction ?? result?.query?.lifecycleAction ?? null,
        status: draft.status ?? "draft_only",
        executionReady: summary.executionReady === true,
        gatesPassed: summary.gatesPassed ?? 0,
        gatesDeferred: summary.gatesDeferred ?? 0,
        noServerStart: bounds.noLspServerStart === true && governance.canStartLspServer === false,
        noTaskCreation: bounds.noTaskCreation === true && governance.canCreateTask === false,
        noApprovalCreation: bounds.noApprovalCreation === true && governance.canCreateApproval === false,
        noMutation: governance.canMutate === false,
        noProviderEgress: governance.canCallProvider === false && bounds.noProviderCall === true,
      };
    }
    if (capability.id === LSP_SOURCE_TRANSFER_CAPABILITY_ID) {
      const summary = result?.summary ?? {};
      const file = result?.file ?? {};
      const governance = result?.governance ?? {};
      const bounds = result?.bounds ?? {};
      return {
        kind: "engineering.lsp_source_transfer_proposal",
        ok: result?.ok === true,
        relativePath: file.relativePath ?? null,
        language: file.languageId ?? summary.language ?? null,
        textBytes: summary.textBytes ?? file.textBytes ?? 0,
        lineCount: summary.lineCount ?? file.lineCount ?? 0,
        textSha256: summary.textSha256 ?? file.textSha256 ?? null,
        previewChars: summary.previewChars ?? 0,
        previewTruncated: summary.previewTruncated === true,
        didOpenSent: summary.didOpenSent === true,
        requiresApprovalBeforeTransfer: governance.futureSourceTransferRequiresApproval === true,
        noSourceTransfer: governance.canTransferSourceContentToLsp === false,
        noServerStart: bounds.noLspServerStart === true && governance.canStartLspServer === false,
        noTaskCreation: governance.canCreateTask === false,
        noMutation: governance.canMutateWorkspace === false,
        noProviderEgress: governance.canCallProvider === false && bounds.noProviderCall === true,
      };
    }
    if (capability.id === LSP_SYMBOL_REQUEST_CAPABILITY_ID) {
      const summary = result?.summary ?? {};
      const governance = result?.governance ?? {};
      const bounds = result?.bounds ?? {};
      return {
        kind: "engineering.lsp_symbol_request_proposal",
        ok: result?.ok === true,
        action: summary.action ?? result?.query?.action ?? null,
        method: summary.method ?? result?.proposedJsonRpc?.method ?? null,
        sourceTransferStateFound: summary.sourceTransferStateFound === true,
        symbolRequestSent: summary.symbolRequestSent === true,
        readyForApprovalTask: governance.readyForApprovalTask === true,
        noJsonRpcRequest: bounds.noJsonRpcSent === true && governance.canSendSymbolRequest === false,
        noServerStart: bounds.noLspServerStart === true && governance.canStartLspServer === false,
        noTaskCreation: governance.canCreateTask === false,
        noMutation: governance.canMutateWorkspace === false,
        noProviderEgress: governance.canCallProvider === false && bounds.noProviderCall === true,
      };
    }
    if (capability.id !== SELECTED_TARGET_READ_CAPABILITY_ID) return null;
    const summary = result?.summary ?? {};
    const governance = result?.governance ?? {};
    return {
      kind: "engineering.lsp_selected_target_read",
      ok: result?.ok === true,
      blocked: result?.blocked === true,
      reason: result?.reason ?? null,
      sourceTaskId: summary.sourceTaskId ?? result?.query?.taskId ?? null,
      targetIndex: summary.targetIndex ?? result?.query?.targetIndex ?? null,
      relativePath: summary.relativePath ?? result?.target?.relativePath ?? null,
      startLine: summary.startLine ?? result?.target?.startLine ?? null,
      endLine: summary.endLine ?? result?.target?.endLine ?? null,
      includeRead: summary.includeRead === true,
      readOk: summary.readOk === true,
      charsReturned: result?.readResult?.summary?.charsReturned ?? 0,
      outputTruncated: result?.readResult?.summary?.outputTruncated === true,
      contentExposed: summary.contentExposed === true,
      noRawLspPayload: result?.bounds?.noRawLspPayload === true,
      noMutation: governance.canMutateWorkspace === false,
      noProviderEgress: governance.canCallProvider === false && governance.networkEgress !== true,
    };
  }

  return { callBackend, summariseResult, validateRequest };
}
