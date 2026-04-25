import http from "node:http";
import { randomUUID } from "node:crypto";

const host = process.env.OPENCLAW_SYSTEM_HEAL_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_SYSTEM_HEAL_PORT ?? "4107", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";

const healHistory = [];

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
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
  while (healHistory.length > 20) {
    healHistory.pop();
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "openclaw-system-heal",
      stage: "active",
      host,
      port,
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
