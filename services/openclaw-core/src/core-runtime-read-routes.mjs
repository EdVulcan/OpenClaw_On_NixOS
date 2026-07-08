import { sendJson } from "../../../packages/shared-utils/src/http.mjs";

export async function handleCoreRuntimeReadRoute({
  req,
  res,
  requestUrl,
  state,
  taskManager,
}) {
  if (req.method !== "GET" || requestUrl.pathname !== "/state/runtime") {
    return false;
  }

  const { tasks, runtimeState } = state;
  taskManager.reconcileRuntimeState();
  sendJson(res, 200, {
    runtime: runtimeState,
    taskCount: tasks.size,
    currentTask: runtimeState.currentTaskId
      ? taskManager.serialiseTask(taskManager.getTaskById(runtimeState.currentTaskId))
      : null,
  });
  return true;
}
