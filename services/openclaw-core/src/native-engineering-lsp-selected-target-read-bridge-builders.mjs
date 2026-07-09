import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const NATIVE_ENGINEERING_LSP_SELECTED_TARGET_READ_BRIDGE_REGISTRY =
  "openclaw-native-engineering-lsp-selected-target-read-bridge-v0";

const DEFAULT_CONTEXT_LINES = 2;
const MAX_CONTEXT_LINES = 20;
const DEFAULT_MAX_OUTPUT_CHARS = 8_000;
const DEFAULT_MAX_FILE_SIZE_BYTES = 128 * 1024;
const SKIPPED_DIRECTORY_NAMES = new Set([
  ".cache",
  ".git",
  ".next",
  ".openclaw",
  ".serena",
  ".turbo",
  ".vite",
  "__generated__",
  "build",
  "cache",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "out",
  "target",
  "vendor",
]);

function normaliseLanguage(value) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "typescript";
}

function normalisePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function normaliseNonNegativeInteger(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, max) : fallback;
}

function normaliseBoolean(value, fallback = false) {
  if (value === true || value === "true" || value === "1" || value === "yes") {
    return true;
  }
  if (value === false || value === "false" || value === "0" || value === "no") {
    return false;
  }
  return fallback;
}

function normaliseWorkspace(workspace = {}) {
  return {
    id: workspace?.id ?? null,
    name: workspace?.name ?? null,
    path: workspace?.path ?? null,
  };
}

function safeRealpath(filePath) {
  try {
    return realpathSync(filePath);
  } catch {
    return null;
  }
}

function isInsidePath(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function shouldSkipDirectoryName(name) {
  const lower = name.toLowerCase();
  return name.startsWith(".")
    || SKIPPED_DIRECTORY_NAMES.has(lower)
    || lower.includes("cache")
    || lower.includes("generated");
}

function hasSkippedDirectorySegment(relativePath) {
  return relativePath
    .split("/")
    .filter(Boolean)
    .slice(0, -1)
    .some((segment) => shouldSkipDirectoryName(segment));
}

function responseSummaryFromRecord(record = {}) {
  return record.server?.symbolResponseSummary
    ?? record.process?.protocolHandshake?.symbolResponseSummary
    ?? null;
}

function recordWorkspaceMatches(record, workspacePath) {
  if (!workspacePath) {
    return true;
  }
  if (!record.workspace?.path) {
    return false;
  }
  return path.resolve(record.workspace.path) === path.resolve(workspacePath);
}

function findSymbolTargetRecord({ records, workspacePath, language, taskId }) {
  return [...(records?.values?.() ?? [])]
    .filter((record) => record.language === language)
    .filter((record) => recordWorkspaceMatches(record, workspacePath))
    .filter((record) => !taskId || record.sourceTaskId === taskId)
    .filter((record) => record.status === "symbol_request_completed")
    .filter((record) => responseSummaryFromRecord(record)?.selectedTarget)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] ?? null;
}

function selectedTargetFromSummary(summary = {}, targetIndex = 0) {
  const targets = Array.isArray(summary.targets) ? summary.targets : [];
  if (targetIndex > 0 && targets[targetIndex]) {
    return targets[targetIndex];
  }
  return summary.selectedTarget ?? targets[0] ?? null;
}

function rangeToReadLines(range = {}, contextLines) {
  const startZero = normaliseNonNegativeInteger(range.start?.line, 0, 1_000_000);
  const endZero = normaliseNonNegativeInteger(range.end?.line, startZero, 1_000_000);
  return {
    startLine: Math.max(1, startZero + 1 - contextLines),
    endLine: Math.max(startZero + 1, endZero + 1 + contextLines),
  };
}

function targetUriToRelativePath({ uri, workspaceRoot }) {
  if (typeof uri !== "string" || !uri.trim()) {
    return { ok: false, reason: "missing_target_uri" };
  }
  if (!uri.startsWith("file://")) {
    return { ok: false, reason: "non_file_target_uri" };
  }

  let targetPath;
  try {
    targetPath = fileURLToPath(uri);
  } catch {
    return { ok: false, reason: "invalid_file_target_uri" };
  }

  const rootPath = path.resolve(workspaceRoot);
  const rootRealPath = safeRealpath(rootPath) ?? rootPath;
  const targetAbsolutePath = path.resolve(targetPath);
  const targetRealPath = safeRealpath(targetAbsolutePath) ?? targetAbsolutePath;
  if (!isInsidePath(rootRealPath, targetRealPath)) {
    return { ok: false, reason: "target_outside_workspace" };
  }
  const relativePath = path.relative(rootRealPath, targetRealPath).replaceAll(path.sep, "/");
  if (!relativePath || relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
    return { ok: false, reason: "target_outside_workspace" };
  }
  if (hasSkippedDirectorySegment(relativePath)) {
    return { ok: false, reason: "hidden_generated_cache_target" };
  }
  return {
    ok: true,
    relativePath,
    absolutePath: targetRealPath,
  };
}

function buildGovernance({ includeRead, blocked }) {
  return {
    mode: "native_engineering_lsp_selected_target_read_bridge",
    runtimeOwner: "openclaw_on_nixos",
    canReadLifecycleState: true,
    canReadWorkspaceContent: includeRead && !blocked,
    canReadArbitrarySystemPath: false,
    canUseNativeReadSearchSurface: true,
    canExposeRawLspPayload: false,
    canStartLspServer: false,
    canSendJsonRpcRequest: false,
    canCreateTask: false,
    canCreateApproval: false,
    canMutateWorkspace: false,
    canCallProvider: false,
    operatorActionRequiredForReadPreview: true,
    observerVisible: true,
  };
}

function buildBlockedResponse({
  reason,
  workspace,
  language,
  taskId,
  targetIndex,
  selectedTarget = null,
  record = null,
  includeRead,
}) {
  const generatedAt = new Date().toISOString();
  return {
    ok: false,
    blocked: true,
    reason,
    registry: NATIVE_ENGINEERING_LSP_SELECTED_TARGET_READ_BRIDGE_REGISTRY,
    mode: "lsp-selected-target-to-native-read-bridge",
    generatedAt,
    identityLevel: "Level 1: stable user-space control plane",
    capability: {
      id: "sense.openclaw.engineering_tool.lsp_selected_target_read_bridge",
      sourceToolName: "cc_lsp+cc_read",
      operationClass: "lsp_target_to_bounded_workspace_read",
      risk: "low",
      approvalRequired: false,
    },
    workspace: normaliseWorkspace(workspace),
    sourceRecord: record
      ? {
          sourceTaskId: record.sourceTaskId ?? null,
          sourceApprovalId: record.sourceApprovalId ?? null,
          status: record.status ?? null,
          language: record.language ?? null,
          updatedAt: record.updatedAt ?? null,
        }
      : null,
    query: {
      taskId: taskId ?? null,
      language,
      targetIndex,
      includeRead,
    },
    selectedTarget,
    readRequest: null,
    readResult: null,
    bounds: {
      requiresCompletedSymbolRequestState: true,
      fileUriOnly: true,
      workspaceRootConstrained: true,
      pathTraversalProtection: true,
      usesNativeReadSearchBounds: true,
      noRawLspPayload: true,
      noJsonRpcSent: true,
      noLspServerStart: true,
      noWorkspaceMutation: true,
    },
    governance: buildGovernance({ includeRead, blocked: true }),
    auditEvidence: {
      operation: "lsp_selected_target_read_bridge",
      capabilityId: "sense.openclaw.engineering_tool.lsp_selected_target_read_bridge",
      generatedAt,
      persisted: false,
      evidenceKind: "response_embedded_selected_target_read_bridge",
      summary: { blocked: true, reason },
    },
    deferredExecutionBoundaries: [
      "no task creation",
      "no approval creation",
      "no JSON-RPC request sent",
      "no LSP server start",
      "no workspace mutation",
      "no provider call",
    ],
  };
}

export function createNativeEngineeringLspSelectedTargetReadBridgeBuilders({
  records,
  selectOpenClawToolCatalogWorkspace,
  buildNativeEngineeringReadFile,
} = {}) {
  if (typeof selectOpenClawToolCatalogWorkspace !== "function") {
    throw new Error("selectOpenClawToolCatalogWorkspace is required.");
  }
  if (typeof buildNativeEngineeringReadFile !== "function") {
    throw new Error("buildNativeEngineeringReadFile is required.");
  }

  function buildNativeEngineeringLspSelectedTargetReadBridge({
    workspacePath = null,
    language = "typescript",
    taskId = null,
    targetIndex = 0,
    contextLines = DEFAULT_CONTEXT_LINES,
    includeRead = false,
    maxOutputChars = DEFAULT_MAX_OUTPUT_CHARS,
    maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
  } = {}) {
    const safeLanguage = normaliseLanguage(language);
    const safeTargetIndex = normaliseNonNegativeInteger(targetIndex, 0, 7);
    const safeContextLines = normaliseNonNegativeInteger(contextLines, DEFAULT_CONTEXT_LINES, MAX_CONTEXT_LINES);
    const shouldIncludeRead = normaliseBoolean(includeRead, false);
    const record = findSymbolTargetRecord({
      records,
      workspacePath,
      language: safeLanguage,
      taskId: typeof taskId === "string" && taskId.trim() ? taskId.trim() : null,
    });

    if (!record) {
      return buildBlockedResponse({
        reason: "no_completed_symbol_request_target_state",
        workspace: workspacePath ? { path: workspacePath } : null,
        language: safeLanguage,
        taskId,
        targetIndex: safeTargetIndex,
        includeRead: shouldIncludeRead,
      });
    }

    const workspace = selectOpenClawToolCatalogWorkspace({
      workspacePath: workspacePath ?? record.workspace?.path ?? null,
    }).item;
    const responseSummary = responseSummaryFromRecord(record);
    const selectedTarget = selectedTargetFromSummary(responseSummary, safeTargetIndex);
    if (!selectedTarget) {
      return buildBlockedResponse({
        reason: "selected_symbol_target_missing",
        workspace,
        language: safeLanguage,
        taskId,
        targetIndex: safeTargetIndex,
        selectedTarget,
        record,
        includeRead: shouldIncludeRead,
      });
    }

    const uriResolution = targetUriToRelativePath({
      uri: selectedTarget.uri,
      workspaceRoot: workspace.path,
    });
    if (!uriResolution.ok) {
      return buildBlockedResponse({
        reason: uriResolution.reason,
        workspace,
        language: safeLanguage,
        taskId,
        targetIndex: safeTargetIndex,
        selectedTarget,
        record,
        includeRead: shouldIncludeRead,
      });
    }

    const readLines = rangeToReadLines(selectedTarget.range, safeContextLines);
    const readQuery = {
      workspacePath: workspace.path,
      relativePath: uriResolution.relativePath,
      startLine: readLines.startLine,
      endLine: readLines.endLine,
      maxOutputChars,
      maxFileSizeBytes,
    };
    const readEndpoint = "/plugins/native-adapter/engineering-read-search/read";
    const readParams = new URLSearchParams({
      workspacePath: workspace.path,
      relativePath: uriResolution.relativePath,
      startLine: String(readLines.startLine),
      endLine: String(readLines.endLine),
      maxOutputChars: String(maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS),
      maxFileSizeBytes: String(maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES),
    });
    const readResult = shouldIncludeRead
      ? buildNativeEngineeringReadFile(readQuery)
      : null;
    const generatedAt = new Date().toISOString();
    const summary = {
      sourceTaskId: record.sourceTaskId ?? null,
      selectedTargetFound: true,
      targetUri: selectedTarget.uri,
      relativePath: uriResolution.relativePath,
      startLine: readLines.startLine,
      endLine: readLines.endLine,
      contextLines: safeContextLines,
      includeRead: shouldIncludeRead,
      readPreviewReturned: Boolean(readResult),
      readOk: readResult?.ok ?? null,
      contentExposed: readResult?.target?.contentExposed === true,
      rawLspPayloadIncluded: false,
    };

    return {
      ok: true,
      blocked: false,
      registry: NATIVE_ENGINEERING_LSP_SELECTED_TARGET_READ_BRIDGE_REGISTRY,
      mode: "lsp-selected-target-to-native-read-bridge",
      generatedAt,
      identityLevel: "Level 1: stable user-space control plane",
      sourceCapability: {
        sourceToolName: "cc_lsp+cc_read",
        intendedNativeCapabilityId: "sense.openclaw.engineering_tool.lsp_selected_target_read_bridge",
        migrationMode: "completed_lsp_target_to_bounded_native_read",
      },
      capability: {
        id: "sense.openclaw.engineering_tool.lsp_selected_target_read_bridge",
        sourceToolName: "cc_lsp+cc_read",
        operationClass: "lsp_target_to_bounded_workspace_read",
        risk: "low",
        approvalRequired: false,
      },
      workspace: normaliseWorkspace(workspace),
      sourceRecord: {
        sourceTaskId: record.sourceTaskId ?? null,
        sourceApprovalId: record.sourceApprovalId ?? null,
        status: record.status ?? null,
        language: record.language ?? null,
        lifecycleAction: record.lifecycleAction ?? null,
        updatedAt: record.updatedAt ?? null,
        responseSummary: {
          observed: responseSummary?.observed === true,
          method: responseSummary?.method ?? null,
          resultKind: responseSummary?.resultKind ?? null,
          resultCount: responseSummary?.resultCount ?? 0,
          targetCount: responseSummary?.targetCount ?? 0,
          rawResultIncluded: responseSummary?.rawResultIncluded === true,
          rawTargetsIncluded: responseSummary?.rawTargetsIncluded === true,
        },
      },
      selectedTarget,
      target: {
        relativePath: uriResolution.relativePath,
        startLine: readLines.startLine,
        endLine: readLines.endLine,
        contextLines: safeContextLines,
        contentExposed: Boolean(readResult),
      },
      readRequest: {
        endpoint: readEndpoint,
        query: readQuery,
        url: `${readEndpoint}?${readParams.toString()}`,
        operatorActionRequired: !shouldIncludeRead,
      },
      readResult,
      summary,
      bounds: {
        requiresCompletedSymbolRequestState: true,
        fileUriOnly: true,
        workspaceRootConstrained: true,
        pathTraversalProtection: true,
        hiddenGeneratedCacheDirectoryPolicy: "blocked_by_native_read_search_policy",
        usesNativeReadSearchBounds: true,
        noRawLspPayload: true,
        noRawSourceBeyondReadSearchBudget: true,
        noJsonRpcSent: true,
        noLspServerStart: true,
        noTaskCreation: true,
        noApprovalCreation: true,
        noWorkspaceMutation: true,
        noProviderCall: true,
      },
      governance: buildGovernance({ includeRead: shouldIncludeRead, blocked: false }),
      auditEvidence: {
        operation: "lsp_selected_target_read_bridge",
        capabilityId: "sense.openclaw.engineering_tool.lsp_selected_target_read_bridge",
        generatedAt,
        persisted: false,
        evidenceKind: "response_embedded_selected_target_read_bridge",
        summary,
      },
      deferredExecutionBoundaries: [
        "no automatic target follow-up task creation",
        "no automatic approval creation",
        "no JSON-RPC request sent by this bridge",
        "no long-lived LSP process pool",
        "no workspace mutation",
        "no provider call",
      ],
      nextSmallestRealCapability: "Observer selected-target read control that calls this bridge explicitly after LSP task completion",
    };
  }

  return {
    buildNativeEngineeringLspSelectedTargetReadBridge,
  };
}
