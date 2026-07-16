import test from "node:test";
import assert from "node:assert/strict";

import { createBrowserActionCapabilityHandlers } from "../src/capability-runtime-browser-actions.mjs";

const capability = { id: "act.browser.open" };

test("browser action capability delegates only browser.new_tab and retains compact mediation", async () => {
  const calls = [];
  const targetUrl = "https://example.com/work-view";
  const handlers = createBrowserActionCapabilityHandlers({
    screenActUrl: "http://screen-act",
    postJson: async (url, body) => {
      calls.push({ url, body });
      return {
        ok: true,
        action: {
          kind: "browser.new_tab",
          result: "executed-browser-runtime",
          degraded: false,
          params: { url: targetUrl },
          mediation: {
            attempted: true,
            accepted: true,
            status: "accepted",
            reason: "https://example.com/secret-error-url",
            leaseMatched: true,
            transport: "trusted-sidecar",
            visualGrounding: {
              required: true,
              status: "advanced",
              sequenceAdvanced: true,
              pageUrl: targetUrl,
              dataUrl: "data:image/jpeg;base64,secret",
            },
          },
        },
      };
    },
  });

  const backend = await handlers.callBackend(capability, {
    operation: "browser.new_tab",
    params: { url: targetUrl },
  });

  assert.equal(backend.handled, true);
  assert.deepEqual(calls, [{
    url: "http://screen-act/act/browser/new-tab",
    body: { url: targetUrl },
  }]);
  assert.equal(backend.result.ok, true);
  assert.equal(backend.result.governance.ownerContractMatched, true);
  assert.equal(backend.result.summary.browserRuntimeExecuted, true);
  assert.equal(backend.result.governance.requiresFreshScreenContext, true);
  assert.equal(backend.result.governance.requiresTrustedLease, true);
  assert.equal(backend.result.governance.exposesNavigationUrl, false);
  assert.equal(backend.result.action.mediation.reason, "owner_rejected");
  assert.equal(handlers.summariseResult(capability, backend.result).noPayloadExposure, true);
  assert.equal(JSON.stringify(backend.result).includes(targetUrl), false);
  assert.equal(JSON.stringify(backend.result).includes("data:image/jpeg"), false);
});

test("browser action capability validates the operation and navigation URL before owner dispatch", async () => {
  const handlers = createBrowserActionCapabilityHandlers({ screenActUrl: "http://screen-act" });

  assert.equal(handlers.validateRequest(capability, {
    operation: "browser.open",
    params: { url: "https://example.com" },
  }), "Browser action capability only allows browser.new_tab.");
  assert.equal(handlers.validateRequest(capability, {
    operation: "browser.new_tab",
    params: { url: "https://user:secret@example.com" },
  }), "Browser capability new-tab URL must not contain credentials.");
  assert.equal(handlers.validateRequest(capability, {
    operation: "browser.new_tab",
    params: { url: "file:///tmp/private" },
  }), "Browser capability new-tab only allows HTTP(S) URLs.");
  assert.equal(handlers.validateRequest(capability, {
    operation: "browser.new_tab",
    params: { url: "https://example.com" },
  }), null);

  const mismatchedOwner = createBrowserActionCapabilityHandlers({
    screenActUrl: "http://screen-act",
    postJson: async () => ({
      ok: true,
      action: {
        kind: "mouse.click",
        result: "executed-browser-runtime",
        mediation: { attempted: true, accepted: true },
      },
    }),
  });
  const ownerResult = await mismatchedOwner.callBackend(capability, {
    operation: "browser.new_tab",
    params: { url: "https://example.com" },
  });
  assert.equal(ownerResult.result.ok, false);
  assert.equal(ownerResult.result.governance.ownerContractMatched, false);
});

test("browser action capability leaves unrelated capabilities untouched", async () => {
  const handlers = createBrowserActionCapabilityHandlers({
    screenActUrl: "http://screen-act",
    postJson: async () => ({ ok: true }),
  });

  assert.deepEqual(await handlers.callBackend({ id: "sense.system.vitals" }, { params: {} }), {
    handled: false,
    result: null,
  });
  assert.equal(handlers.summariseResult({ id: "sense.system.vitals" }, {}), null);
  assert.equal(handlers.validateRequest({ id: "sense.system.vitals" }, { params: {} }), null);
});
