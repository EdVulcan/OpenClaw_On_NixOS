import { buildPlanTodoNextGovernedActionSuggestion } from "./native-engineering-plan-todo-next-action.mjs";

export const NATIVE_ENGINEERING_PLAN_TODO_EVIDENCE_REGISTRY = "openclaw-native-engineering-plan-todo-evidence-v0";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_TODOS = 50;
const MAX_TEXT_CHARS = 240;

const TODO_STATUSES = new Set(["pending", "in_progress", "done"]);

function normalisePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function boundedPlanTodoText(value, maxChars = MAX_TEXT_CHARS) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return "";
  }
  return text.length > maxChars ? `${text.slice(0, Math.max(0, maxChars - 3))}...` : text;
}

function taskList(tasks) {
  if (tasks instanceof Map) {
    return [...tasks.values()];
  }
  if (Array.isArray(tasks)) {
    return tasks;
  }
  return [];
}

function parseTodos(value) {
  if (Array.isArray(value)) {
    return { todos: value, parseError: null };
  }
  if (typeof value !== "string" || !value.trim()) {
    return { todos: [], parseError: null };
  }
  try {
    const parsed = JSON.parse(value);
    return { todos: Array.isArray(parsed) ? parsed : [], parseError: Array.isArray(parsed) ? null : "todosJson must be an array" };
  } catch (error) {
    return {
      todos: [],
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

function normaliseTodoItem(item, index, source = "query_todos") {
  if (!item || typeof item !== "object") {
    return null;
  }
  const id = boundedPlanTodoText(item.id ?? `todo-${index + 1}`, 80) || `todo-${index + 1}`;
  const description = boundedPlanTodoText(item.description ?? item.title ?? item.phase ?? item.kind ?? "", MAX_TEXT_CHARS);
  if (!description) {
    return null;
  }
  const status = TODO_STATUSES.has(item.status) ? item.status : "pending";
  return {
    id,
    description,
    status,
    source,
    writesFile: false,
    mutatesTask: false,
  };
}

export function normalisePlanTodoItems(items = [], source = "query_todos") {
  return (Array.isArray(items) ? items : [])
    .slice(0, MAX_TODOS)
    .map((item, index) => normaliseTodoItem(item, index, source))
    .filter(Boolean);
}

function statusFromPlanStep(step) {
  const status = String(step?.status ?? "").trim();
  if (status === "completed" || status === "done") {
    return "done";
  }
  if (status === "running" || status === "in_progress") {
    return "in_progress";
  }
  return "pending";
}

function todoItemFromPlanStep(step, index, taskId) {
  const id = boundedPlanTodoText(step?.id ?? step?.phase ?? `plan-step-${index + 1}`, 80) || `plan-step-${index + 1}`;
  const description = boundedPlanTodoText(step?.title ?? step?.summary ?? step?.kind ?? step?.phase ?? id, MAX_TEXT_CHARS);
  if (!description) {
    return null;
  }
  return {
    id,
    description,
    status: statusFromPlanStep(step),
    source: "task_plan_step",
    taskId,
    phase: step?.phase ?? null,
    kind: step?.kind ?? null,
    writesFile: false,
    mutatesTask: false,
  };
}

export function countPlanTodoItems(todos) {
  return todos.reduce((counts, todo) => {
    counts.total += 1;
    counts[todo.status] = (counts[todo.status] ?? 0) + 1;
    return counts;
  }, {
    total: 0,
    pending: 0,
    in_progress: 0,
    done: 0,
  });
}

function summarizeTaskPlan(task) {
  const plan = task?.plan && typeof task.plan === "object" ? task.plan : null;
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  const todos = steps
    .slice(0, MAX_TODOS)
    .map((step, index) => todoItemFromPlanStep(step, index, task?.id ?? null))
    .filter(Boolean);
  return {
    taskId: task?.id ?? null,
    taskType: task?.type ?? null,
    taskStatus: task?.status ?? null,
    taskGoal: boundedPlanTodoText(task?.goal ?? "", MAX_TEXT_CHARS),
    plan: plan
      ? {
          planner: plan.planner ?? null,
          strategy: plan.strategy ?? null,
          status: plan.status ?? null,
          summary: boundedPlanTodoText(plan.summary ?? task?.goal ?? "", MAX_TEXT_CHARS),
          stepCount: steps.length,
          visibleTodoCount: todos.length,
        }
      : null,
    todos,
    todoCounts: countPlanTodoItems(todos),
  };
}

function selectTasks({ tasks, taskId, runtimeState, limit }) {
  const items = taskList(tasks);
  const selectedTaskId = taskId || runtimeState?.currentTaskId || null;
  if (selectedTaskId) {
    const selected = items.find((task) => task?.id === selectedTaskId);
    return selected ? [selected] : [];
  }
  return items
    .slice()
    .sort((left, right) => String(right?.createdAt ?? right?.updatedAt ?? right?.closedAt ?? "").localeCompare(
      String(left?.createdAt ?? left?.updatedAt ?? left?.closedAt ?? ""),
    ))
    .slice(0, limit);
}

function buildToolMappings() {
  return [
    {
      sourceToolName: "cc_plan_enter",
      intendedNativeCapabilityId: "sense.openclaw.engineering_context.plan_todo_evidence",
      operationClass: "planning_state_evidence",
      risk: "low",
      approvalExpectation: "no approval for read-only evidence; future state mutation requires governed task/workbench storage",
      auditExpectation: "record visible plan summary linkage without hidden mode switch",
      observerVisibilityExpectation: "show planning summary, active task linkage, and mutation boundaries",
      migrationStatus: "absorbed_as_evidence",
      deferredExecutionBoundary: "no hidden planning mode switch is created",
    },
    {
      sourceToolName: "cc_plan_exit",
      intendedNativeCapabilityId: "sense.openclaw.engineering_context.plan_todo_evidence",
      operationClass: "planning_state_evidence",
      risk: "low",
      approvalExpectation: "no approval for read-only evidence; execution transition remains task-policy governed",
      auditExpectation: "record confirmed plan linkage without changing task execution state",
      observerVisibilityExpectation: "show confirmed plan evidence and blocked execution transition",
      migrationStatus: "absorbed_as_evidence",
      deferredExecutionBoundary: "no execution transition or task status mutation is performed",
    },
    {
      sourceToolName: "cc_todo_write",
      intendedNativeCapabilityId: "sense.openclaw.engineering_context.plan_todo_evidence",
      operationClass: "todo_state_evidence",
      risk: "low",
      approvalExpectation: "no approval for read-only evidence; future persisted todo writes require governed workbench storage",
      auditExpectation: "record todo counts, current item hints, and task-plan linkage",
      observerVisibilityExpectation: "show todo counts, pending/in-progress/done breakdown, and persistence boundary",
      migrationStatus: "absorbed_as_evidence",
      deferredExecutionBoundary: "no .openclaw/cc-todo.md file is written",
    },
  ];
}

function buildGovernance() {
  return {
    mode: "native_engineering_plan_todo_evidence_read_only",
    runtimeOwner: "openclaw_on_nixos",
    canReadTaskWorkbenchState: true,
    canReadPersistedWorkbenchStorage: true,
    canReadTaskPlanSteps: true,
    canSwitchHiddenAgentMode: false,
    canWriteTodoFile: false,
    canMutateTaskState: false,
    canCreateTask: false,
    canCreateApproval: false,
    canExecuteCommand: false,
    canCallProvider: false,
    observerVisible: true,
  };
}

function selectWorkbenchRecord({ workbenchRecords, taskId, runtimeState }) {
  if (!(workbenchRecords instanceof Map)) {
    return null;
  }
  const selectedTaskId = taskId || runtimeState?.currentTaskId || null;
  if (selectedTaskId && workbenchRecords.has(selectedTaskId)) {
    return workbenchRecords.get(selectedTaskId);
  }
  return [...workbenchRecords.values()]
    .sort((left, right) => String(right?.updatedAt ?? right?.createdAt ?? "").localeCompare(
      String(left?.updatedAt ?? left?.createdAt ?? ""),
    ))[0] ?? null;
}

export function buildNativeEngineeringPlanTodoEvidence({
  tasks = new Map(),
  runtimeState = {},
  workbenchRecords = new Map(),
  taskId = null,
  planSummary = null,
  confirmedPlan = null,
  todos = [],
  todosJson = null,
  limit = DEFAULT_LIMIT,
} = {}) {
  const safeLimit = normalisePositiveInteger(limit, DEFAULT_LIMIT, MAX_LIMIT);
  const parsedTodos = todosJson ? parseTodos(todosJson) : parseTodos(todos);
  const queryTodos = normalisePlanTodoItems(parsedTodos.todos, "query_todos");
  const workbenchRecord = selectWorkbenchRecord({ workbenchRecords, taskId, runtimeState });
  const workbenchTodos = normalisePlanTodoItems(workbenchRecord?.todos ?? [], "workbench_storage");
  const taskPlans = selectTasks({ tasks, taskId, runtimeState, limit: safeLimit })
    .map((task) => summarizeTaskPlan(task));
  const taskTodos = taskPlans.flatMap((task) => task.todos).slice(0, MAX_TODOS);
  const evidenceTodos = queryTodos.length > 0
    ? queryTodos
    : workbenchTodos.length > 0
      ? workbenchTodos
      : taskTodos;
  const todoSource = queryTodos.length > 0
    ? "query_todos"
    : workbenchTodos.length > 0
      ? "workbench_storage"
      : "task_plan_steps";
  const generatedAt = new Date().toISOString();
  const summary = {
    taskPlanCount: taskPlans.length,
    todoSource,
    planSummaryObserved: Boolean(boundedPlanTodoText(planSummary))
      || Boolean(workbenchRecord?.planSummaryPreview)
      || taskPlans.some((task) => task.plan?.summary),
    confirmedPlanObserved: Boolean(boundedPlanTodoText(confirmedPlan)) || Boolean(workbenchRecord?.confirmedPlanPreview),
    queryTodoCount: queryTodos.length,
    workbenchTodoCount: workbenchTodos.length,
    taskTodoCount: taskTodos.length,
    evidenceTodoCounts: countPlanTodoItems(evidenceTodos),
  };

  return {
    ok: true,
    registry: NATIVE_ENGINEERING_PLAN_TODO_EVIDENCE_REGISTRY,
    mode: "planning-todo-evidence-only",
    generatedAt,
    identityLevel: "Level 1: stable user-space control plane",
    sourceCapability: {
      sourceToolNames: ["cc_plan_enter", "cc_plan_exit", "cc_todo_write"],
      intendedNativeCapabilityId: "sense.openclaw.engineering_context.plan_todo_evidence",
      migrationMode: "task_workbench_evidence_without_hidden_mode_or_file_write",
    },
    capability: {
      id: "sense.openclaw.engineering_context.plan_todo_evidence",
      sourceToolNames: ["cc_plan_enter", "cc_plan_exit", "cc_todo_write"],
      risk: "low",
      approvalRequired: false,
    },
    sourceRegistries: [
      "task-workbench-state",
      "openclaw-native-engineering-plan-todo-workbench-storage-v0",
      "rule-plan-v1",
      "openclaw-native-engineering-tool-surface-inventory-v0",
    ],
    query: {
      taskId,
      limit: safeLimit,
      planSummaryChars: boundedPlanTodoText(planSummary).length,
      confirmedPlanChars: boundedPlanTodoText(confirmedPlan).length,
      todoItemsProvided: queryTodos.length,
      todosParseError: parsedTodos.parseError,
    },
    bounds: {
      maxTasks: MAX_LIMIT,
      maxTodos: MAX_TODOS,
      maxTextChars: MAX_TEXT_CHARS,
      noHiddenPlanningMode: true,
      noTodoFileWrite: true,
      noTaskMutation: true,
      noCommandExecution: true,
      noProviderCall: true,
    },
    governance: buildGovernance(),
    toolMappings: buildToolMappings(),
    planningEvidence: {
      enter: {
        sourceToolName: "cc_plan_enter",
        observed: Boolean(boundedPlanTodoText(planSummary)) || Boolean(workbenchRecord?.planSummaryPreview),
        summaryPreview: boundedPlanTodoText(planSummary) || (workbenchRecord?.planSummaryPreview ?? ""),
        hiddenModeCreated: false,
      },
      exit: {
        sourceToolName: "cc_plan_exit",
        observed: Boolean(boundedPlanTodoText(confirmedPlan)) || Boolean(workbenchRecord?.confirmedPlanPreview),
        confirmedPlanPreview: boundedPlanTodoText(confirmedPlan) || (workbenchRecord?.confirmedPlanPreview ?? ""),
        executionTransitionCreated: false,
      },
      todoWrite: {
        sourceToolName: "cc_todo_write",
        observed: evidenceTodos.length > 0,
        todoPath: ".openclaw/cc-todo.md",
        todoPathWritten: false,
        taskStateMutated: false,
        workbenchStatePersisted: Boolean(workbenchRecord),
        counts: countPlanTodoItems(evidenceTodos),
        items: evidenceTodos,
      },
    },
    taskPlanEvidence: {
      selectedTaskId: taskId || runtimeState?.currentTaskId || null,
      count: taskPlans.length,
      items: taskPlans,
    },
    workbenchStorage: {
      registry: "openclaw-native-engineering-plan-todo-workbench-storage-v0",
      persisted: Boolean(workbenchRecord),
      recordId: workbenchRecord?.recordId ?? null,
      taskId: workbenchRecord?.taskId ?? null,
      revision: workbenchRecord?.revision ?? 0,
      updatedAt: workbenchRecord?.updatedAt ?? null,
      todoCount: workbenchTodos.length,
      todoFileWritten: false,
      taskStateMutated: false,
    },
    nextGovernedActionSuggestion: buildPlanTodoNextGovernedActionSuggestion({
      todos: evidenceTodos,
      todoSource,
      workbenchStatePersisted: Boolean(workbenchRecord),
    }),
    summary,
    auditEvidence: {
      operation: "plan_todo_evidence",
      capabilityId: "sense.openclaw.engineering_context.plan_todo_evidence",
      generatedAt,
      taskId,
      summary,
      persisted: false,
      evidenceKind: "response_embedded_audit_evidence",
    },
    deferredExecutionBoundaries: [
      "no hidden planning mode switch",
      "no execution transition",
      "no .openclaw/cc-todo.md write",
      "no task state mutation",
      "no approval creation",
      "no command execution",
      "no provider call",
    ],
  };
}
