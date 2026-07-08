import { sendJson } from "../../../packages/shared-utils/src/http.mjs";

function errorMessage(error) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function handleSystemdDraftRoute({
  req,
  res,
  requestUrl,
  planBuilder,
}) {
  if (req.method !== "GET" || requestUrl.pathname !== "/system/systemd/repair-execution-task-draft") {
    return false;
  }

  try {
    const result = await planBuilder.buildSystemdRepairExecutionTaskDraft({
      unit: requestUrl.searchParams.get("unit") ?? requestUrl.searchParams.get("target"),
      execute: requestUrl.searchParams.get("execute") === "true",
    });
    sendJson(res, 200, {
      ok: true,
      ...result,
    });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: errorMessage(error) });
  }
  return true;
}
