const CAPABILITY_ID = "sense.screen.observe";
const SCREEN_REGISTRY = "openclaw-screen-observation-v0";
const PUBLIC_READINESS = new Set(["warming_up", "ready", "degraded"]);
const PUBLIC_WORK_VIEW_STATUS = new Set(["prepared", "ready", "degraded", "stopped"]);
const PUBLIC_WORK_VIEW_VISIBILITY = new Set(["hidden", "observable", "visible", "warming_up"]);
const PUBLIC_WORK_VIEW_MODE = new Set(["ai-owned-work-view", "background", "foreground-observable"]);
const PUBLIC_HELPER_STATUS = new Set(["active", "degraded", "inactive", "idle"]);
const PUBLIC_BROWSER_STATUS = new Set(["running", "stopped", "degraded"]);
const PUBLIC_CAPTURE_SOURCES = new Set(["browser", "command", "node", "powershell"]);
const PUBLIC_CAPTURE_STRATEGIES = new Set([
  "browser-state-derived",
  "browser-runtime-backed",
  "external-command",
  "external-node",
  "external-powershell",
]);
const UNSUPPORTED_PAYLOAD_FLAGS = [
  "includePayload",
  "includeVisualFrame",
  "includeSnapshotText",
  "includeOcrText",
  "includeSemanticTargets",
];

function publicEnum(value, allowed) {
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function countArray(value, max = 100) {
  return Array.isArray(value) ? Math.min(value.length, max) : 0;
}

function boundedInteger(value, { minimum = 0, maximum = 4096 } = {}) {
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : null;
}

function projectScreenObservation(response) {
  const screen = response?.screen ?? null;
  const workView = screen?.workView ?? {};
  const trustedSession = screen?.trustedSession ?? {};
  const workViewSummary = screen?.workViewSummary ?? {};
  const visualFrame = screen?.visualFrame ?? {};
  const semanticTargets = screen?.semanticTargets ?? {};
  const observation = {
    readiness: publicEnum(screen?.readiness, PUBLIC_READINESS) ?? "degraded",
    captureSource: publicEnum(screen?.captureSource, PUBLIC_CAPTURE_SOURCES),
    captureStrategy: publicEnum(screen?.captureStrategy, PUBLIC_CAPTURE_STRATEGIES),
    focusedWindowAvailable: Boolean(screen?.focusedWindow),
    windowCount: countArray(screen?.windowList),
    ocrBlockCount: countArray(screen?.ocrBlocks, 256),
    visualFrame: {
      available: visualFrame.available === true,
      width: boundedInteger(visualFrame.width),
      height: boundedInteger(visualFrame.height),
      fresh: visualFrame.fresh === true,
      dataExposed: false,
    },
    semanticTargets: {
      available: semanticTargets.available === true,
      itemCount: boundedInteger(semanticTargets.itemCount, { maximum: 64 }) ?? 0,
      itemsExposed: false,
    },
    workView: {
      status: publicEnum(workView.status, PUBLIC_WORK_VIEW_STATUS),
      visibility: publicEnum(workView.visibility, PUBLIC_WORK_VIEW_VISIBILITY),
      mode: publicEnum(workView.mode, PUBLIC_WORK_VIEW_MODE),
      helperStatus: publicEnum(workView.helperStatus, PUBLIC_HELPER_STATUS),
      browserStatus: publicEnum(workView.browserStatus, PUBLIC_BROWSER_STATUS),
      tabCount: boundedInteger(workViewSummary.tabCount, { maximum: 100 }) ?? 0,
      visibleTextBlockCount: countArray(workViewSummary.visibleTextBlocks, 256),
      recentInteractionPresent: Boolean(workViewSummary.recentInteraction),
    },
    updatedAt: typeof screen?.timestamp === "string" ? screen.timestamp : null,
    trustedSessionAvailable: Boolean(trustedSession?.sessionIdentity),
  };

  return {
    ok: response?.ok === true && screen !== null,
    registry: SCREEN_REGISTRY,
    observation,
    summary: {
      readiness: observation.readiness,
      focusedWindowAvailable: observation.focusedWindowAvailable,
      windowCount: observation.windowCount,
      ocrBlockCount: observation.ocrBlockCount,
      visualFrameAvailable: observation.visualFrame.available,
      semanticTargetCount: observation.semanticTargets.itemCount,
      workViewStatus: observation.workView.status,
      workViewVisibility: observation.workView.visibility,
    },
    governance: {
      readsScreenState: true,
      exposesFocusedWindowTitle: false,
      exposesWindowTitles: false,
      exposesOcrText: false,
      exposesSnapshotText: false,
      exposesActiveUrl: false,
      exposesSessionId: false,
      exposesLeaseId: false,
      exposesVisualFrameBytes: false,
      exposesSemanticTargetItems: false,
      mutatesScreenState: false,
      createsTask: false,
      createsApproval: false,
      callsProvider: false,
      networkEgress: false,
    },
  };
}

export function createScreenObservationCapabilityHandlers({
  screenSenseUrl,
  fetchJson = async () => {
    throw new Error("Screen observation transport is not configured.");
  },
} = {}) {
  async function callBackend(capability) {
    if (capability.id !== CAPABILITY_ID) {
      return { handled: false, result: null };
    }
    const response = await fetchJson(`${screenSenseUrl}/screen/current`);
    return {
      handled: true,
      result: projectScreenObservation(response),
    };
  }

  function summariseResult(capability, result) {
    if (capability.id !== CAPABILITY_ID) return null;
    const summary = result?.summary ?? {};
    const governance = result?.governance ?? {};
    return {
      kind: "screen.observe",
      ok: result?.ok === true,
      readiness: summary.readiness ?? null,
      focusedWindowAvailable: summary.focusedWindowAvailable === true,
      windowCount: summary.windowCount ?? 0,
      ocrBlockCount: summary.ocrBlockCount ?? 0,
      visualFrameAvailable: summary.visualFrameAvailable === true,
      semanticTargetCount: summary.semanticTargetCount ?? 0,
      workViewStatus: summary.workViewStatus ?? null,
      workViewVisibility: summary.workViewVisibility ?? null,
      readsScreenState: governance.readsScreenState === true,
      noScreenPayload: governance.exposesFocusedWindowTitle === false
        && governance.exposesWindowTitles === false
        && governance.exposesOcrText === false
        && governance.exposesSnapshotText === false
        && governance.exposesActiveUrl === false
        && governance.exposesSessionId === false
        && governance.exposesLeaseId === false
        && governance.exposesVisualFrameBytes === false
        && governance.exposesSemanticTargetItems === false,
      noMutation: governance.mutatesScreenState === false,
      noProviderEgress: governance.callsProvider === false
        && governance.networkEgress === false,
    };
  }

  function validateRequest(capability, request) {
    if (capability.id !== CAPABILITY_ID) return null;
    const params = request.params ?? {};
    for (const flag of UNSUPPORTED_PAYLOAD_FLAGS) {
      if (params[flag] === true) {
        return `Screen observation ${flag} is not supported by the governed summary surface.`;
      }
    }
    return null;
  }

  return { callBackend, summariseResult, validateRequest };
}
