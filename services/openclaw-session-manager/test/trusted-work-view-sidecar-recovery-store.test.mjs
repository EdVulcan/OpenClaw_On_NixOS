import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createTrustedWorkViewSidecarRecoveryStore } from "../src/trusted-work-view-sidecar-recovery-store.mjs";

function withTempState(run) {
  const directory = mkdtempSync(path.join(tmpdir(), "openclaw-sidecar-recovery-"));
  try {
    return run(path.join(directory, "state.json"));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("trusted sidecar recovery store atomically persists only compact lifecycle intent", () => {
  withTempState((stateFilePath) => {
    const store = createTrustedWorkViewSidecarRecoveryStore({
      stateFilePath,
      now: () => "2026-07-10T10:00:00.000Z",
    });
    const intent = store.record({
      taskId: "task-sidecar",
      approvalId: "approval-sidecar",
      status: "running",
      leaseId: "must-not-persist",
      captureObservation: { text: "must-not-persist" },
    });
    assert.deepEqual(intent, {
      taskId: "task-sidecar",
      approvalId: "approval-sidecar",
      status: "running",
      timestamp: "2026-07-10T10:00:00.000Z",
      automaticRestart: false,
    });
    const persisted = readFileSync(stateFilePath, "utf8");
    assert.equal(persisted.includes("must-not-persist"), false);
  });
});

test("trusted sidecar recovery store restores running intent as recovery required", () => {
  withTempState((stateFilePath) => {
    writeFileSync(stateFilePath, JSON.stringify({
      registry: "openclaw-session-manager-state-v0",
      sidecarLifecycleIntent: {
        taskId: "task-sidecar",
        approvalId: "approval-sidecar",
        status: "running",
        timestamp: "2026-07-10T10:00:00.000Z",
        automaticRestart: true,
        leaseId: "must-not-restore",
      },
    }));
    const store = createTrustedWorkViewSidecarRecoveryStore({ stateFilePath });
    assert.deepEqual(store.snapshot(), {
      taskId: "task-sidecar",
      approvalId: "approval-sidecar",
      status: "recovery_required",
      timestamp: "2026-07-10T10:00:00.000Z",
      automaticRestart: false,
    });
  });
});
