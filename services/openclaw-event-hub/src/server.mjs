import http from "node:http";
import { randomUUID } from "node:crypto";

const host = process.env.OPENCLAW_EVENT_HUB_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_EVENT_HUB_PORT ?? "4101", 10);
const maxRecentEvents = Number.parseInt(process.env.OPENCLAW_EVENT_HUB_MAX_RECENT ?? "200", 10);

const recentEvents = [];
const streamClients = new Map();

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

function normaliseEvent(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Event payload must be an object.");
  }

  const type = typeof input.type === "string" && input.type.trim() ? input.type.trim() : null;
  if (!type) {
    throw new Error("Event type is required.");
  }

  const source =
    typeof input.source === "string" && input.source.trim()
      ? input.source.trim()
      : "unknown-source";

  const payload =
    input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
      ? input.payload
      : {};

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : randomUUID(),
    type,
    source,
    timestamp:
      typeof input.timestamp === "string" && input.timestamp.trim()
        ? input.timestamp.trim()
        : new Date().toISOString(),
    payload,
  };
}

function publishEvent(event) {
  recentEvents.push(event);
  if (recentEvents.length > maxRecentEvents) {
    recentEvents.splice(0, recentEvents.length - maxRecentEvents);
  }

  const frame = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const res of streamClients.values()) {
    res.write(frame);
  }
}

function handleSse(req, res) {
  const clientId = randomUUID();

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  res.write(`event: ready\ndata: ${JSON.stringify({ clientId })}\n\n`);

  streamClients.set(clientId, res);

  req.on("close", () => {
    streamClients.delete(clientId);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "openclaw-event-hub",
      stage: "active",
      host,
      port,
      recentEventCount: recentEvents.length,
      streamClientCount: streamClients.size,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/events/recent") {
    sendJson(res, 200, {
      items: recentEvents,
      count: recentEvents.length,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/events/stream") {
    handleSse(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/events") {
    try {
      const body = await readJsonBody(req);
      const event = normaliseEvent(body);
      publishEvent(event);
      sendJson(res, 201, { ok: true, event });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "Route not found." });
});

server.listen(port, host, () => {
  console.log(`openclaw-event-hub listening on http://${host}:${port}`);
});
