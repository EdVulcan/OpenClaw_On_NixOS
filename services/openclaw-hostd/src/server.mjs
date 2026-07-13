import { chmodSync, mkdirSync, rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  HOSTD_REQUEST_MAX_BYTES,
  createHostdRequestHandler,
} from "./hostd-protocol.mjs";

export const DEFAULT_HOSTD_SOCKET_PATH = "/run/openclaw/hostd.sock";

function writeResponse(socket, response) {
  if (!socket.destroyed) socket.end(`${JSON.stringify(response)}\n`);
}

export function createHostdServer({
  socketPath = DEFAULT_HOSTD_SOCKET_PATH,
  requestHandler = createHostdRequestHandler(),
} = {}) {
  let requestChain = Promise.resolve();
  const server = net.createServer((socket) => {
    let buffer = "";
    let handled = false;
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
      requestChain = requestChain
        .catch(() => null)
        .then(() => requestHandler(line))
        .catch((error) => ({
          ok: false,
          registry: "openclaw-hostd-systemd-restart-response-v0",
          protocolVersion: 1,
          requestId: null,
          owner: "openclaw-hostd",
          error: {
            code: "handler_failed",
            message: error instanceof Error ? error.message.slice(0, 256) : "Hostd request handler failed.",
          },
        }));
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
