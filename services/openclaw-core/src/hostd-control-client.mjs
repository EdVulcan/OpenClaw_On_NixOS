import { randomUUID } from "node:crypto";
import net from "node:net";
import {
  HOSTD_RESTART_CAPABILITY_REGISTRY,
  hostdRestartCapabilityForTarget,
} from "../../../packages/shared-systemd/src/openclaw-hostd-capabilities.mjs";

export const OPENCLAW_HOSTD_SOCKET_PATH_ENV = "OPENCLAW_HOSTD_SOCKET_PATH";
export const DEFAULT_OPENCLAW_HOSTD_SOCKET_PATH = "/run/openclaw/hostd.sock";
export const HOSTD_PROTOCOL_VERSION = 1;
export const HOSTD_REQUEST_OPERATION = "restart_system_sense";
export const HOSTD_TARGET_UNIT = "openclaw-system-sense.service";
export const HOSTD_RESPONSE_REGISTRY = "openclaw-hostd-systemd-restart-response-v0";
const HOSTD_REQUEST_MAX_BYTES = 8 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;

function boundedSocketPath(socketPath) {
  if (typeof socketPath !== "string" || socketPath.length === 0 || socketPath.length > 256) {
    throw new Error("OpenClaw hostd requires a bounded Unix socket path.");
  }
  return socketPath;
}

function parseResponse(line, expectedRequestId) {
  let response;
  try {
    response = JSON.parse(line);
  } catch {
    throw new Error("OpenClaw hostd returned invalid JSON.");
  }
  if (!response || typeof response !== "object" || Array.isArray(response)
    || response.registry !== HOSTD_RESPONSE_REGISTRY
    || response.protocolVersion !== HOSTD_PROTOCOL_VERSION
    || (response.ok === true && response.capability?.registry !== HOSTD_RESTART_CAPABILITY_REGISTRY)) {
    throw new Error("OpenClaw hostd returned an invalid protocol response.");
  }
  if (response.requestId !== expectedRequestId) {
    throw new Error("OpenClaw hostd response request id does not match the request.");
  }
  return response;
}

export async function requestHostdRestart({
  socketPath = process.env[OPENCLAW_HOSTD_SOCKET_PATH_ENV] ?? DEFAULT_OPENCLAW_HOSTD_SOCKET_PATH,
  targetUnit = HOSTD_TARGET_UNIT,
  operation = null,
  requestId = randomUUID(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  createConnection = net.createConnection,
} = {}) {
  const targetSocketPath = boundedSocketPath(socketPath);
  const capability = hostdRestartCapabilityForTarget(targetUnit);
  if (!capability || (operation !== null && operation !== capability.operation)) {
    throw new Error(`OpenClaw hostd client rejects restart target ${targetUnit}.`);
  }
  const request = JSON.stringify({
    version: HOSTD_PROTOCOL_VERSION,
    operation: capability.operation,
    target: capability.targetUnit,
    requestId,
  });
  if (Buffer.byteLength(request, "utf8") > HOSTD_REQUEST_MAX_BYTES) {
    throw new Error("OpenClaw hostd request exceeds the bounded protocol size.");
  }

  const boundedTimeoutMs = Math.min(60_000, Math.max(1, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));
  return new Promise((resolve, reject) => {
    let buffer = "";
    let settled = false;
    let socket;
    const finish = (error, response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket?.destroy();
      if (error) reject(error);
      else resolve(response);
    };
    const timer = setTimeout(() => finish(new Error("OpenClaw hostd request timed out.")), boundedTimeoutMs);

    try {
      socket = createConnection(targetSocketPath);
    } catch (error) {
      finish(error instanceof Error ? error : new Error("Unable to connect to OpenClaw hostd."));
      return;
    }

    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      if (Buffer.byteLength(buffer, "utf8") > HOSTD_REQUEST_MAX_BYTES) {
        finish(new Error("OpenClaw hostd response exceeds the bounded protocol size."));
        return;
      }
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex < 0) return;
      try {
        finish(null, parseResponse(buffer.slice(0, newlineIndex), requestId));
      } catch (error) {
        finish(error instanceof Error ? error : new Error("OpenClaw hostd returned an invalid response."));
      }
    });
    socket.on("error", (error) => finish(error));
    socket.on("end", () => {
      if (!settled) finish(new Error("OpenClaw hostd closed the connection without a response."));
    });
    socket.on("connect", () => socket.end(`${request}\n`));
  });
}

export const requestHostdSystemSenseRestart = (options = {}) => requestHostdRestart({
  ...options,
  targetUnit: HOSTD_TARGET_UNIT,
  operation: HOSTD_REQUEST_OPERATION,
});

export { HOSTD_RESTART_CAPABILITY_REGISTRY };
