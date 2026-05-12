import http from "node:http";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const host = process.env.OPENCLAW_CORE_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_CORE_PORT ?? "4100", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";
const sessionManagerUrl = process.env.OPENCLAW_SESSION_MANAGER_URL ?? "http://127.0.0.1:4102";
const browserRuntimeUrl = process.env.OPENCLAW_BROWSER_RUNTIME_URL ?? "http://127.0.0.1:4103";
const screenSenseUrl = process.env.OPENCLAW_SCREEN_SENSE_URL ?? "http://127.0.0.1:4104";
const screenActUrl = process.env.OPENCLAW_SCREEN_ACT_URL ?? "http://127.0.0.1:4105";
const systemSenseUrl = process.env.OPENCLAW_SYSTEM_SENSE_URL ?? "http://127.0.0.1:4106";
const systemHealUrl = process.env.OPENCLAW_SYSTEM_HEAL_URL ?? "http://127.0.0.1:4107";
const stateFilePath = process.env.OPENCLAW_CORE_STATE_FILE
  ?? path.resolve(process.cwd(), "../../.artifacts/openclaw-core-state.json");

const tasks = new Map();
const approvals = new Map();
const policyAuditLog = [];
const runtimeState = {
  status: "idle",
  currentTaskId: null,
  paused: false,
  lastUpdatedAt: new Date().toISOString(),
};

const ACTIVE_TASK_STATUSES = new Set(["queued", "running", "paused"]);
const MAX_POLICY_AUDIT_ENTRIES = 100;
const MAX_APPROVAL_ITEMS = 200;
const CROSS_BOUNDARY_INTENTS = new Set([
  "account.login",
  "data.egress",
  "data.upload",
  "external_device.control",
  "network.publish",
  "social.post",
  "transaction.commit",
]);
const DENIED_INTENTS = new Set([
  "body.destroy",
  "security.disable",
]);
const CAPABILITY_HEALTH_TIMEOUT_MS = Number.parseInt(
  process.env.OPENCLAW_CAPABILITY_HEALTH_TIMEOUT_MS ?? "1200",
  10,
);
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

function persistState() {
  try {
    mkdirSync(path.dirname(stateFilePath), { recursive: true });
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      runtime: runtimeState,
      tasks: [...tasks.values()],
      approvals: [...approvals.values()],
      policyAuditLog,
    };
    const tempPath = `${stateFilePath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    renameSync(tempPath, stateFilePath);
  } catch (error) {
    console.error("Failed to persist core state:", error);
  }
}

function loadPersistentState() {
  if (!existsSync(stateFilePath)) {
    return;
  }

  try {
    const data = JSON.parse(readFileSync(stateFilePath, "utf8"));
    if (data?.runtime && typeof data.runtime === "object") {
      Object.assign(runtimeState, data.runtime);
    }
    if (Array.isArray(data?.tasks)) {
      tasks.clear();
      for (const task of data.tasks) {
        if (task?.id) {
          tasks.set(task.id, task);
        }
      }
    }
    if (Array.isArray(data?.approvals)) {
      approvals.clear();
      for (const approval of data.approvals.slice(-MAX_APPROVAL_ITEMS)) {
        if (approval?.id) {
          approvals.set(approval.id, approval);
        }
      }
    }
    if (Array.isArray(data?.policyAuditLog)) {
      policyAuditLog.splice(0, policyAuditLog.length, ...data.policyAuditLog.slice(-MAX_POLICY_AUDIT_ENTRIES));
    }
  } catch (error) {
    console.error("Failed to load persisted core state:", error);
  }
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error ?? `Request failed: ${url}`);
  }
  return data;
}

async function postJson(url, body = {}) {
  return fetchJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
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
    plan: task.plan ?? null,
    policy: task.policy ?? null,
    approval: task.approval ?? null,
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

function normalisePlanActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return [
      { kind: "keyboard.type", params: { text: "hello from openclaw-planner" } },
      { kind: "mouse.click", params: { x: 640, y: 360, button: "left" } },
    ];
  }

  return actions
    .filter((action) => action && typeof action === "object")
    .map((action) => ({
      kind: typeof action.kind === "string" && action.kind.trim() ? action.kind.trim() : "mouse.click",
      intent: typeof action.intent === "string" && action.intent.trim() ? action.intent.trim() : null,
      params: action.params && typeof action.params === "object" ? action.params : {},
    }));
}

function inferPlannerIntent({ intent, policy, type }) {
  const policyIntent = policy && typeof policy === "object" && typeof policy.intent === "string"
    ? policy.intent.trim()
    : "";
  const explicitIntent = typeof intent === "string" ? intent.trim() : "";
  const explicitType = typeof type === "string" ? type.trim() : "";
  return policyIntent || explicitIntent || explicitType || "task.execute";
}

function capabilityById(capabilityId) {
  return baseCapabilities().find((capability) => capability.id === capabilityId) ?? null;
}

function resolvePlanCapabilityId({ kind, intent, plannerIntent }) {
  const candidate = intent || kind || plannerIntent || "";
  const directMap = {
    "work_view.prepare": "act.work_view.control",
    "work_view.reveal": "act.work_view.control",
    "work_view.hide": "act.work_view.control",
    "browser.open": "act.browser.open",
    "network.navigate": "act.browser.open",
    "screen.observe": "sense.screen.observe",
    "keyboard.type": "act.screen.pointer_keyboard",
    "keyboard.hotkey": "act.screen.pointer_keyboard",
    "mouse.click": "act.screen.pointer_keyboard",
    "result.verify": "sense.screen.observe",
    "task.complete": "operate.task.loop",
    "policy.evaluate": "govern.policy.evaluate",
    "approval.gate": "govern.policy.evaluate",
  };

  if (directMap[candidate]) {
    return directMap[candidate];
  }
  if (candidate.startsWith("filesystem.")) {
    return "sense.filesystem.read";
  }
  if (candidate.startsWith("process.")) {
    return "sense.process.list";
  }
  if (candidate === "command.plan" || candidate === "system.command" || candidate.startsWith("system.command.")) {
    return "act.system.command.dry_run";
  }
  if (candidate.startsWith("heal.") || candidate === "system.repair") {
    return "act.system.heal";
  }
  if (CROSS_BOUNDARY_INTENTS.has(candidate)) {
    return "boundary.cross_domain.approval";
  }

  const matchedCapability = baseCapabilities().find((capability) => capability.intents?.includes(candidate));
  return matchedCapability?.id ?? "govern.policy.evaluate";
}

function annotatePlanStepWithCapability(step, plannerIntent) {
  const capabilityId = resolvePlanCapabilityId({
    kind: step.kind,
    intent: step.intent,
    plannerIntent,
  });
  const capability = capabilityById(capabilityId);
  if (!capability) {
    return step;
  }

  const requiresApproval = capability.requiresApproval === true || capability.governance === "require_approval";
  return {
    ...step,
    capabilityId: capability.id,
    capability: {
      id: capability.id,
      name: capability.name,
      kind: capability.kind,
      service: capability.service,
    },
    risk: capability.risk,
    governance: capability.governance,
    requiresApproval,
  };
}

function summarisePlanCapabilities(steps) {
  const byId = new Map();
  for (const step of steps) {
    if (!step.capabilityId) {
      continue;
    }
    if (!byId.has(step.capabilityId)) {
      byId.set(step.capabilityId, {
        id: step.capabilityId,
        risk: step.risk ?? "unknown",
        governance: step.governance ?? "unknown",
        requiresApproval: step.requiresApproval === true,
        stepCount: 0,
      });
    }
    const entry = byId.get(step.capabilityId);
    entry.stepCount += 1;
    entry.requiresApproval = entry.requiresApproval || step.requiresApproval === true;
  }

  return {
    total: byId.size,
    ids: [...byId.keys()],
    items: [...byId.values()],
    approvalGates: [...byId.values()].filter((capability) => capability.requiresApproval).length,
  };
}

function buildRulePlan({ goal, targetUrl, actions, type, intent, policy }) {
  const now = new Date().toISOString();
  const plannerIntent = inferPlannerIntent({ intent, policy, type });
  const actionSteps = normalisePlanActions(actions).map((action, index) => ({
    id: `step-action-${index + 1}`,
    kind: action.kind,
    intent: action.intent ?? action.kind,
    phase: "acting_on_target",
    title: `Perform ${action.kind}`,
    status: "pending",
    params: action.params,
  }));

  const steps = [
    {
      id: "step-prepare-work-view",
      kind: "work_view.prepare",
      phase: "preparing_work_view",
      title: "Prepare the AI work view",
      status: "pending",
    },
    {
      id: "step-open-target",
      kind: "browser.open",
      phase: "opening_target",
      title: `Open ${targetUrl ?? "the target URL"}`,
      status: "pending",
    },
    {
      id: "step-observe-screen",
      kind: "screen.observe",
      phase: "observing_screen",
      title: "Observe the current screen state",
      status: "pending",
    },
    ...actionSteps,
    {
      id: "step-verify-result",
      kind: "result.verify",
      phase: "verifying_result",
      title: "Verify the task result",
      status: "pending",
    },
    {
      id: "step-close-task",
      kind: "task.complete",
      phase: "completed",
      title: "Close the task after verification",
      status: "pending",
    },
  ].map((step) => annotatePlanStepWithCapability(step, plannerIntent));

  return {
    planId: `plan-${randomUUID()}`,
    strategy: "rule-v1",
    planner: "capability-aware-v1",
    capabilityAware: true,
    status: "planned",
    goal,
    targetUrl,
    intent: plannerIntent,
    createdAt: now,
    updatedAt: now,
    capabilitySummary: summarisePlanCapabilities(steps),
    steps,
  };
}

function shouldBuildPlan(body) {
  return body.includePlan === true
    || body.plan === true
    || body.planStrategy === "rule-v1"
    || body.executionMode === "planned";
}

function updatePlanForPhase(task, phase, details = null) {
  if (!task.plan || !Array.isArray(task.plan.steps)) {
    return;
  }

  const now = new Date().toISOString();
  task.plan.status = phase === "failed" ? "failed" : phase === "completed" ? "completed" : "running";
  task.plan.updatedAt = now;
  if (phase === "failed") {
    task.plan.failure = details ?? null;
  }

  const step = task.plan.steps.find((candidate) => candidate.phase === phase && candidate.status !== "completed");
  if (step) {
    step.status = phase === "failed" ? "failed" : "completed";
    step.completedAt = now;
    step.details = details;
  }

  if (phase === "completed") {
    for (const candidate of task.plan.steps) {
      if (candidate.status === "pending") {
        candidate.status = "skipped";
      }
    }
  }
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

function getNextQueuedTask() {
  return [...tasks.values()]
    .filter((task) => task.status === "queued")
    .sort(compareTasksForDisplay)[0] ?? null;
}

function getLatestFinishedTask() {
  return [...tasks.values()]
    .filter((task) => task.status === "completed")
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

function serialiseApproval(approval) {
  return {
    id: approval.id,
    status: approval.status,
    taskId: approval.taskId ?? null,
    policyDecisionId: approval.policyDecisionId ?? null,
    intent: approval.intent ?? null,
    domain: approval.domain ?? null,
    risk: approval.risk ?? null,
    decision: approval.decision ?? null,
    reason: approval.reason ?? null,
    requestedBy: approval.requestedBy ?? "openclaw-core",
    approvedBy: approval.approvedBy ?? null,
    deniedBy: approval.deniedBy ?? null,
    resolutionReason: approval.resolutionReason ?? null,
    createdAt: approval.createdAt,
    updatedAt: approval.updatedAt,
    resolvedAt: approval.resolvedAt ?? null,
    task: approval.taskId && tasks.has(approval.taskId) ? serialiseTask(tasks.get(approval.taskId)) : null,
  };
}

function listApprovals() {
  return [...approvals.values()]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .map((approval) => serialiseApproval(approval));
}

function buildApprovalSummary() {
  const counts = {
    total: 0,
    pending: 0,
    approved: 0,
    denied: 0,
    expired: 0,
  };

  for (const approval of approvals.values()) {
    counts.total += 1;
    counts[approval.status] = (counts[approval.status] ?? 0) + 1;
  }

  const pending = [...approvals.values()]
    .filter((approval) => approval.status === "pending")
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));

  return {
    counts,
    pendingCount: pending.length,
    latestPendingId: pending[0]?.id ?? null,
  };
}

function findExistingApprovalForTask(taskId) {
  return [...approvals.values()]
    .filter((approval) => approval.taskId === taskId && ["pending", "approved"].includes(approval.status))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
}

function createApprovalRequestForTask(task, decision) {
  const existing = findExistingApprovalForTask(task.id);
  if (existing) {
    task.approval = {
      requestId: existing.id,
      status: existing.status,
      required: existing.status === "pending",
      updatedAt: existing.updatedAt,
    };
    return existing;
  }

  const now = new Date().toISOString();
  const approval = {
    id: randomUUID(),
    status: "pending",
    taskId: task.id,
    policyDecisionId: decision.id,
    intent: decision.subject?.intent ?? null,
    domain: decision.domain,
    risk: decision.risk,
    decision: decision.decision,
    reason: decision.reason,
    requestedBy: "openclaw-core",
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  };
  approvals.set(approval.id, approval);
  task.approval = {
    requestId: approval.id,
    status: approval.status,
    required: true,
    updatedAt: approval.updatedAt,
  };

  if (approvals.size > MAX_APPROVAL_ITEMS) {
    const removable = [...approvals.values()]
      .filter((item) => item.status !== "pending")
      .sort((left, right) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt))[0];
    if (removable) {
      approvals.delete(removable.id);
    }
  }

  persistState();
  return approval;
}

function markApprovalApproved(approval, { approvedBy = "user", reason = "Approved by user." } = {}) {
  const now = new Date().toISOString();
  approval.status = "approved";
  approval.approvedBy = approvedBy;
  approval.resolutionReason = reason;
  approval.resolvedAt = now;
  approval.updatedAt = now;

  const task = approval.taskId ? getTaskById(approval.taskId) : null;
  if (task) {
    task.policy = {
      request: {
        ...(task.policy?.request ?? {}),
        approved: true,
      },
      decision: task.policy?.decision ?? null,
    };
    task.approval = {
      requestId: approval.id,
      status: approval.status,
      required: false,
      updatedAt: now,
    };
    ensureTaskPolicy(task, { stage: "approval.approved", force: true });
  }

  persistState();
  return { approval, task };
}

function markApprovalDenied(approval, { deniedBy = "user", reason = "Denied by user." } = {}) {
  const now = new Date().toISOString();
  approval.status = "denied";
  approval.deniedBy = deniedBy;
  approval.resolutionReason = reason;
  approval.resolvedAt = now;
  approval.updatedAt = now;

  const task = approval.taskId ? getTaskById(approval.taskId) : null;
  if (task) {
    task.approval = {
      requestId: approval.id,
      status: approval.status,
      required: false,
      updatedAt: now,
    };
    if (isActiveTask(task)) {
      failTask(task, "Approval denied by user.", {
        approvalId: approval.id,
        reason,
      });
    } else {
      persistState();
    }
  } else {
    persistState();
  }

  return { approval, task };
}

async function publishTaskApprovalIfPending(task) {
  const approval = task?.approval?.requestId ? approvals.get(task.approval.requestId) : null;
  if (approval?.status === "pending") {
    await publishEvent("approval.created", {
      approval: serialiseApproval(approval),
      task: serialiseTask(task),
    });
  }
}

function buildOperatorState() {
  reconcileRuntimeState();
  const currentTask = getCurrentTask();
  const nextTask = getNextQueuedTask();
  const paused = runtimeState.paused === true;
  return {
    status: paused ? "paused" : nextTask ? "ready" : "idle",
    blocked: paused,
    reason: paused ? "runtime_paused" : null,
    currentTask: currentTask ? serialiseTask(currentTask) : null,
    nextTask: nextTask ? serialiseTask(nextTask) : null,
    policy: {
      respectsPause: true,
      enforcesTaskPolicy: true,
      defaultMaxSteps: 5,
      maxStepsLimit: 20,
      supportsDryRun: true,
      decisions: ["allow", "audit_only", "require_approval", "deny"],
    },
    approvals: buildApprovalSummary(),
    summary: buildTaskSummary(),
  };
}

function baseCapabilities() {
  return [
    {
      id: "sense.screen.observe",
      name: "Screen Observation",
      kind: "sensor",
      service: "openclaw-screen-sense",
      endpoint: `${screenSenseUrl}/screen/state`,
      intents: ["screen.observe"],
      domains: ["body_internal"],
      risk: "low",
      governance: "audit_only",
      description: "Observe focused window, screen readiness, and snapshot summaries.",
    },
    {
      id: "sense.system.vitals",
      name: "System Vitals",
      kind: "sensor",
      service: "openclaw-system-sense",
      endpoint: `${systemSenseUrl}/system/health`,
      intents: ["system.observe", "body.inspect"],
      domains: ["body_internal"],
      risk: "low",
      governance: "audit_only",
      description: "Read host identity, service health, resources, network, and alerts.",
    },
    {
      id: "sense.filesystem.read",
      name: "Filesystem Read Sense",
      kind: "sensor",
      service: "openclaw-system-sense",
      endpoint: `${systemSenseUrl}/system/files/list`,
      intents: ["filesystem.metadata", "filesystem.list", "filesystem.search"],
      domains: ["body_internal"],
      risk: "medium",
      governance: "audit_only",
      description: "Read file metadata, list allowed directories, and search filenames inside configured body roots.",
    },
    {
      id: "sense.process.list",
      name: "Process List Sense",
      kind: "sensor",
      service: "openclaw-system-sense",
      endpoint: `${systemSenseUrl}/system/processes`,
      intents: ["process.list", "process.inspect"],
      domains: ["body_internal"],
      risk: "medium",
      governance: "audit_only",
      description: "Inspect local process summaries without mutating process state.",
    },
    {
      id: "act.system.command.dry_run",
      name: "System Command Dry Run",
      kind: "actuator",
      service: "openclaw-system-sense",
      endpoint: `${systemSenseUrl}/system/command/dry-run`,
      intents: ["system.command", "command.plan"],
      domains: ["body_internal", "cross_boundary"],
      risk: "high",
      governance: "require_approval",
      requiresApproval: true,
      description: "Plan command execution conservatively without running it, surfacing risk and approval requirements.",
    },
    {
      id: "memory.event.audit",
      name: "Event Audit Ledger",
      kind: "memory",
      service: "openclaw-event-hub",
      endpoint: `${eventHubUrl}/events/audit/summary`,
      intents: ["memory.audit", "event.query"],
      domains: ["body_internal"],
      risk: "low",
      governance: "audit_only",
      description: "Persist and query the control-plane black-box event log.",
    },
    {
      id: "act.work_view.control",
      name: "AI Work View Control",
      kind: "actuator",
      service: "openclaw-session-manager",
      endpoint: `${sessionManagerUrl}/work-view/state`,
      intents: ["work_view.prepare", "work_view.reveal", "work_view.hide"],
      domains: ["user_task", "body_internal"],
      risk: "low",
      governance: "allow",
      description: "Prepare, reveal, hide, and attach the observable AI work view.",
    },
    {
      id: "act.browser.open",
      name: "Browser Runtime Navigation",
      kind: "actuator",
      service: "openclaw-browser-runtime",
      endpoint: `${browserRuntimeUrl}/browser/state`,
      intents: ["browser.open", "network.navigate"],
      domains: ["user_task"],
      risk: "medium",
      governance: "allow",
      description: "Open target URLs inside the browser runtime body component.",
    },
    {
      id: "act.screen.pointer_keyboard",
      name: "Pointer And Keyboard Action",
      kind: "actuator",
      service: "openclaw-screen-act",
      endpoint: `${screenActUrl}/act/state`,
      intents: ["mouse.click", "keyboard.type"],
      domains: ["user_task"],
      risk: "medium",
      governance: "allow",
      description: "Perform bounded pointer and keyboard actions through screen-act.",
    },
    {
      id: "act.system.heal",
      name: "Conservative System Heal",
      kind: "actuator",
      service: "openclaw-system-heal",
      endpoint: `${systemHealUrl}/heal/state`,
      intents: ["heal.diagnose", "heal.restart-service", "system.repair"],
      domains: ["body_internal"],
      risk: "medium",
      governance: "audit_only",
      description: "Diagnose body health and execute conservative simulated repairs.",
    },
    {
      id: "govern.policy.evaluate",
      name: "Policy Governance",
      kind: "governance",
      service: "openclaw-core",
      endpoint: `http://${host}:${port}/policy/state`,
      intents: ["policy.evaluate", "approval.gate"],
      domains: ["body_internal", "user_task", "cross_boundary"],
      risk: "high",
      governance: "required",
      description: "Classify intent domains, enforce denial boundaries, and gate cross-boundary actions.",
    },
    {
      id: "operate.task.loop",
      name: "Operator Loop",
      kind: "operator",
      service: "openclaw-core",
      endpoint: `http://${host}:${port}/operator/state`,
      intents: ["operator.step", "operator.run", "operator.pause", "operator.resume"],
      domains: ["body_internal", "user_task"],
      risk: "medium",
      governance: "policy_enforced",
      description: "Consume queued planned tasks while respecting pause state and policy gates.",
    },
    {
      id: "boundary.cross_domain.approval",
      name: "Cross-Boundary Approval Boundary",
      kind: "boundary",
      service: "openclaw-core",
      endpoint: `http://${host}:${port}/policy/state`,
      intents: [...CROSS_BOUNDARY_INTENTS],
      domains: ["cross_boundary"],
      risk: "high",
      governance: "require_approval",
      requiresApproval: true,
      description: "Represent actions that leave the user's local body boundary and require approval.",
    },
  ];
}

function serviceHealthUrl(service) {
  const urls = {
    "openclaw-core": `http://${host}:${port}/health`,
    "openclaw-event-hub": `${eventHubUrl}/health`,
    "openclaw-session-manager": `${sessionManagerUrl}/health`,
    "openclaw-browser-runtime": `${browserRuntimeUrl}/health`,
    "openclaw-screen-sense": `${screenSenseUrl}/health`,
    "openclaw-screen-act": `${screenActUrl}/health`,
    "openclaw-system-sense": `${systemSenseUrl}/health`,
    "openclaw-system-heal": `${systemHealUrl}/health`,
  };
  return urls[service] ?? null;
}

async function probeServiceHealth(service) {
  if (service === "openclaw-core") {
    return {
      ok: true,
      status: "online",
      detail: "local-core",
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
    };
  }

  const url = serviceHealthUrl(service);
  if (!url) {
    return {
      ok: false,
      status: "unknown",
      detail: "no-health-url",
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CAPABILITY_HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok && data?.ok !== false,
      status: response.ok && data?.ok !== false ? "online" : "degraded",
      detail: data?.service ?? data?.stage ?? response.statusText,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return {
      ok: false,
      status: "offline",
      detail: message,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function summariseCapabilities(capabilities) {
  return capabilities.reduce((summary, capability) => {
    summary.total += 1;
    summary[capability.status] = (summary[capability.status] ?? 0) + 1;
    summary.byKind[capability.kind] = (summary.byKind[capability.kind] ?? 0) + 1;
    summary.byRisk[capability.risk] = (summary.byRisk[capability.risk] ?? 0) + 1;
    summary.byGovernance[capability.governance] = (summary.byGovernance[capability.governance] ?? 0) + 1;
    if (capability.requiresApproval) {
      summary.requiresApproval += 1;
    }
    return summary;
  }, {
    total: 0,
    online: 0,
    degraded: 0,
    offline: 0,
    unknown: 0,
    requiresApproval: 0,
    byKind: {},
    byRisk: {},
    byGovernance: {},
  });
}

function normaliseCapabilityInvokeRequest(body = {}) {
  const capabilityId =
    typeof body.capabilityId === "string" && body.capabilityId.trim()
      ? body.capabilityId.trim()
      : typeof body.id === "string" && body.id.trim()
        ? body.id.trim()
        : "";
  const params = body.params && typeof body.params === "object" ? body.params : {};
  return {
    capabilityId,
    params,
    operation: typeof body.operation === "string" && body.operation.trim() ? body.operation.trim() : null,
    intent: typeof body.intent === "string" && body.intent.trim() ? body.intent.trim() : null,
    approved: body.approved === true || body.policy?.approved === true,
    policy: body.policy && typeof body.policy === "object" ? body.policy : {},
  };
}

function buildCapabilityPolicyInput(capability, request) {
  const intent = request.intent ?? capability.intents?.[0] ?? "capability.invoke";
  const preferredDomain = capability.domains?.includes("cross_boundary")
    && !capability.domains?.includes("body_internal")
    ? "cross_boundary"
    : capability.domains?.[0] ?? "body_internal";
  return {
    type: "capability_invoke",
    intent,
    domain: request.policy.domain ?? preferredDomain,
    risk: request.policy.risk ?? capability.risk,
    requiresApproval:
      request.policy.requiresApproval === true
      || capability.requiresApproval === true
      || capability.governance === "require_approval",
    approved: request.approved,
    policy: {
      ...request.policy,
      intent,
      domain: request.policy.domain ?? preferredDomain,
      risk: request.policy.risk ?? capability.risk,
      requiresApproval:
        request.policy.requiresApproval === true
        || capability.requiresApproval === true
        || capability.governance === "require_approval",
      approved: request.approved,
    },
  };
}

function buildSystemSenseUrl(pathname, params = {}) {
  const url = new URL(pathname, systemSenseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function callCapabilityBackend(capability, request) {
  if (capability.id === "sense.system.vitals") {
    return fetchJson(`${systemSenseUrl}/system/health`);
  }

  if (capability.id === "sense.filesystem.read") {
    const operation = request.operation ?? request.params.operation ?? "list";
    if (operation === "metadata") {
      return fetchJson(buildSystemSenseUrl("/system/files/metadata", {
        path: request.params.path,
      }));
    }
    if (operation === "search") {
      return fetchJson(buildSystemSenseUrl("/system/files/search", {
        path: request.params.path,
        query: request.params.query ?? request.params.q,
        limit: request.params.limit,
      }));
    }
    return fetchJson(buildSystemSenseUrl("/system/files/list", {
      path: request.params.path,
      limit: request.params.limit,
    }));
  }

  if (capability.id === "sense.process.list") {
    return fetchJson(buildSystemSenseUrl("/system/processes", {
      query: request.params.query ?? request.params.q,
      limit: request.params.limit,
    }));
  }

  if (capability.id === "act.system.command.dry_run") {
    return postJson(`${systemSenseUrl}/system/command/dry-run`, {
      ...request.params,
      intent: request.intent ?? "system.command",
    });
  }

  throw new Error(`Capability ${capability.id} is not invokable through core-v0.`);
}

function summariseCapabilityInvocationResult(capability, result) {
  if (capability.id === "sense.system.vitals") {
    return {
      kind: "system.vitals",
      ok: result?.ok === true,
      alerts: result?.system?.alerts?.length ?? 0,
      services: Object.keys(result?.system?.services ?? {}).length,
    };
  }
  if (capability.id === "sense.filesystem.read") {
    return {
      kind: "filesystem.read",
      ok: result?.ok === true,
      count: result?.count ?? (result?.metadata ? 1 : 0),
      path: result?.path ?? null,
    };
  }
  if (capability.id === "sense.process.list") {
    return {
      kind: "process.list",
      ok: result?.ok === true,
      count: result?.count ?? 0,
    };
  }
  if (capability.id === "act.system.command.dry_run") {
    return {
      kind: "command.dry_run",
      ok: result?.ok === true,
      risk: result?.plan?.risk ?? null,
      governance: result?.plan?.governance ?? null,
      wouldExecute: result?.plan?.wouldExecute ?? null,
    };
  }
  return {
    kind: capability.id,
    ok: result?.ok === true,
  };
}

async function invokeCapability(body = {}) {
  const request = normaliseCapabilityInvokeRequest(body);
  if (!request.capabilityId) {
    return {
      statusCode: 400,
      response: { ok: false, error: "capabilityId is required." },
    };
  }

  const capability = capabilityById(request.capabilityId);
  if (!capability) {
    return {
      statusCode: 404,
      response: { ok: false, error: "Capability not found." },
    };
  }

  const policy = recordPolicyDecision(evaluatePolicyIntent(
    buildCapabilityPolicyInput(capability, request),
    {
      stage: "capability.invoke",
      type: "capability_invoke",
      goal: `Invoke ${capability.id}`,
    },
  ));
  await publishEvent("policy.evaluated", { capability, policy });

  if (!isPolicyExecutionAllowed(policy)) {
    await publishEvent("capability.blocked", {
      capability,
      policy,
      reason: policy.reason,
    });
    return {
      statusCode: 200,
      response: {
        ok: true,
        invoked: false,
        blocked: true,
        reason: policy.decision === "deny" ? "policy_denied" : "policy_requires_approval",
        capability,
        policy,
      },
    };
  }

  const result = await callCapabilityBackend(capability, request);
  const summary = summariseCapabilityInvocationResult(capability, result);
  await publishEvent("capability.invoked", {
    capability,
    policy,
    summary,
  });
  return {
    statusCode: 200,
    response: {
      ok: true,
      invoked: true,
      blocked: false,
      capability,
      policy,
      summary,
      result,
    },
  };
}

async function buildCapabilityRegistry() {
  const serviceNames = [...new Set(baseCapabilities().map((capability) => capability.service))];
  const healthEntries = await Promise.all(serviceNames.map(async (service) => [service, await probeServiceHealth(service)]));
  const healthByService = Object.fromEntries(healthEntries);
  const capabilities = baseCapabilities().map((capability) => {
    const health = healthByService[capability.service] ?? { ok: false, status: "unknown" };
    return {
      ...capability,
      status: health.status,
      available: health.ok === true,
      health,
    };
  });

  return {
    registry: "capability-v0",
    mode: "local-body-registry",
    generatedAt: new Date().toISOString(),
    capabilities,
    summary: summariseCapabilities(capabilities),
  };
}

function normalisePolicyTags(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tag) => typeof tag === "string" && tag.trim())
    .map((tag) => tag.trim());
}

function inferPolicyIntent(input = {}) {
  const policy = input.policy && typeof input.policy === "object" ? input.policy : {};
  const action = input.action && typeof input.action === "object" ? input.action : {};
  const rawIntent =
    policy.intent
    ?? input.intent
    ?? action.intent
    ?? action.kind
    ?? input.actionKind
    ?? input.kind
    ?? input.type
    ?? "task.execute";

  return typeof rawIntent === "string" && rawIntent.trim() ? rawIntent.trim() : "task.execute";
}

function inferPolicyDomain({ input, intent, tags }) {
  const policy = input.policy && typeof input.policy === "object" ? input.policy : {};
  const explicitDomain = typeof policy.domain === "string" && policy.domain.trim()
    ? policy.domain.trim()
    : typeof input.domain === "string" && input.domain.trim()
      ? input.domain.trim()
      : null;

  if (explicitDomain) {
    return explicitDomain;
  }

  if (
    policy.crossBoundary === true
    || input.crossBoundary === true
    || CROSS_BOUNDARY_INTENTS.has(intent)
    || tags.includes("cross_boundary")
    || tags.includes("external")
    || tags.includes("data_egress")
  ) {
    return "cross_boundary";
  }

  if (
    intent.startsWith("heal.")
    || intent.startsWith("system.")
    || intent.startsWith("body.")
    || input.type === "system_task"
    || input.type === "heal_task"
  ) {
    return "body_internal";
  }

  return "user_task";
}

function inferPolicyRisk({ input, intent, domain, tags }) {
  const policy = input.policy && typeof input.policy === "object" ? input.policy : {};
  const explicitRisk = typeof policy.risk === "string" && policy.risk.trim()
    ? policy.risk.trim()
    : typeof input.risk === "string" && input.risk.trim()
      ? input.risk.trim()
      : null;

  if (explicitRisk) {
    return explicitRisk;
  }

  if (DENIED_INTENTS.has(intent) || tags.includes("destructive")) {
    return "critical";
  }

  if (domain === "cross_boundary") {
    return "high";
  }

  if (intent.startsWith("heal.") || intent.startsWith("system.")) {
    return "medium";
  }

  return "low";
}

function evaluatePolicyIntent(input = {}, context = {}) {
  const policy = input.policy && typeof input.policy === "object" ? input.policy : {};
  const tags = [...normalisePolicyTags(input.tags), ...normalisePolicyTags(policy.tags)];
  const intent = inferPolicyIntent(input);
  const domain = inferPolicyDomain({ input, intent, tags });
  const risk = inferPolicyRisk({ input, intent, domain, tags });
  const approved = policy.approved === true || input.approved === true || context.approved === true;
  const requiresApproval = policy.requiresApproval === true || input.requiresApproval === true;
  const auditRequired = domain !== "user_task" || risk !== "low" || policy.audit === true || input.audit === true;

  let decision = "allow";
  let reason = "within_user_task_boundary";

  if (DENIED_INTENTS.has(intent) || policy.deny === true || input.deny === true) {
    decision = "deny";
    reason = "absolute_boundary";
  } else if (domain === "cross_boundary" && !approved) {
    decision = "require_approval";
    reason = "cross_boundary_requires_user_approval";
  } else if (requiresApproval && !approved) {
    decision = "require_approval";
    reason = "approval_required";
  } else if (auditRequired) {
    decision = "audit_only";
    reason = approved ? "approved_and_audited" : "body_internal_audit";
  }

  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    at: now,
    engine: "policy-v0",
    stage: context.stage ?? "evaluate",
    subject: {
      taskId: input.taskId ?? context.taskId ?? null,
      type: input.type ?? context.type ?? null,
      goal: input.goal ?? context.goal ?? null,
      targetUrl: input.targetUrl ?? context.targetUrl ?? null,
      intent,
    },
    domain,
    risk,
    decision,
    reason,
    approved,
    auditRequired,
    tags,
  };
}

function recordPolicyDecision(decision) {
  policyAuditLog.push(decision);
  if (policyAuditLog.length > MAX_POLICY_AUDIT_ENTRIES) {
    policyAuditLog.splice(0, policyAuditLog.length - MAX_POLICY_AUDIT_ENTRIES);
  }
  persistState();
  return decision;
}

function isPolicyExecutionAllowed(decision) {
  return decision?.decision === "allow" || decision?.decision === "audit_only";
}

function buildPolicyState() {
  return {
    engine: "policy-v0",
    mode: "local-rule-governance",
    rules: {
      bodyInternalDefault: "allow_with_audit",
      userTaskDefault: "allow",
      crossBoundaryDefault: "require_approval",
      deniedIntents: [...DENIED_INTENTS],
      crossBoundaryIntents: [...CROSS_BOUNDARY_INTENTS],
    },
    decisions: policyAuditLog.slice(-20).reverse(),
    counts: policyAuditLog.reduce((counts, decision) => {
      counts.total += 1;
      counts[decision.decision] = (counts[decision.decision] ?? 0) + 1;
      counts[decision.domain] = (counts[decision.domain] ?? 0) + 1;
      return counts;
    }, {
      total: 0,
      allow: 0,
      audit_only: 0,
      require_approval: 0,
      deny: 0,
      body_internal: 0,
      user_task: 0,
      cross_boundary: 0,
    }),
  };
}

function ensureTaskPolicy(task, context = {}) {
  const existing = task.policy?.decision ? task.policy : null;
  if (existing && context.force !== true) {
    return existing;
  }

  const decision = evaluatePolicyIntent({
    taskId: task.id,
    type: task.type,
    goal: task.goal,
    targetUrl: task.targetUrl,
    policy: task.policy?.request ?? task.policy ?? {},
  }, {
    stage: context.stage ?? "task",
    taskId: task.id,
    type: task.type,
    goal: task.goal,
    targetUrl: task.targetUrl,
  });
  task.policy = {
    request: task.policy?.request ?? task.policy ?? {},
    decision,
  };
  recordPolicyDecision(decision);
  if (decision.decision === "require_approval") {
    createApprovalRequestForTask(task, decision);
  } else if (task.approval?.requestId) {
    const approval = approvals.get(task.approval.requestId);
    task.approval = {
      requestId: task.approval.requestId,
      status: approval?.status ?? task.approval.status ?? "resolved",
      required: false,
      updatedAt: approval?.updatedAt ?? new Date().toISOString(),
    };
  }
  return task.policy;
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
    plan: shouldBuildPlan(body)
      ? buildRulePlan({
          goal,
          type,
          intent: typeof body.intent === "string" && body.intent.trim() ? body.intent.trim() : null,
          policy: body.policy && typeof body.policy === "object" ? body.policy : null,
          targetUrl:
            typeof body.targetUrl === "string" && body.targetUrl.trim()
              ? body.targetUrl.trim()
              : null,
          actions: body.actions,
        })
      : body.plan && typeof body.plan === "object"
        ? body.plan
        : null,
    policy:
      body.policy && typeof body.policy === "object"
        ? { request: body.policy }
        : {
            request: {
              intent:
                typeof body.intent === "string" && body.intent.trim()
                  ? body.intent.trim()
                  : "task.execute",
            },
          },
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
  ensureTaskPolicy(task, { stage: "task.created" });
  persistState();
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
  updatePlanForPhase(task, phase, details);
  persistState();
  return task;
}

async function setTaskPhase(task, phase, { status = task.status, details = null } = {}) {
  task.status = status;
  const updatedTask = appendTaskPhase(task, phase, details);
  reconcileRuntimeState();
  await publishEvent("task.phase_changed", { task: serialiseTask(updatedTask) });
  return updatedTask;
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
    persistState();
    return null;
  }

  updateRuntimeState({
    status: currentTask.status === "paused" ? "paused" : currentTask.status,
    currentTaskId: currentTask.id,
    paused: currentTask.status === "paused",
  });
  persistState();
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

  if (reclaimed.length > 0) {
    persistState();
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
  persistState();
  return task;
}

function failTask(task, reason, details = null) {
  task.status = "failed";
  appendTaskPhase(task, "failed", { reason, details });
  task.outcome = {
    kind: "failed",
    summary: reason,
    reason,
    details,
    at: task.updatedAt,
  };
  task.closedAt = task.updatedAt;
  reconcileRuntimeState();
  persistState();
  return task;
}

function buildWorkViewAttachPayload(data, targetUrl) {
  const workView = data?.workView ?? {};
  return {
    sessionId: data?.session?.sessionId ?? null,
    status: workView.status ?? "ready",
    visibility: workView.visibility ?? "visible",
    mode: workView.mode ?? "foreground-observable",
    helperStatus: workView.helperStatus ?? "active",
    displayTarget: workView.displayTarget ?? "workspace-2",
    activeUrl: workView.activeUrl ?? data?.browser?.browser?.activeUrl ?? data?.browser?.tab?.url ?? targetUrl,
  };
}

function normaliseExecutorActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return [
      { kind: "keyboard.type", params: { text: "hello from openclaw-task-executor" } },
      { kind: "mouse.click", params: { x: 640, y: 360, button: "left" } },
    ];
  }

  return actions
    .filter((action) => action && typeof action === "object")
    .map((action) => ({
      kind: typeof action.kind === "string" && action.kind.trim() ? action.kind.trim() : "mouse.click",
      params: action.params && typeof action.params === "object" ? action.params : {},
    }));
}

function buildExecutionVerification({ targetUrl, options, verifiedScreen, actionResults, workView }) {
  const expectedUrl =
    typeof options.expectedUrl === "string" && options.expectedUrl.trim()
      ? options.expectedUrl.trim()
      : targetUrl;
  const expectedReadiness =
    typeof options.expectedReadiness === "string" && options.expectedReadiness.trim()
      ? options.expectedReadiness.trim()
      : "ready";
  const activeUrl = workView?.activeUrl ?? verifiedScreen?.screen?.snapshotText?.match(/^URL: (.+)$/m)?.[1] ?? null;
  const readiness = verifiedScreen?.screen?.readiness ?? null;
  const degradedActions = actionResults.filter((action) => action?.degraded);
  const checks = [
    {
      name: "target_url",
      expected: expectedUrl,
      actual: activeUrl,
      passed: activeUrl === expectedUrl,
    },
    {
      name: "screen_readiness",
      expected: expectedReadiness,
      actual: readiness,
      passed: readiness === expectedReadiness,
    },
    {
      name: "actions_not_degraded",
      expected: 0,
      actual: degradedActions.length,
      passed: degradedActions.length === 0,
    },
  ];

  if (options.hideOnComplete === false) {
    checks.push({
      name: "work_view_visible",
      expected: "visible",
      actual: workView?.visibility ?? null,
      passed: workView?.visibility === "visible",
    });
  }

  const failedChecks = checks.filter((check) => !check.passed);
  return {
    ok: failedChecks.length === 0,
    expectedUrl,
    expectedReadiness,
    activeUrl,
    readiness,
    checks,
    failedChecks,
  };
}

async function executeTask(task, options = {}) {
  if (!isActiveTask(task)) {
    throw new Error("Task is not active and cannot be executed.");
  }

  const targetUrl =
    typeof options.targetUrl === "string" && options.targetUrl.trim()
      ? options.targetUrl.trim()
      : task.targetUrl;
  if (!targetUrl) {
    throw new Error("Task targetUrl is required for execution.");
  }

  const policy = ensureTaskPolicy(task, { stage: "task.execute", targetUrl });
  await publishEvent("policy.evaluated", { task: serialiseTask(task), policy: policy.decision });
  if (!isPolicyExecutionAllowed(policy.decision)) {
    const approval = task.approval?.requestId ? approvals.get(task.approval.requestId) : null;
    const failedTask = failTask(task, `Policy blocked task execution: ${policy.decision.reason}`, {
      targetUrl,
      executor: "core-v2",
      policy: policy.decision,
      approval: approval ? serialiseApproval(approval) : null,
    });
    await publishEvent("task.failed", {
      task: serialiseTask(failedTask),
      reason: "Policy blocked task execution.",
      policy: policy.decision,
      executor: "core-v2",
    });
    return {
      task: failedTask,
      prepare: null,
      reveal: null,
      initialScreen: null,
      verifiedScreen: null,
      actions: [],
      finalWorkViewState: null,
      verification: null,
      policy: policy.decision,
      approval: approval ? serialiseApproval(approval) : null,
    };
  }

  const displayTarget =
    typeof options.displayTarget === "string" && options.displayTarget.trim()
      ? options.displayTarget.trim()
      : "workspace-2";
  const actions = normaliseExecutorActions(options.actions);
  const actionResults = [];

  try {
    await setTaskPhase(task, "preparing_work_view", {
      status: "running",
      details: { targetUrl, displayTarget, executor: "core-v1" },
    });
    const prepare = await postJson(`${sessionManagerUrl}/work-view/prepare`, {
      displayTarget,
      entryUrl: targetUrl,
    });

    await setTaskPhase(task, "opening_target", {
      status: "running",
      details: { targetUrl, executor: "core-v1" },
    });
    const reveal = await postJson(`${sessionManagerUrl}/work-view/reveal`, {
      entryUrl: targetUrl,
    });
    const attachedTask = attachTaskToWorkView(task, buildWorkViewAttachPayload(reveal, targetUrl));
    await publishEvent("task.running", { task: serialiseTask(attachedTask) });

    await setTaskPhase(task, "observing_screen", {
      status: "running",
      details: { targetUrl, executor: "core-v1" },
    });
    const initialScreen = await fetchJson(`${screenSenseUrl}/screen/current`);

    for (const action of actions) {
      const endpoint = action.kind === "keyboard.type"
        ? "/act/keyboard/type"
        : action.kind === "keyboard.hotkey"
          ? "/act/keyboard/hotkey"
          : "/act/mouse/click";
      const actionData = await postJson(`${screenActUrl}${endpoint}`, action.params);
      actionResults.push(actionData.action);
      await setTaskPhase(task, "acting_on_target", {
        status: "running",
        details: {
          actionKind: action.kind,
          degraded: Boolean(actionData.action?.degraded),
          result: actionData.action?.result ?? null,
          executor: "core-v1",
        },
      });
    }

    await setTaskPhase(task, "verifying_result", {
      status: "running",
      details: { targetUrl, executor: "core-v1" },
    });
    const verifiedScreen = await fetchJson(`${screenSenseUrl}/screen/current`);

    const preCompletionWorkViewState = await fetchJson(`${sessionManagerUrl}/work-view/state`);
    const verificationWorkView = preCompletionWorkViewState?.workView ?? reveal?.workView ?? {};
    const verification = buildExecutionVerification({
      targetUrl,
      options,
      verifiedScreen,
      actionResults,
      workView: verificationWorkView,
    });

    if (!verification.ok) {
      const failedTask = failTask(task, "Executor verification failed.", {
        targetUrl,
        executor: "core-v2",
        verification,
        actionCount: actionResults.length,
      });
      await publishEvent("task.failed", {
        task: serialiseTask(failedTask),
        reason: "Executor verification failed.",
        verification,
        executor: "core-v2",
      });
      return {
        task: failedTask,
        prepare,
        reveal,
        initialScreen,
        verifiedScreen,
        actions: actionResults,
        finalWorkViewState: preCompletionWorkViewState,
        verification,
      };
    }

    let finalWorkViewState = preCompletionWorkViewState;
    if (options.hideOnComplete !== false) {
      finalWorkViewState = await postJson(`${sessionManagerUrl}/work-view/hide`, {});
    }

    const workView = finalWorkViewState?.workView ?? verificationWorkView;
    const updatedTask = completeTask(task, {
      targetUrl,
      workViewUrl: targetUrl,
      summary: `Executor completed task at ${targetUrl}`,
      executor: "core-v2",
      actionCount: actionResults.length,
      verification,
      initialScreen: {
        readiness: initialScreen.screen?.readiness ?? null,
        focusedWindow: initialScreen.screen?.focusedWindow ?? null,
      },
      verifiedScreen: {
        readiness: verifiedScreen.screen?.readiness ?? null,
        focusedWindow: verifiedScreen.screen?.focusedWindow ?? null,
      },
      actions: actionResults.map((action) => ({
        kind: action?.kind ?? null,
        degraded: Boolean(action?.degraded),
        result: action?.result ?? null,
      })),
      workView: {
        status: workView.status ?? null,
        visibility: workView.visibility ?? null,
        mode: workView.mode ?? null,
        helperStatus: workView.helperStatus ?? null,
        browserStatus: workView.browserStatus ?? null,
        entryUrl: workView.entryUrl ?? targetUrl,
        activeUrl: workView.activeUrl ?? targetUrl,
        displayTarget: workView.displayTarget ?? displayTarget,
      },
    });
    await publishEvent("task.completed", { task: serialiseTask(updatedTask), executor: "core-v2", verification });
    return {
      task: updatedTask,
      prepare,
      reveal,
      initialScreen,
      verifiedScreen,
      actions: actionResults,
      finalWorkViewState,
      verification,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task execution failed.";
    const failedTask = failTask(task, message, {
      targetUrl,
      executor: "core-v1",
      actionCount: actionResults.length,
    });
    await publishEvent("task.failed", { task: serialiseTask(failedTask), reason: message, executor: "core-v1" });
    throw error;
  }
}

function recoverTask(sourceTask) {
  const recoveryAttempt = (sourceTask.recovery?.attempt ?? 0) + 1;
  const recoveredTask = createTask({
    goal: sourceTask.goal,
    type: sourceTask.type,
    targetUrl: sourceTask.targetUrl,
    workViewStrategy: sourceTask.workViewStrategy,
    includePlan: Boolean(sourceTask.plan),
    recovery: {
      recoveredFromTaskId: sourceTask.id,
      recoveredFromOutcome: sourceTask.outcome?.kind ?? sourceTask.status,
      attempt: recoveryAttempt,
    },
  });

  sourceTask.recoveredByTaskId = recoveredTask.id;
  sourceTask.updatedAt = new Date().toISOString();
  persistState();
  return recoveredTask;
}

function buildRecoveryExecuteOptions(options, attempt) {
  const recoveryOptions = options.recovery && typeof options.recovery === "object" ? options.recovery : {};
  return {
    ...options,
    ...recoveryOptions,
    autoRecover: false,
    expectedUrl:
      typeof recoveryOptions.expectedUrl === "string" && recoveryOptions.expectedUrl.trim()
        ? recoveryOptions.expectedUrl.trim()
        : typeof options.recoveryExpectedUrl === "string" && options.recoveryExpectedUrl.trim()
          ? options.recoveryExpectedUrl.trim()
          : options.targetUrl,
    actions: Array.isArray(recoveryOptions.actions) ? recoveryOptions.actions : options.actions,
    recoveryAttempt: attempt,
  };
}

function serialiseExecutionResult(executionResult) {
  const finalExecution = executionResult.finalExecution ?? executionResult;
  return {
    executor: executionResult.recovery?.attempted ? "core-v3" : finalExecution.verification ? "core-v2" : "core-v1",
    actions: (finalExecution.actions ?? []).map((action) => ({
      kind: action?.kind ?? null,
      degraded: Boolean(action?.degraded),
      result: action?.result ?? null,
    })),
    policy: finalExecution.policy ?? finalExecution.task?.policy?.decision ?? null,
    verification: finalExecution.verification ?? null,
    finalReadiness: finalExecution.verifiedScreen?.screen?.readiness ?? null,
    finalWorkView: finalExecution.finalWorkViewState?.workView ?? null,
    recovery: executionResult.recovery ?? null,
    attempts: (executionResult.attempts ?? [finalExecution]).map((attempt) => ({
      taskId: attempt.task?.id ?? null,
      status: attempt.task?.status ?? null,
      phase: attempt.task?.executionPhase ?? null,
      verification: attempt.verification?.ok ?? null,
      failedChecks: attempt.verification?.failedChecks?.map((check) => check.name) ?? [],
    })),
  };
}

async function executeTaskWithRecovery(task, options = {}) {
  const firstExecution = await executeTask(task, options);
  const maxRecoveryAttempts =
    Number.isInteger(options.maxRecoveryAttempts) && options.maxRecoveryAttempts > 0
      ? options.maxRecoveryAttempts
      : Number.isInteger(options.retryBudget) && options.retryBudget > 0
        ? options.retryBudget
        : 0;

  if (firstExecution.task.status !== "failed" || options.autoRecover !== true || maxRecoveryAttempts < 1) {
    return {
      finalExecution: firstExecution,
      attempts: [firstExecution],
      recovery: {
        attempted: false,
        maxAttempts: maxRecoveryAttempts,
      },
    };
  }

  let sourceTask = firstExecution.task;
  const attempts = [firstExecution];
  const recoveredTaskIds = [];

  for (let attempt = 1; attempt <= maxRecoveryAttempts; attempt += 1) {
    const recoveredTask = recoverTask(sourceTask);
    recoveredTaskIds.push(recoveredTask.id);
    reconcileRuntimeState();
    await publishEvent("task.created", { task: serialiseTask(recoveredTask), executor: "core-v3" });
    await publishTaskApprovalIfPending(recoveredTask);
    await publishEvent("task.recovered", {
      task: serialiseTask(recoveredTask),
      recoveredFromTaskId: sourceTask.id,
      autoRecovered: true,
      attempt,
      executor: "core-v3",
    });

    const recoveryExecution = await executeTask(recoveredTask, buildRecoveryExecuteOptions(options, attempt));
    attempts.push(recoveryExecution);
    sourceTask = recoveryExecution.task;

    if (recoveryExecution.task.status !== "failed") {
      return {
        finalExecution: recoveryExecution,
        attempts,
        recovery: {
          attempted: true,
          succeeded: true,
          attempts: attempt,
          recoveredTaskIds,
          recoveredFromTaskId: firstExecution.task.id,
        },
      };
    }
  }

  return {
    finalExecution: attempts.at(-1),
    attempts,
    recovery: {
      attempted: true,
      succeeded: false,
      attempts: maxRecoveryAttempts,
      recoveredTaskIds,
      recoveredFromTaskId: firstExecution.task.id,
    },
  };
}

function buildOperatorOptions(task, body = {}) {
  const planActions = task.plan?.steps
    ?.filter((step) => step.phase === "acting_on_target")
    .map((step) => ({ kind: step.kind, params: step.params ?? {} }));
  return {
    ...body,
    targetUrl: body.targetUrl ?? task.targetUrl,
    actions: Array.isArray(body.actions) ? body.actions : planActions,
    operator: "loop-v1",
  };
}

async function runOperatorStep(body = {}) {
  reconcileRuntimeState();
  const ignorePause = body.ignorePause === true;
  const dryRun = body.dryRun === true || body.peek === true;

  if (runtimeState.paused && !ignorePause) {
    return {
      ran: false,
      blocked: true,
      reason: "runtime_paused",
      dryRun,
      task: null,
      execution: null,
      summary: buildTaskSummary(),
      operator: buildOperatorState(),
    };
  }

  const task = getNextQueuedTask();
  if (!task) {
    return {
      ran: false,
      blocked: false,
      reason: "no_queued_task",
      dryRun,
      task: null,
      execution: null,
      summary: buildTaskSummary(),
      operator: buildOperatorState(),
    };
  }

  if (dryRun) {
    return {
      ran: false,
      blocked: false,
      reason: "dry_run",
      dryRun: true,
      task,
      execution: null,
      summary: buildTaskSummary(),
      operator: buildOperatorState(),
    };
  }

  const policy = ensureTaskPolicy(task, { stage: "operator.step" });
  await publishEvent("policy.evaluated", { task: serialiseTask(task), policy: policy.decision });
  if (!isPolicyExecutionAllowed(policy.decision)) {
    const approval = task.approval?.requestId ? approvals.get(task.approval.requestId) : null;
    return {
      ran: false,
      blocked: true,
      reason: policy.decision.decision === "deny" ? "policy_denied" : "policy_requires_approval",
      dryRun: false,
      task,
      execution: null,
      policy: policy.decision,
      approval: approval ? serialiseApproval(approval) : null,
      summary: buildTaskSummary(),
      operator: buildOperatorState(),
    };
  }

  const executionResult = await executeTaskWithRecovery(task, buildOperatorOptions(task, body));
  return {
    ran: true,
    blocked: false,
    reason: null,
    dryRun: false,
    task: executionResult.finalExecution.task,
    execution: executionResult,
    summary: buildTaskSummary(),
    operator: buildOperatorState(),
  };
}

async function runOperatorLoop(body = {}) {
  const maxSteps = Number.isInteger(body.maxSteps) && body.maxSteps > 0 ? Math.min(body.maxSteps, 20) : 5;
  const steps = [];
  let stopReason = null;
  let blocked = false;
  let dryRun = false;
  let nextTask = null;

  for (let index = 0; index < maxSteps; index += 1) {
    const step = await runOperatorStep(body);
    if (!step.ran) {
      stopReason = step.reason ?? null;
      blocked = step.blocked === true;
      dryRun = step.dryRun === true;
      nextTask = step.task ?? null;
      break;
    }
    steps.push(step);
  }

  return {
    ran: steps.length > 0,
    steps,
    blocked,
    reason: stopReason,
    dryRun,
    nextTask,
    summary: buildTaskSummary(),
    operator: buildOperatorState(),
  };
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
      sessionManagerUrl,
      browserRuntimeUrl,
      screenSenseUrl,
      screenActUrl,
      systemSenseUrl,
      systemHealUrl,
      stateFilePath,
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

  if (req.method === "GET" && requestUrl.pathname === "/operator/state") {
    sendJson(res, 200, {
      ok: true,
      operator: buildOperatorState(),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/policy/state") {
    sendJson(res, 200, {
      ok: true,
      policy: buildPolicyState(),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/capabilities") {
    const registry = await buildCapabilityRegistry();
    sendJson(res, 200, {
      ok: true,
      ...registry,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/capabilities/summary") {
    const registry = await buildCapabilityRegistry();
    sendJson(res, 200, {
      ok: true,
      registry: registry.registry,
      mode: registry.mode,
      generatedAt: registry.generatedAt,
      summary: registry.summary,
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/capabilities/refresh") {
    const registry = await buildCapabilityRegistry();
    await publishEvent("capability.updated", {
      registry: registry.registry,
      summary: registry.summary,
    });
    sendJson(res, 200, {
      ok: true,
      refreshed: true,
      ...registry,
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/capabilities/invoke") {
    try {
      const body = await readJsonBody(req);
      const invocation = await invokeCapability(body);
      sendJson(res, invocation.statusCode, invocation.response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/policy/evaluate") {
    try {
      const body = await readJsonBody(req);
      const decision = recordPolicyDecision(evaluatePolicyIntent(body, { stage: "policy.evaluate" }));
      await publishEvent("policy.evaluated", { policy: decision });
      sendJson(res, 200, {
        ok: true,
        policy: decision,
        state: buildPolicyState(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/approvals") {
    const status = requestUrl.searchParams.get("status") || null;
    const limit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "20", 10);
    const safeLimit = Number.isNaN(limit) ? 20 : Math.max(1, Math.min(limit, 100));
    const items = listApprovals()
      .filter((approval) => !status || approval.status === status)
      .slice(0, safeLimit);
    sendJson(res, 200, {
      ok: true,
      count: items.length,
      items,
      summary: buildApprovalSummary(),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/approvals/summary") {
    sendJson(res, 200, {
      ok: true,
      summary: buildApprovalSummary(),
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname.startsWith("/approvals/") && requestUrl.pathname.endsWith("/approve")) {
    const approvalId = requestUrl.pathname.slice("/approvals/".length, -"/approve".length);
    const approval = approvals.get(approvalId);
    if (!approval) {
      sendJson(res, 404, { ok: false, error: "Approval request not found." });
      return;
    }
    if (approval.status !== "pending") {
      sendJson(res, 409, { ok: false, error: `Approval request is already ${approval.status}.` });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const result = markApprovalApproved(approval, {
        approvedBy: typeof body.approvedBy === "string" && body.approvedBy.trim() ? body.approvedBy.trim() : "user",
        reason: typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Approved by user.",
      });
      await publishEvent("approval.approved", {
        approval: serialiseApproval(result.approval),
        task: result.task ? serialiseTask(result.task) : null,
      });
      sendJson(res, 200, {
        ok: true,
        approval: serialiseApproval(result.approval),
        task: result.task ? serialiseTask(result.task) : null,
        summary: buildApprovalSummary(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname.startsWith("/approvals/") && requestUrl.pathname.endsWith("/deny")) {
    const approvalId = requestUrl.pathname.slice("/approvals/".length, -"/deny".length);
    const approval = approvals.get(approvalId);
    if (!approval) {
      sendJson(res, 404, { ok: false, error: "Approval request not found." });
      return;
    }
    if (approval.status !== "pending") {
      sendJson(res, 409, { ok: false, error: `Approval request is already ${approval.status}.` });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const result = markApprovalDenied(approval, {
        deniedBy: typeof body.deniedBy === "string" && body.deniedBy.trim() ? body.deniedBy.trim() : "user",
        reason: typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Denied by user.",
      });
      await publishEvent("approval.denied", {
        approval: serialiseApproval(result.approval),
        task: result.task ? serialiseTask(result.task) : null,
      });
      if (result.task?.status === "failed") {
        await publishEvent("task.failed", {
          task: serialiseTask(result.task),
          reason: "Approval denied by user.",
          approval: serialiseApproval(result.approval),
        });
      }
      sendJson(res, 200, {
        ok: true,
        approval: serialiseApproval(result.approval),
        task: result.task ? serialiseTask(result.task) : null,
        summary: buildApprovalSummary(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
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
      await publishTaskApprovalIfPending(task);
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

  if (req.method === "POST" && requestUrl.pathname === "/operator/step") {
    try {
      const body = await readJsonBody(req);
      const step = await runOperatorStep(body);
      sendJson(res, 200, {
        ok: true,
        ran: step.ran,
        blocked: step.blocked ?? false,
        reason: step.reason ?? null,
        dryRun: step.dryRun ?? false,
        task: step.task ? serialiseTask(step.task) : null,
        execution: step.execution ? serialiseExecutionResult(step.execution) : null,
        policy: step.policy ?? step.task?.policy?.decision ?? null,
        approval: step.approval ?? step.task?.approval ?? null,
        operator: step.operator ?? buildOperatorState(),
        summary: step.summary,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/operator/run") {
    try {
      const body = await readJsonBody(req);
      const result = await runOperatorLoop(body);
      sendJson(res, 200, {
        ok: true,
        ran: result.ran,
        count: result.steps.length,
        blocked: result.blocked ?? false,
        reason: result.reason ?? null,
        dryRun: result.dryRun ?? false,
        nextTask: result.nextTask ? serialiseTask(result.nextTask) : null,
        steps: result.steps.map((step) => ({
          task: step.task ? serialiseTask(step.task) : null,
          execution: step.execution ? serialiseExecutionResult(step.execution) : null,
          policy: step.policy ?? step.task?.policy?.decision ?? null,
        })),
        operator: result.operator ?? buildOperatorState(),
        summary: result.summary,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/tasks/plan") {
    try {
      const body = await readJsonBody(req);
      const task = createTask({
        ...body,
        goal:
          typeof body.goal === "string" && body.goal.trim()
            ? body.goal
            : `Plan work for ${body.targetUrl ?? "the target URL"}`,
        type: typeof body.type === "string" && body.type.trim() ? body.type : "browser_task",
        workViewStrategy:
          typeof body.workViewStrategy === "string" && body.workViewStrategy.trim()
            ? body.workViewStrategy
            : "ai-work-view",
        includePlan: true,
      });
      const reclaimedTasks = supersedeOtherActiveTasks(task.id);
      reconcileRuntimeState();

      await publishEvent("task.created", { task: serialiseTask(task), planner: "rule-v1" });
      await publishTaskApprovalIfPending(task);
      await publishEvent("task.planned", { task: serialiseTask(task), plan: task.plan });
      await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
        task: serialiseTask(reclaimedTask),
      })));
      sendJson(res, 201, {
        ok: true,
        task: serialiseTask(task),
        plan: task.plan,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/tasks/plan/execute") {
    try {
      const body = await readJsonBody(req);
      const task = createTask({
        ...body,
        goal:
          typeof body.goal === "string" && body.goal.trim()
            ? body.goal
            : `Plan and execute work for ${body.targetUrl ?? "the target URL"}`,
        type: typeof body.type === "string" && body.type.trim() ? body.type : "browser_task",
        workViewStrategy:
          typeof body.workViewStrategy === "string" && body.workViewStrategy.trim()
            ? body.workViewStrategy
            : "ai-work-view",
        includePlan: true,
      });
      const reclaimedTasks = supersedeOtherActiveTasks(task.id);
      reconcileRuntimeState();

      await publishEvent("task.created", { task: serialiseTask(task), planner: "rule-v1" });
      await publishTaskApprovalIfPending(task);
      await publishEvent("task.planned", { task: serialiseTask(task), plan: task.plan });
      await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
        task: serialiseTask(reclaimedTask),
      })));

      const executionResult = await executeTaskWithRecovery(task, {
        ...body,
        actions: Array.isArray(body.actions) ? body.actions : task.plan?.steps
          ?.filter((step) => step.phase === "acting_on_target")
          .map((step) => ({ kind: step.kind, params: step.params ?? {} })),
      });
      const execution = executionResult.finalExecution;
      sendJson(res, 201, {
        ok: true,
        task: serialiseTask(execution.task),
        plan: execution.task.plan ?? null,
        runtime: runtimeState,
        execution: serialiseExecutionResult(executionResult),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/tasks/execute") {
    try {
      const body = await readJsonBody(req);
      const task = createTask({
        ...body,
        goal:
          typeof body.goal === "string" && body.goal.trim()
            ? body.goal
            : `Open the AI work view at ${body.targetUrl ?? "the target URL"}`,
        type: typeof body.type === "string" && body.type.trim() ? body.type : "browser_task",
        workViewStrategy:
          typeof body.workViewStrategy === "string" && body.workViewStrategy.trim()
            ? body.workViewStrategy
            : "ai-work-view",
      });
      const reclaimedTasks = supersedeOtherActiveTasks(task.id);
      reconcileRuntimeState();

      await publishEvent("task.created", { task: serialiseTask(task), executor: "core-v1" });
      await publishTaskApprovalIfPending(task);
      await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent("task.phase_changed", {
        task: serialiseTask(reclaimedTask),
      })));

      const executionResult = await executeTaskWithRecovery(task, body);
      const execution = executionResult.finalExecution;
      sendJson(res, 201, {
        ok: true,
        task: serialiseTask(execution.task),
        runtime: runtimeState,
        execution: serialiseExecutionResult(executionResult),
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
      await publishTaskApprovalIfPending(recoveredTask);
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

  if (
    req.method === "POST"
    && requestUrl.pathname.startsWith("/tasks/")
    && requestUrl.pathname.endsWith("/execute")
  ) {
    const taskId = requestUrl.pathname.slice("/tasks/".length, -"/execute".length);
    const task = getTaskById(taskId);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Task not found." });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const executionResult = await executeTaskWithRecovery(task, body);
      const execution = executionResult.finalExecution;
      sendJson(res, 200, {
        ok: true,
        task: serialiseTask(execution.task),
        runtime: runtimeState,
        execution: serialiseExecutionResult(executionResult),
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

  if (req.method === "POST" && requestUrl.pathname === "/control/resume") {
    const task = getCurrentTask()
      ?? [...tasks.values()].filter((candidate) => candidate.status === "paused").sort(compareTasksForDisplay)[0]
      ?? null;

    if (!task || task.status !== "paused") {
      sendJson(res, 409, { ok: false, error: "No paused task to resume." });
      return;
    }

    task.status = "queued";
    appendTaskPhase(task, "resumed", { reason: "Resumed by operator." });
    reconcileRuntimeState();

    await publishEvent("task.resumed", { task: serialiseTask(task) });
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

loadPersistentState();
reconcileRuntimeState();

server.listen(port, host, async () => {
  console.log(`openclaw-core listening on http://${host}:${port}`);
  await publishEvent("service.started", {
    service: "openclaw-core",
    url: `http://${host}:${port}`,
  });
});
