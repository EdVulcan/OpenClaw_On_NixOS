import http from "node:http";

const host = process.env.OBSERVER_UI_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OBSERVER_UI_PORT ?? "4170", 10);
const coreUrl = process.env.OPENCLAW_CORE_URL ?? "http://127.0.0.1:4100";
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";
const sessionManagerUrl = process.env.OPENCLAW_SESSION_MANAGER_URL ?? "http://127.0.0.1:4102";
const screenSenseUrl = process.env.OPENCLAW_SCREEN_SENSE_URL ?? "http://127.0.0.1:4104";
const screenActUrl = process.env.OPENCLAW_SCREEN_ACT_URL ?? "http://127.0.0.1:4105";
const systemSenseUrl = process.env.OPENCLAW_SYSTEM_SENSE_URL ?? "http://127.0.0.1:4106";
const systemHealUrl = process.env.OPENCLAW_SYSTEM_HEAL_URL ?? "http://127.0.0.1:4107";

function sendHtml(res, html) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
  });
  res.end(html);
}

function sendJavaScript(res, script) {
  res.writeHead(200, {
    "content-type": "text/javascript; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
  });
  res.end(script);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function observerHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenClaw Observer UI</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b1020;
        --panel: #121932;
        --line: #2b3568;
        --text: #e6ebff;
        --muted: #9aa7d6;
        --accent: #6ee7c8;
        --warn: #ffcc66;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", "Noto Sans", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(110, 231, 200, 0.12), transparent 30%),
          linear-gradient(180deg, #08101d, var(--bg));
        color: var(--text);
      }
      main {
        max-width: 1320px;
        margin: 0 auto;
        padding: 24px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 32px;
      }
      .subtitle {
        margin: 0 0 24px;
        color: var(--muted);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }
      .panel {
        background: rgba(18, 25, 50, 0.9);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.24);
      }
      .panel h2 {
        margin: 0 0 12px;
        font-size: 18px;
      }
      .metric {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 8px 0;
      }
      .metric span:last-child {
        color: var(--accent);
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .control-stack {
        display: grid;
        gap: 12px;
      }
      .field {
        display: grid;
        gap: 6px;
      }
      .field label {
        color: var(--muted);
        font-size: 13px;
      }
      .field input {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(10, 16, 34, 0.9);
        color: var(--text);
        padding: 10px 12px;
        font: inherit;
      }
      button {
        border: 0;
        border-radius: 999px;
        background: var(--accent);
        color: #04111c;
        padding: 10px 16px;
        font-weight: 700;
        cursor: pointer;
      }
      button.secondary {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--line);
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--muted);
        font-size: 13px;
      }
      ul {
        margin: 0;
        padding-left: 18px;
      }
      li {
        margin: 6px 0;
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        padding: 4px 10px;
        background: rgba(110, 231, 200, 0.12);
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
      }
      .status-pill.warn {
        background: rgba(255, 204, 102, 0.14);
        color: var(--warn);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>OpenClaw Observer UI</h1>
      <p class="subtitle">Observe the first control-plane loop: runtime, screen, action, system, and heal state.</p>
      <div class="grid">
        <section class="panel">
          <h2>Runtime</h2>
          <div class="metric"><span>Status</span><span id="runtime-status">loading</span></div>
          <div class="metric"><span>Current Task</span><span id="runtime-task">none</span></div>
          <div class="metric"><span>Paused</span><span id="runtime-paused">false</span></div>
          <div class="metric"><span>Task Count</span><span id="runtime-count">0</span></div>
          <div class="metric"><span>Updated</span><span id="runtime-updated">-</span></div>
        </section>
        <section class="panel">
          <h2>Service Health</h2>
          <div class="metric"><span>Core</span><span id="core-health" class="status-pill warn">checking</span></div>
          <div class="metric"><span>Event Hub</span><span id="eventhub-health" class="status-pill warn">checking</span></div>
          <div class="metric"><span>Session Manager</span><span id="session-manager-health" class="status-pill warn">checking</span></div>
          <div class="metric"><span>Screen Sense</span><span id="screen-health" class="status-pill warn">checking</span></div>
          <div class="metric"><span>Screen Act</span><span id="screen-act-health" class="status-pill warn">checking</span></div>
          <div class="metric"><span>System Sense</span><span id="system-health-pill" class="status-pill warn">checking</span></div>
          <div class="metric"><span>System Heal</span><span id="system-heal-health" class="status-pill warn">checking</span></div>
          <div class="metric"><span>Observer</span><span class="status-pill">active</span></div>
        </section>
        <section class="panel">
          <h2>Controls</h2>
          <div class="control-stack">
            <div class="field">
              <label for="work-view-url-input">Work View URL</label>
              <input id="work-view-url-input" type="text" value="https://example.com/work-view" spellcheck="false" />
            </div>
            <div class="actions">
              <button id="create-task-button">Create Demo Task</button>
              <button id="open-work-view-url-button">Open Work View URL</button>
              <button id="prepare-work-view-button" class="secondary">Prepare Work View</button>
              <button id="reveal-work-view-button" class="secondary">Reveal Work View</button>
              <button id="hide-work-view-button" class="secondary">Hide Work View</button>
              <button id="refresh-screen-button" class="secondary">Refresh Screen State</button>
              <button id="click-action-button" class="secondary">Simulate Click</button>
              <button id="type-action-button" class="secondary">Simulate Type</button>
              <button id="heal-browser-button" class="secondary">Simulate Browser Restart</button>
              <button id="complete-task-button" class="secondary">Complete Current Task</button>
              <button id="pause-button" class="secondary">Pause Current Task</button>
              <button id="stop-button" class="secondary">Stop Current Task</button>
            </div>
          </div>
          <pre id="control-result">Controls ready.</pre>
        </section>
        <section class="panel">
          <h2>AI Work View</h2>
          <div class="metric"><span>Status</span><span id="work-view-status">idle</span></div>
          <div class="metric"><span>Visibility</span><span id="work-view-visibility">hidden</span></div>
          <div class="metric"><span>Mode</span><span id="work-view-mode">background</span></div>
          <div class="metric"><span>Helper</span><span id="work-view-helper">idle</span></div>
          <div class="metric"><span>Capture</span><span id="work-view-capture">browser-runtime</span></div>
          <pre id="work-view-json">Loading work view state...</pre>
        </section>
        <section class="panel">
          <h2>Current Task</h2>
          <pre id="task-json">Loading task state...</pre>
        </section>
        <section class="panel">
          <h2>Screen State</h2>
          <div class="metric"><span>Focused Window</span><span id="screen-window">loading</span></div>
          <div class="metric"><span>Session</span><span id="screen-session">unknown</span></div>
          <div class="metric"><span>Readiness</span><span id="screen-readiness">warming_up</span></div>
          <div class="metric"><span>Capture Source</span><span id="screen-capture-source">unknown</span></div>
          <pre id="screen-summary">Loading screen state...</pre>
        </section>
        <section class="panel">
          <h2>Snapshot Preview</h2>
          <pre id="screen-snapshot">No screen preview yet.</pre>
        </section>
        <section class="panel">
          <h2>Last Action</h2>
          <div class="metric"><span>Kind</span><span id="action-kind">none</span></div>
          <div class="metric"><span>Count</span><span id="action-count">0</span></div>
          <div class="metric"><span>Degraded</span><span id="action-degraded">false</span></div>
          <pre id="action-json">No action executed yet.</pre>
        </section>
        <section class="panel">
          <h2>System Health</h2>
          <div class="metric"><span>Online Services</span><span id="system-services-online">0</span></div>
          <div class="metric"><span>Alerts</span><span id="system-alert-count">0</span></div>
          <pre id="system-summary">Loading system state...</pre>
        </section>
        <section class="panel">
          <h2>Heal History</h2>
          <div class="metric"><span>Entries</span><span id="heal-count">0</span></div>
          <pre id="heal-summary">No heal actions yet.</pre>
        </section>
        <section class="panel" style="grid-column: 1 / -1;">
          <h2>Recent Events</h2>
          <ul id="events-list"></ul>
        </section>
      </div>
    </main>
    <script type="module" src="/client.js?v=2"></script>
  </body>
</html>`;
}

function clientScript() {
  return `const observerBase = \`\${window.location.protocol}//\${window.location.hostname}\`;
const observerConfig = {
  coreUrl: \`\${observerBase}:4100\`,
  eventHubUrl: \`\${observerBase}:4101\`,
  sessionManagerUrl: \`\${observerBase}:4102\`,
  screenSenseUrl: \`\${observerBase}:4104\`,
  screenActUrl: \`\${observerBase}:4105\`,
  systemSenseUrl: \`\${observerBase}:4106\`,
  systemHealUrl: \`\${observerBase}:4107\`,
};

const runtimeStatus = document.querySelector("#runtime-status");
const runtimeTask = document.querySelector("#runtime-task");
const runtimePaused = document.querySelector("#runtime-paused");
const runtimeCount = document.querySelector("#runtime-count");
const runtimeUpdated = document.querySelector("#runtime-updated");
const taskJson = document.querySelector("#task-json");
const workViewStatus = document.querySelector("#work-view-status");
const workViewVisibility = document.querySelector("#work-view-visibility");
const workViewMode = document.querySelector("#work-view-mode");
const workViewHelper = document.querySelector("#work-view-helper");
const workViewCapture = document.querySelector("#work-view-capture");
const workViewJson = document.querySelector("#work-view-json");
const controlResult = document.querySelector("#control-result");
const eventsList = document.querySelector("#events-list");
const coreHealth = document.querySelector("#core-health");
const eventhubHealth = document.querySelector("#eventhub-health");
const sessionManagerHealth = document.querySelector("#session-manager-health");
const screenHealth = document.querySelector("#screen-health");
const screenActHealth = document.querySelector("#screen-act-health");
const systemHealthPill = document.querySelector("#system-health-pill");
const systemHealHealth = document.querySelector("#system-heal-health");
const screenWindow = document.querySelector("#screen-window");
const screenSession = document.querySelector("#screen-session");
const screenReadiness = document.querySelector("#screen-readiness");
const screenCaptureSource = document.querySelector("#screen-capture-source");
const screenSummary = document.querySelector("#screen-summary");
const screenSnapshot = document.querySelector("#screen-snapshot");
const actionKind = document.querySelector("#action-kind");
const actionCount = document.querySelector("#action-count");
const actionDegraded = document.querySelector("#action-degraded");
const actionJson = document.querySelector("#action-json");
const systemServicesOnline = document.querySelector("#system-services-online");
const systemAlertCount = document.querySelector("#system-alert-count");
const systemSummary = document.querySelector("#system-summary");
const healCount = document.querySelector("#heal-count");
const healSummary = document.querySelector("#heal-summary");
const createTaskButton = document.querySelector("#create-task-button");
const prepareWorkViewButton = document.querySelector("#prepare-work-view-button");
const revealWorkViewButton = document.querySelector("#reveal-work-view-button");
const hideWorkViewButton = document.querySelector("#hide-work-view-button");
const refreshScreenButton = document.querySelector("#refresh-screen-button");
const clickActionButton = document.querySelector("#click-action-button");
const typeActionButton = document.querySelector("#type-action-button");
const healBrowserButton = document.querySelector("#heal-browser-button");
const completeTaskButton = document.querySelector("#complete-task-button");
const pauseButton = document.querySelector("#pause-button");
const stopButton = document.querySelector("#stop-button");
const openWorkViewUrlButton = document.querySelector("#open-work-view-url-button");
const workViewUrlInput = document.querySelector("#work-view-url-input");
let currentTaskState = null;

function setHealthPill(target, ok, text) {
  target.textContent = text;
  target.className = ok ? "status-pill" : "status-pill warn";
}

function formatTimestamp(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function setControlMessage(message) {
  controlResult.textContent = message;
}

function getDesiredWorkViewUrl() {
  const value = workViewUrlInput.value.trim();
  return value || "https://example.com/work-view";
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { ok: false, error: await response.text() };

  if (!response.ok) {
    throw new Error(payload?.error ?? \`Request failed with status \${response.status}\`);
  }

  return payload;
}

function addEventItem(event) {
  const item = document.createElement("li");
  item.textContent = \`[\${event.timestamp}] \${event.type} from \${event.source}\`;
  eventsList.prepend(item);
  while (eventsList.children.length > 30) {
    eventsList.removeChild(eventsList.lastChild);
  }
}

async function refreshHealth() {
  try {
    const [core, hub, sessionManager, screen, screenAct, systemSense, systemHeal] = await Promise.all([
      fetchJson(\`\${observerConfig.coreUrl}/health\`),
      fetchJson(\`\${observerConfig.eventHubUrl}/health\`),
      fetchJson(\`\${observerConfig.sessionManagerUrl}/health\`),
      fetchJson(\`\${observerConfig.screenSenseUrl}/health\`),
      fetchJson(\`\${observerConfig.screenActUrl}/health\`),
      fetchJson(\`\${observerConfig.systemSenseUrl}/health\`),
      fetchJson(\`\${observerConfig.systemHealUrl}/health\`),
    ]);

    setHealthPill(coreHealth, !!core.ok, core.ok ? "healthy" : "unhealthy");
    setHealthPill(eventhubHealth, !!hub.ok, hub.ok ? "healthy" : "unhealthy");
    setHealthPill(sessionManagerHealth, !!sessionManager.ok, sessionManager.ok ? "healthy" : "unhealthy");
    setHealthPill(screenHealth, !!screen.ok, screen.ok ? "healthy" : "unhealthy");
    setHealthPill(screenActHealth, !!screenAct.ok, screenAct.ok ? "healthy" : "unhealthy");
    setHealthPill(systemHealthPill, !!systemSense.ok, systemSense.ok ? "healthy" : "unhealthy");
    setHealthPill(systemHealHealth, !!systemHeal.ok, systemHeal.ok ? "healthy" : "unhealthy");
  } catch (error) {
    setHealthPill(coreHealth, false, "offline");
    setHealthPill(eventhubHealth, false, "offline");
    setHealthPill(sessionManagerHealth, false, "offline");
    setHealthPill(screenHealth, false, "offline");
    setHealthPill(screenActHealth, false, "offline");
    setHealthPill(systemHealthPill, false, "offline");
    setHealthPill(systemHealHealth, false, "offline");
  }
}

async function refreshRuntime() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/state/runtime\`);
    const currentTask = data.currentTask ?? null;
    currentTaskState = currentTask;
    runtimeStatus.textContent = data.runtime.status;
    runtimeTask.textContent = currentTask ? currentTask.goal : "none";
    runtimePaused.textContent = String(data.runtime.paused);
    runtimeCount.textContent = String(data.taskCount);
    runtimeUpdated.textContent = data.runtime.lastUpdatedAt;
    taskJson.textContent = currentTask
      ? [
          \`ID: \${currentTask.id}\`,
          \`Goal: \${currentTask.goal}\`,
          \`Type: \${currentTask.type}\`,
          \`Status: \${currentTask.status}\`,
          \`Phase: \${currentTask.executionPhase ?? "queued"}\`,
          \`Target URL: \${currentTask.targetUrl ?? "none"}\`,
          \`Work View Strategy: \${currentTask.workViewStrategy ?? "none"}\`,
          \`Work View Session: \${currentTask.workView?.sessionId ?? "none"}\`,
          \`Work View Status: \${currentTask.workView?.status ?? "none"} / \${currentTask.workView?.visibility ?? "none"}\`,
          \`Work View URL: \${currentTask.workView?.activeUrl ?? "none"}\`,
          \`Recent Phases: \${(currentTask.phaseHistory ?? [])
            .slice(-4)
            .map((entry) => entry.phase)
            .join(" -> ") || "none"}\`,
          \`Created: \${formatTimestamp(currentTask.createdAt)}\`,
          \`Updated: \${formatTimestamp(currentTask.updatedAt)}\`,
        ].join("\\n")
      : "No active task.";
  } catch {
    currentTaskState = null;
    runtimeStatus.textContent = "offline";
    taskJson.textContent = "Unable to read runtime state.";
  }
}

async function refreshWorkView() {
  try {
    const data = await fetchJson(\`\${observerConfig.sessionManagerUrl}/work-view/state\`);
    const workView = data.workView ?? {};
    workViewStatus.textContent = workView.status ?? "unknown";
    workViewVisibility.textContent = workView.visibility ?? "unknown";
    workViewMode.textContent = workView.mode ?? "unknown";
    workViewHelper.textContent = workView.helperStatus ?? "unknown";
    workViewCapture.textContent = workView.captureStrategy ?? "unknown";
    if (document.activeElement !== workViewUrlInput) {
      workViewUrlInput.value = workView.activeUrl ?? workView.entryUrl ?? "https://example.com/work-view";
    }
    workViewJson.textContent = [
      \`Session: \${data.session?.status ?? "unknown"}\`,
      \`Session ID: \${data.session?.sessionId ?? "none"}\`,
      \`Display: \${workView.displayTarget ?? "unknown"}\`,
      \`Browser: \${workView.browserStatus ?? "unknown"}\`,
      \`Entry URL: \${workView.entryUrl ?? "none"}\`,
      \`Active URL: \${workView.activeUrl ?? "none"}\`,
      \`Prepared: \${formatTimestamp(workView.preparedAt)}\`,
      \`Revealed: \${formatTimestamp(workView.lastRevealedAt)}\`,
      \`Hidden: \${formatTimestamp(workView.lastHiddenAt)}\`,
      \`Updated: \${formatTimestamp(workView.updatedAt)}\`,
    ].join("\\n");
  } catch {
    workViewStatus.textContent = "offline";
    workViewVisibility.textContent = "offline";
    workViewMode.textContent = "offline";
    workViewHelper.textContent = "offline";
    workViewCapture.textContent = "offline";
    workViewJson.textContent = "Unable to read work view state.";
  }
}

async function refreshScreen() {
  try {
    const data = await fetchJson(\`\${observerConfig.screenSenseUrl}/screen/current\`);
    const screen = data.screen;
    screenWindow.textContent = screen.focusedWindow?.title ?? "none";
    screenSession.textContent = screen.sessionId ?? "none";
    screenReadiness.textContent = screen.readiness ?? "unknown";
    screenCaptureSource.textContent = screen.captureSource ?? "unknown";
    screenSummary.textContent = screen.summary;
    screenSnapshot.textContent = screen.snapshotText ?? "No snapshot text.";
  } catch {
    screenWindow.textContent = "offline";
    screenSession.textContent = "unknown";
    screenReadiness.textContent = "degraded";
    screenCaptureSource.textContent = "unavailable";
    screenSummary.textContent = "Unable to read screen state.";
    screenSnapshot.textContent = "No screen preview available.";
  }
}

async function refreshActionState() {
  try {
    const data = await fetchJson(\`\${observerConfig.screenActUrl}/act/state\`);
    const state = data.state;
    actionKind.textContent = state.lastAction?.kind ?? "none";
    actionCount.textContent = String(state.actionCount ?? 0);
    actionDegraded.textContent = String(state.lastAction?.degraded ?? false);
    actionJson.textContent = state.lastAction
      ? [
          \`Result: \${state.lastAction.result}\`,
          \`Executed: \${formatTimestamp(state.lastAction.executedAt)}\`,
          \`Window: \${state.lastAction.screenContext?.focusedWindow?.title ?? "none"}\`,
          \`Session: \${state.lastAction.screenContext?.sessionId ?? "none"}\`,
        ].join("\\n")
      : "No action executed yet.";
  } catch {
    actionKind.textContent = "offline";
    actionCount.textContent = "0";
    actionDegraded.textContent = "unknown";
    actionJson.textContent = "Unable to read action state.";
  }
}

async function refreshSystemState() {
  try {
    const data = await fetchJson(\`\${observerConfig.systemSenseUrl}/system/health\`);
    const system = data.system;
    const onlineCount = Object.values(system.services).filter((service) => service.ok).length;
    systemServicesOnline.textContent = String(onlineCount);
    systemAlertCount.textContent = String(system.alerts.length);
    systemSummary.textContent = [
      \`CPU: \${system.resources?.cpuPercent ?? 0}%\`,
      \`Memory: \${system.resources?.memoryPercent ?? 0}%\`,
      \`Disk: \${system.resources?.diskPercent ?? 0}%\`,
      \`Alerts: \${system.alerts?.length ?? 0}\`,
    ].join("\\n");
  } catch {
    systemServicesOnline.textContent = "0";
    systemAlertCount.textContent = "0";
    systemSummary.textContent = "Unable to read system state.";
  }
}

async function refreshHealState() {
  try {
    const data = await fetchJson(\`\${observerConfig.systemHealUrl}/heal/history\`);
    healCount.textContent = String(data.count ?? 0);
    const latest = data.items?.[0] ?? null;
    healSummary.textContent = latest
      ? [
          \`Action: \${latest.action}\`,
          \`Service: \${latest.service}\`,
          \`Status: \${latest.status}\`,
          \`Completed: \${formatTimestamp(latest.completedAt)}\`,
        ].join("\\n")
      : "No heal actions yet.";
  } catch {
    healCount.textContent = "0";
    healSummary.textContent = "Unable to read heal history.";
  }
}

async function loadRecentEvents() {
  try {
    const data = await fetchJson(\`\${observerConfig.eventHubUrl}/events/recent\`);
    eventsList.innerHTML = "";
    for (const event of [...data.items].reverse()) {
      addEventItem(event);
    }
  } catch {
    eventsList.innerHTML = "<li>Unable to load recent events.</li>";
  }
}

async function createDemoTask() {
  const targetUrl = getDesiredWorkViewUrl();
  const result = await fetchJson(\`\${observerConfig.coreUrl}/tasks\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      goal: \`Open the AI work view at \${targetUrl}\`,
      type: "browser_task",
      targetUrl,
      workViewStrategy: "ai-work-view",
    }),
  });
  await updateTaskPhase(result.task?.id, "preparing_work_view", {
    targetUrl,
    displayTarget: "workspace-2",
  });
  const workViewResult = await openWorkViewUrl(result.task?.id);
  await attachTaskToWorkView(result.task?.id, workViewResult);
  setControlMessage(\`Created task \${result.task?.id ?? "unknown"} for \${targetUrl}\`);
  await refreshRuntime();
  await refreshWorkView();
  await refreshScreen();
}

async function postWorkView(path, payload = {}) {
  const result = await fetchJson(\`\${observerConfig.sessionManagerUrl}\${path}\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (currentTaskState?.id) {
    const phase =
      path === "/work-view/prepare"
        ? "preparing_work_view"
        : path === "/work-view/reveal"
          ? "visible"
          : path === "/work-view/hide"
            ? "backgrounded"
            : null;
    if (phase) {
      await updateTaskPhase(currentTaskState.id, phase, {
        visibility: result.workView?.visibility ?? null,
        mode: result.workView?.mode ?? null,
      });
    }
  }
  setControlMessage(\`Work view \${result.workView?.status ?? "updated"} / \${result.workView?.visibility ?? "unknown"}\`);
  await refreshRuntime();
  await refreshWorkView();
  await refreshScreen();
}

async function openWorkViewUrl(taskId = null) {
  const entryUrl = getDesiredWorkViewUrl();
  if (taskId) {
    await updateTaskPhase(taskId, "opening_target", {
      targetUrl: entryUrl,
    });
  }
  const prepareResult = await fetchJson(\`\${observerConfig.sessionManagerUrl}/work-view/prepare\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      displayTarget: "workspace-2",
      entryUrl,
    }),
  });

  const revealResult = await fetchJson(\`\${observerConfig.sessionManagerUrl}/work-view/reveal\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ entryUrl }),
  });

  setControlMessage(\`Opened work view URL: \${revealResult.workView?.activeUrl ?? prepareResult.workView?.activeUrl ?? entryUrl}\`);
  await refreshWorkView();
  await refreshScreen();
  return revealResult;
}

async function updateTaskPhase(taskId, phase, details = null) {
  if (!taskId || !phase) {
    return null;
  }

  return fetchJson(\`\${observerConfig.coreUrl}/tasks/\${taskId}/phase\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phase,
      status: "running",
      details,
    }),
  });
}

async function attachTaskToWorkView(taskId, workViewResult) {
  if (!taskId || !workViewResult?.workView) {
    return;
  }

  await fetchJson(\`\${observerConfig.coreUrl}/tasks/\${taskId}/attach-work-view\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: workViewResult.session?.sessionId ?? null,
      status: workViewResult.workView?.status ?? "ready",
      visibility: workViewResult.workView?.visibility ?? "visible",
      mode: workViewResult.workView?.mode ?? "foreground-observable",
      helperStatus: workViewResult.workView?.helperStatus ?? "active",
      displayTarget: workViewResult.workView?.displayTarget ?? "workspace-2",
      activeUrl: workViewResult.workView?.activeUrl ?? getDesiredWorkViewUrl(),
    }),
  });
}

async function postControl(path) {
  const result = await fetchJson(\`\${observerConfig.coreUrl}\${path}\`, {
    method: "POST",
  });
  setControlMessage(\`Control request completed: \${path}\`);
  await refreshRuntime();
}

async function refreshScreenNow() {
  const result = await fetchJson(\`\${observerConfig.screenSenseUrl}/screen/refresh\`, {
    method: "POST",
  });
  setControlMessage(\`Screen refreshed: \${result.screen?.readiness ?? "unknown"}\`);
  await refreshScreen();
}

async function runAction(path, payload) {
  const result = await fetchJson(\`\${observerConfig.screenActUrl}\${path}\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (currentTaskState?.id) {
    await updateTaskPhase(currentTaskState.id, "acting_on_target", {
      actionKind: result.action?.kind ?? null,
      degraded: result.action?.degraded ?? false,
    });
  }
  setControlMessage(\`Action \${result.action?.kind ?? "unknown"} completed (\${result.action?.result ?? "unknown"})\`);
  await refreshRuntime();
  await refreshActionState();
  await refreshScreen();
  await refreshWorkView();
}

async function runHeal(service) {
  const result = await fetchJson(\`\${observerConfig.systemHealUrl}/heal/restart-service\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ service }),
  });
  setControlMessage(\`Heal completed for \${result.entry?.service ?? service}\`);
  await refreshHealState();
}

async function completeCurrentTask() {
  if (!currentTaskState?.id) {
    throw new Error("No active task to complete.");
  }

  const result = await fetchJson(\`\${observerConfig.coreUrl}/tasks/\${currentTaskState.id}/complete\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      details: {
        targetUrl: currentTaskState.targetUrl ?? null,
        workViewUrl: currentTaskState.workView?.activeUrl ?? null,
      },
    }),
  });

  setControlMessage(\`Completed task \${result.task?.id ?? currentTaskState.id}\`);
  await refreshRuntime();
  await refreshWorkView();
}

function subscribeEvents() {
  const stream = new EventSource(\`\${observerConfig.eventHubUrl}/events/stream\`);
  stream.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data);
      addEventItem(event);
    } catch (error) {
      console.error("Unable to parse event stream payload", error);
    }
  };

  for (const eventName of [
    "task.created",
    "task.phase_changed",
    "task.running",
    "task.completed",
    "task.paused",
    "task.failed",
    "service.started",
    "browser.started",
    "browser.updated",
    "screen.updated",
    "action.completed",
    "service.failed",
    "heal.started",
    "heal.completed",
  ]) {
    stream.addEventListener(eventName, async (message) => {
      try {
        addEventItem(JSON.parse(message.data));
        await refreshRuntime();
        await refreshWorkView();
        if (
          eventName === "screen.updated"
          || eventName === "service.started"
          || eventName === "browser.started"
          || eventName === "browser.updated"
          || eventName === "action.completed"
        ) {
          await refreshScreen();
        }
        if (eventName === "action.completed" || eventName === "service.started") {
          await refreshActionState();
        }
        if (eventName === "service.failed" || eventName === "service.started") {
          await refreshSystemState();
        }
        if (eventName === "heal.started" || eventName === "heal.completed" || eventName === "service.started") {
          await refreshHealState();
        }
      } catch (error) {
        console.error("Unable to process named event", error);
      }
    });
  }
}

createTaskButton.addEventListener("click", () => {
  createDemoTask().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

prepareWorkViewButton.addEventListener("click", () => {
  postWorkView("/work-view/prepare", {
    displayTarget: "workspace-2",
    entryUrl: getDesiredWorkViewUrl(),
  }).catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

revealWorkViewButton.addEventListener("click", () => {
  postWorkView("/work-view/reveal", {
    entryUrl: getDesiredWorkViewUrl(),
  }).catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

hideWorkViewButton.addEventListener("click", () => {
  postWorkView("/work-view/hide").catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

refreshScreenButton.addEventListener("click", () => {
  refreshScreenNow().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

clickActionButton.addEventListener("click", () => {
  runAction("/act/mouse/click", {
    x: 640,
    y: 360,
    button: "left",
  }).catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

typeActionButton.addEventListener("click", () => {
  runAction("/act/keyboard/type", {
    text: "hello from openclaw-screen-act",
  }).catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

healBrowserButton.addEventListener("click", () => {
  runHeal("openclaw-browser-runtime").catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

completeTaskButton.addEventListener("click", () => {
  completeCurrentTask().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

pauseButton.addEventListener("click", () => {
  postControl("/control/pause").catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

stopButton.addEventListener("click", () => {
  postControl("/control/stop").catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

openWorkViewUrlButton.addEventListener("click", () => {
  openWorkViewUrl().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

await refreshHealth();
await refreshRuntime();
await refreshWorkView();
await refreshScreen();
await refreshActionState();
await refreshSystemState();
await refreshHealState();
await loadRecentEvents();
setControlMessage("Controls ready.");
subscribeEvents();
setInterval(refreshHealth, 5000);
setInterval(refreshRuntime, 5000);
setInterval(refreshWorkView, 5000);
setInterval(refreshScreen, 5000);
setInterval(refreshActionState, 5000);
setInterval(refreshSystemState, 5000);
setInterval(refreshHealState, 5000);`;
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "observer-ui",
      stage: "active",
      coreUrl,
      eventHubUrl,
      sessionManagerUrl,
      screenSenseUrl,
      screenActUrl,
      systemSenseUrl,
      systemHealUrl,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/client.js") {
    sendJavaScript(res, clientScript());
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/") {
    sendHtml(res, observerHtml());
    return;
  }

  sendJson(res, 404, { ok: false, error: "Route not found." });
});

server.listen(port, host, () => {
  console.log(`observer-ui listening on http://${host}:${port}`);
});
