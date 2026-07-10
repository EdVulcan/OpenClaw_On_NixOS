import { readJsonBody, sendJson } from "../../../packages/shared-utils/src/http.mjs";
import {
  buildNativeEngineeringPlanTodoWorkbenchStorageReadback,
  createNativeEngineeringPlanTodoWorkbenchStorageRecord,
} from "./native-engineering-plan-todo-workbench-storage.mjs";

function parseLimit(searchParams) {
  const parsed = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

export async function handleNativeEngineeringPlanTodoWorkbenchRoute({
  req,
  res,
  requestUrl,
  state,
  publishEvent,
}) {
  if (requestUrl.pathname !== "/plugins/native-adapter/engineering-plan-todo/workbench-state") {
    return false;
  }

  const records = state.nativeEngineeringPlanTodoWorkbenchRecords;
  if (req.method === "GET") {
    sendJson(res, 200, buildNativeEngineeringPlanTodoWorkbenchStorageReadback({
      records,
      taskId: requestUrl.searchParams.get("taskId"),
      limit: parseLimit(requestUrl.searchParams),
    }));
    return true;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed." });
    return true;
  }

  try {
    const body = await readJsonBody(req);
    const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
    const task = taskId ? state.tasks.get(taskId) : null;
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Native engineering plan/todo workbench storage requires an existing task." });
      return true;
    }

    const record = createNativeEngineeringPlanTodoWorkbenchStorageRecord({
      records,
      task,
      body,
    });
    state.persistState();
    await publishEvent?.("native_engineering.plan_todo.workbench_state_saved", {
      taskId: record.taskId,
      revision: record.revision,
      todoCount: record.counts.total,
      todoFileWritten: false,
      taskStateMutated: false,
      commandExecuted: false,
      providerCalled: false,
    });

    sendJson(res, 201, {
      ok: true,
      ...buildNativeEngineeringPlanTodoWorkbenchStorageReadback({
        records,
        taskId: record.taskId,
        limit: 1,
      }),
      record,
    });
    return true;
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    return true;
  }
}
