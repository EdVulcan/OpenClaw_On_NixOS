import http from "node:http";
import { randomUUID } from "node:crypto";
import { statfsSync } from "node:fs";
import os from "node:os";

const host = process.env.OPENCLAW_SYSTEM_SENSE_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_SYSTEM_SENSE_PORT ?? "4106", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";
const stateDir = process.env.OPENCLAW_BODY_STATE_DIR ?? process.cwd();
const diskPath = process.env.OPENCLAW_SYSTEM_SENSE_DISK_PATH ?? stateDir;
const memoryWarningPercent = Number.parseInt(process.env.OPENCLAW_SYSTEM_MEMORY_WARNING_PERCENT ?? "90", 10);
const diskWarningPercent = Number.parseInt(process.env.OPENCLAW_SYSTEM_DISK_WARNING_PERCENT ?? "90", 10);
const serviceTimeoutMs = Number.parseInt(process.env.OPENCLAW_SYSTEM_SERVICE_TIMEOUT_MS ?? "1500", 10);

const serviceTargets = {
  core: process.env.OPENCLAW_CORE_URL ?? "http://127.0.0.1:4100",
  eventHub: process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101",
  sessionManager: process.env.OPENCLAW_SESSION_MANAGER_URL ?? "http://127.0.0.1:4102",
  browserRuntime: process.env.OPENCLAW_BROWSER_RUNTIME_URL ?? "http://127.0.0.1:4103",
  screenSense: process.env.OPENCLAW_SCREEN_SENSE_URL ?? "http://127.0.0.1:4104",
  screenAct: process.env.OPENCLAW_SCREEN_ACT_URL ?? "http://127.0.0.1:4105",
  systemHeal: process.env.OPENCLAW_SYSTEM_HEAL_URL ?? "http://127.0.0.1:4107",
};

const systemState = {
  timestamp: new Date().toISOString(),
  body: {},
  services: {},
  resources: {
    cpuPercent: 0,
    loadAverage: [],
    memoryPercent: 0,
    diskPercent: 0,
  },
  network: {
    online: false,
  },
  alerts: [],
};

let previousCpuSnapshot = null;

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

async function publishEvent(type, payload = {}) {
  try {
    await fetch(`${eventHubUrl}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        source: "openclaw-system-sense",
        payload,
      }),
    });
  } catch (error) {
    console.error("Failed to publish system-sense event:", error);
  }
}

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

async function checkService(name, baseUrl) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serviceTimeoutMs);
  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    return {
      name,
      ok: response.ok && !!data?.ok,
      status: response.ok && !!data?.ok ? "healthy" : "unhealthy",
      url: baseUrl,
      detail: data?.service ?? name,
      stage: data?.stage ?? null,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      name,
      ok: false,
      status: "offline",
      url: baseUrl,
      detail: "offline",
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshSystemState() {
  const entries = await Promise.all(
    Object.entries(serviceTargets).map(async ([name, url]) => [name, await checkService(name, url)]),
  );

  const services = Object.fromEntries(entries);
  const alerts = Object.values(services)
    .filter((service) => !service.ok)
    .map((service) => ({
      id: `alert-${randomUUID()}`,
      level: "warning",
      code: "service.offline",
      source: service.name,
      message: `${service.name} is offline`,
    }));
  const resources = buildResourceState();

  if (resources.memoryPercent >= memoryWarningPercent) {
    alerts.push({
      id: `alert-${randomUUID()}`,
      level: "warning",
      code: "resource.memory.high",
      source: "openclaw-system-sense",
      message: `Memory usage is ${resources.memoryPercent}%`,
    });
  }

  if (resources.disk.available && resources.diskPercent >= diskWarningPercent) {
    alerts.push({
      id: `alert-${randomUUID()}`,
      level: "warning",
      code: "resource.disk.high",
      source: "openclaw-system-sense",
      message: `Disk usage is ${resources.diskPercent}% at ${diskPath}`,
    });
  }

  systemState.timestamp = new Date().toISOString();
  systemState.body = buildBodyState();
  systemState.services = services;
  systemState.resources = resources;
  systemState.network = {
    online: Object.values(services).some((service) => service.ok),
    checkedTargets: Object.keys(serviceTargets).length,
  };
  systemState.alerts = alerts;
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
      service: "openclaw-system-sense",
      stage: "active",
      host,
      port,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/health") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      system: { ...systemState },
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/body") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      body: systemState.body,
      resources: systemState.resources,
      network: systemState.network,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/services") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      services: systemState.services,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/alerts") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      alerts: systemState.alerts,
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/system/refresh") {
    await refreshSystemState();
    await publishEvent(systemState.alerts.length > 0 ? "service.failed" : "system.updated", {
      alerts: systemState.alerts,
      services: systemState.services,
      resources: systemState.resources,
      body: systemState.body,
    });
    sendJson(res, 200, {
      ok: true,
      system: { ...systemState },
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Route not found." });
});

server.listen(port, host, async () => {
  console.log(`openclaw-system-sense listening on http://${host}:${port}`);
  await publishEvent("service.started", {
    service: "openclaw-system-sense",
    url: `http://${host}:${port}`,
  });
});
