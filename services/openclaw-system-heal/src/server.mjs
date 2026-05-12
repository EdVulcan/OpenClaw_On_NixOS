import http from "node:http";
import { randomUUID } from "node:crypto";

const host = process.env.OPENCLAW_SYSTEM_HEAL_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_SYSTEM_HEAL_PORT ?? "4107", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";
const systemSenseUrl = process.env.OPENCLAW_SYSTEM_SENSE_URL ?? "http://127.0.0.1:4106";

const healHistory = [];
let latestDiagnosis = null;

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
  while (healHistory.length > 50) {
    healHistory.pop();
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
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/heal/state") {
    sendJson(res, 200, {
      ok: true,
      engine: "heal-v0",
      mode: "conservative-simulated",
      latestDiagnosis,
      historyCount: healHistory.length,
      capabilities: {
        diagnose: true,
        autoFix: true,
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

server.listen(port, host, async () => {
  console.log(`openclaw-system-heal listening on http://${host}:${port}`);
  await publishEvent("service.started", {
    service: "openclaw-system-heal",
    url: `http://${host}:${port}`,
  });
});
