#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

node --check "$REPO_ROOT/packages/shared-types/src/plugin-contract.mjs" >/dev/null

node --input-type=module - <<'EOF' "$REPO_ROOT"
import { pathToFileURL } from "node:url";

const repoRoot = process.argv[2];
const contractModuleUrl = pathToFileURL(`${repoRoot}/packages/shared-types/src/plugin-contract.mjs`).href;
const {
  OPENCLAW_NATIVE_PLUGIN_CONTRACT_VERSION,
  OPENCLAW_NATIVE_RUNTIME_OWNER,
  createOpenClawNativePluginContract,
  summariseOpenClawNativePluginContract,
  validateOpenClawNativePluginContract,
} = await import(contractModuleUrl);

const contract = createOpenClawNativePluginContract({
  plugin: {
    id: "openclaw.native.plugin-sdk",
    name: "OpenClaw Native Plugin SDK",
    version: "0.1.0",
    summary: "Native contract surface for governed OpenClaw capabilities.",
  },
  governance: {
    origin: "absorbed_external",
    sourceContentImported: false,
    requiresHumanReviewBeforeActivation: true,
  },
  capabilities: [
    {
      id: "sense.plugin.manifest_profile",
      title: "Profile plugin manifest metadata",
      description: "Reads bounded plugin manifest metadata without importing source contents.",
      kind: "sense",
      domains: ["body_internal"],
      risk: "low",
      permissions: {
        filesystemRead: true,
      },
      approval: {
        required: false,
        reason: "Read-only metadata profiling inside the body boundary.",
      },
      audit: {
        required: true,
        ledger: "capability_history",
      },
    },
    {
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
      audit: {
        required: true,
        ledger: "capability_history",
      },
    },
  ],
});

const validation = validateOpenClawNativePluginContract(contract);
if (!validation.ok) {
  throw new Error(`native plugin contract should validate: ${JSON.stringify(validation.issues)}`);
}

const summary = summariseOpenClawNativePluginContract(contract);
if (
  summary.registry !== OPENCLAW_NATIVE_PLUGIN_CONTRACT_VERSION
  || summary.runtimeOwner !== OPENCLAW_NATIVE_RUNTIME_OWNER
  || summary.origin !== "absorbed_external"
  || summary.totalCapabilities !== 2
  || summary.approvalRequired !== 1
  || summary.mutationCapable !== 1
  || summary.executionCapable !== 1
  || summary.byRisk.low !== 1
  || summary.byRisk.high !== 1
  || summary.byKind.sense !== 1
  || summary.byKind.act !== 1
) {
  throw new Error(`native plugin contract summary mismatch: ${JSON.stringify(summary)}`);
}

const unsafeContract = createOpenClawNativePluginContract({
  plugin: {
    id: "unsafe.external.owner",
    name: "Unsafe External Owner",
    version: "0.1.0",
    summary: "Should be rejected by native OpenClaw governance.",
  },
  governance: {
    runtimeOwner: "legacy_openclaw",
    externalRuntimeDependencyAllowed: true,
    canExecuteDuringRegistration: true,
    requiresHumanReviewBeforeActivation: false,
  },
  capabilities: [
    {
      id: "act.unsafe.command",
      title: "Unsafe command",
      description: "Attempts command execution without approval.",
      kind: "act",
      domains: ["cross_boundary"],
      risk: "critical",
      runtimeOwner: "legacy_openclaw",
      permissions: {
        commandExecution: true,
      },
      approval: {
        required: false,
        reason: "unsafe",
      },
      audit: {
        required: false,
        ledger: "capability_history",
      },
    },
  ],
});

unsafeContract.governance.runtimeOwner = "legacy_openclaw";
unsafeContract.governance.externalRuntimeDependencyAllowed = true;
unsafeContract.governance.canExecuteDuringRegistration = true;
unsafeContract.capabilities[0].runtimeOwner = "legacy_openclaw";

const unsafeValidation = validateOpenClawNativePluginContract(unsafeContract);
const unsafeIssuePaths = unsafeValidation.issues.map((issue) => issue.path);
for (const path of [
  "governance.runtimeOwner",
  "governance.externalRuntimeDependencyAllowed",
  "governance.canExecuteDuringRegistration",
  "capabilities[0].runtimeOwner",
  "capabilities[0].approval.required",
  "capabilities[0].audit.required",
]) {
  if (!unsafeIssuePaths.includes(path)) {
    throw new Error(`unsafe native plugin contract should report ${path}: ${JSON.stringify(unsafeValidation)}`);
  }
}

console.log(JSON.stringify({
  openclawNativePluginContract: {
    registry: summary.registry,
    runtimeOwner: summary.runtimeOwner,
    origin: summary.origin,
    totalCapabilities: summary.totalCapabilities,
    approvalRequired: summary.approvalRequired,
    mutationCapable: summary.mutationCapable,
    executionCapable: summary.executionCapable,
    guardrails: [
      "OpenClawOnNixOS remains runtime owner",
      "external runtime dependency is rejected",
      "registration cannot execute plugin code",
      "high-risk or mutating capabilities require approval",
      "native capabilities require audit ledgers",
    ],
  },
}, null, 2));
EOF
