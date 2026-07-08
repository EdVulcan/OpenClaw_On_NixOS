import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createRuntimeProfiler } from "../src/runtime-diagnostics.mjs";

function withProfileEnv(file, fn) {
  const previousEnabled = process.env.OPENCLAW_RUNTIME_PROFILE;
  const previousFile = process.env.OPENCLAW_RUNTIME_PROFILE_FILE;
  process.env.OPENCLAW_RUNTIME_PROFILE = "true";
  process.env.OPENCLAW_RUNTIME_PROFILE_FILE = file;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (previousEnabled === undefined) delete process.env.OPENCLAW_RUNTIME_PROFILE;
      else process.env.OPENCLAW_RUNTIME_PROFILE = previousEnabled;
      if (previousFile === undefined) delete process.env.OPENCLAW_RUNTIME_PROFILE_FILE;
      else process.env.OPENCLAW_RUNTIME_PROFILE_FILE = previousFile;
    });
}

test("runtime profiler writes passed measurements when explicitly enabled", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "openclaw-runtime-profile-"));
  const profileFile = path.join(tempDir, "profile.jsonl");

  try {
    const profiler = createRuntimeProfiler("test-scope");
    const result = await withProfileEnv(profileFile, () => profiler.measure("sample", async () => ({ ok: true }), { phase: "unit" }));
    assert.deepEqual(result, { ok: true });

    const records = readFileSync(profileFile, "utf8").trim().split(/\n/).map((line) => JSON.parse(line));
    assert.equal(records.length, 1);
    assert.equal(records[0].namespace, "test-scope");
    assert.equal(records[0].name, "sample");
    assert.equal(records[0].status, "passed");
    assert.equal(records[0].details.phase, "unit");
    assert.equal(Number.isInteger(records[0].durationMs), true);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("runtime profiler is transparent when disabled", async () => {
  const previousEnabled = process.env.OPENCLAW_RUNTIME_PROFILE;
  const previousFile = process.env.OPENCLAW_RUNTIME_PROFILE_FILE;
  delete process.env.OPENCLAW_RUNTIME_PROFILE;
  delete process.env.OPENCLAW_RUNTIME_PROFILE_FILE;

  try {
    const profiler = createRuntimeProfiler("disabled-scope");
    assert.equal(await profiler.measure("sample", async () => 42), 42);
  } finally {
    if (previousEnabled === undefined) delete process.env.OPENCLAW_RUNTIME_PROFILE;
    else process.env.OPENCLAW_RUNTIME_PROFILE = previousEnabled;
    if (previousFile === undefined) delete process.env.OPENCLAW_RUNTIME_PROFILE_FILE;
    else process.env.OPENCLAW_RUNTIME_PROFILE_FILE = previousFile;
  }
});
