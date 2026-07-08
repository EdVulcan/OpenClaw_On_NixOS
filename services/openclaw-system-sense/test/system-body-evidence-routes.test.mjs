import test from "node:test";
import assert from "node:assert/strict";

import { handleSystemBodyEvidenceRoutes } from "../src/system-body-evidence-routes.mjs";

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

test("system body evidence routes dispatch table-backed read models", async () => {
  const res = createResponseCapture();
  const handled = await handleSystemBodyEvidenceRoutes({
    req: { method: "GET" },
    res,
    requestUrl: new URL("http://127.0.0.1/system/route/body-evidence-ledger-readiness"),
    builders: {
      buildBodyEvidenceLedgerReadiness: async () => ({
        ok: true,
        registry: "openclaw-body-evidence-ledger-readiness-v0",
      }),
    },
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(parseResponse(res), {
    ok: true,
    registry: "openclaw-body-evidence-ledger-readiness-v0",
  });
});

test("system body evidence routes return false for unrelated paths", async () => {
  const res = createResponseCapture();
  const handled = await handleSystemBodyEvidenceRoutes({
    req: { method: "GET" },
    res,
    requestUrl: new URL("http://127.0.0.1/system/route/phase-2-review"),
    builders: {},
  });

  assert.equal(handled, false);
  assert.equal(res.statusCode, null);
});
