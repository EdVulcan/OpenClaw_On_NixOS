import { corsHeaders, sendJson, readJsonBody } from "../../../packages/shared-utils/src/http.mjs";
import { handleApprovalRoute } from "./approval-routes.mjs";
import { handleCloudConsciousnessReadRoute } from "./cloud-consciousness-read-routes.mjs";
import { handleCloudLiveProviderCredentialPostRoute } from "./cloud-live-provider-credential-post-routes.mjs";
import { handleCloudLiveProviderResultEnvelopeGetRoute } from "./cloud-live-provider-result-envelope-routes.mjs";
import { handleCloudLiveProviderTaskPostRoute } from "./cloud-live-provider-task-post-routes.mjs";
import { handleDomainTaskPostRoute } from "./domain-task-post-routes.mjs";
import { handleNativeAdapterPluginRoute } from "./native-adapter-plugin-routes.mjs";
import { handleNativePluginRuntimeRoute } from "./native-plugin-runtime-routes.mjs";
import { handleObserverReadModelRoute } from "./observer-read-model-routes.mjs";
import { handleOperatorControlRoute } from "./operator-control-routes.mjs";
import { handlePhaseMemoryReadRoute } from "./phase-memory-read-routes.mjs";
import { handlePolicyCapabilityRoute } from "./policy-capability-routes.mjs";
import { handleTaskRoute } from "./task-routes.mjs";
import { handleWorkspaceNativeOpsRoute } from "./workspace-native-ops-routes.mjs";
import { handleWorkspacePluginReadRoute } from "./workspace-plugin-read-routes.mjs";

export function registerRoutes(deps) {
  const { state, client, policyEvaluator, approvalEngine, taskManager, pluginReview, workspaceOps, planBuilder, executor, publishEvent, host, port, stateFilePath, eventHubUrl, sessionManagerUrl, browserRuntimeUrl, screenSenseUrl, screenActUrl, systemSenseUrl, systemHealUrl } = deps;

  const { tasks, runtimeState, policyAuditLog, autonomyMode, updateRuntimeState, persistState, loadPersistentState } = state;
  const { fetchJson, postJson, readJsonFileIfPresent, buildSystemSenseUrl } = client;
  const { serialiseApproval, buildApprovalSummary, createApprovalRequestForTask, markApprovalExpired, reconcileApprovalExpirations, findExistingApprovalForTask } = approvalEngine;
  const { getTaskById, buildTaskSummary, serialiseTask, reconcileRuntimeState } = taskManager;
  const { buildSystemdRepairExecutionTaskDraft, serialisePlanForPublic, buildRulePlan, shouldBuildPlan, updatePlanForPhase } = planBuilder;
  const { serialiseExecutionResult } = executor;

  return async function handleRequest(req, res, requestUrl) {
    // ---- Generic Proxy Routing for observer-ui ----
    if (requestUrl.pathname.startsWith("/proxy/")) {
      const parts = requestUrl.pathname.split("/");
      const targetService = parts[2]; // e.g. "session-manager"
      const subpath = "/" + parts.slice(3).join("/"); // e.g. "/work-view/prepare"
      
      let targetUrlBase = null;
      if (targetService === "session-manager") targetUrlBase = sessionManagerUrl;
      else if (targetService === "event-hub") targetUrlBase = eventHubUrl;
      else if (targetService === "system-heal") targetUrlBase = systemHealUrl;
      else if (targetService === "screen-sense") targetUrlBase = screenSenseUrl;
      else if (targetService === "screen-act") targetUrlBase = screenActUrl;
      else if (targetService === "system-sense") targetUrlBase = systemSenseUrl;

      if (targetUrlBase) {
        try {
          if (req.method === "POST" || req.method === "PUT") {
            const body = await readJsonBody(req);
            const result = await postJson(`${targetUrlBase}${subpath}`, body);
            sendJson(res, 200, result);
          } else {
            const result = await fetchJson(`${targetUrlBase}${subpath}`);
            sendJson(res, 200, result);
          }
          return;
        } catch (error) {
          sendJson(res, 502, { ok: false, error: `Proxy failed: ${error.message}` });
          return;
        }
      }
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
      autonomyMode,
    });
    return;
  }

  if (await handlePhaseMemoryReadRoute({ req, res, requestUrl, planBuilder })) {
    return;
  }

  if (await handleCloudConsciousnessReadRoute({ req, res, requestUrl, planBuilder })) {
    return;
  }

  if (await handleCloudLiveProviderResultEnvelopeGetRoute({ req, res, requestUrl, planBuilder })) {
    return;
  }

  reconcileApprovalExpirations();

  if (req.method === "GET" && requestUrl.pathname === "/state/runtime") {
    reconcileRuntimeState();
    sendJson(res, 200, {
      runtime: runtimeState,
      taskCount: tasks.size,
      currentTask: runtimeState.currentTaskId ? serialiseTask(getTaskById(runtimeState.currentTaskId)) : null,
    });
    return;
  }

  if (await handleTaskRoute({ req, res, requestUrl, state, approvalEngine, taskManager, planBuilder, executor, publishEvent })) {
    return;
  }

  if (await handleOperatorControlRoute({ req, res, requestUrl, state, taskManager, executor, publishEvent })) {
    return;
  }

  if (await handlePolicyCapabilityRoute({
    req,
    res,
    requestUrl,
    policyEvaluator,
    planBuilder,
    publishEvent,
  })) {
    return;
  }

  if (await handleWorkspacePluginReadRoute({ req, res, requestUrl, pluginReview })) {
    return;
  }

  if (await handleNativeAdapterPluginRoute({
    req,
    res,
    requestUrl,
    pluginReview,
    serialiseTask,
    serialiseApproval,
  })) {
    return;
  }

  if (await handleWorkspaceNativeOpsRoute({
    req,
    res,
    requestUrl,
    workspaceOps,
    serialisePlanForPublic,
    serialiseTask,
    serialiseApproval,
    buildTaskSummary,
  })) {
    return;
  }

  if (await handleNativePluginRuntimeRoute({
    req,
    res,
    requestUrl,
    planBuilder,
    serialiseTask,
    serialiseApproval,
    buildTaskSummary,
  })) {
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/systemd/repair-execution-task-draft") {
    try {
      const result = await buildSystemdRepairExecutionTaskDraft({
        unit: requestUrl.searchParams.get("unit") ?? requestUrl.searchParams.get("target"),
        execute: requestUrl.searchParams.get("execute") === "true",
      });
      sendJson(res, 200, {
        ok: true,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (await handleDomainTaskPostRoute({
    req,
    res,
    requestUrl,
    planBuilder,
    serialiseTask,
    serialiseApproval,
    buildTaskSummary,
  })) {
    return;
  }

  if (await handleCloudLiveProviderTaskPostRoute({
    req,
    res,
    requestUrl,
    planBuilder,
    serialiseTask,
    serialiseApproval,
    buildTaskSummary,
  })) {
    return;
  }

  if (await handleCloudLiveProviderCredentialPostRoute({
    req,
    res,
    requestUrl,
    planBuilder,
    serialiseTask,
    serialiseApproval,
    buildTaskSummary,
  })) {
    return;
  }

  if (await handleObserverReadModelRoute({ req, res, requestUrl, state, planBuilder, executor })) {
    return;
  }

  if (await handleApprovalRoute({ req, res, requestUrl, state, approvalEngine, taskManager, publishEvent })) {
    return;
  }

  sendJson(res, 404, { ok: false, error: "Route not found." });

  };
}
