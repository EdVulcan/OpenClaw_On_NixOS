const HEARTBEAT_REGISTRY = "openclaw-trusted-work-view-sidecar-heartbeat-v0";
const intervalMs = Math.max(25, Number.parseInt(process.env.OPENCLAW_SIDECAR_HEARTBEAT_INTERVAL_MS ?? "250", 10));
const sessionId = process.env.OPENCLAW_SIDECAR_SESSION_ID ?? null;
const workViewId = process.env.OPENCLAW_SIDECAR_WORK_VIEW_ID ?? null;

let heartbeatCount = 1;

function send(type, details = {}) {
  if (typeof process.send !== "function") {
    process.exit(1);
  }
  process.send({
    registry: HEARTBEAT_REGISTRY,
    type,
    sessionId,
    workViewId,
    pid: process.pid,
    emittedAt: new Date().toISOString(),
    ...details,
  });
}

function heartbeat() {
  heartbeatCount += 1;
  send("heartbeat", { heartbeatCount });
}

send("ready", { heartbeatCount });
const timer = setInterval(heartbeat, intervalMs);

function stop(reason) {
  clearInterval(timer);
  send("stopped", { heartbeatCount, reason });
  setImmediate(() => process.exit(0));
}

process.on("message", (message) => {
  if (message?.type === "shutdown") {
    stop("parent_requested_shutdown");
  }
});
process.on("disconnect", () => process.exit(0));
process.on("SIGTERM", () => stop("sigterm"));
process.on("SIGINT", () => stop("sigint"));
