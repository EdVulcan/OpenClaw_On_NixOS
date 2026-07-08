import { statfsSync } from "node:fs";
import os from "node:os";

export function createSystemHealthGovernance({
  stateDir = process.cwd(),
  diskPath = stateDir,
  systemState,
  healthSnapshots = [],
  maxHealthTrendSnapshots = 24,
  refreshSystemState,
  buildSystemdDependencyMap,
  registries = {},
} = {}) {
  const MAX_HEALTH_TREND_SNAPSHOTS = maxHealthTrendSnapshots;
  const HEALTH_TREND_SUMMARY_REGISTRY = registries.healthTrendSummary ?? "openclaw-health-trend-summary-v0";
  const ROUTE_AWARE_NEXT_ACTION_REGISTRY = registries.routeAwareNextAction ?? "openclaw-route-aware-next-action-v0";
  const CONSERVATIVE_RECOVERY_POLICY_REGISTRY = registries.conservativeRecoveryPolicy ?? "openclaw-conservative-recovery-policy-v0";
  const BODY_GOVERNANCE_READINESS_REGISTRY = registries.bodyGovernanceReadiness ?? "openclaw-body-governance-readiness-v0";
  const PHASE_2_ROUTE_REVIEW_REGISTRY = registries.phase2RouteReview ?? "openclaw-phase-2-route-review-v0";
  let previousCpuSnapshot = null;

function readCpuSnapshot() {
  const cpus = os.cpus();
  const totals = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
    return {
      idle: acc.idle + cpu.times.idle,
      total: acc.total + total,
    };
  }, { idle: 0, total: 0 });
  return {
    ...totals,
    cores: cpus.length,
  };
}

function readCpuPercent() {
  const current = readCpuSnapshot();
  if (!previousCpuSnapshot) {
    previousCpuSnapshot = current;
    return 0;
  }

  const idleDelta = current.idle - previousCpuSnapshot.idle;
  const totalDelta = current.total - previousCpuSnapshot.total;
  previousCpuSnapshot = current;
  if (totalDelta <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100)));
}

function readDiskPercent() {
  try {
    const stats = statfsSync(diskPath);
    const total = Number(stats.blocks) * Number(stats.bsize);
    const available = Number(stats.bavail) * Number(stats.bsize);
    if (total <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(((total - available) / total) * 100)));
  } catch {
    return null;
  }
}

function buildBodyState() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    uptimeSeconds: Math.round(os.uptime()),
    processUptimeSeconds: Math.round(process.uptime()),
    pid: process.pid,
    node: process.version,
    stateDir,
    diskPath,
  };
}

function buildResourceState() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryPercent = totalMemory > 0
    ? Math.max(0, Math.min(100, Math.round(((totalMemory - freeMemory) / totalMemory) * 100)))
    : 0;
  const cpuSnapshot = readCpuSnapshot();
  const diskPercent = readDiskPercent();

  return {
    cpuPercent: readCpuPercent(),
    cpuCores: cpuSnapshot.cores,
    loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
    memoryPercent,
    memory: {
      totalBytes: totalMemory,
      freeBytes: freeMemory,
      usedBytes: Math.max(0, totalMemory - freeMemory),
    },
    diskPercent: diskPercent ?? 0,
    disk: {
      path: diskPath,
      available: diskPercent !== null,
    },
  };
}

function recordHealthSnapshot() {
  const services = Object.values(systemState.services ?? {});
  healthSnapshots.push({
    at: systemState.timestamp,
    onlineServices: services.filter((service) => service.ok).length,
    totalServices: services.length,
    alertCount: Array.isArray(systemState.alerts) ? systemState.alerts.length : 0,
    cpuPercent: systemState.resources?.cpuPercent ?? 0,
    memoryPercent: systemState.resources?.memoryPercent ?? 0,
    diskPercent: systemState.resources?.diskPercent ?? 0,
    networkOnline: systemState.network?.online === true,
    services: Object.fromEntries(services.map((service) => [
      service.name,
      {
        ok: service.ok === true,
        status: service.status ?? "unknown",
        latencyMs: service.latencyMs ?? null,
      },
    ])),
  });
  if (healthSnapshots.length > MAX_HEALTH_TREND_SNAPSHOTS) {
    healthSnapshots.splice(0, healthSnapshots.length - MAX_HEALTH_TREND_SNAPSHOTS);
  }
}

function numericTrend(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  if (numeric.length === 0) {
    return { latest: null, min: null, max: null, average: null };
  }
  const latest = numeric[numeric.length - 1];
  const total = numeric.reduce((sum, value) => sum + value, 0);
  return {
    latest,
    min: Math.min(...numeric),
    max: Math.max(...numeric),
    average: Math.round((total / numeric.length) * 10) / 10,
  };
}

function serviceTrendSummary(serviceName) {
  const samples = healthSnapshots
    .map((snapshot) => snapshot.services?.[serviceName])
    .filter(Boolean);
  const online = samples.filter((sample) => sample.ok).length;
  return {
    service: serviceName,
    samples: samples.length,
    online,
    offline: samples.length - online,
    latestStatus: samples[samples.length - 1]?.status ?? "unknown",
    latestOk: samples[samples.length - 1]?.ok ?? null,
    latencyMs: numericTrend(samples.map((sample) => sample.latencyMs)),
  };
}

async function buildHealthTrendSummary() {
  await refreshSystemState();
  const serviceNames = Object.keys(systemState.services ?? {}).sort();
  const latest = healthSnapshots[healthSnapshots.length - 1] ?? null;
  return {
    ok: true,
    registry: HEALTH_TREND_SUMMARY_REGISTRY,
    mode: "read_only_recent_snapshots",
    generatedAt: new Date().toISOString(),
    source: {
      service: "openclaw-system-sense",
      evidence: "recent_system_health_snapshots",
      snapshotLimit: MAX_HEALTH_TREND_SNAPSHOTS,
      systemHealthEndpoint: "/system/health",
    },
    governance: {
      domain: "body_internal",
      risk: "low",
      autonomy: "observe_only",
      approvalRequired: false,
      hostMutation: false,
      canMutate: false,
      executesCommand: false,
      triggersRecovery: false,
      schedulesFollowUp: false,
    },
    summary: {
      sampleCount: healthSnapshots.length,
      windowStart: healthSnapshots[0]?.at ?? null,
      windowEnd: latest?.at ?? null,
      latestOnlineServices: latest?.onlineServices ?? 0,
      latestTotalServices: latest?.totalServices ?? 0,
      latestAlertCount: latest?.alertCount ?? 0,
      networkOnlineSamples: healthSnapshots.filter((snapshot) => snapshot.networkOnline).length,
      stableServices: serviceNames.filter((name) => {
        const trend = serviceTrendSummary(name);
        return trend.samples > 0 && trend.offline === 0;
      }).length,
      degradedServices: serviceNames.filter((name) => {
        const trend = serviceTrendSummary(name);
        return trend.offline > 0;
      }).length,
    },
    resources: {
      cpuPercent: numericTrend(healthSnapshots.map((snapshot) => snapshot.cpuPercent)),
      memoryPercent: numericTrend(healthSnapshots.map((snapshot) => snapshot.memoryPercent)),
      diskPercent: numericTrend(healthSnapshots.map((snapshot) => snapshot.diskPercent)),
      alertCount: numericTrend(healthSnapshots.map((snapshot) => snapshot.alertCount)),
      onlineServices: numericTrend(healthSnapshots.map((snapshot) => snapshot.onlineServices)),
    },
    services: serviceNames.map((name) => serviceTrendSummary(name)),
    snapshots: healthSnapshots.slice(-6).map((snapshot) => ({
      at: snapshot.at,
      onlineServices: snapshot.onlineServices,
      totalServices: snapshot.totalServices,
      alertCount: snapshot.alertCount,
      cpuPercent: snapshot.cpuPercent,
      memoryPercent: snapshot.memoryPercent,
      diskPercent: snapshot.diskPercent,
      networkOnline: snapshot.networkOnline,
    })),
    next: {
      recommendedSlice: "openclaw-route-aware-next-action-recommendation",
      boundary: "recommend only from observed body evidence before creating any recovery task",
    },
  };
}

function chooseRouteAwareRecommendation(trendSummary, dependencyMap) {
  const degradedServices = (trendSummary.services ?? [])
    .filter((service) => service.offline > 0 || service.latestOk === false)
    .map((service) => service.service);
  const alertCount = trendSummary.summary?.latestAlertCount ?? 0;
  const highImpactNodes = (dependencyMap.nodes ?? [])
    .filter((node) => ["foundational", "high"].includes(node.impactClass))
    .map((node) => node.unit);

  if (degradedServices.length > 0 || alertCount > 0) {
    return {
      action: "review-degraded-body-services",
      priority: "high",
      reason: "Recent health snapshots show degraded services or active alerts; inspect dependency impact before proposing recovery.",
      targets: degradedServices,
      requiresApprovalBeforeMutation: true,
    };
  }

  return {
    action: "continue-observe-body-governance",
    priority: "normal",
    reason: "Recent health snapshots are stable; keep observing high-impact body services before recommending recovery.",
    targets: highImpactNodes,
    requiresApprovalBeforeMutation: true,
  };
}

async function buildRouteAwareNextActionRecommendation() {
  const [dependencyMap, trendSummary] = await Promise.all([
    buildSystemdDependencyMap(),
    buildHealthTrendSummary(),
  ]);
  const recommendation = chooseRouteAwareRecommendation(trendSummary, dependencyMap);

  return {
    ok: true,
    registry: ROUTE_AWARE_NEXT_ACTION_REGISTRY,
    mode: "recommendation_only",
    generatedAt: new Date().toISOString(),
    source: {
      service: "openclaw-system-sense",
      dependencyMapRegistry: dependencyMap.registry,
      healthTrendRegistry: trendSummary.registry,
      evidence: "route_aware_body_governance_recommendation",
    },
    governance: {
      domain: "body_internal",
      risk: "low",
      autonomy: "observe_and_recommend_only",
      approvalRequired: false,
      hostMutation: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
      executesCommand: false,
      triggersRecovery: false,
      schedulesFollowUp: false,
    },
    recommendation,
    evidence: {
      dependency: {
        nodes: dependencyMap.summary.nodes,
        edges: dependencyMap.summary.edges,
        highImpact: dependencyMap.summary.highImpact,
        roots: dependencyMap.roots,
      },
      health: {
        samples: trendSummary.summary.sampleCount,
        latestOnlineServices: trendSummary.summary.latestOnlineServices,
        latestTotalServices: trendSummary.summary.latestTotalServices,
        latestAlertCount: trendSummary.summary.latestAlertCount,
        stableServices: trendSummary.summary.stableServices,
        degradedServices: trendSummary.summary.degradedServices,
      },
    },
    candidates: [
      {
        id: "health-trend-summary",
        label: "Review recent body health trend",
        allowedNow: true,
        mutation: false,
      },
      {
        id: "dependency-impact-review",
        label: "Review dependency impact before recovery",
        allowedNow: true,
        mutation: false,
      },
      {
        id: "operator-reviewed-repair",
        label: "Create operator-reviewed repair task only if evidence degrades",
        allowedNow: false,
        mutation: true,
        boundary: "requires separate approved task and existing repair execution route",
      },
    ],
    next: {
      recommendedSlice: "openclaw-conservative-recovery-policy-explanation",
      boundary: "explain recovery policy before broadening recommendations into task creation",
    },
  };
}

async function buildConservativeRecoveryPolicyExplanation() {
  const routeRecommendation = await buildRouteAwareNextActionRecommendation();
  const recommendation = routeRecommendation.recommendation ?? {};
  const stableBody = recommendation.action === "continue-observe-body-governance";

  return {
    ok: true,
    registry: CONSERVATIVE_RECOVERY_POLICY_REGISTRY,
    mode: "read_only_policy_explanation",
    generatedAt: new Date().toISOString(),
    source: {
      service: "openclaw-system-sense",
      routeAwareRegistry: routeRecommendation.registry,
      dependencyMapRegistry: routeRecommendation.source?.dependencyMapRegistry ?? null,
      healthTrendRegistry: routeRecommendation.source?.healthTrendRegistry ?? null,
      existingRepairRoute: "openclaw-systemd-repair-execution-route",
      evidence: "conservative_recovery_policy_from_body_governance",
    },
    governance: {
      domain: "body_internal",
      risk: "low",
      autonomy: "explain_only",
      approvalRequired: false,
      hostMutation: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
      executesCommand: false,
      triggersRecovery: false,
      schedulesFollowUp: false,
    },
    policy: {
      name: "observe-first operator-reviewed recovery",
      summary: "OpenClaw may explain recovery choices from body evidence, but it must not create or execute recovery without a separate operator-reviewed repair route.",
      currentPosture: stableBody ? "observe" : "review_before_repair_proposal",
      currentReason: recommendation.reason ?? "No route-aware recommendation reason recorded.",
      minimumEvidence: [
        "recent health trend summary",
        "OpenClaw-owned systemd dependency impact",
        "Observer-visible repair plan or dry-run before host mutation",
        "explicit operator approval before real restart",
        "post-execution body-state verification after real repair",
      ],
    },
    rules: [
      {
        id: "stable-body-observe",
        condition: "Health trends are stable and no current body alerts are present.",
        allowedAction: "continue observing body governance evidence",
        mutation: false,
        createsTask: false,
      },
      {
        id: "degraded-body-review",
        condition: "A service is degraded or body alerts are present.",
        allowedAction: "review health trend and dependency impact evidence",
        mutation: false,
        createsTask: false,
      },
      {
        id: "repair-proposal-gate",
        condition: "A concrete OpenClaw-owned service remains degraded after review.",
        allowedAction: "use the existing operator-reviewed repair route in a separate task",
        mutation: true,
        createsTask: false,
        boundary: "this endpoint explains the gate only; it does not create approval, task, command, or recovery",
      },
    ],
    routeState: {
      action: recommendation.action ?? "unknown",
      priority: recommendation.priority ?? "unknown",
      targets: recommendation.targets ?? [],
      dependencyNodes: routeRecommendation.evidence?.dependency?.nodes ?? 0,
      highImpactNodes: routeRecommendation.evidence?.dependency?.highImpact ?? 0,
      healthSamples: routeRecommendation.evidence?.health?.samples ?? 0,
      degradedServices: routeRecommendation.evidence?.health?.degradedServices ?? 0,
      latestAlertCount: routeRecommendation.evidence?.health?.latestAlertCount ?? 0,
    },
    hardBoundaries: {
      noAutomaticRepair: true,
      noTaskCreation: true,
      noApprovalCreation: true,
      noCommandExecution: true,
      noHostMutation: true,
      noScheduler: true,
      noPersistenceHardening: true,
      noDenialRecoveryLoop: true,
      noPluginRuntimeWork: true,
    },
    next: {
      recommendedSlice: "openclaw-body-governance-readiness",
      boundary: "close Track C with a read-only body governance readiness bundle before broadening recovery actions",
    },
  };
}

async function buildBodyGovernanceReadiness() {
  const recoveryPolicy = await buildConservativeRecoveryPolicyExplanation();
  const routeState = recoveryPolicy.routeState ?? {};
  const checks = [
    {
      id: "dependency-map",
      label: "OpenClaw body service dependency map is available",
      passed: routeState.dependencyNodes > 0,
      evidence: recoveryPolicy.source?.dependencyMapRegistry ?? null,
    },
    {
      id: "health-trends",
      label: "Recent OpenClaw body health trend samples are available",
      passed: routeState.healthSamples > 0,
      evidence: recoveryPolicy.source?.healthTrendRegistry ?? null,
    },
    {
      id: "route-aware-recommendation",
      label: "Route-aware next-action recommendation is available",
      passed: recoveryPolicy.source?.routeAwareRegistry === ROUTE_AWARE_NEXT_ACTION_REGISTRY,
      evidence: recoveryPolicy.source?.routeAwareRegistry ?? null,
    },
    {
      id: "conservative-policy",
      label: "Conservative recovery policy explanation is available",
      passed: recoveryPolicy.registry === CONSERVATIVE_RECOVERY_POLICY_REGISTRY,
      evidence: recoveryPolicy.registry,
    },
    {
      id: "no-hidden-execution",
      label: "Body governance bundle remains read-only and non-executing",
      passed: recoveryPolicy.governance?.createsTask === false
        && recoveryPolicy.governance?.executesCommand === false
        && recoveryPolicy.governance?.hostMutation === false
        && recoveryPolicy.hardBoundaries?.noAutomaticRepair === true,
      evidence: "hard_boundaries",
    },
  ];
  const passedChecks = checks.filter((check) => check.passed).length;
  const ready = passedChecks === checks.length;

  return {
    ok: true,
    registry: BODY_GOVERNANCE_READINESS_REGISTRY,
    mode: "read_only_track_c_readiness",
    generatedAt: new Date().toISOString(),
    source: {
      service: "openclaw-system-sense",
      dependencyMapRegistry: recoveryPolicy.source?.dependencyMapRegistry ?? null,
      healthTrendRegistry: recoveryPolicy.source?.healthTrendRegistry ?? null,
      routeAwareRegistry: recoveryPolicy.source?.routeAwareRegistry ?? null,
      recoveryPolicyRegistry: recoveryPolicy.registry,
      evidence: "track_c_body_governance_readiness_bundle",
    },
    governance: {
      domain: "body_internal",
      risk: "low",
      autonomy: "readiness_report_only",
      approvalRequired: false,
      hostMutation: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
      executesCommand: false,
      triggersRecovery: false,
      schedulesFollowUp: false,
    },
    summary: {
      ready,
      passedChecks,
      totalChecks: checks.length,
      currentPosture: recoveryPolicy.policy?.currentPosture ?? "unknown",
      routeAction: routeState.action ?? "unknown",
      routePriority: routeState.priority ?? "unknown",
      degradedServices: routeState.degradedServices ?? 0,
      latestAlertCount: routeState.latestAlertCount ?? 0,
    },
    checks,
    evidence: {
      dependencyNodes: routeState.dependencyNodes ?? 0,
      highImpactNodes: routeState.highImpactNodes ?? 0,
      healthSamples: routeState.healthSamples ?? 0,
      policyRules: recoveryPolicy.rules?.length ?? 0,
      hardBoundaries: recoveryPolicy.hardBoundaries,
    },
    completedTrack: {
      id: "phase-2-track-c-body-governance",
      name: "Body Governance Enhancement",
      completedSlices: [
        "openclaw-body-service-dependency-map",
        "openclaw-health-trend-summary",
        "openclaw-route-aware-next-action-recommendation",
        "openclaw-conservative-recovery-policy-explanation",
      ],
      completionClaim: ready ? "track_c_readiness_bundle_passed" : "track_c_readiness_incomplete",
    },
    next: {
      recommendedSlice: "openclaw-phase-2-route-review",
      boundary: "review whitepaper route before opening the next Phase 2 body capability block",
    },
  };
}

async function buildPhase2RouteReview() {
  const bodyGovernance = await buildBodyGovernanceReadiness();
  const trackCReady = bodyGovernance.summary?.ready === true;
  const candidates = [
    {
      track: "Track B",
      id: "operator-observer-demo-experience",
      label: "Operator/Observer demo control room",
      score: trackCReady ? 95 : 70,
      recommended: true,
      reason: "Track A has a real repair demo path and Track C now explains body governance; the next whitepaper-aligned gain is a clearer operator demo surface.",
      firstSlice: "openclaw-phase-2-demo-control-room",
      mutation: false,
    },
    {
      track: "Track A",
      id: "real-systemd-repair-semantics",
      label: "Broader real repair semantics",
      score: 75,
      recommended: false,
      reason: "The first real repair loop is already demoable; broadening repair actions should wait until the operator demo surface is easier to run and audit.",
      firstSlice: "defer-broader-repair-mutations",
      mutation: true,
    },
    {
      track: "Deferred Track",
      id: "plugin-runtime-adapter",
      label: "Plugin/runtime adapter work",
      score: 20,
      recommended: false,
      reason: "The whitepaper route keeps plugin/runtime work deferred unless it directly unlocks a visible body capability.",
      firstSlice: "defer-plugin-runtime-adapter",
      mutation: false,
    },
  ];

  return {
    ok: true,
    registry: PHASE_2_ROUTE_REVIEW_REGISTRY,
    mode: "read_only_route_selection",
    generatedAt: new Date().toISOString(),
    source: {
      service: "openclaw-system-sense",
      bodyGovernanceReadinessRegistry: bodyGovernance.registry,
      phase2Plan: "docs/plans/OPENCLAW_PHASE_2_PLAN.md",
      evidence: "whitepaper_aligned_phase_2_route_review",
    },
    governance: {
      domain: "body_internal",
      risk: "low",
      autonomy: "route_selection_only",
      approvalRequired: false,
      hostMutation: false,
      canMutate: false,
      createsTask: false,
      createsApproval: false,
      executesCommand: false,
      triggersRecovery: false,
      schedulesFollowUp: false,
    },
    decision: {
      selectedTrack: "Track B: Operator/Observer Demo Experience",
      selectedSlice: "openclaw-phase-2-demo-control-room",
      status: trackCReady ? "selected" : "blocked_until_track_c_ready",
      rationale: "Complete a human-runnable body demo surface before expanding mutation scope or reopening plugin/runtime adapter work.",
      notSelected: [
        "no safety-boundary hardening loop",
        "no denial recovery or duplicate-click work",
        "no persistence hardening",
        "no plugin/runtime adapter work",
        "no broader host mutation",
      ],
    },
    evidence: {
      trackCReady,
      trackCChecks: `${bodyGovernance.summary?.passedChecks ?? 0}/${bodyGovernance.summary?.totalChecks ?? 0}`,
      completedTrack: bodyGovernance.completedTrack,
      bodyGovernanceNext: bodyGovernance.next?.recommendedSlice ?? null,
      routePriorityOrder: [
        "real-systemd-repair-semantics",
        "operator-observer-demo-experience",
        "body-governance-enhancement",
        "plugin-runtime-adapter-deferred",
      ],
    },
    candidates,
    next: {
      recommendedSlice: "openclaw-phase-2-demo-control-room",
      boundary: "build a read-only operator demo control surface from existing Track A and Track C evidence before adding new autonomy",
    },
  };
}


  return {
    buildBodyState,
    buildResourceState,
    recordHealthSnapshot,
    buildHealthTrendSummary,
    buildRouteAwareNextActionRecommendation,
    buildConservativeRecoveryPolicyExplanation,
    buildBodyGovernanceReadiness,
    buildPhase2RouteReview,
  };
}
