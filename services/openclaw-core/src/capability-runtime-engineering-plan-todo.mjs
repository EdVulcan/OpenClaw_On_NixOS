import {
  buildNativeEngineeringPlanTodoEvidence,
} from "./native-engineering-plan-todo-evidence-builders.mjs";
import {
  buildNativeEngineeringPlanTodoWorkbenchStorageReadback,
  createNativeEngineeringPlanTodoWorkbenchStorageRecord,
} from "./native-engineering-plan-todo-workbench-storage.mjs";

const EVIDENCE_CAPABILITY_ID = "sense.openclaw.engineering_context.plan_todo_evidence";
const WORKBENCH_CAPABILITY_ID = "act.openclaw.engineering_context.plan_todo_workbench_state";
const WORKBENCH_REGISTRY = "openclaw-native-engineering-plan-todo-workbench-storage-v0";
const MAX_TASK_ID_CHARS = 200;
const MAX_TODOS_JSON_CHARS = 60_000;

const DEFERRED_EXECUTION_BOUNDARIES = [
  "no hidden planning mode switch",
  "no .openclaw/cc-todo.md write",
  "no task state mutation",
  "no approval creation",
  "no command execution",
  "no provider call",
  "no result envelope",
];

function taskIdFromRequest(request) {
  const params = request.params ?? {};
  return normaliseTaskId(params.taskId ?? request.taskId);
}

function normaliseTaskId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("Engineering plan/todo taskId must be a string.");
  }
  const taskId = value.trim();
  if (!taskId) return null;
  if (taskId.length > MAX_TASK_ID_CHARS) {
    throw new Error("Engineering plan/todo taskId is too long.");
  }
  return taskId;
}

function findTask({ tasks, taskManager, taskId }) {
  if (!taskId) return null;
  if (typeof taskManager?.getTaskById === "function") {
    return taskManager.getTaskById(taskId) ?? null;
  }
  if (tasks instanceof Map) return tasks.get(taskId) ?? null;
  if (Array.isArray(tasks)) return tasks.find((task) => task?.id === taskId) ?? null;
  return null;
}

function taskSummary(task, taskId = null) {
  return {
    id: task?.id ?? taskId,
    status: task?.status ?? null,
    selected: Boolean(task),
  };
}

function buildGovernance({ persisted = false } = {}) {
  return {
    runtimeOwner: "openclaw_on_nixos",
    persistedInCoreState: persisted,
    operatorExplicit: persisted,
    requiresConfirmTrue: true,
    writesTodoFile: false,
    mutatesTaskState: false,
    createsTask: false,
    createsApproval: false,
    executesCommand: false,
    callsProvider: false,
    providerEgress: false,
    resultEnvelopeCreated: false,
    observerVisible: true,
  };
}

function buildBounds() {
  return {
    noTodoFileWrite: true,
    noTaskMutation: true,
    noApprovalCreation: true,
    noCommandExecution: true,
    noProviderCall: true,
    noResultEnvelope: true,
  };
}

function buildBlockedWorkbenchResult({ task, taskId, reason }) {
  return {
    ok: false,
    blocked: true,
    reason,
    registry: WORKBENCH_REGISTRY,
    mode: "governed-core-workbench-storage",
    capability: {
      id: WORKBENCH_CAPABILITY_ID,
      sourceToolNames: ["cc_plan_enter", "cc_plan_exit", "cc_todo_write"],
      risk: "low",
      approvalRequired: false,
      operatorConfirmationRequired: true,
    },
    task: taskSummary(task, taskId),
    governance: buildGovernance(),
    bounds: buildBounds(),
    deferredExecutionBoundaries: DEFERRED_EXECUTION_BOUNDARIES,
  };
}

export function createEngineeringPlanTodoCapabilityHandlers({
  tasks = new Map(),
  taskManager = {},
  runtimeState = {},
  workbenchRecords = new Map(),
  persistState = () => {},
  publishEvent = async () => {},
  now = () => new Date().toISOString(),
} = {}) {
  function callEvidence(request) {
    const params = request.params ?? {};
    return buildNativeEngineeringPlanTodoEvidence({
      tasks,
      runtimeState,
      workbenchRecords,
      taskId: taskIdFromRequest(request),
      planSummary: params.planSummary,
      confirmedPlan: params.confirmedPlan,
      todos: params.todos,
      todosJson: params.todosJson,
      limit: params.limit,
    });
  }

  async function callWorkbench(request) {
    const params = request.params ?? {};
    const taskId = taskIdFromRequest(request);
    const task = findTask({ tasks, taskManager, taskId });
    if (!task) {
      return buildBlockedWorkbenchResult({ task, taskId, reason: "task_not_found" });
    }
    if (params.confirm !== true) {
      return buildBlockedWorkbenchResult({
        task,
        taskId,
        reason: "operator_confirmation_required",
      });
    }

    const record = createNativeEngineeringPlanTodoWorkbenchStorageRecord({
      records: workbenchRecords,
      task,
      body: { ...params, taskId },
      now: now(),
    });
    persistState();
    await publishEvent("native_engineering.plan_todo.workbench_state_saved", {
      taskId: record.taskId,
      revision: record.revision,
      todoCount: record.counts.total,
      todoFileWritten: false,
      taskStateMutated: false,
      commandExecuted: false,
      providerCalled: false,
    });

    return {
      ok: true,
      blocked: false,
      changed: true,
      ...buildNativeEngineeringPlanTodoWorkbenchStorageReadback({
        records: workbenchRecords,
        taskId,
        limit: 1,
      }),
      record,
    };
  }

  async function callBackend(capability, request) {
    if (capability.id === EVIDENCE_CAPABILITY_ID) {
      return { handled: true, result: callEvidence(request) };
    }
    if (capability.id === WORKBENCH_CAPABILITY_ID) {
      return { handled: true, result: await callWorkbench(request) };
    }
    return { handled: false, result: null };
  }

  function summariseResult(capability, result) {
    if (capability.id === EVIDENCE_CAPABILITY_ID) {
      const summary = result?.summary ?? {};
      const governance = result?.governance ?? {};
      return {
        kind: "engineering.plan_todo_evidence",
        ok: result?.ok === true,
        taskPlanCount: summary.taskPlanCount ?? 0,
        todoSource: summary.todoSource ?? null,
        todoCount: summary.evidenceTodoCounts?.total ?? 0,
        workbenchTodoCount: summary.workbenchTodoCount ?? 0,
        noMutation: governance.canMutateTaskState === false
          && result?.bounds?.noTaskMutation === true,
        noTodoFileWrite: governance.canWriteTodoFile === false
          && result?.bounds?.noTodoFileWrite === true,
        noProviderEgress: governance.canCallProvider === false,
      };
    }
    if (capability.id === WORKBENCH_CAPABILITY_ID) {
      const governance = result?.governance ?? {};
      return {
        kind: "engineering.plan_todo_workbench_state",
        ok: result?.ok === true,
        blocked: result?.blocked === true || result?.ok !== true,
        reason: result?.reason ?? null,
        taskId: result?.record?.taskId ?? result?.task?.id ?? result?.summary?.selectedTaskId ?? null,
        revision: result?.record?.revision ?? result?.summary?.selectedRevision ?? 0,
        todoCount: result?.record?.counts?.total ?? result?.summary?.selectedTodoCount ?? 0,
        taskStatusPreserved: governance.mutatesTaskState === false,
        noTodoFileWrite: governance.writesTodoFile === false,
        noProviderEgress: governance.callsProvider === false
          && governance.providerEgress === false,
      };
    }
    return null;
  }

  function validateRequest(capability, request) {
    if (![EVIDENCE_CAPABILITY_ID, WORKBENCH_CAPABILITY_ID].includes(capability.id)) {
      return null;
    }
    try {
      const params = request.params ?? {};
      const taskId = taskIdFromRequest(request);
      if (capability.id === WORKBENCH_CAPABILITY_ID && !taskId) {
        throw new Error("Engineering plan/todo workbench taskId is required.");
      }
      if (params.confirm !== undefined && typeof params.confirm !== "boolean") {
        throw new Error("Engineering plan/todo workbench confirm must be a boolean.");
      }
      if (params.todos !== undefined && !Array.isArray(params.todos)) {
        throw new Error("Engineering plan/todo todos must be an array.");
      }
      if (params.todosJson !== undefined) {
        if (typeof params.todosJson !== "string" && !Array.isArray(params.todosJson)) {
          throw new Error("Engineering plan/todo todosJson must be a JSON string or array.");
        }
        if (typeof params.todosJson === "string" && params.todosJson.length > MAX_TODOS_JSON_CHARS) {
          throw new Error("Engineering plan/todo todosJson is too large.");
        }
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid engineering plan/todo request.";
    }
  }

  return { callBackend, summariseResult, validateRequest };
}
