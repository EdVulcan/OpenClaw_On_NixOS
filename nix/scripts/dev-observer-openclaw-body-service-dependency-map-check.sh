#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6020}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6021}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6022}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6023}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6024}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6025}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6026}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6027}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6090}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-body-service-dependency-map-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-body-service-dependency-map-check.json}"

SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f \
  "$OPENCLAW_CORE_STATE_FILE" \
  "$OPENCLAW_CORE_STATE_FILE.tmp" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
dependency_map="$(curl --silent --fail "$SYSTEM_URL/system/systemd/dependency-map")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$dependency_map"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const dependencyMap = JSON.parse(process.argv[4]);

const requiredHtml = [
  "Body Dependency Map",
  "systemd-dependency-map",
  "systemd-dependency-node-count",
  "systemd-dependency-edge-count",
  "systemd-dependency-root-count",
  "systemd-dependency-high-impact",
  "systemd-dependency-json",
];
const requiredClient = [
  "/system/systemd/dependency-map",
  "refreshSystemdDependencyMap",
  "systemdDependencyNodeCount",
  "systemdDependencyEdgeCount",
  "systemdDependencyRootCount",
  "systemdDependencyHighImpact",
  "systemdDependencyJson",
  "impactClass",
  "startupLayers",
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

if (!dependencyMap.ok || dependencyMap.registry !== "openclaw-systemd-dependency-map-v0") {
  throw new Error(`Observer source should expose dependency map registry: ${JSON.stringify(dependencyMap)}`);
}
if (dependencyMap.governance?.hostMutation !== false || dependencyMap.governance?.canRestart !== false) {
  throw new Error(`Observer-facing dependency map must stay read-only: ${JSON.stringify(dependencyMap.governance)}`);
}
if (!dependencyMap.nodes?.some((node) =>
  node.unit === "openclaw-event-hub.service"
    && node.impactClass === "foundational"
    && node.downstream.length > 0
)) {
  throw new Error(`Observer-facing dependency map should identify foundational event hub impact: ${JSON.stringify(dependencyMap.nodes)}`);
}
if (!dependencyMap.edges?.some((edge) =>
  edge.from === "openclaw-core.service"
    && edge.to === "observer-ui.service"
)) {
  throw new Error(`Observer-facing dependency map should show core to observer UI edge: ${JSON.stringify(dependencyMap.edges)}`);
}

console.log(JSON.stringify({
  observerOpenClawBodyServiceDependencyMap: {
    status: "passed",
    panel: "Body Dependency Map",
    registry: dependencyMap.registry,
    nodes: dependencyMap.summary?.nodes,
    edges: dependencyMap.summary?.edges,
    highImpact: dependencyMap.summary?.highImpact,
    next: dependencyMap.next?.recommendedSlice,
  },
}, null, 2));
EOF
