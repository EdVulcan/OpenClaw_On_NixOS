#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OBSERVER_CHECK="${PHASE36_OBSERVER_CHECK:-false}"
PORT_BASE="${PHASE36_PORT_BASE:-8820}"
CLOUD_DIR="$REPO_ROOT/.artifacts/openclaw-cloud-consciousness"
PROVIDER_RESPONSE_FILE="$CLOUD_DIR/provider-response-rehearsal.jsonl"
RUNBOOK_FILE="$CLOUD_DIR/live-provider-call-runbook.jsonl"
EXECUTION_PLAN_FILE="$CLOUD_DIR/live-provider-call-execution-plan.jsonl"
PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_36_PLAN.md"
MODULE_FILE="$REPO_ROOT/services/openclaw-core/src/cloud-live-provider-runtime-adapter.mjs"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$PORT_BASE}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((PORT_BASE + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((PORT_BASE + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((PORT_BASE + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((PORT_BASE + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((PORT_BASE + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((PORT_BASE + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((PORT_BASE + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((PORT_BASE + 8))}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-36-no-network-sender-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-36-no-network-sender-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
REGISTRY="openclaw-cloud-consciousness-live-provider-send-provider-request-v0"

. "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-fixtures.sh"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
seed_live_provider_call_prerequisites "$CLOUD_DIR" "$PROVIDER_RESPONSE_FILE" "$RUNBOOK_FILE" "$EXECUTION_PLAN_FILE" "phase36-prereq"
cleanup() {
  rm -f "${DATA_FILE:-}" "${HTML_FILE:-}" "${CLIENT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT
"$SCRIPT_DIR/dev-up.sh"

DATA_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-no-network-sender" > "$DATA_FILE"

if [[ "$OBSERVER_CHECK" == "true" ]]; then
  HTML_FILE="$(mktemp)"
  CLIENT_FILE="$(mktemp)"
  curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
  curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
  node - <<'EOF' "$REGISTRY" "$DATA_FILE" "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const registry = process.argv[2];
const data = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const html = fs.readFileSync(process.argv[4], "utf8");
const client = fs.readFileSync(process.argv[5], "utf8");
for (const token of [
  "Cloud Consciousness Live Provider No-Network Sender",
  "cloud-consciousness-live-provider-no-network-sender-panel",
  "cloud-live-provider-no-network-sender-ready",
]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of [
  "/cloud-consciousness/live-provider-no-network-sender",
  "refreshCloudConsciousnessLiveProviderNoNetworkSender",
  registry,
]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
if (!data.ok || data.summary?.ready !== true) {
  throw new Error(`Observer Phase 36 endpoint should be ready: ${JSON.stringify(data.summary)}`);
}
console.log(JSON.stringify({ observerOpenClawCloudConsciousnessLiveProviderNoNetworkSender: { status: "passed", registry } }, null, 2));
EOF
  exit 0
fi

node - <<'EOF' "$REGISTRY" "$PLAN_DOC" "$MODULE_FILE" "$DATA_FILE"
const fs = require("node:fs");
const registry = process.argv[2];
const doc = fs.readFileSync(process.argv[3], "utf8");
const moduleSource = fs.readFileSync(process.argv[4], "utf8");
const data = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-live-provider-no-network-sender",
  "sendProviderRequest",
  "performs no live provider activity",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 36 plan doc missing ${token}`);
}
for (const token of [
  "export function sendProviderRequest",
  "PROVIDER_REQUEST_SENDER_REGISTRY",
  "dispatch: \"deferred\"",
]) {
  if (!moduleSource.includes(token)) throw new Error(`Runtime adapter module missing no-network sender token: ${token}`);
}
for (const forbidden of [
  "fetch(",
  "http.request",
  "https.request",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "credentialValueRead: true",
  "credentialValueExposed: true",
  "providerCredentialRead: true",
  "endpointContacted: true",
  "networkEgress: true",
  "liveProviderCallEnabled: true",
]) {
  if (moduleSource.includes(forbidden)) throw new Error(`No-network sender contains forbidden live token: ${forbidden}`);
}
if (!data.ok || data.registry !== registry) {
  throw new Error(`Unexpected Phase 36 registry: ${JSON.stringify({ ok: data.ok, registry: data.registry })}`);
}
if (
  data.summary?.ready !== true
  || data.summary?.completionPercent !== 100
  || data.summary?.noNetworkProviderRequestSenderReady !== true
  || data.summary?.dispatchDeferred !== true
  || data.summary?.referenceOnly !== true
  || data.summary?.credentialValueIncluded !== false
  || data.summary?.credentialValueRead !== false
  || data.summary?.credentialValueExposed !== false
  || data.summary?.providerCredentialRead !== false
  || data.summary?.endpointContacted !== false
  || data.summary?.networkEgress !== false
  || data.summary?.liveProviderCallEnabled !== false
  || data.egressEnvelope?.egressEnvelope?.dispatch !== "deferred"
  || data.egressEnvelope?.egressEnvelope?.credentialValue !== null
  || data.egressEnvelope?.egressEnvelope?.endpoint?.contacted !== false
  || data.egressEnvelope?.egressEnvelope?.response !== null
) {
  throw new Error(`Phase 36 no-network sender should remain deferred and non-live: ${JSON.stringify(data.summary)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessLiveProviderNoNetworkSender: { status: "passed", registry } }, null, 2));
EOF
