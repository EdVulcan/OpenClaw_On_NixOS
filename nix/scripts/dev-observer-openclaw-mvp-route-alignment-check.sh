#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5800}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5801}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5802}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5803}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5804}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5805}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5806}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5807}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5870}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-mvp-route-alignment-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp"

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
route="$(curl --silent --fail "$CORE_URL/mvp/route")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$route"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const route = JSON.parse(process.argv[4]);

const requiredHtml = [
  "MVP Route",
  "mvp-route-current",
  "mvp-route-trunk",
  "mvp-route-complete",
  "mvp-route-next",
  "mvp-route-json",
];
const requiredClient = [
  "refreshMvpRoute",
  "/mvp/route",
  "nextRecommendedTrunk",
  "mvpRouteCurrent",
  "mvpRouteJson",
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

if (route.mainline?.current !== "eye-hand-recovery-loop-complete") {
  throw new Error(`observer route should show the completed eye-hand recovery loop: ${route.mainline?.current}`);
}
if (route.mainline?.nextRecommendedTrunk !== "system-health-self-heal") {
  throw new Error(`observer route should point next to body health/self-heal: ${route.mainline?.nextRecommendedTrunk}`);
}
if (!route.guardrails?.avoidLoops?.includes("plugin-runtime-adapter-hardening-loop")) {
  throw new Error(`observer route should expose anti-drift guardrails: ${JSON.stringify(route.guardrails)}`);
}

console.log(JSON.stringify({
  observerMvpRouteAlignment: {
    status: "passed",
    htmlControls: requiredHtml,
    clientWiring: requiredClient,
    current: route.mainline.current,
    next: route.mainline.nextRecommendedTrunk,
  },
}, null, 2));
EOF
