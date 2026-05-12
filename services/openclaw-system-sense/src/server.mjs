import http from "node:http";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, readdirSync, statfsSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const host = process.env.OPENCLAW_SYSTEM_SENSE_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_SYSTEM_SENSE_PORT ?? "4106", 10);
const eventHubUrl = process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101";
const stateDir = process.env.OPENCLAW_BODY_STATE_DIR ?? process.cwd();
const diskPath = process.env.OPENCLAW_SYSTEM_SENSE_DISK_PATH ?? stateDir;
const allowedRoots = (process.env.OPENCLAW_SYSTEM_ALLOWED_ROOTS ?? `${stateDir}${path.delimiter}${process.cwd()}`)
  .split(path.delimiter)
  .map((root) => root.trim())
  .filter(Boolean)
  .map((root) => path.resolve(root));
const memoryWarningPercent = Number.parseInt(process.env.OPENCLAW_SYSTEM_MEMORY_WARNING_PERCENT ?? "90", 10);
const diskWarningPercent = Number.parseInt(process.env.OPENCLAW_SYSTEM_DISK_WARNING_PERCENT ?? "90", 10);
const serviceTimeoutMs = Number.parseInt(process.env.OPENCLAW_SYSTEM_SERVICE_TIMEOUT_MS ?? "1500", 10);
const maxFileListLimit = Number.parseInt(process.env.OPENCLAW_SYSTEM_FILE_LIST_LIMIT ?? "100", 10);
const maxSearchLimit = Number.parseInt(process.env.OPENCLAW_SYSTEM_FILE_SEARCH_LIMIT ?? "100", 10);
const maxSearchDepth = Number.parseInt(process.env.OPENCLAW_SYSTEM_FILE_SEARCH_DEPTH ?? "4", 10);
const maxFileWriteBytes = Number.parseInt(process.env.OPENCLAW_SYSTEM_FILE_WRITE_LIMIT ?? "65536", 10);
const commandAllowlist = (process.env.OPENCLAW_SYSTEM_COMMAND_ALLOWLIST ?? "echo,printf,pwd,whoami,ls,cat,head,tail,wc,find,grep,rg")
  .split(",")
  .map((command) => command.trim())
  .filter(Boolean);
const commandTimeoutMs = Number.parseInt(process.env.OPENCLAW_SYSTEM_COMMAND_TIMEOUT_MS ?? "3000", 10);
const commandOutputLimit = Number.parseInt(process.env.OPENCLAW_SYSTEM_COMMAND_OUTPUT_LIMIT ?? "8192", 10);
const execFileAsync = promisify(execFile);

const serviceTargets = {
  core: process.env.OPENCLAW_CORE_URL ?? "http://127.0.0.1:4100",
  eventHub: process.env.OPENCLAW_EVENT_HUB_URL ?? "http://127.0.0.1:4101",
  sessionManager: process.env.OPENCLAW_SESSION_MANAGER_URL ?? "http://127.0.0.1:4102",
  browserRuntime: process.env.OPENCLAW_BROWSER_RUNTIME_URL ?? "http://127.0.0.1:4103",
  screenSense: process.env.OPENCLAW_SCREEN_SENSE_URL ?? "http://127.0.0.1:4104",
  screenAct: process.env.OPENCLAW_SCREEN_ACT_URL ?? "http://127.0.0.1:4105",
  systemHeal: process.env.OPENCLAW_SYSTEM_HEAL_URL ?? "http://127.0.0.1:4107",
};

const systemState = {
  timestamp: new Date().toISOString(),
  body: {},
  services: {},
  resources: {
    cpuPercent: 0,
    loadAverage: [],
    memoryPercent: 0,
    diskPercent: 0,
  },
  network: {
    online: false,
  },
  alerts: [],
};

let previousCpuSnapshot = null;

function corsHeaders(extraHeaders = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    ...extraHeaders,
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, corsHeaders({ "content-type": "application/json; charset=utf-8" }));
  res.end(JSON.stringify(payload, null, 2));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

async function publishEvent(type, payload = {}) {
  try {
    await fetch(`${eventHubUrl}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        source: "openclaw-system-sense",
        payload,
      }),
    });
  } catch (error) {
    console.error("Failed to publish system-sense event:", error);
  }
}

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

async function listProcesses({ query = "", limit = 50 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? limit : 50, 200));
  const needle = typeof query === "string" ? query.trim().toLowerCase() : "";

  if (process.platform === "win32") {
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      "Get-Process | Select-Object -First 200 Id,ProcessName,CPU,WorkingSet64 | ConvertTo-Json -Compress",
    ]);
    const rawItems = JSON.parse(stdout || "[]");
    const items = (Array.isArray(rawItems) ? rawItems : [rawItems])
      .map((item) => ({
        pid: item.Id,
        name: item.ProcessName,
        cpu: item.CPU ?? null,
        memoryBytes: item.WorkingSet64 ?? null,
        command: item.ProcessName,
      }))
      .filter((item) => !needle || String(item.name).toLowerCase().includes(needle) || String(item.command).toLowerCase().includes(needle))
      .slice(0, safeLimit);
    return { items, count: items.length, limit: safeLimit, query: needle };
  }

  const { stdout } = await execFileAsync("ps", ["-eo", "pid=,ppid=,stat=,pcpu=,pmem=,comm=,args="]);
  const items = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const [pid, ppid, state, cpuPercent, memoryPercent, name, ...commandParts] = parts;
      return {
        pid: Number.parseInt(pid, 10),
        ppid: Number.parseInt(ppid, 10),
        state,
        cpuPercent: Number.parseFloat(cpuPercent),
        memoryPercent: Number.parseFloat(memoryPercent),
        name,
        command: commandParts.join(" "),
      };
    })
    .filter((item) => Number.isFinite(item.pid))
    .filter((item) => !needle || String(item.name).toLowerCase().includes(needle) || String(item.command).toLowerCase().includes(needle))
    .slice(0, safeLimit);

  return { items, count: items.length, limit: safeLimit, query: needle };
}

function buildCommandDryRun(body) {
  const command = typeof body.command === "string" && body.command.trim() ? body.command.trim() : null;
  if (!command) {
    throw new Error("Command is required for dry-run.");
  }

  const args = Array.isArray(body.args)
    ? body.args.filter((arg) => typeof arg === "string")
    : [];
  const joined = [command, ...args].join(" ");
  const destructivePattern = /\b(rm|mkfs|dd|shutdown|reboot|poweroff|chmod|chown|mount|umount|systemctl)\b|--delete|--force|-rf/;
  const crossBoundaryPattern = /\b(curl|wget|scp|ssh|rsync|git|npm|nix|nixos-rebuild)\b/;
  const destructive = destructivePattern.test(joined);
  const crossBoundary = crossBoundaryPattern.test(joined);
  const risk = destructive ? "high" : crossBoundary ? "medium" : "low";
  const governance = destructive || crossBoundary ? "require_approval" : "audit_only";

  return {
    mode: "dry_run",
    wouldExecute: false,
    command,
    args,
    intent: typeof body.intent === "string" && body.intent.trim() ? body.intent.trim() : "system.command",
    risk,
    governance,
    requiresApproval: governance === "require_approval",
    checks: [
      {
        name: "no_execution",
        passed: true,
        detail: "system-sense only produces a dry-run plan.",
      },
      {
        name: "destructive_pattern",
        passed: !destructive,
        detail: destructive ? "Command matches a high-risk system mutation pattern." : "No high-risk mutation pattern detected.",
      },
      {
        name: "cross_boundary_pattern",
        passed: !crossBoundary,
        detail: crossBoundary ? "Command may cross local body boundaries." : "No cross-boundary pattern detected.",
      },
    ],
  };
}

function normaliseCommandArgs(args) {
  return Array.isArray(args)
    ? args.filter((arg) => typeof arg === "string")
    : [];
}

function assertCommandAllowed(command) {
  if (typeof command !== "string" || !command.trim()) {
    throw new Error("Command is required for execution.");
  }
  const trimmed = command.trim();
  if (trimmed.includes("/") || trimmed.includes("\\") || path.basename(trimmed) !== trimmed) {
    const error = new Error("Command must be an allowlisted executable name, not a path.");
    error.code = "COMMAND_PATH_NOT_ALLOWED";
    throw error;
  }
  if (!commandAllowlist.includes(trimmed)) {
    const error = new Error("Command is outside the OpenClaw system command allowlist.");
    error.code = "COMMAND_NOT_ALLOWLISTED";
    error.details = { command: trimmed, allowlist: commandAllowlist };
    throw error;
  }
  return trimmed;
}

function truncateOutput(value) {
  const text = typeof value === "string" ? value : "";
  if (text.length <= commandOutputLimit) {
    return {
      text,
      truncated: false,
      bytes: Buffer.byteLength(text),
    };
  }
  const truncatedText = text.slice(0, commandOutputLimit);
  return {
    text: truncatedText,
    truncated: true,
    bytes: Buffer.byteLength(text),
  };
}

function execFileCaptured(command, args, options) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    execFile(command, args, options, (error, stdout = "", stderr = "") => {
      const durationMs = Date.now() - startedAt;
      const stdoutResult = truncateOutput(stdout);
      const stderrResult = truncateOutput(stderr);
      resolve({
        command,
        args,
        cwd: options.cwd,
        exitCode: Number.isInteger(error?.code) ? error.code : 0,
        signal: error?.signal ?? null,
        timedOut: error?.killed === true && error?.signal === "SIGTERM",
        durationMs,
        stdout: stdoutResult.text,
        stderr: stderrResult.text,
        stdoutBytes: stdoutResult.bytes,
        stderrBytes: stderrResult.bytes,
        stdoutTruncated: stdoutResult.truncated,
        stderrTruncated: stderrResult.truncated,
        executedAt: new Date().toISOString(),
      });
    });
  });
}

async function executeCommand(body) {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    const error = new Error("Refusing to execute commands from a root system-sense process.");
    error.code = "ROOT_EXECUTION_REFUSED";
    throw error;
  }

  const command = assertCommandAllowed(body.command);
  const args = normaliseCommandArgs(body.args);
  const cwdResult = resolveAllowedPath(body.cwd ?? body.workingDirectory ?? allowedRoots[0]);
  const dryRun = buildCommandDryRun({
    command,
    args,
    intent: typeof body.intent === "string" && body.intent.trim() ? body.intent.trim() : "system.command.execute",
  });
  const timeoutMs = Math.max(100, Math.min(
    Number.isFinite(body.timeoutMs) ? Number.parseInt(body.timeoutMs, 10) : commandTimeoutMs,
    commandTimeoutMs,
  ));

  const result = await execFileCaptured(command, args, {
    cwd: cwdResult.path,
    timeout: timeoutMs,
    maxBuffer: Math.max(commandOutputLimit * 2, 1024),
    windowsHide: true,
  });

  return {
    mode: "execute",
    wouldExecute: true,
    command,
    args,
    cwd: cwdResult.path,
    allowedRoot: cwdResult.root,
    allowlist: commandAllowlist,
    timeoutMs,
    risk: dryRun.risk,
    governance: "audit_only",
    checks: [
      {
        name: "allowlisted_command",
        passed: true,
        detail: `${command} is allowlisted for controlled body-internal execution.`,
      },
      {
        name: "allowed_working_directory",
        passed: true,
        detail: "Command working directory is inside allowed OpenClaw body roots.",
      },
      {
        name: "non_root_process",
        passed: true,
        detail: "Command executor is not running as root.",
      },
    ],
    result,
  };
}

function readCpuSnapshot() {
  const cpus = os.cpus();
  const totals = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
    return {
      idle: acc.idle + cpu.times.idle,
      total: acc.total + total,
    };
  }, { idle: 0, total: 0 });
  return {
    ...totals,
    cores: cpus.length,
  };
}

function readCpuPercent() {
  const current = readCpuSnapshot();
  if (!previousCpuSnapshot) {
    previousCpuSnapshot = current;
    return 0;
  }

  const idleDelta = current.idle - previousCpuSnapshot.idle;
  const totalDelta = current.total - previousCpuSnapshot.total;
  previousCpuSnapshot = current;
  if (totalDelta <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100)));
}

function readDiskPercent() {
  try {
    const stats = statfsSync(diskPath);
    const total = Number(stats.blocks) * Number(stats.bsize);
    const available = Number(stats.bavail) * Number(stats.bsize);
    if (total <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(((total - available) / total) * 100)));
  } catch {
    return null;
  }
}

function buildBodyState() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    uptimeSeconds: Math.round(os.uptime()),
    processUptimeSeconds: Math.round(process.uptime()),
    pid: process.pid,
    node: process.version,
    stateDir,
    diskPath,
  };
}

function buildResourceState() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryPercent = totalMemory > 0
    ? Math.max(0, Math.min(100, Math.round(((totalMemory - freeMemory) / totalMemory) * 100)))
    : 0;
  const cpuSnapshot = readCpuSnapshot();
  const diskPercent = readDiskPercent();

  return {
    cpuPercent: readCpuPercent(),
    cpuCores: cpuSnapshot.cores,
    loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
    memoryPercent,
    memory: {
      totalBytes: totalMemory,
      freeBytes: freeMemory,
      usedBytes: Math.max(0, totalMemory - freeMemory),
    },
    diskPercent: diskPercent ?? 0,
    disk: {
      path: diskPath,
      available: diskPercent !== null,
    },
  };
}

async function checkService(name, baseUrl) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serviceTimeoutMs);
  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    return {
      name,
      ok: response.ok && !!data?.ok,
      status: response.ok && !!data?.ok ? "healthy" : "unhealthy",
      url: baseUrl,
      detail: data?.service ?? name,
      stage: data?.stage ?? null,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      name,
      ok: false,
      status: "offline",
      url: baseUrl,
      detail: "offline",
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshSystemState() {
  const entries = await Promise.all(
    Object.entries(serviceTargets).map(async ([name, url]) => [name, await checkService(name, url)]),
  );

  const services = Object.fromEntries(entries);
  const alerts = Object.values(services)
    .filter((service) => !service.ok)
    .map((service) => ({
      id: `alert-${randomUUID()}`,
      level: "warning",
      code: "service.offline",
      source: service.name,
      message: `${service.name} is offline`,
    }));
  const resources = buildResourceState();

  if (resources.memoryPercent >= memoryWarningPercent) {
    alerts.push({
      id: `alert-${randomUUID()}`,
      level: "warning",
      code: "resource.memory.high",
      source: "openclaw-system-sense",
      message: `Memory usage is ${resources.memoryPercent}%`,
    });
  }

  if (resources.disk.available && resources.diskPercent >= diskWarningPercent) {
    alerts.push({
      id: `alert-${randomUUID()}`,
      level: "warning",
      code: "resource.disk.high",
      source: "openclaw-system-sense",
      message: `Disk usage is ${resources.diskPercent}% at ${diskPath}`,
    });
  }

  systemState.timestamp = new Date().toISOString();
  systemState.body = buildBodyState();
  systemState.services = services;
  systemState.resources = resources;
  systemState.network = {
    online: Object.values(services).some((service) => service.ok),
    checkedTargets: Object.keys(serviceTargets).length,
  };
  systemState.alerts = alerts;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "openclaw-system-sense",
      stage: "active",
      host,
      port,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/health") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      system: { ...systemState },
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/body") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      body: systemState.body,
      resources: systemState.resources,
      network: systemState.network,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/services") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      services: systemState.services,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/alerts") {
    await refreshSystemState();
    sendJson(res, 200, {
      ok: true,
      alerts: systemState.alerts,
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/files/metadata") {
    try {
      const result = resolveAllowedPath(requestUrl.searchParams.get("path"));
      const metadata = buildFileMetadata(result.path);
      sendJson(res, 200, {
        ok: true,
        allowedRoots,
        ...result,
        metadata,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message, details: error.details ?? null });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/files/list") {
    try {
      const limit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "50", 10);
      const result = listFiles(requestUrl.searchParams.get("path"), limit);
      await publishEvent("system.files.listed", {
        path: result.path,
        count: result.count,
      });
      sendJson(res, 200, {
        ok: true,
        allowedRoots,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message, details: error.details ?? null });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/files/search") {
    try {
      const limit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "50", 10);
      const result = searchFiles(
        requestUrl.searchParams.get("path"),
        requestUrl.searchParams.get("query") ?? requestUrl.searchParams.get("q"),
        limit,
      );
      await publishEvent("system.files.searched", {
        path: result.path,
        query: result.query,
        count: result.count,
      });
      sendJson(res, 200, {
        ok: true,
        allowedRoots,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message, details: error.details ?? null });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/system/files/write-text") {
    try {
      const body = await readJsonBody(req);
      const result = writeTextFile(body);
      await publishEvent("system.files.written", {
        path: result.path,
        contentBytes: result.contentBytes,
        overwrite: result.overwrite,
      });
      sendJson(res, 200, {
        ok: true,
        allowedRoots,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message, code: error.code ?? null, details: error.details ?? null });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/system/processes") {
    try {
      const limit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "50", 10);
      const result = await listProcesses({
        query: requestUrl.searchParams.get("query") ?? requestUrl.searchParams.get("q") ?? "",
        limit,
      });
      await publishEvent("system.processes.listed", {
        count: result.count,
        query: result.query,
      });
      sendJson(res, 200, {
        ok: true,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 500, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/system/command/dry-run") {
    try {
      const body = await readJsonBody(req);
      const plan = buildCommandDryRun(body);
      await publishEvent("system.command.planned", { plan });
      sendJson(res, 200, {
        ok: true,
        plan,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/system/command/execute") {
    try {
      const body = await readJsonBody(req);
      const execution = await executeCommand(body);
      await publishEvent("system.command.executed", {
        command: execution.command,
        cwd: execution.cwd,
        exitCode: execution.result.exitCode,
        timedOut: execution.result.timedOut,
        durationMs: execution.result.durationMs,
      });
      sendJson(res, 200, {
        ok: true,
        execution,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { ok: false, error: message, code: error.code ?? null, details: error.details ?? null });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/system/refresh") {
    await refreshSystemState();
    await publishEvent(systemState.alerts.length > 0 ? "service.failed" : "system.updated", {
      alerts: systemState.alerts,
      services: systemState.services,
      resources: systemState.resources,
      body: systemState.body,
    });
    sendJson(res, 200, {
      ok: true,
      system: { ...systemState },
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Route not found." });
});

server.listen(port, host, async () => {
  console.log(`openclaw-system-sense listening on http://${host}:${port}`);
  await publishEvent("service.started", {
    service: "openclaw-system-sense",
    url: `http://${host}:${port}`,
  });
});
