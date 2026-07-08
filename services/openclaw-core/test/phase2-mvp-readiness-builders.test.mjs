import test from "node:test";
import assert from "node:assert/strict";

import { createPhase2MvpReadinessBuilders } from "../src/phase2-mvp-readiness-builders.mjs";

function createPhase2Harness(overrides = {}) {
  const fetchUrls = [];
  const repairVerification = {
    registry: "openclaw-systemd-repair-post-verification-v0",
    targetUnit: "openclaw-browser-runtime.service",
    commandExitCode: 0,
    summary: {
      beforeActiveState: "failed",
      afterActiveState: "active",
      beforeServiceOk: false,
      afterServiceOk: true,
      noAutomaticRecovery: true,
    },
  };
  const nextRepairVerification = {
    registry: "openclaw-systemd-next-repair-post-verification-v0",
    governance: {
      triggersRecovery: false,
    },
  };
  const tasks = overrides.tasks ?? new Map([
    [
      "repair-task-1",
      {
        id: "repair-task-1",
        type: "systemd_repair_execution_task",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:01:00.000Z",
        systemdRepair: {
          target: {
            unit: "openclaw-browser-runtime.service",
          },
        },
        outcome: {
          kind: "completed",
          details: {
            postExecutionVerification: repairVerification,
            commandTranscript: [
              {
                command: "systemctl restart openclaw-browser-runtime.service",
                exitCode: 0,
              },
            ],
          },
        },
      },
    ],
    [
      "next-repair-task-1",
      {
        id: "next-repair-task-1",
        type: "systemd_next_repair_task",
        createdAt: "2026-01-01T00:02:00.000Z",
        updatedAt: "2026-01-01T00:03:00.000Z",
        systemdNextRepair: {
          sourceRegistry: "openclaw-systemd-next-repair-task-route-v0",
          target: {
            unit: "openclaw-system-sense.service",
          },
        },
        approval: {
          status: "approved",
        },
        outcome: {
          kind: "completed",
          details: {
            postExecutionVerification: nextRepairVerification,
            commandTranscript: [
              {
                command: "systemctl restart openclaw-system-sense.service",
                exitCode: 0,
              },
            ],
            hostMutationAttempted: false,
            executionSucceeded: true,
            rollbackNote: "No rollback needed.",
          },
        },
      },
    ],
  ]);
  const responses = {
    "http://127.0.0.1:4106/system/route/phase-2-review": {
      ok: true,
      registry: "openclaw-phase-2-route-review-v0",
      decision: {
        selectedTrack: "Track B",
        selectedSlice: "openclaw-phase-2-demo-control-room",
        notSelected: ["no safety-boundary loop"],
      },
      evidence: {
        trackCReady: true,
      },
      source: {
        bodyGovernanceReadinessRegistry: "openclaw-body-governance-readiness-v0",
      },
    },
    "http://127.0.0.1:4106/system/systemd/repair-candidate-demo-status": {
      ok: true,
      registry: "openclaw-systemd-repair-candidate-demo-status-v0",
      summary: {
        demoReady: true,
        selectedUnit: "openclaw-system-sense.service",
      },
    },
    "http://127.0.0.1:4106/system/route/body-evidence-timeline-readiness": {
      ok: true,
      registry: "openclaw-body-evidence-timeline-readiness-v0",
      summary: {
        ready: true,
      },
    },
    "http://127.0.0.1:4106/system/route/body-evidence-ledger-readiness": {
      ok: true,
      registry: "openclaw-body-evidence-ledger-readiness-v0",
      summary: {
        ready: true,
        recordCount: 1,
      },
    },
    "http://127.0.0.1:4106/system/route/body-evidence-ledger-demo-status": {
      ok: true,
      registry: "openclaw-body-evidence-ledger-demo-status-v0",
      summary: {
        demoReady: true,
      },
    },
    "http://127.0.0.1:4106/system/route/body-evidence-ledger-followup-record-plan": {
      ok: true,
      registry: "openclaw-body-evidence-ledger-followup-record-plan-v0",
      summary: {
        planReady: true,
        plannedSequence: 2,
      },
    },
    "http://127.0.0.1:4106/system/route/body-governance-readiness": {
      ok: true,
      registry: "openclaw-body-governance-readiness-v0",
      summary: {
        ready: true,
      },
    },
    ...(overrides.responses ?? {}),
  };
  const builders = createPhase2MvpReadinessBuilders({
    tasks,
    systemSenseUrl: "http://127.0.0.1:4106",
    serialiseTask: (task) => ({
      id: task.id,
      type: task.type,
    }),
    buildBodyEvidenceLedgerFollowupRecordReadiness: () => overrides.followupReadiness ?? {
      registry: "openclaw-body-evidence-ledger-followup-record-readiness-v0",
      summary: {
        ready: true,
        taskId: "body-evidence-followup-task-1",
        approvalId: "approval-1",
        approvalStatus: "pending",
        existingRecordCount: 1,
        recordAppended: false,
      },
    },
    buildBodyEvidenceLedgerFollowupRecordAppendReadiness: () => overrides.followupAppendReadiness ?? {
      registry: "openclaw-body-evidence-ledger-followup-record-append-readiness-v0",
      summary: {
        ready: true,
        existingRecordCount: 2,
        recordId: "body-evidence-record-2",
      },
      governance: {
        schedulesFollowUp: false,
        backgroundWriter: false,
        triggersRecovery: false,
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

test("phase 2 mvp builders preserve MVP route and repair demo projections", () => {
  const { builders } = createPhase2Harness();

  const route = builders.buildMvpRouteAlignment();
  const repair = builders.buildPhase2RepairDemoStatus();
  const nextRepair = builders.buildPhase2NextRepairDemoStatus();

  assert.equal(route.registry, "openclaw-mvp-route-alignment-v0");
  assert.equal(route.summary.direction, "return-to-mvp-body-health");
  assert.equal(repair.registry, "openclaw-phase-2-repair-demo-status-v0");
  assert.equal(repair.summary.demoReady, true);
  assert.equal(repair.evidence.task.id, "repair-task-1");
  assert.equal(repair.governance.mutatesHost, false);
  assert.equal(nextRepair.registry, "openclaw-systemd-next-repair-demo-status-v0");
  assert.equal(nextRepair.summary.ready, true);
  assert.equal(nextRepair.summary.hostMutationAttempted, false);
});

test("phase 2 mvp builders preserve demo walkthrough and route-review boundaries", async () => {
  const { builders } = createPhase2Harness();

  const controlRoom = await builders.buildPhase2DemoControlRoom();
  const walkthrough = await builders.buildPhase2DemoWalkthrough();
  const demoExit = await builders.buildPhase2DemoReadinessExit();
  const routeReview = await builders.buildPhase2NextCapabilityRouteReview({
    ledgerDemoStatusCheckpointComplete: true,
    repairCandidateDemoCheckpointComplete: true,
  });

  assert.equal(controlRoom.registry, "openclaw-phase-2-demo-control-room-v0");
  assert.equal(controlRoom.summary.ready, true);
  assert.equal(walkthrough.registry, "openclaw-phase-2-demo-walkthrough-v0");
  assert.equal(walkthrough.summary.ready, true);
  assert.equal(demoExit.registry, "openclaw-phase-2-demo-readiness-exit-v0");
  assert.equal(demoExit.summary.ready, true);
  assert.equal(routeReview.registry, "openclaw-phase-2-next-capability-route-review-v0");
  assert.equal(routeReview.decision.selectedSlice, "openclaw-phase-2-completion-readiness");
  assert.equal(routeReview.governance.createsTask, false);
  assert.equal(routeReview.evidence.bodyEvidenceLedgerFollowupAppendReadinessReady, true);
});

test("phase 2 mvp builders preserve completion readiness and exit contracts", async () => {
  const { builders } = createPhase2Harness();

  const readiness = await builders.buildPhase2CompletionReadiness();
  const exit = await builders.buildPhase2Exit();

  assert.equal(readiness.registry, "openclaw-phase-2-completion-readiness-v0");
  assert.equal(readiness.summary.ready, true);
  assert.equal(readiness.summary.completionPercent, 100);
  assert.equal(readiness.summary.durableBodyMemoryRecords, 2);
  assert.equal(exit.registry, "openclaw-phase-2-exit-v0");
  assert.equal(exit.summary.complete, true);
  assert.equal(exit.next.recommendedSlice, "openclaw-phase-3-plan");
});
