import http from "node:http";
import { randomUUID } from "node:crypto";

const host = process.env.OPENCLAW_CORE_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_CORE_PORT ?? "4100", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";

const tasks = new Map();
const runtimeState = {
  status: "idle",
  currentTaskId: null,
  paused: false,
  lastUpdatedAt: new Date().toISOString(),
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

function updateRuntimeState(patch) {
  Object.assign(runtimeState, patch, {
    lastUpdatedAt: new Date().toISOString(),
  });
}

async function publishEvent(type, payload = {}) {
  try {
    await fetch(`${eventHubUrl}/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        type,
        source: "openclaw-core",
        payload,
      }),
    });
  } catch (error) {
    console.error("Failed to publish event to event hub:", error);
  }
}

function serialiseTask(task) {
  return {
    id: task.id,
    type: task.type,
    goal: task.goal,
    status: task.status,
    targetUrl: task.targetUrl ?? null,
    workViewStrategy: task.workViewStrategy ?? null,
    workView: task.workView ?? null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function createTask(body) {
  const goal = typeof body.goal === "string" ? body.goal.trim() : "";
  if (!goal) {
    throw new Error("Task goal is required.");
  }

  const type = typeof body.type === "string" && body.type.trim() ? body.type.trim() : "generic_task";
  const now = new Date().toISOString();
  const task = {
    id: randomUUID(),
    type,
    goal,
    status: "queued",
    targetUrl:
      typeof body.targetUrl === "string" && body.targetUrl.trim()
        ? body.targetUrl.trim()
        : null,
    workViewStrategy:
      typeof body.workViewStrategy === "string" && body.workViewStrategy.trim()
        ? body.workViewStrategy.trim()
        : "ai-work-view",
    workView: null,
    createdAt: now,
    updatedAt: now,
  };

  tasks.set(task.id, task);
  return task;
}

function getTaskById(taskId) {
  return tasks.get(taskId) ?? null;
}

function attachTaskToWorkView(task, body) {
  const now = new Date().toISOString();
  const activeUrl =
    typeof body.activeUrl === "string" && body.activeUrl.trim()
      ? body.activeUrl.trim()
      : task.targetUrl;

  task.status = "running";
  task.updatedAt = now;
  task.workView = {
    sessionId:
      typeof body.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId.trim()
        : null,
    status:
      typeof body.status === "string" && body.status.trim()
        ? body.status.trim()
        : "ready",
    visibility:
      typeof body.visibility === "string" && body.visibility.trim()
        ? body.visibility.trim()
        : "visible",
    mode:
      typeof body.mode === "string" && body.mode.trim()
        ? body.mode.trim()
        : "foreground-observable",
    helperStatus:
      typeof body.helperStatus === "string" && body.helperStatus.trim()
        ? body.helperStatus.trim()
        : "active",
    displayTarget:
      typeof body.displayTarget === "string" && body.displayTarget.trim()
        ? body.displayTarget.trim()
        : null,
    activeUrl,
    attachedAt: now,
  };

  updateRuntimeState({
    status: "running",
    currentTaskId: task.id,
    paused: false,
  });

  return task;
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
      service: "openclaw-core",
      stage: "active",
      host,
      port,
      eventHubUrl,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/state/runtime") {
    sendJson(res, 200, {
      runtime: runtimeState,
      taskCount: tasks.size,
      currentTask: runtimeState.currentTaskId ? serialiseTask(getTaskById(runtimeState.currentTaskId)) : null,
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/tasks") {
    try {
      const body = await readJsonBody(req);
      const task = createTask(body);

      updateRuntimeState({
        status: "queued",
        currentTaskId: task.id,
        paused: false,
      });

      await publishEvent("task.created", { task: serialiseTask(task) });
      sendJson(res, 201, { ok: true, task: serialiseTask(task) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname.startsWith("/tasks/")) {
    const taskPath = requestUrl.pathname.slice("/tasks/".length);
    const [taskId] = taskPath.split("/");
    const task = getTaskById(taskId);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Task not found." });
      return;
    }

    sendJson(res, 200, { ok: true, task: serialiseTask(task) });
    return;
  }

  if (
    req.method === "POST"
    && requestUrl.pathname.startsWith("/tasks/")
    && requestUrl.pathname.endsWith("/attach-work-view")
  ) {
    const taskId = requestUrl.pathname
      .slice("/tasks/".length, -"/attach-work-view".length);
    const task = getTaskById(taskId);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Task not found." });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const updatedTask = attachTaskToWorkView(task, body);
      await publishEvent("task.running", { task: serialiseTask(updatedTask) });
      sendJson(res, 200, {
        ok: true,
        task: serialiseTask(updatedTask),
        runtime: runtimeState,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/control/pause") {
    if (!runtimeState.currentTaskId) {
      sendJson(res, 409, { ok: false, error: "No active task to pause." });
      return;
    }

    const task = getTaskById(runtimeState.currentTaskId);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Current task not found." });
      return;
    }

    task.status = "paused";
    task.updatedAt = new Date().toISOString();
    updateRuntimeState({ status: "paused", paused: true });

    await publishEvent("task.paused", { task: serialiseTask(task) });
    sendJson(res, 200, { ok: true, task: serialiseTask(task), runtime: runtimeState });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/control/stop") {
    if (!runtimeState.currentTaskId) {
      sendJson(res, 409, { ok: false, error: "No active task to stop." });
      return;
    }

    const task = getTaskById(runtimeState.currentTaskId);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Current task not found." });
      return;
    }

    task.status = "failed";
    task.updatedAt = new Date().toISOString();
    const stoppedTask = serialiseTask(task);
    updateRuntimeState({ status: "idle", paused: false, currentTaskId: null });

    await publishEvent("task.failed", { task: stoppedTask, reason: "Stopped by operator." });
    sendJson(res, 200, { ok: true, task: stoppedTask, runtime: runtimeState });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Route not found." });
});

server.listen(port, host, async () => {
  console.log(`openclaw-core listening on http://${host}:${port}`);
  await publishEvent("service.started", {
    service: "openclaw-core",
    url: `http://${host}:${port}`,
  });
});
