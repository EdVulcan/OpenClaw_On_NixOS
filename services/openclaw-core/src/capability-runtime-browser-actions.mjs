const CAPABILITY_ID = "act.browser.open";
const OPERATION = "browser.new_tab";
const REGISTRY = "openclaw-browser-action-capability-v0";
const MAX_URL_CHARS = 2_048;
const SAFE_MEDIATION_REASONS = new Set([
  "operator_takeover_active",
  "trusted_sidecar_capture_source_unavailable",
  "trusted_helper_lease_not_ready",
  "visual_frame_not_ready",
  "semantic_target_capture_mismatch",
  "unsupported_action",
  "authority_already_connected",
  "browser_action_owner_unavailable",
]);

function boundedReason(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const reason = value.trim();
  return SAFE_MEDIATION_REASONS.has(reason) ? reason : "owner_rejected";
}

function normaliseOperation(request) {
  const params = request?.params ?? {};
  return request?.operation ?? params.operation ?? request?.intent ?? null;
}

function normaliseUrl(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > MAX_URL_CHARS) {
    throw new Error("Browser capability new-tab requires a URL within 2048 characters.");
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error("Browser capability new-tab requires a valid URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Browser capability new-tab only allows HTTP(S) URLs.");
  }
  if (url.username || url.password) {
    throw new Error("Browser capability new-tab URL must not contain credentials.");
  }
  return url.href;
}

function compactMediation(mediation) {
  return {
    attempted: mediation?.attempted === true,
    accepted: mediation?.accepted === true,
    status: typeof mediation?.status === "string" ? mediation.status.slice(0, 80) : null,
    reason: boundedReason(mediation?.reason),
    leaseMatched: mediation?.leaseMatched === true,
    transport: typeof mediation?.transport === "string" ? mediation.transport.slice(0, 80) : null,
    visualGrounding: mediation?.visualGrounding
      ? {
          required: mediation.visualGrounding.required === true,
          status: typeof mediation.visualGrounding.status === "string"
            ? mediation.visualGrounding.status.slice(0, 80)
            : null,
          sequenceAdvanced: mediation.visualGrounding.sequenceAdvanced === true,
          imageDataRetained: false,
          persisted: false,
        }
      : null,
  };
}

function projectOwnerResponse(response, operation) {
  const action = response?.action ?? {};
  const mediation = compactMediation(action.mediation);
  const ownerContractMatched = action.kind === OPERATION;
  const browserRuntimeExecuted = action.result === "executed-browser-runtime";
  return {
    ok: response?.ok === true && ownerContractMatched && mediation.accepted === true,
    registry: REGISTRY,
    operation,
    action: {
      kind: OPERATION,
      result: typeof action.result === "string" ? action.result.slice(0, 80) : null,
      degraded: action.degraded === true,
      mediation,
    },
    governance: {
      dispatchesExistingScreenActOwner: true,
      ownerContractMatched,
      requiresFreshScreenContext: true,
      requiresTrustedLease: true,
      browserNetworkNavigation: true,
      automaticDispatch: false,
      createsTask: false,
      createsApproval: false,
      mutatesBrowserState: browserRuntimeExecuted,
      exposesNavigationUrl: false,
      exposesPagePayload: false,
      exposesSelectors: false,
      exposesInputValues: false,
      providerCall: false,
      providerEgress: false,
      externalProviderContact: false,
    },
    summary: {
      operation,
      ownerContractMatched,
      actionAttempted: mediation.attempted,
      accepted: mediation.accepted,
      browserRuntimeExecuted,
      degraded: action.degraded === true,
      mediationStatus: mediation.status,
      mediationReason: mediation.reason,
      leaseMatched: mediation.leaseMatched,
      browserNetworkNavigation: true,
      noAutomaticDispatch: true,
      noPayloadExposure: true,
      noProviderEgress: true,
    },
  };
}

function unavailableOwnerResponse(operation) {
  return {
    ok: false,
    registry: REGISTRY,
    operation,
    action: {
      kind: OPERATION,
      result: null,
      degraded: true,
      mediation: {
        attempted: true,
        accepted: false,
        status: "unavailable",
        reason: "browser_action_owner_unavailable",
        leaseMatched: false,
        transport: null,
        visualGrounding: null,
      },
    },
    governance: {
      dispatchesExistingScreenActOwner: true,
      requiresFreshScreenContext: true,
      requiresTrustedLease: true,
      browserNetworkNavigation: true,
      automaticDispatch: false,
      createsTask: false,
      createsApproval: false,
      mutatesBrowserState: false,
      exposesNavigationUrl: false,
      exposesPagePayload: false,
      exposesSelectors: false,
      exposesInputValues: false,
      providerCall: false,
      providerEgress: false,
      externalProviderContact: false,
    },
    summary: {
      operation,
      actionAttempted: true,
      accepted: false,
      browserRuntimeExecuted: false,
      degraded: true,
      mediationStatus: "unavailable",
      mediationReason: "browser_action_owner_unavailable",
      leaseMatched: false,
      browserNetworkNavigation: true,
      noAutomaticDispatch: true,
      noPayloadExposure: true,
      noProviderEgress: true,
    },
  };
}

export function createBrowserActionCapabilityHandlers({
  screenActUrl,
  postJson = async () => {
    throw new Error("Browser action capability transport is not configured.");
  },
} = {}) {
  function normaliseRequest(request) {
    const operation = normaliseOperation(request);
    if (operation !== OPERATION) {
      throw new Error("Browser action capability only allows browser.new_tab.");
    }
    return {
      operation,
      url: normaliseUrl(request?.params?.url),
    };
  }

  async function callBackend(capability, request) {
    if (capability.id !== CAPABILITY_ID) {
      return { handled: false, result: null };
    }
    const action = normaliseRequest(request);
    try {
      const response = await postJson(`${screenActUrl}/act/browser/new-tab`, { url: action.url });
      return {
        handled: true,
        result: projectOwnerResponse(response, action.operation),
      };
    } catch {
      return {
        handled: true,
        result: unavailableOwnerResponse(action.operation),
      };
    }
  }

  function summariseResult(capability, result) {
    if (capability.id !== CAPABILITY_ID) return null;
    const summary = result?.summary ?? {};
    const governance = result?.governance ?? {};
    return {
      kind: "browser.new_tab",
      ok: result?.ok === true,
      operation: result?.operation ?? OPERATION,
      actionAttempted: summary.actionAttempted === true,
      accepted: summary.accepted === true,
      browserRuntimeExecuted: summary.browserRuntimeExecuted === true,
      degraded: summary.degraded === true,
      mediationStatus: summary.mediationStatus ?? null,
      mediationReason: summary.mediationReason ?? null,
      leaseMatched: summary.leaseMatched === true,
      browserNetworkNavigation: governance.browserNetworkNavigation === true,
      noAutomaticDispatch: governance.automaticDispatch === false,
      noPayloadExposure: governance.exposesNavigationUrl === false
        && governance.exposesPagePayload === false
        && governance.exposesSelectors === false
        && governance.exposesInputValues === false,
      noProviderEgress: governance.providerCall !== true
        && governance.providerEgress !== true
        && governance.externalProviderContact !== true,
    };
  }

  function validateRequest(capability, request) {
    if (capability.id !== CAPABILITY_ID) return null;
    const params = request?.params ?? {};
    const candidates = [request?.operation, params.operation, request?.intent]
      .filter((value) => value !== undefined && value !== null && value !== "");
    if (candidates.some((value) => value !== OPERATION)) {
      return "Browser action capability only allows browser.new_tab.";
    }
    if (typeof params.url !== "string") {
      return "Browser action capability requires params.url.";
    }
    try {
      normaliseUrl(params.url);
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid browser action URL.";
    }
    return null;
  }

  return { callBackend, summariseResult, validateRequest };
}
