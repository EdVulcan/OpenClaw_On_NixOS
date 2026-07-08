import path from "node:path";

export function createPluginReviewSourceCommandProposals({
  buildWorkspaceCommandProposals,
  buildNativeOpenClawToolCatalogProfile,
  buildNativeOpenClawPromptSemanticsProfile,
  normalisePositiveLimit,
  truncatePatchMetadata,
} = {}) {
function buildOpenClawSourceCommandProposals({
  workspacePath = null,
  query = "command",
  limit = 12,
} = {}) {
  const workspaceCommands = buildWorkspaceCommandProposals();
  const safeQuery = typeof query === "string" && query.trim() ? query.trim() : "command";
  const safeLimit = normalisePositiveLimit(limit, 12, 40);
  const selectedWorkspace = workspacePath
    ? workspaceCommands.items.find((item) => path.resolve(item.workspacePath) === path.resolve(workspacePath))?.workspacePath ?? workspacePath
    : workspaceCommands.items[0]?.workspacePath ?? workspacePath;
  let catalogProfile = null;
  let promptSemantics = null;
  try {
    catalogProfile = buildNativeOpenClawToolCatalogProfile({
      workspacePath: selectedWorkspace,
      query: safeQuery,
      limit: safeLimit,
    });
  } catch {
    catalogProfile = null;
  }
  try {
    promptSemantics = buildNativeOpenClawPromptSemanticsProfile({
      workspacePath: selectedWorkspace,
      query: safeQuery,
      limit: safeLimit,
    });
  } catch {
    promptSemantics = null;
  }

  const filteredItems = selectedWorkspace
    ? workspaceCommands.items.filter((item) => path.resolve(item.workspacePath) === path.resolve(selectedWorkspace))
    : workspaceCommands.items;
  const sourceRegistries = [
    workspaceCommands.registry,
    catalogProfile?.registry,
    promptSemantics?.registry,
  ].filter(Boolean);
  const commandTermCounts = promptSemantics?.derivedPlanSemantics?.promptTermCounts ?? {};
  const commandVocabularyFiles = (promptSemantics?.files ?? []).filter((file) => {
    const counts = file.signals?.semanticTermCounts ?? {};
    return (counts.command ?? 0) > 0 || (counts.shell ?? 0) > 0 || (counts.process ?? 0) > 0;
  }).length;
  const sourceCommandSignals = {
    registry: "openclaw-source-command-proposals-v0",
    mode: "read-only-command-proposal-absorption",
    sourceRegistries,
    query: truncatePatchMetadata(safeQuery, 120),
    toolSignals: {
      registry: catalogProfile?.registry ?? null,
      matchedTools: catalogProfile?.summary?.matchedTools ?? 0,
      matchedDocumentation: catalogProfile?.summary?.matchedDocumentation ?? 0,
      categories: catalogProfile?.categories ?? [],
      primaryTool: catalogProfile?.tools?.[0] ? {
        relativePath: catalogProfile.tools[0].relativePath,
        category: catalogProfile.tools[0].category,
        contentRead: false,
      } : null,
      contentExposed: false,
    },
    promptSignals: promptSemantics ? {
      registry: promptSemantics.registry,
      matchedFiles: promptSemantics.summary?.totalFiles ?? 0,
      commandVocabularyFiles,
      promptTermCounts: {
        command: commandTermCounts.command ?? 0,
        shell: commandTermCounts.shell ?? 0,
        process: commandTermCounts.process ?? 0,
        approval: commandTermCounts.approval ?? 0,
        safety: commandTermCounts.safety ?? 0,
      },
      contentExposed: false,
    } : null,
    governance: {
      canReadWorkspaceScripts: true,
      exposesScriptBodies: false,
      exposesPromptContent: false,
      exposesSourceFileContent: false,
      canExecute: false,
      canCreateTask: false,
      requiresSeparatePlanBeforeTask: true,
    },
  };
  const items = filteredItems.map((item) => ({
    ...item,
    sourceCommand: {
      registry: sourceCommandSignals.registry,
      absorbedFromEnhancedOpenClaw: true,
      matchedTools: sourceCommandSignals.toolSignals.matchedTools,
      promptSemanticFiles: sourceCommandSignals.promptSignals?.matchedFiles ?? 0,
      commandVocabularyFiles: sourceCommandSignals.promptSignals?.commandVocabularyFiles ?? 0,
      contentExposed: false,
    },
    governance: {
      ...(item.governance ?? {}),
      sourceAbsorptionMode: "proposal_only",
      canExecute: false,
      canCreateTaskFromSourceAbsorption: false,
      requiresExplicitExecutionApproval: true,
      exposesScriptBody: false,
      exposesPromptContent: false,
      exposesSourceFileContent: false,
    },
  }));

  return {
    ok: true,
    registry: "openclaw-source-command-proposals-v0",
    mode: "proposal-only-source-absorbed",
    generatedAt: new Date().toISOString(),
    sourceRegistry: workspaceCommands.registry,
    workspaceRegistry: workspaceCommands.workspaceRegistry,
    roots: workspaceCommands.roots,
    query: {
      text: safeQuery,
      limit: safeLimit,
    },
    count: items.length,
    items,
    sourceCommandSignals,
    summary: {
      ...workspaceCommands.summary,
      total: items.length,
      workspaces: new Set(items.map((item) => item.workspaceId)).size,
      matchedTools: sourceCommandSignals.toolSignals.matchedTools,
      promptSemanticFiles: sourceCommandSignals.promptSignals?.matchedFiles ?? 0,
      commandVocabularyFiles,
      canExecute: false,
      createsTask: false,
      createsApproval: false,
      exposesScriptBodies: false,
      exposesPromptContent: false,
      exposesSourceFileContent: false,
    },
    governance: {
      mode: "source_command_proposals_read_only",
      runtimeOwner: "openclaw_on_nixos",
      canReadWorkspaceScripts: true,
      exposesScriptBodies: false,
      canReadPromptContent: true,
      exposesPromptContent: false,
      canReadSourceMetadata: true,
      exposesSourceFileContent: false,
      canExecute: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
      requiresExplicitApprovalBeforeExecution: true,
    },
  };
}

  return {
    buildOpenClawSourceCommandProposals,
  };
}
