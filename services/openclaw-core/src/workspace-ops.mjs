import { createHash, randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createOpenClawNativePluginRegistry } from "../../../packages/plugin-runtime/src/plugin-registry.mjs";
import {
  applyWorkspacePatchEdits,
  buildDiffPreview,
  buildWorkspacePatchDiffPreview,
  normaliseWorkspacePatchEdits,
  validateWorkspacePatchDiffPreview,
} from "./workspace-patch-utils.mjs";

export function createWorkspaceOps(deps) {
  const {
    client,
    state,
    selectOpenClawToolCatalogWorkspace,
    buildWorkspaceCommandProposals,
    buildOpenClawSourceCommandProposals,
    buildNativeOpenClawToolCatalogProfile,
    buildNativeOpenClawWorkspaceSemanticIndex,
    buildNativeOpenClawWorkspaceEditTargetSelection,
    buildNativeOpenClawPromptSemanticsProfile,
    buildRulePlan,
    createTask,
    supersedeOtherActiveTasks,
    reconcileRuntimeState,
    serialiseTask,
    serialisePlanForPublic,
    createApprovalRequestForTask,
    serialiseApproval,
    publishTaskApprovalIfPending,
    publishEvent,
  } = deps;
  const { postJson } = client;
  const { tasks, persistState, workspaceRoots, autonomyMode } = state;

  // L5977-7324
function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeStat(rootPath) {
  try {
    return statSync(rootPath);
  } catch {
    return null;
  }
}

function redactPublicParams(params) {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return params ?? {};
  }
  const redacted = { ...params };
  for (const key of ["content", "body", "data"]) {
    if (typeof redacted[key] === "string") {
      redacted[key] = `[redacted:${Buffer.byteLength(redacted[key], "utf8")} bytes]`;
    }
  }
  return redacted;
}

function resolveOpenClawWorkspaceTarget({ workspacePath = null, relativePath = null } = {}) {
  const { item } = selectOpenClawToolCatalogWorkspace({ workspacePath });
  const safeRelativePath = typeof relativePath === "string" && relativePath.trim()
    ? relativePath.trim().replaceAll("\\", "/")
    : null;
  if (!safeRelativePath) {
    throw new Error("relativePath is required for OpenClaw workspace text writes.");
  }
  if (safeRelativePath.startsWith("/") || safeRelativePath.includes("..")) {
    throw new Error("OpenClaw workspace text writes require a bounded relative path inside the workspace.");
  }

  const absolutePath = path.resolve(item.path, safeRelativePath);
  const workspaceRoot = path.resolve(item.path);
  const normalisedTarget = process.platform === "win32" ? absolutePath.toLowerCase() : absolutePath;
  const normalisedRoot = process.platform === "win32" ? workspaceRoot.toLowerCase() : workspaceRoot;
  if (normalisedTarget !== normalisedRoot && !normalisedTarget.startsWith(`${normalisedRoot}${path.sep}`)) {
    throw new Error("OpenClaw workspace text write target is outside the selected workspace.");
  }

  return {
    workspace: item,
    relativePath: safeRelativePath,
    absolutePath,
  };
}

function buildNativeOpenClawWorkspaceTextWriteDraft({
  workspacePath = null,
  relativePath = "scratch/native-write.txt",
  content = "",
  overwrite = true,
} = {}) {
  const target = resolveOpenClawWorkspaceTarget({ workspacePath, relativePath });
  const safeContent = typeof content === "string" ? content : "";
  const contentBytes = Buffer.byteLength(safeContent, "utf8");
  const contentSha256 = sha256Hex(safeContent);
  const nativeRegistry = createOpenClawNativePluginRegistry();
  const capability = nativeRegistry.items[0]?.contract?.capabilities
    ?.find((entry) => entry.id === "act.openclaw.workspace_text_write") ?? null;
  const now = new Date().toISOString();
  const goal = `Apply approved OpenClaw workspace text write to ${target.relativePath}`;
  const policyRequest = {
    intent: "openclaw.workspace.write_text",
    domain: "body_internal",
    risk: "high",
    requiresApproval: true,
    tags: ["openclaw_native_adapter", "workspace_mutation", "explicit_approval_required"],
  };
  const action = {
    kind: "filesystem.write_text",
    intent: "filesystem.write_text",
    params: {
      path: target.absolutePath,
      content: safeContent,
      encoding: "utf8",
      overwrite: overwrite !== false,
    },
  };
  const plan = buildRulePlan({
    goal,
    type: "system_task",
    intent: "filesystem.write_text",
    policy: policyRequest,
    targetUrl: null,
    actions: [action],
  });
  const policyDecision = {
    id: randomUUID(),
    at: now,
    engine: "openclaw-native-workspace-text-write-v0",
    stage: "openclaw.native.workspace_text_write.task",
    subject: {
      taskId: null,
      type: "system_task",
      goal,
      targetUrl: null,
      intent: "openclaw.workspace.write_text",
    },
    domain: "body_internal",
    risk: "high",
    decision: "require_approval",
    reason: "openclaw_workspace_text_write_requires_explicit_user_approval",
    approved: false,
    autonomyMode,
    autonomous: false,
  };

  return {
    registry: "openclaw-native-workspace-text-write-draft-v0",
    mode: "approval-gated-draft",
    generatedAt: now,
    sourceRegistry: "openclaw-native-plugin-adapter-v0",
    capability: {
      id: capability?.id ?? "act.openclaw.workspace_text_write",
      kind: capability?.kind ?? "act",
      risk: capability?.risk ?? "high",
      approvalRequired: capability?.approval?.required ?? true,
      runtimeOwner: capability?.runtimeOwner ?? "openclaw_on_nixos",
    },
    workspace: {
      id: target.workspace.id,
      name: target.workspace.name,
      path: target.workspace.path,
    },
    target: {
      relativePath: target.relativePath,
      path: target.absolutePath,
      contentBytes,
      contentSha256,
      overwrite: overwrite !== false,
      contentExposed: false,
    },
    draft: {
      goal,
      type: "system_task",
      action: {
        ...action,
        params: redactPublicParams(action.params),
      },
      plan,
      policy: {
        request: policyRequest,
        decision: policyDecision,
      },
      governance: {
        createsTask: false,
        createsApproval: false,
        canExecuteWithoutApproval: false,
        requiresExplicitApproval: true,
        usesFilesystemWriteCapability: true,
        exposesContent: false,
      },
    },
  };
}

async function createNativeOpenClawWorkspaceTextWriteTask({
  workspacePath = null,
  relativePath = "scratch/native-write.txt",
  content = "",
  overwrite = true,
  confirm = false,
} = {}) {
  if (confirm !== true) {
    throw new Error("OpenClaw workspace text write task creation requires confirm=true.");
  }

  const draftEnvelope = buildNativeOpenClawWorkspaceTextWriteDraft({
    workspacePath,
    relativePath,
    content,
    overwrite,
  });
  const draft = draftEnvelope.draft;
  const task = createTask({
    goal: draft.goal,
    type: draft.type,
    workViewStrategy: "openclaw-native-workspace-text-write",
    plan: draft.plan,
    policy: draft.policy.request,
  }, { skipInitialPolicy: true });
  task.policy = draft.policy;
  const approval = createApprovalRequestForTask(task, draft.policy.decision);
  const reclaimedTasks = supersedeOtherActiveTasks(task.id);
  reconcileRuntimeState();
  persistState();

  await publishEvent("task.created", { task: serialiseTask(task), planner: "openclaw-native-workspace-text-write-v0" });
  await publishTaskApprovalIfPending(task);
  await publishEvent("task.planned", { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
  await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
    task: serialiseTask(reclaimedTask),
  })));

  return {
    registry: "openclaw-native-workspace-text-write-task-v0",
    mode: "approval-gated",
    generatedAt: new Date().toISOString(),
    sourceRegistry: draftEnvelope.registry,
    capability: draftEnvelope.capability,
    workspace: draftEnvelope.workspace,
    target: draftEnvelope.target,
    task,
    approval,
    governance: {
      mode: "native_workspace_text_write_approval_gated",
      runtimeOwner: "openclaw_on_nixos",
      createsTask: true,
      createsApproval: true,
      canExecuteWithoutApproval: false,
      usesFilesystemWriteCapability: true,
      recordsCapabilityHistory: true,
      recordsFilesystemLedger: true,
      exposesContent: false,
      executed: false,
    },
  };
}

function readBoundedWorkspaceTextFile(target, { maxBytes = 64 * 1024 } = {}) {
  const stats = safeStat(target.absolutePath);
  if (!stats?.isFile()) {
    throw new Error("OpenClaw workspace patch target must be an existing regular file.");
  }
  if (stats.size > maxBytes) {
    throw new Error("OpenClaw workspace patch target exceeds the bounded read limit.");
  }
  return readFileSync(target.absolutePath, "utf8");
}

function truncatePatchMetadata(value, maxLength = 240) {
  const text = typeof value === "string" ? value : "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function normalisePatchMetadataList(value, { fallback = [], maxItems = 8, maxLength = 80 } = {}) {
  const items = Array.isArray(value) ? value : fallback;
  return items
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => truncatePatchMetadata(item.trim(), maxLength))
    .slice(0, maxItems);
}

function normaliseRationaleReasons(value, { maxItems = 6 } = {}) {
  const items = Array.isArray(value) ? value : [];
  return items
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `reason-${index + 1}`,
          label: truncatePatchMetadata(item, 96),
          detail: truncatePatchMetadata(item, 220),
          contentExposed: false,
        };
      }
      if (!item || typeof item !== "object") {
        return null;
      }
      return {
        id: truncatePatchMetadata(item.id ?? `reason-${index + 1}`, 64),
        label: truncatePatchMetadata(item.label ?? item.title ?? "proposal reason", 96),
        detail: truncatePatchMetadata(item.detail ?? item.summary ?? item.reason ?? "", 220),
        evidence: normalisePatchMetadataList(item.evidence, { maxItems: 4, maxLength: 120 }),
        contentExposed: false,
      };
    })
    .filter(Boolean)
    .slice(0, maxItems);
}

function normaliseSourceSignalSummary(value = {}) {
  const raw = value && typeof value === "object" ? value : {};
  return {
    sourceRegistries: normalisePatchMetadataList(raw.sourceRegistries, { maxItems: 6, maxLength: 120 }),
    matchedTools: Number.isFinite(raw.matchedTools) ? raw.matchedTools : 0,
    matchedSemanticFiles: Number.isFinite(raw.matchedSemanticFiles) ? raw.matchedSemanticFiles : 0,
    promptSemanticFiles: Number.isFinite(raw.promptSemanticFiles) ? raw.promptSemanticFiles : 0,
    targetRelativePath: truncatePatchMetadata(raw.targetRelativePath ?? "", 180) || null,
    primarySymbol: truncatePatchMetadata(raw.primarySymbol ?? "", 120) || null,
    contentExposed: false,
  };
}

function normaliseRationaleBundle(value, fallback = {}) {
  const raw = value && typeof value === "object" ? value : fallback;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return {
    registry: truncatePatchMetadata(raw.registry ?? "openclaw-rationale-check-bundle-v0", 120),
    summary: truncatePatchMetadata(raw.summary ?? "Source-derived proposal rationale bundle.", 260),
    reasons: normaliseRationaleReasons(raw.reasons),
    sourceSignals: normaliseSourceSignalSummary(raw.sourceSignals),
    contentExposed: false,
  };
}

function normaliseCheckBundle(value, fallback = {}) {
  const raw = value && typeof value === "object" ? value : fallback;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return {
    registry: truncatePatchMetadata(raw.registry ?? "openclaw-rationale-check-bundle-v0", 120),
    required: normalisePatchMetadataList(raw.required, { maxItems: 10, maxLength: 80 }),
    recommended: normalisePatchMetadataList(raw.recommended, { maxItems: 8, maxLength: 80 }),
    blockedUntilApproval: normalisePatchMetadataList(raw.blockedUntilApproval, { maxItems: 8, maxLength: 100 }),
    contentExposed: false,
  };
}

function normaliseRiskNotes(value, fallback = {}) {
  const raw = value && typeof value === "object" ? value : fallback;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return {
    registry: truncatePatchMetadata(raw.registry ?? "openclaw-rationale-check-bundle-v0", 120),
    risk: truncatePatchMetadata(raw.risk ?? "high", 40),
    approvalRequired: raw.approvalRequired !== false,
    notes: normalisePatchMetadataList(raw.notes, { maxItems: 8, maxLength: 160 }),
    contentExposed: false,
  };
}

function buildWorkspacePatchProposalEnvelope({
  proposal = null,
  target,
  capability,
  safeEdits,
  diffPreview,
  validation,
} = {}) {
  const raw = proposal && typeof proposal === "object" ? proposal : {};
  const title = truncatePatchMetadata(raw.title ?? raw.summary ?? `Patch ${target.relativePath}`, 120);
  const rationale = truncatePatchMetadata(raw.rationale ?? raw.reason ?? "No rationale supplied.", 320);
  const targetContext = raw.targetContext && typeof raw.targetContext === "object" ? raw.targetContext : {};
  const symbol = truncatePatchMetadata(targetContext.symbol ?? raw.symbol ?? "", 120);
  const fileRole = truncatePatchMetadata(targetContext.fileRole ?? raw.fileRole ?? "", 160);
  const rawEditIntent = raw.editIntent && typeof raw.editIntent === "object" ? raw.editIntent : null;
  const rawSemanticPlan = raw.semanticPlan && typeof raw.semanticPlan === "object" ? raw.semanticPlan : null;
  const expectedChecks = normalisePatchMetadataList(raw.expectedChecks, {
    fallback: ["diff-preview", "approval-required", "filesystem-ledger"],
    maxItems: 8,
    maxLength: 64,
  });

  return {
    id: typeof raw.id === "string" && raw.id ? truncatePatchMetadata(raw.id, 96) : randomUUID(),
    registry: "openclaw-native-workspace-edit-proposal-v0",
    mode: "proposal-envelope",
    title,
    rationale,
    source: truncatePatchMetadata(raw.source ?? "native-openclaw-workspace-patch-adapter", 120),
    targetContext: {
      workspace: target.workspace.name,
      relativePath: target.relativePath,
      symbol: symbol || null,
      fileRole: fileRole || null,
    },
    editIntent: rawEditIntent ? {
      kind: truncatePatchMetadata(rawEditIntent.kind ?? "workspace_edit", 80),
      objective: truncatePatchMetadata(rawEditIntent.objective ?? "", 180),
      planningStyle: truncatePatchMetadata(rawEditIntent.planningStyle ?? "", 80) || null,
      targetSafety: truncatePatchMetadata(rawEditIntent.targetSafety ?? "", 80) || null,
      verificationStyle: normalisePatchMetadataList(rawEditIntent.verificationStyle, { maxItems: 6, maxLength: 64 }),
      contentExposed: false,
    } : null,
    expectedChecks,
    semanticPlan: rawSemanticPlan ? {
      registry: truncatePatchMetadata(rawSemanticPlan.registry ?? "unknown", 120),
      mode: truncatePatchMetadata(rawSemanticPlan.mode ?? "unknown", 120),
      promptFiles: Number.isFinite(rawSemanticPlan.promptFiles) ? rawSemanticPlan.promptFiles : 0,
      expectedChecks: normalisePatchMetadataList(rawSemanticPlan.expectedChecks, { maxItems: 8, maxLength: 64 }),
      contentExposed: false,
    } : null,
    rationaleBundle: normaliseRationaleBundle(raw.rationaleBundle, raw.source === "openclaw-source-derived-edit-proposal-v0" ? {
      registry: "openclaw-rationale-check-bundle-v0",
      summary: rationale,
      reasons: [rationale],
      sourceSignals: {
        sourceRegistries: [raw.source].filter(Boolean),
        targetRelativePath: target.relativePath,
        primarySymbol: symbol,
      },
    } : null),
    checkBundle: normaliseCheckBundle(raw.checkBundle, raw.source === "openclaw-source-derived-edit-proposal-v0" ? {
      registry: "openclaw-rationale-check-bundle-v0",
      required: expectedChecks,
      recommended: ["run targeted milestone checks after approval"],
      blockedUntilApproval: ["filesystem mutation", "workspace write ledger entry"],
    } : null),
    riskNotes: normaliseRiskNotes(raw.riskNotes, raw.source === "openclaw-source-derived-edit-proposal-v0" ? {
      registry: "openclaw-rationale-check-bundle-v0",
      risk: capability.risk,
      approvalRequired: capability.approvalRequired,
      notes: [
        "Patch execution remains approval-gated.",
        "Prompt/source bodies and function bodies remain redacted.",
        "Approved execution still uses act.filesystem.write_text.",
      ],
    } : null),
    dryRun: {
      ok: true,
      editCount: safeEdits.length,
      editKinds: [...new Set(safeEdits.map((edit) => edit.kind))],
      diffFormat: diffPreview.format,
      hunkCount: diffPreview.hunkCount ?? 1,
      previewLineCount: diffPreview.previewLineCount ?? 0,
      validationEngines: [
        validation.structuredPatch.engine,
        validation.preview.engine,
      ],
      contentExposed: false,
    },
    governance: {
      capabilityId: capability.id,
      risk: capability.risk,
      approvalRequired: capability.approvalRequired,
      runtimeOwner: capability.runtimeOwner,
      usesFilesystemWriteCapability: true,
      createsTaskBeforeApproval: false,
    },
  };
}

function buildSourceDerivedProposalBundles({
  sourceSignals,
  expectedChecks,
  relativePath,
  query,
  primarySymbol,
  fileRole,
  capabilityRisk = "high",
} = {}) {
  const sourceRegistries = normalisePatchMetadataList(sourceSignals?.sourceRegistries, { maxItems: 6, maxLength: 120 });
  const matchedTools = sourceSignals?.toolSignals?.matchedTools ?? 0;
  const matchedSemanticFiles = sourceSignals?.semanticSignals?.matchedFiles ?? 0;
  const promptSemanticFiles = sourceSignals?.promptSignals?.matchedFiles ?? 0;
  const promptChecks = sourceSignals?.promptSignals?.expectedChecks ?? [];
  const requiredChecks = normalisePatchMetadataList([
    ...expectedChecks,
    "patch-validation",
    "diff-preview",
    "approval-required",
    "filesystem-ledger",
  ], { maxItems: 10, maxLength: 80 });
  const verificationChecks = requiredChecks.filter((check) => ["typecheck", "test", "lint", "verify"].includes(check));

  return {
    rationaleBundle: {
      registry: "openclaw-rationale-check-bundle-v0",
      summary: `Rationale for source-derived edit proposal targeting ${relativePath}.`,
      reasons: [
        {
          id: "tool-catalog-signal",
          label: "Enhanced OpenClaw tool catalog matched the edit query.",
          detail: `Query "${query}" matched ${matchedTools} redacted tool metadata entries; no tool module was imported or executed.`,
          evidence: sourceRegistries,
        },
        {
          id: "semantic-target-signal",
          label: "Semantic index identified a bounded workspace target.",
          detail: `Target ${relativePath} is associated with ${primarySymbol || "no exported symbol"} and role ${fileRole || "openclaw source signal"}.`,
          evidence: [`semanticFiles=${matchedSemanticFiles}`, `promptFiles=${promptSemanticFiles}`],
        },
        {
          id: "prompt-check-signal",
          label: "Prompt/tool semantics contributed verification expectations.",
          detail: `Derived checks: ${promptChecks.join(",") || "none"}; prompt bodies remain hidden.`,
          evidence: verificationChecks,
        },
      ],
      sourceSignals: {
        sourceRegistries,
        matchedTools,
        matchedSemanticFiles,
        promptSemanticFiles,
        targetRelativePath: relativePath,
        primarySymbol,
      },
      contentExposed: false,
    },
    checkBundle: {
      registry: "openclaw-rationale-check-bundle-v0",
      required: requiredChecks,
      recommended: normalisePatchMetadataList([
        verificationChecks.length > 0 ? "run prompt-derived verification checks" : "run project verification command",
        "inspect Observer diff preview before approval",
        "run targeted milestone checks after merge",
      ], { maxItems: 6, maxLength: 90 }),
      blockedUntilApproval: [
        "filesystem mutation",
        "workspace write ledger entry",
        "operator execution of generated patch task",
      ],
      contentExposed: false,
    },
    riskNotes: {
      registry: "openclaw-rationale-check-bundle-v0",
      risk: capabilityRisk,
      approvalRequired: true,
      notes: [
        "This proposal is derived from redacted source, prompt, and semantic signals only.",
        "No enhanced OpenClaw source module is imported or executed by this adapter.",
        "Patch execution remains explicit-approval gated and writes through act.filesystem.write_text.",
        "Observer output must not expose prompt bodies, source file bodies, search text, or replacement text.",
      ],
      contentExposed: false,
    },
  };
}

function buildOpenClawSourceDerivedPatchProposal({
  workspacePath = null,
  relativePath = "scratch/native-edit.txt",
  query = "edit",
} = {}) {
  const catalogProfile = buildNativeOpenClawToolCatalogProfile({
    workspacePath,
    query,
    limit: 8,
  });
  const semanticIndex = buildNativeOpenClawWorkspaceSemanticIndex({
    workspacePath,
    scope: "tools",
    query,
    limit: 8,
  });
  const primaryTool = catalogProfile.tools?.[0] ?? null;
  const primarySemanticFile = semanticIndex.files?.[0] ?? null;
  const categories = [...new Set((catalogProfile.tools ?? []).map((tool) => tool.category).filter(Boolean))];
  let promptSemantics = null;
  try {
    promptSemantics = buildNativeOpenClawPromptSemanticsProfile({
      workspacePath,
      query,
      limit: 12,
    });
  } catch {
    promptSemantics = null;
  }
  const promptExpectedChecks = promptSemantics?.derivedPlanSemantics?.expectedChecks ?? [];
  const expectedChecks = normalisePatchMetadataList([
    ...promptExpectedChecks,
    "patch-validation",
    "diff-preview",
    "approval-required",
    "filesystem-ledger",
  ]);
  const sourceSignals = {
    registry: "openclaw-source-derived-edit-proposal-v0",
    mode: "read-only-source-signal-derivation",
    sourceRegistries: [catalogProfile.registry, semanticIndex.registry, promptSemantics?.registry].filter(Boolean),
    query,
    toolSignals: {
      matchedTools: catalogProfile.summary?.matchedTools ?? 0,
      categories,
      primaryTool: primaryTool ? {
        relativePath: primaryTool.relativePath,
        category: primaryTool.category,
        documented: Boolean(primaryTool.documented),
        contentRead: false,
      } : null,
    },
    semanticSignals: {
      matchedFiles: semanticIndex.files?.length ?? 0,
      totalDeclarations: semanticIndex.summary?.exportedFunctions ?? 0,
      primaryFile: primarySemanticFile ? {
        relativePath: primarySemanticFile.relativePath,
        kind: primarySemanticFile.kind,
        category: primarySemanticFile.category,
        lineCount: primarySemanticFile.lineCount,
        contentExposed: false,
      } : null,
    },
    promptSignals: promptSemantics ? {
      registry: promptSemantics.registry,
      matchedFiles: promptSemantics.summary?.totalFiles ?? 0,
      editVocabularyFiles: promptSemantics.summary?.editVocabularyFiles ?? 0,
      verificationVocabularyFiles: promptSemantics.summary?.verificationVocabularyFiles ?? 0,
      governanceVocabularyFiles: promptSemantics.summary?.governanceVocabularyFiles ?? 0,
      expectedChecks,
      contentExposed: false,
    } : null,
    governance: {
      canReadMetadata: true,
      canReadSourceFileContent: true,
      canReadPromptContent: true,
      exposesSourceFileContent: false,
      exposesPromptContent: false,
      canExecuteToolCode: false,
      canImportModule: false,
      canMutate: false,
    },
  };
  const targetSymbol = primarySemanticFile?.signals?.exports?.[0] ?? primaryTool?.fileName ?? "openclaw-source-signal";
  const fileRole = categories[0] ? `openclaw ${categories[0]} source signal` : "openclaw source signal";
  const bundles = buildSourceDerivedProposalBundles({
    sourceSignals,
    expectedChecks,
    relativePath,
    query,
    primarySymbol: targetSymbol,
    fileRole,
  });

  return {
    id: `source-derived-${sha256Hex(`${catalogProfile.workspace?.path ?? ""}:${relativePath}:${query}`).slice(0, 12)}`,
    title: `Source-derived OpenClaw edit proposal for ${relativePath}`,
    rationale: [
      `Derived from enhanced OpenClaw read-only tool catalog and semantic index signals for query "${query}".`,
      `Matched ${sourceSignals.toolSignals.matchedTools} tool metadata entries, ${sourceSignals.semanticSignals.matchedFiles} semantic files, and ${sourceSignals.promptSignals?.matchedFiles ?? 0} prompt semantic files without importing or executing source modules.`,
    ].join(" "),
    source: sourceSignals.registry,
    targetContext: {
      symbol: targetSymbol,
      fileRole,
    },
    editIntent: {
      kind: "source_derived_workspace_edit",
      objective: `Patch ${relativePath} using enhanced OpenClaw prompt/tool semantics for "${query}".`,
      planningStyle: promptSemantics?.derivedPlanSemantics?.editIntent?.planningStyle ?? "direct_patch_review",
      targetSafety: promptSemantics?.derivedPlanSemantics?.editIntent?.targetSafety ?? "approval_gated",
      verificationStyle: promptSemantics?.derivedPlanSemantics?.editIntent?.verificationStyle ?? [],
    },
    expectedChecks,
    semanticPlan: promptSemantics ? {
      registry: promptSemantics.registry,
      mode: promptSemantics.mode,
      promptFiles: promptSemantics.summary?.totalFiles ?? 0,
      expectedChecks,
    } : null,
    ...bundles,
    sourceSignals,
  };
}

function buildNativeOpenClawWorkspacePatchApplyDraft({
  workspacePath = null,
  relativePath = null,
  search = "",
  replacement = "",
  occurrence = 1,
  edits = null,
  contextLines = 1,
  proposal = null,
  deriveProposalFromSource = false,
  proposalQuery = "edit",
  selectTargetFromSource = false,
  targetSelectionQuery = null,
  targetSelectionScope = "tools",
} = {}) {
  const targetSelection = selectTargetFromSource
    ? buildNativeOpenClawWorkspaceEditTargetSelection({
      workspacePath,
      scope: targetSelectionScope,
      query: targetSelectionQuery ?? proposalQuery,
      limit: 8,
    })
    : null;
  const effectiveRelativePath = targetSelection?.selectedTarget?.relativePath
    ?? relativePath
    ?? "scratch/native-edit.txt";
  const target = resolveOpenClawWorkspaceTarget({ workspacePath, relativePath: effectiveRelativePath });
  const safeEdits = normaliseWorkspacePatchEdits({ edits, search, replacement, occurrence });
  const originalContent = readBoundedWorkspaceTextFile(target);
  const { nextContent, appliedEdits, validation } = applyWorkspacePatchEdits(originalContent, safeEdits);
  const diffPreview = buildWorkspacePatchDiffPreview(originalContent, nextContent, appliedEdits, { contextLines });
  const previewValidation = validateWorkspacePatchDiffPreview(diffPreview);
  const originalBytes = Buffer.byteLength(originalContent, "utf8");
  const replacementBytes = appliedEdits.reduce((total, edit) => total + edit.replacementBytes, 0);
  const nextBytes = Buffer.byteLength(nextContent, "utf8");
  const nativeRegistry = createOpenClawNativePluginRegistry();
  const capability = nativeRegistry.items[0]?.contract?.capabilities
    ?.find((entry) => entry.id === "act.openclaw.workspace_patch_apply") ?? null;
  const now = new Date().toISOString();
  const goal = `Apply approved OpenClaw workspace patch to ${target.relativePath}`;
  const policyRequest = {
    intent: "openclaw.workspace.patch_apply",
    domain: "body_internal",
    risk: "high",
    requiresApproval: true,
    tags: ["openclaw_native_adapter", "workspace_patch", "workspace_mutation", "explicit_approval_required"],
  };
  const action = {
    kind: "filesystem.write_text",
    intent: "filesystem.write_text",
    params: {
      path: target.absolutePath,
      content: nextContent,
      encoding: "utf8",
      overwrite: true,
    },
  };
  const plan = buildRulePlan({
    goal,
    type: "system_task",
    intent: "filesystem.write_text",
    policy: policyRequest,
    targetUrl: null,
    actions: [action],
  });
  const policyDecision = {
    id: randomUUID(),
    at: now,
    engine: "openclaw-native-workspace-patch-apply-v0",
    stage: "openclaw.native.workspace_patch_apply.task",
    subject: {
      taskId: null,
      type: "system_task",
      goal,
      targetUrl: null,
      intent: "openclaw.workspace.patch_apply",
    },
    domain: "body_internal",
    risk: "high",
    decision: "require_approval",
    reason: "openclaw_workspace_patch_apply_requires_explicit_user_approval",
    approved: false,
    autonomyMode,
    autonomous: false,
  };
  const capabilityEnvelope = {
    id: capability?.id ?? "act.openclaw.workspace_patch_apply",
    kind: capability?.kind ?? "act",
    risk: capability?.risk ?? "high",
    approvalRequired: capability?.approval?.required ?? true,
    runtimeOwner: capability?.runtimeOwner ?? "openclaw_on_nixos",
  };
  const validationEnvelope = {
    ok: true,
    structuredPatch: validation,
    preview: previewValidation,
  };
  const sourceDerivedProposal = deriveProposalFromSource
    ? buildOpenClawSourceDerivedPatchProposal({
      workspacePath,
      relativePath: target.relativePath,
      query: proposalQuery,
    })
    : null;
  const proposalEnvelope = buildWorkspacePatchProposalEnvelope({
    proposal: sourceDerivedProposal ?? proposal,
    target,
    capability: capabilityEnvelope,
    safeEdits,
    diffPreview,
    validation: validationEnvelope,
  });

  return {
    registry: "openclaw-native-workspace-patch-apply-draft-v0",
    mode: "diff-preview-approval-gated-draft",
    generatedAt: now,
    sourceRegistry: "openclaw-native-plugin-adapter-v0",
    capability: capabilityEnvelope,
    workspace: {
      id: target.workspace.id,
      name: target.workspace.name,
      path: target.workspace.path,
    },
    target: {
      relativePath: target.relativePath,
      path: target.absolutePath,
      originalBytes,
      nextBytes,
      replacementBytes,
      originalSha256: sha256Hex(originalContent),
      nextSha256: sha256Hex(nextContent),
      editCount: safeEdits.length,
      replacementsAvailable: appliedEdits.reduce((total, edit) => total + edit.replacementsAvailable, 0),
      occurrence: safeEdits.length === 1 ? safeEdits[0].occurrence : null,
      changedAtLine: appliedEdits[0]?.changedAtLine ?? null,
      changedAtLines: appliedEdits.map((edit) => edit.changedAtLine),
      contentExposed: false,
      diffPreviewExposed: true,
    },
    validation: validationEnvelope,
    proposal: proposalEnvelope,
    proposalSourceSignals: sourceDerivedProposal?.sourceSignals ?? null,
    targetSelection,
    edits: appliedEdits.map((edit) => ({
      index: edit.index,
      kind: edit.kind,
      occurrence: edit.occurrence,
      startLine: edit.startLine,
      endLine: edit.endLine,
      originalStart: edit.originalStart,
      originalEnd: edit.originalEnd,
      searchBytes: edit.searchBytes,
      replacementsAvailable: edit.replacementsAvailable,
      replacementBytes: edit.replacementBytes,
      changedAtLine: edit.changedAtLine,
      searchExposed: false,
      replacementExposed: false,
    })),
    diffPreview,
    draft: {
      goal,
      type: "system_task",
      action: {
        ...action,
        params: redactPublicParams(action.params),
      },
      plan,
      policy: {
        request: policyRequest,
        decision: policyDecision,
      },
      governance: {
        createsTask: false,
        createsApproval: false,
        canExecuteWithoutApproval: false,
        requiresExplicitApproval: true,
        usesFilesystemWriteCapability: true,
        exposesFullContent: false,
        exposesDiffPreview: true,
      },
    },
  };
}

async function createNativeOpenClawWorkspacePatchApplyTask({
  workspacePath = null,
  relativePath = null,
  search = "",
  replacement = "",
  occurrence = 1,
  edits = null,
  contextLines = 1,
  proposal = null,
  deriveProposalFromSource = false,
  proposalQuery = "edit",
  selectTargetFromSource = false,
  targetSelectionQuery = null,
  targetSelectionScope = "tools",
  confirm = false,
} = {}) {
  if (confirm !== true) {
    throw new Error("OpenClaw workspace patch apply task creation requires confirm=true.");
  }

  const draftEnvelope = buildNativeOpenClawWorkspacePatchApplyDraft({
    workspacePath,
    relativePath,
    search,
    replacement,
    occurrence,
    edits,
    contextLines,
    proposal,
    deriveProposalFromSource,
    proposalQuery,
    selectTargetFromSource,
    targetSelectionQuery,
    targetSelectionScope,
  });
  const draft = draftEnvelope.draft;
  const task = createTask({
    goal: draft.goal,
    type: draft.type,
    workViewStrategy: "openclaw-native-workspace-patch-apply",
    plan: draft.plan,
    policy: draft.policy.request,
  }, { skipInitialPolicy: true });
  task.policy = draft.policy;
  const approval = createApprovalRequestForTask(task, draft.policy.decision);
  const reclaimedTasks = supersedeOtherActiveTasks(task.id);
  reconcileRuntimeState();
  persistState();

  await publishEvent("task.created", { task: serialiseTask(task), planner: "openclaw-native-workspace-patch-apply-v0" });
  await publishTaskApprovalIfPending(task);
  await publishEvent("task.planned", { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
  await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
    task: serialiseTask(reclaimedTask),
  })));

  return {
    registry: "openclaw-native-workspace-patch-apply-task-v0",
    mode: "diff-preview-approval-gated",
    generatedAt: new Date().toISOString(),
    sourceRegistry: draftEnvelope.registry,
    capability: draftEnvelope.capability,
    workspace: draftEnvelope.workspace,
    target: draftEnvelope.target,
    validation: draftEnvelope.validation,
    proposal: draftEnvelope.proposal,
    proposalSourceSignals: draftEnvelope.proposalSourceSignals,
    targetSelection: draftEnvelope.targetSelection,
    edits: draftEnvelope.edits,
    diffPreview: draftEnvelope.diffPreview,
    task,
    approval,
    governance: {
      mode: "native_workspace_patch_apply_approval_gated",
      runtimeOwner: "openclaw_on_nixos",
      createsTask: true,
      createsApproval: true,
      canExecuteWithoutApproval: false,
      usesFilesystemWriteCapability: true,
      recordsCapabilityHistory: true,
      recordsFilesystemLedger: true,
      exposesFullContent: false,
      exposesDiffPreview: true,
      executed: false,
    },
  };
}

function buildOpenClawSourceAuthoredEditDraft({
  workspacePath = null,
  proposalQuery = "edit",
  targetSelectionQuery = null,
  targetSelectionScope = "tools",
  edits = null,
  search = "",
  replacement = "",
  occurrence = 1,
  contextLines = 0,
} = {}) {
  const draft = buildNativeOpenClawWorkspacePatchApplyDraft({
    workspacePath,
    search,
    replacement,
    occurrence,
    edits,
    contextLines,
    deriveProposalFromSource: true,
    proposalQuery,
    selectTargetFromSource: true,
    targetSelectionQuery: targetSelectionQuery ?? proposalQuery,
    targetSelectionScope,
  });
  const sourceAuthoredEdit = {
    registry: "openclaw-source-authored-edit-v0",
    mode: "approval-gated-source-authored-edit-draft",
    sourceRegistry: draft.proposal?.source ?? "openclaw-source-derived-edit-proposal-v0",
    proposalRegistry: draft.proposal?.registry ?? "openclaw-native-workspace-edit-proposal-v0",
    rationaleBundleRegistry: draft.proposal?.rationaleBundle?.registry ?? "openclaw-rationale-check-bundle-v0",
    checkBundleRegistry: draft.proposal?.checkBundle?.registry ?? "openclaw-rationale-check-bundle-v0",
    riskRegistry: draft.proposal?.riskNotes?.registry ?? "openclaw-rationale-check-bundle-v0",
    targetSelectionRegistry: draft.targetSelection?.registry ?? "openclaw-native-workspace-edit-target-selection-v0",
    promptSemanticsRegistry: draft.proposal?.semanticPlan?.registry ?? "openclaw-native-prompt-semantics-v0",
    entrypoint: "/plugins/native-adapter/source-authored-edit-tasks",
    query: truncatePatchMetadata(proposalQuery, 120),
    contentExposed: false,
  };

  return {
    ...draft,
    registry: "openclaw-source-authored-edit-v0",
    mode: "approval-gated-source-authored-edit-draft",
    sourceRegistry: draft.registry,
    sourceAuthoredEdit,
    governance: {
      ...(draft.draft?.governance ?? {}),
      mode: "openclaw_source_authored_edit_draft",
      runtimeOwner: "openclaw_on_nixos",
      derivesFromEnhancedOpenClawSignals: true,
      canExecuteLegacyOpenClawCode: false,
      canImportLegacyOpenClawModules: false,
      canMutateWithoutApproval: false,
      usesWorkspacePatchApplyAdapter: true,
      exposesPromptContent: false,
      exposesSourceFileContent: false,
    },
  };
}

async function createOpenClawSourceAuthoredEditTask({
  workspacePath = null,
  proposalQuery = "edit",
  targetSelectionQuery = null,
  targetSelectionScope = "tools",
  edits = null,
  search = "",
  replacement = "",
  occurrence = 1,
  contextLines = 0,
  confirm = false,
} = {}) {
  const result = await createNativeOpenClawWorkspacePatchApplyTask({
    workspacePath,
    search,
    replacement,
    occurrence,
    edits,
    contextLines,
    deriveProposalFromSource: true,
    proposalQuery,
    selectTargetFromSource: true,
    targetSelectionQuery: targetSelectionQuery ?? proposalQuery,
    targetSelectionScope,
    confirm,
  });
  const sourceAuthoredEdit = {
    registry: "openclaw-source-authored-edit-v0",
    mode: "approval-gated-source-authored-edit-task",
    sourceRegistry: result.proposal?.source ?? "openclaw-source-derived-edit-proposal-v0",
    proposalRegistry: result.proposal?.registry ?? "openclaw-native-workspace-edit-proposal-v0",
    rationaleBundleRegistry: result.proposal?.rationaleBundle?.registry ?? "openclaw-rationale-check-bundle-v0",
    checkBundleRegistry: result.proposal?.checkBundle?.registry ?? "openclaw-rationale-check-bundle-v0",
    riskRegistry: result.proposal?.riskNotes?.registry ?? "openclaw-rationale-check-bundle-v0",
    targetSelectionRegistry: result.targetSelection?.registry ?? "openclaw-native-workspace-edit-target-selection-v0",
    promptSemanticsRegistry: result.proposal?.semanticPlan?.registry ?? "openclaw-native-prompt-semantics-v0",
    entrypoint: "/plugins/native-adapter/source-authored-edit-tasks",
    query: truncatePatchMetadata(proposalQuery, 120),
    contentExposed: false,
  };

  return {
    ...result,
    registry: "openclaw-source-authored-edit-task-v0",
    mode: "approval-gated-source-authored-edit-task",
    sourceRegistry: result.registry,
    sourceAuthoredEdit,
    governance: {
      ...(result.governance ?? {}),
      mode: "openclaw_source_authored_edit_task",
      runtimeOwner: "openclaw_on_nixos",
      derivesFromEnhancedOpenClawSignals: true,
      canExecuteLegacyOpenClawCode: false,
      canImportLegacyOpenClawModules: false,
      canMutateWithoutApproval: false,
      usesWorkspacePatchApplyAdapter: true,
      exposesPromptContent: false,
      exposesSourceFileContent: false,
    },
  };
}


  // L8457-8775
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

async function createWorkspaceCommandTask({ proposalId = null, workspaceId = null, scriptName = null, confirm = false } = {}) {
  if (confirm !== true) {
    throw new Error("Workspace command task creation requires confirm=true.");
  }

  const draftEnvelope = buildWorkspaceCommandPlanDraft({ proposalId, workspaceId, scriptName });
  const draft = draftEnvelope.draft;
  const task = createTask({
    goal: draft.goal,
    type: draft.type,
    workViewStrategy: "workspace-command",
    plan: draft.plan,
    policy: draft.policy.request,
  }, { skipInitialPolicy: true });
  task.policy = draft.policy;
  const approval = createApprovalRequestForTask(task, draft.policy.decision);
  const reclaimedTasks = supersedeOtherActiveTasks(task.id);
  reconcileRuntimeState();
  persistState();

  await publishEvent("task.created", { task: serialiseTask(task), planner: draft.plan?.planner ?? "workspace-command-plan-v0" });
  await publishTaskApprovalIfPending(task);
  await publishEvent("task.planned", { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
  await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
    task: serialiseTask(reclaimedTask),
  })));

  return {
    registry: "workspace-command-task-v0",
    mode: "approval-gated",
    generatedAt: new Date().toISOString(),
    sourceRegistry: draftEnvelope.registry,
    proposal: draftEnvelope.proposal,
    task,
    approval,
    governance: {
      createsTask: true,
      createsApproval: true,
      canExecuteWithoutApproval: false,
      executed: false,
      requiresExplicitApproval: true,
      exposesScriptBody: false,
    },
  };
}

async function createOpenClawSourceCommandTask({
  proposalId = null,
  workspaceId = null,
  scriptName = null,
  workspacePath = null,
  query = "command",
  confirm = false,
} = {}) {
  if (confirm !== true) {
    throw new Error("OpenClaw source command task creation requires confirm=true.");
  }

  const sourceDraft = buildOpenClawSourceCommandPlanDraft({
    proposalId,
    workspaceId,
    scriptName,
    workspacePath,
    query,
  });
  const sourceProposal = sourceDraft.sourceCommandProposal;
  const workspaceTask = await createWorkspaceCommandTask({
    proposalId: sourceProposal.id,
    confirm: true,
  });
  workspaceTask.task.sourceCommand = {
    registry: "openclaw-source-command-task-v0",
    sourceProposalRegistry: sourceDraft.sourceRegistry,
    sourcePlanRegistry: sourceDraft.registry,
    proposalId: sourceProposal.id,
    sourceSignalsRegistry: sourceDraft.sourceCommandSignals?.registry ?? "openclaw-source-command-proposals-v0",
    absorbedFromEnhancedOpenClaw: true,
    contentExposed: false,
    exposesScriptBodies: false,
    exposesPromptContent: false,
    exposesSourceFileContent: false,
  };
  persistState();

  return {
    registry: "openclaw-source-command-task-v0",
    mode: "approval-gated-source-command",
    generatedAt: new Date().toISOString(),
    sourceRegistry: sourceDraft.registry,
    sourceMode: sourceDraft.mode,
    sourceCommandProposal: sourceProposal,
    sourceCommandSignals: sourceDraft.sourceCommandSignals,
    sourceCommandPlan: sourceDraft.sourceCommandPlan,
    sourceCommandTask: {
      registry: "openclaw-source-command-task-v0",
      mode: "approval-gated-source-command",
      workspaceTaskRegistry: workspaceTask.registry,
      proposalId: sourceProposal.id,
      approvalId: workspaceTask.approval?.id ?? null,
      taskId: workspaceTask.task?.id ?? null,
      executed: false,
      contentExposed: false,
    },
    workspaceCommandTask: {
      registry: workspaceTask.registry,
      mode: workspaceTask.mode,
      sourceRegistry: workspaceTask.sourceRegistry,
    },
    task: workspaceTask.task,
    approval: workspaceTask.approval,
    governance: {
      mode: "source_command_task_approval_gated",
      runtimeOwner: "openclaw_on_nixos",
      createsTask: true,
      createsApproval: true,
      canExecuteWithoutApproval: false,
      canExecute: false,
      canMutate: false,
      executed: false,
      requiresExplicitApproval: true,
      requiresExplicitApprovalBeforeExecution: true,
      delegatesExecutionTo: "workspace-command-task-v0",
      exposesScriptBodies: false,
      exposesPromptContent: false,
      exposesSourceFileContent: false,
    },
  };
}


  return {
    sha256Hex,
    resolveOpenClawWorkspaceTarget,
    buildNativeOpenClawWorkspaceTextWriteDraft,
    createNativeOpenClawWorkspaceTextWriteTask,
    readBoundedWorkspaceTextFile,
    normaliseWorkspacePatchEdits,
    applyWorkspacePatchEdits,
    buildDiffPreview,
    buildWorkspacePatchDiffPreview,
    buildWorkspacePatchProposalEnvelope,
    buildOpenClawSourceDerivedPatchProposal,
    buildNativeOpenClawWorkspacePatchApplyDraft,
    createNativeOpenClawWorkspacePatchApplyTask,
    buildOpenClawSourceAuthoredEditDraft,
    createOpenClawSourceAuthoredEditTask,
    findWorkspaceCommandProposal,
    buildWorkspaceCommandPlanDraft,
    findSourceCommandProposal,
    buildOpenClawSourceCommandPlanDraft,
    createWorkspaceCommandTask,
    createOpenClawSourceCommandTask,
  };
}
