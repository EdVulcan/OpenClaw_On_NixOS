import http from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const host = process.env.OPENCLAW_EVENT_HUB_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_EVENT_HUB_PORT ?? "4101", 10);
const maxRecentEvents = Number.parseInt(process.env.OPENCLAW_EVENT_HUB_MAX_RECENT ?? "200", 10);
const bodyStateDir = process.env.OPENCLAW_BODY_STATE_DIR;
const auditLogFile =
  process.env.OPENCLAW_EVENT_LOG_FILE
  ?? (bodyStateDir ? path.join(bodyStateDir, "openclaw-events.jsonl") : path.resolve(".artifacts", "openclaw-events.jsonl"));
const maxAuditQueryLimit = Number.parseInt(process.env.OPENCLAW_EVENT_AUDIT_MAX_LIMIT ?? "1000", 10);

const recentEvents = [];
const streamClients = new Map();

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

function ensureAuditLogReady() {
  fs.mkdirSync(path.dirname(auditLogFile), { recursive: true });
  if (!fs.existsSync(auditLogFile)) {
    fs.writeFileSync(auditLogFile, "", "utf8");
  }
}

function safeParseAuditLine(line) {
  if (!line.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(line);
    if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readAuditEvents({ type = null, source = null, limit = 100 } = {}) {
  ensureAuditLogReady();
  const safeLimit = Math.max(1, Math.min(limit, maxAuditQueryLimit));
  const text = fs.readFileSync(auditLogFile, "utf8");
  const items = [];

  for (const line of text.split(/\r?\n/)) {
    const event = safeParseAuditLine(line);
    if (!event) {
      continue;
    }
    if (type && event.type !== type) {
      continue;
    }
    if (source && event.source !== source) {
      continue;
    }
    items.push(event);
  }

  return items.slice(-safeLimit);
}

function buildAuditSummary() {
  ensureAuditLogReady();
  const text = fs.readFileSync(auditLogFile, "utf8");
  const byType = {};
  const bySource = {};
  let total = 0;
  let malformed = 0;
  let earliestTimestamp = null;
  let latestTimestamp = null;

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const event = safeParseAuditLine(line);
    if (!event) {
      malformed += 1;
      continue;
    }

    total += 1;
    byType[event.type] = (byType[event.type] ?? 0) + 1;
    bySource[event.source] = (bySource[event.source] ?? 0) + 1;

    if (typeof event.timestamp === "string" && event.timestamp) {
      earliestTimestamp = earliestTimestamp ?? event.timestamp;
      latestTimestamp = event.timestamp;
    }
  }

  return {
    logFile: auditLogFile,
    total,
    malformed,
    byType,
    bySource,
    earliestTimestamp,
    latestTimestamp,
    recentEventCount: recentEvents.length,
    maxQueryLimit: maxAuditQueryLimit,
  };
}

function appendAuditEvent(event) {
  ensureAuditLogReady();
  fs.appendFileSync(auditLogFile, `${JSON.stringify(event)}\n`, "utf8");
}

function hydrateRecentEventsFromAuditLog() {
  try {
    for (const event of readAuditEvents({ limit: maxRecentEvents })) {
      recentEvents.push(event);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`Unable to hydrate recent events from audit log: ${message}`);
  }
}

function publishEvent(event) {
  appendAuditEvent(event);

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

  res.writeHead(200, corsHeaders({
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  }));
  res.write(`event: ready\ndata: ${JSON.stringify({ clientId })}\n\n`);

  streamClients.set(clientId, res);

  req.on("close", () => {
    streamClients.delete(clientId);
  });
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
      service: "openclaw-event-hub",
      stage: "active",
      host,
      port,
      recentEventCount: recentEvents.length,
      streamClientCount: streamClients.size,
      auditLogFile,
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

  if (req.method === "GET" && requestUrl.pathname === "/events/audit") {
    const limit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "100", 10);
    const type = requestUrl.searchParams.get("type") || null;
    const source = requestUrl.searchParams.get("source") || null;
    const items = readAuditEvents({
      limit: Number.isFinite(limit) ? limit : 100,
      type,
      source,
    });
    sendJson(res, 200, {
      items,
      count: items.length,
      filters: { type, source },
      logFile: auditLogFile,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/events/audit/summary") {
    sendJson(res, 200, {
      ok: true,
      audit: buildAuditSummary(),
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

ensureAuditLogReady();
hydrateRecentEventsFromAuditLog();

server.listen(port, host, () => {
  console.log(`openclaw-event-hub listening on http://${host}:${port}`);
  console.log(`openclaw-event-hub audit log: ${auditLogFile}`);
});
