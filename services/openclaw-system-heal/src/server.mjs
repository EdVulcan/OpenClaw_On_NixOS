import http from "node:http";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const host = process.env.OPENCLAW_SYSTEM_HEAL_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_SYSTEM_HEAL_PORT ?? "4107", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";
const systemSenseUrl = process.env.OPENCLAW_SYSTEM_SENSE_URL ?? "http://127.0.0.1:4106";
const stateFilePath = process.env.OPENCLAW_SYSTEM_HEAL_STATE_FILE
  ?? path.resolve(process.cwd(), "../../.artifacts/openclaw-system-heal-state.json");

const healHistory = [];
const maintenanceRuns = [];
let latestDiagnosis = null;
let latestMaintenanceRun = null;
const MAX_HEAL_HISTORY = 100;
const MAX_MAINTENANCE_RUNS = 100;

function corsHeaders(extraHeaders = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    ...extraHeaders,
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, corsHeaders({ "content-type": "application/json; charset=utf-8" }));
  res.end(JSON.stringify(payload, null, 2));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function publishEvent(type, payload = {}) {
  try {
    await fetch(`${eventHubUrl}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        source: "openclaw-system-heal",
        payload,
      }),
    });
  } catch (error) {
    console.error("Failed to publish system-heal event:", error);
  }
}

function addHistory(entry) {
  healHistory.unshift(entry);
  while (healHistory.length > MAX_HEAL_HISTORY) {
    healHistory.pop();
  }
  persistState();
}

function addMaintenanceRun(run) {
  latestMaintenanceRun = run;
  maintenanceRuns.unshift(run);
  while (maintenanceRuns.length > MAX_MAINTENANCE_RUNS) {
    maintenanceRuns.pop();
  }
  persistState();
}

function persistState() {
  try {
    mkdirSync(path.dirname(stateFilePath), { recursive: true });
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      latestDiagnosis,
      latestMaintenanceRun,
      healHistory,
      maintenanceRuns,
    };
    const tempPath = `${stateFilePath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    renameSync(tempPath, stateFilePath);
  } catch (error) {
    console.error("Failed to persist system-heal state:", error);
  }
}

function loadPersistentState() {
  if (!existsSync(stateFilePath)) {
    return;
  }

  try {
    const data = JSON.parse(readFileSync(stateFilePath, "utf8"));
    latestDiagnosis = data?.latestDiagnosis && typeof data.latestDiagnosis === "object"
      ? data.latestDiagnosis
      : null;
    latestMaintenanceRun = data?.latestMaintenanceRun && typeof data.latestMaintenanceRun === "object"
      ? data.latestMaintenanceRun
      : null;
    if (Array.isArray(data?.healHistory)) {
      healHistory.splice(0, healHistory.length, ...data.healHistory.slice(0, MAX_HEAL_HISTORY));
    }
    if (Array.isArray(data?.maintenanceRuns)) {
      maintenanceRuns.splice(0, maintenanceRuns.length, ...data.maintenanceRuns.slice(0, MAX_MAINTENANCE_RUNS));
    }
  } catch (error) {
    console.error("Failed to load persisted system-heal state:", error);
  }
}

async function fetchSystemHealth() {
  const response = await fetch(`${systemSenseUrl}/system/health`);
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false || !data?.system) {
    throw new Error(data?.error ?? "Unable to read system health.");
  }
  return data.system;
}

function getSystemFromBody(body) {
  if (body?.system && typeof body.system === "object") {
    return body.system;
  }
  return null;
}

function buildHealStep({ kind, service = null, reason, risk = "low", mode = "simulated", evidence = null }) {
  return {
    id: randomUUID(),
    kind,
    service,
    reason,
    risk,
    mode,
    evidence,
    status: "planned",
  };
}

function buildDiagnosis(system, options = {}) {
  const now = new Date().toISOString();
  const services = Object.values(system?.services ?? {});
  const alerts = Array.isArray(system?.alerts) ? system.alerts : [];
  const steps = [];

  for (const service of services.filter((candidate) => candidate && candidate.ok === false)) {
    steps.push(buildHealStep({
      kind: "restart-service",
      service: service.name,
      reason: `${service.name} reported ${service.status ?? "unhealthy"}`,
      risk: "medium",
      mode: options.mode ?? "simulated",
      evidence: {
        url: service.url ?? null,
        status: service.status ?? null,
        latencyMs: service.latencyMs ?? null,
        checkedAt: service.checkedAt ?? null,
      },
    }));
  }

  for (const alert of alerts) {
    if (alert?.code === "resource.memory.high" || alert?.code === "resource.disk.high") {
      steps.push(buildHealStep({
        kind: "observe-only",
        service: null,
        reason: alert.message,
        risk: "high",
        mode: "audit_only",
        evidence: alert,
      }));
    }
  }

  const status = steps.some((step) => step.kind === "restart-service")
    ? "repairable"
    : steps.length > 0
      ? "attention_required"
      : "healthy";

  return {
    id: randomUUID(),
    at: now,
    engine: "heal-v0",
    status,
    source: {
      timestamp: system?.timestamp ?? null,
      hostname: system?.body?.hostname ?? null,
      alerts: alerts.length,
      services: services.length,
    },
    plan: {
      mode: options.mode ?? "simulated",
      stepCount: steps.length,
      steps,
    },
  };
}

async function buildDiagnosisFromRequest(body = {}) {
  const system = getSystemFromBody(body) ?? await fetchSystemHealth();
  const diagnosis = buildDiagnosis(system, {
    mode: typeof body.mode === "string" && body.mode.trim() ? body.mode.trim() : "simulated",
  });
  latestDiagnosis = diagnosis;
  persistState();
  return diagnosis;
}

async function executeHealStep(step) {
  const now = new Date().toISOString();
  const entry = {
    id: randomUUID(),
    action: step.kind,
    service: step.service,
    status: step.kind === "observe-only" ? "skipped" : "completed",
    mode: step.mode ?? "simulated",
    reason: step.reason,
    risk: step.risk,
    evidence: step.evidence ?? null,
    startedAt: now,
    completedAt: new Date().toISOString(),
  };

  await publishEvent("heal.started", { entry, step });
  addHistory(entry);
  await publishEvent("heal.completed", { entry, step });
  return entry;
}

function shouldAutofix(body = {}) {
  return body.autofix !== false && body.autoFix !== false && body.diagnoseOnly !== true;
}

function summariseMaintenanceStatus(diagnosis, entries, autofix) {
  if (diagnosis.status === "healthy") {
    return "healthy";
  }
  if (entries.some((entry) => entry.status === "completed")) {
    return "repaired";
  }
  if (!autofix) {
    return "diagnosed";
  }
  return "attention_required";
}

async function runMaintenance(body = {}) {
  const startedAt = new Date().toISOString();
  const autofix = shouldAutofix(body);
  const diagnosis = await buildDiagnosisFromRequest(body);
  const entries = [];

  await publishEvent("maintenance.started", {
    diagnosis,
    autofix,
    governance: "body_internal_audit",
  });

  if (autofix) {
    const executableSteps = diagnosis.plan.steps.filter((step) => step.kind === "restart-service");
    const skippedSteps = diagnosis.plan.steps.filter((step) => step.kind !== "restart-service");
    for (const step of executableSteps) {
      entries.push(await executeHealStep(step));
    }
    for (const step of skippedSteps) {
      entries.push(await executeHealStep(step));
    }
  }

  const run = {
    id: randomUUID(),
    engine: "maintenance-v0",
    status: summariseMaintenanceStatus(diagnosis, entries, autofix),
    autonomy: {
      domain: "body_internal",
      governance: "audit_only",
      approvalRequired: false,
      mode: "conservative",
    },
    autofix,
    diagnosis,
    executed: entries.filter((entry) => entry.status === "completed"),
    skipped: entries.filter((entry) => entry.status !== "completed"),
    startedAt,
    completedAt: new Date().toISOString(),
  };
  addMaintenanceRun(run);

  await publishEvent("maintenance.completed", { run });
  return run;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "openclaw-system-heal",
      stage: "active",
      host,
      port,
      systemSenseUrl,
      stateFilePath,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/heal/state") {
    sendJson(res, 200, {
      ok: true,
      engine: "heal-v0",
      mode: "conservative-simulated",
      latestDiagnosis,
      latestMaintenanceRun,
      historyCount: healHistory.length,
      maintenanceCount: maintenanceRuns.length,
      capabilities: {
        diagnose: true,
        autoFix: true,
        maintenance: true,
        persistentLedger: true,
        restartService: "simulated",
        observeOnlyForHighRisk: true,
      },
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/heal/history") {
    sendJson(res, 200, {
      ok: true,
      items: healHistory,
      count: healHistory.length,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/maintenance/state") {
    sendJson(res, 200, {
      ok: true,
      engine: "maintenance-v0",
      mode: "body-internal-conservative",
      stateFilePath,
      latestRun: latestMaintenanceRun,
      runCount: maintenanceRuns.length,
      healHistoryCount: healHistory.length,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/maintenance/history") {
    const limit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "20", 10);
    const safeLimit = Number.isNaN(limit) ? 20 : Math.max(1, Math.min(limit, 100));
    sendJson(res, 200, {
      ok: true,
      items: maintenanceRuns.slice(0, safeLimit),
      count: maintenanceRuns.length,
      latestRun: latestMaintenanceRun,
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/maintenance/run") {
    try {
      const body = await readJsonBody(req);
      const run = await runMaintenance(body);
      sendJson(res, 200, {
        ok: true,
        run,
        historyCount: healHistory.length,
        maintenanceCount: maintenanceRuns.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/heal/diagnose") {
    try {
      const body = await readJsonBody(req);
      const diagnosis = await buildDiagnosisFromRequest(body);
      await publishEvent("heal.diagnosed", { diagnosis });
      sendJson(res, 200, {
        ok: true,
        diagnosis,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/heal/autofix") {
    try {
      const body = await readJsonBody(req);
      const diagnosis = await buildDiagnosisFromRequest(body);
      const executableSteps = diagnosis.plan.steps.filter((step) => step.kind === "restart-service");
      const skippedSteps = diagnosis.plan.steps.filter((step) => step.kind !== "restart-service");
      const entries = [];

      for (const step of executableSteps) {
        entries.push(await executeHealStep(step));
      }
      for (const step of skippedSteps) {
        entries.push(await executeHealStep(step));
      }

      sendJson(res, 200, {
        ok: true,
        diagnosis,
        executed: entries.filter((entry) => entry.status === "completed"),
        skipped: entries.filter((entry) => entry.status !== "completed"),
        historyCount: healHistory.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/heal/restart-service") {
    try {
      const body = await readJsonBody(req);
      const service = typeof body.service === "string" && body.service.trim() ? body.service.trim() : null;
      if (!service) {
        sendJson(res, 400, { ok: false, error: "service is required." });
        return;
      }

      const entry = {
        id: randomUUID(),
        action: "restart-service",
        service,
        status: "completed",
        mode: "simulated",
        reason: "Manual restart-service request",
        risk: "medium",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      await publishEvent("heal.started", { entry });
      addHistory(entry);
      await publishEvent("heal.completed", { entry });
      sendJson(res, 200, { ok: true, entry });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "Route not found." });
});

loadPersistentState();

server.listen(port, host, async () => {
  console.log(`openclaw-system-heal listening on http://${host}:${port}`);
  await publishEvent("service.started", {
    service: "openclaw-system-heal",
    url: `http://${host}:${port}`,
  });
});
