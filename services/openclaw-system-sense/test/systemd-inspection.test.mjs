import test from "node:test";
import assert from "node:assert/strict";

import { createSystemdInspection } from "../src/systemd-inspection.mjs";

const specs = [
  {
    key: "eventHub",
    name: "openclaw-event-hub",
    unit: "openclaw-event-hub.service",
    description: "OpenClaw Event Hub",
    component: "body",
    url: "http://127.0.0.1:4101",
    after: [],
  },
  {
    key: "core",
    name: "openclaw-core",
    unit: "openclaw-core.service",
    description: "OpenClaw Core",
    component: "body",
    url: "http://127.0.0.1:4100",
    after: ["openclaw-event-hub"],
  },
  {
    key: "observerUi",
    name: "observer-ui",
    unit: "observer-ui.service",
    description: "OpenClaw Observer UI",
    component: "observer",
    url: "http://127.0.0.1:4170",
    after: ["openclaw-core", "openclaw-event-hub"],
  },
];

test("systemd inspection returns planned inventory when systemd is unavailable", async () => {
  const inspection = createSystemdInspection({
    openClawSystemdUnitSpecs: specs,
    platform: "darwin",
  });

  const inventory = await inspection.buildSystemdUnitInventory();

  assert.equal(inventory.registry, "openclaw-systemd-unit-inventory-v0");
  assert.equal(inventory.source.systemdAvailable, false);
  assert.equal(inventory.summary.total, specs.length);
  assert.equal(inventory.summary.observed, 0);
  assert.equal(inventory.units[0].observation, "planned_inventory_only");
  assert.equal(inventory.governance.hostMutation, false);
});

test("systemd inspection prefers native D-Bus without invoking commands", async () => {
  const inspectCalls = [];
  const inspection = createSystemdInspection({
    openClawSystemdUnitSpecs: specs,
    platform: "linux",
    systemdAdapter: {
      async inspectUnits(unitNames) {
        inspectCalls.push(unitNames);
        return {
          available: true,
          transport: "dbus_native",
          version: "systemd 258.5",
          readOnlyMethods: [
            "org.freedesktop.systemd1.Manager.GetUnit",
            "org.freedesktop.DBus.Properties.GetAll",
          ],
          units: new Map(unitNames.map((unitName) => [unitName, {
            found: true,
            properties: {
              Description: `${unitName} description`,
              LoadState: "loaded",
              ActiveState: "active",
              SubState: "running",
              UnitFileState: "enabled",
              MainPID: 123,
              ExecMainStatus: 0,
              FragmentPath: "/nix/store/openclaw.service",
            },
          }])),
        };
      },
    },
  });

  const inventory = await inspection.buildSystemdUnitInventory();
  const dependencyMap = await inspection.buildSystemdDependencyMap();

  assert.equal(inventory.source.transport, "dbus_native");
  assert.equal(inventory.source.systemdVersion, "systemd 258.5");
  assert.equal(inventory.units[0].observation, "dbus_properties_read_only");
  assert.deepEqual(inventory.governance.readOnlyCommands, []);
  assert.deepEqual(inventory.governance.readOnlyDbusMethods, [
    "org.freedesktop.systemd1.Manager.GetUnit",
    "org.freedesktop.DBus.Properties.GetAll",
  ]);
  assert.equal(dependencyMap.summary.nodes, specs.length);
  assert.equal(inspectCalls.length, 2);
});

test("systemd inspection fails closed without command fallback when native D-Bus is unavailable", async () => {
  const inspection = createSystemdInspection({
    openClawSystemdUnitSpecs: specs,
    platform: "linux",
    systemdAdapter: {
      async inspectUnits() {
        throw new Error("system bus unavailable");
      },
    },
  });

  const inventory = await inspection.buildSystemdUnitInventory();
  const dependencyMap = await inspection.buildSystemdDependencyMap();

  assert.equal(inventory.source.systemdAvailable, false);
  assert.equal(inventory.source.systemdVersion, null);
  assert.equal(inventory.source.transport, "dbus_unavailable");
  assert.equal(inventory.source.nativeUnavailableReason, "system bus unavailable");
  assert.deepEqual(inventory.governance.readOnlyDbusMethods, []);
  assert.deepEqual(inventory.governance.readOnlyCommands, []);
  assert.equal(inventory.summary.active, 0);
  assert.equal(inventory.units[0].systemdObserved, false);
  assert.equal(inventory.units[0].observation, "planned_inventory_only");
  assert.equal(inventory.governance.hostMutation, false);
  assert.equal(dependencyMap.summary.nodes, specs.length);
  assert.equal(dependencyMap.summary.edges, 3);
  assert.deepEqual(dependencyMap.roots, ["openclaw-event-hub.service"]);
  assert.equal(dependencyMap.nodes.find((node) => node.unit === "openclaw-event-hub.service").impactClass, "foundational");
});
