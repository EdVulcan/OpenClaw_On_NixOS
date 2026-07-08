import { mkdirSync, appendFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

function isProfilingEnabled() {
  return process.env.OPENCLAW_RUNTIME_PROFILE === "true"
    || process.env.OPENCLAW_RUNTIME_PROFILE === "1";
}

function writeProfileRecord(record) {
  const file = process.env.OPENCLAW_RUNTIME_PROFILE_FILE;
  if (!file) {
    console.error(`[openclaw-runtime-profile] ${JSON.stringify(record)}`);
    return;
  }

  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(record)}\n`, "utf8");
}

export function createRuntimeProfiler(namespace) {
  async function measure(name, operation, details = {}) {
    if (!isProfilingEnabled()) {
      return operation();
    }

    const startedAt = new Date().toISOString();
    const start = performance.now();
    try {
      const result = await operation();
      writeProfileRecord({
        namespace,
        name,
        status: "passed",
        durationMs: Math.round(performance.now() - start),
        startedAt,
        finishedAt: new Date().toISOString(),
        details,
      });
      return result;
    } catch (error) {
      writeProfileRecord({
        namespace,
        name,
        status: "failed",
        durationMs: Math.round(performance.now() - start),
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        details,
      });
      throw error;
    }
  }

  return { measure };
}
