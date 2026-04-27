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

const ACTIVE_TASK_STATUSES = new Set(["queued", "running", "paused"]);
const STATUS_PRIORITY = {
  running: 0,
  paused: 1,
  queued: 2,
  failed: 3,
  completed: 4,
  superseded: 5,
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

function getCurrentTask() {
  return runtimeState.currentTaskId ? getTaskById(runtimeState.currentTaskId) : null;
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
  const currentTask = getCurrentTask();
  return {
    id: task.id,
    type: task.type,
    goal: task.goal,
    status: task.status,
    targetUrl: task.targetUrl ?? null,
    workViewStrategy: task.workViewStrategy ?? null,
    workView: task.workView ?? null,
    lastAction: task.lastAction ?? null,
    outcome: task.outcome ?? null,
    recovery: task.recovery ?? null,
    recoveredByTaskId: task.recoveredByTaskId ?? null,
    restorable: isRecoverableTask(task),
    executionPhase: task.executionPhase ?? "queued",
    phaseHistory: task.phaseHistory ?? [],
    createdAt: task.createdAt,
    closedAt: task.closedAt ?? null,
    updatedAt: task.updatedAt,
    isCurrentTask: currentTask?.id === task.id,
    isActive: isActiveTask(task),
  };
}

function isActiveTask(task) {
  return ACTIVE_TASK_STATUSES.has(task.status);
}

function isRecoverableTask(task) {
  return ["completed", "failed", "superseded"].includes(task.status)
    && typeof task.targetUrl === "string"
    && task.targetUrl.trim().length > 0;
}

function compareTasksForDisplay(left, right) {
  const leftPriority = STATUS_PRIORITY[left.status] ?? 99;
  const rightPriority = STATUS_PRIORITY[right.status] ?? 99;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

function listTasks() {
  return [...tasks.values()]
    .sort(compareTasksForDisplay)
    .map((task) => serialiseTask(task));
}

function getActiveTasks() {
  return [...tasks.values()]
    .filter((task) => isActiveTask(task))
    .sort(compareTasksForDisplay);
}

function getLatestFinishedTask() {
  return [...tasks.values()]
    .filter((task) => !isActiveTask(task))
    .sort(compareTasksForDisplay)[0] ?? null;
}

function getLatestFailedTask() {
  return [...tasks.values()]
    .filter((task) => task.status === "failed")
    .sort(compareTasksForDisplay)[0] ?? null;
}

function buildTaskSummary() {
  const items = [...tasks.values()];
  const counts = {
    total: items.length,
    active: 0,
    queued: 0,
    running: 0,
    paused: 0,
    failed: 0,
    completed: 0,
    superseded: 0,
    recoverable: 0,
  };

  for (const task of items) {
    if (counts[task.status] !== undefined) {
      counts[task.status] += 1;
    }
    if (isActiveTask(task)) {
      counts.active += 1;
    }
    if (isRecoverableTask(task)) {
      counts.recoverable += 1;
    }
  }

  return {
    counts,
    currentTaskId: runtimeState.currentTaskId ?? null,
    currentTaskStatus: getCurrentTask()?.status ?? null,
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
    lastAction: null,
    outcome: null,
    recovery:
      body.recovery && typeof body.recovery === "object"
        ? {
            recoveredFromTaskId:
              typeof body.recovery.recoveredFromTaskId === "string" && body.recovery.recoveredFromTaskId.trim()
                ? body.recovery.recoveredFromTaskId.trim()
                : null,
            recoveredFromOutcome:
              typeof body.recovery.recoveredFromOutcome === "string" && body.recovery.recoveredFromOutcome.trim()
                ? body.recovery.recoveredFromOutcome.trim()
                : null,
            attempt:
              Number.isInteger(body.recovery.attempt) && body.recovery.attempt > 0
                ? body.recovery.attempt
                : 1,
          }
        : null,
    recoveredByTaskId: null,
    executionPhase: "queued",
    phaseHistory: [
      {
        phase: "queued",
        at: now,
      },
    ],
    createdAt: now,
    closedAt: null,
    updatedAt: now,
  };

  tasks.set(task.id, task);
  return task;
}

function getTaskById(taskId) {
  return tasks.get(taskId) ?? null;
}

function appendTaskPhase(task, phase, details = null) {
  const now = new Date().toISOString();
  task.executionPhase = phase;
  task.updatedAt = now;
  if (phase === "acting_on_target" && details?.actionKind) {
    task.lastAction = {
      kind: details.actionKind,
      degraded: Boolean(details.degraded),
      at: now,
    };
  }
  task.phaseHistory = [...(task.phaseHistory ?? []), { phase, at: now, details }];
  return task;
}

function reconcileRuntimeState() {
  const activeTasks = [...tasks.values()]
    .filter((task) => isActiveTask(task))
    .sort(compareTasksForDisplay);
  const currentTask = activeTasks[0] ?? null;

  if (!currentTask) {
    updateRuntimeState({
      status: "idle",
      currentTaskId: null,
      paused: false,
    });
    return null;
  }

  updateRuntimeState({
    status: currentTask.status === "paused" ? "paused" : currentTask.status,
    currentTaskId: currentTask.id,
    paused: currentTask.status === "paused",
  });
  return currentTask;
}

function supersedeOtherActiveTasks(exceptTaskId) {
  const reclaimed = [];

  for (const task of tasks.values()) {
    if (task.id === exceptTaskId || !isActiveTask(task)) {
      continue;
    }

    task.status = "superseded";
    appendTaskPhase(task, "superseded", {
      replacedByTaskId: exceptTaskId,
    });
    task.outcome = {
      kind: "superseded",
      summary: `Superseded by task ${exceptTaskId}`,
      at: task.updatedAt,
    };
    task.closedAt = task.updatedAt;
    reclaimed.push(task);
  }

  return reclaimed;
}

function attachTaskToWorkView(task, body) {
  const now = new Date().toISOString();
  const activeUrl =
    typeof body.activeUrl === "string" && body.activeUrl.trim()
      ? body.activeUrl.trim()
      : task.targetUrl;

  task.status = "running";
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
  appendTaskPhase(task, "ready_for_action", {
    sessionId: task.workView.sessionId,
    activeUrl,
  });
  reconcileRuntimeState();

  return task;
}

function completeTask(task, details = null) {
  if (details?.workView && typeof details.workView === "object") {
    task.workView = {
      ...(task.workView ?? {}),
      ...details.workView,
    };
  }
  task.status = "completed";
  appendTaskPhase(task, "completed", details);
  task.outcome = {
    kind: "completed",
    summary: typeof details?.summary === "string" && details.summary.trim()
      ? details.summary.trim()
      : `Completed work view task for ${task.targetUrl ?? "current target"}`,
    details,
    at: task.updatedAt,
  };
  task.closedAt = task.updatedAt;
  reconcileRuntimeState();
  return task;
}

function recoverTask(sourceTask) {
  const recoveryAttempt = (sourceTask.recovery?.attempt ?? 0) + 1;
  const recoveredTask = createTask({
    goal: sourceTask.goal,
    type: sourceTask.type,
    targetUrl: sourceTask.targetUrl,
    workViewStrategy: sourceTask.workViewStrategy,
    recovery: {
      recoveredFromTaskId: sourceTask.id,
      recoveredFromOutcome: sourceTask.outcome?.kind ?? sourceTask.status,
      attempt: recoveryAttempt,
    },
  });

  sourceTask.recoveredByTaskId = recoveredTask.id;
  sourceTask.updatedAt = new Date().toISOString();
  return recoveredTask;
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
    reconcileRuntimeState();
    sendJson(res, 200, {
      runtime: runtimeState,
      taskCount: tasks.size,
      currentTask: runtimeState.currentTaskId ? serialiseTask(getTaskById(runtimeState.currentTaskId)) : null,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/tasks/summary") {
    reconcileRuntimeState();
    sendJson(res, 200, {
      ok: true,
      summary: buildTaskSummary(),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/tasks/active") {
    reconcileRuntimeState();
    const activeTasks = getActiveTasks();
    sendJson(res, 200, {
      ok: true,
      count: activeTasks.length,
      items: activeTasks.map((task) => serialiseTask(task)),
      summary: buildTaskSummary(),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/tasks/focus/current") {
    reconcileRuntimeState();
    const task = getCurrentTask();
    sendJson(res, 200, {
      ok: true,
      task: task ? serialiseTask(task) : null,
      summary: buildTaskSummary(),
      focus: "current-task",
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/tasks/focus/latest-finished") {
    reconcileRuntimeState();
    const task = getLatestFinishedTask();
    sendJson(res, 200, {
      ok: true,
      task: task ? serialiseTask(task) : null,
      summary: buildTaskSummary(),
      focus: "latest-finished",
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/tasks/focus/latest-failed") {
    reconcileRuntimeState();
    const task = getLatestFailedTask();
    sendJson(res, 200, {
      ok: true,
      task: task ? serialiseTask(task) : null,
      summary: buildTaskSummary(),
      focus: "latest-failed",
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/tasks") {
    const limit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "10", 10);
    const safeLimit = Number.isNaN(limit) ? 10 : Math.max(1, Math.min(limit, 50));
    sendJson(res, 200, {
      ok: true,
      count: tasks.size,
      items: listTasks().slice(0, safeLimit),
      summary: buildTaskSummary(),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/tasks/latest-finished") {
    const task = getLatestFinishedTask();
    sendJson(res, 200, {
      ok: true,
      task: task ? serialiseTask(task) : null,
      summary: buildTaskSummary(),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/tasks/latest-failed") {
    const task = getLatestFailedTask();
    sendJson(res, 200, {
      ok: true,
      task: task ? serialiseTask(task) : null,
      summary: buildTaskSummary(),
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/tasks") {
    try {
      const body = await readJsonBody(req);
      const task = createTask(body);
      const reclaimedTasks = supersedeOtherActiveTasks(task.id);
      reconcileRuntimeState();

      await publishEvent("task.created", { task: serialiseTask(task) });
      await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
        task: serialiseTask(reclaimedTask),
      })));
      sendJson(res, 201, { ok: true, task: serialiseTask(task) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (
    req.method === "POST"
    && requestUrl.pathname.startsWith("/tasks/")
    && requestUrl.pathname.endsWith("/recover")
  ) {
    const taskId = requestUrl.pathname.slice("/tasks/".length, -"/recover".length);
    const sourceTask = getTaskById(taskId);
    if (!sourceTask) {
      sendJson(res, 404, { ok: false, error: "Task not found." });
      return;
    }

    if (!isRecoverableTask(sourceTask)) {
      sendJson(res, 409, { ok: false, error: "Task is not recoverable." });
      return;
    }

    try {
      const recoveredTask = recoverTask(sourceTask);
      const reclaimedTasks = supersedeOtherActiveTasks(recoveredTask.id);
      reconcileRuntimeState();

      await publishEvent("task.created", { task: serialiseTask(recoveredTask) });
      await publishEvent("task.recovered", {
        task: serialiseTask(recoveredTask),
        recoveredFromTaskId: sourceTask.id,
      });
      await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
        task: serialiseTask(reclaimedTask),
      })));
      sendJson(res, 201, {
        ok: true,
        task: serialiseTask(recoveredTask),
        recoveredFromTask: serialiseTask(sourceTask),
      });
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
    && requestUrl.pathname.endsWith("/phase")
  ) {
    const taskId = requestUrl.pathname.slice("/tasks/".length, -"/phase".length);
    const task = getTaskById(taskId);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Task not found." });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const phase = typeof body.phase === "string" ? body.phase.trim() : "";
      if (!phase) {
        sendJson(res, 400, { ok: false, error: "Task phase is required." });
        return;
      }

      if (typeof body.status === "string" && body.status.trim()) {
        task.status = body.status.trim();
      }

      const updatedTask = appendTaskPhase(task, phase, body.details ?? null);
      reconcileRuntimeState();

      await publishEvent("task.phase_changed", { task: serialiseTask(updatedTask) });
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

  if (
    req.method === "POST"
    && requestUrl.pathname.startsWith("/tasks/")
    && requestUrl.pathname.endsWith("/complete")
  ) {
    const taskId = requestUrl.pathname.slice("/tasks/".length, -"/complete".length);
    const task = getTaskById(taskId);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Task not found." });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const updatedTask = completeTask(task, body.details ?? null);
      await publishEvent("task.completed", { task: serialiseTask(updatedTask) });
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
    appendTaskPhase(task, "paused", { reason: "Paused by operator." });
    reconcileRuntimeState();

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
    appendTaskPhase(task, "failed", { reason: "Stopped by operator." });
    task.outcome = {
      kind: "failed",
      summary: "Stopped by operator.",
      reason: "Stopped by operator.",
      at: task.updatedAt,
    };
    task.closedAt = task.updatedAt;
    const stoppedTask = serialiseTask(task);
    reconcileRuntimeState();

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
