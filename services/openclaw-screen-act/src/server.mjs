import http from "node:http";
import { randomUUID } from "node:crypto";

const host = process.env.OPENCLAW_SCREEN_ACT_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_SCREEN_ACT_PORT ?? "4105", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";
const screenSenseUrl = process.env.OPENCLAW_SCREEN_SENSE_URL ?? "http://127.0.0.1:4104";
const browserRuntimeUrl = process.env.OPENCLAW_BROWSER_RUNTIME_URL ?? "http://127.0.0.1:4103";
const screenWaitMs = Number.parseInt(process.env.OPENCLAW_SCREEN_ACT_WAIT_MS ?? "1500", 10);
const screenPollMs = Number.parseInt(process.env.OPENCLAW_SCREEN_ACT_POLL_MS ?? "100", 10);

const actionState = {
  lastAction: null,
  actionCount: 0,
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

async function publishEvent(type, payload = {}) {
  try {
    await fetch(`${eventHubUrl}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        source: "openclaw-screen-act",
        payload,
      }),
    });
  } catch (error) {
    console.error("Failed to publish screen-act event:", error);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isStableScreen(screen) {
  return Boolean(screen?.focusedWindow) && screen?.readiness === "ready";
}

async function getScreenContext() {
  const deadline = Date.now() + screenWaitMs;

  try {
    await fetch(`${screenSenseUrl}/screen/refresh`, { method: "POST" });

    while (Date.now() <= deadline) {
      const response = await fetch(`${screenSenseUrl}/screen/current`);
      const data = await response.json();
      const screen = data.screen ?? null;

      if (isStableScreen(screen)) {
        return {
          screen,
          degraded: false,
        };
      }

      await sleep(screenPollMs);
    }

    const response = await fetch(`${screenSenseUrl}/screen/current`);
    const data = await response.json();
    return {
      screen: data.screen ?? null,
      degraded: true,
    };
  } catch {
    return {
      screen: null,
      degraded: true,
    };
  }
}

function updateActionState(action) {
  actionState.lastAction = action;
  actionState.actionCount += 1;
  actionState.updatedAt = new Date().toISOString();
}

async function executeAction(kind, params) {
  const { screen, degraded } = await getScreenContext();
  if (!degraded && screen?.focusedWindow?.pid) {
    try {
      if (kind === "mouse.click") {
        await fetch(`${browserRuntimeUrl}/browser/click`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ x: params.x, y: params.y }),
        });
      }

      if (kind === "keyboard.type") {
        await fetch(`${browserRuntimeUrl}/browser/input`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: params.text ?? "" }),
        });
      }
    } catch {
    }
  }

  const action = {
    id: randomUUID(),
    kind,
    params,
    executedAt: new Date().toISOString(),
    screenContext: screen
        ? {
          focusedWindow: screen.focusedWindow,
          sessionId: screen.sessionId,
          readiness: screen.readiness ?? "degraded",
        }
      : null,
    degraded,
    result: degraded ? "simulated-degraded" : "simulated",
  };

  updateActionState(action);
  await publishEvent("action.completed", { action });
  return action;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "openclaw-screen-act",
      stage: "active",
      host,
      port,
      eventHubUrl,
      screenSenseUrl,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/act/state") {
    sendJson(res, 200, {
      ok: true,
      state: { ...actionState },
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/act/mouse/click") {
    const body = await readJsonBody(req);
    const action = await executeAction("mouse.click", {
      x: typeof body.x === "number" ? body.x : null,
      y: typeof body.y === "number" ? body.y : null,
      button: typeof body.button === "string" ? body.button : "left",
    });
    sendJson(res, 200, { ok: true, action });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/act/keyboard/type") {
    const body = await readJsonBody(req);
    const action = await executeAction("keyboard.type", {
      text: typeof body.text === "string" ? body.text : "",
    });
    sendJson(res, 200, { ok: true, action });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/act/keyboard/hotkey") {
    const body = await readJsonBody(req);
    const action = await executeAction("keyboard.hotkey", {
      keys: Array.isArray(body.keys) ? body.keys : [],
    });
    sendJson(res, 200, { ok: true, action });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/act/window/focus") {
    const body = await readJsonBody(req);
    const action = await executeAction("window.focus", {
      windowId: typeof body.windowId === "string" ? body.windowId : null,
      title: typeof body.title === "string" ? body.title : null,
    });
    sendJson(res, 200, { ok: true, action });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Route not found." });
});

server.listen(port, host, async () => {
  console.log(`openclaw-screen-act listening on http://${host}:${port}`);
  await publishEvent("service.started", {
    service: "openclaw-screen-act",
    url: `http://${host}:${port}`,
  });
});
