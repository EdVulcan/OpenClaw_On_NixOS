#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OBSERVER_CHECK="${PHASE56_OBSERVER_CHECK:-false}"
PORT_BASE="${PHASE56_PORT_BASE:-19360}"
CLOUD_DIR="$REPO_ROOT/.artifacts/openclaw-cloud-consciousness"
PROVIDER_RESPONSE_FILE="$CLOUD_DIR/provider-response-rehearsal.jsonl"
RUNBOOK_FILE="$CLOUD_DIR/live-provider-call-runbook.jsonl"
EXECUTION_PLAN_FILE="$CLOUD_DIR/live-provider-call-execution-plan.jsonl"
PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_56_PLAN.md"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$PORT_BASE}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((PORT_BASE + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((PORT_BASE + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((PORT_BASE + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((PORT_BASE + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((PORT_BASE + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((PORT_BASE + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((PORT_BASE + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((PORT_BASE + 8))}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-56-real-launch-route-review-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-56-real-launch-route-review-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
REGISTRY="openclaw-cloud-consciousness-live-provider-real-launch-route-review-v0"
NEXT_SLICE="openclaw-cloud-consciousness-live-provider-real-launch-task"

. "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-fixtures.sh"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
seed_live_provider_call_prerequisites "$CLOUD_DIR" "$PROVIDER_RESPONSE_FILE" "$RUNBOOK_FILE" "$EXECUTION_PLAN_FILE" "phase56-prereq"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${REVIEW_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

if [[ "$OBSERVER_CHECK" == "true" ]]; then
  HTML_FILE="$(mktemp)"
  CLIENT_FILE="$(mktemp)"
  curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
  curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
  node - <<'EOF' "$REGISTRY" "$NEXT_SLICE" "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const registry = process.argv[2];
const nextSlice = process.argv[3];
const html = fs.readFileSync(process.argv[4], "utf8");
const client = fs.readFileSync(process.argv[5], "utf8");
for (const token of [
  "Cloud Consciousness Live Provider Real Launch Route Review",
  "cloud-consciousness-live-provider-real-launch-route-review-panel",
]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of [
  "/cloud-consciousness/live-provider-real-launch-route-review",
  "refreshCloudConsciousnessLiveProviderRealLaunchRouteReview",
  registry,
  nextSlice,
  "Launch authorized",
]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
console.log(JSON.stringify({ observerOpenClawCloudConsciousnessRealLaunchRouteReview: { status: "passed", registry, next: nextSlice } }, null, 2));
EOF
  exit 0
fi

REVIEW_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-real-launch-route-review" > "$REVIEW_FILE"
node - <<'EOF' "$REGISTRY" "$NEXT_SLICE" "$PLAN_DOC" "$REVIEW_FILE"
const fs = require("node:fs");
const registry = process.argv[2];
const nextSlice = process.argv[3];
const doc = fs.readFileSync(process.argv[4], "utf8");
const review = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-live-provider-real-launch-route-review",
  "openclaw-cloud-consciousness-live-provider-real-launch-task",
  "launchAuthorized: false",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 56 plan doc missing ${token}`);
}
if (!review.ok || review.registry !== registry) {
  throw new Error(`Unexpected Phase 56 registry: ${JSON.stringify(review)}`);
}
const summary = review.summary ?? {};
if (
  summary.ready !== true
  || summary.complete !== true
  || summary.completionPercent !== 100
  || summary.phase !== "phase-56"
  || summary.routeReviewOnly !== true
  || summary.liveLaunchRouteReviewed !== true
  || summary.selectedSlice !== nextSlice
  || summary.localRuntimeAdapterComplete !== true
  || summary.adapterMethodTableClosed !== true
  || summary.methodCount !== 6
  || summary.implementedMethodCount !== 6
  || summary.createsTask !== false
  || summary.createsApproval !== false
  || summary.launchAuthorized !== false
  || summary.credentialValueRead !== false
  || summary.endpointContacted !== false
  || summary.networkEgress !== false
  || summary.providerResponseCreated !== false
  || summary.rollbackExecuted !== false
  || summary.hostMutation !== false
  || summary.liveProviderCallEnabled !== false
) {
  throw new Error(`Phase 56 route review should select launch task without executing launch: ${JSON.stringify(summary)}`);
}
if (review.decision?.selectedSlice !== nextSlice || review.next?.recommendedSlice !== nextSlice) {
  throw new Error(`Phase 56 should route to ${nextSlice}: ${JSON.stringify({ decision: review.decision, next: review.next })}`);
}
if (review.evidence?.closureExit?.complete !== true || review.evidence?.runtimeImplementationPlan?.ready !== true) {
  throw new Error(`Phase 56 should link closure exit and runtime implementation plan evidence: ${JSON.stringify(review.evidence)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessRealLaunchRouteReview: { status: "passed", registry, next: nextSlice } }, null, 2));
EOF
