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
      .actions.tight {
        gap: 8px;
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
      .task-list {
        display: grid;
        gap: 12px;
      }
      .task-card {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 12px;
        background: rgba(10, 16, 34, 0.66);
      }
      .task-card.selected {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px rgba(110, 231, 200, 0.35);
      }
      .task-card.active {
        border-color: rgba(110, 231, 200, 0.6);
      }
      .task-card h3 {
        margin: 0 0 8px;
        font-size: 14px;
      }
      .task-card-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .task-card-actions button {
        padding: 8px 12px;
        font-size: 12px;
      }
      .task-card-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }
      .task-card-top h3 {
        flex: 1;
      }
      .task-status-group {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .task-section {
        display: grid;
        gap: 12px;
      }
      .task-section h3 {
        margin: 0;
        font-size: 13px;
        color: var(--muted);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .task-summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px 14px;
        margin-bottom: 14px;
      }
      .task-summary-grid .metric {
        margin: 0;
      }
      .hint {
        color: var(--muted);
        font-size: 12px;
      }
      .detail-meta {
        margin-top: 12px;
        margin-bottom: 12px;
        color: var(--muted);
        font-size: 12px;
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
              <label for="work-view-url-input">Desired Work View URL</label>
              <input id="work-view-url-input" type="text" value="https://example.com/work-view" spellcheck="false" />
              <div class="hint" id="work-view-url-hint">Desired URL for the next open, task, or recovery action.</div>
            </div>
            <div class="actions">
              <button id="create-task-button">Create Demo Task</button>
              <button id="create-planned-task-button">Create Planned Task</button>
              <button id="operator-step-button" class="secondary">Operator Step</button>
              <button id="operator-run-button" class="secondary">Operator Run</button>
              <button id="recover-latest-task-button" class="secondary">Recover Latest Finished Task</button>
              <button id="recover-latest-failed-task-button" class="secondary">Recover Latest Failed Task</button>
              <button id="load-history-button" class="secondary">Load Latest Task History</button>
              <button id="follow-active-url-button" class="secondary">Follow Active URL</button>
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
              <button id="resume-button" class="secondary">Resume Current Task</button>
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
          <h2>Task Plan</h2>
          <div class="metric"><span>Status</span><span id="task-plan-status">none</span></div>
          <div class="metric"><span>Steps</span><span id="task-plan-count">0</span></div>
          <div class="metric"><span>Planner</span><span id="task-plan-planner">none</span></div>
          <div class="metric"><span>Capabilities</span><span id="task-plan-capability-count">0</span></div>
          <div class="metric"><span>Approval Gates</span><span id="task-plan-approval-gates">0</span></div>
          <pre id="task-plan-json">No task plan selected.</pre>
        </section>
        <section class="panel">
          <h2>Operator Loop</h2>
          <div class="metric"><span>Status</span><span id="operator-loop-status">idle</span></div>
          <div class="metric"><span>Blocked</span><span id="operator-loop-blocked">false</span></div>
          <div class="metric"><span>Next Task</span><span id="operator-loop-next">none</span></div>
          <div class="metric"><span>Last Run</span><span id="operator-loop-ran">none</span></div>
          <div class="metric"><span>Steps</span><span id="operator-loop-count">0</span></div>
          <pre id="operator-loop-json">No operator run yet.</pre>
        </section>
        <section class="panel">
          <h2>Command Transcript</h2>
          <div class="metric"><span>Entries</span><span id="command-transcript-count">0</span></div>
          <div class="metric"><span>Executed</span><span id="command-transcript-executed">0</span></div>
          <div class="metric"><span>Skipped</span><span id="command-transcript-skipped">0</span></div>
          <div class="metric"><span>Failed</span><span id="command-transcript-failed">0</span></div>
          <pre id="command-transcript-json">No command transcript yet.</pre>
        </section>
        <section class="panel">
          <h2>Policy Governance</h2>
          <div class="metric"><span>Engine</span><span id="policy-engine">policy-v0</span></div>
          <div class="metric"><span>Last Decision</span><span id="policy-decision">none</span></div>
          <div class="metric"><span>Domain</span><span id="policy-domain">none</span></div>
          <div class="metric"><span>Audit Entries</span><span id="policy-audit-count">0</span></div>
          <pre id="policy-json">Loading policy state...</pre>
        </section>
        <section class="panel">
          <h2>Approval Inbox</h2>
          <div class="metric"><span>Pending</span><span id="approval-pending-count">0</span></div>
          <div class="metric"><span>Latest</span><span id="approval-latest">none</span></div>
          <div class="actions tight">
            <button id="approve-latest-button" class="secondary">Approve Latest</button>
            <button id="deny-latest-button" class="secondary">Deny Latest</button>
          </div>
          <pre id="approval-json">Loading approval inbox...</pre>
        </section>
        <section class="panel">
          <h2>Body Capabilities</h2>
          <div class="metric"><span>Registry</span><span id="capability-registry">capability-v0</span></div>
          <div class="metric"><span>Online</span><span id="capability-online">0</span></div>
          <div class="metric"><span>Approval Gates</span><span id="capability-approval">0</span></div>
          <div class="actions tight">
            <button id="invoke-vitals-button" class="secondary">Invoke Vitals</button>
            <button id="invoke-process-button" class="secondary">Invoke Processes</button>
            <button id="invoke-command-dry-run-button" class="secondary">Blocked Command Dry Run</button>
            <button id="invoke-approved-command-dry-run-button" class="secondary">Approved Dry Run</button>
          </div>
          <pre id="capability-json">Loading body capabilities...</pre>
          <pre id="capability-invoke-json">No capability invocation yet.</pre>
        </section>
        <section class="panel">
          <h2>Capability History</h2>
          <div class="metric"><span>Total</span><span id="capability-history-total">0</span></div>
          <div class="metric"><span>Invoked</span><span id="capability-history-invoked">0</span></div>
          <div class="metric"><span>Blocked</span><span id="capability-history-blocked">0</span></div>
          <div class="metric"><span>Latest</span><span id="capability-history-latest">none</span></div>
          <pre id="capability-history-json">Loading capability invocation history...</pre>
        </section>
        <section class="panel">
          <h2>Command Ledger</h2>
          <div class="metric"><span>Total</span><span id="command-ledger-total">0</span></div>
          <div class="metric"><span>Executed</span><span id="command-ledger-executed">0</span></div>
          <div class="metric"><span>Failed</span><span id="command-ledger-failed">0</span></div>
          <div class="metric"><span>Skipped</span><span id="command-ledger-skipped">0</span></div>
          <div class="metric"><span>Tasks</span><span id="command-ledger-tasks">0</span></div>
          <pre id="command-ledger-json">Loading command transcript ledger...</pre>
        </section>
        <section class="panel">
          <h2>Recent Tasks</h2>
          <div class="metric"><span>Entries</span><span id="task-list-count">0</span></div>
          <div class="task-summary-grid">
            <div class="metric"><span>Active</span><span id="task-active-count">0</span></div>
            <div class="metric"><span>Recoverable</span><span id="task-recoverable-count">0</span></div>
            <div class="metric"><span>Failed</span><span id="task-failed-count">0</span></div>
            <div class="metric"><span>Completed</span><span id="task-completed-count">0</span></div>
            <div class="metric"><span>Superseded</span><span id="task-superseded-count">0</span></div>
            <div class="metric"><span>Queued</span><span id="task-queued-count">0</span></div>
          </div>
          <div id="task-list-items" class="task-list"></div>
        </section>
        <section class="panel">
          <h2>Task History Detail</h2>
          <div class="field">
            <label for="task-detail-id-input">Task Detail ID</label>
            <input id="task-detail-id-input" type="text" value="" spellcheck="false" placeholder="Task ID to inspect or recover" />
          </div>
          <div class="actions" style="margin-top: 12px;">
            <button id="load-current-task-button" class="secondary">Load Current Task</button>
            <button id="load-latest-failed-task-button" class="secondary">Load Latest Failed Task</button>
            <button id="load-selected-task-button" class="secondary">Load Selected Task</button>
            <button id="recover-selected-task-button" class="secondary">Recover Selected Task</button>
            <button id="use-detail-url-button" class="secondary">Use Detail URL</button>
          </div>
          <div class="detail-meta" id="task-history-meta">Viewing latest finished task.</div>
          <pre id="task-history-json">Loading task history detail...</pre>
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
          <div class="metric"><span>Body Uptime</span><span id="system-body-uptime">0s</span></div>
          <pre id="system-summary">Loading system state...</pre>
        </section>
        <section class="panel">
          <h2>Heal History</h2>
          <div class="metric"><span>Entries</span><span id="heal-count">0</span></div>
          <pre id="heal-summary">No heal actions yet.</pre>
        </section>
        <section class="panel">
          <h2>Audit Ledger</h2>
          <div class="metric"><span>Persisted Events</span><span id="audit-total">0</span></div>
          <div class="metric"><span>Event Types</span><span id="audit-type-count">0</span></div>
          <div class="metric"><span>Sources</span><span id="audit-source-count">0</span></div>
          <pre id="audit-summary">Loading audit ledger...</pre>
        </section>
        <section class="panel" style="grid-column: 1 / -1;">
          <h2>Recent Events</h2>
          <ul id="events-list"></ul>
        </section>
      </div>
    </main>
    <script type="module" src="/client-v5.js"></script>
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
const taskListCount = document.querySelector("#task-list-count");
const taskActiveCount = document.querySelector("#task-active-count");
const taskRecoverableCount = document.querySelector("#task-recoverable-count");
const taskFailedCount = document.querySelector("#task-failed-count");
const taskCompletedCount = document.querySelector("#task-completed-count");
const taskSupersededCount = document.querySelector("#task-superseded-count");
const taskQueuedCount = document.querySelector("#task-queued-count");
const taskListItems = document.querySelector("#task-list-items");
const taskHistoryJson = document.querySelector("#task-history-json");
const taskHistoryMeta = document.querySelector("#task-history-meta");
const taskDetailIdInput = document.querySelector("#task-detail-id-input");
const workViewUrlHint = document.querySelector("#work-view-url-hint");
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
const systemBodyUptime = document.querySelector("#system-body-uptime");
const systemSummary = document.querySelector("#system-summary");
const healCount = document.querySelector("#heal-count");
const healSummary = document.querySelector("#heal-summary");
const auditTotal = document.querySelector("#audit-total");
const auditTypeCount = document.querySelector("#audit-type-count");
const auditSourceCount = document.querySelector("#audit-source-count");
const auditSummary = document.querySelector("#audit-summary");
const createTaskButton = document.querySelector("#create-task-button");
const createPlannedTaskButton = document.querySelector("#create-planned-task-button");
const operatorStepButton = document.querySelector("#operator-step-button");
const operatorRunButton = document.querySelector("#operator-run-button");
const recoverLatestTaskButton = document.querySelector("#recover-latest-task-button");
const recoverLatestFailedTaskButton = document.querySelector("#recover-latest-failed-task-button");
const loadHistoryButton = document.querySelector("#load-history-button");
const followActiveUrlButton = document.querySelector("#follow-active-url-button");
const loadCurrentTaskButton = document.querySelector("#load-current-task-button");
const loadLatestFailedTaskButton = document.querySelector("#load-latest-failed-task-button");
const loadSelectedTaskButton = document.querySelector("#load-selected-task-button");
const recoverSelectedTaskButton = document.querySelector("#recover-selected-task-button");
const useDetailUrlButton = document.querySelector("#use-detail-url-button");
const prepareWorkViewButton = document.querySelector("#prepare-work-view-button");
const revealWorkViewButton = document.querySelector("#reveal-work-view-button");
const hideWorkViewButton = document.querySelector("#hide-work-view-button");
const refreshScreenButton = document.querySelector("#refresh-screen-button");
const clickActionButton = document.querySelector("#click-action-button");
const typeActionButton = document.querySelector("#type-action-button");
const healBrowserButton = document.querySelector("#heal-browser-button");
const completeTaskButton = document.querySelector("#complete-task-button");
const pauseButton = document.querySelector("#pause-button");
const resumeButton = document.querySelector("#resume-button");
const stopButton = document.querySelector("#stop-button");
const openWorkViewUrlButton = document.querySelector("#open-work-view-url-button");
const workViewUrlInput = document.querySelector("#work-view-url-input");
const taskPlanStatus = document.querySelector("#task-plan-status");
const taskPlanCount = document.querySelector("#task-plan-count");
const taskPlanPlanner = document.querySelector("#task-plan-planner");
const taskPlanCapabilityCount = document.querySelector("#task-plan-capability-count");
const taskPlanApprovalGates = document.querySelector("#task-plan-approval-gates");
const taskPlanJson = document.querySelector("#task-plan-json");
const operatorLoopStatus = document.querySelector("#operator-loop-status");
const operatorLoopBlocked = document.querySelector("#operator-loop-blocked");
const operatorLoopNext = document.querySelector("#operator-loop-next");
const operatorLoopRan = document.querySelector("#operator-loop-ran");
const operatorLoopCount = document.querySelector("#operator-loop-count");
const operatorLoopJson = document.querySelector("#operator-loop-json");
const commandTranscriptCount = document.querySelector("#command-transcript-count");
const commandTranscriptExecuted = document.querySelector("#command-transcript-executed");
const commandTranscriptSkipped = document.querySelector("#command-transcript-skipped");
const commandTranscriptFailed = document.querySelector("#command-transcript-failed");
const commandTranscriptJson = document.querySelector("#command-transcript-json");
const policyEngine = document.querySelector("#policy-engine");
const policyDecision = document.querySelector("#policy-decision");
const policyDomain = document.querySelector("#policy-domain");
const policyAuditCount = document.querySelector("#policy-audit-count");
const policyJson = document.querySelector("#policy-json");
const approvalPendingCount = document.querySelector("#approval-pending-count");
const approvalLatest = document.querySelector("#approval-latest");
const approvalJson = document.querySelector("#approval-json");
const approveLatestButton = document.querySelector("#approve-latest-button");
const denyLatestButton = document.querySelector("#deny-latest-button");
const capabilityRegistry = document.querySelector("#capability-registry");
const capabilityOnline = document.querySelector("#capability-online");
const capabilityApproval = document.querySelector("#capability-approval");
const capabilityJson = document.querySelector("#capability-json");
const capabilityInvokeJson = document.querySelector("#capability-invoke-json");
const invokeVitalsButton = document.querySelector("#invoke-vitals-button");
const invokeProcessButton = document.querySelector("#invoke-process-button");
const invokeCommandDryRunButton = document.querySelector("#invoke-command-dry-run-button");
const invokeApprovedCommandDryRunButton = document.querySelector("#invoke-approved-command-dry-run-button");
const capabilityHistoryTotal = document.querySelector("#capability-history-total");
const capabilityHistoryInvoked = document.querySelector("#capability-history-invoked");
const capabilityHistoryBlocked = document.querySelector("#capability-history-blocked");
const capabilityHistoryLatest = document.querySelector("#capability-history-latest");
const capabilityHistoryJson = document.querySelector("#capability-history-json");
const commandLedgerTotal = document.querySelector("#command-ledger-total");
const commandLedgerExecuted = document.querySelector("#command-ledger-executed");
const commandLedgerFailed = document.querySelector("#command-ledger-failed");
const commandLedgerSkipped = document.querySelector("#command-ledger-skipped");
const commandLedgerTasks = document.querySelector("#command-ledger-tasks");
const commandLedgerJson = document.querySelector("#command-ledger-json");
let currentTaskState = null;
let latestActionState = null;
let latestHistoryTask = null;
let selectedHistoryTaskId = null;
let recentTasksState = [];
let latestTaskSummary = null;
let desiredWorkViewUrl = workViewUrlInput.value.trim() || "https://example.com/work-view";
let desiredWorkViewUrlPinned = false;
let latestWorkViewState = null;
let latestPendingApproval = null;
let taskHistoryFocus = "latest-finished";

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

function formatTaskFocusLabel(focus, task = null) {
  if (focus === "current-task") {
    return task?.id ? \`Viewing current task \${task.id}.\` : "Viewing current task.";
  }
  if (focus === "latest-failed") {
    return task?.id ? \`Viewing latest failed task \${task.id}.\` : "Viewing latest failed task.";
  }
  if (focus === "selected-task") {
    return task?.id ? \`Viewing selected task \${task.id}.\` : "Viewing selected task.";
  }
  return task?.id ? \`Viewing latest finished task \${task.id}.\` : "Viewing latest finished task.";
}

function setControlMessage(message) {
  controlResult.textContent = message;
}

function updateDesiredUrlHint(activeUrl = null) {
  const hintTail = activeUrl ? \`Current active URL: \${activeUrl}\` : "Current active URL: none";
  workViewUrlHint.textContent = desiredWorkViewUrlPinned
    ? \`Pinned desired URL for the next action. \${hintTail}\`
    : \`Desired URL follows the active work view until you pin a new one. \${hintTail}\`;
}

function setDesiredWorkViewUrl(url, { pinned = true } = {}) {
  const nextUrl = typeof url === "string" && url.trim() ? url.trim() : "https://example.com/work-view";
  desiredWorkViewUrl = nextUrl;
  desiredWorkViewUrlPinned = pinned;
  workViewUrlInput.value = nextUrl;
}

function followActiveWorkViewUrl() {
  const nextUrl = latestWorkViewState?.activeUrl ?? latestWorkViewState?.entryUrl ?? "https://example.com/work-view";
  setDesiredWorkViewUrl(nextUrl, { pinned: false });
  updateDesiredUrlHint(latestWorkViewState?.activeUrl ?? latestWorkViewState?.entryUrl ?? null);
  setControlMessage(\`Following active work view URL: \${nextUrl}\`);
}

function deriveTaskLastAction(task) {
  if (task?.lastAction) {
    return task.lastAction;
  }

  const fallback = latestActionState?.lastAction ?? null;
  if (!fallback) {
    return null;
  }

  const taskSessionId = task?.workView?.sessionId ?? null;
  const actionSessionId = fallback.screenContext?.sessionId ?? null;

  if (taskSessionId && actionSessionId && taskSessionId === actionSessionId) {
    return {
      kind: fallback.kind ?? "unknown",
      degraded: Boolean(fallback.degraded),
      at: fallback.executedAt ?? null,
      result: fallback.result ?? null,
    };
  }

  return null;
}

function renderTaskPlan(plan) {
  if (!plan) {
    return "No task plan selected.";
  }

  const steps = Array.isArray(plan.steps) ? plan.steps : [];
  const capabilitySummary = plan.capabilitySummary ?? {};
  return [
    \`Plan ID: \${plan.planId ?? "none"}\`,
    \`Strategy: \${plan.strategy ?? "unknown"}\`,
    \`Planner: \${plan.planner ?? "unknown"}\`,
    \`Status: \${plan.status ?? "unknown"}\`,
    \`Intent: \${plan.intent ?? "unknown"}\`,
    \`Target URL: \${plan.targetUrl ?? "none"}\`,
    \`Steps: \${steps.length}\`,
    \`Capabilities: \${capabilitySummary.total ?? 0} (\${(capabilitySummary.ids ?? []).join(", ") || "none"})\`,
    \`Approval Gates: \${capabilitySummary.approvalGates ?? 0}\`,
    "",
    ...steps.map((step, index) => {
      const status = step.status ?? "pending";
      const title = step.title ?? step.kind ?? step.phase ?? \`step \${index + 1}\`;
      const phase = step.phase ?? "unknown";
      const capability = step.capabilityId ?? "unmapped";
      const risk = step.risk ?? "unknown";
      const governance = step.governance ?? "unknown";
      const approval = step.requiresApproval ? " approval-required" : "";
      return \`\${index + 1}. [\${status}] \${phase} - \${title} :: capability=\${capability} risk=\${risk} governance=\${governance}\${approval}\`;
    }),
  ].join("\\n");
}

function renderPlanPanel(task) {
  const plan = task?.plan ?? null;
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  taskPlanStatus.textContent = plan?.status ?? "none";
  taskPlanCount.textContent = String(steps.length);
  taskPlanPlanner.textContent = plan?.planner ?? plan?.strategy ?? "none";
  taskPlanCapabilityCount.textContent = String(plan?.capabilitySummary?.total ?? 0);
  taskPlanApprovalGates.textContent = String(plan?.capabilitySummary?.approvalGates ?? 0);
  taskPlanJson.textContent = renderTaskPlan(plan);
}

function renderOperatorState(operator) {
  const nextTask = operator?.nextTask ?? null;
  operatorLoopStatus.textContent = operator?.status ?? "idle";
  operatorLoopBlocked.textContent = String(operator?.blocked ?? false);
  operatorLoopNext.textContent = nextTask?.id ? nextTask.id.slice(0, 8) : "none";
}

function renderPolicyState(policy) {
  const lastDecision = Array.isArray(policy?.decisions) ? policy.decisions[0] : null;
  policyEngine.textContent = policy?.engine ?? "policy-v0";
  policyDecision.textContent = lastDecision?.decision ?? "none";
  policyDomain.textContent = lastDecision?.domain ?? "none";
  policyAuditCount.textContent = String(policy?.counts?.total ?? 0);
  policyJson.textContent = [
    \`Mode: \${policy?.mode ?? "unknown"}\`,
    \`Body Internal Default: \${policy?.rules?.bodyInternalDefault ?? "unknown"}\`,
    \`User Task Default: \${policy?.rules?.userTaskDefault ?? "unknown"}\`,
    \`Cross Boundary Default: \${policy?.rules?.crossBoundaryDefault ?? "unknown"}\`,
    \`Decisions: \${policy?.counts?.total ?? 0}\`,
    "",
    ...(policy?.decisions ?? []).slice(0, 6).map((decision) => {
      return \`[\${formatTimestamp(decision.at)}] \${decision.decision} \${decision.domain} \${decision.subject?.intent ?? "unknown"} - \${decision.reason}\`;
    }),
  ].join("\\n");
}

function renderApprovalState(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const pendingItems = items.filter((approval) => approval.status === "pending");
  latestPendingApproval = pendingItems[0] ?? null;
  approvalPendingCount.textContent = String(data?.summary?.pendingCount ?? pendingItems.length);
  approvalLatest.textContent = latestPendingApproval?.id ? latestPendingApproval.id.slice(0, 8) : "none";
  approvalJson.textContent = [
    \`Total: \${data?.summary?.counts?.total ?? 0}\`,
    \`Pending: \${data?.summary?.counts?.pending ?? 0}\`,
    \`Approved: \${data?.summary?.counts?.approved ?? 0}\`,
    \`Denied: \${data?.summary?.counts?.denied ?? 0}\`,
    "",
    ...items.slice(0, 6).map((approval) => {
      return \`[\${approval.status}] \${approval.id} task=\${approval.taskId ?? "none"} \${approval.intent ?? "unknown"} risk=\${approval.risk ?? "unknown"} reason=\${approval.reason ?? "none"}\`;
    }),
  ].join("\\n");
}

function renderCapabilityState(registry) {
  const capabilities = Array.isArray(registry?.capabilities) ? registry.capabilities : [];
  const summary = registry?.summary ?? {};
  const topCapabilities = capabilities
    .slice()
    .sort((left, right) => String(left.kind).localeCompare(String(right.kind)) || String(left.id).localeCompare(String(right.id)))
    .slice(0, 8);

  capabilityRegistry.textContent = registry?.registry ?? "capability-v0";
  capabilityOnline.textContent = \`\${summary.online ?? 0}/\${summary.total ?? 0}\`;
  capabilityApproval.textContent = String(summary.requiresApproval ?? 0);
  capabilityJson.textContent = [
    \`Mode: \${registry?.mode ?? "unknown"}\`,
    \`Kinds: \${Object.entries(summary.byKind ?? {}).map(([kind, count]) => \`\${kind}=\${count}\`).join(", ") || "none"}\`,
    \`Risks: \${Object.entries(summary.byRisk ?? {}).map(([risk, count]) => \`\${risk}=\${count}\`).join(", ") || "none"}\`,
    \`Governance: \${Object.entries(summary.byGovernance ?? {}).map(([rule, count]) => \`\${rule}=\${count}\`).join(", ") || "none"}\`,
    "",
    ...topCapabilities.map((capability) => {
      return \`[\${capability.status ?? "unknown"}] \${capability.id} \${capability.kind} \${capability.risk} governance=\${capability.governance}\`;
    }),
  ].join("\\n");
}

function renderCapabilityInvocation(result) {
  if (!result) {
    capabilityInvokeJson.textContent = "No capability invocation yet.";
    return;
  }

  capabilityInvokeJson.textContent = [
    \`Capability: \${result.capability?.id ?? "unknown"}\`,
    \`Invoked: \${Boolean(result.invoked)}\`,
    \`Blocked: \${Boolean(result.blocked)}\`,
    \`Reason: \${result.reason ?? "none"}\`,
    \`Policy: \${result.policy?.decision ?? "none"} / \${result.policy?.domain ?? "unknown"} / risk=\${result.policy?.risk ?? "unknown"}\`,
    \`Summary: \${JSON.stringify(result.summary ?? {}, null, 2)}\`,
  ].join("\\n");
}

function renderCapabilityHistory(data) {
  const summary = data?.summary ?? {};
  const items = Array.isArray(data?.items) ? data.items : [];
  capabilityHistoryTotal.textContent = String(summary.total ?? 0);
  capabilityHistoryInvoked.textContent = String(summary.invoked ?? 0);
  capabilityHistoryBlocked.textContent = String(summary.blocked ?? 0);
  capabilityHistoryLatest.textContent = summary.latestAt ? formatTimestamp(summary.latestAt) : "none";
  capabilityHistoryJson.textContent = [
    \`Total: \${summary.total ?? 0}\`,
    \`Invoked: \${summary.invoked ?? 0}\`,
    \`Blocked: \${summary.blocked ?? 0}\`,
    \`By Policy: \${Object.entries(summary.byPolicy ?? {}).map(([policy, count]) => \`\${policy}=\${count}\`).join(", ") || "none"}\`,
    \`By Capability: \${Object.entries(summary.byCapability ?? {}).map(([capability, count]) => \`\${capability}=\${count}\`).join(", ") || "none"}\`,
    "",
    ...items.slice(0, 8).map((entry) => {
      const state = entry.blocked ? "blocked" : entry.invoked ? "invoked" : "recorded";
      const decision = entry.policy?.decision ?? "unknown";
      const reason = entry.reason ?? entry.policy?.reason ?? "none";
      return \`[\${formatTimestamp(entry.at)}] \${state} \${entry.capability?.id ?? "unknown"} policy=\${decision} reason=\${reason}\`;
    }),
  ].join("\\n");
}

function extractTaskCommandTranscript(task) {
  return Array.isArray(task?.outcome?.details?.commandTranscript)
    ? task.outcome.details.commandTranscript
    : [];
}

function renderCommandTranscript(transcript, { source = "task" } = {}) {
  const entries = Array.isArray(transcript) ? transcript : [];
  const skipped = entries.filter((entry) => entry.skipped === true);
  const executed = entries.filter((entry) => entry.skipped !== true);
  const failed = executed.filter((entry) => entry.timedOut === true || (Number.isInteger(entry.exitCode) && entry.exitCode !== 0));

  commandTranscriptCount.textContent = String(entries.length);
  commandTranscriptExecuted.textContent = String(executed.length);
  commandTranscriptSkipped.textContent = String(skipped.length);
  commandTranscriptFailed.textContent = String(failed.length);

  if (entries.length === 0) {
    commandTranscriptJson.textContent = "No command transcript yet.";
    return;
  }

  commandTranscriptJson.textContent = [
    \`Source: \${source}\`,
    \`Entries: \${entries.length} executed=\${executed.length} skipped=\${skipped.length} failed=\${failed.length}\`,
    "",
    ...entries.map((entry, index) => {
      const state = entry.skipped === true
        ? \`skipped:\${entry.skipReason ?? "condition"}\`
        : entry.timedOut === true
          ? "failed:timeout"
          : Number.isInteger(entry.exitCode) && entry.exitCode !== 0
            ? \`failed:exit_\${entry.exitCode}\`
            : "executed";
      const stdout = String(entry.stdout ?? "").trim();
      const stderr = String(entry.stderr ?? "").trim();
      return [
        \`\${index + 1}. [\${state}] \${entry.command ?? "unknown"} exit=\${entry.exitCode ?? "n/a"}\`,
        stdout ? \`   stdout: \${stdout}\` : null,
        stderr ? \`   stderr: \${stderr}\` : null,
      ].filter(Boolean).join("\\n");
    }),
  ].join("\\n");
}

function renderCommandTranscriptFromTask(task, { source = "task" } = {}) {
  renderCommandTranscript(extractTaskCommandTranscript(task), { source });
}

function renderCommandLedger(data) {
  const summary = data?.summary ?? {};
  const items = Array.isArray(data?.items) ? data.items : [];
  commandLedgerTotal.textContent = String(summary.total ?? 0);
  commandLedgerExecuted.textContent = String(summary.executed ?? 0);
  commandLedgerFailed.textContent = String(summary.failed ?? 0);
  commandLedgerSkipped.textContent = String(summary.skipped ?? 0);
  commandLedgerTasks.textContent = String(summary.taskCount ?? 0);

  commandLedgerJson.textContent = [
    \`Total: \${summary.total ?? 0}\`,
    \`Executed: \${summary.executed ?? 0}\`,
    \`Failed: \${summary.failed ?? 0}\`,
    \`Skipped: \${summary.skipped ?? 0}\`,
    \`Tasks: \${summary.taskCount ?? 0}\`,
    \`By Command: \${Object.entries(summary.byCommand ?? {}).map(([command, count]) => \`\${command}=\${count}\`).join(", ") || "none"}\`,
    \`By Task Status: \${Object.entries(summary.byTaskStatus ?? {}).map(([status, count]) => \`\${status}=\${count}\`).join(", ") || "none"}\`,
    "",
    ...items.slice(0, 8).map((entry) => {
      const state = entry.state ?? (entry.skipped ? "skipped" : "executed");
      const stdout = String(entry.stdout ?? "").trim();
      return \`[\${state}] task=\${entry.taskId ?? "none"} \${entry.command ?? "unknown"} exit=\${entry.exitCode ?? "n/a"} skip=\${entry.skipReason ?? "none"}\${stdout ? \` stdout=\${stdout}\` : ""}\`;
    }),
  ].join("\\n");
}

function renderOperatorPanel(result) {
  if (!result) {
    renderOperatorState(null);
    operatorLoopRan.textContent = "none";
    operatorLoopCount.textContent = "0";
    operatorLoopJson.textContent = "No operator run yet.";
    return;
  }

  const steps = Array.isArray(result.steps) ? result.steps : result.task ? [result] : [];
  const operator = result.operator ?? null;
  const nextTask = result.nextTask ?? operator?.nextTask ?? null;
  const latestCommandTranscript = steps
    .map((step) => step.execution?.commandTranscript)
    .find((transcript) => Array.isArray(transcript) && transcript.length > 0);
  renderOperatorState({
    status: operator?.status ?? (result.blocked ? "paused" : result.ran ? "ran" : "idle"),
    blocked: result.blocked ?? operator?.blocked ?? false,
    nextTask,
  });
  operatorLoopRan.textContent = result.ran ? "yes" : "no";
  operatorLoopCount.textContent = String(result.count ?? steps.length);
  operatorLoopJson.textContent = [
    \`Ran: \${Boolean(result.ran)}\`,
    \`Blocked: \${Boolean(result.blocked ?? operator?.blocked)}\`,
    \`Reason: \${result.reason ?? operator?.reason ?? "none"}\`,
    \`Steps: \${result.count ?? steps.length}\`,
    \`Runtime: \${result.summary?.runtime?.status ?? result.summary?.status ?? "unknown"}\`,
    \`Next Task: \${nextTask?.id ?? "none"}\`,
    "",
    ...steps.map((step, index) => {
      const task = step.task ?? null;
      const verification = step.execution?.verification ?? null;
      return \`\${index + 1}. \${task?.id ?? "no-task"} \${task?.status ?? "idle"} \${task?.targetUrl ?? ""} verification=\${verification?.ok ?? "n/a"}\`;
    }),
  ].join("\\n");
  if (latestCommandTranscript) {
    renderCommandTranscript(latestCommandTranscript, { source: "operator" });
  }
}

async function refreshOperatorState() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/operator/state\`);
    renderOperatorState(data.operator);
    if (operatorLoopJson.textContent === "No operator run yet." || operatorLoopJson.textContent === "Unable to read operator state.") {
      operatorLoopJson.textContent = [
        \`Status: \${data.operator?.status ?? "idle"}\`,
        \`Blocked: \${Boolean(data.operator?.blocked)}\`,
        \`Reason: \${data.operator?.reason ?? "none"}\`,
        \`Next Task: \${data.operator?.nextTask?.id ?? "none"}\`,
      ].join("\\n");
    }
  } catch {
    operatorLoopStatus.textContent = "offline";
    operatorLoopBlocked.textContent = "unknown";
    operatorLoopNext.textContent = "unknown";
    operatorLoopJson.textContent = "Unable to read operator state.";
  }
}

async function refreshPolicyState() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/policy/state\`);
    renderPolicyState(data.policy);
  } catch {
    policyEngine.textContent = "offline";
    policyDecision.textContent = "unknown";
    policyDomain.textContent = "unknown";
    policyJson.textContent = "Unable to read policy state.";
  }
}

async function refreshApprovalState() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/approvals?limit=10\`);
    renderApprovalState(data);
  } catch {
    latestPendingApproval = null;
    approvalPendingCount.textContent = "0";
    approvalLatest.textContent = "unknown";
    approvalJson.textContent = "Unable to read approval inbox.";
  }
}

async function refreshCapabilityState() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/capabilities\`);
    renderCapabilityState(data);
  } catch {
    capabilityRegistry.textContent = "offline";
    capabilityOnline.textContent = "0";
    capabilityApproval.textContent = "unknown";
    capabilityJson.textContent = "Unable to read body capabilities.";
  }
}

async function refreshCapabilityHistory() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/capabilities/invocations?limit=8\`);
    renderCapabilityHistory(data);
  } catch {
    capabilityHistoryTotal.textContent = "0";
    capabilityHistoryInvoked.textContent = "0";
    capabilityHistoryBlocked.textContent = "0";
    capabilityHistoryLatest.textContent = "unknown";
    capabilityHistoryJson.textContent = "Unable to read capability invocation history.";
  }
}

async function refreshCommandLedger() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/commands/transcripts?limit=8\`);
    renderCommandLedger(data);
  } catch {
    commandLedgerTotal.textContent = "0";
    commandLedgerExecuted.textContent = "0";
    commandLedgerFailed.textContent = "0";
    commandLedgerSkipped.textContent = "0";
    commandLedgerTasks.textContent = "unknown";
    commandLedgerJson.textContent = "Unable to read command transcript ledger.";
  }
}

async function invokeCapabilityFromUi(kind) {
  const requests = {
    vitals: {
      capabilityId: "sense.system.vitals",
      intent: "system.observe",
    },
    process: {
      capabilityId: "sense.process.list",
      intent: "process.list",
      params: { limit: 10 },
    },
    commandDryRun: {
      capabilityId: "act.system.command.dry_run",
      intent: "system.command",
      params: { command: "rm", args: ["-rf", "/tmp/openclaw-danger"] },
    },
    approvedCommandDryRun: {
      capabilityId: "act.system.command.dry_run",
      intent: "system.command",
      approved: true,
      params: { command: "rm", args: ["-rf", "/tmp/openclaw-danger"] },
    },
  };
  const body = requests[kind];
  if (!body) {
    throw new Error(\`Unknown capability invocation kind: \${kind}\`);
  }

  const result = await fetchJson(\`\${observerConfig.coreUrl}/capabilities/invoke\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  renderCapabilityInvocation(result);
  setControlMessage(result.invoked
    ? \`Capability invoked: \${result.capability?.id ?? body.capabilityId}\`
    : \`Capability blocked: \${result.reason ?? "unknown"}\`);
  await refreshCapabilityState();
  await refreshCapabilityHistory();
  await refreshPolicyState();
  await refreshAuditState();
}

async function resolveLatestApproval(action) {
  if (!latestPendingApproval?.id) {
    throw new Error("No pending approval request.");
  }

  const result = await fetchJson(\`\${observerConfig.coreUrl}/approvals/\${latestPendingApproval.id}/\${action}\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      reason: action === "approve" ? "Approved from Observer UI." : "Denied from Observer UI.",
    }),
  });
  setControlMessage(\`Approval \${action} completed: \${result.approval?.id ?? latestPendingApproval.id}\`);
  await refreshApprovalState();
  await refreshPolicyState();
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshOperatorState();
}

function renderTaskSummary(task, { includeRecovery = true, includeOutcome = true } = {}) {
  if (!task) {
    return "No task selected.";
  }

  const taskLastAction = deriveTaskLastAction(task);
  const lines = [
    \`ID: \${task.id}\`,
    \`Goal: \${task.goal}\`,
    \`Type: \${task.type}\`,
    \`Status: \${task.status}\`,
    \`Phase: \${task.executionPhase ?? "queued"}\`,
    \`Target URL: \${task.targetUrl ?? "none"}\`,
    \`Work View Strategy: \${task.workViewStrategy ?? "none"}\`,
    \`Work View Session: \${task.workView?.sessionId ?? "none"}\`,
    \`Work View URL: \${task.workView?.activeUrl ?? "none"}\`,
    \`Work View: \${task.workView?.status ?? "none"} / \${task.workView?.visibility ?? "none"}\`,
    \`Policy: \${task.policy?.decision?.decision ?? "none"} / \${task.policy?.decision?.domain ?? "none"}\`,
    \`Task Lens: \${describeTaskRelationship(task)}\`,
  ];

  if (includeOutcome) {
    lines.push(\`Outcome: \${task.outcome?.kind ?? "open"}\${task.outcome?.summary ? \` - \${task.outcome.summary}\` : ""}\`);
    if (task.outcome?.reason) {
      lines.push(\`Failure Reason: \${task.outcome.reason}\`);
    }
  }

  if (includeRecovery) {
    lines.push(\`Recovery: \${task.recovery?.recoveredFromTaskId ? \`attempt \${task.recovery?.attempt ?? 1} from \${task.recovery.recoveredFromTaskId}\` : "original task"}\`);
    lines.push(\`Recovered By: \${task.recoveredByTaskId ?? "none"}\`);
    lines.push(\`Recoverable: \${task.restorable ? "yes" : "no"}\`);
  }

  if (task.plan) {
    const steps = Array.isArray(task.plan.steps) ? task.plan.steps : [];
    const completed = steps.filter((step) => step.status === "completed").length;
    lines.push(\`Plan: \${task.plan.strategy ?? "unknown"} / \${task.plan.status ?? "unknown"}\`);
    lines.push(\`Plan Steps: \${completed}/\${steps.length} completed\`);
  }

  lines.push(\`Last Action: \${taskLastAction?.kind ?? "none"}\${taskLastAction ? \` (degraded: \${taskLastAction.degraded})\` : ""}\`);
  lines.push(\`Recent Phases: \${(task.phaseHistory ?? []).slice(-4).map((entry) => entry.phase).join(" -> ") || "none"}\`);
  lines.push(\`Created: \${formatTimestamp(task.createdAt)}\`);
  lines.push(\`Updated: \${formatTimestamp(task.updatedAt)}\`);
  lines.push(\`Closed: \${formatTimestamp(task.closedAt)}\`);
  return lines.join("\\n");
}

function describeTaskRelationship(task) {
  if (!task) {
    return "none";
  }

  if (task.isCurrentTask) {
    return "current active task";
  }

  if (currentTaskState?.recovery?.recoveredFromTaskId === task.id) {
    return "ancestor of current recovered task";
  }

  if (task.recoveredByTaskId && task.recoveredByTaskId === currentTaskState?.id) {
    return "recovered into current active task";
  }

  if (task.isActive) {
    return "active task";
  }

  if (currentTaskState?.workView?.sessionId && task.workView?.sessionId === currentTaskState.workView.sessionId) {
    return "shares work view session with current task";
  }

  return "historical task";
}

function renderTaskSection(title, tasks) {
  if (!tasks.length) {
    return "";
  }

  return \`<section class="task-section">
    <h3>\${escapeHtml(title)}</h3>
    \${tasks.map((task) => renderTaskCard(task)).join("")}
  </section>\`;
}

function getDesiredWorkViewUrl() {
  return desiredWorkViewUrl || "https://example.com/work-view";
}

function getSelectedHistoryTaskId() {
  const value = taskDetailIdInput.value.trim();
  return value || null;
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
    const taskLastAction = deriveTaskLastAction(currentTask);
    taskJson.textContent = currentTask
      ? renderTaskSummary(currentTask, { includeRecovery: false, includeOutcome: false })
      : "No active task.";
    renderPlanPanel(currentTask ?? latestHistoryTask);
    renderCommandTranscriptFromTask(currentTask ?? latestHistoryTask, { source: currentTask ? "current-task" : "latest-history" });
  } catch {
    currentTaskState = null;
    runtimeStatus.textContent = "offline";
    taskJson.textContent = "Unable to read runtime state.";
    renderPlanPanel(latestHistoryTask);
    renderCommandTranscriptFromTask(latestHistoryTask, { source: "latest-history" });
  }
}

async function refreshTaskList() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/tasks?limit=8\`);
    const items = data.items ?? [];
    latestTaskSummary = data.summary ?? null;
    recentTasksState = items;
    const activeTasks = items.filter((task) => task.isActive);
    const historyTasks = items.filter((task) => !task.isActive);
    const summaryCounts = data.summary?.counts ?? {};
    const activeCount = summaryCounts.active ?? activeTasks.length;
    taskListCount.textContent = \`\${items.length} visible / \${activeCount} active\`;
    taskActiveCount.textContent = String(summaryCounts.active ?? activeTasks.length);
    taskRecoverableCount.textContent = String(summaryCounts.recoverable ?? items.filter((task) => task.restorable).length);
    taskFailedCount.textContent = String(summaryCounts.failed ?? items.filter((task) => task.status === "failed").length);
    taskCompletedCount.textContent = String(summaryCounts.completed ?? items.filter((task) => task.status === "completed").length);
    taskSupersededCount.textContent = String(summaryCounts.superseded ?? items.filter((task) => task.status === "superseded").length);
    taskQueuedCount.textContent = String(summaryCounts.queued ?? items.filter((task) => task.status === "queued").length);
    latestHistoryTask = items.find((task) => task.status !== "running" && task.status !== "queued" && task.status !== "paused")
      ?? items[0]
      ?? null;
    if (!selectedHistoryTaskId && latestHistoryTask?.id) {
      taskDetailIdInput.value = latestHistoryTask.id;
    }
    taskListItems.innerHTML = items.length > 0
      ? [
          renderTaskSection("Active Tasks", activeTasks),
          renderTaskSection("Task History", historyTasks),
        ].filter(Boolean).join("")
      : "<pre>No tasks recorded yet.</pre>";
  } catch {
    recentTasksState = [];
    latestHistoryTask = null;
    latestTaskSummary = null;
    taskListCount.textContent = "0";
    taskActiveCount.textContent = "0";
    taskRecoverableCount.textContent = "0";
    taskFailedCount.textContent = "0";
    taskCompletedCount.textContent = "0";
    taskSupersededCount.textContent = "0";
    taskQueuedCount.textContent = "0";
    taskListItems.innerHTML = "<pre>Unable to read recent tasks.</pre>";
  }
}

async function refreshTaskHistoryDetail() {
  try {
    const explicitTaskId = selectedHistoryTaskId ?? getSelectedHistoryTaskId();
    let historyTask = null;

    if (taskHistoryFocus === "current-task") {
      const data = await fetchJson(\`\${observerConfig.coreUrl}/tasks/focus/current\`);
      historyTask = data.task ?? null;
      latestTaskSummary = data.summary ?? latestTaskSummary;
    } else if (taskHistoryFocus === "latest-failed") {
      const data = await fetchJson(\`\${observerConfig.coreUrl}/tasks/focus/latest-failed\`);
      historyTask = data.task ?? null;
      latestTaskSummary = data.summary ?? latestTaskSummary;
    } else if (taskHistoryFocus === "selected-task" || explicitTaskId) {
      const data = await fetchJson(\`\${observerConfig.coreUrl}/tasks/\${explicitTaskId}\`);
      historyTask = data.task ?? latestHistoryTask ?? null;
    } else {
      const data = await fetchJson(\`\${observerConfig.coreUrl}/tasks/focus/latest-finished\`);
      historyTask = data.task ?? latestHistoryTask ?? null;
      latestTaskSummary = data.summary ?? latestTaskSummary;
    }

    latestHistoryTask = historyTask;
    selectedHistoryTaskId = taskHistoryFocus === "selected-task" || taskHistoryFocus === "latest-failed"
      ? historyTask?.id ?? explicitTaskId ?? null
      : historyTask?.id ?? selectedHistoryTaskId ?? explicitTaskId ?? null;
    if (historyTask?.id && taskHistoryFocus !== "current-task") {
      taskDetailIdInput.value = historyTask.id;
    }
    taskHistoryMeta.textContent = formatTaskFocusLabel(taskHistoryFocus, historyTask);
    taskHistoryJson.textContent = historyTask
      ? renderTaskSummary(historyTask)
      : taskHistoryFocus === "latest-failed"
        ? "No failed task recorded yet."
        : taskHistoryFocus === "current-task"
          ? "No active task selected."
          : "No finished task recorded yet.";
    renderPlanPanel(currentTaskState ?? historyTask);
    renderCommandTranscriptFromTask(historyTask ?? currentTaskState, { source: taskHistoryFocus });
  } catch {
    taskHistoryMeta.textContent = formatTaskFocusLabel(taskHistoryFocus, latestHistoryTask);
    taskHistoryJson.textContent = latestHistoryTask
      ? renderTaskSummary(latestHistoryTask)
      : "Unable to read task history detail.";
    renderPlanPanel(currentTaskState ?? latestHistoryTask);
    renderCommandTranscriptFromTask(latestHistoryTask ?? currentTaskState, { source: "latest-history" });
  }
}

async function refreshWorkView() {
  try {
    const data = await fetchJson(\`\${observerConfig.sessionManagerUrl}/work-view/state\`);
    const workView = data.workView ?? {};
    latestWorkViewState = workView;
    workViewStatus.textContent = workView.status ?? "unknown";
    workViewVisibility.textContent = workView.visibility ?? "unknown";
    workViewMode.textContent = workView.mode ?? "unknown";
    workViewHelper.textContent = workView.helperStatus ?? "unknown";
    workViewCapture.textContent = workView.captureStrategy ?? "unknown";
    if (!desiredWorkViewUrlPinned && document.activeElement !== workViewUrlInput) {
      setDesiredWorkViewUrl(workView.activeUrl ?? workView.entryUrl ?? "https://example.com/work-view", {
        pinned: false,
      });
    }
    updateDesiredUrlHint(workView.activeUrl ?? workView.entryUrl ?? null);
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
    latestWorkViewState = null;
    workViewStatus.textContent = "offline";
    workViewVisibility.textContent = "offline";
    workViewMode.textContent = "offline";
    workViewHelper.textContent = "offline";
    workViewCapture.textContent = "offline";
    workViewJson.textContent = "Unable to read work view state.";
    updateDesiredUrlHint(null);
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
    latestActionState = state;
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
    latestActionState = null;
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
    systemBodyUptime.textContent = \`\${system.body?.uptimeSeconds ?? 0}s\`;
    systemSummary.textContent = [
      \`Host: \${system.body?.hostname ?? "unknown"} (\${system.body?.platform ?? "unknown"} \${system.body?.arch ?? "unknown"})\`,
      \`Node: \${system.body?.node ?? "unknown"} PID: \${system.body?.pid ?? "unknown"}\`,
      \`CPU: \${system.resources?.cpuPercent ?? 0}%\`,
      \`Load: \${(system.resources?.loadAverage ?? []).join(", ") || "n/a"}\`,
      \`Memory: \${system.resources?.memoryPercent ?? 0}%\`,
      \`Disk: \${system.resources?.diskPercent ?? 0}%\`,
      \`Network: \${system.network?.online ? "online" : "offline"} (\${system.network?.checkedTargets ?? 0} targets)\`,
      \`Alerts: \${system.alerts?.length ?? 0}\`,
    ].join("\\n");
  } catch {
    systemServicesOnline.textContent = "0";
    systemAlertCount.textContent = "0";
    systemBodyUptime.textContent = "0s";
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

async function refreshAuditState() {
  try {
    const summary = await fetchJson(\`\${observerConfig.eventHubUrl}/events/audit/summary\`);
    const audit = summary.audit ?? {};
    const byType = audit.byType ?? {};
    const bySource = audit.bySource ?? {};
    const topTypes = Object.entries(byType)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([type, count]) => \`\${type}: \${count}\`);

    auditTotal.textContent = String(audit.total ?? 0);
    auditTypeCount.textContent = String(Object.keys(byType).length);
    auditSourceCount.textContent = String(Object.keys(bySource).length);
    auditSummary.textContent = [
      \`Log: \${audit.logFile ?? "unknown"}\`,
      \`Earliest: \${formatTimestamp(audit.earliestTimestamp)}\`,
      \`Latest: \${formatTimestamp(audit.latestTimestamp)}\`,
      \`Malformed Lines: \${audit.malformed ?? 0}\`,
      topTypes.length ? \`Top Types: \${topTypes.join(", ")}\` : "Top Types: none",
    ].join("\\n");
  } catch {
    auditTotal.textContent = "0";
    auditTypeCount.textContent = "0";
    auditSourceCount.textContent = "0";
    auditSummary.textContent = "Unable to read audit ledger.";
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
  await launchTaskIntoWorkView(result.task?.id, targetUrl);
  taskHistoryFocus = "current-task";
  selectedHistoryTaskId = result.task?.id ?? null;
  taskDetailIdInput.value = result.task?.id ?? "";
  setControlMessage(\`Created task \${result.task?.id ?? "unknown"} for \${targetUrl}\`);
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshWorkView();
  await refreshScreen();
}

async function createPlannedTask() {
  const targetUrl = getDesiredWorkViewUrl();
  const result = await fetchJson(\`\${observerConfig.coreUrl}/tasks/plan\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      goal: \`Plan an AI work view run for \${targetUrl}\`,
      type: "browser_task",
      targetUrl,
      workViewStrategy: "ai-work-view",
      actions: [
        { kind: "keyboard.type", params: { text: "hello from openclaw-operator" } },
        { kind: "mouse.click", params: { x: 640, y: 360, button: "left" } },
      ],
    }),
  });

  taskHistoryFocus = "selected-task";
  selectedHistoryTaskId = result.task?.id ?? null;
  taskDetailIdInput.value = result.task?.id ?? "";
  renderPlanPanel(result.task ?? { plan: result.plan });
  setControlMessage(\`Planned task \${result.task?.id ?? "unknown"} for \${targetUrl}. Use Operator Step or Run to execute it.\`);
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshOperatorState();
}

async function runOperatorStepFromUi() {
  const result = await fetchJson(\`\${observerConfig.coreUrl}/operator/step\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  renderOperatorPanel(result);
  taskHistoryFocus = result.task?.id ? "selected-task" : taskHistoryFocus;
  selectedHistoryTaskId = result.task?.id ?? selectedHistoryTaskId;
  if (result.task?.id) {
    taskDetailIdInput.value = result.task.id;
  }
  setControlMessage(result.ran
    ? \`Operator completed task \${result.task?.id ?? "unknown"}.\`
    : "Operator step found no queued task.");
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshActionState();
  await refreshWorkView();
  await refreshScreen();
  await refreshOperatorState();
  await refreshPolicyState();
}

async function runOperatorLoopFromUi() {
  const result = await fetchJson(\`\${observerConfig.coreUrl}/operator/run\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ maxSteps: 5 }),
  });

  renderOperatorPanel(result);
  const lastTask = [...(result.steps ?? [])].reverse().find((step) => step.task?.id)?.task ?? null;
  taskHistoryFocus = lastTask?.id ? "selected-task" : taskHistoryFocus;
  selectedHistoryTaskId = lastTask?.id ?? selectedHistoryTaskId;
  if (lastTask?.id) {
    taskDetailIdInput.value = lastTask.id;
  }
  setControlMessage(result.ran
    ? \`Operator run completed \${result.count ?? result.steps?.length ?? 0} task(s).\`
    : "Operator run found no queued tasks.");
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshActionState();
  await refreshWorkView();
  await refreshScreen();
  await refreshOperatorState();
  await refreshPolicyState();
}

async function launchTaskIntoWorkView(taskId, targetUrl) {
  if (!taskId) {
    return;
  }

  await updateTaskPhase(taskId, "preparing_work_view", {
    targetUrl,
    displayTarget: "workspace-2",
  });
  const workViewResult = await openWorkViewUrl(taskId, targetUrl);
  await attachTaskToWorkView(taskId, workViewResult);
}

async function recoverLatestFinishedTask() {
  const latest = await fetchJson(\`\${observerConfig.coreUrl}/tasks/latest-finished\`);
  const sourceTask = latest.task ?? null;
  if (!sourceTask?.id) {
    throw new Error("No finished task available to recover.");
  }

  const targetUrl = sourceTask.targetUrl ?? sourceTask.workView?.activeUrl ?? getDesiredWorkViewUrl();
  setDesiredWorkViewUrl(targetUrl);

  const result = await fetchJson(\`\${observerConfig.coreUrl}/tasks/\${sourceTask.id}/recover\`, {
    method: "POST",
  });
  await launchTaskIntoWorkView(result.task?.id, targetUrl);
  taskHistoryFocus = "current-task";
  selectedHistoryTaskId = result.task?.id ?? null;
  taskDetailIdInput.value = result.task?.id ?? "";
  setControlMessage(\`Recovered task \${result.task?.id ?? "unknown"} from \${sourceTask.id}\`);
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshWorkView();
  await refreshScreen();
}

async function recoverSelectedTask() {
  const sourceTaskId = getSelectedHistoryTaskId();
  if (!sourceTaskId) {
    throw new Error("Enter or load a task ID first.");
  }

  const taskResponse = await fetchJson(\`\${observerConfig.coreUrl}/tasks/\${sourceTaskId}\`);
  const sourceTask = taskResponse.task ?? null;
  if (!sourceTask?.id) {
    throw new Error("Selected task could not be loaded.");
  }

  if (!sourceTask.restorable) {
    throw new Error("Selected task is not recoverable.");
  }

  const targetUrl = sourceTask.targetUrl ?? sourceTask.workView?.activeUrl ?? getDesiredWorkViewUrl();
  setDesiredWorkViewUrl(targetUrl);
  const result = await fetchJson(\`\${observerConfig.coreUrl}/tasks/\${sourceTask.id}/recover\`, {
    method: "POST",
  });
  await launchTaskIntoWorkView(result.task?.id, targetUrl);
  taskHistoryFocus = "current-task";
  selectedHistoryTaskId = result.task?.id ?? null;
  taskDetailIdInput.value = result.task?.id ?? "";
  setControlMessage(\`Recovered task \${result.task?.id ?? "unknown"} from selected task \${sourceTask.id}\`);
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshWorkView();
  await refreshScreen();
}

async function loadSelectedTaskDetail() {
  selectedHistoryTaskId = getSelectedHistoryTaskId();
  if (!selectedHistoryTaskId) {
    throw new Error("Enter a task ID first.");
  }

  taskHistoryFocus = "selected-task";
  await refreshTaskHistoryDetail();
  setControlMessage(\`Loaded task history detail for \${selectedHistoryTaskId}\`);
}

function useSelectedTaskUrl() {
  const selectedTask = latestHistoryTask ?? null;
  const taskUrl = selectedTask?.targetUrl ?? selectedTask?.workView?.activeUrl ?? null;
  if (!taskUrl) {
    throw new Error("Selected task does not have a recoverable URL.");
  }

  setDesiredWorkViewUrl(taskUrl);
  setControlMessage(\`Loaded task URL into work view input: \${taskUrl}\`);
}

async function recoverLatestFailedTask() {
  const latest = await fetchJson(\`\${observerConfig.coreUrl}/tasks/latest-failed\`);
  const failedTask = latest.task ?? recentTasksState.find((task) => task.status === "failed" && task.restorable) ?? null;
  if (!failedTask?.id) {
    throw new Error("No failed task available to recover.");
  }

  taskHistoryFocus = "latest-failed";
  selectedHistoryTaskId = failedTask.id;
  taskDetailIdInput.value = failedTask.id;
  await refreshTaskHistoryDetail();
  await recoverSelectedTask();
}

function renderTaskCard(task) {
  const selectedClass = selectedHistoryTaskId === task.id ? " selected" : "";
  const activeClass = task.id === currentTaskState?.id ? " active" : "";
  const taskUrl = task.targetUrl ?? task.workView?.activeUrl ?? "";
  const escapedUrl = escapeHtml(taskUrl);
  const statusClass = task.status === "failed" ? "status-pill warn" : "status-pill";
  const relationLabel = describeTaskRelationship(task);
  return \`<article class="task-card\${selectedClass}\${activeClass}" data-task-id="\${task.id}">
    <div class="task-card-top">
      <h3>\${escapeHtml(task.goal)}</h3>
      <div class="task-status-group">
        <span class="\${statusClass}">\${escapeHtml(task.status)}</span>
        \${task.isCurrentTask ? '<span class="status-pill">current</span>' : ""}
        \${task.restorable ? '<span class="status-pill">recoverable</span>' : ""}
      </div>
    </div>
    <pre>\${escapeHtml(renderTaskSummary(task))}</pre>
    <div class="hint">\${escapeHtml(relationLabel)}</div>
    <div class="task-card-actions">
      <button class="secondary" data-task-action="inspect" data-task-id="\${task.id}">Inspect</button>
      <button class="secondary" data-task-action="use-url" data-task-id="\${task.id}" data-task-url="\${escapedUrl}" \${taskUrl ? "" : "disabled"}>Use URL</button>
      <button class="secondary" data-task-action="recover" data-task-id="\${task.id}" \${task.restorable ? "" : "disabled"}>Recover</button>
    </div>
  </article>\`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  await refreshTaskList();
  await refreshTaskHistoryDetail();
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

  const activeUrl =
    workViewResult.workView?.activeUrl
    ?? workViewResult.browser?.activeUrl
    ?? workViewResult.tab?.url
    ?? currentTaskState?.targetUrl
    ?? getDesiredWorkViewUrl();

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
      activeUrl,
    }),
  });
}

async function postControl(path) {
  const result = await fetchJson(\`\${observerConfig.coreUrl}\${path}\`, {
    method: "POST",
  });
  setControlMessage(\`Control request completed: \${path}\`);
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshOperatorState();
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
  await refreshTaskList();
  await refreshTaskHistoryDetail();
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

  const completedWorkViewUrl = currentTaskState.workView?.activeUrl ?? currentTaskState.targetUrl ?? null;
  const hiddenResult = await fetchJson(\`\${observerConfig.sessionManagerUrl}/work-view/hide\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const hiddenState = await fetchJson(\`\${observerConfig.sessionManagerUrl}/work-view/state\`);
  const hiddenWorkView = hiddenState.workView ?? hiddenResult.workView ?? null;

  if (!hiddenWorkView || hiddenWorkView.visibility !== "hidden") {
    throw new Error("Work view did not transition to hidden state.");
  }

  const result = await fetchJson(\`\${observerConfig.coreUrl}/tasks/\${currentTaskState.id}/complete\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      details: {
        targetUrl: currentTaskState.targetUrl ?? null,
        workViewUrl: completedWorkViewUrl,
        summary: completedWorkViewUrl
          ? \`Completed task at \${completedWorkViewUrl}\`
          : "Completed task.",
        workView: hiddenWorkView
          ? {
            status: hiddenWorkView.status ?? null,
            visibility: hiddenWorkView.visibility ?? null,
            mode: hiddenWorkView.mode ?? null,
            helperStatus: hiddenWorkView.helperStatus ?? null,
            browserStatus: hiddenWorkView.browserStatus ?? null,
            entryUrl: hiddenWorkView.entryUrl ?? completedWorkViewUrl,
            displayTarget: hiddenWorkView.displayTarget ?? null,
            activeUrl: hiddenWorkView.activeUrl ?? completedWorkViewUrl,
          }
          : null,
      },
    }),
  });

  taskHistoryFocus = "latest-finished";
  selectedHistoryTaskId = result.task?.id ?? currentTaskState.id;
  taskDetailIdInput.value = selectedHistoryTaskId ?? "";
  setControlMessage(\`Completed task \${result.task?.id ?? currentTaskState.id}\`);
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshActionState();
  await refreshWorkView();
  await refreshScreen();
}

async function stopCurrentTask() {
  const result = await fetchJson(\`\${observerConfig.coreUrl}/control/stop\`, {
    method: "POST",
  });
  taskHistoryFocus = "latest-failed";
  selectedHistoryTaskId = result.task?.id ?? null;
  taskDetailIdInput.value = result.task?.id ?? "";
  setControlMessage(\`Stopped task \${result.task?.id ?? "unknown"}\`);
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshActionState();
  await refreshWorkView();
  await refreshScreen();
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
    "task.planned",
    "task.phase_changed",
    "task.running",
    "task.completed",
    "task.recovered",
    "task.paused",
    "task.resumed",
    "task.failed",
    "policy.evaluated",
    "approval.created",
    "approval.approved",
    "approval.denied",
    "capability.updated",
    "capability.invoked",
    "capability.blocked",
    "service.started",
    "browser.started",
    "browser.updated",
    "screen.updated",
    "action.completed",
    "system.updated",
    "service.failed",
    "heal.diagnosed",
    "heal.started",
    "heal.completed",
  ]) {
    stream.addEventListener(eventName, async (message) => {
      try {
        addEventItem(JSON.parse(message.data));
        await refreshRuntime();
        await refreshTaskList();
        await refreshTaskHistoryDetail();
        await refreshWorkView();
        if (eventName === "policy.evaluated") {
          await refreshPolicyState();
        }
        if (eventName === "approval.created" || eventName === "approval.approved" || eventName === "approval.denied") {
          await refreshApprovalState();
        }
        if (
          eventName === "capability.updated"
          || eventName === "capability.invoked"
          || eventName === "capability.blocked"
          || eventName === "service.started"
          || eventName === "service.failed"
        ) {
          await refreshCapabilityState();
        }
        if (eventName === "capability.invoked" || eventName === "capability.blocked") {
          await refreshCapabilityHistory();
        }
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
        if (eventName === "system.updated" || eventName === "service.failed" || eventName === "service.started") {
          await refreshSystemState();
        }
        if (eventName === "heal.diagnosed" || eventName === "heal.started" || eventName === "heal.completed" || eventName === "service.started") {
          await refreshHealState();
        }
        await refreshAuditState();
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

createPlannedTaskButton.addEventListener("click", () => {
  createPlannedTask().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

operatorStepButton.addEventListener("click", () => {
  runOperatorStepFromUi().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

operatorRunButton.addEventListener("click", () => {
  runOperatorLoopFromUi().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

approveLatestButton.addEventListener("click", () => {
  resolveLatestApproval("approve").catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

denyLatestButton.addEventListener("click", () => {
  resolveLatestApproval("deny").catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

invokeVitalsButton.addEventListener("click", () => {
  invokeCapabilityFromUi("vitals").catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

invokeProcessButton.addEventListener("click", () => {
  invokeCapabilityFromUi("process").catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

invokeCommandDryRunButton.addEventListener("click", () => {
  invokeCapabilityFromUi("commandDryRun").catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

invokeApprovedCommandDryRunButton.addEventListener("click", () => {
  invokeCapabilityFromUi("approvedCommandDryRun").catch((error) => {
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

resumeButton.addEventListener("click", () => {
  postControl("/control/resume").catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

stopButton.addEventListener("click", () => {
  stopCurrentTask().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

openWorkViewUrlButton.addEventListener("click", () => {
  openWorkViewUrl().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

recoverLatestTaskButton.addEventListener("click", () => {
  recoverLatestFinishedTask().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

recoverLatestFailedTaskButton.addEventListener("click", () => {
  recoverLatestFailedTask().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

loadHistoryButton.addEventListener("click", () => {
  taskHistoryFocus = "latest-finished";
  selectedHistoryTaskId = null;
  refreshTaskHistoryDetail().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

followActiveUrlButton.addEventListener("click", () => {
  try {
    followActiveWorkViewUrl();
  } catch (error) {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  }
});

loadSelectedTaskButton.addEventListener("click", () => {
  loadSelectedTaskDetail().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

loadCurrentTaskButton.addEventListener("click", () => {
  if (!currentTaskState?.id) {
    setControlMessage("Request failed: No active task selected.");
    return;
  }
  taskHistoryFocus = "current-task";
  selectedHistoryTaskId = currentTaskState.id;
  taskDetailIdInput.value = currentTaskState.id;
  refreshTaskHistoryDetail().then(() => {
    setControlMessage(\`Viewing current task \${currentTaskState.id}\`);
  }).catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

loadLatestFailedTaskButton.addEventListener("click", () => {
  taskHistoryFocus = "latest-failed";
  refreshTaskHistoryDetail().then(() => {
    setControlMessage("Loaded latest failed task.");
  }).catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

recoverSelectedTaskButton.addEventListener("click", () => {
  recoverSelectedTask().catch((error) => {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  });
});

useDetailUrlButton.addEventListener("click", () => {
  try {
    useSelectedTaskUrl();
  } catch (error) {
    setControlMessage(\`Request failed: \${formatError(error)}\`);
  }
});

workViewUrlInput.addEventListener("input", () => {
  desiredWorkViewUrl = workViewUrlInput.value.trim() || "https://example.com/work-view";
  desiredWorkViewUrlPinned = true;
  updateDesiredUrlHint(currentTaskState?.workView?.activeUrl ?? null);
});

taskListItems.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.taskAction;
  const taskId = target.dataset.taskId;
  const taskUrl = target.dataset.taskUrl;

  if (!action || !taskId) {
    return;
  }

  if (action === "inspect") {
    taskHistoryFocus = "selected-task";
    selectedHistoryTaskId = taskId;
    taskDetailIdInput.value = taskId;
    refreshTaskHistoryDetail().then(() => {
      setControlMessage(\`Loaded task history detail for \${taskId}\`);
    }).catch((error) => {
      setControlMessage(\`Request failed: \${formatError(error)}\`);
    });
    return;
  }

  if (action === "use-url") {
    try {
      if (!taskUrl) {
        throw new Error("Selected task does not have a recoverable URL.");
      }
      taskHistoryFocus = "selected-task";
      selectedHistoryTaskId = taskId;
      taskDetailIdInput.value = taskId;
      setDesiredWorkViewUrl(taskUrl);
      setControlMessage(\`Loaded task URL into work view input: \${taskUrl}\`);
    } catch (error) {
      setControlMessage(\`Request failed: \${formatError(error)}\`);
    }
    return;
  }

  if (action === "recover") {
    taskHistoryFocus = "selected-task";
    selectedHistoryTaskId = taskId;
    taskDetailIdInput.value = taskId;
    recoverSelectedTask().catch((error) => {
      setControlMessage(\`Request failed: \${formatError(error)}\`);
    });
    return;
  }

  if (target.closest(".task-card")) {
    taskHistoryFocus = "selected-task";
    selectedHistoryTaskId = taskId;
    taskDetailIdInput.value = taskId;
    refreshTaskHistoryDetail().catch((error) => {
      setControlMessage(\`Request failed: \${formatError(error)}\`);
    });
  }
});

await refreshHealth();
await refreshRuntime();
await refreshTaskList();
await refreshTaskHistoryDetail();
await refreshWorkView();
await refreshScreen();
await refreshActionState();
await refreshOperatorState();
await refreshPolicyState();
await refreshApprovalState();
await refreshCapabilityState();
await refreshCapabilityHistory();
await refreshCommandLedger();
await refreshSystemState();
await refreshHealState();
await refreshAuditState();
await loadRecentEvents();
setControlMessage("Controls ready.");
subscribeEvents();
setInterval(refreshHealth, 5000);
setInterval(refreshRuntime, 5000);
setInterval(refreshTaskList, 5000);
setInterval(refreshTaskHistoryDetail, 5000);
setInterval(refreshWorkView, 5000);
setInterval(refreshScreen, 5000);
setInterval(refreshActionState, 5000);
setInterval(refreshOperatorState, 5000);
setInterval(refreshPolicyState, 5000);
setInterval(refreshApprovalState, 5000);
setInterval(refreshCapabilityState, 5000);
setInterval(refreshCapabilityHistory, 5000);
setInterval(refreshCommandLedger, 5000);
setInterval(refreshSystemState, 5000);
setInterval(refreshHealState, 5000);
setInterval(refreshAuditState, 5000);`;
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

  if (req.method === "GET" && (requestUrl.pathname === "/client.js" || requestUrl.pathname === "/client-v5.js")) {
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
