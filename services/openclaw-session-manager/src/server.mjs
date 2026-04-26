import http from "node:http";
import { randomUUID } from "node:crypto";

const host = process.env.OPENCLAW_SESSION_MANAGER_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_SESSION_MANAGER_PORT ?? "4102", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";
const browserRuntimeUrl = process.env.OPENCLAW_BROWSER_RUNTIME_URL ?? "http://127.0.0.1:4103";
const startDelayMs = Number.parseInt(process.env.OPENCLAW_SESSION_START_DELAY_MS ?? "0", 10);
const defaultWorkViewUrl = process.env.OPENCLAW_WORK_VIEW_URL ?? "https://example.com/work-view";

const sessionState = {
  sessionId: null,
  status: "stopped",
  displayTarget: "workspace-2",
  role: "ai-work-view",
  createdAt: null,
  updatedAt: new Date().toISOString(),
};

const workViewState = {
  workViewId: "work-view-primary",
  status: "idle",
  visibility: "hidden",
  captureStrategy: "browser-runtime",
  helperStatus: "idle",
  browserStatus: "stopped",
  mode: "background",
  displayTarget: "workspace-2",
  entryUrl: defaultWorkViewUrl,
  activeUrl: null,
  preparedAt: null,
  lastRevealedAt: null,
  lastHiddenAt: null,
  updatedAt: new Date().toISOString(),
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

function serialiseWorkViewState() {
  return { ...workViewState };
}

function updateWorkViewState(patch) {
  Object.assign(workViewState, patch, {
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

async function ensureBrowserWorkView(url = workViewState.entryUrl || defaultWorkViewUrl) {
  try {
    const response = await fetch(`${browserRuntimeUrl}/browser/open`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error ?? "browser open failed");
    }

    updateWorkViewState({
      helperStatus: "active",
      browserStatus: data.browser?.running ? "running" : "unknown",
      entryUrl: url,
      activeUrl: data.browser?.activeUrl ?? data.tab?.url ?? url,
    });

    return {
      ok: true,
      browser: data.browser ?? null,
      tab: data.tab ?? null,
    };
  } catch (error) {
    updateWorkViewState({
      helperStatus: "degraded",
      browserStatus: "unavailable",
      entryUrl: url,
    });

    return {
      ok: false,
      error: error instanceof Error ? error.message : "browser open failed",
    };
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
  updateWorkViewState({
    status: "prepared",
    visibility: "hidden",
    helperStatus: "active",
    browserStatus: "stopped",
    displayTarget,
    preparedAt: workViewState.preparedAt ?? now,
    mode: "background",
  });
}

async function prepareWorkView(displayTarget, entryUrl = workViewState.entryUrl || defaultWorkViewUrl) {
  if (sessionState.status !== "running" || !sessionState.sessionId) {
    await startSession(displayTarget);
  } else {
    updateWorkViewState({
      status: "prepared",
      visibility: "hidden",
      helperStatus: "active",
      displayTarget,
      entryUrl,
      preparedAt: workViewState.preparedAt ?? new Date().toISOString(),
      mode: "background",
    });
  }

  return ensureBrowserWorkView(entryUrl);
}

async function revealWorkView(entryUrl = workViewState.entryUrl || defaultWorkViewUrl) {
  const browser = await ensureBrowserWorkView(entryUrl);
  updateWorkViewState({
    visibility: "visible",
    status: "ready",
    helperStatus: browser.ok ? "active" : "degraded",
    browserStatus: browser.browser?.running ? "running" : workViewState.browserStatus,
    entryUrl,
    activeUrl: browser.browser?.activeUrl ?? browser.tab?.url ?? entryUrl,
    lastRevealedAt: new Date().toISOString(),
    mode: "foreground-observable",
  });

  return browser;
}

function hideWorkView() {
  updateWorkViewState({
    status: "prepared",
    visibility: "hidden",
    helperStatus: "active",
    lastHiddenAt: new Date().toISOString(),
    mode: "background",
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
      service: "openclaw-session-manager",
      stage: "active",
      host,
      port,
      eventHubUrl,
      browserRuntimeUrl,
      startDelayMs,
      defaultWorkViewUrl,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/session/state") {
    sendJson(res, 200, {
      ok: true,
      session: serialiseSessionState(),
      workView: serialiseWorkViewState(),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/work-view/state") {
    sendJson(res, 200, {
      ok: true,
      session: serialiseSessionState(),
      workView: serialiseWorkViewState(),
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
          workView: serialiseWorkViewState(),
        });
        return;
      }

      await startSession(displayTarget);
      const session = serialiseSessionState();
      const workView = serialiseWorkViewState();
      await publishEvent("service.started", {
        service: "openclaw-session-manager",
        session,
        workView,
      });
      sendJson(res, 201, { ok: true, reused: false, session, workView });
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
      const workView = serialiseWorkViewState();
      await publishEvent("service.started", {
        service: "openclaw-session-manager",
        restarted: true,
        session,
        workView,
      });
      sendJson(res, 200, { ok: true, restarted: true, session, workView });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/work-view/prepare") {
    try {
      const body = await readJsonBody(req);
      const displayTarget =
        typeof body.displayTarget === "string" && body.displayTarget.trim()
          ? body.displayTarget.trim()
          : workViewState.displayTarget;
      const entryUrl =
        typeof body.entryUrl === "string" && body.entryUrl.trim()
          ? body.entryUrl.trim()
          : workViewState.entryUrl;

      const browser = await prepareWorkView(displayTarget, entryUrl);
      const session = serialiseSessionState();
      const workView = serialiseWorkViewState();
      await publishEvent("service.started", {
        service: "openclaw-session-manager",
        action: "work-view-prepared",
        session,
        workView,
        browser,
      });
      sendJson(res, 200, { ok: true, session, workView, browser });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/work-view/reveal") {
    try {
      const body = await readJsonBody(req);
      const entryUrl =
        typeof body.entryUrl === "string" && body.entryUrl.trim()
          ? body.entryUrl.trim()
          : workViewState.entryUrl;

      if (sessionState.status !== "running" || !sessionState.sessionId) {
        await prepareWorkView(workViewState.displayTarget, entryUrl);
      }

      const browser = await revealWorkView(entryUrl);
      const session = serialiseSessionState();
      const workView = serialiseWorkViewState();
      await publishEvent("service.started", {
        service: "openclaw-session-manager",
        action: "work-view-revealed",
        session,
        workView,
        browser,
      });
      sendJson(res, 200, { ok: true, session, workView, browser });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/work-view/hide") {
    try {
      hideWorkView();
      const session = serialiseSessionState();
      const workView = serialiseWorkViewState();
      await publishEvent("service.started", {
        service: "openclaw-session-manager",
        action: "work-view-hidden",
        session,
        workView,
      });
      sendJson(res, 200, { ok: true, session, workView });
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
