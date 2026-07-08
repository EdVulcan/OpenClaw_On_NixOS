export const OPENCLAW_NATIVE_PLUGIN_SDK_PLUGIN_DESCRIPTOR = Object.freeze({
  id: "openclaw.native.plugin-sdk",
  name: "OpenClaw Native Plugin SDK",
  version: "0.1.0",
  summary: "Native contract surface for governed OpenClaw capabilities.",
});

export const OPENCLAW_NATIVE_PLUGIN_SDK_GOVERNANCE_DESCRIPTOR = Object.freeze({
  origin: "absorbed_external",
  sourceContentImported: false,
  requiresHumanReviewBeforeActivation: true,
});

const capabilityDescriptor = ({
  id,
  title,
  description,
  kind = "sense",
  domains = ["body_internal"],
  risk = "low",
  permissions = {},
  approval,
  auditLedger = "capability_history",
}) =>
  Object.freeze({
    id,
    title,
    description,
    kind,
    domains: Object.freeze([...domains]),
    risk,
    permissions: Object.freeze({ ...permissions }),
    approval: Object.freeze({ ...approval }),
    audit: Object.freeze({
      required: true,
      ledger: auditLedger,
    }),
  });

export const OPENCLAW_NATIVE_PLUGIN_CAPABILITY_DESCRIPTORS = Object.freeze([
  capabilityDescriptor({
    id: "sense.plugin.manifest_profile",
    title: "Profile plugin manifest metadata",
    description: "Reads bounded plugin manifest metadata without importing source contents.",
    permissions: {
      filesystemRead: true,
    },
    approval: {
      required: false,
      reason: "Read-only metadata profiling inside the body boundary.",
    },
  }),
  capabilityDescriptor({
    id: "sense.openclaw.tool_catalog",
    title: "Profile OpenClaw tool catalog",
    description: "Summarizes enhanced OpenClaw tool surfaces as native capability metadata without executing legacy tools.",
    permissions: {
      filesystemRead: true,
    },
    approval: {
      required: false,
      reason: "Read-only capability catalog profiling inside the body boundary.",
    },
  }),
  capabilityDescriptor({
    id: "sense.openclaw.workspace_semantic_index",
    title: "Profile OpenClaw workspace semantic index",
    description: "Builds a bounded derived semantic index from enhanced OpenClaw source and documentation metadata without exposing file contents.",
    permissions: {
      filesystemRead: true,
    },
    approval: {
      required: false,
      reason: "Read-only semantic indexing inside the body boundary.",
    },
  }),
  capabilityDescriptor({
    id: "sense.openclaw.workspace_symbol_lookup",
    title: "Execute OpenClaw workspace symbol lookup",
    description: "Runs a bounded read-only symbol query over enhanced OpenClaw workspace files without importing modules, executing legacy code, or exposing function bodies.",
    permissions: {
      filesystemRead: true,
    },
    approval: {
      required: false,
      reason: "Read-only symbol lookup inside the body boundary.",
    },
  }),
  capabilityDescriptor({
    id: "sense.openclaw.workspace_edit_target_select",
    title: "Select OpenClaw workspace edit target",
    description: "Builds a bounded read-only target selection envelope for enhanced OpenClaw workspace edits from source-derived metadata without exposing file bodies.",
    permissions: {
      filesystemRead: true,
    },
    approval: {
      required: false,
      reason: "Read-only target selection inside the body boundary.",
    },
  }),
  capabilityDescriptor({
    id: "act.openclaw.workspace_text_write",
    title: "Apply OpenClaw workspace text write",
    description: "Materializes a bounded OpenClaw workspace text write only through explicit approval, native filesystem governance, and filesystem ledgering.",
    kind: "act",
    risk: "high",
    permissions: {
      filesystemWrite: true,
    },
    approval: {
      required: true,
      reason: "Workspace mutations require explicit user approval and filesystem ledgering.",
    },
    auditLedger: "filesystem_ledger",
  }),
  capabilityDescriptor({
    id: "act.openclaw.workspace_patch_apply",
    title: "Apply OpenClaw workspace patch",
    description: "Creates governed proposal envelopes from request metadata or enhanced OpenClaw source signals, with bounded single, multi-hunk, and structured line-edit previews, then applies them only after explicit approval through native filesystem governance.",
    kind: "act",
    risk: "high",
    permissions: {
      filesystemRead: true,
      filesystemWrite: true,
    },
    approval: {
      required: true,
      reason: "Workspace patch application requires explicit user approval and filesystem ledgering.",
    },
    auditLedger: "filesystem_ledger",
  }),
  capabilityDescriptor({
    id: "sense.openclaw.prompt_pack",
    title: "Profile OpenClaw prompt pack",
    description: "Summarizes enhanced OpenClaw prompt and agent-behavior surfaces as native policy metadata without importing runtime modules.",
    permissions: {
      filesystemRead: true,
    },
    approval: {
      required: false,
      reason: "Read-only prompt and behavior metadata profiling inside the body boundary.",
    },
  }),
  capabilityDescriptor({
    id: "sense.openclaw.plugin_manifest_map",
    title: "Profile OpenClaw plugin manifest map",
    description: "Maps enhanced OpenClaw plugin manifests into OpenClawOnNixOS native registry candidates without activation.",
    permissions: {
      filesystemRead: true,
    },
    approval: {
      required: false,
      reason: "Read-only plugin manifest mapping inside the body boundary.",
    },
  }),
  capabilityDescriptor({
    id: "plan.openclaw.plugin_capability",
    title: "Plan OpenClaw plugin capability absorption",
    description: "Derives native capability candidates and governance gates from enhanced OpenClaw plugin manifests without importing, executing, or activating plugins.",
    kind: "plan",
    permissions: {
      filesystemRead: true,
    },
    approval: {
      required: false,
      reason: "Plan-only plugin capability absorption inside the body boundary.",
    },
  }),
  capabilityDescriptor({
    id: "act.plugin.capability.invoke",
    title: "Invoke a governed plugin capability",
    description: "Invokes a registered capability only after policy evaluation and audit binding.",
    kind: "act",
    domains: ["user_task", "cross_boundary"],
    risk: "high",
    permissions: {
      commandExecution: true,
      filesystemWrite: true,
    },
    approval: {
      required: true,
      reason: "Execution and mutation require explicit user approval.",
    },
  }),
]);

export const OPENCLAW_NATIVE_PLUGIN_CAPABILITY_IDS = Object.freeze(
  OPENCLAW_NATIVE_PLUGIN_CAPABILITY_DESCRIPTORS.map((capability) => capability.id),
);
