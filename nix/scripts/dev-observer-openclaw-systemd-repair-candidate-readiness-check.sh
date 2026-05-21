#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6300}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6301}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6302}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6303}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6304}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6305}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6306}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6307}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6370}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-systemd-repair-candidate-readiness-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-systemd-repair-candidate-readiness-check.json}"

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
readiness="$(curl --silent --fail "$SYSTEM_URL/system/systemd/repair-candidate-readiness")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$readiness"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const readiness = JSON.parse(process.argv[4]);

const requiredHtml = [
  "Repair Candidate Readiness",
  "systemd-repair-candidate-readiness-panel",
  "systemd-repair-candidate-readiness-ready",
  "systemd-repair-candidate-readiness-checks",
  "systemd-repair-candidate-readiness-next",
  "systemd-repair-candidate-readiness-mutation",
  "systemd-repair-candidate-readiness-json",
];
const requiredClient = [
  "/system/systemd/repair-candidate-readiness",
  "refreshSystemdRepairCandidateReadiness",
  "systemdRepairCandidateReadinessReady",
  "systemdRepairCandidateReadinessChecks",
  "systemdRepairCandidateReadinessNext",
  "systemdRepairCandidateReadinessMutation",
  "systemdRepairCandidateReadinessJson",
  "openclaw-systemd-repair-candidate-route-review",
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
if (!readiness.ok || readiness.registry !== "openclaw-systemd-repair-candidate-readiness-v0") {
  throw new Error(`Observer source should expose candidate readiness registry: ${JSON.stringify(readiness)}`);
}
if (readiness.summary?.ready !== true || readiness.next?.recommendedSlice !== "openclaw-systemd-repair-candidate-route-review") {
  throw new Error(`Observer candidate readiness should be ready and route to review: ${JSON.stringify(readiness.summary)} next=${JSON.stringify(readiness.next)}`);
}
if (readiness.governance?.createsTask !== false
  || readiness.governance?.createsApproval !== false
  || readiness.governance?.executesCommand !== false
  || readiness.governance?.hostMutation !== false) {
  throw new Error(`Observer candidate readiness must remain read-only: ${JSON.stringify(readiness.governance)}`);
}

console.log(JSON.stringify({
  observerOpenClawSystemdRepairCandidateReadiness: {
    status: "passed",
    panel: "Repair Candidate Readiness",
    registry: readiness.registry,
    checks: `${readiness.summary?.passedChecks}/${readiness.summary?.totalChecks}`,
    next: readiness.next?.recommendedSlice,
    hostMutation: readiness.governance?.hostMutation,
  },
}, null, 2));
EOF
