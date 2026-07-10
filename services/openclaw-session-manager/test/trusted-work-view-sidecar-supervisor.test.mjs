import test from "node:test";
import assert from "node:assert/strict";

import { createTrustedWorkViewSidecarSupervisor } from "../src/trusted-work-view-sidecar-supervisor.mjs";

test("trusted work-view sidecar supervisor starts one bounded user-space heartbeat process and stops it", async () => {
  const heartbeats = [];
  const supervisor = createTrustedWorkViewSidecarSupervisor({
    heartbeatIntervalMs: 25,
    onHeartbeat: (message) => heartbeats.push(message),
  });

  const running = await supervisor.start({
    sessionId: "session-sidecar",
    workViewId: "work-view-primary",
    leaseId: "lease-sidecar",
    taskId: "task-sidecar",
    approvalId: "approval-sidecar",
    approvalStatus: "approved",
  });
  assert.equal(running.status, "running");
  assert.equal(running.running, true);
  assert.equal(running.sessionManagerOwned, true);
  assert.equal(running.boundedProcess, true);
  assert.equal(running.credentialEnvironmentInherited, false);
  assert.equal(running.rootRequired, false);
  assert.equal(running.providerEgress, false);
  assert.equal(heartbeats.length >= 1, true);

  const stopped = await supervisor.stop({ taskId: "task-sidecar" });
  assert.equal(stopped.status, "stopped");
  assert.equal(stopped.running, false);
  assert.equal(stopped.stopped, true);
  assert.equal(stopped.exitCode, 0);
});

test("trusted work-view sidecar supervisor rejects unapproved process start", async () => {
  const supervisor = createTrustedWorkViewSidecarSupervisor();
  await assert.rejects(() => supervisor.start({
    sessionId: "session-sidecar",
    workViewId: "work-view-primary",
    leaseId: "lease-sidecar",
    taskId: "task-sidecar",
    approvalId: "approval-sidecar",
    approvalStatus: "pending",
  }), /approved lifecycle authority/u);
  assert.equal(supervisor.snapshot().running, false);
});
