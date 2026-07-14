import { chmodSync, mkdirSync, rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  HOSTD_REQUEST_MAX_BYTES,
  HOSTD_RESPONSE_REGISTRY,
  HOSTD_PROTOCOL_VERSION,
  buildHostdGovernance,
  createHostdRequestHandler,
} from "./hostd-protocol.mjs";
import { createHostdPeerCredentialVerifier } from "./hostd-peer-credentials.mjs";

export const DEFAULT_HOSTD_SOCKET_PATH = "/run/openclaw/hostd.sock";

function writeResponse(socket, response) {
  if (!socket.destroyed) socket.end(`${JSON.stringify(response)}\n`);
}

function handlerFailureResponse(error, peerIdentity) {
  return {
    ok: false,
    registry: HOSTD_RESPONSE_REGISTRY,
    protocolVersion: HOSTD_PROTOCOL_VERSION,
    requestId: null,
    owner: "openclaw-hostd",
    error: {
      code: "handler_failed",
      message: error instanceof Error ? error.message.slice(0, 256) : "Hostd request handler failed.",
    },
    governance: buildHostdGovernance(peerIdentity),
  };
}

export function createHostdServer({
  socketPath = DEFAULT_HOSTD_SOCKET_PATH,
  requestHandler = createHostdRequestHandler(),
  peerVerifier = createHostdPeerCredentialVerifier(),
} = {}) {
  let requestChain = Promise.resolve();
  const server = net.createServer({ allowHalfOpen: true }, (socket) => {
    let buffer = "";
    let handled = false;
    const peerIdentityPromise = Promise.resolve()
      .then(() => peerVerifier(socket))
      .catch(() => ({ verified: false, matched: false, reason: "peer_identity_unavailable" }));
    socket.setEncoding("utf8");
    socket.on("error", () => {});
    socket.on("data", (chunk) => {
      if (handled) return;
      buffer += chunk;
      if (Buffer.byteLength(buffer, "utf8") > HOSTD_REQUEST_MAX_BYTES) {
        handled = true;
        writeResponse(socket, {
          ok: false,
          registry: "openclaw-hostd-systemd-restart-response-v0",
          protocolVersion: 1,
          requestId: null,
          owner: "openclaw-hostd",
          error: { code: "request_too_large", message: "Hostd request exceeds the bounded protocol size." },
        });
        return;
      }
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex < 0) return;
      handled = true;
      const line = buffer.slice(0, newlineIndex);
      let peerIdentity = null;
      requestChain = requestChain
        .catch(() => null)
        .then(() => peerIdentityPromise)
        .then((identity) => {
          peerIdentity = identity;
          return requestHandler(line, { peerIdentity: identity });
        })
        .catch((error) => handlerFailureResponse(error, peerIdentity));
      requestChain.then((response) => writeResponse(socket, response));
    });
  });

  async function listen() {
    mkdirSync(path.dirname(socketPath), { recursive: true, mode: 0o750 });
    rmSync(socketPath, { force: true });
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(socketPath);
    });
    chmodSync(socketPath, 0o660);
    return server.address();
  }

  async function close() {
    if (!server.listening) {
      rmSync(socketPath, { force: true });
      return;
    }
    await new Promise((resolve) => server.close(resolve));
    rmSync(socketPath, { force: true });
  }

  return { server, listen, close, socketPath };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const runtime = createHostdServer({
    socketPath: process.env.OPENCLAW_HOSTD_SOCKET_PATH ?? DEFAULT_HOSTD_SOCKET_PATH,
  });
  runtime.listen()
    .then(() => {
      console.log(`openclaw-hostd listening on ${runtime.socketPath}`);
      const shutdown = () => runtime.close().finally(() => process.exit(0));
      process.once("SIGTERM", shutdown);
      process.once("SIGINT", shutdown);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "OpenClaw hostd failed to start.");
      process.exitCode = 1;
    });
}
