#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9130}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9131}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9132}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9133}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9134}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9135}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9136}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9137}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9200}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-native-plugin-contract-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-native-plugin-contract-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${CONTRACT_FILE:-}" \
    "${SUMMARY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
CONTRACT_FILE="$(mktemp)"
SUMMARY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/openclaw-native-plugin-contract" > "$CONTRACT_FILE"
curl --silent --fail "$CORE_URL/plugins/openclaw-native-plugin-contract/summary" > "$SUMMARY_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$CONTRACT_FILE" "$SUMMARY_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const contractResponse = readJson(4);
const summaryResponse = readJson(5);

const requiredHtml = [
  "OpenClaw Native Plugin Contract",
  "native-plugin-contract-registry",
  "native-plugin-contract-owner",
  "native-plugin-contract-total",
  "native-plugin-contract-approval",
  "native-plugin-contract-mutation",
  "native-plugin-contract-validation",
  "native-plugin-contract-json",
];
const requiredClient = [
  "/plugins/openclaw-native-plugin-contract",
  "renderNativePluginContract",
  "refreshNativePluginContract",
  "Contract-only native plugin boundary: no plugin code is imported, registered, activated, or executed here.",
  "This is the OpenClawOnNixOS-owned shape that absorbed OpenClaw ideas must satisfy before runtime use.",
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

if (
  !contractResponse.ok
  || contractResponse.registry !== "openclaw-native-plugin-contract-v0"
  || contractResponse.mode !== "contract-only"
  || contractResponse.sourceRegistry !== "openclaw-native-plugin-registry-v0"
  || contractResponse.sourceMode !== "native-contract-registry"
) {
  throw new Error(`native plugin contract response mismatch: ${JSON.stringify(contractResponse)}`);
}

const contract = contractResponse.contract;
const governance = contract?.governance ?? {};
const summary = contractResponse.summary ?? {};
if (
  contract?.contractVersion !== "openclaw-native-plugin-contract-v0"
  || governance.runtimeOwner !== "openclaw_on_nixos"
  || governance.externalRuntimeDependencyAllowed !== false
  || governance.sourceContentImported !== false
  || governance.canCreateTasks !== false
  || governance.canCreateApprovals !== false
  || governance.canExecuteDuringRegistration !== false
  || governance.requiresHumanReviewBeforeActivation !== true
  || contractResponse.validation?.ok !== true
  || summary.validationOk !== true
  || summary.totalCapabilities !== 6
  || summary.approvalRequired !== 1
  || summary.mutationCapable !== 1
  || summary.executionCapable !== 1
  || summary.governance?.runtimeOwner !== "openclaw_on_nixos"
  || summary.governance?.externalRuntimeDependencyAllowed !== false
  || summary.governance?.canExecuteDuringRegistration !== false
) {
  throw new Error(`native plugin contract governance mismatch: ${JSON.stringify({ contract, summary, validation: contractResponse.validation })}`);
}

const capabilities = contract.capabilities ?? [];
if (
  capabilities.length !== 5
  || !capabilities.some((capability) => capability.id === "sense.plugin.manifest_profile" && capability.risk === "low" && capability.approval?.required === false)
  || !capabilities.some((capability) => capability.id === "sense.openclaw.tool_catalog" && capability.risk === "low" && capability.approval?.required === false)
  || !capabilities.some((capability) => capability.id === "sense.openclaw.prompt_pack" && capability.risk === "low" && capability.approval?.required === false)
  || !capabilities.some((capability) => capability.id === "sense.openclaw.plugin_manifest_map" && capability.risk === "low" && capability.approval?.required === false)
  || !capabilities.some((capability) => capability.id === "act.plugin.capability.invoke" && capability.risk === "high" && capability.approval?.required === true && capability.permissions?.commandExecution === true)
) {
  throw new Error(`native plugin contract capabilities mismatch: ${JSON.stringify(capabilities)}`);
}

if (JSON.stringify(contractResponse.summary) !== JSON.stringify(summaryResponse.summary)) {
  throw new Error(`native plugin contract list and summary endpoints should agree: ${JSON.stringify({ list: contractResponse.summary, summary: summaryResponse.summary })}`);
}

for (const forbidden of [
  "legacy_openclaw",
  "externalRuntimeDependencyAllowed=true",
  "registration executes plugin code",
]) {
  if (JSON.stringify(contractResponse).includes(forbidden) || html.includes(forbidden) || client.includes(forbidden)) {
    throw new Error(`Observer native plugin contract leaked forbidden ownership or execution language: ${forbidden}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawNativePluginContract: {
    htmlMetrics: requiredHtml,
    clientApis: [
      "/plugins/openclaw-native-plugin-contract",
      "renderNativePluginContract",
      "refreshNativePluginContract",
    ],
    summary,
    capabilities: capabilities.map((capability) => ({
      id: capability.id,
      kind: capability.kind,
      risk: capability.risk,
      approval: capability.approval?.required,
      runtimeOwner: capability.runtimeOwner,
    })),
  },
}, null, 2));
EOF
