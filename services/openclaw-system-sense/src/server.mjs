import http from "node:http";
import { randomUUID } from "node:crypto";

const host = process.env.OPENCLAW_SYSTEM_SENSE_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_SYSTEM_SENSE_PORT ?? "4106", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";

const serviceTargets = {
  core: process.env.OPENCLAW_CORE_URL ?? "http://127.0.0.1:4100",
  eventHub: process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101",
  sessionManager: process.env.OPENCLAW_SESSION_MANAGER_URL ?? "http://127.0.0.1:4102",
  browserRuntime: process.env.OPENCLAW_BROWSER_RUNTIME_URL ?? "http://127.0.0.1:4103",
  screenSense: process.env.OPENCLAW_SCREEN_SENSE_URL ?? "http://127.0.0.1:4104",
  screenAct: process.env.OPENCLAW_SCREEN_ACT_URL ?? "http://127.0.0.1:4105",
};

const systemState = {
  timestamp: new Date().toISOString(),
  services: {},
  resources: {
    cpuPercent: 12,
    memoryPercent: 28,
    diskPercent: 17,
  },
  network: {
    online: true,
  },
  alerts: [],
};

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

async function checkService(name, baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    return {
      name,
      ok: !!data.ok,
      url: baseUrl,
      detail: data.service ?? name,
    };
  } catch {
    return {
      name,
      ok: false,
      url: baseUrl,
      detail: "offline",
    };
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
      message: `${service.name} is offline`,
    }));

  systemState.timestamp = new Date().toISOString();
  systemState.services = services;
  systemState.resources = {
    cpuPercent: 12 + alerts.length,
    memoryPercent: 28 + alerts.length * 2,
    diskPercent: 17,
  };
  systemState.network = {
    online: true,
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
    await publishEvent("service.failed", {
      alerts: systemState.alerts,
      services: systemState.services,
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
