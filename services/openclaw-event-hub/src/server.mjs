import http from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createAuditLogStore } from "./audit-log-store.mjs";
import { createEventIngress } from "./event-ingress.mjs";

const host = process.env.OPENCLAW_EVENT_HUB_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_EVENT_HUB_PORT ?? "4101", 10);
const maxRecentEvents = Number.parseInt(process.env.OPENCLAW_EVENT_HUB_MAX_RECENT ?? "200", 10);
const bodyStateDir = process.env.OPENCLAW_BODY_STATE_DIR;
const auditLogFile =
  process.env.OPENCLAW_EVENT_LOG_FILE
  ?? (bodyStateDir ? path.join(bodyStateDir, "openclaw-events.jsonl") : path.resolve(".artifacts", "openclaw-events.jsonl"));
const maxAuditQueryLimit = Number.parseInt(process.env.OPENCLAW_EVENT_AUDIT_MAX_LIMIT ?? "1000", 10);
const auditLogStore = createAuditLogStore({
  filePath: auditLogFile,
  maxQueryLimit: maxAuditQueryLimit,
  maxSegmentBytes: process.env.OPENCLAW_EVENT_AUDIT_MAX_SEGMENT_BYTES,
  maxRotatedSegments: process.env.OPENCLAW_EVENT_AUDIT_MAX_ROTATED_SEGMENTS,
});
const eventIngress = createEventIngress({
  token: process.env.OPENCLAW_EVENT_HUB_TOKEN,
  tokenMapFilePath: process.env.OPENCLAW_EVENT_HUB_TOKEN_MAP_FILE,
  required: process.env.OPENCLAW_EVENT_HUB_AUTH_REQUIRED === "1",
});

const recentEvents = [];
const streamClients = new Map();
const serviceRegistry = new Map();


import { corsHeaders, sendJson, readJsonBody } from "../../../packages/shared-utils/src/http.mjs";


async function readAuditEvents({ type = null, source = null, limit = 100 } = {}) {
  return auditLogStore.readEvents({ type, source, limit });
}

async function buildAuditSummary() {
  return auditLogStore.buildSummary({ recentEventCount: recentEvents.length });
}

async function appendAuditEvent(event) {
  await auditLogStore.append(event);
}

// H-3 Fix: Now async since readAuditEvents is async.
async function hydrateRecentEventsFromAuditLog() {
  try {
    for (const event of await readAuditEvents({ limit: maxRecentEvents })) {
      recentEvents.push(event);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`Unable to hydrate recent events from audit log: ${message}`);
  }
}

// H-3 Fix: publishEvent is now async to await the async appendAuditEvent.
async function publishEvent(event) {
  await appendAuditEvent(event);

  recentEvents.push(event);
  // L-1 Fix: Use shift() instead of splice(0, N) since we push exactly one
  // element at a time, so at most one element needs to be removed. This avoids
  // a potentially large splice when the array is only one over the limit.
  if (recentEvents.length > maxRecentEvents) {
    recentEvents.shift();
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

  if (req.method === "POST" && requestUrl.pathname === "/services/register") {
    try {
      eventIngress.authenticateRequest(req);
      const body = await readJsonBody(req);
      if (body.name && body.url) {
        serviceRegistry.set(body.name, {
          name: body.name,
          url: body.url,
          healthUrl: `${body.url}/health`,
          registeredAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
        });
        sendJson(res, 200, { ok: true });
      } else {
        sendJson(res, 400, { ok: false, error: "name and url are required" });
      }
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/services/registry") {
    sendJson(res, 200, {
      ok: true,
      services: Object.fromEntries(serviceRegistry),
    });
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
      auditRetention: auditLogStore.retentionPolicy(),
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
    // H-3 Fix: readAuditEvents is now async.
    const items = await readAuditEvents({
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
    // H-3 Fix: buildAuditSummary is now async.
    sendJson(res, 200, {
      ok: true,
      audit: await buildAuditSummary(),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/events/stream") {
    handleSse(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/events") {
    try {
      const ingress = eventIngress.authenticateRequest(req);
      const body = await readJsonBody(req);
      const event = eventIngress.normaliseEvent(body, ingress);
      // H-3 Fix: await publishEvent since it is now async (async audit log append).
      await publishEvent(event);
      sendJson(res, 201, { ok: true, event });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, error?.code === "EVENT_INGRESS_AUTH_REQUIRED" ? 401 : 400, { ok: false, error: message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "Route not found." });
});

async function startEventHub() {
  await auditLogStore.ensureReady();
  await hydrateRecentEventsFromAuditLog();
  server.listen(port, host, () => {
    console.log(`openclaw-event-hub listening on http://${host}:${port}`);
    console.log(`openclaw-event-hub audit log: ${auditLogFile}`);
  });
}

startEventHub().catch((error) => {
  console.error(`Unable to start openclaw-event-hub: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
