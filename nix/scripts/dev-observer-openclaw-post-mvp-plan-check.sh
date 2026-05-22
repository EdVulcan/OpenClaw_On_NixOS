#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-7020}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-7021}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-7022}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-7023}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-7024}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-7025}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-7026}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-7027}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-7028}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-post-mvp-plan-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-post-mvp-plan-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
HEAL_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_HEAL_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
. "$SCRIPT_DIR/dev-phase-4-prereqs.sh"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${PLAN_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"
prepare_phase_4_self_heal_evidence "$HEAL_URL"
HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
PLAN_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/post-mvp/plan" > "$PLAN_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$PLAN_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const plan = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

for (const token of ["Post-MVP Plan", "post-mvp-plan-panel", "post-mvp-plan-trunk", "post-mvp-plan-next"]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of ["/post-mvp/plan", "refreshPostMvpPlan", "openclaw-post-mvp-plan-v0", "openclaw-phase-6-consciousness-memory-plan"]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
if (!plan.ok || plan.summary?.ready !== true || plan.summary?.selectedTrunk !== "consciousness-memory-orchestration") {
  throw new Error(`Observer Post-MVP plan should be ready: ${JSON.stringify(plan.summary)}`);
}

console.log(JSON.stringify({ observerOpenClawPostMvpPlan: { status: "passed", panel: "Post-MVP Plan", next: plan.next.recommendedSlice } }, null, 2));
EOF
