#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6800}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6801}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6802}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6803}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6804}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6805}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6806}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6807}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6808}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-4-self-heal-loop-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-4-self-heal-loop-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
HEAL_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_HEAL_PORT"
. "$SCRIPT_DIR/dev-phase-4-prereqs.sh"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"

cleanup() {
  rm -f "${LOOP_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"
prepare_phase_4_self_heal_evidence "$HEAL_URL"
LOOP_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/phase-4/self-heal-loop" > "$LOOP_FILE"

node - <<'EOF' "$LOOP_FILE"
const fs = require("node:fs");
const loop = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!loop.ok
  || loop.registry !== "openclaw-phase-4-self-heal-loop-v0"
  || loop.status !== "self_heal_loop_ready"
  || loop.summary?.ready !== true
  || loop.summary?.completionPercent !== 100
  || loop.summary?.realHostRepair !== false) {
  throw new Error(`Phase 4 self-heal loop should be ready: ${JSON.stringify(loop.summary)}`);
}
if (loop.diagnosis?.status !== "repairable"
  || loop.maintenance?.executedCount < 1
  || loop.maintenance?.skippedCount < 1
  || loop.maintenance?.autonomy?.governance !== "audit_only") {
  throw new Error(`self-heal loop should include conservative repair evidence: ${JSON.stringify(loop.maintenance)}`);
}

console.log(JSON.stringify({
  openclawPhase4SelfHealLoop: {
    status: "passed",
    registry: loop.registry,
    diagnosis: loop.diagnosis.status,
    executed: loop.maintenance.executedCount,
    skipped: loop.maintenance.skippedCount,
  },
}, null, 2));
EOF
