import test from "node:test";
import assert from "node:assert/strict";

import { corsHeaders, withTracing } from "../src/http.mjs";

test("corsHeaders keeps OpenClaw defaults while accepting overrides", () => {
  const headers = corsHeaders({ "x-test": "ok" });

  assert.equal(headers["access-control-allow-origin"], "*");
  assert.equal(headers["access-control-allow-methods"], "GET, POST, OPTIONS");
  assert.equal(headers["x-test"], "ok");
});

test("withTracing adds request identity headers", async () => {
  const calls = [];
  const tracedFetch = withTracing(async (url, options) => {
    calls.push({ url, options });
    return new Response("ok");
  }, "openclaw-test");

  await tracedFetch("http://127.0.0.1/health", { requestId: "req-test" });

  assert.equal(calls[0].options.headers["x-request-id"], "req-test");
  assert.equal(calls[0].options.headers["x-source-service"], "openclaw-test");
});
