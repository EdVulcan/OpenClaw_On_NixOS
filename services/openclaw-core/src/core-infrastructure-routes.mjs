import { sendJson, readJsonBody } from "../../../packages/shared-utils/src/http.mjs";

const PROXY_TARGET_URL_KEYS = {
  "session-manager": "sessionManagerUrl",
  "event-hub": "eventHubUrl",
  "system-heal": "systemHealUrl",
  "screen-sense": "screenSenseUrl",
  "screen-act": "screenActUrl",
  "system-sense": "systemSenseUrl",
};

function proxySubpath(pathname) {
  const parts = pathname.split("/");
  return "/" + parts.slice(3).join("/");
}

async function handleProxyRoute({
  req,
  res,
  requestUrl,
  client,
  serviceUrls,
}) {
  if (!requestUrl.pathname.startsWith("/proxy/")) {
    return false;
  }

  const targetService = requestUrl.pathname.split("/")[2];
  const targetUrlKey = PROXY_TARGET_URL_KEYS[targetService];
  const targetUrlBase = targetUrlKey ? serviceUrls[targetUrlKey] : null;
  if (!targetUrlBase) {
    return false;
  }

  try {
    if (req.method === "POST" || req.method === "PUT") {
      const body = await readJsonBody(req);
      const result = await client.postJson(`${targetUrlBase}${proxySubpath(requestUrl.pathname)}`, body);
      sendJson(res, 200, result);
      return true;
    }

    const result = await client.fetchJson(`${targetUrlBase}${proxySubpath(requestUrl.pathname)}`);
    sendJson(res, 200, result);
    return true;
  } catch (error) {
    sendJson(res, 502, { ok: false, error: `Proxy failed: ${error.message}` });
    return true;
  }
}

function handleHealthRoute({
  req,
  res,
  requestUrl,
  state,
  config,
  serviceUrls,
}) {
  if (req.method !== "GET" || requestUrl.pathname !== "/health") {
    return false;
  }

  sendJson(res, 200, {
    ok: true,
    service: "openclaw-core",
    stage: "active",
    host: config.host,
    port: config.port,
    eventHubUrl: serviceUrls.eventHubUrl,
    sessionManagerUrl: serviceUrls.sessionManagerUrl,
    browserRuntimeUrl: serviceUrls.browserRuntimeUrl,
    screenSenseUrl: serviceUrls.screenSenseUrl,
    screenActUrl: serviceUrls.screenActUrl,
    systemSenseUrl: serviceUrls.systemSenseUrl,
    systemHealUrl: serviceUrls.systemHealUrl,
    stateFilePath: config.stateFilePath,
    autonomyMode: state.autonomyMode,
  });
  return true;
}

export async function handleCoreInfrastructureRoute({
  req,
  res,
  requestUrl,
  client,
  state,
  config,
  serviceUrls,
}) {
  if (await handleProxyRoute({ req, res, requestUrl, client, serviceUrls })) {
    return true;
  }
  return handleHealthRoute({ req, res, requestUrl, state, config, serviceUrls });
}
