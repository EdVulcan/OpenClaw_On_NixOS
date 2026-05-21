#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6320}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6321}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6322}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6323}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6324}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6325}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6326}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6327}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6390}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-systemd-repair-candidate-route-review-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-systemd-repair-candidate-route-review-check.json}"

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
review="$(curl --silent --fail "$SYSTEM_URL/system/systemd/repair-candidate-route-review")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$review"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const review = JSON.parse(process.argv[4]);

const requiredHtml = [
  "Repair Candidate Route Review",
  "systemd-repair-candidate-route-review-panel",
  "systemd-repair-candidate-route-review-track",
  "systemd-repair-candidate-route-review-slice",
  "systemd-repair-candidate-route-review-creates-task",
  "systemd-repair-candidate-route-review-mutation",
  "systemd-repair-candidate-route-review-json",
];
const requiredClient = [
  "/system/systemd/repair-candidate-route-review",
  "refreshSystemdRepairCandidateRouteReview",
  "systemdRepairCandidateRouteReviewTrack",
  "systemdRepairCandidateRouteReviewSlice",
  "systemdRepairCandidateRouteReviewCreatesTask",
  "systemdRepairCandidateRouteReviewMutation",
  "systemdRepairCandidateRouteReviewJson",
  "openclaw-systemd-repair-candidate-demo-status",
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
if (!review.ok || review.registry !== "openclaw-systemd-repair-candidate-route-review-v0") {
  throw new Error(`Observer source should expose candidate route review registry: ${JSON.stringify(review)}`);
}
if (review.decision?.selectedSlice !== "openclaw-systemd-repair-candidate-demo-status"
  || review.evidence?.candidateReady !== true) {
  throw new Error(`Observer route review should select candidate demo status from readiness evidence: ${JSON.stringify(review.decision)} evidence=${JSON.stringify(review.evidence)}`);
}
if (review.governance?.createsTask !== false
  || review.governance?.createsApproval !== false
  || review.governance?.executesCommand !== false
  || review.governance?.hostMutation !== false) {
  throw new Error(`Observer candidate route review must remain read-only: ${JSON.stringify(review.governance)}`);
}

console.log(JSON.stringify({
  observerOpenClawSystemdRepairCandidateRouteReview: {
    status: "passed",
    panel: "Repair Candidate Route Review",
    registry: review.registry,
    selectedSlice: review.decision?.selectedSlice,
    hostMutation: review.governance?.hostMutation,
  },
}, null, 2));
EOF
