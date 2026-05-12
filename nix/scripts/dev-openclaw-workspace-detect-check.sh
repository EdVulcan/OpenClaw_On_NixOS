#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-workspace-detect-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8340}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8341}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8342}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8343}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8344}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8345}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8346}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8347}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8410}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-workspace-detect-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-workspace-detect-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-fixture",
  "private": true,
  "scripts": {
    "build": "echo build",
    "dev": "echo dev",
    "test": "echo test",
    "typecheck": "echo typecheck"
  },
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "apps/*"
  - "packages/*"
YAML
cat > "$WORKSPACE_DIR/README.md" <<'MD'
# OpenClaw Fixture

This content must not be exposed by workspace detection.
MD
cat > "$WORKSPACE_DIR/AGENTS.md" <<'MD'
# Agent Notes
MD

cleanup() {
  rm -f \
    "${WORKSPACES_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

WORKSPACES_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/workspaces" > "$WORKSPACES_FILE"
curl --silent --fail "$CORE_URL/workspaces/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$WORKSPACES_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const registry = readJson(2);
const summary = readJson(3);
const workspaceDir = process.argv[4];
const workspace = registry.items?.[0] ?? null;
const rawRegistry = JSON.stringify(registry);

if (!registry.ok || registry.registry !== "workspace-detect-v0" || registry.mode !== "read-only") {
  throw new Error(`workspace registry should expose read-only detect mode: ${JSON.stringify(registry)}`);
}
if (registry.count !== 1 || registry.roots?.[0] !== workspaceDir) {
  throw new Error(`workspace registry should use configured root: ${JSON.stringify(registry.roots)}`);
}
if (!workspace || workspace.name !== "openclaw" || workspace.kind !== "node_workspace" || workspace.packageManager !== "pnpm") {
  throw new Error(`workspace profile should identify the openclaw pnpm workspace: ${JSON.stringify(workspace)}`);
}
if (
  workspace.path !== workspaceDir
  || workspace.exists !== true
  || workspace.readable !== true
  || workspace.private !== true
  || workspace.version !== "0.0.0-fixture"
) {
  throw new Error(`workspace profile should expose basic package metadata: ${JSON.stringify(workspace)}`);
}
for (const script of ["build", "dev", "test", "typecheck"]) {
  if (!workspace.scripts?.includes(script)) {
    throw new Error(`workspace profile missing script ${script}: ${JSON.stringify(workspace.scripts)}`);
  }
}
for (const marker of ["package.json", "pnpm-workspace.yaml", "README.md", "AGENTS.md", ".git"]) {
  if (!workspace.markers?.includes(marker)) {
    throw new Error(`workspace profile missing marker ${marker}: ${JSON.stringify(workspace.markers)}`);
  }
}
if (workspace.workspaceCount !== 2 || !workspace.workspaces?.includes("apps/*") || !workspace.workspaces?.includes("packages/*")) {
  throw new Error(`workspace profile should expose package workspace globs: ${JSON.stringify(workspace.workspaces)}`);
}
if (!workspace.topLevelDirectories?.includes("apps") || !workspace.topLevelDirectories?.includes("packages")) {
  throw new Error(`workspace profile should expose shallow top-level directories: ${JSON.stringify(workspace.topLevelDirectories)}`);
}
if (
  workspace.governance?.mode !== "read_only_detect"
  || workspace.governance?.canReadFileContent !== false
  || workspace.governance?.canMutate !== false
  || workspace.governance?.canExecute !== false
) {
  throw new Error(`workspace detection should remain read-only: ${JSON.stringify(workspace.governance)}`);
}
if (rawRegistry.includes("This content must not be exposed")) {
  throw new Error("workspace detection must not expose README contents");
}
if (
  summary.summary?.total !== 1
  || summary.summary?.detected !== 1
  || summary.summary?.missing !== 0
  || summary.summary?.nodeWorkspaces !== 1
  || summary.summary?.byPackageManager?.pnpm !== 1
) {
  throw new Error(`workspace summary mismatch: ${JSON.stringify(summary.summary)}`);
}

console.log(JSON.stringify({
  openclawWorkspaceDetect: {
    registry: registry.registry,
    mode: registry.mode,
    root: workspace.path,
    profile: {
      name: workspace.name,
      kind: workspace.kind,
      packageManager: workspace.packageManager,
      scripts: workspace.scripts,
      workspaceCount: workspace.workspaceCount,
      markers: workspace.markers,
      governance: workspace.governance,
    },
    summary: summary.summary,
    endpoints: [
      "/workspaces",
      "/workspaces/summary",
    ],
  },
}, null, 2));
EOF
