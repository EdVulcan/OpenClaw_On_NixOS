#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6460}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6461}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6462}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6463}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6464}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6465}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6466}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6467}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6530}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-body-evidence-ledger-storage-root-route-review-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-body-evidence-ledger-storage-root-route-review-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
. "$SCRIPT_DIR/dev-body-evidence-prereqs.sh"

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

prepare_body_evidence_timeline_readiness "$CORE_URL" "Approve one next repair execution before observer body evidence ledger storage root route review."

curl --silent --fail "$SYSTEM_URL/system/health" >/dev/null

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
review="$(curl --silent --fail "$SYSTEM_URL/system/route/body-evidence-ledger-storage-root-route-review")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$review"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const review = JSON.parse(process.argv[4]);

const requiredHtml = [
  "Body Evidence Ledger Storage Root Route Review",
  "body-evidence-ledger-storage-root-route-review-panel",
  "body-evidence-ledger-storage-root-route-review-status",
  "body-evidence-ledger-storage-root-route-review-next",
  "body-evidence-ledger-storage-root-route-review-create",
  "body-evidence-ledger-storage-root-route-review-written",
  "body-evidence-ledger-storage-root-route-review-json",
];
const requiredClient = [
  "/system/route/body-evidence-ledger-storage-root-route-review",
  "refreshBodyEvidenceLedgerStorageRootRouteReview",
  "bodyEvidenceLedgerStorageRootRouteReviewStatus",
  "bodyEvidenceLedgerStorageRootRouteReviewNext",
  "bodyEvidenceLedgerStorageRootRouteReviewCreate",
  "bodyEvidenceLedgerStorageRootRouteReviewWritten",
  "bodyEvidenceLedgerStorageRootRouteReviewJson",
  "openclaw-body-evidence-ledger-directory-task",
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
if (!review.ok || review.registry !== "openclaw-body-evidence-ledger-storage-root-route-review-v0") {
  throw new Error(`Observer source should expose storage root route review registry: ${JSON.stringify(review)}`);
}
if (review.decision?.selectedSlice !== "openclaw-body-evidence-ledger-directory-task") {
  throw new Error(`Observer storage root route review should select directory task shell: ${JSON.stringify(review.decision)}`);
}
if (review.governance?.canCreateDirectory !== false
  || review.governance?.canWriteLedger !== false
  || review.governance?.durableStorageWritten !== false
  || review.governance?.hostMutation !== false
  || review.governance?.executesCommand !== false) {
  throw new Error(`Observer storage root route review must stay non-mutating: ${JSON.stringify(review.governance)}`);
}
if (review.evidence?.rootInsideWorkspace !== true
  || review.evidence?.directoryCreated !== false
  || review.evidence?.durableStorageWritten !== false) {
  throw new Error(`Observer storage root route review should cite workspace-bounded non-created root: ${JSON.stringify(review.evidence)}`);
}

console.log(JSON.stringify({
  observerOpenClawBodyEvidenceLedgerStorageRootRouteReview: {
    status: "passed",
    panel: "Body Evidence Ledger Storage Root Route Review",
    registry: review.registry,
    selectedSlice: review.decision?.selectedSlice,
    root: review.evidence?.selectedDisplayPath,
    directoryCreated: review.evidence?.directoryCreated,
  },
}, null, 2));
EOF
