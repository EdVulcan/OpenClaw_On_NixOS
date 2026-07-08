import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export function createSystemFileOperations({
  allowedRoots = [],
  maxFileListLimit = 100,
  maxSearchLimit = 100,
  maxSearchDepth = 4,
  maxFileReadBytes = 65536,
  maxFileWriteBytes = 65536,
} = {}) {
function normaliseForBoundary(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function resolveAllowedPath(inputPath = null) {
  const rawPath = typeof inputPath === "string" && inputPath.trim()
    ? inputPath.trim()
    : allowedRoots[0];
  const candidate = path.resolve(rawPath);
  const normalisedCandidate = normaliseForBoundary(candidate);
  const root = allowedRoots.find((allowedRoot) => {
    const normalisedRoot = normaliseForBoundary(allowedRoot);
    return normalisedCandidate === normalisedRoot
      || normalisedCandidate.startsWith(`${normalisedRoot}${path.sep}`);
  });

  if (!root) {
    const error = new Error("Path is outside allowed OpenClaw system-sense roots.");
    error.code = "PATH_OUTSIDE_ALLOWED_ROOTS";
    error.details = { path: candidate, allowedRoots };
    throw error;
  }

  return {
    requestedPath: rawPath,
    path: candidate,
    root,
  };
}

function classifyFile(stats) {
  if (stats.isDirectory()) {
    return "directory";
  }
  if (stats.isFile()) {
    return "file";
  }
  if (stats.isSymbolicLink()) {
    return "symlink";
  }
  return "other";
}

function buildFileMetadata(filePath) {
  const stats = statSync(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    type: classifyFile(stats),
    sizeBytes: stats.size,
    mode: stats.mode,
    modifiedAt: stats.mtime.toISOString(),
    createdAt: stats.birthtime.toISOString(),
    readable: true,
  };
}

function listFiles(inputPath, limit) {
  const resolved = resolveAllowedPath(inputPath);
  if (!existsSync(resolved.path)) {
    const error = new Error("Path does not exist.");
    error.code = "PATH_NOT_FOUND";
    throw error;
  }

  const metadata = buildFileMetadata(resolved.path);
  if (metadata.type !== "directory") {
    return {
      ...resolved,
      directory: metadata,
      entries: [metadata],
      count: 1,
    };
  }

  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? limit : 50, maxFileListLimit));
  const entries = readdirSync(resolved.path)
    .slice(0, safeLimit)
    .map((entryName) => {
      const entryPath = path.join(resolved.path, entryName);
      try {
        return buildFileMetadata(entryPath);
      } catch {
        return {
          path: entryPath,
          name: entryName,
          type: "unreadable",
          readable: false,
        };
      }
    })
    .sort((left, right) => String(left.type).localeCompare(String(right.type)) || left.name.localeCompare(right.name));

  return {
    ...resolved,
    directory: metadata,
    entries,
    count: entries.length,
    limit: safeLimit,
  };
}

function searchFiles(inputPath, query, limit) {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("Search query is required.");
  }

  const resolved = resolveAllowedPath(inputPath);
  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? limit : 50, maxSearchLimit));
  const needle = query.trim().toLowerCase();
  const results = [];

  function visit(currentPath, depth) {
    if (results.length >= safeLimit || depth > maxSearchDepth) {
      return;
    }

    let stats;
    try {
      stats = statSync(currentPath);
    } catch {
      return;
    }

    const name = path.basename(currentPath);
    if (name.toLowerCase().includes(needle)) {
      results.push(buildFileMetadata(currentPath));
      if (results.length >= safeLimit) {
        return;
      }
    }

    if (!stats.isDirectory()) {
      return;
    }

    for (const entryName of readdirSync(currentPath)) {
      visit(path.join(currentPath, entryName), depth + 1);
      if (results.length >= safeLimit) {
        return;
      }
    }
  }

  visit(resolved.path, 0);
  return {
    ...resolved,
    query: query.trim(),
    results,
    count: results.length,
    limit: safeLimit,
    maxDepth: maxSearchDepth,
  };
}

function readTextFile(inputPath) {
  const resolved = resolveAllowedPath(inputPath);
  if (!existsSync(resolved.path)) {
    const error = new Error("Path does not exist.");
    error.code = "PATH_NOT_FOUND";
    throw error;
  }

  const metadata = buildFileMetadata(resolved.path);
  if (metadata.type !== "file") {
    const error = new Error("Text reads require a regular file.");
    error.code = "TARGET_NOT_FILE";
    error.details = { path: resolved.path, type: metadata.type };
    throw error;
  }
  if (metadata.sizeBytes > maxFileReadBytes) {
    const error = new Error("Text read exceeds OpenClaw file read limit.");
    error.code = "FILE_READ_LIMIT_EXCEEDED";
    error.details = { sizeBytes: metadata.sizeBytes, maxFileReadBytes };
    throw error;
  }

  const content = readFileSync(resolved.path, "utf8");
  return {
    ...resolved,
    mode: "read_text",
    encoding: "utf8",
    content,
    contentBytes: Buffer.byteLength(content, "utf8"),
    metadata,
  };
}

function writeTextFile(body = {}) {
  const targetPath = typeof body.path === "string" && body.path.trim()
    ? body.path.trim()
    : null;
  if (!targetPath) {
    const error = new Error("File path is required for write-text.");
    error.code = "FILE_PATH_REQUIRED";
    throw error;
  }

  const content = typeof body.content === "string" ? body.content : "";
  const encoding = typeof body.encoding === "string" && body.encoding.trim() ? body.encoding.trim() : "utf8";
  if (encoding !== "utf8") {
    const error = new Error("Only utf8 text writes are supported.");
    error.code = "UNSUPPORTED_ENCODING";
    throw error;
  }

  const contentBytes = Buffer.byteLength(content, "utf8");
  if (contentBytes > maxFileWriteBytes) {
    const error = new Error("Text write exceeds OpenClaw file write limit.");
    error.code = "FILE_WRITE_LIMIT_EXCEEDED";
    error.details = { contentBytes, maxFileWriteBytes };
    throw error;
  }

  const resolved = resolveAllowedPath(targetPath);
  const parentPath = path.dirname(resolved.path);
  // H-4 note: This call intentionally discards the return value. Its purpose
  // is boundary validation only; it throws if parentPath falls outside the
  // allowed roots. On NixOS the path check is correct and complete.
  resolveAllowedPath(parentPath);
  if (!existsSync(parentPath) || !statSync(parentPath).isDirectory()) {
    const error = new Error("Parent directory must exist inside allowed roots.");
    error.code = "PARENT_DIRECTORY_NOT_FOUND";
    error.details = { parentPath };
    throw error;
  }

  const existedBefore = existsSync(resolved.path);
  if (existedBefore && statSync(resolved.path).isDirectory()) {
    const error = new Error("Cannot write text over a directory.");
    error.code = "TARGET_IS_DIRECTORY";
    throw error;
  }
  if (existedBefore && body.overwrite === false) {
    const error = new Error("Target file exists and overwrite is disabled.");
    error.code = "TARGET_EXISTS";
    throw error;
  }

  writeFileSync(resolved.path, content, { encoding });
  const metadata = buildFileMetadata(resolved.path);
  return {
    ...resolved,
    mode: "write_text",
    contentBytes,
    encoding,
    overwrite: existedBefore,
    metadata,
  };
}

function appendTextFile(body = {}) {
  const targetPath = typeof body.path === "string" && body.path.trim()
    ? body.path.trim()
    : null;
  if (!targetPath) {
    const error = new Error("File path is required for append-text.");
    error.code = "FILE_PATH_REQUIRED";
    throw error;
  }

  const content = typeof body.content === "string" ? body.content : "";
  const encoding = typeof body.encoding === "string" && body.encoding.trim() ? body.encoding.trim() : "utf8";
  if (encoding !== "utf8") {
    const error = new Error("Only utf8 text appends are supported.");
    error.code = "UNSUPPORTED_ENCODING";
    throw error;
  }

  const contentBytes = Buffer.byteLength(content, "utf8");
  const resolved = resolveAllowedPath(targetPath);
  const createIfMissing = body.createIfMissing === true;
  if (!existsSync(resolved.path)) {
    if (!createIfMissing) {
      const error = new Error("Target file must exist for append-text.");
      error.code = "TARGET_NOT_FOUND";
      throw error;
    }
    const parentPath = path.dirname(resolved.path);
    resolveAllowedPath(parentPath);
    if (!existsSync(parentPath) || !statSync(parentPath).isDirectory()) {
      const error = new Error("Parent directory must exist inside allowed roots.");
      error.code = "PARENT_DIRECTORY_NOT_FOUND";
      error.details = { parentPath };
      throw error;
    }
  }

  const existedBefore = existsSync(resolved.path);
  const existingStats = existedBefore ? statSync(resolved.path) : null;
  if (existingStats && !existingStats.isFile()) {
    const error = new Error("Cannot append text to a non-file target.");
    error.code = "TARGET_NOT_FILE";
    throw error;
  }

  const previousBytes = existingStats?.size ?? 0;
  const totalBytes = previousBytes + contentBytes;
  if (totalBytes > maxFileWriteBytes) {
    const error = new Error("Text append exceeds OpenClaw file write limit.");
    error.code = "FILE_WRITE_LIMIT_EXCEEDED";
    error.details = { previousBytes, contentBytes, totalBytes, maxFileWriteBytes };
    throw error;
  }

  appendFileSync(resolved.path, content, { encoding });
  const metadata = buildFileMetadata(resolved.path);
  return {
    ...resolved,
    mode: "append_text",
    contentBytes,
    previousBytes,
    totalBytes,
    encoding,
    created: !existedBefore,
    createIfMissing,
    metadata,
  };
}

function createDirectory(body = {}) {
  const targetPath = typeof body.path === "string" && body.path.trim()
    ? body.path.trim()
    : null;
  if (!targetPath) {
    const error = new Error("Directory path is required.");
    error.code = "DIRECTORY_PATH_REQUIRED";
    throw error;
  }

  const resolved = resolveAllowedPath(targetPath);
  const recursive = body.recursive === true;
  const parentPath = path.dirname(resolved.path);
  resolveAllowedPath(parentPath);
  if (!recursive && (!existsSync(parentPath) || !statSync(parentPath).isDirectory())) {
    const error = new Error("Parent directory must exist inside allowed roots.");
    error.code = "PARENT_DIRECTORY_NOT_FOUND";
    error.details = { parentPath };
    throw error;
  }

  const existedBefore = existsSync(resolved.path);
  if (existedBefore && !statSync(resolved.path).isDirectory()) {
    const error = new Error("Target path exists and is not a directory.");
    error.code = "TARGET_NOT_DIRECTORY";
    throw error;
  }

  mkdirSync(resolved.path, { recursive });
  const metadata = buildFileMetadata(resolved.path);
  return {
    ...resolved,
    mode: "mkdir",
    recursive,
    created: !existedBefore,
    metadata,
  };
}


  return {
    resolveAllowedPath,
    buildFileMetadata,
    listFiles,
    searchFiles,
    readTextFile,
    writeTextFile,
    appendTextFile,
    createDirectory,
  };
}
