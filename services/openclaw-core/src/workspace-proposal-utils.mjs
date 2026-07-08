import { randomUUID } from "node:crypto";

export function truncatePatchMetadata(value, maxLength = 240) {
  const text = typeof value === "string" ? value : "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

export function normalisePatchMetadataList(value, { fallback = [], maxItems = 8, maxLength = 80 } = {}) {
  const items = Array.isArray(value) ? value : fallback;
  return items
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => truncatePatchMetadata(item.trim(), maxLength))
    .slice(0, maxItems);
}

export function normaliseRationaleReasons(value, { maxItems = 6 } = {}) {
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

export function normaliseSourceSignalSummary(value = {}) {
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

export function normaliseRationaleBundle(value, fallback = {}) {
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

export function normaliseCheckBundle(value, fallback = {}) {
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

export function normaliseRiskNotes(value, fallback = {}) {
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

export function buildWorkspacePatchProposalEnvelope({
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

export function buildSourceDerivedProposalBundles({
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
