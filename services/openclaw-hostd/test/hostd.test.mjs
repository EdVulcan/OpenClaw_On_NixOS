import test from "node:test";
import assert from "node:assert/strict";
import { createHostdRequestHandler, parseHostdRequest } from "../src/hostd-protocol.mjs";
import { HOSTD_TARGET_UNIT, runFixedSystemdRestart } from "../src/systemd-hostd-control.mjs";
import { createHostdServer } from "../src/server.mjs";
import { requestHostdSystemSenseRestart } from "../../openclaw-core/src/hostd-control-client.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const allowPeer = async () => ({ verified: true, matched: true, reason: null });

test("hostd protocol accepts only the fixed system-sense restart capability", () => {
  const parsed = parseHostdRequest(JSON.stringify({
    version: 1,
    operation: "restart_system_sense",
    target: HOSTD_TARGET_UNIT,
    requestId: "test-request-1",
  }));
  assert.equal(parsed.ok, true);

  const arbitrary = parseHostdRequest(JSON.stringify({
    version: 1,
    operation: "restart_unit",
    target: "ssh.service",
    requestId: "test-request-2",
  }));
  assert.equal(arbitrary.ok, false);
  assert.equal(arbitrary.response.error.code, "unsupported_capability");
  assert.equal(arbitrary.response.governance.callerBoundary, "openclaw-service-group-socket");
  assert.equal(arbitrary.response.governance.socketPeerIdentityVerified, false);

  const extraField = parseHostdRequest(JSON.stringify({
    version: 1,
    operation: "restart_system_sense",
    target: HOSTD_TARGET_UNIT,
    requestId: "test-request-3",
    command: "systemctl",
  }));
  assert.equal(extraField.ok, false);
  assert.equal(extraField.response.error.code, "unknown_field");
});

test("hostd restart control verifies changed PID and closes its D-Bus transport", async () => {
  let readIndex = 0;
  let closed = false;
  const restartCalls = [];
  const states = [
    { activeState: "active", subState: "running", mainPid: 100 },
    { activeState: "activating", subState: "auto-restart", mainPid: null },
    { activeState: "active", subState: "running", mainPid: 200 },
  ];
  const transport = {
    async getUnitPath(unitName) {
      assert.equal(unitName, HOSTD_TARGET_UNIT);
      return "/org/freedesktop/systemd1/unit/openclaw_2dsystem_2dsense_2eservice";
    },
    async getAll(_path, interfaceName) {
      const state = states[Math.min(readIndex, states.length - 1)];
      if (interfaceName.endsWith(".Unit")) {
        return { LoadState: "loaded", ActiveState: state.activeState, SubState: state.subState };
      }
      readIndex += 1;
      return { MainPID: state.mainPid ?? 0 };
    },
    async restartUnit(unitName) {
      restartCalls.push(unitName);
      return "/org/freedesktop/systemd1/job/42";
    },
    close() {
      closed = true;
    },
  };

  const result = await runFixedSystemdRestart({ createTransport: () => transport, pollIntervalMs: 0 });
  assert.equal(result.owner, "openclaw-hostd");
  assert.equal(result.before.mainPid, 100);
  assert.equal(result.after.mainPid, 200);
  assert.deepEqual(restartCalls, [HOSTD_TARGET_UNIT]);
  assert.equal(closed, true);
});

test("hostd socket boundary carries compact owner evidence to the core client", async () => {
  const socketPath = path.join(mkdtempSync(path.join(tmpdir(), "openclaw-hostd-test-")), "hostd.sock");
  const runtime = createHostdServer({
    socketPath,
    peerVerifier: allowPeer,
    requestHandler: createHostdRequestHandler({
      runRestart: async () => ({
        ok: true,
        owner: "openclaw-hostd",
        transport: "dbus_native",
        method: "org.freedesktop.systemd1.Manager.RestartUnit",
        unit: HOSTD_TARGET_UNIT,
        jobPath: "/org/freedesktop/systemd1/job/42",
        before: { mainPid: 100 },
        after: { activeState: "active", subState: "running", mainPid: 200 },
      }),
    }),
  });
  await runtime.listen();
  try {
    const response = await requestHostdSystemSenseRestart({ socketPath, requestId: "client-request-1" });
    assert.equal(response.ok, true);
    assert.equal(response.owner, "openclaw-hostd");
    assert.equal(response.transport, "unix_socket");
    assert.equal(response.nativeMutation.owner, "openclaw-hostd");
    assert.equal(response.nativeMutation.before.mainPid, 100);
    assert.equal(response.nativeMutation.after.mainPid, 200);
    assert.equal(response.governance.callerBoundary, "kernel_so_peercred");
    assert.equal(response.governance.socketPeerIdentityVerified, true);
    assert.equal(response.governance.socketPeerIdentityMatched, true);
  } finally {
    await runtime.close();
  }
});

test("hostd keeps the response channel open after a client half-closes its request", async () => {
  const socketPath = path.join(mkdtempSync(path.join(tmpdir(), "openclaw-hostd-half-close-")), "hostd.sock");
  const runtime = createHostdServer({
    socketPath,
    peerVerifier: allowPeer,
    requestHandler: createHostdRequestHandler({
      runRestart: async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
        return {
          ok: true,
          owner: "openclaw-hostd",
          transport: "dbus_native",
          method: "org.freedesktop.systemd1.Manager.RestartUnit",
          unit: HOSTD_TARGET_UNIT,
          jobPath: "/org/freedesktop/systemd1/job/43",
          before: { mainPid: 300 },
          after: { activeState: "active", subState: "running", mainPid: 400 },
        };
      },
    }),
  });
  await runtime.listen();
  try {
    const response = await requestHostdSystemSenseRestart({ socketPath, requestId: "half-close-request" });
    assert.equal(response.ok, true);
    assert.equal(response.requestId, "half-close-request");
    assert.equal(response.nativeMutation.after.mainPid, 400);
  } finally {
    await runtime.close();
  }
});

test("hostd client rejects a response bound to a different request", async () => {
  const socketPath = path.join(mkdtempSync(path.join(tmpdir(), "openclaw-hostd-mismatch-")), "hostd.sock");
  const runtime = createHostdServer({
    socketPath,
    peerVerifier: allowPeer,
    requestHandler: async () => ({
      ok: true,
      registry: "openclaw-hostd-systemd-restart-response-v0",
      protocolVersion: 1,
      requestId: "different-request",
      owner: "openclaw-hostd",
    }),
  });
  await runtime.listen();
  try {
    await assert.rejects(
      requestHostdSystemSenseRestart({ socketPath, requestId: "expected-request" }),
      /request id does not match the request/,
    );
  } finally {
    await runtime.close();
  }
});

test("hostd denies the fixed mutation when kernel peer identity does not match", async () => {
  const socketPath = path.join(mkdtempSync(path.join(tmpdir(), "openclaw-hostd-peer-denied-")), "hostd.sock");
  let restartCalled = false;
  const runtime = createHostdServer({
    socketPath,
    peerVerifier: async () => ({ verified: true, matched: false, reason: "peer_identity_mismatch" }),
    requestHandler: createHostdRequestHandler({
      runRestart: async () => {
        restartCalled = true;
        return { ok: true };
      },
    }),
  });
  await runtime.listen();
  try {
    const response = await requestHostdSystemSenseRestart({ socketPath, requestId: "peer-denied-request" });
    assert.equal(response.ok, false);
    assert.equal(response.error.code, "peer_identity_denied");
    assert.equal(response.governance.socketPeerIdentityVerified, true);
    assert.equal(response.governance.socketPeerIdentityMatched, false);
    assert.equal(restartCalled, false);
  } finally {
    await runtime.close();
  }
});
