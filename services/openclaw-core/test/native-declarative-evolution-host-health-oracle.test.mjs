import test from "node:test";
import assert from "node:assert/strict";

import {
  assessNativeDeclarativeEvolutionHostHealth,
  createNativeDeclarativeEvolutionHostHealthOracle,
  NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_OWNER,
  NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_REGISTRY,
} from "../src/native-declarative-evolution-host-health-oracle.mjs";

const NOW = "2026-07-17T00:00:31.000Z";

function healthyEvidence(overrides = {}) {
  return {
    ok: true,
    system: {
      timestamp: "2026-07-17T00:00:30.000Z",
      status: "untrusted-upstream-status",
      services: {
        core: { ok: true, status: "healthy" },
        eventHub: { ok: true, status: "healthy" },
      },
      alerts: [],
      network: { online: true },
      ...overrides,
    },
  };
}

test("host health oracle evaluates bounded facts instead of trusting source status", () => {
  const result = assessNativeDeclarativeEvolutionHostHealth(healthyEvidence(), {
    now: NOW,
    requiredServices: ["core", "eventHub"],
  });

  assert.equal(result.registry, NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_REGISTRY);
  assert.equal(result.owner, NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_OWNER);
  assert.equal(result.status, "healthy");
  assert.equal(result.checks.observedTimestampFresh, true);
  assert.equal(result.checks.requiredServicesPresent, true);
  assert.equal(result.governance.evaluatesFactsIndependently, true);
  assert.equal(result.authority.health.owner, NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_OWNER);
  assert.equal(result.authority.activation.owner, "openclaw-hostd");
  assert.equal(result.authority.rollback.owner, "deferred_manual_operator");
  assert.equal(result.authority.rollback.automatic, false);
});

test("host health oracle rejects stale or incomplete evidence before activation", () => {
  const stale = assessNativeDeclarativeEvolutionHostHealth(healthyEvidence({
    timestamp: "2026-07-16T23:00:00.000Z",
  }), { now: NOW });
  const missingRequiredService = assessNativeDeclarativeEvolutionHostHealth(healthyEvidence(), {
    now: NOW,
    requiredServices: ["core", "missing-service"],
  });

  assert.equal(stale.status, "unavailable");
  assert.equal(stale.checks.observedTimestampFresh, false);
  assert.equal(stale.failedChecks.includes("observedTimestampFresh"), true);
  assert.equal(missingRequiredService.status, "unavailable");
  assert.equal(missingRequiredService.checks.requiredServicesPresent, false);
  assert.equal(missingRequiredService.failedChecks.includes("requiredServicesPresent"), true);
});

test("host health oracle reports degraded body facts without granting activation", () => {
  const result = assessNativeDeclarativeEvolutionHostHealth(healthyEvidence({
    services: {
      core: { ok: false, status: "failed" },
      eventHub: { ok: true, status: "healthy" },
    },
    alerts: [{ code: "service.offline" }],
    network: { online: false },
  }), { now: NOW });

  assert.equal(result.status, "degraded");
  assert.equal(result.checks.servicesHealthy, false);
  assert.equal(result.checks.noActiveAlerts, false);
  assert.equal(result.checks.networkOnline, false);
  assert.equal(result.governance.executesActivation, false);
  assert.equal(result.governance.executesRollback, false);
});

test("host health oracle fails closed when its source cannot be read", async () => {
  const oracle = createNativeDeclarativeEvolutionHostHealthOracle({
    readHealth: async () => {
      throw new Error("source offline");
    },
    now: () => NOW,
  });

  const result = await oracle.readHostHealth();
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "health_source_unavailable");
  assert.equal(result.governance.readsSourceHealth, true);
  assert.equal(result.governance.automaticActivation, false);
});
