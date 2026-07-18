import { createHash } from "node:crypto";

import {
  HOSTD_ACTIVATION_CAPABILITY_ID,
} from "../../../packages/shared-systemd/src/openclaw-hostd-activation.mjs";

export const NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_REGISTRY = "openclaw-native-declarative-evolution-host-health-oracle-v0";
export const NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_OWNER = "openclaw-core-host-health-oracle";
export const NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_MAX_AGE_MS = 30_000;

const MAX_SERVICE_STATES = 32;
const MAX_ALERT_CODES = 32;

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function resolveNow(now) {
  const value = typeof now === "function" ? now() : now;
  const timestamp = typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : new Date().toISOString();
  return { timestamp, milliseconds: Date.parse(timestamp) };
}

function normaliseRequiredServices(requiredServices) {
  if (!Array.isArray(requiredServices)) return [];
  return [...new Set(requiredServices
    .filter((service) => typeof service === "string")
    .map((service) => service.trim())
    .filter(Boolean))]
    .sort()
    .slice(0, MAX_SERVICE_STATES);
}

function normaliseHealthEvidence(health, { now, maxAgeMs, requiredServices, sourceError = null } = {}) {
  const system = health?.system && typeof health.system === "object" ? health.system : null;
  const serviceEntries = Object.entries(system?.services ?? {})
    .filter(([name]) => typeof name === "string" && name.length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, MAX_SERVICE_STATES);
  const serviceStates = serviceEntries.map(([name, service]) => ({
    name,
    ok: service?.ok === true,
    status: typeof service?.status === "string" ? service.status : null,
  }));
  const serviceNames = new Set(serviceStates.map((service) => service.name));
  const alertCodes = (Array.isArray(system?.alerts) ? system.alerts : [])
    .map((alert) => typeof alert?.code === "string" ? alert.code : "unknown")
    .sort()
    .slice(0, MAX_ALERT_CODES);
  const alertCount = Array.isArray(system?.alerts) ? system.alerts.length : 0;
  const observedAt = typeof system?.timestamp === "string" ? system.timestamp : null;
  const observedMilliseconds = observedAt === null ? NaN : Date.parse(observedAt);
  const current = resolveNow(now);
  const ageMs = Number.isFinite(observedMilliseconds) ? current.milliseconds - observedMilliseconds : null;
  const required = normaliseRequiredServices(requiredServices);
  const checks = {
    healthEnvelopeOk: health?.ok === true,
    systemStatePresent: system !== null,
    observedTimestampValid: Number.isFinite(observedMilliseconds),
    observedTimestampFresh: Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= maxAgeMs,
    servicesPresent: serviceStates.length > 0,
    requiredServicesPresent: required.every((service) => serviceNames.has(service)),
    servicesHealthy: serviceStates.length > 0 && serviceStates.every((service) => service.ok),
    noActiveAlerts: alertCount === 0,
    networkOnline: system?.network?.online === true,
  };
  const structuralFailure = [
    "healthEnvelopeOk",
    "systemStatePresent",
    "observedTimestampValid",
    "observedTimestampFresh",
    "servicesPresent",
    "requiredServicesPresent",
  ].some((name) => checks[name] !== true);
  const status = sourceError || structuralFailure
    ? "unavailable"
    : checks.servicesHealthy && checks.noActiveAlerts && checks.networkOnline
      ? "healthy"
      : "degraded";
  const healthFingerprint = {
    healthEnvelopeOk: checks.healthEnvelopeOk,
    serviceStates,
    alertCodes,
    alertCount,
    networkOnline: checks.networkOnline,
    requiredServices: required,
  };
  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name);

  return {
    ok: true,
    registry: NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_REGISTRY,
    owner: NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_OWNER,
    mode: "independent_read_only_fact_evaluator",
    status,
    observedAt: observedAt ?? current.timestamp,
    ageMs,
    maxAgeMs,
    serviceCount: serviceStates.length,
    onlineServiceCount: serviceStates.filter((service) => service.ok).length,
    degradedServiceCount: serviceStates.filter((service) => !service.ok).length,
    alertCount,
    networkOnline: checks.networkOnline,
    hostHealthHash: sha256Json(healthFingerprint),
    checks,
    failedChecks,
    reason: sourceError
      ? "health_source_unavailable"
      : status === "healthy" ? null : failedChecks[0] ?? "host_health_not_healthy",
    source: {
      service: "openclaw-system-sense",
      endpoint: "/system/health",
      registry: typeof health?.system?.registry === "string" ? health.system.registry : null,
      readOnly: true,
    },
    authority: {
      health: {
        owner: NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_OWNER,
        registry: NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_REGISTRY,
        mode: "independent_evaluator",
      },
      activation: {
        owner: "openclaw-hostd",
        capabilityId: HOSTD_ACTIVATION_CAPABILITY_ID,
        mode: "fixed_peer_verified_unix_socket",
      },
      rollback: {
        owner: "deferred_manual_operator",
        mode: "manual_only",
        automatic: false,
      },
    },
    governance: {
      readsSourceHealth: true,
      sourceReadOnly: true,
      evaluatesFactsIndependently: true,
      writesManagedConfig: false,
      switchesGeneration: false,
      executesActivation: false,
      executesRollback: false,
      automaticActivation: false,
      automaticRollback: false,
      networkEgress: false,
    },
  };
}

export function assessNativeDeclarativeEvolutionHostHealth(health, options = {}) {
  return normaliseHealthEvidence(health, {
    now: options.now ?? (() => new Date().toISOString()),
    maxAgeMs: Number.isFinite(options.maxAgeMs)
      ? Math.max(0, options.maxAgeMs)
      : NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_MAX_AGE_MS,
    requiredServices: options.requiredServices,
    sourceError: options.sourceError ?? null,
  });
}

export function createNativeDeclarativeEvolutionHostHealthOracle({
  readHealth,
  now = () => new Date().toISOString(),
  maxAgeMs = NATIVE_DECLARATIVE_EVOLUTION_HOST_HEALTH_ORACLE_MAX_AGE_MS,
  requiredServices = [],
} = {}) {
  async function readHostHealth() {
    if (typeof readHealth !== "function") {
      return assessNativeDeclarativeEvolutionHostHealth({ ok: false }, {
        now,
        maxAgeMs,
        requiredServices,
        sourceError: "health_source_unavailable",
      });
    }
    try {
      return assessNativeDeclarativeEvolutionHostHealth(await readHealth(), {
        now,
        maxAgeMs,
        requiredServices,
      });
    } catch {
      return assessNativeDeclarativeEvolutionHostHealth({ ok: false }, {
        now,
        maxAgeMs,
        requiredServices,
        sourceError: "health_source_unavailable",
      });
    }
  }

  return { readHostHealth };
}
