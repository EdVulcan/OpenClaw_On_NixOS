import test from "node:test";
import assert from "node:assert/strict";

import { createScreenObservationCapabilityHandlers } from "../src/capability-runtime-screen.mjs";

const capability = { id: "sense.screen.observe" };

test("screen observation delegates current state and projects only bounded structural metadata", async () => {
  const calls = [];
  const handlers = createScreenObservationCapabilityHandlers({
    screenSenseUrl: "http://screen-sense",
    fetchJson: async (url) => {
      calls.push(url);
      return {
        ok: true,
        screen: {
          timestamp: "2026-07-16T00:00:00.000Z",
          readiness: "ready",
          captureSource: "browser",
          captureStrategy: "browser-runtime-backed",
          focusedWindow: { title: "Private page", pid: 42 },
          windowList: [{ title: "Private page", pid: 42 }],
          ocrBlocks: [{ text: "secret text", confidence: 0.9 }],
          snapshotText: "secret snapshot",
          trustedSession: { sessionIdentity: { sessionId: "secret-session" } },
          visualFrame: {
            available: true,
            width: 960,
            height: 540,
            fresh: true,
            dataUrl: "data:image/jpeg;base64,secret",
          },
          semanticTargets: {
            available: true,
            itemCount: 2,
            items: [{ name: "secret target" }],
          },
          workView: {
            status: "ready",
            visibility: "observable",
            mode: "ai-owned-work-view",
            helperStatus: "active",
            browserStatus: "running",
            activeUrl: "https://private.example",
          },
          workViewSummary: {
            tabCount: 2,
            visibleTextBlocks: ["secret text"],
            recentInteraction: { input: "redacted" },
          },
        },
      };
    },
  });

  const backend = await handlers.callBackend(capability, { params: {} });

  assert.equal(backend.handled, true);
  assert.deepEqual(calls, ["http://screen-sense/screen/current"]);
  assert.deepEqual(handlers.summariseResult(capability, backend.result), {
    kind: "screen.observe",
    ok: true,
    readiness: "ready",
    focusedWindowAvailable: true,
    windowCount: 1,
    ocrBlockCount: 1,
    visualFrameAvailable: true,
    semanticTargetCount: 2,
    workViewStatus: "ready",
    workViewVisibility: "observable",
    readsScreenState: true,
    noScreenPayload: true,
    noMutation: true,
    noProviderEgress: true,
  });
  assert.equal(backend.result.observation.visualFrame.dataExposed, false);
  assert.equal(backend.result.observation.semanticTargets.itemsExposed, false);
  assert.equal(backend.result.observation.workView.activeUrl, undefined);
  assert.equal(backend.result.observation.trustedSessionAvailable, true);
  assert.equal(JSON.stringify(backend.result).includes("secret"), false);
});

test("screen observation rejects requests that ask for raw payloads", () => {
  const handlers = createScreenObservationCapabilityHandlers({
    screenSenseUrl: "http://screen-sense",
  });

  assert.equal(
    handlers.validateRequest(capability, { params: { includeVisualFrame: true } }),
    "Screen observation includeVisualFrame is not supported by the governed summary surface.",
  );
  assert.equal(handlers.validateRequest(capability, { params: {} }), null);
});

test("screen observation leaves unrelated capabilities untouched", async () => {
  const handlers = createScreenObservationCapabilityHandlers({
    screenSenseUrl: "http://screen-sense",
    fetchJson: async () => ({ ok: true }),
  });

  assert.deepEqual(await handlers.callBackend({ id: "sense.system.vitals" }, { params: {} }), {
    handled: false,
    result: null,
  });
  assert.equal(handlers.summariseResult({ id: "sense.system.vitals" }, {}), null);
  assert.equal(handlers.validateRequest({ id: "sense.system.vitals" }, { params: {} }), null);
});
