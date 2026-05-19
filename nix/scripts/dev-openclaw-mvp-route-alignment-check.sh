#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5790}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5791}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5792}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5793}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5794}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5795}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5796}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5797}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5860}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-mvp-route-alignment-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp"

cleanup() {
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

route="$(curl --silent --fail "$CORE_URL/mvp/route")"

node - <<'EOF' "$route"
const route = JSON.parse(process.argv[2]);

if (route.registry !== "openclaw-mvp-route-alignment-v0") {
  throw new Error(`unexpected MVP route registry: ${route.registry}`);
}
if (route.mainline?.trunk !== "body-eyes-hands-observer-recovery") {
  throw new Error(`MVP route trunk drifted: ${route.mainline?.trunk}`);
}
if (route.mainline?.current !== "eye-hand-recovery-loop-complete") {
  throw new Error(`MVP current phase should record the completed eye-hand recovery loop: ${route.mainline?.current}`);
}
if (route.mainline?.nextRecommendedTrunk !== "system-health-self-heal") {
  throw new Error(`next trunk should return to body health/self-heal: ${route.mainline?.nextRecommendedTrunk}`);
}

const requiredLabels = ["Body", "Eyes", "Hands", "Observer", "Recovery", "Body Health"];
for (const label of requiredLabels) {
  if (!route.phases?.some((phase) => phase.label === label)) {
    throw new Error(`MVP route missing phase label ${label}: ${JSON.stringify(route.phases)}`);
  }
}

const complete = route.phases.filter((phase) => phase.status === "complete").map((phase) => phase.id);
for (const id of [
  "phase-0-body",
  "phase-1-eyes",
  "phase-2-hands",
  "phase-3-observer",
  "phase-4-recovery",
]) {
  if (!complete.includes(id)) {
    throw new Error(`expected completed MVP phase ${id}: ${JSON.stringify(route.phases)}`);
  }
}

const next = route.phases.find((phase) => phase.status === "next");
if (next?.id !== "phase-5-body-health-self-heal") {
  throw new Error(`expected next phase to be body health/self-heal: ${JSON.stringify(next)}`);
}
if (!route.guardrails?.afterEachMilestone?.some((item) => item.includes("whitepaper"))) {
  throw new Error(`route guardrail should require whitepaper review: ${JSON.stringify(route.guardrails)}`);
}
if (!route.guardrails?.avoidLoops?.includes("plugin-runtime-adapter-hardening-loop")) {
  throw new Error(`route guardrail should explicitly avoid the plugin runtime hardening loop: ${JSON.stringify(route.guardrails)}`);
}

console.log(JSON.stringify({
  mvpRouteAlignment: {
    status: "passed",
    current: route.mainline.current,
    trunk: route.mainline.trunk,
    next: route.mainline.nextRecommendedTrunk,
    complete: route.summary?.complete ?? complete.length,
  },
}, null, 2));
EOF
