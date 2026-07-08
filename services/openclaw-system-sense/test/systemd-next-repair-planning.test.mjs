import test from "node:test";
import assert from "node:assert/strict";

import { createSystemdNextRepairPlanning } from "../src/systemd-next-repair-planning.mjs";

const inventory = {
  registry: "openclaw-systemd-unit-inventory-v0",
  summary: { total: 4, active: 4 },
  units: [
    {
      key: "eventHub",
      name: "openclaw-event-hub",
      unit: "openclaw-event-hub.service",
      component: "body",
      activeState: "active",
      subState: "running",
      loadState: "loaded",
      unitFileState: "enabled",
      systemdObserved: true,
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
    },
    {
      key: "systemSense",
      name: "openclaw-system-sense",
      unit: "openclaw-system-sense.service",
      component: "body",
      activeState: "active",
      subState: "running",
      loadState: "loaded",
      unitFileState: "enabled",
      systemdObserved: true,
    },
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
    },
  ],
};

function createPlanning() {
  return createSystemdNextRepairPlanning({
    buildSystemdUnitInventory: async () => inventory,
    buildSystemdDependencyMap: async () => ({
      registry: "openclaw-systemd-dependency-map-v0",
      summary: { nodes: 4, edges: 3 },
      nodes: [
        { unit: "openclaw-event-hub.service", impactClass: "foundational", impactRadius: 3, dependencyLayer: 0 },
        { unit: "openclaw-core.service", impactClass: "foundational", impactRadius: 2, dependencyLayer: 1 },
        { unit: "openclaw-system-sense.service", impactClass: "medium", impactRadius: 1, dependencyLayer: 2 },
        { unit: "openclaw-browser-runtime.service", impactClass: "medium", impactRadius: 1, dependencyLayer: 2 },
      ],
    }),
    buildBodyEvidenceLedgerDemoStatus: async () => ({
      registry: "openclaw-body-evidence-ledger-demo-status-v0",
      summary: {
        demoReady: true,
        recordCount: 1,
        bootstrapRecordId: "body-evidence-bootstrap",
      },
    }),
    buildCommandDryRun: ({ command, args, intent }) => ({
      ok: true,
      command,
      args,
      intent,
      wouldExecute: false,
      checks: [
        {
          name: "command_preview_only",
          passed: true,
          detail: "dry run only",
        },
      ],
    }),
    findInventoryUnit: (candidateInventory, unitName) => {
      return candidateInventory.units.find((unit) => unit.unit === unitName) ?? null;
    },
    classifySystemdRepairRisk: (unit) => unit.name === "openclaw-core" ? "high" : "medium",
  });
}

test("systemd next repair planning keeps the selected system-sense route non-mutating", async () => {
  const planning = createPlanning();

  const scopeReview = await planning.buildSystemdNextRepairScopeReview();
  const plan = await planning.buildSystemdNextRepairPlan();
  const routeReview = await planning.buildSystemdNextRepairRouteReview();

  assert.equal(scopeReview.registry, "openclaw-systemd-next-repair-scope-review-v0");
  assert.equal(scopeReview.summary.ready, true);
  assert.equal(scopeReview.decision.selectedUnit, "openclaw-system-sense.service");
  assert.equal(scopeReview.governance.hostMutation, false);
  assert.equal(plan.registry, "openclaw-systemd-next-repair-plan-v0");
  assert.equal(plan.plan.targetUnit, "openclaw-system-sense.service");
  assert.equal(plan.plan.commandPreview, "systemctl restart openclaw-system-sense.service");
  assert.equal(plan.plan.commandPreviewOnly, true);
  assert.equal(plan.governance.executesCommand, false);
  assert.equal(routeReview.registry, "openclaw-systemd-next-repair-route-review-v0");
  assert.equal(routeReview.decision.selectedSlice, "openclaw-systemd-next-repair-dry-run");
  assert.equal(routeReview.evidence.planReady, true);
});

test("systemd next repair dry-run and task route stop before approvals or execution", async () => {
  const planning = createPlanning();

  const dryRun = await planning.buildSystemdNextRepairDryRun();
  const taskRoute = await planning.buildSystemdNextRepairTaskRoute();

  assert.equal(dryRun.registry, "openclaw-systemd-next-repair-dry-run-v0");
  assert.equal(dryRun.target.unit, "openclaw-system-sense.service");
  assert.equal(dryRun.canRestart, false);
  assert.equal(dryRun.wouldExecute, false);
  assert.equal(dryRun.dryRun.command, "systemctl");
  assert.deepEqual(dryRun.dryRun.args, ["restart", "openclaw-system-sense.service"]);
  assert.equal(dryRun.governance.createsTask, false);
  assert.equal(dryRun.governance.createsApproval, false);
  assert.equal(taskRoute.registry, "openclaw-systemd-next-repair-task-route-v0");
  assert.equal(taskRoute.routeDecision.status, "task_shell_route_available");
  assert.equal(taskRoute.routeDecision.selectedSlice, "openclaw-systemd-next-repair-task-shell");
  assert.equal(taskRoute.allowedNextActions[0].createsTask, true);
  assert.equal(taskRoute.allowedNextActions[0].mutatesHost, false);
  assert.equal(taskRoute.allowedNextActions[1].allowedNow, false);
  assert.equal(taskRoute.next.recommendedSlice, "openclaw-systemd-next-repair-task-shell");
});

test("systemd next repair planning factory rejects missing dependency wiring", () => {
  assert.throws(
    () => createSystemdNextRepairPlanning({}),
    /requires buildSystemdUnitInventory/,
  );
});
