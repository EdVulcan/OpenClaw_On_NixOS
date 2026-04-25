import http from "node:http";
import { randomUUID } from "node:crypto";

const host = process.env.OPENCLAW_SESSION_MANAGER_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_SESSION_MANAGER_PORT ?? "4102", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";
const startDelayMs = Number.parseInt(process.env.OPENCLAW_SESSION_START_DELAY_MS ?? "0", 10);

const sessionState = {
  sessionId: null,
  status: "stopped",
  displayTarget: "workspace-2",
  createdAt: null,
  updatedAt: new Date().toISOString(),
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

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

function serialiseSessionState() {
  return { ...sessionState };
}

function updateSessionState(patch) {
  Object.assign(sessionState, patch, {
    updatedAt: new Date().toISOString(),
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function publishEvent(type, payload = {}) {
  try {
    await fetch(`${eventHubUrl}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        source: "openclaw-session-manager",
        payload,
      }),
    });
  } catch (error) {
    console.error("Failed to publish session manager event:", error);
  }
}

async function startSession(displayTarget) {
  if (startDelayMs > 0) {
    await sleep(startDelayMs);
  }

  const now = new Date().toISOString();
  updateSessionState({
    sessionId: randomUUID(),
    status: "running",
    displayTarget,
    createdAt: now,
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "openclaw-session-manager",
      stage: "active",
      host,
      port,
      eventHubUrl,
      startDelayMs,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/session/state") {
    sendJson(res, 200, {
      ok: true,
      session: serialiseSessionState(),
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/session/start") {
    try {
      const body = await readJsonBody(req);
      const displayTarget =
        typeof body.displayTarget === "string" && body.displayTarget.trim()
          ? body.displayTarget.trim()
          : "workspace-2";

      if (sessionState.status === "running") {
        sendJson(res, 200, {
          ok: true,
          reused: true,
          session: serialiseSessionState(),
        });
        return;
      }

      await startSession(displayTarget);
      const session = serialiseSessionState();
      await publishEvent("service.started", {
        service: "openclaw-session-manager",
        session,
      });
      sendJson(res, 201, { ok: true, reused: false, session });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/session/restart") {
    try {
      const body = await readJsonBody(req);
      const displayTarget =
        typeof body.displayTarget === "string" && body.displayTarget.trim()
          ? body.displayTarget.trim()
          : sessionState.displayTarget;

      await startSession(displayTarget);
      const session = serialiseSessionState();
      await publishEvent("service.started", {
        service: "openclaw-session-manager",
        restarted: true,
        session,
      });
      sendJson(res, 200, { ok: true, restarted: true, session });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "Route not found." });
});

server.listen(port, host, async () => {
  console.log(`openclaw-session-manager listening on http://${host}:${port}`);
  await publishEvent("service.started", {
    service: "openclaw-session-manager",
    url: `http://${host}:${port}`,
  });
});
