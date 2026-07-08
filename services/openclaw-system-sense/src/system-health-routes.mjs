import { createEventName } from "../../../packages/shared-events/src/event-factory.mjs";
import { sendJson } from "../../../packages/shared-utils/src/http.mjs";

const HEALTH_GET_ROUTES = new Map([
  ["/system/health/trends", "buildHealthTrendSummary"],
  ["/system/route/next-action", "buildRouteAwareNextActionRecommendation"],
  ["/system/route/recovery-policy", "buildConservativeRecoveryPolicyExplanation"],
  ["/system/route/body-governance-readiness", "buildBodyGovernanceReadiness"],
  ["/system/route/phase-2-review", "buildPhase2RouteReview"],
]);

export async function handleSystemHealthRoutes({
  req,
  res,
  requestUrl,
  refreshSystemState,
  getSystemState,
  publishEvent,
  builders,
}) {
  if (req.method === "GET" && requestUrl.pathname === "/system/health") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      system: { ...getSystemState() },
    });
    return true;
  }

  if (req.method === "GET") {
    const builderName = HEALTH_GET_ROUTES.get(requestUrl.pathname);
    if (builderName) {
      const payload = await builders[builderName]();
      sendJson(res, 200, payload);
      return true;
    }
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/body") {
    await refreshSystemState();
    const systemState = getSystemState();
    sendJson(res, 200, {
      ok: true,
      body: systemState.body,
      resources: systemState.resources,
      network: systemState.network,
    });
    return true;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/services") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      services: getSystemState().services,
    });
    return true;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/alerts") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      alerts: getSystemState().alerts,
    });
    return true;
  }

  if (req.method === "POST" && requestUrl.pathname === "/system/refresh") {
    await refreshSystemState();
    const systemState = getSystemState();
    await publishEvent(createEventName(systemState.alerts.length > 0 ? "service.failed" : "system.updated"), {
      alerts: systemState.alerts,
      services: systemState.services,
      resources: systemState.resources,
      body: systemState.body,
    });
    sendJson(res, 200, {
      ok: true,
      system: { ...systemState },
    });
    return true;
  }

  return false;
}
