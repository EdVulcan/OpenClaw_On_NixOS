import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { observerClientRuntimeScreenObservationScript } from "../src/client-script-runtime-screen-observation.mjs";

function createContext() {
  const calls = [];
  const refreshes = [];
  const messages = [];
  const context = {
    observerConfig: { coreUrl: "http://core.invalid", screenSenseUrl: "http://screen.invalid" },
    fetchJson: async (url, options) => {
      calls.push({ url, options });
      return {
        invoked: true,
        result: { observation: { readiness: "ready" } },
      };
    },
    refreshScreen: async () => refreshes.push("screen"),
    setControlMessage: (message) => messages.push(message),
  };
  vm.runInNewContext(observerClientRuntimeScreenObservationScript, context);
  return { context, calls, refreshes, messages };
}

test("Observer refresh screen control invokes the bounded screen capability", async () => {
  const fixture = createContext();

  await fixture.context.refreshScreenNow();

  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].url, "http://core.invalid/capabilities/invoke");
  assert.deepEqual(JSON.parse(fixture.calls[0].options.body), {
    capabilityId: "sense.screen.observe",
    intent: "screen.observe",
  });
  assert.deepEqual(fixture.refreshes, ["screen"]);
  assert.deepEqual(fixture.messages, ["Screen refreshed: ready"]);
  assert.doesNotMatch(observerClientRuntimeScreenObservationScript, /observerConfig\.screenSenseUrl.*screen\/refresh/);
});
