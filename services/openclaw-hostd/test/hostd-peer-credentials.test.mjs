import test from "node:test";
import assert from "node:assert/strict";

import { createHostdPeerCredentialVerifier } from "../src/hostd-peer-credentials.mjs";

test("hostd peer verifier passes the accepted socket fd to the fixed native helper", async () => {
  let observed = null;
  const verify = createHostdPeerCredentialVerifier({
    helperPath: "/nix/store/hostd-peer/bin/openclaw-hostd-peer-credentials",
    expectedUser: "openclaw-service",
    expectedGroup: "openclaw",
    spawn: async (...args) => {
      observed = args;
    },
  });

  const result = await verify({ _handle: { fd: 17 } });

  assert.deepEqual(result, { verified: true, matched: true, reason: null });
  assert.equal(observed[0], "/nix/store/hostd-peer/bin/openclaw-hostd-peer-credentials");
  assert.deepEqual(observed[1], ["--user", "openclaw-service", "--group", "openclaw"]);
  assert.equal(observed[2].stdio[0], 17);
  assert.equal(observed[2].timeout, 1000);
});

test("hostd peer verifier distinguishes a kernel identity mismatch from unavailable verification", async () => {
  const mismatchError = Object.assign(new Error("peer mismatch"), { code: 10 });
  const mismatch = createHostdPeerCredentialVerifier({
    helperPath: "/nix/store/hostd-peer/bin/openclaw-hostd-peer-credentials",
    spawn: async () => {
      throw mismatchError;
    },
  });
  const unavailable = createHostdPeerCredentialVerifier({
    helperPath: "/nix/store/hostd-peer/bin/openclaw-hostd-peer-credentials",
    spawn: async () => {
      throw new Error("helper failed");
    },
  });

  assert.deepEqual(await mismatch({ _handle: { fd: 17 } }), {
    verified: true,
    matched: false,
    reason: "peer_identity_mismatch",
  });
  assert.deepEqual(await unavailable({ _handle: { fd: 17 } }), {
    verified: false,
    matched: false,
    reason: "peer_identity_unavailable",
  });
});

test("hostd peer verifier preserves a compact group-mismatch reason", async () => {
  const mismatchError = Object.assign(new Error("peer group mismatch"), { code: 12 });
  const verify = createHostdPeerCredentialVerifier({
    helperPath: "/nix/store/hostd-peer/bin/openclaw-hostd-peer-credentials",
    spawn: async () => {
      throw mismatchError;
    },
  });

  assert.deepEqual(await verify({ _handle: { fd: 17 } }), {
    verified: true,
    matched: false,
    reason: "peer_group_mismatch",
  });
});

test("hostd peer verifier fails closed when the accepted socket fd is unavailable", async () => {
  const verify = createHostdPeerCredentialVerifier({
    helperPath: "/nix/store/hostd-peer/bin/openclaw-hostd-peer-credentials",
  });

  assert.deepEqual(await verify({}), {
    verified: false,
    matched: false,
    reason: "socket_fd_unavailable",
  });
});
