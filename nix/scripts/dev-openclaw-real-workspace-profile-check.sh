#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-real-workspace-profile-fixture"
FIXTURE_WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9060}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9061}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9062}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9063}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9064}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9065}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9066}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9067}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9130}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-real-workspace-profile-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-real-workspace-profile-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

is_openclaw_source_workspace() {
  local candidate="$1"
  [[ -f "$candidate/package.json" ]] || return 1
  node -e '
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[1];
let pkg = null;
try {
  pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
} catch {
  process.exit(1);
}
const has = (name) => fs.existsSync(path.join(root, name));
if (pkg?.name === "openclaw" && has("extensions") && has("src") && has("packages")) {
  process.exit(0);
}
process.exit(1);
' "$candidate"
}

find_openclaw_source_workspace() {
  local search_root=""
  local package_file=""
  local candidate=""
  for search_root in "$HOME" "$REPO_ROOT/.."; do
    [[ -d "$search_root" ]] || continue
    while IFS= read -r package_file; do
      candidate="$(dirname "$package_file")"
      if is_openclaw_source_workspace "$candidate"; then
        printf '%s\n' "$candidate"
        return 0
      fi
    done < <(find "$search_root" -maxdepth 4 \
      \( -path '*/node_modules' -o -path '*/.git' -o -path '*/.artifacts' \) -prune \
      -o -name package.json -print 2>/dev/null)
  done
  return 1
}

resolve_real_openclaw_root() {
  local candidate=""
  if [[ -n "${OPENCLAW_REAL_WORKSPACE_ROOT:-}" ]]; then
    if is_openclaw_source_workspace "$OPENCLAW_REAL_WORKSPACE_ROOT"; then
      printf '%s\n' "$OPENCLAW_REAL_WORKSPACE_ROOT"
      return 0
    fi
    echo "OPENCLAW_REAL_WORKSPACE_ROOT does not point to an OpenClaw source workspace: $OPENCLAW_REAL_WORKSPACE_ROOT" >&2
    return 1
  fi

  for candidate in \
    "$HOME/openclaw" \
    "$HOME/OpenClaw" \
    "$REPO_ROOT/../openclaw" \
    "$REPO_ROOT/../OpenClaw" \
    "/home/edvulcan/openclaw" \
    "/home/edvulcan/OpenClaw"; do
    if is_openclaw_source_workspace "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  find_openclaw_source_workspace
}

create_openclaw_source_profile_fixture() {
  rm -rf "$FIXTURE_DIR"
  mkdir -p \
    "$FIXTURE_WORKSPACE_DIR/.git" \
    "$FIXTURE_WORKSPACE_DIR/.openclaw" \
    "$FIXTURE_WORKSPACE_DIR/apps/desktop" \
    "$FIXTURE_WORKSPACE_DIR/docs" \
    "$FIXTURE_WORKSPACE_DIR/extensions" \
    "$FIXTURE_WORKSPACE_DIR/packages/plugin-sdk" \
    "$FIXTURE_WORKSPACE_DIR/packages/memory-host-sdk" \
    "$FIXTURE_WORKSPACE_DIR/qa/smoke" \
    "$FIXTURE_WORKSPACE_DIR/scripts" \
    "$FIXTURE_WORKSPACE_DIR/skills" \
    "$FIXTURE_WORKSPACE_DIR/src/core" \
    "$FIXTURE_WORKSPACE_DIR/test/unit" \
    "$FIXTURE_WORKSPACE_DIR/ui"

  local index=""
  for index in $(seq 1 12); do
    mkdir -p "$FIXTURE_WORKSPACE_DIR/extensions/provider-$index"
  done

  cat > "$FIXTURE_WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "fixture-real-shape",
  "private": true,
  "scripts": {
    "build": "echo build",
    "dev": "echo dev",
    "lint": "echo lint",
    "start": "echo start",
    "test": "echo test",
    "audit:seams": "echo audit",
    "build:ci-artifacts": "echo build ci",
    "build:docker": "echo docker",
    "build:plugin-sdk:dts": "echo dts",
    "canon:check": "echo canon",
    "docs:check": "echo docs",
    "format": "echo format",
    "knip": "echo knip",
    "lint:md": "echo lint md",
    "plugin:pack": "echo plugin",
    "qa:smoke": "echo qa",
    "test:agents": "echo agents",
    "test:extensions": "echo extensions",
    "test:unit": "echo unit",
    "typecheck:core": "echo typecheck"
  }
}
JSON
  cat > "$FIXTURE_WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "apps/*"
  - "extensions/*"
  - "packages/*"
  - "ui"
YAML
  cat > "$FIXTURE_WORKSPACE_DIR/README.md" <<'MD'
# OpenClaw source-profile fixture

This file content must not be exposed by workspace profiling.
MD
  cat > "$FIXTURE_WORKSPACE_DIR/ui/package.json" <<'JSON'
{
  "name": "@openclaw/ui",
  "private": true
}
JSON
  cat > "$FIXTURE_WORKSPACE_DIR/AGENTS.md" <<'MD'
# Agent notes
MD
}

PROFILE_SOURCE="real"
if REAL_OPENCLAW_ROOT="$(resolve_real_openclaw_root)"; then
  :
elif [[ -n "${OPENCLAW_REAL_WORKSPACE_ROOT:-}" ]]; then
  exit 1
else
  echo "Real OpenClaw workspace not found; using deterministic source-profile fixture." >&2
  create_openclaw_source_profile_fixture
  REAL_OPENCLAW_ROOT="$FIXTURE_WORKSPACE_DIR"
  PROFILE_SOURCE="fixture"
fi

export OPENCLAW_WORKSPACE_ROOTS="$REAL_OPENCLAW_ROOT"
export PROFILE_SOURCE

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${WORKSPACES_FILE:-}" \
    "${SUMMARY_FILE:-}" \
    "${PROPOSALS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

WORKSPACES_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"
PROPOSALS_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/workspaces" > "$WORKSPACES_FILE"
curl --silent --fail "$CORE_URL/workspaces/summary" > "$SUMMARY_FILE"
curl --silent --fail "$CORE_URL/workspaces/command-proposals" > "$PROPOSALS_FILE"

node - <<'EOF' "$WORKSPACES_FILE" "$SUMMARY_FILE" "$PROPOSALS_FILE" "$REAL_OPENCLAW_ROOT"
const fs = require("node:fs");
const path = require("node:path");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const registry = readJson(2);
const summary = readJson(3);
const proposals = readJson(4);
const realRoot = path.resolve(process.argv[5]);
const workspace = registry.items?.[0] ?? null;
const rawRegistry = JSON.stringify(registry);

if (!registry.ok || registry.registry !== "workspace-detect-v0" || registry.mode !== "read-only") {
  throw new Error(`real workspace registry should remain read-only: ${JSON.stringify(registry)}`);
}
if (registry.count !== 1 || path.resolve(registry.roots?.[0] ?? "") !== realRoot) {
  throw new Error(`real workspace registry should use the configured OpenClaw root: ${JSON.stringify(registry.roots)}`);
}
if (!workspace || path.resolve(workspace.path) !== realRoot || workspace.name !== "openclaw" || workspace.kind !== "node_workspace") {
  throw new Error(`real workspace profile should identify the OpenClaw source workspace: ${JSON.stringify(workspace)}`);
}
if (workspace.packageManager !== "pnpm" || workspace.scriptCount < 20 || !workspace.scripts?.includes("build")) {
  throw new Error(`real OpenClaw workspace should expose pnpm package scripts as metadata only: ${JSON.stringify({ packageManager: workspace.packageManager, scriptCount: workspace.scriptCount, scripts: workspace.scripts?.slice?.(0, 20) })}`);
}
for (const marker of ["package.json", "pnpm-workspace.yaml", "README.md", ".git"]) {
  if (!workspace.markers?.includes(marker)) {
    throw new Error(`real OpenClaw workspace profile missing marker ${marker}: ${JSON.stringify(workspace.markers)}`);
  }
}
for (const domain of ["extensions", "src", "packages", "ui", "docs"]) {
  if (!workspace.topLevelDirectories?.includes(domain)) {
    throw new Error(`real OpenClaw workspace should expose top-level domain ${domain}: ${JSON.stringify(workspace.topLevelDirectories)}`);
  }
}

const profile = workspace.openclawProfile;
if (!profile || profile.profile !== "openclaw-source-workspace-v0" || profile.role !== "external_source_workspace") {
  throw new Error(`real OpenClaw workspace should expose an OpenClaw source profile: ${JSON.stringify(profile)}`);
}
if (
  !profile.presentDomains?.includes("extensions")
  || !profile.presentDomains?.includes("src")
  || !profile.presentDomains?.includes("packages")
  || profile.domainCounts?.extensions < 10
  || profile.domainCounts?.src < 1
  || profile.hasPluginSdk !== true
  || profile.hasUiWorkspace !== true
  || profile.hasExtensionCatalog !== true
) {
  throw new Error(`real OpenClaw source profile should summarize source capability domains: ${JSON.stringify(profile)}`);
}
if (
  profile.governance?.mode !== "source_profile_read_only"
  || profile.governance?.canReadFileContent !== false
  || profile.governance?.canMutate !== false
  || profile.governance?.canExecute !== false
  || profile.governance?.migrationStatus !== "not_imported"
) {
  throw new Error(`real OpenClaw source profile should remain inventory-only: ${JSON.stringify(profile.governance)}`);
}
if (
  workspace.governance?.mode !== "read_only_detect"
  || workspace.governance?.canReadFileContent !== false
  || workspace.governance?.canMutate !== false
  || workspace.governance?.canExecute !== false
) {
  throw new Error(`workspace governance should remain read-only: ${JSON.stringify(workspace.governance)}`);
}
if (rawRegistry.includes("SECRET") || rawRegistry.includes("OPENAI_API_KEY") || rawRegistry.includes("ANTHROPIC_API_KEY")) {
  throw new Error("real workspace profile must not expose file contents or secret-like values");
}
if (
  summary.summary?.total !== 1
  || summary.summary?.detected !== 1
  || summary.summary?.nodeWorkspaces !== 1
  || summary.summary?.byPackageManager?.pnpm !== 1
) {
  throw new Error(`real OpenClaw workspace summary mismatch: ${JSON.stringify(summary.summary)}`);
}
if (!proposals.ok || proposals.count < 1 || proposals.items?.some((item) => item.governance?.canExecute !== false || item.governance?.exposesScriptBody !== false)) {
  throw new Error(`real OpenClaw command proposals should remain proposal-only: ${JSON.stringify(proposals.summary)}`);
}

console.log(JSON.stringify({
  openclawRealWorkspaceProfile: {
    source: process.env.PROFILE_SOURCE ?? "real",
    root: workspace.path,
    packageManager: workspace.packageManager,
    scriptCount: workspace.scriptCount,
    topLevelDomains: profile.presentDomains,
    domainCounts: profile.domainCounts,
    integrationIntent: profile.governance.integrationIntent,
    migrationStatus: profile.governance.migrationStatus,
    proposalCount: proposals.count,
  },
}, null, 2));
EOF
