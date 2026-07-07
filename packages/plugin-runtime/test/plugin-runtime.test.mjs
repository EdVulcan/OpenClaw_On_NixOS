import test from "node:test";
import assert from "node:assert/strict";

import {
  createOpenClawNativePluginContract,
  validateOpenClawNativePluginContract,
} from "../src/plugin-contract.mjs";
import {
  createOpenClawNativePluginRegistry,
  validateOpenClawNativePluginRegistry,
} from "../src/plugin-registry.mjs";

test("creates and validates a governed native plugin contract", () => {
  const contract = createOpenClawNativePluginContract({
    plugin: {
      id: "openclaw.test.plugin",
      name: "OpenClaw Test Plugin",
      version: "0.1.0",
      summary: "Test contract.",
    },
    capabilities: [
      {
        id: "sense.test",
        title: "Sense Test",
        description: "Read-only test capability.",
        kind: "sense",
        domains: ["body_internal"],
        risk: "low",
        permissions: {
          filesystemRead: true,
        },
        approval: {
          required: false,
          reason: "Read-only unit test.",
        },
      },
    ],
  });

  assert.equal(validateOpenClawNativePluginContract(contract).ok, true);
  assert.equal(contract.governance.runtimeOwner, "openclaw_on_nixos");
  assert.equal(contract.governance.externalRuntimeDependencyAllowed, false);
});

test("creates a valid native plugin registry envelope", () => {
  const registry = createOpenClawNativePluginRegistry({
    generatedAt: "2026-07-08T00:00:00.000Z",
  });

  assert.equal(validateOpenClawNativePluginRegistry(registry).ok, true);
  assert.equal(registry.runtimeOwner, "openclaw_on_nixos");
  assert.equal(registry.items.length, 1);
});
