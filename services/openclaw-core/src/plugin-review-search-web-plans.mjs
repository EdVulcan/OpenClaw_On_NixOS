import { createHash, randomUUID } from "node:crypto";

export function createPluginReviewSearchWebPlans({
  autonomyMode,
  buildOpenClawPluginCandidateContractTests,
} = {}) {
  function buildOpenClawPluginSearchWebAdapterContract({
    workspacePath = null,
    query = null,
    limit = 8,
  } = {}) {
    const contractTests = buildOpenClawPluginCandidateContractTests({
      workspacePath,
      category: "search_and_web",
      query,
      limit,
    });
    const candidates = Array.isArray(contractTests.candidates) ? contractTests.candidates : [];
    const providerContracts = candidates.map((candidate) => {
      const proposed = candidate.proposedCapability ?? {};
      const signals = candidate.signals ?? {};
      const hasFetchSignal = (signals.contractKeys ?? [])
        .some((key) => /(fetch|browser|web)/iu.test(String(key)));
      const operationSet = [
        "search.query",
        hasFetchSignal ? "web.fetch_metadata" : null,
      ].filter(Boolean);

      return {
        id: `openclaw.search_web.${String(candidate.manifestId ?? candidate.extensionName ?? "candidate").replace(/[^a-zA-Z0-9_.:-]+/gu, "_")}`,
        candidateId: candidate.id,
        manifestId: candidate.manifestId,
        extensionName: candidate.extensionName,
        sourceManifestPath: candidate.sourceManifestPath,
        category: candidate.category,
        proposedCapabilityId: proposed.id ?? candidate.id,
        operations: operationSet,
        contractKeys: signals.contractKeys ?? [],
        policy: {
          domain: "cross_boundary",
          risk: proposed.risk ?? "medium",
          requiresApproval: true,
          requiresFreshApprovalForExecution: true,
        },
        audit: {
          required: true,
          ledger: proposed.auditLedger ?? "capability_history",
        },
        runtime: {
          owner: "openclaw_on_nixos",
          adapterId: "openclaw.search_web.native-adapter",
          implementationState: "contract_shell_ready_runtime_disabled",
          canReadManifestMetadata: true,
          canResolveProviderMetadata: true,
          canUseNetwork: false,
          canImportModule: false,
          canExecutePluginCode: false,
          canActivateRuntime: false,
        },
        privacy: {
          manifestBodyExposed: false,
          authEnvVarNamesExposed: false,
          endpointHostsExposed: false,
          configSchemaBodyExposed: false,
          sourceFileContentExposed: false,
        },
        futureTaskBoundary: {
          requiredBeforeNetworkUse: true,
          requiresExplicitApproval: true,
          createsTaskNow: false,
          createsApprovalNow: false,
        },
      };
    });
    const contractChecks = providerContracts.flatMap((contract) => ([
      {
        id: `${contract.id}:native_adapter_shell_declared`,
        providerContractId: contract.id,
        required: true,
        status: contract.runtime.adapterId === "openclaw.search_web.native-adapter"
          && contract.runtime.owner === "openclaw_on_nixos"
          ? "passed"
          : "failed",
        evidence: `adapter=${contract.runtime.adapterId}; owner=${contract.runtime.owner}`,
      },
      {
        id: `${contract.id}:cross_boundary_policy_locked`,
        providerContractId: contract.id,
        required: true,
        status: contract.policy.domain === "cross_boundary"
          && contract.policy.requiresApproval === true
          && contract.policy.requiresFreshApprovalForExecution === true
          ? "passed"
          : "failed",
        evidence: `domain=${contract.policy.domain}; approval=${Boolean(contract.policy.requiresApproval)}`,
      },
      {
        id: `${contract.id}:runtime_execution_blocked`,
        providerContractId: contract.id,
        required: true,
        status: contract.runtime.canUseNetwork === false
          && contract.runtime.canImportModule === false
          && contract.runtime.canExecutePluginCode === false
          && contract.runtime.canActivateRuntime === false
          ? "passed"
          : "failed",
        evidence: `network=${Boolean(contract.runtime.canUseNetwork)}; import=${Boolean(contract.runtime.canImportModule)}; execute=${Boolean(contract.runtime.canExecutePluginCode)}; activate=${Boolean(contract.runtime.canActivateRuntime)}`,
      },
      {
        id: `${contract.id}:privacy_boundary_locked`,
        providerContractId: contract.id,
        required: true,
        status: contract.privacy.manifestBodyExposed === false
          && contract.privacy.authEnvVarNamesExposed === false
          && contract.privacy.endpointHostsExposed === false
          && contract.privacy.configSchemaBodyExposed === false
          && contract.privacy.sourceFileContentExposed === false
          ? "passed"
          : "failed",
        evidence: "manifest/auth/endpoints/schema/source are redacted",
      },
    ]));
    const requiredChecks = contractChecks.filter((check) => check.required);
    const passedRequired = requiredChecks.filter((check) => check.status === "passed").length;
    const failedRequired = requiredChecks.length - passedRequired;

    return {
      ok: contractTests.ok === true && providerContracts.length > 0 && failedRequired === 0,
      registry: "openclaw-plugin-search-web-adapter-contract-v0",
      mode: "native-search-web-adapter-contract-shell",
      generatedAt: new Date().toISOString(),
      sourceRegistries: [
        contractTests.registry,
        "openclaw-plugin-capability-plan-v0",
        "openclaw-plugin-manifest-map-v0",
      ],
      workspace: contractTests.workspace,
      adapter: {
        id: "openclaw.search_web.native-adapter",
        title: "Native OpenClaw Search/Web Adapter Contract",
        runtimeOwner: "openclaw_on_nixos",
        status: "contract_shell_ready_runtime_disabled",
        selectedCategory: "search_and_web",
        canReadManifestMetadata: true,
        canResolveProviderMetadata: true,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        createsTask: false,
        createsApproval: false,
      },
      providerContracts,
      contractChecks,
      summary: {
        selectedCategory: "search_and_web",
        providerContractCount: providerContracts.length,
        operationCount: providerContracts.reduce((total, contract) => total + contract.operations.length, 0),
        requiredChecks: requiredChecks.length,
        passedRequired,
        failedRequired,
        adapterContractReady: providerContracts.length > 0 && failedRequired === 0,
        runtimeAdapterImplemented: false,
        requiresApproval: providerContracts.filter((contract) => contract.policy.requiresApproval === true).length,
        crossBoundaryContracts: providerContracts.filter((contract) => contract.policy.domain === "cross_boundary").length,
        canReadManifestMetadata: true,
        exposesManifestBodies: false,
        exposesAuthEnvVarNames: false,
        exposesEndpointHosts: false,
        exposesConfigSchemaBodies: false,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        canMutate: false,
        createsTask: false,
        createsApproval: false,
        nextAllowedWork: [
          "materialize search/web adapter invocations only as approval-gated task drafts",
          "add dry-run/preflight envelopes for network-bound search/web operations",
          "keep provider runtime execution disabled until explicit approval and sandbox boundaries exist",
        ],
      },
      governance: {
        mode: "plugin_search_web_adapter_contract_shell",
        runtimeOwner: "openclaw_on_nixos",
        sourceRegistry: contractTests.registry,
        selectedCategory: "search_and_web",
        canReadManifestMetadata: true,
        exposesManifestBodies: false,
        exposesAuthEnvVarNames: false,
        exposesEndpointHosts: false,
        exposesConfigSchemaBodies: false,
        exposesSourceFileContent: false,
        exposesScriptBodies: false,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        canMutate: false,
        createsTask: false,
        createsApproval: false,
        requiresExplicitApprovalBeforeNetworkUse: true,
        requiresNativeAdapterBeforeRuntimeActivation: true,
      },
    };
  }

  function findSearchWebProviderContract(adapterContract, providerContractId = null) {
    const providerContracts = Array.isArray(adapterContract.providerContracts) ? adapterContract.providerContracts : [];
    if (providerContracts.length === 0) {
      throw new Error("No search/web provider contract is available for task materialization.");
    }

    if (typeof providerContractId === "string" && providerContractId.trim()) {
      const requested = providerContractId.trim();
      const match = providerContracts.find((contract) => (
        contract.id === requested
        || contract.candidateId === requested
        || contract.manifestId === requested
        || contract.proposedCapabilityId === requested
      ));
      if (!match) {
        throw new Error("Requested providerContractId is not part of the search/web adapter contract.");
      }
      return match;
    }

    return providerContracts[0];
  }

  function buildOpenClawPluginSearchWebAdapterTaskDraft({
    workspacePath = null,
    providerContractId = null,
    query = "openclaw native integration",
    limit = 8,
  } = {}) {
    const adapterContract = buildOpenClawPluginSearchWebAdapterContract({ workspacePath, limit });
    const providerContract = findSearchWebProviderContract(adapterContract, providerContractId);
    const safeQuery = typeof query === "string" && query.trim()
      ? query.trim().slice(0, 160)
      : "openclaw native integration";
    const queryDigest = createHash("sha256").update(safeQuery).digest("hex").slice(0, 16);
    const now = new Date().toISOString();
    const policyRequest = {
      intent: "plugin.search_web.invoke",
      domain: "cross_boundary",
      risk: providerContract.policy?.risk ?? "medium",
      requiresApproval: true,
      approved: false,
      providerContractId: providerContract.id,
      tags: ["openclaw_search_web_adapter", "explicit_approval_required", "network_deferred"],
    };
    const policyDecision = {
      id: randomUUID(),
      at: now,
      engine: "openclaw-plugin-search-web-adapter-task-v0",
      stage: "plugin_search_web.task.materialize",
      subject: {
        taskId: null,
        type: "openclaw_search_web_adapter_invocation",
        goal: `Prepare approved search/web adapter invocation for ${providerContract.manifestId}`,
        targetUrl: null,
        intent: policyRequest.intent,
      },
      domain: policyRequest.domain,
      risk: policyRequest.risk,
      decision: "require_approval",
      reason: "search_web_adapter_invocation_requires_explicit_user_approval_before_network_use",
      approved: false,
      autonomyMode,
      autonomous: false,
    };
    const plan = {
      planId: `plan-${randomUUID()}`,
      strategy: "openclaw-search-web-adapter-v0",
      planner: "openclaw-plugin-search-web-adapter-task-v0",
      capabilityAware: true,
      status: "planned",
      goal: `Prepare approved search/web adapter invocation for ${providerContract.manifestId}`,
      targetUrl: null,
      intent: policyRequest.intent,
      createdAt: now,
      updatedAt: now,
      capabilitySummary: {
        total: 3,
        approvalGates: 2,
        ids: [
          "plan.openclaw.plugin_search_web_adapter_contract",
          "govern.policy.evaluate",
          "boundary.cross_domain.approval",
        ],
        byRisk: {
          low: 1,
          [policyRequest.risk]: 2,
        },
      },
      steps: [
        {
          id: "step-review-search-web-contract",
          kind: "openclaw.plugin.search_web_contract",
          phase: "reviewing_search_web_contract",
          title: "Review native search/web provider contract",
          status: "pending",
          capabilityId: "plan.openclaw.plugin_search_web_adapter_contract",
          risk: "low",
          governance: "audit_only",
          requiresApproval: false,
          params: {
            providerContractId: providerContract.id,
            manifestId: providerContract.manifestId,
          },
        },
        {
          id: "step-user-approval",
          kind: "approval.gate",
          phase: "waiting_for_approval",
          title: "Wait for explicit user approval before any network-bound search/web use",
          status: "pending",
          capabilityId: "govern.policy.evaluate",
          risk: policyRequest.risk,
          governance: "require_approval",
          requiresApproval: true,
        },
        {
          id: "step-defer-network-provider-execution",
          kind: "plugin.search_web.invoke",
          phase: "network_provider_deferred",
          title: "Defer search/web provider execution until runtime preflight exists",
          status: "pending",
          capabilityId: "boundary.cross_domain.approval",
          risk: policyRequest.risk,
          governance: "require_approval",
          requiresApproval: true,
          params: {
            providerContractId: providerContract.id,
            operation: providerContract.operations?.[0] ?? "search.query",
            queryLength: safeQuery.length,
            queryDigest,
            queryContentExposed: false,
            canUseNetwork: false,
            canExecutePluginCode: false,
          },
        },
      ],
      governance: {
        mode: "openclaw_search_web_adapter_task_plan",
        runtimeOwner: "openclaw_on_nixos",
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        requiresExplicitApproval: true,
        requiresRuntimePreflightBeforeExecution: true,
      },
    };

    return {
      ok: true,
      registry: "openclaw-plugin-search-web-adapter-task-draft-v0",
      mode: "approval-gated-search-web-task-draft",
      generatedAt: now,
      sourceRegistry: adapterContract.registry,
      sourceRegistries: [
        adapterContract.registry,
        "openclaw-plugin-candidate-contract-tests-v0",
        "openclaw-plugin-capability-plan-v0",
      ],
      workspace: adapterContract.workspace,
      adapter: adapterContract.adapter,
      providerContract,
      query: {
        present: safeQuery.length > 0,
        length: safeQuery.length,
        digest: queryDigest,
        contentExposed: false,
      },
      plan,
      policy: {
        request: policyRequest,
        decision: policyDecision,
      },
      governance: {
        mode: "plugin_search_web_adapter_task_draft",
        runtimeOwner: "openclaw_on_nixos",
        createsTask: false,
        createsApproval: false,
        canReadManifestMetadata: true,
        exposesManifestBodies: false,
        exposesAuthEnvVarNames: false,
        exposesEndpointHosts: false,
        exposesQueryContent: false,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        canMutate: false,
        requiresExplicitApprovalBeforeNetworkUse: true,
        requiresRuntimePreflightBeforeExecution: true,
      },
    };
  }

  function buildOpenClawPluginSearchWebAdapterRuntimePreflight({
    workspacePath = null,
    providerContractId = null,
    query = "openclaw native integration",
    limit = 8,
  } = {}) {
    const taskDraft = buildOpenClawPluginSearchWebAdapterTaskDraft({
      workspacePath,
      providerContractId,
      query,
      limit,
    });
    const providerContract = taskDraft.providerContract ?? {};
    const policyDecision = taskDraft.policy?.decision ?? {};
    const operation = providerContract.operations?.[0] ?? "search.query";

    return {
      ok: true,
      registry: "openclaw-plugin-search-web-adapter-runtime-preflight-v0",
      mode: "preflight-only",
      generatedAt: new Date().toISOString(),
      sourceRegistry: taskDraft.registry,
      sourceMode: taskDraft.mode,
      sourceRegistries: [
        taskDraft.registry,
        "openclaw-plugin-search-web-adapter-contract-v0",
        "openclaw-plugin-candidate-contract-tests-v0",
      ],
      workspace: taskDraft.workspace,
      adapter: {
        id: "openclaw.search_web.native-adapter",
        runtimeOwner: "openclaw_on_nixos",
        status: "preflight_ready_network_runtime_disabled",
        canResolveProviderMetadata: true,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
      },
      provider: {
        id: providerContract.id ?? null,
        manifestId: providerContract.manifestId ?? null,
        extensionName: providerContract.extensionName ?? null,
        category: providerContract.category ?? "search_and_web",
        operations: providerContract.operations ?? [],
        proposedCapabilityId: providerContract.proposedCapabilityId ?? null,
        policy: providerContract.policy ?? {},
        audit: providerContract.audit ?? {},
      },
      query: taskDraft.query,
      executionEnvelope: {
        envelopeVersion: "openclaw-search-web-execution-envelope-v0",
        state: "blocked_pending_network_runtime_adapter",
        adapterId: "openclaw.search_web.native-adapter",
        providerContractId: providerContract.id ?? null,
        manifestId: providerContract.manifestId ?? null,
        operation,
        query: {
          present: taskDraft.query?.present === true,
          length: taskDraft.query?.length ?? 0,
          digest: taskDraft.query?.digest ?? null,
          contentExposed: false,
        },
        policyDecision: {
          decision: policyDecision.decision ?? null,
          reason: policyDecision.reason ?? null,
          domain: policyDecision.domain ?? null,
          risk: policyDecision.risk ?? null,
          approved: policyDecision.approved === true,
        },
        approval: {
          required: true,
          collected: false,
          reason: "Search/web provider invocation requires explicit approval before any network use.",
        },
        audit: {
          required: providerContract.audit?.required !== false,
          ledger: providerContract.audit?.ledger ?? "capability_history",
        },
        permissions: {
          providerMetadataRead: true,
          networkSearch: true,
          webFetchMetadata: (providerContract.operations ?? []).includes("web.fetch_metadata"),
        },
        constraints: {
          canReadManifestMetadata: true,
          canResolveProviderMetadata: true,
          canExposeQueryContent: false,
          canExposeManifestBodies: false,
          canExposeAuthEnvVarNames: false,
          canExposeEndpointHosts: false,
          canUseNetwork: false,
          canImportModule: false,
          canExecutePluginCode: false,
          canActivateRuntime: false,
          canMutate: false,
          canCreateTask: false,
          canCreateApproval: false,
        },
      },
      governance: {
        mode: "plugin_search_web_runtime_preflight_only",
        runtimeOwner: "openclaw_on_nixos",
        createsTask: false,
        createsApproval: false,
        canReadManifestMetadata: true,
        canResolveProviderMetadata: true,
        exposesManifestBodies: false,
        exposesAuthEnvVarNames: false,
        exposesEndpointHosts: false,
        exposesConfigSchemaBodies: false,
        exposesSourceFileContent: false,
        exposesQueryContent: false,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        canMutate: false,
        requiresExplicitApprovalBeforeNetworkUse: true,
        requiresRuntimeAdapterBeforeExecution: true,
      },
    };
  }

  function buildOpenClawPluginSearchWebAdapterRuntimeActivationPlan({
    workspacePath = null,
    providerContractId = null,
    query = "openclaw native integration",
    limit = 8,
  } = {}) {
    const preflight = buildOpenClawPluginSearchWebAdapterRuntimePreflight({
      workspacePath,
      providerContractId,
      query,
      limit,
    });
    const envelope = preflight.executionEnvelope ?? {};
    const constraints = envelope.constraints ?? {};
    const gates = [
      {
        id: "preflight_envelope_ready",
        label: "Search/web runtime preflight envelope is available",
        required: true,
        status: envelope.envelopeVersion === "openclaw-search-web-execution-envelope-v0" ? "passed" : "blocked",
        evidence: `envelope=${envelope.envelopeVersion ?? "missing"}`,
      },
      {
        id: "audit_binding_ready",
        label: "Search/web provider audit ledger is bound",
        required: true,
        status: envelope.audit?.required === true && envelope.audit?.ledger === "capability_history" ? "passed" : "blocked",
        evidence: `ledger=${envelope.audit?.ledger ?? "missing"}`,
      },
      {
        id: "explicit_user_approval_required",
        label: "Network-bound search/web invocation requires explicit approval",
        required: true,
        status: envelope.approval?.required === true ? "passed" : "blocked",
        evidence: `approvalRequired=${Boolean(envelope.approval?.required)} collected=${Boolean(envelope.approval?.collected)}`,
      },
      {
        id: "query_privacy_locked",
        label: "Query content remains redacted before activation",
        required: true,
        status: envelope.query?.contentExposed === false && constraints.canExposeQueryContent === false ? "passed" : "blocked",
        evidence: `queryContentExposed=${Boolean(envelope.query?.contentExposed)} canExposeQueryContent=${Boolean(constraints.canExposeQueryContent)}`,
      },
      {
        id: "network_runtime_adapter_required",
        label: "Sandboxed network runtime adapter must be implemented before provider execution",
        required: true,
        status: "blocked",
        evidence: "no network runtime adapter is active",
      },
      {
        id: "provider_runtime_sandbox_required",
        label: "Provider runtime sandbox must be approved before network/provider activation",
        required: true,
        status: "blocked",
        evidence: "provider runtime sandbox is not implemented or approved",
      },
      {
        id: "runtime_activation_approval_required",
        label: "Runtime activation needs a future approval-gated task",
        required: true,
        status: "blocked",
        evidence: "this endpoint is plan-only and creates no approval",
      },
    ];
    const requiredGates = gates.filter((gate) => gate.required);
    const passedRequired = requiredGates.filter((gate) => gate.status === "passed").length;
    const blockedRequired = requiredGates.length - passedRequired;

    return {
      ok: true,
      registry: "openclaw-plugin-search-web-adapter-runtime-activation-plan-v0",
      mode: "activation-plan-only",
      generatedAt: new Date().toISOString(),
      sourceRegistry: preflight.registry,
      sourceMode: preflight.mode,
      runtimeOwner: "openclaw_on_nixos",
      status: "blocked_pending_network_runtime_adapter",
      activationReady: false,
      adapter: preflight.adapter,
      provider: preflight.provider,
      query: preflight.query,
      executionEnvelope: {
        envelopeVersion: envelope.envelopeVersion ?? null,
        state: envelope.state ?? null,
        adapterId: envelope.adapterId ?? null,
        providerContractId: envelope.providerContractId ?? null,
        manifestId: envelope.manifestId ?? null,
        operation: envelope.operation ?? null,
        query: envelope.query ?? null,
        policyDecision: envelope.policyDecision ?? null,
        approval: envelope.approval ?? null,
        audit: envelope.audit ?? null,
      },
      gates,
      summary: {
        totalGates: gates.length,
        requiredGates: requiredGates.length,
        passedRequired,
        blockedRequired,
        activationReady: false,
        canReadManifestMetadata: constraints.canReadManifestMetadata === true,
        canResolveProviderMetadata: constraints.canResolveProviderMetadata === true,
        exposesQueryContent: false,
        exposesEndpointHosts: false,
        exposesAuthEnvVarNames: false,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        canMutate: false,
        createsTask: false,
        createsApproval: false,
        nextAllowedWork: [
          "design sandboxed network runtime adapter inside OpenClawOnNixOS",
          "materialize search/web runtime activation only through approval-gated tasks",
          "bind provider execution transcripts into capability history before any live network call",
        ],
        forbiddenWork: [
          "do not perform network requests during activation planning",
          "do not import old OpenClaw provider modules in this plan",
          "do not execute provider code or expose query content before a future approval-gated activation task",
        ],
      },
      governance: {
        mode: "plugin_search_web_runtime_activation_plan_only",
        runtimeOwner: "openclaw_on_nixos",
        createsTask: false,
        createsApproval: false,
        canReadManifestMetadata: constraints.canReadManifestMetadata === true,
        canResolveProviderMetadata: constraints.canResolveProviderMetadata === true,
        exposesManifestBodies: false,
        exposesAuthEnvVarNames: false,
        exposesEndpointHosts: false,
        exposesConfigSchemaBodies: false,
        exposesSourceFileContent: false,
        exposesQueryContent: false,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        canMutate: false,
        requiresExplicitApprovalBeforeNetworkUse: true,
        requiresRuntimeAdapterBeforeExecution: true,
      },
    };
  }

  function buildOpenClawPluginSearchWebAdapterProviderRuntimeSandbox({
    workspacePath = null,
    providerContractId = null,
    query = "openclaw native integration",
    limit = 8,
  } = {}) {
    const activationPlan = buildOpenClawPluginSearchWebAdapterRuntimeActivationPlan({
      workspacePath,
      providerContractId,
      query,
      limit,
    });
    const provider = activationPlan.provider ?? {};
    const envelope = activationPlan.executionEnvelope ?? {};
    const checks = [
      {
        id: "preflight_envelope_bound",
        label: "Provider sandbox is bound to a search/web runtime preflight envelope",
        required: true,
        status: envelope.envelopeVersion === "openclaw-search-web-execution-envelope-v0" ? "passed" : "blocked",
        evidence: `envelope=${envelope.envelopeVersion ?? "missing"}`,
      },
      {
        id: "provider_metadata_only",
        label: "Sandbox contract uses provider metadata without exposing manifest bodies",
        required: true,
        status: provider.id && provider.manifestId ? "passed" : "blocked",
        evidence: `provider=${provider.id ?? "missing"} manifest=${provider.manifestId ?? "missing"}`,
      },
      {
        id: "network_egress_default_deny",
        label: "Network egress remains denied until a future allowlisted runtime adapter exists",
        required: true,
        status: "passed",
        evidence: "networkEgressDefault=deny canUseNetwork=false",
      },
      {
        id: "query_privacy_locked",
        label: "Query content remains redacted inside the sandbox contract",
        required: true,
        status: activationPlan.query?.contentExposed === false ? "passed" : "blocked",
        evidence: `queryContentExposed=${Boolean(activationPlan.query?.contentExposed)}`,
      },
      {
        id: "provider_code_import_blocked",
        label: "Old provider modules cannot be imported by this sandbox contract",
        required: true,
        status: "passed",
        evidence: "canImportModule=false",
      },
      {
        id: "provider_execution_blocked",
        label: "Provider code execution remains blocked by this sandbox contract",
        required: true,
        status: "passed",
        evidence: "canExecuteProviderCode=false",
      },
      {
        id: "sandbox_approval_required",
        label: "Provider runtime sandbox requires separate approval before activation",
        required: true,
        status: "blocked",
        evidence: "sandbox approval task has not been materialized",
      },
      {
        id: "network_runtime_adapter_required",
        label: "Network runtime adapter is still required before live provider calls",
        required: true,
        status: "blocked",
        evidence: "no network runtime adapter is active",
      },
    ];
    const requiredChecks = checks.filter((check) => check.required);
    const passedRequired = requiredChecks.filter((check) => check.status === "passed").length;
    const blockedRequired = requiredChecks.length - passedRequired;

    return {
      ok: true,
      registry: "openclaw-plugin-search-web-adapter-provider-runtime-sandbox-v0",
      mode: "provider-runtime-sandbox-contract",
      generatedAt: new Date().toISOString(),
      sourceRegistry: activationPlan.registry,
      sourceMode: activationPlan.mode,
      runtimeOwner: "openclaw_on_nixos",
      status: "contract_ready_activation_blocked",
      activationReady: false,
      adapter: {
        id: "openclaw.search_web.native-adapter",
        runtimeOwner: "openclaw_on_nixos",
        status: "provider_runtime_sandbox_contract_ready_runtime_disabled",
        canResolveProviderMetadata: true,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
      },
      provider: {
        id: provider.id ?? null,
        manifestId: provider.manifestId ?? null,
        extensionName: provider.extensionName ?? null,
        category: provider.category ?? "search_and_web",
        operations: provider.operations ?? [],
        proposedCapabilityId: provider.proposedCapabilityId ?? null,
        policy: provider.policy ?? {},
        audit: provider.audit ?? {},
      },
      query: activationPlan.query,
      sandbox: {
        sandboxId: "openclaw.search_web.provider-runtime-sandbox.v0",
        contractVersion: "openclaw-search-web-provider-runtime-sandbox-v0",
        state: "contract_ready_not_approved",
        approval: {
          required: true,
          collected: false,
          reason: "Provider runtime sandbox must be separately approved before network/provider activation.",
        },
        isolation: {
          processIsolationRequired: true,
          providerRuntimeBoundary: "openclaw_on_nixos_owned_adapter",
          providerCodeImportAllowed: false,
          oldOpenClawModuleImportAllowed: false,
          secretsMounted: false,
        },
        egress: {
          networkEgressDefault: "deny",
          allowlistRequired: true,
          allowlist: [],
          dnsResolutionAllowed: false,
          endpointHostsExposed: false,
          canUseNetwork: false,
        },
        privacy: {
          queryContentExposed: false,
          manifestBodiesExposed: false,
          authEnvVarNamesExposed: false,
          endpointHostsExposed: false,
          sourceFileContentExposed: false,
          scriptBodiesExposed: false,
        },
        execution: {
          canImportModule: false,
          canExecuteProviderCode: false,
          canActivateRuntime: false,
          canMutate: false,
        },
        audit: {
          required: true,
          ledger: "capability_history",
          transcriptRequired: true,
          preflightRequired: true,
          runtimeActivationTaskRequired: true,
        },
      },
      checks,
      summary: {
        totalChecks: checks.length,
        requiredChecks: requiredChecks.length,
        passedRequired,
        blockedRequired,
        sandboxContractReady: passedRequired >= 6,
        sandboxApproved: false,
        activationReady: false,
        canReadManifestMetadata: true,
        canResolveProviderMetadata: true,
        exposesQueryContent: false,
        exposesEndpointHosts: false,
        exposesAuthEnvVarNames: false,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        canMutate: false,
        createsTask: false,
        createsApproval: false,
        nextAllowedWork: [
          "materialize provider runtime sandbox approval only through explicit activation tasks",
          "bind a future network runtime adapter to this sandbox contract before live provider calls",
        ],
        forbiddenWork: [
          "do not perform network requests from the sandbox contract",
          "do not import old OpenClaw provider modules",
          "do not expose query content, endpoint hosts, auth env var names, source contents, or script bodies",
        ],
      },
      governance: {
        mode: "plugin_search_web_provider_runtime_sandbox_contract",
        runtimeOwner: "openclaw_on_nixos",
        createsTask: false,
        createsApproval: false,
        canReadManifestMetadata: true,
        canResolveProviderMetadata: true,
        exposesManifestBodies: false,
        exposesAuthEnvVarNames: false,
        exposesEndpointHosts: false,
        exposesConfigSchemaBodies: false,
        exposesSourceFileContent: false,
        exposesQueryContent: false,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        canMutate: false,
        requiresExplicitApprovalBeforeNetworkUse: true,
        requiresRuntimeAdapterBeforeExecution: true,
        requiresSandboxApprovalBeforeRuntimeActivation: true,
      },
    };
  }

  function buildOpenClawPluginSearchWebAdapterProviderRuntimeSandboxTaskDraft({
    workspacePath = null,
    providerContractId = null,
    query = "openclaw native integration",
    limit = 8,
  } = {}) {
    const sandbox = buildOpenClawPluginSearchWebAdapterProviderRuntimeSandbox({
      workspacePath,
      providerContractId,
      query,
      limit,
    });
    const provider = sandbox.provider ?? {};
    const now = new Date().toISOString();
    const blockedCheckIds = (sandbox.checks ?? [])
      .filter((check) => check.required === true && check.status === "blocked")
      .map((check) => check.id);
    const policyRequest = {
      intent: "plugin.search_web.provider_runtime_sandbox",
      domain: "cross_boundary",
      risk: "high",
      requiresApproval: true,
      approved: false,
      providerContractId: provider.id ?? null,
      sandboxId: sandbox.sandbox?.sandboxId ?? "openclaw.search_web.provider-runtime-sandbox.v0",
      tags: ["openclaw_search_web_provider_runtime_sandbox", "explicit_approval_required", "provider_runtime_sandbox_deferred"],
    };
    const policyDecision = {
      id: randomUUID(),
      at: now,
      engine: "openclaw-plugin-search-web-adapter-provider-runtime-sandbox-task-v0",
      stage: "plugin_search_web.provider_runtime_sandbox.task.materialize",
      subject: {
        taskId: null,
        type: "openclaw_search_web_provider_runtime_sandbox",
        goal: `Prepare approved provider runtime sandbox for ${provider.manifestId ?? "search/web provider"}`,
        targetUrl: null,
        intent: policyRequest.intent,
      },
      domain: policyRequest.domain,
      risk: policyRequest.risk,
      decision: "require_approval",
      reason: "search_web_provider_runtime_sandbox_requires_explicit_user_approval_before_provider_runtime_enablement",
      approved: false,
      autonomyMode,
      autonomous: false,
    };
    const plan = {
      planId: `plan-${randomUUID()}`,
      strategy: "openclaw-search-web-provider-runtime-sandbox-v0",
      planner: "openclaw-plugin-search-web-adapter-provider-runtime-sandbox-task-v0",
      capabilityAware: true,
      status: "planned",
      goal: policyDecision.subject.goal,
      targetUrl: null,
      intent: policyRequest.intent,
      createdAt: now,
      updatedAt: now,
      capabilitySummary: {
        total: 3,
        approvalGates: 2,
        ids: [
          "plan.openclaw.plugin_search_web_runtime_activation",
          "govern.policy.evaluate",
          "boundary.cross_domain.approval",
        ],
        byRisk: {
          low: 1,
          high: 2,
        },
      },
      steps: [
        {
          id: "step-review-provider-runtime-sandbox",
          kind: "openclaw.plugin.search_web_provider_runtime_sandbox_contract",
          phase: "reviewing_provider_runtime_sandbox",
          title: "Review search/web provider runtime sandbox boundary",
          status: "pending",
          capabilityId: "plan.openclaw.plugin_search_web_runtime_activation",
          risk: "low",
          governance: "audit_only",
          requiresApproval: false,
          params: {
            providerContractId: provider.id ?? null,
            manifestId: provider.manifestId ?? null,
            sandboxId: sandbox.sandbox?.sandboxId ?? null,
            sandboxStatus: sandbox.status,
            blockedCheckIds,
          },
        },
        {
          id: "step-user-approval",
          kind: "approval.gate",
          phase: "waiting_for_approval",
          title: "Wait for explicit user approval before any provider runtime sandbox activation attempt",
          status: "pending",
          capabilityId: "govern.policy.evaluate",
          risk: "high",
          governance: "require_approval",
          requiresApproval: true,
        },
        {
          id: "step-defer-provider-runtime-sandbox",
          kind: "plugin.search_web.provider_runtime_sandbox",
          phase: "provider_runtime_sandbox_deferred",
          title: "Defer provider runtime sandbox activation until a native network runtime adapter exists",
          status: "pending",
          capabilityId: "boundary.cross_domain.approval",
          risk: "high",
          governance: "require_approval",
          requiresApproval: true,
          params: {
            providerContractId: provider.id ?? null,
            manifestId: provider.manifestId ?? null,
            sandboxId: sandbox.sandbox?.sandboxId ?? null,
            contractVersion: sandbox.sandbox?.contractVersion ?? null,
            blockedCheckIds,
            canUseNetwork: false,
            canImportModule: false,
            canExecuteProviderCode: false,
            canActivateRuntime: false,
            queryContentExposed: false,
            endpointHostsExposed: false,
            authEnvVarNamesExposed: false,
          },
        },
      ],
      governance: {
        mode: "openclaw_search_web_provider_runtime_sandbox_task_plan",
        runtimeOwner: "openclaw_on_nixos",
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        requiresExplicitApproval: true,
        requiresRuntimeAdapterBeforeExecution: true,
        requiresSandboxApprovalBeforeRuntimeActivation: true,
      },
    };

    return {
      ok: true,
      registry: "openclaw-plugin-search-web-adapter-provider-runtime-sandbox-task-draft-v0",
      mode: "approval-gated-search-web-provider-runtime-sandbox-task-draft",
      generatedAt: now,
      sourceRegistry: sandbox.registry,
      sourceMode: sandbox.mode,
      adapter: sandbox.adapter,
      provider,
      query: sandbox.query,
      sandboxContract: {
        registry: sandbox.registry,
        status: sandbox.status,
        activationReady: sandbox.activationReady,
        sandbox: sandbox.sandbox,
        summary: sandbox.summary,
        checks: sandbox.checks,
      },
      plan,
      policy: {
        request: policyRequest,
        decision: policyDecision,
      },
      governance: {
        mode: "plugin_search_web_provider_runtime_sandbox_task_draft",
        runtimeOwner: "openclaw_on_nixos",
        createsTask: false,
        createsApproval: false,
        canReadManifestMetadata: true,
        canResolveProviderMetadata: true,
        exposesManifestBodies: false,
        exposesAuthEnvVarNames: false,
        exposesEndpointHosts: false,
        exposesSourceFileContent: false,
        exposesQueryContent: false,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        canMutate: false,
        requiresExplicitApprovalBeforeProviderRuntimeSandbox: true,
        requiresRuntimeAdapterBeforeExecution: true,
      },
    };
  }

  function buildOpenClawPluginSearchWebAdapterRuntimeActivationTaskDraft({
    workspacePath = null,
    providerContractId = null,
    query = "openclaw native integration",
    limit = 8,
  } = {}) {
    const activationPlan = buildOpenClawPluginSearchWebAdapterRuntimeActivationPlan({
      workspacePath,
      providerContractId,
      query,
      limit,
    });
    const provider = activationPlan.provider ?? {};
    const envelope = activationPlan.executionEnvelope ?? {};
    const now = new Date().toISOString();
    const policyRequest = {
      intent: "plugin.search_web.runtime_activation",
      domain: "cross_boundary",
      risk: "high",
      requiresApproval: true,
      approved: false,
      providerContractId: provider.id ?? null,
      tags: ["openclaw_search_web_runtime_activation", "explicit_approval_required", "network_runtime_deferred"],
    };
    const policyDecision = {
      id: randomUUID(),
      at: now,
      engine: "openclaw-plugin-search-web-adapter-runtime-activation-task-v0",
      stage: "plugin_search_web.runtime_activation.task.materialize",
      subject: {
        taskId: null,
        type: "openclaw_search_web_runtime_activation",
        goal: `Prepare approved search/web runtime activation for ${provider.manifestId ?? "search/web provider"}`,
        targetUrl: null,
        intent: policyRequest.intent,
      },
      domain: policyRequest.domain,
      risk: policyRequest.risk,
      decision: "require_approval",
      reason: "search_web_runtime_activation_requires_explicit_user_approval_before_network_runtime_enablement",
      approved: false,
      autonomyMode,
      autonomous: false,
    };
    const blockedGateIds = (activationPlan.gates ?? [])
      .filter((gate) => gate.required === true && gate.status === "blocked")
      .map((gate) => gate.id);
    const plan = {
      planId: `plan-${randomUUID()}`,
      strategy: "openclaw-search-web-runtime-activation-v0",
      planner: "openclaw-plugin-search-web-adapter-runtime-activation-task-v0",
      capabilityAware: true,
      status: "planned",
      goal: policyDecision.subject.goal,
      targetUrl: null,
      intent: policyRequest.intent,
      createdAt: now,
      updatedAt: now,
      capabilitySummary: {
        total: 3,
        approvalGates: 2,
        ids: [
          "plan.openclaw.plugin_search_web_runtime_activation",
          "govern.policy.evaluate",
          "boundary.cross_domain.approval",
        ],
        byRisk: {
          low: 1,
          high: 2,
        },
      },
      steps: [
        {
          id: "step-review-search-web-activation-plan",
          kind: "openclaw.plugin.search_web_runtime_activation_plan",
          phase: "reviewing_runtime_activation_plan",
          title: "Review search/web runtime activation gates",
          status: "pending",
          capabilityId: "plan.openclaw.plugin_search_web_runtime_activation",
          risk: "low",
          governance: "audit_only",
          requiresApproval: false,
          params: {
            providerContractId: provider.id ?? null,
            manifestId: provider.manifestId ?? null,
            status: activationPlan.status,
            blockedGateIds,
          },
        },
        {
          id: "step-user-approval",
          kind: "approval.gate",
          phase: "waiting_for_approval",
          title: "Wait for explicit user approval before any search/web runtime activation attempt",
          status: "pending",
          capabilityId: "govern.policy.evaluate",
          risk: "high",
          governance: "require_approval",
          requiresApproval: true,
        },
        {
          id: "step-defer-network-runtime-activation",
          kind: "plugin.search_web.runtime_activation",
          phase: "network_runtime_deferred",
          title: "Defer search/web network runtime activation until sandbox/provider adapter exists",
          status: "pending",
          capabilityId: "boundary.cross_domain.approval",
          risk: "high",
          governance: "require_approval",
          requiresApproval: true,
          params: {
            providerContractId: provider.id ?? null,
            operation: envelope.operation ?? "search.query",
            blockedGateIds,
            canUseNetwork: false,
            canExecutePluginCode: false,
            canActivateRuntime: false,
            queryContentExposed: false,
          },
        },
      ],
      governance: {
        mode: "openclaw_search_web_runtime_activation_task_plan",
        runtimeOwner: "openclaw_on_nixos",
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        requiresExplicitApproval: true,
        requiresRuntimeAdapterBeforeExecution: true,
      },
    };

    return {
      ok: true,
      registry: "openclaw-plugin-search-web-adapter-runtime-activation-task-draft-v0",
      mode: "approval-gated-search-web-runtime-activation-task-draft",
      generatedAt: now,
      sourceRegistry: activationPlan.registry,
      sourceMode: activationPlan.mode,
      adapter: activationPlan.adapter,
      provider,
      query: activationPlan.query,
      activationPlan: {
        registry: activationPlan.registry,
        status: activationPlan.status,
        activationReady: activationPlan.activationReady,
        summary: activationPlan.summary,
        gates: activationPlan.gates,
        executionEnvelope: activationPlan.executionEnvelope,
      },
      plan,
      policy: {
        request: policyRequest,
        decision: policyDecision,
      },
      governance: {
        mode: "plugin_search_web_runtime_activation_task_draft",
        runtimeOwner: "openclaw_on_nixos",
        createsTask: false,
        createsApproval: false,
        canReadManifestMetadata: true,
        canResolveProviderMetadata: true,
        exposesManifestBodies: false,
        exposesAuthEnvVarNames: false,
        exposesEndpointHosts: false,
        exposesSourceFileContent: false,
        exposesQueryContent: false,
        canUseNetwork: false,
        canImportModule: false,
        canExecutePluginCode: false,
        canActivateRuntime: false,
        canMutate: false,
        requiresExplicitApprovalBeforeNetworkRuntimeActivation: true,
        requiresRuntimeAdapterBeforeExecution: true,
      },
    };
  }


  return {
    buildOpenClawPluginSearchWebAdapterContract,
    buildOpenClawPluginSearchWebAdapterTaskDraft,
    buildOpenClawPluginSearchWebAdapterRuntimePreflight,
    buildOpenClawPluginSearchWebAdapterRuntimeActivationPlan,
    buildOpenClawPluginSearchWebAdapterProviderRuntimeSandbox,
    buildOpenClawPluginSearchWebAdapterRuntimeActivationTaskDraft,
    buildOpenClawPluginSearchWebAdapterProviderRuntimeSandboxTaskDraft,
  };
}
