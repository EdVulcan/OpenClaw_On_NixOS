import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createPhase5MvpPhase6ReadinessBuilders } from "../src/phase5-mvp-phase6-readiness-builders.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function createPhase5Harness(overrides = {}) {
  const fetchUrls = [];
  const phase4Exit = overrides.phase4Exit ?? {
    registry: "openclaw-phase-4-exit-v0",
    summary: {
      complete: true,
    },
  };
  const responses = {
    "http://127.0.0.1:4106/system/health": {
      ok: true,
      system: {
        services: Object.fromEntries(
          Array.from({ length: 7 }, (_, index) => [
            `openclaw-service-${index}`,
            { unit: `openclaw-service-${index}.service` },
          ]),
        ),
      },
    },
    "http://127.0.0.1:4104/screen/state": {
      ok: true,
      screen: {
        activeWindow: {
          title: "OpenClaw Observer",
        },
        summary: {
          display: "workspace-2",
        },
      },
    },
    ...(overrides.responses ?? {}),
  };
  const builders = createPhase5MvpPhase6ReadinessBuilders({
    systemSenseUrl: "http://127.0.0.1:4106",
    screenSenseUrl: "http://127.0.0.1:4104",
    repoRoot,
    buildPhase4Exit: async () => phase4Exit,
    buildMvpRouteAlignment: () => overrides.mvpRoute ?? {
      registry: "openclaw-mvp-route-alignment-v0",
      summary: {
        ready: true,
      },
    },
    tasks: overrides.tasks ?? new Map([
      [
        "task-1",
        {
          id: "task-1",
          goal: "keep body visible",
          status: "completed",
        },
      ],
    ]),
    runtimeState: overrides.runtimeState ?? {
      status: "idle",
      paused: false,
      currentTaskId: "task-1",
    },
    policyAuditLog: overrides.policyAuditLog ?? [
      {
        id: "policy-1",
      },
    ],
    capabilityInvocationLog: overrides.capabilityInvocationLog ?? [
      {
        id: "capability-1",
      },
    ],
    getTaskById: (taskId) => overrides.tasks?.get(taskId) ?? {
      id: taskId,
      goal: "keep body visible",
      status: "completed",
    },
    serialiseTask: (task) => ({
      id: task.id,
      goal: task.goal,
      status: task.status,
    }),
    buildTaskSummary: () => overrides.taskSummary ?? {
      counts: {
        total: 1,
        completed: 1,
      },
    },
    fetchJson: async (url) => {
      fetchUrls.push(url);
      if (overrides.rejectUrls?.includes(url)) {
        throw new Error(`blocked ${url}`);
      }
      return responses[url] ?? {};
    },
  });
  return { builders, fetchUrls };
}

test("phase 5 deployment builders preserve route plan and inventory contracts", async () => {
  const { builders, fetchUrls } = createPhase5Harness();

  const plan = await builders.buildPhase5Plan();
  const inventory = await builders.buildPhase5DeploymentInventory();

  assert.equal(plan.registry, "openclaw-phase-5-plan-v0");
  assert.equal(plan.summary.ready, true);
  assert.equal(plan.next.recommendedSlice, "openclaw-phase-5-deployment-inventory");
  assert.equal(plan.governance.releaseAction, false);
  assert.equal(inventory.registry, "openclaw-phase-5-deployment-inventory-v0");
  assert.equal(inventory.summary.ready, true);
  assert.equal(inventory.summary.servicesObserved, 7);
  assert.equal(inventory.summary.modulesObserved, 9);
  assert.equal(inventory.summary.scriptsObserved, 4);
  assert.equal(inventory.summary.mutatesHost, false);
  assert.deepEqual(fetchUrls, ["http://127.0.0.1:4106/system/health"]);
});

test("phase 5 deployment builders close rollback readiness, release gate, and exit", async () => {
  const { builders } = createPhase5Harness();

  const rollback = await builders.buildPhase5RollbackReadiness();
  const release = await builders.buildPhase5ReleaseControlReadiness();
  const exit = await builders.buildPhase5Exit();

  assert.equal(rollback.registry, "openclaw-phase-5-rollback-readiness-v0");
  assert.equal(rollback.summary.ready, true);
  assert.equal(rollback.summary.rollbackExecuted, false);
  assert.equal(release.registry, "openclaw-phase-5-release-control-readiness-v0");
  assert.equal(release.summary.ready, true);
  assert.equal(release.summary.releaseAction, false);
  assert.equal(exit.registry, "openclaw-phase-5-exit-v0");
  assert.equal(exit.summary.complete, true);
  assert.equal(exit.summary.rollbackExecuted, false);
  assert.equal(exit.next.recommendedSlice, "openclaw-mvp-final-readiness");
});

test("phase 5 deployment builders preserve read-only fallback when system-sense is unreachable", async () => {
  const { builders } = createPhase5Harness({
    rejectUrls: ["http://127.0.0.1:4106/system/health"],
  });

  const inventory = await builders.buildPhase5DeploymentInventory();

  assert.equal(inventory.registry, "openclaw-phase-5-deployment-inventory-v0");
  assert.equal(inventory.summary.ready, false);
  assert.equal(inventory.summary.servicesObserved, 0);
  assert.equal(inventory.summary.mutatesHost, false);
  assert.equal(inventory.evidence.health.ok, false);
  assert.equal(inventory.evidence.health.error, "blocked http://127.0.0.1:4106/system/health");
  assert.equal(inventory.governance.rebuildsSystem, false);
});

test("phase 5 mvp and post-mvp builders preserve readiness route boundaries", async () => {
  const { builders } = createPhase5Harness();

  const finalReadiness = await builders.buildMvpFinalReadiness();
  const postMvp = await builders.buildPostMvpPlan();

  assert.equal(finalReadiness.registry, "openclaw-mvp-final-readiness-v0");
  assert.equal(finalReadiness.summary.complete, true);
  assert.equal(finalReadiness.summary.criteriaPassed, 7);
  assert.equal(finalReadiness.summary.postMvpWorkStarted, false);
  assert.equal(finalReadiness.next.recommendedSlice, "openclaw-post-mvp-plan");
  assert.equal(postMvp.registry, "openclaw-post-mvp-plan-v0");
  assert.equal(postMvp.summary.ready, true);
  assert.equal(postMvp.summary.selectedTrunk, "consciousness-memory-orchestration");
  assert.equal(postMvp.governance.callsCloudModel, false);
  assert.equal(postMvp.next.recommendedSlice, "openclaw-phase-6-consciousness-memory-plan");
});

test("phase 6 builders preserve memory, context, orchestration, and exit contracts", async () => {
  const { builders } = createPhase5Harness();

  const plan = await builders.buildPhase6Plan();
  const inventory = await builders.buildPhase6MemorySubstrateInventory();
  const context = await builders.buildPhase6ConsciousnessContextEnvelope();
  const orchestration = await builders.buildPhase6TaskOrchestrationRecords();
  const routeReview = await builders.buildPhase6MemoryWriteRouteReview();
  const exit = await builders.buildPhase6Exit();

  assert.equal(plan.registry, "openclaw-phase-6-consciousness-memory-plan-v0");
  assert.equal(plan.summary.ready, true);
  assert.equal(plan.summary.writesMemory, false);
  assert.equal(inventory.registry, "openclaw-phase-6-memory-substrate-inventory-v0");
  assert.equal(inventory.summary.ready, true);
  assert.equal(inventory.summary.sourceCount, 6);
  assert.equal(inventory.summary.writableSources, 0);
  assert.equal(context.registry, "openclaw-phase-6-consciousness-context-envelope-v0");
  assert.equal(context.summary.ready, true);
  assert.equal(context.summary.memoryPointers, 6);
  assert.equal(context.envelope.transmitted, false);
  assert.equal(context.envelope.sovereignty.cloudCallAllowed, false);
  assert.equal(orchestration.registry, "openclaw-phase-6-task-orchestration-records-v0");
  assert.equal(orchestration.summary.recordCount, 3);
  assert.equal(orchestration.summary.createsTask, false);
  assert.equal(routeReview.registry, "openclaw-phase-6-memory-write-route-review-v0");
  assert.equal(routeReview.summary.writesMemory, false);
  assert.equal(routeReview.summary.callsCloudModel, false);
  assert.equal(exit.registry, "openclaw-phase-6-exit-v0");
  assert.equal(exit.summary.complete, true);
  assert.equal(exit.summary.createsTask, false);
  assert.equal(exit.next.recommendedSlice, "openclaw-long-term-memory-write-plan");
});
