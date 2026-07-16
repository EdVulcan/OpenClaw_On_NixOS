import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { observerClientRuntimeSystemHealScript } from "../src/client-script-runtime-system-heal.mjs";

function createContext(result) {
  const calls = [];
  const refreshes = [];
  const context = {
    observerConfig: { coreUrl: "http://core.invalid" },
    fetchJson: async (url, options) => {
      calls.push({ url, options });
      return result;
    },
    setControlMessage: (message) => calls.push({ message }),
    refreshHealState: async () => refreshes.push("heal"),
    refreshMaintenanceState: async () => refreshes.push("maintenance"),
    refreshSystemState: async () => refreshes.push("system"),
    refreshAuditState: async () => refreshes.push("audit"),
    refreshCapabilityHistory: async () => refreshes.push("capability-history"),
  };
  vm.runInNewContext(observerClientRuntimeSystemHealScript, context);
  return { context, calls, refreshes };
}

test("Observer routes simulated service heal through the common capability runtime", async () => {
  const fixture = createContext({
    ok: true,
    result: { entry: { service: "openclaw-browser-runtime", mode: "simulated", status: "completed" } },
  });

  await fixture.context.runHeal("openclaw-browser-runtime");

  assert.equal(fixture.calls[0].url, "http://core.invalid/capabilities/invoke");
  assert.deepEqual(JSON.parse(fixture.calls[0].options.body), {
    capabilityId: "act.system.heal",
    operation: "heal.restart-service",
    params: { service: "openclaw-browser-runtime", mode: "simulated" },
  });
  assert.match(fixture.calls[1].message, /Capability system\.heal restart-service completed/);
  assert.deepEqual(fixture.refreshes, ["heal", "capability-history"]);
  assert.doesNotMatch(observerClientRuntimeSystemHealScript, /observerConfig\.systemHealUrl/);
});

test("Observer routes forced simulated maintenance through the common capability runtime", async () => {
  const fixture = createContext({
    ok: true,
    result: {
      tick: { status: "ran", reason: "forced" },
      run: { status: "healthy" },
    },
  });

  await fixture.context.runMaintenanceTickFromUi();

  assert.equal(fixture.calls[0].url, "http://core.invalid/capabilities/invoke");
  assert.deepEqual(JSON.parse(fixture.calls[0].options.body), {
    capabilityId: "act.system.heal",
    operation: "heal.maintenance.tick",
    params: { force: true, autofix: true, mode: "simulated" },
  });
  assert.match(fixture.calls[1].message, /Capability system\.heal maintenance tick ran: forced \/ healthy/);
  assert.deepEqual(fixture.refreshes, ["maintenance", "heal", "system", "audit", "capability-history"]);
  assert.doesNotMatch(observerClientRuntimeSystemHealScript, /observerConfig\.systemHealUrl/);
});
