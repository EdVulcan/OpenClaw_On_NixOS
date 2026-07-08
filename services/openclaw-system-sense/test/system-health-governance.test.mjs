import test from "node:test";
import assert from "node:assert/strict";

import { createSystemHealthGovernance } from "../src/system-health-governance.mjs";

test("system health governance builds read-only trend and readiness bundles", async () => {
  const systemState = {
    timestamp: "2026-01-02T03:04:05.000Z",
    services: {},
    resources: {},
    network: { online: true },
    alerts: [],
  };
  const healthSnapshots = [];
  let governance;
  governance = createSystemHealthGovernance({
    stateDir: "/state",
    diskPath: "/state",
    systemState,
    healthSnapshots,
    maxHealthTrendSnapshots: 3,
    refreshSystemState: async () => {
      systemState.timestamp = "2026-01-02T03:04:06.000Z";
      systemState.services = {
        core: {
          name: "core",
          ok: true,
          status: "healthy",
          latencyMs: 12,
        },
      };
      systemState.resources = {
        cpuPercent: 10,
        memoryPercent: 20,
        diskPercent: 30,
      };
      systemState.network = { online: true };
      systemState.alerts = [];
      governance.recordHealthSnapshot();
    },
    buildSystemdDependencyMap: async () => ({
      ok: true,
      registry: "openclaw-systemd-dependency-map-v0",
      summary: {
        nodes: 2,
        edges: 1,
        highImpact: 1,
      },
      roots: ["openclaw-event-hub.service"],
      nodes: [
        {
          unit: "openclaw-event-hub.service",
          impactClass: "foundational",
        },
      ],
    }),
  });

  const trend = await governance.buildHealthTrendSummary();
  const recommendation = await governance.buildRouteAwareNextActionRecommendation();
  const policy = await governance.buildConservativeRecoveryPolicyExplanation();
  const readiness = await governance.buildBodyGovernanceReadiness();
  const routeReview = await governance.buildPhase2RouteReview();

  assert.equal(trend.registry, "openclaw-health-trend-summary-v0");
  assert.equal(trend.summary.sampleCount, 1);
  assert.equal(trend.summary.stableServices, 1);
  assert.equal(recommendation.registry, "openclaw-route-aware-next-action-v0");
  assert.equal(recommendation.recommendation.action, "continue-observe-body-governance");
  assert.equal(policy.registry, "openclaw-conservative-recovery-policy-v0");
  assert.equal(policy.hardBoundaries.noCommandExecution, true);
  assert.equal(readiness.summary.ready, true);
  assert.equal(routeReview.decision.selectedSlice, "openclaw-phase-2-demo-control-room");
});

test("system health governance caps retained health snapshots", () => {
  const systemState = {
    timestamp: "2026-01-02T03:04:05.000Z",
    services: {},
    resources: {},
    network: { online: false },
    alerts: [],
  };
  const healthSnapshots = [];
  const governance = createSystemHealthGovernance({
    systemState,
    healthSnapshots,
    maxHealthTrendSnapshots: 2,
  });

  for (let index = 0; index < 4; index += 1) {
    systemState.timestamp = `2026-01-02T03:04:0${index}.000Z`;
    governance.recordHealthSnapshot();
  }

  assert.equal(healthSnapshots.length, 2);
  assert.equal(healthSnapshots[0].at, "2026-01-02T03:04:02.000Z");
});
