import test from "node:test";
import assert from "node:assert/strict";

import {
  BROWSER_TASK_ACTION_DESCRIPTORS,
  capabilityIdForBrowserTaskAction,
  observedBrowserTaskUrl,
  screenActEndpointForBrowserTaskAction,
} from "../src/browser-task-action-contract.mjs";

test("browser task action contract maps new-tab to the existing governed transport", () => {
  assert.equal(screenActEndpointForBrowserTaskAction("browser.new_tab"), "/act/browser/new-tab");
  assert.equal(capabilityIdForBrowserTaskAction("browser.new_tab"), "act.browser.open");
  assert.equal(BROWSER_TASK_ACTION_DESCRIPTORS.filter((entry) => entry.kind === "browser.new_tab").length, 1);
});

test("browser task verification prefers the post-action observed URL over stale session metadata", () => {
  assert.equal(observedBrowserTaskUrl({
    workViewSummary: { url: "https://example.com/after-action" },
    workView: { activeUrl: "https://example.com/before-action" },
  }), "https://example.com/after-action");
  assert.equal(observedBrowserTaskUrl({
    workView: { activeUrl: "https://example.com/session-only" },
  }), "https://example.com/session-only");
});

test("browser task action contract preserves the legacy unknown-action click fallback", () => {
  assert.equal(screenActEndpointForBrowserTaskAction("legacy.unknown"), "/act/mouse/click");
  assert.equal(capabilityIdForBrowserTaskAction("legacy.unknown"), null);
});
