#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6810}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6811}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6812}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6813}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6814}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6815}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6816}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6817}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6818}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-4-heal-history-evidence-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-4-heal-history-evidence-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
HEAL_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_HEAL_PORT"
. "$SCRIPT_DIR/dev-phase-4-prereqs.sh"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"

cleanup() {
  rm -f "${HISTORY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"
prepare_phase_4_self_heal_evidence "$HEAL_URL"
HISTORY_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/phase-4/heal-history-evidence" > "$HISTORY_FILE"

node - <<'EOF' "$HISTORY_FILE"
const fs = require("node:fs");
const history = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!history.ok
  || history.registry !== "openclaw-phase-4-heal-history-evidence-v0"
  || history.status !== "heal_history_evidence_ready"
  || history.summary?.ready !== true
  || history.history?.healCount < 2
  || history.history?.maintenanceCount < 1
  || history.history?.executedRepairs < 1
  || history.history?.skippedHighRisk < 1) {
  throw new Error(`Phase 4 heal history should expose repair and skipped evidence: ${JSON.stringify(history.history)}`);
}

console.log(JSON.stringify({
  openclawPhase4HealHistoryEvidence: {
    status: "passed",
    registry: history.registry,
    healCount: history.history.healCount,
    maintenanceCount: history.history.maintenanceCount,
  },
}, null, 2));
EOF
