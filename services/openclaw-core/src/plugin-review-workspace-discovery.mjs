import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export function safeDirectoryEntries(rootPath) {
  try {
    return readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith(".") && entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 24);
  } catch {
    return [];
  }
}

function safeDirectoryCount(rootPath) {
  try {
    return readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith(".") && entry.isDirectory())
      .length;
  } catch {
    return 0;
  }
}

export function safeStat(rootPath) {
  try {
    return statSync(rootPath);
  } catch {
    return null;
  }
}

export function createPluginReviewWorkspaceDiscovery({
  workspaceRoots = [],
  readJsonFileIfPresent = () => null,
} = {}) {
function readPnpmWorkspacePackages(rootPath) {
  const filePath = path.join(rootPath, "pnpm-workspace.yaml");
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    const packages = [];
    let inPackages = false;
    for (const line of lines) {
      if (/^\s*packages\s*:/.test(line)) {
        inPackages = true;
        continue;
      }
      if (!inPackages) {
        continue;
      }
      if (/^\S/.test(line) && !/^\s*-/.test(line)) {
        break;
      }
      const match = line.match(/^\s*-\s*["']?([^"']+)["']?\s*$/);
      if (match?.[1]) {
        packages.push(match[1]);
      }
    }
    return packages;
  } catch {
    return [];
  }
}

function detectWorkspacePackageManager(rootPath) {
  if (existsSync(path.join(rootPath, "pnpm-lock.yaml")) || existsSync(path.join(rootPath, "pnpm-workspace.yaml"))) {
    return "pnpm";
  }
  if (existsSync(path.join(rootPath, "package-lock.json"))) {
    return "npm";
  }
  if (existsSync(path.join(rootPath, "yarn.lock"))) {
    return "yarn";
  }
  if (existsSync(path.join(rootPath, "bun.lockb")) || existsSync(path.join(rootPath, "bun.lock"))) {
    return "bun";
  }
  return null;
}

function buildOpenClawWorkspaceProfile(rootPath, packageJson, topLevelDirectories) {
  const domainNames = [
    "apps",
    "packages",
    "extensions",
    "src",
    "ui",
    "docs",
    "skills",
    "scripts",
    "test",
    "qa",
  ];
  const presentDomains = domainNames.filter((name) => topLevelDirectories.includes(name));
  const looksLikeOpenClaw =
    packageJson?.name === "openclaw"
    || topLevelDirectories.includes("extensions")
    || existsSync(path.join(rootPath, ".openclaw"));

  if (!looksLikeOpenClaw) {
    return null;
  }

  const domainCounts = Object.fromEntries(presentDomains.map((name) => [
    name,
    safeDirectoryCount(path.join(rootPath, name)),
  ]));
  return {
    profile: "openclaw-source-workspace-v0",
    role: "external_source_workspace",
    presentDomains,
    domainCount: presentDomains.length,
    domainCounts,
    hasPluginSdk: existsSync(path.join(rootPath, "packages", "plugin-sdk")),
    hasMemoryHostSdk: existsSync(path.join(rootPath, "packages", "memory-host-sdk")),
    hasUiWorkspace: existsSync(path.join(rootPath, "ui", "package.json")),
    hasExtensionCatalog: existsSync(path.join(rootPath, "extensions")),
    governance: {
      mode: "source_profile_read_only",
      canReadFileContent: false,
      canMutate: false,
      canExecute: false,
      migrationStatus: "not_imported",
      integrationIntent: "inventory_before_absorb",
    },
  };
}

function detectWorkspace(rootPath) {
  const resolvedPath = path.resolve(rootPath);
  const exists = existsSync(resolvedPath);
  const stats = exists ? safeStat(resolvedPath) : null;
  const isDirectory = stats?.isDirectory() === true;
  const packageJson = isDirectory ? readJsonFileIfPresent(path.join(resolvedPath, "package.json")) : null;
  const markers = isDirectory
    ? [
        "package.json",
        "pnpm-workspace.yaml",
        "README.md",
        "AGENTS.md",
        "CLAUDE.md",
        ".openclaw",
        ".git",
      ].filter((marker) => existsSync(path.join(resolvedPath, marker)))
    : [];
  const scripts = packageJson?.scripts && typeof packageJson.scripts === "object"
    ? Object.keys(packageJson.scripts).sort()
    : [];
  const workspaces = Array.isArray(packageJson?.workspaces)
    ? packageJson.workspaces
    : Array.isArray(packageJson?.workspaces?.packages)
      ? packageJson.workspaces.packages
      : isDirectory
        ? readPnpmWorkspacePackages(resolvedPath)
        : [];
  const topLevelDirectories = isDirectory ? safeDirectoryEntries(resolvedPath) : [];
  const openclawProfile = isDirectory
    ? buildOpenClawWorkspaceProfile(resolvedPath, packageJson, topLevelDirectories)
    : null;

  return {
    id: path.basename(resolvedPath) || "workspace",
    name: typeof packageJson?.name === "string" ? packageJson.name : path.basename(resolvedPath),
    path: resolvedPath,
    exists,
    readable: isDirectory,
    kind: packageJson ? "node_workspace" : isDirectory ? "filesystem_workspace" : "missing",
    packageManager: isDirectory ? detectWorkspacePackageManager(resolvedPath) : null,
    private: packageJson?.private === true,
    version: typeof packageJson?.version === "string" ? packageJson.version : null,
    scripts,
    scriptCount: scripts.length,
    workspaces,
    workspaceCount: workspaces.length,
    markers,
    topLevelDirectories,
    openclawProfile,
    governance: {
      mode: "read_only_detect",
      canReadMetadata: true,
      canReadFileContent: false,
      canMutate: false,
      canExecute: false,
    },
  };
}

function buildWorkspaceRegistry() {
  const items = workspaceRoots.map((root) => detectWorkspace(root));
  const detected = items.filter((item) => item.exists && item.readable);
  return {
    registry: "workspace-detect-v0",
    mode: "read-only",
    generatedAt: new Date().toISOString(),
    roots: workspaceRoots,
    count: items.length,
    items,
    summary: {
      total: items.length,
      detected: detected.length,
      missing: items.length - detected.length,
      nodeWorkspaces: items.filter((item) => item.kind === "node_workspace").length,
      byPackageManager: items.reduce((accumulator, item) => {
        const key = item.packageManager ?? "unknown";
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
      }, {}),
    },
  };
}

const WORKSPACE_COMMAND_SCRIPT_ORDER = [
  "typecheck",
  "test",
  "lint",
  "build",
  "dev",
];

function workspaceScriptCategory(scriptName) {
  if (scriptName === "typecheck" || scriptName === "test" || scriptName === "lint") {
    return "validation";
  }
  if (scriptName === "build") {
    return "build";
  }
  if (scriptName === "dev" || scriptName === "start") {
    return "runtime";
  }
  return "script";
}

function workspacePackageManagerCommand(packageManager) {
  if (packageManager === "pnpm") {
    return "pnpm";
  }
  if (packageManager === "yarn") {
    return "yarn";
  }
  if (packageManager === "bun") {
    return "bun";
  }
  return "npm";
}

function workspaceScriptArgs(packageManager, scriptName) {
  if (packageManager === "yarn") {
    return ["run", scriptName];
  }
  if (packageManager === "bun") {
    return ["run", scriptName];
  }
  return ["run", scriptName];
}

function workspaceScriptRisk(scriptName) {
  return scriptName === "dev" || scriptName === "start" ? "medium" : "low";
}

function truncatePatchMetadata(value, maxLength = 240) {
  const text = typeof value === "string" ? value : "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function buildWorkspaceCommandProposals() {
  const registry = buildWorkspaceRegistry();
  const items = registry.items
    .filter((workspace) => workspace.kind === "node_workspace" && workspace.exists && workspace.readable)
    .flatMap((workspace) => {
      const orderedScripts = [...workspace.scripts]
        .sort((left, right) => {
          const leftIndex = WORKSPACE_COMMAND_SCRIPT_ORDER.indexOf(left);
          const rightIndex = WORKSPACE_COMMAND_SCRIPT_ORDER.indexOf(right);
          if (leftIndex !== -1 || rightIndex !== -1) {
            return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
          }
          return left.localeCompare(right);
        });
      return orderedScripts.map((scriptName) => {
        const command = workspacePackageManagerCommand(workspace.packageManager);
        return {
          id: `${workspace.id}:${scriptName}`,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          workspacePath: workspace.path,
          scriptName,
          category: workspaceScriptCategory(scriptName),
          packageManager: workspace.packageManager ?? "npm",
          command,
          args: workspaceScriptArgs(workspace.packageManager, scriptName),
          cwd: workspace.path,
          usesShell: false,
          risk: workspaceScriptRisk(scriptName),
          status: "proposed",
          governance: {
            mode: "proposal_only",
            canExecute: false,
            requiresExplicitExecutionApproval: true,
            exposesScriptBody: false,
          },
        };
      });
    });

  return {
    registry: "workspace-command-proposals-v0",
    mode: "proposal-only",
    generatedAt: registry.generatedAt,
    workspaceRegistry: registry.registry,
    roots: registry.roots,
    count: items.length,
    items,
    summary: {
      total: items.length,
      workspaces: new Set(items.map((item) => item.workspaceId)).size,
      byWorkspace: items.reduce((accumulator, item) => {
        accumulator[item.workspaceName] = (accumulator[item.workspaceName] ?? 0) + 1;
        return accumulator;
      }, {}),
      byPackageManager: items.reduce((accumulator, item) => {
        accumulator[item.packageManager] = (accumulator[item.packageManager] ?? 0) + 1;
        return accumulator;
      }, {}),
      byCategory: items.reduce((accumulator, item) => {
        accumulator[item.category] = (accumulator[item.category] ?? 0) + 1;
        return accumulator;
      }, {}),
      byRisk: items.reduce((accumulator, item) => {
        accumulator[item.risk] = (accumulator[item.risk] ?? 0) + 1;
        return accumulator;
      }, {}),
    },
  };
}


  return {
    detectWorkspacePackageManager,
    detectWorkspace,
    buildWorkspaceRegistry,
    buildWorkspaceCommandProposals,
    truncatePatchMetadata,
  };
}
