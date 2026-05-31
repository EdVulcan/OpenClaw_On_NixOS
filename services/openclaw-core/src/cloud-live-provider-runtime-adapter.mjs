const RUNTIME_ADAPTER_MODULE_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-runtime-adapter-module-contract-v0";
const PROVIDER_REQUEST_BUILDER_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-request-builder-v0";
const CREDENTIAL_REFERENCE_RESOLVER_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-reference-resolver-v0";
const PROVIDER_REQUEST_SENDER_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-send-provider-request-v0";

const ADAPTER_METHODS = [
  {
    name: "buildProviderRequest",
    implemented: true,
    boundary: "pure serialization only; no credential values, SDK calls, or network egress",
  },
  {
    name: "resolveCredentialReference",
    implemented: true,
    boundary: "reference validation only; no credential values are read or exposed",
  },
  {
    name: "sendProviderRequest",
    implemented: true,
    boundary: "no-network sender envelope only; endpoint contact and network egress remain deferred",
  },
  {
    name: "recordEgressTranscript",
    implemented: false,
    boundary: "future transcript writer; current module must not create live-call records",
  },
  {
    name: "verifyProviderResponse",
    implemented: false,
    boundary: "future response verifier; current module must not call providers",
  },
  {
    name: "buildRollbackNote",
    implemented: false,
    boundary: "future operator-visible rollback note; current module is contract-only",
  },
];

function stableJson(value) {
  if (value === undefined) {
    return "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normaliseMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }
  return messages
    .filter((message) => message && typeof message === "object")
    .map((message) => ({
      role: typeof message.role === "string" && message.role.trim() ? message.role.trim() : "user",
      content: typeof message.content === "string" ? message.content : "",
    }));
}

export function buildProviderRequest({
  executionPlan = {},
  requestEnvelope = {},
  operatorAuthorization = {},
} = {}) {
  const messages = normaliseMessages(requestEnvelope.messages ?? requestEnvelope.request?.messages);
  const body = {
    model: requestEnvelope.model ?? "operator-selected-model",
    messages,
    metadata: {
      openclawRequestId: requestEnvelope.id ?? executionPlan.requestEnvelopeHash ?? null,
      runbookRecordId: executionPlan.runbookRecordId ?? requestEnvelope.runbookRecordId ?? null,
      runbookContentHash: executionPlan.runbookContentHash ?? requestEnvelope.runbookContentHash ?? null,
      requestEnvelopeHash: executionPlan.requestEnvelopeHash ?? requestEnvelope.contentHash ?? null,
      endpointFingerprint: executionPlan.endpointFingerprint ?? requestEnvelope.endpointFingerprint ?? null,
      authorizationState: operatorAuthorization.state ?? "not_authorized",
    },
  };
  const bodyText = stableJson(body);
  return {
    ok: true,
    registry: PROVIDER_REQUEST_BUILDER_REGISTRY,
    mode: "phase_28_pure_provider_request_builder",
    request: {
      method: "POST",
      path: "/v1/chat/completions",
      headers: {
        "content-type": "application/json",
        "x-openclaw-egress-mode": "disabled",
      },
      body,
      bodyText,
      credentialReference: executionPlan.credentialReference ?? null,
      credentialValue: null,
      endpoint: {
        fingerprint: executionPlan.endpointFingerprint ?? null,
        contacted: false,
      },
    },
    governance: {
      pureFunction: true,
      mutatesModule: false,
      writesSource: false,
      callsCloudModel: false,
      transmitsExternally: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    },
    summary: {
      ready: messages.length > 0,
      messageCount: messages.length,
      hasCredentialReference: typeof executionPlan.credentialReference === "string",
      credentialValueIncluded: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    },
  };
}

export function resolveCredentialReference({
  executionPlan = {},
  credentialReference,
} = {}) {
  const reference = credentialReference ?? executionPlan.credentialReference ?? null;
  const validReference = typeof reference === "string" && reference.startsWith("openclaw://credential/");
  return {
    ok: true,
    registry: CREDENTIAL_REFERENCE_RESOLVER_REGISTRY,
    mode: "phase_32_credential_reference_resolver",
    credential: {
      reference,
      validReference,
      scope: validReference ? reference.replace("openclaw://credential/", "") : null,
      value: null,
      valueHash: null,
      resolvedValue: null,
    },
    governance: {
      pureFunction: true,
      referenceOnly: true,
      credentialValueRead: false,
      credentialValueExposed: false,
      providerCredentialRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    },
    summary: {
      ready: validReference,
      credentialReferencePresent: typeof reference === "string",
      validReference,
      referenceOnly: true,
      credentialValueIncluded: false,
      credentialValueRead: false,
      credentialValueExposed: false,
      providerCredentialRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    },
  };
}

export function sendProviderRequest({
  providerRequest = {},
  credentialResolution = {},
  operatorAuthorization = {},
} = {}) {
  const request = providerRequest.request ?? {};
  const credential = credentialResolution.credential ?? {};
  const credentialReference = request.credentialReference ?? credential.reference ?? null;
  const bodyText = typeof request.bodyText === "string" ? request.bodyText : stableJson(request.body ?? null);
  const ready = typeof bodyText === "string"
    && bodyText.length > 0
    && typeof credentialReference === "string"
    && credential.value === null
    && credential.resolvedValue === null;
  return {
    ok: true,
    registry: PROVIDER_REQUEST_SENDER_REGISTRY,
    mode: "phase_36_no_network_provider_request_sender",
    egressEnvelope: {
      dispatch: "deferred",
      method: request.method ?? "POST",
      path: request.path ?? "/v1/chat/completions",
      headers: {
        ...(request.headers ?? {}),
        "x-openclaw-egress-mode": "disabled",
      },
      bodyText,
      credentialReference,
      credentialValue: null,
      endpoint: {
        ...(request.endpoint ?? {}),
        contacted: false,
      },
      operatorAuthorizationState: operatorAuthorization.state ?? "not_authorized",
      response: null,
    },
    governance: {
      pureFunction: true,
      noNetworkSenderEnvelope: true,
      referenceOnly: true,
      dispatchDeferred: true,
      credentialValueRead: false,
      credentialValueExposed: false,
      providerCredentialRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    },
    summary: {
      ready,
      noNetworkSenderReady: ready,
      requestPrepared: typeof bodyText === "string" && bodyText.length > 0,
      credentialReferencePresent: typeof credentialReference === "string",
      referenceOnly: true,
      dispatchDeferred: true,
      credentialValueIncluded: false,
      credentialValueRead: false,
      credentialValueExposed: false,
      providerCredentialRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    },
  };
}

export function buildCloudLiveProviderRuntimeAdapterModuleContract() {
  const implementedMethodCount = ADAPTER_METHODS.filter((method) => method.implemented).length;
  return {
    ok: true,
    registry: RUNTIME_ADAPTER_MODULE_REGISTRY,
    module: "services/openclaw-core/src/cloud-live-provider-runtime-adapter.mjs",
    mode: "phase_24_live_provider_runtime_adapter_module_contract",
    status: "contract_skeleton_ready_no_live_egress",
    adapterKind: "cloud_consciousness_live_provider_call_runtime_adapter",
    implementationStatus: "contract_skeleton_only",
    methods: ADAPTER_METHODS,
    forbiddenOperations: [
      "provider_sdk_import",
      "credential_value_read",
      "endpoint_contact",
      "network_egress",
      "live_provider_call",
    ],
    governance: {
      phase: "phase-24",
      moduleBoundaryDefined: true,
      implementsRuntimeAdapter: false,
      callsCloudModel: false,
      transmitsExternally: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    },
    summary: {
      ready: true,
      complete: true,
      completionPercent: 100,
      moduleBoundaryDefined: true,
      methodCount: ADAPTER_METHODS.length,
      implementedMethodCount,
      pureProviderRequestBuilderReady: true,
      pureCredentialReferenceResolverReady: true,
      noNetworkProviderRequestSenderReady: true,
      implementsRuntimeAdapter: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      liveProviderCallEnabled: false,
    },
  };
}
