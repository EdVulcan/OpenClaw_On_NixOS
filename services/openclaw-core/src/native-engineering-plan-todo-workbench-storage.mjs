import { createHash, randomUUID } from "node:crypto";

import {
  boundedPlanTodoText,
  countPlanTodoItems,
  normalisePlanTodoItems,
} from "./native-engineering-plan-todo-evidence-builders.mjs";

export const NATIVE_ENGINEERING_PLAN_TODO_WORKBENCH_STORAGE_REGISTRY =
  "openclaw-native-engineering-plan-todo-workbench-storage-v0";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function normaliseLimit(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : DEFAULT_LIMIT;
}

function recordList(records) {
  if (records instanceof Map) {
    return [...records.values()];
  }
  if (Array.isArray(records)) {
    return records;
  }
  return [];
}

function todoDigest(todos) {
  return createHash("sha256")
    .update(JSON.stringify(todos))
    .digest("hex");
}

function buildGovernance({ persisted }) {
  return {
    runtimeOwner: "openclaw_on_nixos",
    persistedInCoreState: Boolean(persisted),
    operatorExplicit: true,
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

function publicRecord(record) {
  if (!record) {
    return null;
  }
  return {
    registry: record.registry ?? NATIVE_ENGINEERING_PLAN_TODO_WORKBENCH_STORAGE_REGISTRY,
    mode: record.mode ?? "governed-core-workbench-storage",
    recordId: record.recordId ?? null,
    key: record.key ?? record.taskId ?? null,
    taskId: record.taskId ?? null,
    taskStatus: record.taskStatus ?? null,
    taskGoalPreview: record.taskGoalPreview ?? "",
    revision: record.revision ?? 0,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
    source: record.source ?? "operator_confirmed_workbench_state",
    planSummaryPreview: record.planSummaryPreview ?? "",
    confirmedPlanPreview: record.confirmedPlanPreview ?? "",
    todoSha256: record.todoSha256 ?? null,
    counts: record.counts ?? countPlanTodoItems(record.todos ?? []),
    todos: normalisePlanTodoItems(record.todos ?? [], "workbench_storage"),
    governance: buildGovernance({ persisted: true }),
    auditEvidence: record.auditEvidence ?? null,
  };
}

export function buildNativeEngineeringPlanTodoWorkbenchStorageReadback({
  records = new Map(),
  taskId = null,
  limit = DEFAULT_LIMIT,
} = {}) {
  const safeLimit = normaliseLimit(limit);
  const items = recordList(records)
    .filter((record) => !taskId || record?.taskId === taskId)
    .sort((left, right) => String(right?.updatedAt ?? right?.createdAt ?? "").localeCompare(
      String(left?.updatedAt ?? left?.createdAt ?? ""),
    ))
    .slice(0, safeLimit)
    .map(publicRecord);
  const selected = taskId
    ? items.find((record) => record?.taskId === taskId) ?? null
    : items[0] ?? null;

  return {
    ok: true,
    registry: NATIVE_ENGINEERING_PLAN_TODO_WORKBENCH_STORAGE_REGISTRY,
    mode: "governed-core-workbench-storage-readback",
    identityLevel: "Level 1: stable user-space control plane",
    capability: {
      id: "act.openclaw.engineering_context.plan_todo_workbench_state",
      sourceToolNames: ["cc_plan_enter", "cc_plan_exit", "cc_todo_write"],
      risk: "low",
      approvalRequired: false,
      operatorConfirmationRequired: true,
    },
    query: {
      taskId,
      limit: safeLimit,
    },
    summary: {
      totalRecords: recordList(records).length,
      returnedRecords: items.length,
      selectedTaskId: selected?.taskId ?? null,
      selectedRevision: selected?.revision ?? 0,
      selectedTodoCount: selected?.counts?.total ?? 0,
    },
    selectedRecord: selected,
    items,
    governance: buildGovernance({ persisted: true }),
    bounds: {
      maxRecords: MAX_LIMIT,
      noTodoFileWrite: true,
      noTaskMutation: true,
      noApprovalCreation: true,
      noCommandExecution: true,
      noProviderCall: true,
      noResultEnvelope: true,
    },
    deferredExecutionBoundaries: [
      "no hidden planning mode switch",
      "no .openclaw/cc-todo.md write",
      "no task state mutation",
      "no approval creation",
      "no command execution",
      "no provider call",
      "no result envelope",
    ],
  };
}

export function createNativeEngineeringPlanTodoWorkbenchStorageRecord({
  records,
  task,
  body = {},
  now = new Date().toISOString(),
} = {}) {
  if (!records || typeof records.set !== "function") {
    throw new Error("Native engineering plan/todo workbench storage requires a writable records map.");
  }
  if (!task?.id) {
    throw new Error("Native engineering plan/todo workbench storage requires an existing task.");
  }
  if (body.confirm !== true) {
    throw new Error("Native engineering plan/todo workbench storage requires confirm=true.");
  }

  const todos = normalisePlanTodoItems(body.todos ?? [], "workbench_storage");
  const previous = records.get(task.id) ?? null;
  const record = {
    registry: NATIVE_ENGINEERING_PLAN_TODO_WORKBENCH_STORAGE_REGISTRY,
    mode: "governed-core-workbench-storage",
    recordId: randomUUID(),
    key: task.id,
    taskId: task.id,
    taskStatus: task.status ?? null,
    taskGoalPreview: boundedPlanTodoText(task.goal ?? "", 240),
    revision: (previous?.revision ?? 0) + 1,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    source: boundedPlanTodoText(body.source ?? "operator_confirmed_workbench_state", 80)
      || "operator_confirmed_workbench_state",
    planSummaryPreview: boundedPlanTodoText(body.planSummary ?? task.plan?.summary ?? task.goal ?? "", 240),
    confirmedPlanPreview: boundedPlanTodoText(body.confirmedPlan ?? "", 240),
    todoSha256: todoDigest(todos),
    counts: countPlanTodoItems(todos),
    todos,
    governance: buildGovernance({ persisted: true }),
    auditEvidence: {
      operation: "plan_todo_workbench_state_write",
      capabilityId: "act.openclaw.engineering_context.plan_todo_workbench_state",
      generatedAt: now,
      taskId: task.id,
      revision: (previous?.revision ?? 0) + 1,
      todoCount: todos.length,
      todoSha256: todoDigest(todos),
      persisted: true,
      evidenceKind: "core_state_workbench_record",
      todoFileWritten: false,
      taskStateMutated: false,
      commandExecuted: false,
      providerCalled: false,
    },
  };

  records.set(task.id, record);
  return publicRecord(record);
}
