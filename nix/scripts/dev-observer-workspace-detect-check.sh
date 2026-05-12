#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-workspace-detect-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-8640}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-8641}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-8642}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-8643}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-8644}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-8645}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-8646}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-8647}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-8710}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-workspace-detect-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-workspace-detect-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/apps" "$WORKSPACE_DIR/packages" "$WORKSPACE_DIR/.git"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-observer-fixture",
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
# OpenClaw Observer Fixture

This observer-only secret must not be exposed by workspace detection.
MD
cat > "$WORKSPACE_DIR/AGENTS.md" <<'MD'
# Agent Notes
MD

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${WORKSPACES_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
WORKSPACES_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/workspaces" > "$WORKSPACES_FILE"
curl --silent --fail "$CORE_URL/workspaces/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$WORKSPACES_FILE" "$SUMMARY_FILE" "$WORKSPACE_DIR"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const registry = readJson(4);
const summary = readJson(5);
const workspaceDir = process.argv[6];
const workspace = registry.items?.[0] ?? null;
const rawRegistry = JSON.stringify(registry);
const secretContent = "This observer-only secret must not be exposed";

const requiredHtml = [
  "workspace-registry",
  "workspace-detected",
  "workspace-missing",
  "workspace-node",
  "workspace-mode",
  "workspace-json",
];
const requiredClient = [
  "/workspaces",
  "renderWorkspaceRegistry",
  "refreshWorkspaceRegistry",
  "Read-only detection: no file contents, mutations, or command execution.",
];

for (const token of requiredHtml) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of requiredClient) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}

if (!registry.ok || registry.registry !== "workspace-detect-v0" || registry.mode !== "read-only") {
  throw new Error(`workspace registry should expose read-only detect mode: ${JSON.stringify(registry)}`);
}
if (!workspace || workspace.path !== workspaceDir || workspace.name !== "openclaw" || workspace.packageManager !== "pnpm") {
  throw new Error(`workspace profile should identify fixture workspace: ${JSON.stringify(workspace)}`);
}
if (
  workspace.governance?.canReadFileContent !== false
  || workspace.governance?.canMutate !== false
  || workspace.governance?.canExecute !== false
) {
  throw new Error(`workspace profile should preserve read-only governance: ${JSON.stringify(workspace.governance)}`);
}
if (!workspace.scripts?.includes("typecheck") || !workspace.markers?.includes("README.md") || !workspace.topLevelDirectories?.includes("apps")) {
  throw new Error(`workspace profile should expose shallow metadata: ${JSON.stringify(workspace)}`);
}
if (rawRegistry.includes(secretContent)) {
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
if (JSON.stringify(registry.summary) !== JSON.stringify(summary.summary)) {
  throw new Error(`workspace registry and summary endpoints should agree: ${JSON.stringify({ registry: registry.summary, summary: summary.summary })}`);
}

console.log(JSON.stringify({
  observerWorkspaceDetect: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/workspaces",
      "/workspaces/summary",
      "renderWorkspaceRegistry",
    ],
    summary: summary.summary,
    example: {
      name: workspace.name,
      kind: workspace.kind,
      path: workspace.path,
      packageManager: workspace.packageManager,
      scripts: workspace.scripts,
      markers: workspace.markers,
      governance: workspace.governance,
    },
  },
}, null, 2));
EOF
