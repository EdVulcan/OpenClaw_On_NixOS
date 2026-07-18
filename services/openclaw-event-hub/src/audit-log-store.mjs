import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

export const DEFAULT_AUDIT_MAX_SEGMENT_BYTES = 64 * 1024 * 1024;
export const DEFAULT_AUDIT_MAX_ROTATED_SEGMENTS = 8;

function boundedInteger(value, fallback, { min, max }) {
  const parsed = Number.parseInt(String(value), 10);
  const candidate = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(candidate, max));
}

function safeParseAuditLine(line) {
  if (!line.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(line);
    if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function createSummaryAggregate() {
  return {
    total: 0,
    malformed: 0,
    byType: new Map(),
    bySource: new Map(),
    earliestTimestamp: null,
    latestTimestamp: null,
    retainedSegmentCount: 0,
    retainedBytes: 0,
    oversizedSegmentCount: 0,
  };
}

function addEventToSummary(aggregate, event) {
  aggregate.total += 1;
  aggregate.byType.set(event.type, (aggregate.byType.get(event.type) ?? 0) + 1);
  aggregate.bySource.set(event.source, (aggregate.bySource.get(event.source) ?? 0) + 1);
  if (typeof event.timestamp === "string" && event.timestamp) {
    aggregate.earliestTimestamp = aggregate.earliestTimestamp ?? event.timestamp;
    aggregate.latestTimestamp = aggregate.latestTimestamp === null || event.timestamp > aggregate.latestTimestamp
      ? event.timestamp
      : aggregate.latestTimestamp;
  }
}

async function closeSnapshots(snapshots) {
  await Promise.allSettled(snapshots.map(({ handle }) => handle.close()));
}

async function* readSnapshotLinesForward(snapshot) {
  if (snapshot.size === 0) {
    return;
  }

  const input = createReadStream(snapshot.filePath, {
    fd: snapshot.handle.fd,
    autoClose: false,
    encoding: "utf8",
    start: 0,
    end: snapshot.size - 1,
  });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    yield line;
  }
}

async function* readSnapshotLinesReverse(snapshot, chunkBytes) {
  let position = snapshot.size;
  let carry = Buffer.alloc(0);

  while (position > 0) {
    const readLength = Math.min(chunkBytes, position);
    position -= readLength;
    const buffer = Buffer.allocUnsafe(readLength);
    const { bytesRead } = await snapshot.handle.read(buffer, 0, readLength, position);
    const chunk = buffer.subarray(0, bytesRead);
    const combined = carry.length > 0 ? Buffer.concat([chunk, carry]) : chunk;
    let lineEnd = combined.length;

    for (let index = combined.length - 1; index >= 0; index -= 1) {
      if (combined[index] !== 0x0a) {
        continue;
      }
      let line = combined.subarray(index + 1, lineEnd);
      if (line.length > 0 && line[line.length - 1] === 0x0d) {
        line = line.subarray(0, line.length - 1);
      }
      yield line.toString("utf8");
      lineEnd = index;
    }

    carry = Buffer.from(combined.subarray(0, lineEnd));
  }

  if (carry.length > 0) {
    if (carry[carry.length - 1] === 0x0d) {
      carry = carry.subarray(0, carry.length - 1);
    }
    yield carry.toString("utf8");
  }
}

export function createAuditLogStore({
  filePath,
  maxQueryLimit = 1000,
  maxSegmentBytes = DEFAULT_AUDIT_MAX_SEGMENT_BYTES,
  maxRotatedSegments = DEFAULT_AUDIT_MAX_ROTATED_SEGMENTS,
  readChunkBytes = 64 * 1024,
} = {}) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    throw new Error("audit log filePath is required");
  }

  const resolvedFilePath = path.resolve(filePath);
  const queryLimit = boundedInteger(maxQueryLimit, 1000, { min: 1, max: 100_000 });
  const segmentByteLimit = boundedInteger(maxSegmentBytes, DEFAULT_AUDIT_MAX_SEGMENT_BYTES, {
    min: 1024,
    max: 1024 * 1024 * 1024,
  });
  const rotatedSegmentLimit = boundedInteger(maxRotatedSegments, DEFAULT_AUDIT_MAX_ROTATED_SEGMENTS, {
    min: 0,
    max: 128,
  });
  const chunkByteLimit = boundedInteger(readChunkBytes, 64 * 1024, { min: 256, max: 1024 * 1024 });

  let ready = false;
  let readyPromise = null;
  let exclusiveQueue = Promise.resolve();
  let rotationsSinceStart = 0;
  let mutationVersion = 0;
  let summaryCache = null;
  let summaryBuildPromise = null;
  let summaryScansSinceStart = 0;

  function runExclusive(operation) {
    const result = exclusiveQueue.then(operation);
    exclusiveQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  async function ensureReady() {
    if (ready) {
      return;
    }
    if (!readyPromise) {
      readyPromise = (async () => {
        await fs.mkdir(path.dirname(resolvedFilePath), { recursive: true });
        try {
          await fs.access(resolvedFilePath);
        } catch {
          await fs.writeFile(resolvedFilePath, "", "utf8");
        }
        ready = true;
      })();
    }
    try {
      await readyPromise;
    } catch (error) {
      readyPromise = null;
      throw error;
    }
  }

  function rotatedPath(index) {
    return `${resolvedFilePath}.${index}`;
  }

  function segmentPaths({ newestFirst }) {
    const rotated = Array.from(
      { length: rotatedSegmentLimit },
      (_, index) => rotatedPath(index + 1),
    );
    return newestFirst
      ? [resolvedFilePath, ...rotated]
      : [...rotated.reverse(), resolvedFilePath];
  }

  async function openSegmentSnapshots({ newestFirst }) {
    await ensureReady();
    return runExclusive(async () => {
      const snapshots = [];
      try {
        for (const candidatePath of segmentPaths({ newestFirst })) {
          try {
            const handle = await fs.open(candidatePath, "r");
            const stat = await handle.stat();
            if (!stat.isFile()) {
              await handle.close();
              continue;
            }
            snapshots.push({ filePath: candidatePath, handle, size: stat.size });
          } catch (error) {
            if (error?.code !== "ENOENT") {
              throw error;
            }
          }
        }
        return snapshots;
      } catch (error) {
        await closeSnapshots(snapshots);
        throw error;
      }
    });
  }

  async function rotateBeforeAppend(additionalBytes) {
    let currentSize = 0;
    try {
      currentSize = (await fs.stat(resolvedFilePath)).size;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }

    if (currentSize === 0 || currentSize + additionalBytes <= segmentByteLimit) {
      return { rotated: false, currentSize };
    }

    if (rotatedSegmentLimit === 0) {
      await fs.truncate(resolvedFilePath, 0);
      rotationsSinceStart += 1;
      return { rotated: true, currentSize };
    }

    await fs.rm(rotatedPath(rotatedSegmentLimit), { force: true });
    for (let index = rotatedSegmentLimit - 1; index >= 1; index -= 1) {
      try {
        await fs.rename(rotatedPath(index), rotatedPath(index + 1));
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      }
    }
    await fs.rename(resolvedFilePath, rotatedPath(1));
    rotationsSinceStart += 1;
    return { rotated: true, currentSize };
  }

  async function append(event) {
    await ensureReady();
    const line = `${JSON.stringify(event)}\n`;
    const lineBytes = Buffer.byteLength(line);
    const rotation = await runExclusive(async () => {
      const result = await rotateBeforeAppend(lineBytes);
      await fs.appendFile(resolvedFilePath, line, "utf8");
      mutationVersion += 1;
      return result;
    });
    if (summaryCache && !rotation.rotated && lineBytes <= segmentByteLimit) {
      addEventToSummary(summaryCache, event);
      summaryCache.retainedBytes += lineBytes;
      if (rotation.currentSize === 0) {
        summaryCache.retainedSegmentCount += 1;
      }
    } else {
      summaryCache = null;
    }
  }

  async function readEvents({ type = null, source = null, limit = 100 } = {}) {
    const safeLimit = boundedInteger(limit, 100, { min: 1, max: queryLimit });
    const snapshots = await openSegmentSnapshots({ newestFirst: true });
    const items = [];
    try {
      for (const snapshot of snapshots) {
        for await (const line of readSnapshotLinesReverse(snapshot, chunkByteLimit)) {
          const event = safeParseAuditLine(line);
          if (!event || (type && event.type !== type) || (source && event.source !== source)) {
            continue;
          }
          items.push(event);
          if (items.length >= safeLimit) {
            return items.reverse();
          }
        }
      }
      return items.reverse();
    } finally {
      await closeSnapshots(snapshots);
    }
  }

  async function scanSummaryAggregate() {
    const snapshots = await openSegmentSnapshots({ newestFirst: false });
    const scanMutationVersion = mutationVersion;
    const aggregate = createSummaryAggregate();
    summaryScansSinceStart += 1;

    try {
      for (const snapshot of snapshots) {
        for await (const line of readSnapshotLinesForward(snapshot)) {
          if (!line.trim()) {
            continue;
          }
          const event = safeParseAuditLine(line);
          if (!event) {
            aggregate.malformed += 1;
            continue;
          }
          addEventToSummary(aggregate, event);
        }
      }

      aggregate.retainedBytes = snapshots.reduce((sum, snapshot) => sum + snapshot.size, 0);
      aggregate.retainedSegmentCount = snapshots.filter((snapshot) => snapshot.size > 0).length;
      aggregate.oversizedSegmentCount = snapshots.filter((snapshot) => snapshot.size > segmentByteLimit).length;
      if (mutationVersion === scanMutationVersion) {
        summaryCache = aggregate;
      }
      return aggregate;
    } finally {
      await closeSnapshots(snapshots);
    }
  }

  async function summaryAggregate() {
    if (summaryCache) {
      return summaryCache;
    }
    if (!summaryBuildPromise) {
      summaryBuildPromise = scanSummaryAggregate().finally(() => {
        summaryBuildPromise = null;
      });
    }
    return summaryBuildPromise;
  }

  async function buildSummary({ recentEventCount = 0 } = {}) {
    const aggregate = await summaryAggregate();
    return {
      logFile: resolvedFilePath,
      total: aggregate.total,
      malformed: aggregate.malformed,
      byType: Object.fromEntries(aggregate.byType),
      bySource: Object.fromEntries(aggregate.bySource),
      earliestTimestamp: aggregate.earliestTimestamp,
      latestTimestamp: aggregate.latestTimestamp,
      recentEventCount,
      maxQueryLimit: queryLimit,
      retainedSegmentCount: aggregate.retainedSegmentCount,
      retainedBytes: aggregate.retainedBytes,
      oversizedSegmentCount: aggregate.oversizedSegmentCount,
      retention: retentionPolicy(),
    };
  }

  function retentionPolicy() {
    return {
      maxSegmentBytes: segmentByteLimit,
      maxRotatedSegments: rotatedSegmentLimit,
      maxRetainedSegments: rotatedSegmentLimit + 1,
      rotationsSinceStart,
      summaryScansSinceStart,
    };
  }

  return {
    filePath: resolvedFilePath,
    ensureReady,
    append,
    readEvents,
    buildSummary,
    retentionPolicy,
  };
}
