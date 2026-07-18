import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createAuditLogStore } from "../src/audit-log-store.mjs";

async function createFixture(t, options = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openclaw-event-audit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, "events.jsonl");
  return {
    directory,
    filePath,
    store: createAuditLogStore({ filePath, ...options }),
  };
}

function event(index, overrides = {}) {
  return {
    id: `event-${index}`,
    type: index % 2 === 0 ? "task.updated" : "task.created",
    source: index % 3 === 0 ? "openclaw-core" : "openclaw-system-sense",
    timestamp: new Date(Date.UTC(2026, 6, 18, 0, 0, index)).toISOString(),
    payload: { index },
    ...overrides,
  };
}

test("audit store reads the latest matching events and streams a retained summary", async (t) => {
  const { filePath, store } = await createFixture(t, { readChunkBytes: 256 });
  const entries = [
    JSON.stringify(event(1)),
    "{malformed",
    JSON.stringify(event(2, { payload: { text: "故障".repeat(200) } })),
    JSON.stringify(event(3)),
  ];
  await writeFile(filePath, `${entries.join("\r\n")}\r\n`, "utf8");

  const latest = await store.readEvents({ limit: 2 });
  assert.deepEqual(latest.map(({ id }) => id), ["event-2", "event-3"]);
  assert.equal(latest[0].payload.text, "故障".repeat(200));

  const filtered = await store.readEvents({ source: "openclaw-core", limit: 20 });
  assert.deepEqual(filtered.map(({ id }) => id), ["event-3"]);

  const summary = await store.buildSummary({ recentEventCount: 2 });
  assert.equal(summary.total, 3);
  assert.equal(summary.malformed, 1);
  assert.deepEqual(summary.byType, { "task.created": 2, "task.updated": 1 });
  assert.deepEqual(summary.bySource, { "openclaw-system-sense": 2, "openclaw-core": 1 });
  assert.equal(summary.earliestTimestamp, event(1).timestamp);
  assert.equal(summary.latestTimestamp, event(3).timestamp);
  assert.equal(summary.recentEventCount, 2);
  assert.equal(summary.retainedSegmentCount, 1);
  assert.equal(summary.oversizedSegmentCount, 0);
  assert.equal(summary.retention.summaryScansSinceStart, 1);

  await store.append(event(4));
  const incremented = await store.buildSummary();
  assert.equal(incremented.total, 4);
  assert.equal(incremented.retention.summaryScansSinceStart, 1);
});

test("audit store rotates to a fixed retained segment count", async (t) => {
  const { filePath, store } = await createFixture(t, {
    maxSegmentBytes: 1024,
    maxRotatedSegments: 2,
  });

  for (let index = 1; index <= 10; index += 1) {
    await store.append(event(index, { payload: { index, padding: "x".repeat(300) } }));
  }

  const retained = await store.readEvents({ limit: 100 });
  assert.deepEqual(retained.map(({ id }) => id), [
    "event-5",
    "event-6",
    "event-7",
    "event-8",
    "event-9",
    "event-10",
  ]);

  for (const retainedPath of [filePath, `${filePath}.1`, `${filePath}.2`]) {
    assert.ok((await stat(retainedPath)).size <= 1024);
  }
  await assert.rejects(stat(`${filePath}.3`), (error) => error?.code === "ENOENT");

  const summary = await store.buildSummary();
  assert.equal(summary.total, 6);
  assert.equal(summary.retainedSegmentCount, 3);
  assert.equal(summary.retention.maxSegmentBytes, 1024);
  assert.equal(summary.retention.maxRotatedSegments, 2);
  assert.equal(summary.retention.rotationsSinceStart, 4);
  assert.equal(summary.retention.summaryScansSinceStart, 1);

  await store.append(event(11, { payload: { index: 11, padding: "x".repeat(300) } }));
  await store.append(event(12, { payload: { index: 12, padding: "x".repeat(300) } }));
  assert.equal((await store.buildSummary()).retention.summaryScansSinceStart, 2);
});

test("audit store serializes concurrent appends without losing events", async (t) => {
  const { store } = await createFixture(t, { maxSegmentBytes: 1024 * 1024 });
  await Promise.all(Array.from({ length: 100 }, (_, index) => store.append(event(index))));

  const retained = await store.readEvents({ limit: 100 });
  assert.deepEqual(retained.map(({ id }) => id), Array.from({ length: 100 }, (_, index) => `event-${index}`));
  assert.equal((await store.buildSummary()).total, 100);
});

test("audit store handles a large log with bounded tail reads and streaming summary", async (t) => {
  const { filePath, store } = await createFixture(t, {
    maxQueryLimit: 5,
    maxSegmentBytes: 32 * 1024 * 1024,
  });
  const handle = await open(filePath, "w");
  t.after(() => handle.close());
  const eventCount = 25_000;
  const batchSize = 500;
  for (let start = 0; start < eventCount; start += batchSize) {
    const lines = [];
    for (let index = start; index < Math.min(start + batchSize, eventCount); index += 1) {
      lines.push(JSON.stringify(event(index)));
    }
    await handle.write(`${lines.join("\n")}\n`);
  }
  await handle.sync();

  const latest = await store.readEvents({ limit: Number.NaN });
  assert.deepEqual(latest.map(({ id }) => id), [
    "event-24995",
    "event-24996",
    "event-24997",
    "event-24998",
    "event-24999",
  ]);

  const summary = await store.buildSummary();
  assert.equal(summary.total, eventCount);
  assert.equal(summary.malformed, 0);
  assert.equal(summary.maxQueryLimit, 5);
  assert.ok(summary.retainedBytes > 1024 * 1024);
  assert.equal(summary.retention.summaryScansSinceStart, 1);
  assert.equal((await store.buildSummary()).retention.summaryScansSinceStart, 1);
});

test("audit store preserves an oversized legacy segment on first rotation", async (t) => {
  const { filePath, store } = await createFixture(t, {
    maxSegmentBytes: 1024,
    maxRotatedSegments: 2,
  });
  const legacyEvents = Array.from({ length: 20 }, (_, index) => event(index + 1));
  await writeFile(filePath, `${legacyEvents.map(JSON.stringify).join("\n")}\n`, "utf8");
  const legacySize = (await stat(filePath)).size;
  assert.ok(legacySize > 1024);

  await store.append(event(21));

  assert.equal((await stat(`${filePath}.1`)).size, legacySize);
  assert.ok((await stat(filePath)).size < 1024);
  const summary = await store.buildSummary();
  assert.equal(summary.total, 21);
  assert.equal(summary.oversizedSegmentCount, 1);
  assert.deepEqual((await store.readEvents({ limit: 2 })).map(({ id }) => id), ["event-20", "event-21"]);
});

test("audit store production module has no whole-file read path", async () => {
  const source = await readFile(new URL("../src/audit-log-store.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\breadFile(?:Sync)?\s*\(/u);
  assert.match(source, /createReadStream/u);
  assert.match(source, /handle\.read\(/u);
});

test("audit summary treats special event keys as data", async (t) => {
  const { store } = await createFixture(t);
  await store.append(event(1, { type: "__proto__", source: "constructor" }));
  const summary = await store.buildSummary();
  assert.equal(summary.byType.__proto__, 1);
  assert.equal(summary.bySource.constructor, 1);
});
