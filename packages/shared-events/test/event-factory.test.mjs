import test from "node:test";
import assert from "node:assert/strict";

import { createEventName, isEventName } from "../src/event-factory.mjs";

test("validates event names before returning them", () => {
  assert.equal(createEventName("task.created"), "task.created");
  assert.equal(createEventName("screen_act.action_started"), "screen_act.action_started");
  assert.equal(createEventName("system.command.executed"), "system.command.executed");
  assert.equal(createEventName("maintenance.policy.updated"), "maintenance.policy.updated");
  assert.equal(isEventName("task.created"), true);
  assert.equal(isEventName("cloud_consciousness.live_provider_execution_plan_written"), true);
  assert.equal(isEventName("task.unknown"), false);
  assert.throws(() => createEventName("task.unknown"), /Unknown OpenClaw event name/);
});
