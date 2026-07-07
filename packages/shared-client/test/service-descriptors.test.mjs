import test from "node:test";
import assert from "node:assert/strict";

import {
  getOpenClawServiceDescriptor,
  getOpenClawServicePort,
  getOpenClawServiceUrl,
  openClawServiceDescriptors,
} from "../src/service-descriptors.mjs";

test("resolves OpenClaw service defaults from descriptors", () => {
  assert.equal(getOpenClawServiceDescriptor("core").service, "openclaw-core");
  assert.equal(getOpenClawServicePort("core", {}), 4100);
  assert.equal(getOpenClawServiceUrl("screenSense", {}), "http://127.0.0.1:4104");
  assert.equal(openClawServiceDescriptors.observerUi.portEnv, "OBSERVER_UI_PORT");
});

test("prefers configured ports and URLs without changing env contracts", () => {
  const env = {
    OPENCLAW_CORE_PORT: "5100",
    OPENCLAW_EVENT_HUB_URL: "http://127.0.0.1:6101",
  };

  assert.equal(getOpenClawServicePort("core", env), 5100);
  assert.equal(getOpenClawServiceUrl("core", env), "http://127.0.0.1:5100");
  assert.equal(getOpenClawServiceUrl("eventHub", env), "http://127.0.0.1:6101");
});

test("rejects invalid descriptor keys and ports", () => {
  assert.throws(() => getOpenClawServiceDescriptor("missing"), /Unknown OpenClaw service descriptor/);
  assert.throws(() => getOpenClawServicePort("core", { OPENCLAW_CORE_PORT: "not-a-port" }), /Invalid OPENCLAW_CORE_PORT/);
});
