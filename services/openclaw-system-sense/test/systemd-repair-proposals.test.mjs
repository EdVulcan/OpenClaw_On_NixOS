import test from "node:test";
import assert from "node:assert/strict";

import { createSystemdRepairProposals } from "../src/systemd-repair-proposals.mjs";

const inventory = {
  registry: "openclaw-systemd-unit-inventory-v0",
  observedAt: "2026-01-02T03:04:05.000Z",
  source: { systemdAvailable: true },
  units: [
    {
      key: "browserRuntime",
      name: "openclaw-browser-runtime",
      unit: "openclaw-browser-runtime.service",
      component: "body",
      activeState: "active",
      subState: "running",
      loadState: "loaded",
      unitFileState: "enabled",
      systemdObserved: true,
      observation: "systemd_observed",
    },
    {
      key: "core",
      name: "openclaw-core",
      unit: "openclaw-core.service",
      component: "body",
      activeState: "active",
      subState: "running",
      loadState: "loaded",
      unitFileState: "enabled",
      systemdObserved: true,
      observation: "systemd_observed",
    },
  ],
};

function createProposals() {
  return createSystemdRepairProposals({
    buildSystemdUnitInventory: async () => inventory,
    buildCommandDryRun: ({ command, args, intent }) => ({
      ok: true,
      command,
      args,
      intent,
      wouldExecute: false,
      checks: [{ name: "preview_only", passed: true }],
    }),
    findInventoryUnit: (candidateInventory, unitName) => {
      const requested = unitName ?? "openclaw-browser-runtime.service";
      return candidateInventory.units.find((unit) => {
        return unit.unit === requested || unit.name === requested || unit.key === requested;
      }) ?? null;
    },
    classifySystemdRepairRisk: (unit) => unit.name === "openclaw-core" ? "high" : "medium",
  });
}

test("systemd repair proposals build operator-visible plan-only repair envelopes", async () => {
  const proposals = createProposals();

  const plan = await proposals.buildSystemdRepairPlan({
    unit: "openclaw-browser-runtime.service",
    reason: "operator requested a bounded repair preview",
  });

  assert.equal(plan.registry, "openclaw-systemd-repair-plan-v0");
  assert.equal(plan.mode, "plan_only");
  assert.equal(plan.target.unit, "openclaw-browser-runtime.service");
  assert.equal(plan.proposal.command.command, "systemctl");
  assert.deepEqual(plan.proposal.command.args, ["restart", "openclaw-browser-runtime.service"]);
  assert.equal(plan.proposal.reason, "operator requested a bounded repair preview");
  assert.equal(plan.proposal.risk, "medium");
  assert.equal(plan.governance.hostMutation, false);
  assert.equal(plan.governance.executesCommand, false);
});

test("systemd repair proposals build dry-run envelopes without execution", async () => {
  const proposals = createProposals();

  const envelope = await proposals.buildSystemdRepairDryRun({ unit: "core" });

  assert.equal(envelope.registry, "openclaw-systemd-repair-dry-run-v0");
  assert.equal(envelope.mode, "operator_visible_dry_run");
  assert.equal(envelope.target.unit, "openclaw-core.service");
  assert.equal(envelope.plan.proposal.risk, "high");
  assert.equal(envelope.wouldExecute, false);
  assert.equal(envelope.dryRun.requiresApproval, true);
  assert.equal(envelope.governance.hostMutation, false);
  assert.equal(envelope.governance.executesCommand, false);
  assert.equal(envelope.next.recommendedSlice, "operator-reviewed-systemd-repair-execution");
});

test("systemd repair proposals reject units outside the OpenClaw inventory", async () => {
  const proposals = createProposals();

  await assert.rejects(
    () => proposals.buildSystemdRepairPlan({ unit: "sshd.service" }),
    (error) => {
      assert.equal(error.code, "SYSTEMD_UNIT_NOT_OPENCLAW_OWNED");
      assert.deepEqual(error.details.allowedUnits, [
        "openclaw-browser-runtime.service",
        "openclaw-core.service",
      ]);
      return true;
    },
  );
});

test("systemd repair proposals factory rejects missing dependency wiring", () => {
  assert.throws(
    () => createSystemdRepairProposals({}),
    /requires buildSystemdUnitInventory/,
  );
});
