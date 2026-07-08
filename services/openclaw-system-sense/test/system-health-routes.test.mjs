import test from "node:test";
import assert from "node:assert/strict";

import { handleSystemHealthRoutes } from "../src/system-health-routes.mjs";

function createResponseCapture() {
  return {
    statusCode: null,
    headers: null,
    body: "",
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body) {
      this.body = body ?? "";
    },
  };
}

function parseResponse(res) {
  return JSON.parse(res.body);
}

function createSystemState(overrides = {}) {
  return {
    body: { hostname: "openclaw" },
    services: { core: { ok: true } },
    resources: { memoryPercent: 12 },
    network: { online: true },
    alerts: [],
    ...overrides,
  };
}

test("system health routes refresh body state before response", async () => {
  const res = createResponseCapture();
  let refreshed = false;
  const handled = await handleSystemHealthRoutes({
    req: { method: "GET" },
    res,
    requestUrl: new URL("http://127.0.0.1/system/body"),
    refreshSystemState: async () => {
      refreshed = true;
    },
    getSystemState: () => createSystemState(),
    publishEvent: async () => {},
    builders: {},
  });

  assert.equal(handled, true);
  assert.equal(refreshed, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(parseResponse(res), {
    ok: true,
    body: { hostname: "openclaw" },
    resources: { memoryPercent: 12 },
    network: { online: true },
  });
});

test("system health routes dispatch governance builders", async () => {
  const res = createResponseCapture();
  const handled = await handleSystemHealthRoutes({
    req: { method: "GET" },
    res,
    requestUrl: new URL("http://127.0.0.1/system/route/body-governance-readiness"),
    refreshSystemState: async () => {},
    getSystemState: () => createSystemState(),
    publishEvent: async () => {},
    builders: {
      buildBodyGovernanceReadiness: async () => ({
        ok: true,
        registry: "openclaw-body-governance-readiness-v0",
      }),
    },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(parseResponse(res), {
    ok: true,
    registry: "openclaw-body-governance-readiness-v0",
  });
});

test("system health routes publish refresh event with current state", async () => {
  const events = [];
  const res = createResponseCapture();
  const handled = await handleSystemHealthRoutes({
    req: { method: "POST" },
    res,
    requestUrl: new URL("http://127.0.0.1/system/refresh"),
    refreshSystemState: async () => {},
    getSystemState: () => createSystemState({ alerts: [{ code: "service.offline" }] }),
    publishEvent: async (type, payload) => events.push({ type, payload }),
    builders: {},
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(events[0].type, "service.failed");
  assert.deepEqual(events[0].payload.alerts, [{ code: "service.offline" }]);
  assert.deepEqual(parseResponse(res).system.alerts, [{ code: "service.offline" }]);
});
