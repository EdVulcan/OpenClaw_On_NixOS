#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6080}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6081}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6082}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6083}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6084}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6085}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6086}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6087}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6150}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-conservative-recovery-policy-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-conservative-recovery-policy-check.json}"

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
policy="$(curl --silent --fail "$SYSTEM_URL/system/route/recovery-policy")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$policy"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const policy = JSON.parse(process.argv[4]);

const requiredHtml = [
  "Recovery Policy",
  "conservative-recovery-policy",
  "recovery-policy-posture",
  "recovery-policy-creates-task",
  "recovery-policy-executes-command",
  "recovery-policy-mutation",
  "recovery-policy-json",
];
const requiredClient = [
  "/system/route/recovery-policy",
  "refreshConservativeRecoveryPolicy",
  "recoveryPolicyPosture",
  "recoveryPolicyCreatesTask",
  "recoveryPolicyExecutesCommand",
  "recoveryPolicyMutation",
  "recoveryPolicyJson",
  "noTaskCreation",
  "noCommandExecution",
  "noHostMutation",
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
if (!policy.ok || policy.registry !== "openclaw-conservative-recovery-policy-v0") {
  throw new Error(`Observer source should expose conservative recovery policy registry: ${JSON.stringify(policy)}`);
}
if (policy.governance?.createsTask !== false
  || policy.governance?.hostMutation !== false
  || policy.governance?.executesCommand !== false
  || policy.governance?.triggersRecovery !== false) {
  throw new Error(`Observer-facing recovery policy must not execute or recover: ${JSON.stringify(policy.governance)}`);
}
if (!policy.hardBoundaries?.noAutomaticRepair || !policy.hardBoundaries?.noTaskCreation) {
  throw new Error(`Observer-facing recovery policy should expose hard boundaries: ${JSON.stringify(policy.hardBoundaries)}`);
}

console.log(JSON.stringify({
  observerOpenClawConservativeRecoveryPolicyExplanation: {
    status: "passed",
    panel: "Recovery Policy",
    registry: policy.registry,
    posture: policy.policy?.currentPosture,
    createsTask: policy.governance?.createsTask,
    hostMutation: policy.governance?.hostMutation,
  },
}, null, 2));
EOF
