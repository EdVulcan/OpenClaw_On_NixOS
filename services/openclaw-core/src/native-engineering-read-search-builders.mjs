import { readdirSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

export const NATIVE_ENGINEERING_READ_SEARCH_REGISTRY = "openclaw-native-engineering-read-search-v0";

const DEFAULT_MAX_FILE_SIZE_BYTES = 128 * 1024;
const MAX_FILE_SIZE_BYTES = 512 * 1024;
const DEFAULT_MAX_OUTPUT_CHARS = 12_000;
const MAX_OUTPUT_CHARS = 24_000;
const DEFAULT_MAX_RESULTS = 50;
const MAX_RESULTS = 200;
const MAX_FILES_SCANNED = 5_000;
const MAX_LINE_SPAN = 2_000;
const LINE_PREVIEW_CHARS = 240;
const SKIPPED_DIRECTORY_NAMES = new Set([
  ".cache",
  ".git",
  ".next",
  ".openclaw",
  ".serena",
  ".turbo",
  ".vite",
  "__generated__",
  "build",
  "cache",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "out",
  "target",
  "vendor",
]);

function normalisePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function safeRealpath(filePath) {
  try {
    return realpathSync(filePath);
  } catch {
    return null;
  }
}

function isInsidePath(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function normaliseRelativePath(value, fieldName = "relativePath") {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
  const raw = value.trim().replaceAll("\\", "/");
  if (raw.includes("\0") || path.isAbsolute(raw) || raw.startsWith("/")) {
    throw new Error(`${fieldName} must be a workspace-relative path.`);
  }
  const normalised = path.posix.normalize(raw).replace(/^\.\//u, "");
  if (normalised === "." || normalised === ".." || normalised.startsWith("../") || normalised.includes("/../")) {
    throw new Error(`${fieldName} must stay inside the selected workspace.`);
  }
  if (hasSkippedDirectorySegment(normalised)) {
    throw new Error(`${fieldName} is blocked by the hidden/generated/cache directory policy.`);
  }
  return normalised;
}

function normaliseGlobPattern(value) {
  const raw = typeof value === "string" && value.trim() ? value.trim().replaceAll("\\", "/") : "**/*";
  if (raw.includes("\0") || path.isAbsolute(raw) || raw.startsWith("/")) {
    throw new Error("glob pattern must be workspace-relative.");
  }
  const pattern = raw.replace(/^\.\//u, "");
  if (pattern.split("/").includes("..")) {
    throw new Error("glob pattern must stay inside the selected workspace.");
  }
  return pattern || "**/*";
}

function shouldSkipDirectoryName(name) {
  const lower = name.toLowerCase();
  return name.startsWith(".")
    || SKIPPED_DIRECTORY_NAMES.has(lower)
    || lower.includes("cache")
    || lower.includes("generated");
}

function hasSkippedPathSegment(relativePath) {
  return relativePath
    .split("/")
    .filter(Boolean)
    .some((segment) => shouldSkipDirectoryName(segment));
}

function hasSkippedDirectorySegment(relativePath) {
  return relativePath
    .split("/")
    .filter(Boolean)
    .slice(0, -1)
    .some((segment) => shouldSkipDirectoryName(segment));
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
}

function globToRegExp(pattern) {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];
    const afterNext = pattern[index + 2];
    if (char === "*" && next === "*" && afterNext === "/") {
      source += "(?:.*/)?";
      index += 2;
    } else if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(char);
    }
  }
  source += "$";
  return new RegExp(source, "u");
}

function looksBinary(buffer) {
  if (buffer.includes(0)) {
    return true;
  }
  const sampleSize = Math.min(buffer.length, 4096);
  let controlBytes = 0;
  for (let index = 0; index < sampleSize; index += 1) {
    const byte = buffer[index];
    if (byte < 7 || (byte > 13 && byte < 32)) {
      controlBytes += 1;
    }
  }
  return sampleSize > 0 && controlBytes / sampleSize > 0.3;
}

function truncateText(value, maxChars) {
  if (value.length <= maxChars) {
    return { text: value, truncated: false };
  }
  return {
    text: value.slice(0, maxChars),
    truncated: true,
  };
}

function resolveWorkspace({ selectOpenClawToolCatalogWorkspace, workspacePath }) {
  const { registry, item } = selectOpenClawToolCatalogWorkspace({ workspacePath });
  const rootPath = path.resolve(item.path);
  const rootRealPath = safeRealpath(rootPath) ?? rootPath;
  return {
    registry,
    item,
    rootPath,
    rootRealPath,
  };
}

function resolveWorkspaceFile({ rootRealPath, relativePath, safeStat }) {
  const normalised = normaliseRelativePath(relativePath);
  const absolutePath = path.resolve(rootRealPath, normalised);
  if (!isInsidePath(rootRealPath, absolutePath)) {
    throw new Error("resolved path escapes the selected workspace.");
  }
  const stats = safeStat(absolutePath);
  if (!stats?.isFile()) {
    throw new Error(`workspace file is not readable: ${normalised}`);
  }
  const realPath = safeRealpath(absolutePath);
  if (!realPath || !isInsidePath(rootRealPath, realPath)) {
    throw new Error("resolved real path escapes the selected workspace.");
  }
  return {
    relativePath: normalised,
    absolutePath,
    realPath,
    stats,
  };
}

function readBoundedTextFile(file, { maxFileSizeBytes }) {
  if (file.stats.size > maxFileSizeBytes) {
    return {
      ok: false,
      reason: "max_file_size_exceeded",
      sizeBytes: file.stats.size,
      binary: false,
      text: null,
    };
  }
  const buffer = readFileSync(file.realPath);
  if (looksBinary(buffer)) {
    return {
      ok: false,
      reason: "binary_file_skipped",
      sizeBytes: file.stats.size,
      binary: true,
      text: null,
    };
  }
  return {
    ok: true,
    reason: null,
    sizeBytes: file.stats.size,
    binary: false,
    text: buffer.toString("utf8"),
  };
}

function skippedDirectoryPolicy() {
  return {
    mode: "skip_hidden_generated_cache_dependency_directories",
    skippedDirectoryNames: [...SKIPPED_DIRECTORY_NAMES].sort(),
    hiddenDirectoryRule: "directories whose name starts with . are skipped during discovery/search and rejected for direct read",
    generatedCacheRule: "directory names containing cache or generated are skipped during discovery/search and rejected for direct read",
    symlinkRule: "symlink entries are skipped and resolved file paths must remain inside the workspace",
  };
}

function buildBounds({
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
  maxOutputChars = DEFAULT_MAX_OUTPUT_CHARS,
  maxResults = DEFAULT_MAX_RESULTS,
} = {}) {
  return {
    workspaceRootConstrained: true,
    pathTraversalProtection: true,
    maxFileSizeBytes,
    maxOutputChars,
    maxResults,
    maxFilesScanned: MAX_FILES_SCANNED,
    maxLineSpan: MAX_LINE_SPAN,
    binaryFileSkip: true,
    skippedDirectoryPolicy: skippedDirectoryPolicy(),
  };
}

function buildGovernance(operation) {
  return {
    mode: `native_engineering_${operation}_read_only`,
    runtimeOwner: "openclaw_on_nixos",
    canReadWorkspaceContent: true,
    canReadArbitrarySystemPath: false,
    canImportModule: false,
    canExecuteToolCode: false,
    canRunVerification: false,
    canStartLsp: false,
    canMutate: false,
    createsTask: false,
    createsApproval: false,
    observerVisible: true,
  };
}

function buildAuditEvidence({ operation, capabilityId, workspace, target = {}, summary = {}, bounds }) {
  return {
    operation,
    capabilityId,
    generatedAt: new Date().toISOString(),
    workspace: {
      id: workspace.id,
      name: workspace.name,
      path: workspace.path,
    },
    target,
    summary,
    bounds,
    persisted: false,
    evidenceKind: "response_embedded_audit_evidence",
  };
}

function createWalkSummary() {
  return {
    directoriesVisited: 0,
    directoriesSkipped: 0,
    filesConsidered: 0,
    symlinksSkipped: 0,
    filesScannedCapHit: false,
    skippedByReason: {},
  };
}

function incrementSkipped(summary, reason) {
  summary.skippedByReason[reason] = (summary.skippedByReason[reason] ?? 0) + 1;
}

function walkWorkspaceFiles(rootRealPath, safeStat) {
  const summary = createWalkSummary();
  const files = [];

  function visit(currentPath) {
    if (files.length >= MAX_FILES_SCANNED) {
      summary.filesScannedCapHit = true;
      return;
    }
    summary.directoriesVisited += 1;
    let entries = [];
    try {
      entries = readdirSync(currentPath, { withFileTypes: true });
    } catch {
      incrementSkipped(summary, "unreadable_directory");
      return;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootRealPath, absolutePath).replaceAll(path.sep, "/");
      if (entry.isSymbolicLink()) {
        summary.symlinksSkipped += 1;
        incrementSkipped(summary, "symlink");
        continue;
      }
      if (entry.isDirectory()) {
        if (shouldSkipDirectoryName(entry.name) || hasSkippedPathSegment(relativePath)) {
          summary.directoriesSkipped += 1;
          incrementSkipped(summary, "hidden_generated_cache_directory");
          continue;
        }
        visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        incrementSkipped(summary, "non_file");
        continue;
      }
      if (hasSkippedDirectorySegment(relativePath)) {
        incrementSkipped(summary, "hidden_generated_cache_file");
        continue;
      }
      const realPath = safeRealpath(absolutePath);
      if (!realPath || !isInsidePath(rootRealPath, realPath)) {
        incrementSkipped(summary, "realpath_outside_workspace");
        continue;
      }
      const stats = safeStat(realPath);
      if (!stats?.isFile()) {
        incrementSkipped(summary, "unreadable_file");
        continue;
      }
      files.push({
        relativePath,
        realPath,
        sizeBytes: stats.size,
      });
      summary.filesConsidered += 1;
      if (files.length >= MAX_FILES_SCANNED) {
        summary.filesScannedCapHit = true;
        return;
      }
    }
  }

  visit(rootRealPath);
  return { files, summary };
}

export function createNativeEngineeringReadSearchBuilders({
  selectOpenClawToolCatalogWorkspace,
  safeStat,
} = {}) {
  if (typeof selectOpenClawToolCatalogWorkspace !== "function") {
    throw new Error("selectOpenClawToolCatalogWorkspace is required.");
  }
  if (typeof safeStat !== "function") {
    throw new Error("safeStat is required.");
  }

  function buildNativeEngineeringReadFile({
    workspacePath = null,
    relativePath = "package.json",
    startLine = 1,
    endLine = null,
    maxOutputChars = DEFAULT_MAX_OUTPUT_CHARS,
    maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
  } = {}) {
    const workspace = resolveWorkspace({ selectOpenClawToolCatalogWorkspace, workspacePath });
    const safeMaxOutputChars = normalisePositiveInteger(maxOutputChars, DEFAULT_MAX_OUTPUT_CHARS, MAX_OUTPUT_CHARS);
    const safeMaxFileSizeBytes = normalisePositiveInteger(maxFileSizeBytes, DEFAULT_MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_BYTES);
    const bounds = buildBounds({ maxFileSizeBytes: safeMaxFileSizeBytes, maxOutputChars: safeMaxOutputChars, maxResults: 1 });
    const file = resolveWorkspaceFile({
      rootRealPath: workspace.rootRealPath,
      relativePath,
      safeStat,
    });
    const readResult = readBoundedTextFile(file, { maxFileSizeBytes: safeMaxFileSizeBytes });
    const baseTarget = {
      relativePath: file.relativePath,
      sizeBytes: file.stats.size,
      contentExposed: false,
    };
    if (!readResult.ok) {
      return {
        ok: false,
        blocked: true,
        registry: NATIVE_ENGINEERING_READ_SEARCH_REGISTRY,
        mode: "bounded-workspace-file-read",
        operation: "read",
        capability: {
          id: "sense.openclaw.engineering_tool.read",
          sourceToolName: "cc_read",
          risk: "low",
          approvalRequired: false,
        },
        workspace: {
          id: workspace.item.id,
          name: workspace.item.name,
          path: workspace.item.path,
        },
        target: {
          ...baseTarget,
          binary: readResult.binary,
          blockedReason: readResult.reason,
        },
        lines: [],
        content: "",
        summary: {
          reason: readResult.reason,
          bytesRead: 0,
          charsReturned: 0,
          lineCount: 0,
          outputTruncated: false,
        },
        bounds,
        governance: buildGovernance("read"),
        auditEvidence: buildAuditEvidence({
          operation: "read",
          capabilityId: "sense.openclaw.engineering_tool.read",
          workspace: workspace.item,
          target: baseTarget,
          summary: { reason: readResult.reason, blocked: true },
          bounds,
        }),
      };
    }
    const lines = readResult.text.split(/\r?\n/u);
    const safeStartLine = normalisePositiveInteger(startLine, 1, Math.max(lines.length, 1));
    const requestedEnd = endLine === null || endLine === undefined || endLine === ""
      ? Math.min(lines.length, safeStartLine + MAX_LINE_SPAN - 1)
      : normalisePositiveInteger(endLine, safeStartLine, lines.length);
    const safeEndLine = Math.max(safeStartLine, Math.min(requestedEnd, safeStartLine + MAX_LINE_SPAN - 1, lines.length));
    const selected = lines.slice(safeStartLine - 1, safeEndLine).map((text, index) => ({
      lineNumber: safeStartLine + index,
      text,
    }));
    const joinedContent = selected.map((line) => line.text).join("\n");
    const truncated = truncateText(joinedContent, safeMaxOutputChars);

    const summary = {
      bytesRead: readResult.sizeBytes,
      totalLines: lines.length,
      startLine: safeStartLine,
      endLine: safeEndLine,
      lineCount: selected.length,
      charsReturned: truncated.text.length,
      outputTruncated: truncated.truncated,
      blocked: false,
    };

    return {
      ok: true,
      blocked: false,
      registry: NATIVE_ENGINEERING_READ_SEARCH_REGISTRY,
      mode: "bounded-workspace-file-read",
      operation: "read",
      capability: {
        id: "sense.openclaw.engineering_tool.read",
        sourceToolName: "cc_read",
        risk: "low",
        approvalRequired: false,
      },
      workspace: {
        id: workspace.item.id,
        name: workspace.item.name,
        path: workspace.item.path,
      },
      target: {
        ...baseTarget,
        binary: false,
        contentExposed: true,
      },
      lines: truncated.truncated ? [] : selected,
      content: truncated.text,
      summary,
      bounds,
      governance: buildGovernance("read"),
      auditEvidence: buildAuditEvidence({
        operation: "read",
        capabilityId: "sense.openclaw.engineering_tool.read",
        workspace: workspace.item,
        target: { ...baseTarget, startLine: safeStartLine, endLine: safeEndLine },
        summary,
        bounds,
      }),
    };
  }

  function buildNativeEngineeringGlob({
    workspacePath = null,
    pattern = "**/*",
    limit = DEFAULT_MAX_RESULTS,
  } = {}) {
    const workspace = resolveWorkspace({ selectOpenClawToolCatalogWorkspace, workspacePath });
    const safePattern = normaliseGlobPattern(pattern);
    const safeLimit = normalisePositiveInteger(limit, DEFAULT_MAX_RESULTS, MAX_RESULTS);
    const matcher = globToRegExp(safePattern);
    const bounds = buildBounds({ maxResults: safeLimit });
    const walk = walkWorkspaceFiles(workspace.rootRealPath, safeStat);
    const matches = [];
    for (const file of walk.files) {
      if (!matcher.test(file.relativePath)) {
        continue;
      }
      if (matches.length >= safeLimit) {
        break;
      }
      matches.push({
        relativePath: file.relativePath,
        sizeBytes: file.sizeBytes,
        contentRead: false,
        contentExposed: false,
      });
    }
    const truncated = walk.files.filter((file) => matcher.test(file.relativePath)).length > matches.length;
    const summary = {
      pattern: safePattern,
      matchedResults: matches.length,
      resultLimit: safeLimit,
      resultsTruncated: truncated,
      contentRead: false,
      ...walk.summary,
    };
    return {
      ok: true,
      registry: NATIVE_ENGINEERING_READ_SEARCH_REGISTRY,
      mode: "bounded-workspace-file-discovery",
      operation: "glob",
      capability: {
        id: "sense.openclaw.engineering_tool.glob",
        sourceToolName: "cc_glob",
        risk: "low",
        approvalRequired: false,
      },
      workspace: {
        id: workspace.item.id,
        name: workspace.item.name,
        path: workspace.item.path,
      },
      query: {
        pattern: safePattern,
        limit: safeLimit,
      },
      matches,
      summary,
      bounds,
      governance: buildGovernance("glob"),
      auditEvidence: buildAuditEvidence({
        operation: "glob",
        capabilityId: "sense.openclaw.engineering_tool.glob",
        workspace: workspace.item,
        target: { pattern: safePattern },
        summary,
        bounds,
      }),
    };
  }

  function buildNativeEngineeringGrep({
    workspacePath = null,
    query = null,
    literal = true,
    caseSensitive = false,
    include = "**/*",
    limit = DEFAULT_MAX_RESULTS,
    maxOutputChars = DEFAULT_MAX_OUTPUT_CHARS,
    maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
  } = {}) {
    const workspace = resolveWorkspace({ selectOpenClawToolCatalogWorkspace, workspacePath });
    const safeQuery = typeof query === "string" && query.length > 0 ? query : "openclaw";
    const safeInclude = normaliseGlobPattern(include);
    const safeLimit = normalisePositiveInteger(limit, DEFAULT_MAX_RESULTS, MAX_RESULTS);
    const safeMaxOutputChars = normalisePositiveInteger(maxOutputChars, DEFAULT_MAX_OUTPUT_CHARS, MAX_OUTPUT_CHARS);
    const safeMaxFileSizeBytes = normalisePositiveInteger(maxFileSizeBytes, DEFAULT_MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_BYTES);
    const useLiteral = literal === true || literal === "true" || literal === "1" || literal === "yes";
    const useCaseSensitive = caseSensitive === true || caseSensitive === "true" || caseSensitive === "1" || caseSensitive === "yes";
    const includeMatcher = globToRegExp(safeInclude);
    const regex = useLiteral
      ? null
      : new RegExp(safeQuery, useCaseSensitive ? "u" : "iu");
    const literalNeedle = useCaseSensitive ? safeQuery : safeQuery.toLowerCase();
    const bounds = buildBounds({
      maxFileSizeBytes: safeMaxFileSizeBytes,
      maxOutputChars: safeMaxOutputChars,
      maxResults: safeLimit,
    });
    const walk = walkWorkspaceFiles(workspace.rootRealPath, safeStat);
    const matches = [];
    let filesRead = 0;
    let filesSkippedBySize = 0;
    let binaryFilesSkipped = 0;
    let outputChars = 0;

    for (const file of walk.files) {
      if (matches.length >= safeLimit || outputChars >= safeMaxOutputChars) {
        break;
      }
      if (!includeMatcher.test(file.relativePath)) {
        continue;
      }
      const textResult = readBoundedTextFile({
        realPath: file.realPath,
        stats: { size: file.sizeBytes },
      }, { maxFileSizeBytes: safeMaxFileSizeBytes });
      if (!textResult.ok) {
        if (textResult.reason === "max_file_size_exceeded") {
          filesSkippedBySize += 1;
        }
        if (textResult.reason === "binary_file_skipped") {
          binaryFilesSkipped += 1;
        }
        continue;
      }
      filesRead += 1;
      const lines = textResult.text.split(/\r?\n/u);
      for (let index = 0; index < lines.length; index += 1) {
        if (matches.length >= safeLimit || outputChars >= safeMaxOutputChars) {
          break;
        }
        const line = lines[index];
        const haystack = useCaseSensitive ? line : line.toLowerCase();
        const matched = useLiteral ? haystack.includes(literalNeedle) : regex.test(line);
        if (!matched) {
          continue;
        }
        const preview = truncateText(line, LINE_PREVIEW_CHARS);
        const remainingChars = Math.max(0, safeMaxOutputChars - outputChars);
        const boundedPreview = truncateText(preview.text, remainingChars);
        outputChars += boundedPreview.text.length;
        matches.push({
          relativePath: file.relativePath,
          lineNumber: index + 1,
          text: boundedPreview.text,
          textTruncated: preview.truncated || boundedPreview.truncated,
          contentExposed: true,
        });
      }
    }

    const summary = {
      query: safeQuery,
      include: safeInclude,
      literal: useLiteral,
      caseSensitive: useCaseSensitive,
      matchedResults: matches.length,
      resultLimit: safeLimit,
      outputChars,
      maxOutputChars: safeMaxOutputChars,
      resultsTruncated: matches.length >= safeLimit || outputChars >= safeMaxOutputChars,
      filesRead,
      filesSkippedBySize,
      binaryFilesSkipped,
      ...walk.summary,
    };

    return {
      ok: true,
      registry: NATIVE_ENGINEERING_READ_SEARCH_REGISTRY,
      mode: "bounded-workspace-text-search",
      operation: "grep",
      capability: {
        id: "sense.openclaw.engineering_tool.grep",
        sourceToolName: "cc_grep",
        risk: "low",
        approvalRequired: false,
      },
      workspace: {
        id: workspace.item.id,
        name: workspace.item.name,
        path: workspace.item.path,
      },
      query: {
        text: safeQuery,
        include: safeInclude,
        literal: useLiteral,
        caseSensitive: useCaseSensitive,
        limit: safeLimit,
      },
      matches,
      summary,
      bounds,
      governance: buildGovernance("grep"),
      auditEvidence: buildAuditEvidence({
        operation: "grep",
        capabilityId: "sense.openclaw.engineering_tool.grep",
        workspace: workspace.item,
        target: { query: safeQuery, include: safeInclude },
        summary,
        bounds,
      }),
    };
  }

  return {
    buildNativeEngineeringReadFile,
    buildNativeEngineeringGlob,
    buildNativeEngineeringGrep,
  };
}
