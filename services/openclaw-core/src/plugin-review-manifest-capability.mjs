import { createOpenClawNativePluginRegistry } from "../../../packages/plugin-runtime/src/plugin-registry.mjs";
import { readdirSync } from "node:fs";
import path from "node:path";

import { safeObjectKeys } from "./plugin-review-common.mjs";
import { safeStat } from "./plugin-review-workspace-discovery.mjs";

export function createPluginReviewManifestCapability({
  buildOpenClawNativePluginSdkContractImplementation,
  normalisePositiveLimit,
  readJsonFileIfPresent = () => null,
  selectOpenClawToolCatalogWorkspace,
  selectReviewedPluginSdkPackage,
  toolCatalogIgnoredDirectories = new Set([".git", "node_modules", "dist", "build", ".turbo", ".cache"]),
} = {}) {
const TOOL_CATALOG_IGNORED_DIRECTORIES = toolCatalogIgnoredDirectories;

function buildNativePluginManifestProfile({ packagePath = null } = {}) {
  const { review, item } = selectReviewedPluginSdkPackage({ packagePath });
  const manifestPath = path.join(item.packagePath, "package.json");
  const manifest = readJsonFileIfPresent(manifestPath);
  if (!manifest) {
    throw new Error("Reviewed plugin SDK package does not include a readable package manifest.");
  }

  const nativeRegistry = createOpenClawNativePluginRegistry();
  const registryItem = nativeRegistry.items.find((entry) => entry.id === "openclaw.native.plugin-sdk") ?? null;
  const contract = registryItem?.contract ?? null;
  const exportKeys = typeof manifest.exports === "string"
    ? ["default"]
    : safeObjectKeys(manifest.exports);
  const scriptNames = safeObjectKeys(manifest.scripts);
  const dependencySummary = {
    dependencies: safeObjectKeys(manifest.dependencies).length,
    devDependencies: safeObjectKeys(manifest.devDependencies).length,
    peerDependencies: safeObjectKeys(manifest.peerDependencies).length,
  };

  return {
    ok: true,
    registry: "openclaw-native-plugin-adapter-v0",
    mode: "manifest-profile-only",
    generatedAt: new Date().toISOString(),
    sourceRegistry: review.registry,
    sourceMode: review.mode,
    adapterStatus: "native_shell_active_manifest_only",
    workspace: {
      id: item.workspaceId,
      name: item.workspaceName,
      path: item.workspacePath,
    },
    plugin: {
      id: registryItem?.id ?? "openclaw.native.plugin-sdk",
      contractVersion: contract?.contractVersion ?? null,
      packageName: typeof manifest.name === "string" ? manifest.name : null,
      private: manifest.private === true,
      hasVersion: typeof manifest.version === "string",
      hasMain: typeof manifest.main === "string",
      hasModule: typeof manifest.module === "string",
      hasTypes: typeof manifest.types === "string" || typeof manifest.typings === "string",
      hasExports: manifest.exports !== undefined,
      exportKeys,
      scriptNames,
      dependencySummary,
    },
    capabilities: (contract?.capabilities ?? []).map((capability) => ({
      id: capability.id,
      kind: capability.kind,
      risk: capability.risk,
      domains: capability.domains,
      approvalRequired: capability.approval?.required === true,
      runtimeOwner: capability.runtimeOwner,
    })),
    governance: {
      mode: "native_adapter_manifest_profile_only",
      runtimeOwner: "openclaw_on_nixos",
      canReadManifestMetadata: true,
      canReadSourceFileContent: false,
      exposesReadmeContent: false,
      exposesScriptBodies: false,
      exposesDependencyVersions: false,
      canMutate: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
      createsTask: false,
      createsApproval: false,
      sourcePackagePathReviewed: true,
    },
  };
}

function classifyPluginManifestEntry(manifest = {}, relativePath = "") {
  const lower = `${manifest.id ?? ""} ${relativePath} ${safeObjectKeys(manifest.contracts).join(" ")}`.toLowerCase();
  if (/(memory|lancedb|wiki)/u.test(lower)) {
    return "memory";
  }
  if (/(search|web|browser|fetch|brave|duckduckgo|exa|firecrawl|tavily|perplexity|searxng|grok|xai|gemini|kimi|ollama)/u.test(lower)) {
    return "search_and_web";
  }
  if (/(image|video|music|tts|voice|speech|audio|media|runway|elevenlabs|fal|minimax)/u.test(lower)) {
    return "media";
  }
  if (/(chat|channel|discord|slack|telegram|zalo|whatsapp|matrix|signal|imessage|teams|line|feishu|qqbot)/u.test(lower)) {
    return "channels";
  }
  if (/(openai|anthropic|qwen|deepseek|mistral|groq|bedrock|litellm|openrouter|model|llm|provider)/u.test(lower)) {
    return "model_provider";
  }
  if (/(skill|agent|codex|opencode|kilocode|thread|task)/u.test(lower)) {
    return "agent_workflow";
  }
  return "general_plugin";
}

function countNestedPropertyKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }
  const properties = value.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return 0;
  }
  return safeObjectKeys(properties).length;
}

function summarisePluginManifest(rootPath, absolutePath, manifest) {
  const relativePath = path.relative(rootPath, absolutePath).replaceAll(path.sep, "/");
  const stats = safeStat(absolutePath);
  const contractKeys = safeObjectKeys(manifest.contracts);
  const providerAuthEnvVars = manifest.providerAuthEnvVars && typeof manifest.providerAuthEnvVars === "object"
    ? Object.values(manifest.providerAuthEnvVars).reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0)
    : 0;
  const channelEnvVars = manifest.channelEnvVars && typeof manifest.channelEnvVars === "object"
    ? Object.values(manifest.channelEnvVars).reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0)
    : 0;
  const uiHints = manifest.uiHints && typeof manifest.uiHints === "object" && !Array.isArray(manifest.uiHints)
    ? Object.values(manifest.uiHints)
    : [];
  const providerEndpoints = Array.isArray(manifest.providerEndpoints) ? manifest.providerEndpoints : [];
  const configSchemaPropertyCount = countNestedPropertyKeys(manifest.configSchema);
  const category = classifyPluginManifestEntry(manifest, relativePath);

  return {
    id: typeof manifest.id === "string" ? manifest.id : path.basename(path.dirname(absolutePath)),
    relativePath,
    extensionName: path.basename(path.dirname(absolutePath)),
    category,
    enabledByDefault: manifest.enabledByDefault === true,
    manifestSizeBytes: stats?.size ?? null,
    contractKeys,
    contractCount: contractKeys.length,
    providerCount: Array.isArray(manifest.providers) ? manifest.providers.length : 0,
    providerEndpointCount: providerEndpoints.length,
    providerEndpointHostCount: providerEndpoints.reduce((total, endpoint) => total + (Array.isArray(endpoint?.hosts) ? endpoint.hosts.length : 0), 0),
    channelCount: Array.isArray(manifest.channels) ? manifest.channels.length : 0,
    toolContractCount: Array.isArray(manifest.contracts?.tools) ? manifest.contracts.tools.length : 0,
    uiHintCount: uiHints.length,
    sensitiveUiHintCount: uiHints.filter((hint) => hint?.sensitive === true).length,
    providerAuthEnvVarCount: providerAuthEnvVars,
    channelEnvVarCount: channelEnvVars,
    syntheticAuthRefCount: Array.isArray(manifest.syntheticAuthRefs) ? manifest.syntheticAuthRefs.length : 0,
    providerAuthChoiceCount: Array.isArray(manifest.providerAuthChoices) ? manifest.providerAuthChoices.length : 0,
    configSchemaPropertyCount,
    hasConfigSchema: Boolean(manifest.configSchema),
    hasConfigContracts: Boolean(manifest.configContracts),
    contentRead: true,
    contentExposed: false,
    manifestBodyExposed: false,
    authMaterialExposed: false,
  };
}

function buildOpenClawPluginManifestMap({ workspacePath = null, query = null, limit = 80 } = {}) {
  const { registry, item } = selectOpenClawToolCatalogWorkspace({ workspacePath });
  const implementation = buildOpenClawNativePluginSdkContractImplementation({
    packagePath: path.join(item.path, "packages", "plugin-sdk"),
  });
  const capability = implementation.contract?.capabilities?.find((entry) => entry.id === "sense.openclaw.plugin_manifest_map") ?? null;
  const extensionsRoot = path.join(item.path, "extensions");
  const rootStats = safeStat(extensionsRoot);
  const safeLimit = normalisePositiveLimit(limit, 80, 200);
  const safeQuery = typeof query === "string" && query.trim() ? query.trim().toLowerCase() : null;
  const manifests = [];

  if (rootStats?.isDirectory()) {
    let entries = [];
    try {
      entries = readdirSync(extensionsRoot, { withFileTypes: true });
    } catch {
      entries = [];
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!entry.isDirectory() || TOOL_CATALOG_IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      const manifestPath = path.join(extensionsRoot, entry.name, "openclaw.plugin.json");
      const manifest = readJsonFileIfPresent(manifestPath);
      if (!manifest) {
        continue;
      }
      const summary = summarisePluginManifest(item.path, manifestPath, manifest);
      if (safeQuery && ![
        summary.id,
        summary.extensionName,
        summary.category,
        ...summary.contractKeys,
      ].some((value) => String(value ?? "").toLowerCase().includes(safeQuery))) {
        continue;
      }
      manifests.push(summary);
      if (manifests.length >= safeLimit) {
        break;
      }
    }
  }

  const byCategory = manifests.reduce((accumulator, manifest) => {
    accumulator[manifest.category] = (accumulator[manifest.category] ?? 0) + 1;
    return accumulator;
  }, {});
  const contractKeyCounts = manifests.reduce((accumulator, manifest) => {
    for (const key of manifest.contractKeys) {
      accumulator[key] = (accumulator[key] ?? 0) + 1;
    }
    return accumulator;
  }, {});

  return {
    ok: true,
    registry: "openclaw-plugin-manifest-map-v0",
    mode: "read-only-plugin-manifest-absorption",
    generatedAt: new Date().toISOString(),
    sourceRegistries: [
      registry.registry,
      implementation.registry,
      "openclaw-extension-manifests",
    ],
    capability: {
      id: capability?.id ?? "sense.openclaw.plugin_manifest_map",
      kind: capability?.kind ?? "sense",
      risk: capability?.risk ?? "low",
      approvalRequired: capability?.approval?.required === true,
      runtimeOwner: capability?.runtimeOwner ?? "openclaw_on_nixos",
    },
    workspace: {
      id: item.id,
      name: item.name,
      path: item.path,
    },
    roots: {
      extensions: path.relative(item.path, extensionsRoot).replaceAll(path.sep, "/"),
    },
    filter: {
      query: safeQuery,
      limit: safeLimit,
    },
    manifests,
    categories: Object.entries(byCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category)),
    contractKeyCounts,
    summary: {
      manifestCount: manifests.length,
      categoryCount: Object.keys(byCategory).length,
      enabledByDefaultCount: manifests.filter((manifest) => manifest.enabledByDefault).length,
      providerCount: manifests.reduce((total, manifest) => total + manifest.providerCount, 0),
      providerEndpointCount: manifests.reduce((total, manifest) => total + manifest.providerEndpointCount, 0),
      channelCount: manifests.reduce((total, manifest) => total + manifest.channelCount, 0),
      toolContractCount: manifests.reduce((total, manifest) => total + manifest.toolContractCount, 0),
      sensitiveUiHintCount: manifests.reduce((total, manifest) => total + manifest.sensitiveUiHintCount, 0),
      authReferenceCount: manifests.reduce((total, manifest) => total + manifest.providerAuthEnvVarCount + manifest.channelEnvVarCount + manifest.syntheticAuthRefCount, 0),
      configSchemaCount: manifests.filter((manifest) => manifest.hasConfigSchema).length,
      canReadManifestMetadata: true,
      exposesManifestBodies: false,
      exposesAuthEnvVarNames: false,
      exposesConfigSchemaBodies: false,
      canImportModule: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
    },
    governance: {
      mode: "plugin_manifest_map_read_only",
      runtimeOwner: "openclaw_on_nixos",
      sourceRegistry: "openclaw-extension-manifests",
      canReadManifestMetadata: true,
      canReadManifestBody: true,
      exposesManifestBodies: false,
      exposesAuthEnvVarNames: false,
      exposesConfigSchemaBodies: false,
      exposesSourceFileContent: false,
      exposesScriptBodies: false,
      canImportModule: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
    },
  };
}

function derivePluginCapabilityPlanRisk(manifest) {
  if ((manifest.providerEndpointCount ?? 0) > 0 || (manifest.channelCount ?? 0) > 0) {
    return "high";
  }
  if ((manifest.providerCount ?? 0) > 0 || (manifest.authReferenceCount ?? 0) > 0 || (manifest.toolContractCount ?? 0) > 0) {
    return "medium";
  }
  return "low";
}

function derivePluginCapabilityPlanKind(manifest) {
  if (manifest.category === "channels" || manifest.category === "media") {
    return "act";
  }
  if (manifest.category === "memory" || manifest.category === "search_and_web" || manifest.category === "model_provider") {
    return "plan";
  }
  return "sense";
}

function buildOpenClawPluginCapabilityPlan({ workspacePath = null, query = null, limit = 40 } = {}) {
  const manifestMap = buildOpenClawPluginManifestMap({ workspacePath, query, limit });
  const nativeRegistry = createOpenClawNativePluginRegistry();
  const pluginItem = nativeRegistry.items.find((entry) => entry.id === "openclaw.native.plugin-sdk") ?? null;
  const capability = pluginItem?.contract?.capabilities?.find((entry) => entry.id === "plan.openclaw.plugin_capability") ?? null;
  const manifests = Array.isArray(manifestMap.manifests) ? manifestMap.manifests : [];
  const safeLimit = normalisePositiveLimit(limit, 40, 120);
  const candidates = manifests.slice(0, safeLimit).map((manifest) => {
    const authReferenceCount = (manifest.providerAuthEnvVarCount ?? 0) + (manifest.channelEnvVarCount ?? 0) + (manifest.syntheticAuthRefCount ?? 0);
    const risk = derivePluginCapabilityPlanRisk({ ...manifest, authReferenceCount });
    const kind = derivePluginCapabilityPlanKind(manifest);
    const crossBoundary = manifest.providerEndpointCount > 0 || manifest.channelCount > 0 || manifest.category === "search_and_web";
    const requiresRuntimeAdapter = kind !== "sense" || manifest.toolContractCount > 0 || manifest.providerCount > 0 || manifest.channelCount > 0;
    const requiresApproval = risk === "high" || crossBoundary || requiresRuntimeAdapter;
    const candidateId = `plan.${String(manifest.id ?? manifest.extensionName ?? "plugin").replace(/[^a-zA-Z0-9_.:-]+/gu, "_")}`;
    return {
      id: candidateId,
      manifestId: manifest.id,
      extensionName: manifest.extensionName,
      sourceManifestPath: manifest.relativePath,
      category: manifest.category,
      proposedCapability: {
        id: candidateId,
        kind,
        risk,
        domains: crossBoundary ? ["body_internal", "cross_boundary"] : ["body_internal"],
        runtimeOwner: "openclaw_on_nixos",
        approvalRequired: requiresApproval,
        auditLedger: "capability_history",
      },
      signals: {
        contractKeys: manifest.contractKeys,
        contractCount: manifest.contractCount,
        providerCount: manifest.providerCount,
        providerEndpointCount: manifest.providerEndpointCount,
        providerEndpointHostCount: manifest.providerEndpointHostCount,
        channelCount: manifest.channelCount,
        toolContractCount: manifest.toolContractCount,
        authReferenceCount,
        configSchemaPropertyCount: manifest.configSchemaPropertyCount,
        enabledByDefault: manifest.enabledByDefault,
      },
      gates: [
        {
          id: "manifest_metadata_absorbed",
          required: true,
          status: "passed",
          evidence: `manifest=${manifest.relativePath}`,
        },
        {
          id: "native_capability_contract_required",
          required: true,
          status: "blocked",
          evidence: "candidate is not yet registered as a native capability contract",
        },
        {
          id: "runtime_adapter_required",
          required: requiresRuntimeAdapter,
          status: requiresRuntimeAdapter ? "blocked" : "not_required",
          evidence: requiresRuntimeAdapter ? "provider/tool/channel contracts need native adapter implementation" : "metadata-only candidate",
        },
        {
          id: "explicit_approval_required",
          required: requiresApproval,
          status: requiresApproval ? "blocked" : "not_required",
          evidence: requiresApproval ? `risk=${risk}; crossBoundary=${crossBoundary}; runtimeAdapter=${requiresRuntimeAdapter}` : "read-only body-internal candidate",
        },
      ],
      status: requiresRuntimeAdapter || requiresApproval ? "blocked_pending_native_adapter" : "planned_metadata_only",
      canActivateRuntime: false,
      canExecutePluginCode: false,
      canImportModule: false,
      contentExposed: false,
    };
  });
  const countsByRisk = candidates.reduce((accumulator, candidate) => {
    accumulator[candidate.proposedCapability.risk] = (accumulator[candidate.proposedCapability.risk] ?? 0) + 1;
    return accumulator;
  }, {});
  const countsByKind = candidates.reduce((accumulator, candidate) => {
    accumulator[candidate.proposedCapability.kind] = (accumulator[candidate.proposedCapability.kind] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    ok: true,
    registry: "openclaw-plugin-capability-plan-v0",
    mode: "manifest-derived-plan-only",
    generatedAt: new Date().toISOString(),
    sourceRegistries: [
      manifestMap.registry,
      nativeRegistry.registry,
      capability?.id ?? "plan.openclaw.plugin_capability",
    ],
    capability: {
      id: capability?.id ?? "plan.openclaw.plugin_capability",
      kind: capability?.kind ?? "plan",
      risk: capability?.risk ?? "low",
      approvalRequired: capability?.approval?.required === true,
      runtimeOwner: capability?.runtimeOwner ?? "openclaw_on_nixos",
    },
    workspace: manifestMap.workspace,
    filter: manifestMap.filter,
    candidates,
    summary: {
      candidateCount: candidates.length,
      blockedCandidates: candidates.filter((candidate) => candidate.status === "blocked_pending_native_adapter").length,
      metadataOnlyCandidates: candidates.filter((candidate) => candidate.status === "planned_metadata_only").length,
      requiresApproval: candidates.filter((candidate) => candidate.proposedCapability.approvalRequired).length,
      requiresRuntimeAdapter: candidates.filter((candidate) => candidate.gates.some((gate) => gate.id === "runtime_adapter_required" && gate.required)).length,
      byRisk: countsByRisk,
      byKind: countsByKind,
      canReadManifestMetadata: true,
      exposesManifestBodies: false,
      exposesAuthEnvVarNames: false,
      exposesConfigSchemaBodies: false,
      canImportModule: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
      nextAllowedWork: [
        "select one blocked candidate for native adapter design",
        "write native contract tests before registering candidate capabilities",
        "keep runtime activation behind future approval-gated tasks",
      ],
    },
    governance: {
      mode: "plugin_capability_manifest_derived_plan_only",
      runtimeOwner: "openclaw_on_nixos",
      sourceRegistry: manifestMap.registry,
      canReadManifestMetadata: true,
      exposesManifestBodies: false,
      exposesAuthEnvVarNames: false,
      exposesConfigSchemaBodies: false,
      exposesSourceFileContent: false,
      exposesScriptBodies: false,
      canImportModule: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
      requiresExplicitApprovalBeforeExecution: true,
      requiresNativeAdapterBeforeRuntimeActivation: true,
    },
  };
}

function buildOpenClawPluginCandidateContractTests({
  workspacePath = null,
  category = "search_and_web",
  query = null,
  limit = 8,
} = {}) {
  const safeCategory = typeof category === "string" && category.trim()
    ? category.trim()
    : "search_and_web";
  const safeLimit = normalisePositiveLimit(limit, 8, 40);
  const capabilityPlan = buildOpenClawPluginCapabilityPlan({
    workspacePath,
    query: query ?? safeCategory,
    limit: 80,
  });
  const candidates = (Array.isArray(capabilityPlan.candidates) ? capabilityPlan.candidates : [])
    .filter((candidate) => candidate.category === safeCategory)
    .slice(0, safeLimit);
  const tests = candidates.flatMap((candidate) => {
    const proposed = candidate.proposedCapability ?? {};
    const gates = Array.isArray(candidate.gates) ? candidate.gates : [];
    const runtimeGate = gates.find((gate) => gate.id === "runtime_adapter_required") ?? null;
    const approvalGate = gates.find((gate) => gate.id === "explicit_approval_required") ?? null;
    const nativeContractGate = gates.find((gate) => gate.id === "native_capability_contract_required") ?? null;
    const sourcePrivacyLocked = candidate.contentExposed === false
      && candidate.canImportModule === false
      && candidate.canExecutePluginCode === false
      && candidate.canActivateRuntime === false;
    const expectedCrossBoundaryApproval = safeCategory === "search_and_web";

    return [
      {
        id: `${candidate.id}:candidate_selected_from_manifest_plan`,
        candidateId: candidate.id,
        manifestId: candidate.manifestId,
        required: true,
        status: candidate.status === "blocked_pending_native_adapter" ? "passed" : "failed",
        evidence: `category=${candidate.category}; status=${candidate.status}`,
      },
      {
        id: `${candidate.id}:native_contract_fields_declared`,
        candidateId: candidate.id,
        manifestId: candidate.manifestId,
        required: true,
        status: typeof proposed.id === "string"
          && proposed.id.length > 0
          && typeof proposed.kind === "string"
          && typeof proposed.risk === "string"
          && Array.isArray(proposed.domains)
          && proposed.domains.includes("body_internal")
          && proposed.runtimeOwner === "openclaw_on_nixos"
          && typeof proposed.approvalRequired === "boolean"
          && proposed.auditLedger === "capability_history"
          ? "passed"
          : "failed",
        evidence: `capability=${proposed.id ?? "missing"}; kind=${proposed.kind ?? "missing"}; risk=${proposed.risk ?? "missing"}`,
      },
      {
        id: `${candidate.id}:runtime_adapter_gate_blocks_activation`,
        candidateId: candidate.id,
        manifestId: candidate.manifestId,
        required: true,
        status: runtimeGate?.required === true
          && runtimeGate.status === "blocked"
          && nativeContractGate?.status === "blocked"
          ? "passed"
          : "failed",
        evidence: `runtimeGate=${runtimeGate?.status ?? "missing"}; nativeContractGate=${nativeContractGate?.status ?? "missing"}`,
      },
      {
        id: `${candidate.id}:policy_approval_boundary_declared`,
        candidateId: candidate.id,
        manifestId: candidate.manifestId,
        required: true,
        status: expectedCrossBoundaryApproval
          ? proposed.approvalRequired === true
            && proposed.domains?.includes("cross_boundary")
            && approvalGate?.required === true
            && approvalGate.status === "blocked"
            ? "passed"
            : "failed"
          : "passed",
        evidence: `approval=${Boolean(proposed.approvalRequired)}; domains=${(proposed.domains ?? []).join(",")}; approvalGate=${approvalGate?.status ?? "missing"}`,
      },
      {
        id: `${candidate.id}:source_privacy_boundary_locked`,
        candidateId: candidate.id,
        manifestId: candidate.manifestId,
        required: true,
        status: sourcePrivacyLocked ? "passed" : "failed",
        evidence: `contentExposed=${Boolean(candidate.contentExposed)}; import=${Boolean(candidate.canImportModule)}; execute=${Boolean(candidate.canExecutePluginCode)}; activate=${Boolean(candidate.canActivateRuntime)}`,
      },
      {
        id: `${candidate.id}:manifest_signals_are_metadata_only`,
        candidateId: candidate.id,
        manifestId: candidate.manifestId,
        required: true,
        status: typeof candidate.manifestId === "string"
          && candidate.manifestId.length > 0
          && candidate.category === safeCategory
          && Array.isArray(candidate.signals?.contractKeys)
          && Number.isFinite(candidate.signals?.providerCount)
          && Number.isFinite(candidate.signals?.providerEndpointCount)
          ? "passed"
          : "failed",
        evidence: `contracts=${(candidate.signals?.contractKeys ?? []).join(",")}; providers=${candidate.signals?.providerCount ?? 0}; endpoints=${candidate.signals?.providerEndpointCount ?? 0}`,
      },
    ];
  });
  const requiredTests = tests.filter((test) => test.required);
  const passedRequired = requiredTests.filter((test) => test.status === "passed").length;
  const failedRequired = requiredTests.length - passedRequired;

  return {
    ok: candidates.length > 0 && failedRequired === 0,
    registry: "openclaw-plugin-candidate-contract-tests-v0",
    mode: "candidate-native-adapter-contract-tests",
    generatedAt: new Date().toISOString(),
    sourceRegistries: [
      capabilityPlan.registry,
      "openclaw-plugin-manifest-map-v0",
    ],
    workspace: capabilityPlan.workspace,
    filter: {
      category: safeCategory,
      query: typeof query === "string" && query.trim() ? query.trim() : null,
      limit: safeLimit,
    },
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      manifestId: candidate.manifestId,
      extensionName: candidate.extensionName,
      sourceManifestPath: candidate.sourceManifestPath,
      category: candidate.category,
      proposedCapability: candidate.proposedCapability,
      signals: candidate.signals,
      gates: candidate.gates,
      status: candidate.status,
      canActivateRuntime: false,
      canExecutePluginCode: false,
      canImportModule: false,
      contentExposed: false,
    })),
    adapterContracts: candidates.map((candidate) => ({
      candidateId: candidate.id,
      manifestId: candidate.manifestId,
      category: candidate.category,
      proposedCapabilityId: candidate.proposedCapability?.id ?? candidate.id,
      expectedNativeSurfaces: [
        "native_capability_contract",
        "runtime_adapter_boundary",
        "policy_approval_gate",
        "capability_history_audit_binding",
        "observer_visibility",
      ],
      mustDenyBeforeFutureImplementation: [
        "import_old_openclaw_module",
        "execute_plugin_code",
        "activate_plugin_runtime",
        "expose_manifest_body",
        "expose_auth_env_var_names",
        "create_task_without_explicit_approval",
      ],
      runtimeOwner: "openclaw_on_nixos",
      approvalRequired: candidate.proposedCapability?.approvalRequired === true,
      auditLedger: candidate.proposedCapability?.auditLedger ?? "capability_history",
      implementationStatus: "contract_tests_ready_runtime_adapter_pending",
    })),
    tests,
    summary: {
      selectedCategory: safeCategory,
      candidateCount: candidates.length,
      adapterContractCount: candidates.length,
      totalTests: tests.length,
      requiredTests: requiredTests.length,
      passedRequired,
      failedRequired,
      nativeAdapterContractTestsReady: candidates.length > 0 && failedRequired === 0,
      runtimeAdapterImplemented: false,
      requiresApproval: candidates.filter((candidate) => candidate.proposedCapability?.approvalRequired === true).length,
      crossBoundaryCandidates: candidates.filter((candidate) => candidate.proposedCapability?.domains?.includes("cross_boundary")).length,
      canReadManifestMetadata: true,
      exposesManifestBodies: false,
      exposesAuthEnvVarNames: false,
      exposesConfigSchemaBodies: false,
      canImportModule: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
      nextAllowedWork: [
        "implement the selected candidate as a native OpenClawOnNixOS adapter contract",
        "keep runtime execution behind explicit approval-gated task materialization",
        "add preflight and runtime activation gates only after contract tests stay green",
      ],
    },
    governance: {
      mode: "plugin_candidate_contract_tests_read_only",
      runtimeOwner: "openclaw_on_nixos",
      sourceRegistry: capabilityPlan.registry,
      selectedCategory: safeCategory,
      canReadManifestMetadata: true,
      exposesManifestBodies: false,
      exposesAuthEnvVarNames: false,
      exposesConfigSchemaBodies: false,
      exposesSourceFileContent: false,
      exposesScriptBodies: false,
      canImportModule: false,
      canExecutePluginCode: false,
      canActivateRuntime: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
      requiresExplicitApprovalBeforeExecution: true,
      requiresNativeAdapterBeforeRuntimeActivation: true,
    },
  };
}

  return {
    buildNativePluginManifestProfile,
    buildOpenClawPluginManifestMap,
    buildOpenClawPluginCapabilityPlan,
    buildOpenClawPluginCandidateContractTests,
  };
}
