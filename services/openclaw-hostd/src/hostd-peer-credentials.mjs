import { spawn as nodeSpawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 1000;
const PEER_IDENTITY_MISMATCH_EXIT_CODE = 10;
const PEER_GROUP_MISMATCH_EXIT_CODE = 12;

export const HOSTD_PEER_CREDENTIAL_HELPER_ENV = "OPENCLAW_HOSTD_PEER_CREDENTIAL_HELPER";
export const HOSTD_PEER_EXPECTED_USER_ENV = "OPENCLAW_HOSTD_PEER_EXPECTED_USER";
export const HOSTD_PEER_EXPECTED_GROUP_ENV = "OPENCLAW_HOSTD_PEER_EXPECTED_GROUP";

function unavailable(reason) {
  return { verified: false, matched: false, reason };
}

function spawnPeerCredentialHelper(helperPath, args, options) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = nodeSpawn(helperPath, args, options);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      const error = new Error("Hostd peer credential helper timed out.");
      error.code = "ETIMEDOUT";
      settled = true;
      reject(error);
    }, options.timeout);

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      const error = new Error("Hostd peer credential helper rejected the socket peer.");
      error.code = code ?? signal ?? "ECHILD";
      reject(error);
    });
  });
}

export function createHostdPeerCredentialVerifier({
  helperPath = process.env[HOSTD_PEER_CREDENTIAL_HELPER_ENV] ?? "",
  expectedUser = process.env[HOSTD_PEER_EXPECTED_USER_ENV] ?? "openclaw-service",
  expectedGroup = process.env[HOSTD_PEER_EXPECTED_GROUP_ENV] ?? "openclaw",
  spawn: runHelper = spawnPeerCredentialHelper,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const boundedTimeoutMs = Math.min(5000, Math.max(100, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));

  return async function verifyPeer(socket) {
    const fd = socket?._handle?.fd;
    if (!Number.isInteger(fd) || fd < 0) return unavailable("socket_fd_unavailable");
    if (typeof helperPath !== "string" || helperPath.length === 0) {
      return unavailable("peer_helper_unconfigured");
    }

    try {
      await runHelper(helperPath, ["--user", expectedUser, "--group", expectedGroup], {
        stdio: [fd, "ignore", "ignore"],
        timeout: boundedTimeoutMs,
      });
      return { verified: true, matched: true, reason: null };
    } catch (error) {
      if (error?.code === PEER_IDENTITY_MISMATCH_EXIT_CODE) {
        return { verified: true, matched: false, reason: "peer_identity_mismatch" };
      }
      if (error?.code === PEER_GROUP_MISMATCH_EXIT_CODE) {
        return { verified: true, matched: false, reason: "peer_group_mismatch" };
      }
      return unavailable("peer_identity_unavailable");
    }
  };
}
