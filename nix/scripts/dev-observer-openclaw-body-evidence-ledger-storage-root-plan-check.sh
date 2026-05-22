#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6440}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6441}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6442}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6443}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6444}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6445}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6446}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6447}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6510}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-body-evidence-ledger-storage-root-plan-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-body-evidence-ledger-storage-root-plan-check.json}"

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

prepare_body_evidence_timeline_readiness "$CORE_URL" "Approve one next repair execution before observer body evidence ledger storage root plan."

curl --silent --fail "$SYSTEM_URL/system/health" >/dev/null

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
plan="$(curl --silent --fail "$SYSTEM_URL/system/route/body-evidence-ledger-storage-root-plan")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$plan"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const plan = JSON.parse(process.argv[4]);

const requiredHtml = [
  "Body Evidence Ledger Storage Root Plan",
  "body-evidence-ledger-storage-root-plan-panel",
  "body-evidence-ledger-storage-root-plan-ready",
  "body-evidence-ledger-storage-root-plan-root",
  "body-evidence-ledger-storage-root-plan-created",
  "body-evidence-ledger-storage-root-plan-written",
  "body-evidence-ledger-storage-root-plan-json",
];
const requiredClient = [
  "/system/route/body-evidence-ledger-storage-root-plan",
  "refreshBodyEvidenceLedgerStorageRootPlan",
  "bodyEvidenceLedgerStorageRootPlanReady",
  "bodyEvidenceLedgerStorageRootPlanRoot",
  "bodyEvidenceLedgerStorageRootPlanCreated",
  "bodyEvidenceLedgerStorageRootPlanWritten",
  "bodyEvidenceLedgerStorageRootPlanJson",
  "openclaw-body-evidence-ledger-storage-root-route-review",
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
if (!plan.ok || plan.registry !== "openclaw-body-evidence-ledger-storage-root-plan-v0") {
  throw new Error(`Observer source should expose storage root plan registry: ${JSON.stringify(plan)}`);
}
if (plan.summary?.planReady !== true
  || plan.summary?.directoryCreated !== false
  || plan.summary?.durableStorageWritten !== false) {
  throw new Error(`Observer storage root plan summary should be ready without writes: ${JSON.stringify(plan.summary)}`);
}
if (plan.governance?.canCreateDirectory !== false
  || plan.governance?.canWriteLedger !== false
  || plan.governance?.durableStorageWritten !== false
  || plan.governance?.hostMutation !== false
  || plan.governance?.executesCommand !== false) {
  throw new Error(`Observer storage root plan must stay non-mutating: ${JSON.stringify(plan.governance)}`);
}

console.log(JSON.stringify({
  observerOpenClawBodyEvidenceLedgerStorageRootPlan: {
    status: "passed",
    panel: "Body Evidence Ledger Storage Root Plan",
    registry: plan.registry,
    selectedRoot: plan.summary?.selectedDisplayPath,
    directoryCreated: plan.summary?.directoryCreated,
    durableStorageWritten: plan.summary?.durableStorageWritten,
  },
}, null, 2));
EOF
