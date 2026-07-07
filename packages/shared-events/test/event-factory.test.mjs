import test from "node:test";
import assert from "node:assert/strict";

import { createEventName, isEventName } from "../src/event-factory.mjs";

test("validates event names before returning them", () => {
  assert.equal(createEventName("task.created"), "task.created");
  assert.equal(isEventName("task.created"), true);
  assert.equal(isEventName("task.unknown"), false);
  assert.throws(() => createEventName("task.unknown"), /Unknown OpenClaw event name/);
});
