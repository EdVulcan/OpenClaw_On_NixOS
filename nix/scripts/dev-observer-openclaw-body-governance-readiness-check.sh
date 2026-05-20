#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6100}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6101}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6102}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6103}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6104}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6105}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6106}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6107}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6170}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-body-governance-readiness-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-body-governance-readiness-check.json}"

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
readiness="$(curl --silent --fail "$SYSTEM_URL/system/route/body-governance-readiness")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$readiness"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const readiness = JSON.parse(process.argv[4]);

const requiredHtml = [
  "Body Governance Readiness",
  "body-governance-readiness",
  "body-governance-ready",
  "body-governance-checks",
  "body-governance-posture",
  "body-governance-mutation",
  "body-governance-json",
];
const requiredClient = [
  "/system/route/body-governance-readiness",
  "refreshBodyGovernanceReadiness",
  "bodyGovernanceReady",
  "bodyGovernanceChecks",
  "bodyGovernancePosture",
  "bodyGovernanceMutation",
  "bodyGovernanceJson",
  "completedSlices",
  "completionClaim",
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
if (!readiness.ok || readiness.registry !== "openclaw-body-governance-readiness-v0") {
  throw new Error(`Observer source should expose body governance readiness registry: ${JSON.stringify(readiness)}`);
}
if (readiness.summary?.ready !== true) {
  throw new Error(`Observer-facing readiness should be ready: ${JSON.stringify(readiness.summary)}`);
}
if (readiness.governance?.createsTask !== false
  || readiness.governance?.hostMutation !== false
  || readiness.governance?.executesCommand !== false
  || readiness.governance?.triggersRecovery !== false) {
  throw new Error(`Observer-facing readiness must not execute or recover: ${JSON.stringify(readiness.governance)}`);
}

console.log(JSON.stringify({
  observerOpenClawBodyGovernanceReadiness: {
    status: "passed",
    panel: "Body Governance Readiness",
    registry: readiness.registry,
    ready: readiness.summary?.ready,
    checks: `${readiness.summary?.passedChecks}/${readiness.summary?.totalChecks}`,
    hostMutation: readiness.governance?.hostMutation,
  },
}, null, 2));
EOF
