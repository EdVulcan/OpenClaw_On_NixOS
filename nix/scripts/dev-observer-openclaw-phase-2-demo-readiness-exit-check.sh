#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6180}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6181}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6182}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6183}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6184}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6185}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6186}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6187}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6250}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-phase-2-demo-readiness-exit-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-phase-2-demo-readiness-exit-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
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

curl --silent --fail "$SYSTEM_URL/system/health" >/dev/null

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
exit_gate="$(curl --silent --fail "$CORE_URL/phase-2/demo-readiness-exit")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$exit_gate"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const exitGate = JSON.parse(process.argv[4]);

const requiredHtml = [
  "Phase 2 Demo Exit",
  "phase2-demo-readiness-exit-panel",
  "phase2-demo-readiness-exit-status",
  "phase2-demo-readiness-exit-checks",
  "phase2-demo-readiness-exit-safe",
  "phase2-demo-readiness-exit-mutation",
  "phase2-demo-readiness-exit-json",
];
const requiredClient = [
  "/phase-2/demo-readiness-exit",
  "refreshPhase2DemoReadinessExit",
  "phase2DemoReadinessExitStatus",
  "phase2DemoReadinessExitChecks",
  "phase2DemoReadinessExitSafe",
  "phase2DemoReadinessExitMutation",
  "phase2DemoReadinessExitJson",
  "safeToDemo",
  "completedSlices",
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
if (!exitGate.ok || exitGate.registry !== "openclaw-phase-2-demo-readiness-exit-v0") {
  throw new Error(`Observer source should expose demo readiness exit registry: ${JSON.stringify(exitGate)}`);
}
if (exitGate.summary?.ready !== true || exitGate.operatorOutcome?.safeToDemo !== true) {
  throw new Error(`Observer-facing demo readiness exit should be ready: ${JSON.stringify({ summary: exitGate.summary, outcome: exitGate.operatorOutcome })}`);
}
if (exitGate.governance?.createsTask !== false
  || exitGate.governance?.mutatesHost !== false
  || exitGate.governance?.executesCommand !== false
  || exitGate.governance?.triggersRecovery !== false) {
  throw new Error(`Observer-facing demo readiness exit must not execute or recover: ${JSON.stringify(exitGate.governance)}`);
}

console.log(JSON.stringify({
  observerOpenClawPhase2DemoReadinessExit: {
    status: "passed",
    panel: "Phase 2 Demo Exit",
    registry: exitGate.registry,
    ready: exitGate.summary?.ready,
    checks: `${exitGate.summary?.passed}/${exitGate.summary?.total}`,
    mutatesHost: exitGate.governance?.mutatesHost,
  },
}, null, 2));
EOF
