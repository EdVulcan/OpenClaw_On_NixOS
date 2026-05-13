#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

node --check "$REPO_ROOT/packages/shared-types/src/plugin-registry.mjs" >/dev/null

node --input-type=module - <<'EOF' "$REPO_ROOT"
import { pathToFileURL } from "node:url";

const repoRoot = process.argv[2];
const registryModuleUrl = pathToFileURL(`${repoRoot}/packages/shared-types/src/plugin-registry.mjs`).href;
const {
  OPENCLAW_NATIVE_PLUGIN_ACTIVATION_MODE,
  OPENCLAW_NATIVE_PLUGIN_REGISTRY_VERSION,
  createOpenClawNativePluginRegistry,
  summariseOpenClawNativePluginRegistry,
  validateOpenClawNativePluginRegistry,
} = await import(registryModuleUrl);

const registry = createOpenClawNativePluginRegistry({ generatedAt: "2026-05-13T00:00:00.000Z" });
const validation = validateOpenClawNativePluginRegistry(registry);
const summary = summariseOpenClawNativePluginRegistry(registry);

if (
  registry.registry !== OPENCLAW_NATIVE_PLUGIN_REGISTRY_VERSION
  || registry.mode !== "native-contract-registry"
  || registry.runtimeOwner !== "openclaw_on_nixos"
  || registry.activationMode !== OPENCLAW_NATIVE_PLUGIN_ACTIVATION_MODE
  || registry.items.length !== 1
  || registry.items[0].id !== "openclaw.native.plugin-sdk"
  || validation.ok !== true
  || summary.validationOk !== true
  || summary.totalPlugins !== 1
  || summary.totalCapabilities !== 5
  || summary.approvalRequired !== 1
  || summary.mutationCapable !== 1
  || summary.executionCapable !== 1
  || summary.byPlugin?.["openclaw.native.plugin-sdk"]?.totalCapabilities !== 5
  || registry.governance.externalRuntimeDependencyAllowed !== false
  || registry.governance.canExecuteDuringRegistration !== false
  || registry.governance.canActivateRuntime !== false
) {
  throw new Error(`native plugin registry mismatch: ${JSON.stringify({ registry, validation, summary })}`);
}

const unsafeRegistry = createOpenClawNativePluginRegistry();
unsafeRegistry.runtimeOwner = "legacy_openclaw";
unsafeRegistry.activationMode = "auto";
unsafeRegistry.governance.externalRuntimeDependencyAllowed = true;
unsafeRegistry.governance.canExecuteDuringRegistration = true;
unsafeRegistry.governance.canActivateRuntime = true;
unsafeRegistry.items[0].contract.governance.runtimeOwner = "legacy_openclaw";
const unsafeValidation = validateOpenClawNativePluginRegistry(unsafeRegistry);
const issuePaths = unsafeValidation.issues.map((issue) => issue.path);
for (const path of [
  "runtimeOwner",
  "activationMode",
  "governance.externalRuntimeDependencyAllowed",
  "governance.canExecuteDuringRegistration",
  "governance.canActivateRuntime",
  "items[0].contract.governance.runtimeOwner",
]) {
  if (!issuePaths.includes(path)) {
    throw new Error(`unsafe registry should report ${path}: ${JSON.stringify(unsafeValidation)}`);
  }
}

console.log(JSON.stringify({
  openclawNativePluginRegistry: {
    registry: summary.registry,
    runtimeOwner: summary.runtimeOwner,
    activationMode: summary.activationMode,
    totalPlugins: summary.totalPlugins,
    totalCapabilities: summary.totalCapabilities,
    validationOk: summary.validationOk,
    guardrails: [
      "registry is native to OpenClawOnNixOS",
      "activation requires a manual adapter implementation",
      "registration cannot execute plugin code",
      "external runtime ownership remains forbidden",
    ],
  },
}, null, 2));
EOF
