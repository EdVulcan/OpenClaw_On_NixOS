import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import { handlePhaseMemoryReadRoute } from "../src/phase-memory-read-routes.mjs";

async function invokePhaseMemoryReadRoute(planBuilder, method, path) {
  const req = Readable.from([]);
  req.method = method;
  req.headers = {};

  let statusCode = null;
  let headers = null;
  let payload = "";
  const res = {
    writeHead(code, responseHeaders) {
      statusCode = code;
      headers = responseHeaders;
    },
    end(chunk = "") {
      payload = String(chunk);
    },
  };

  const handled = await handlePhaseMemoryReadRoute({
    req,
    res,
    requestUrl: new URL(path, "http://127.0.0.1:4100"),
    planBuilder,
  });

  return {
    handled,
    statusCode,
    headers,
    body: payload ? JSON.parse(payload) : null,
  };
}

test("phase memory read route handles synchronous MVP route builders", async () => {
  const response = await invokePhaseMemoryReadRoute({
    buildMvpRouteAlignment: () => ({
      ok: true,
      registry: "openclaw-mvp-route-alignment-v0",
      phase: 2,
    }),
  }, "GET", "/mvp/route");

  assert.equal(response.handled, true);
  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"], /application\/json/);
  assert.deepEqual(response.body, {
    ok: true,
    registry: "openclaw-mvp-route-alignment-v0",
    phase: 2,
  });
});

test("phase memory read route forwards Phase 2 route-review query flags", async () => {
  let observedInput = null;
  const response = await invokePhaseMemoryReadRoute({
    buildPhase2NextCapabilityRouteReview: async (input) => {
      observedInput = input;
      return {
        ok: true,
        registry: "openclaw-phase-2-next-capability-route-review-v0",
        next: { recommendedSlice: "openclaw-phase-2-completion-readiness" },
      };
    },
  }, "GET", "/phase-2/next-capability-route-review?afterLedgerDemoStatus=true&afterRepairCandidateDemoStatus=false");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(observedInput, {
    ledgerDemoStatusCheckpointComplete: true,
    repairCandidateDemoCheckpointComplete: false,
  });
  assert.equal(response.body.registry, "openclaw-phase-2-next-capability-route-review-v0");
});

test("phase memory read route handles long-term memory readback builders", async () => {
  const response = await invokePhaseMemoryReadRoute({
    buildLongTermMemoryReadback: () => ({
      ok: true,
      registry: "openclaw-long-term-memory-readback-v0",
      records: [{ id: "memory-1" }],
    }),
  }, "GET", "/long-term-memory/readback");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.records, [{ id: "memory-1" }]);
});

test("phase memory read route reports misses without writing a response", async () => {
  const missed = await invokePhaseMemoryReadRoute({}, "GET", "/cloud-consciousness/context-review");

  assert.equal(missed.handled, false);
  assert.equal(missed.statusCode, null);
  assert.equal(missed.body, null);

  const wrongMethod = await invokePhaseMemoryReadRoute({}, "POST", "/phase-6/plan");

  assert.equal(wrongMethod.handled, false);
  assert.equal(wrongMethod.statusCode, null);
  assert.equal(wrongMethod.body, null);
});
