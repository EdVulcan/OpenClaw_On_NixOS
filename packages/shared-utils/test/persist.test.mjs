import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { createDebouncedPersist } from "../src/persist.mjs";

test("debounced persistence exposes a synchronous flush for process shutdown", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "openclaw-persist-"));
  const stateFile = path.join(directory, "state.json");
  try {
    const persist = createDebouncedPersist(stateFile, () => ({ status: "completed" }), 60_000);
    persist();
    persist.flush();
    assert.deepEqual(JSON.parse(readFileSync(stateFile, "utf8")), { status: "completed" });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
