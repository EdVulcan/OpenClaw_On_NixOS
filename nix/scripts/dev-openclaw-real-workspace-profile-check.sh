#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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

resolve_real_openclaw_root() {
  local candidate=""
  if [[ -n "${OPENCLAW_REAL_WORKSPACE_ROOT:-}" ]]; then
    printf '%s\n' "$OPENCLAW_REAL_WORKSPACE_ROOT"
    return 0
  fi

  for candidate in "$HOME/openclaw" "$REPO_ROOT/../openclaw" "/home/edvulcan/openclaw"; do
    if [[ -f "$candidate/package.json" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

REAL_OPENCLAW_ROOT="$(resolve_real_openclaw_root || true)"
if [[ -z "$REAL_OPENCLAW_ROOT" || ! -f "$REAL_OPENCLAW_ROOT/package.json" ]]; then
  echo "Unable to locate the real OpenClaw workspace. Set OPENCLAW_REAL_WORKSPACE_ROOT to the existing openclaw checkout." >&2
  exit 1
fi

export OPENCLAW_WORKSPACE_ROOTS="$REAL_OPENCLAW_ROOT"

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
