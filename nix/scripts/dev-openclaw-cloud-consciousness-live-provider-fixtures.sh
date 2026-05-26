seed_live_provider_call_prerequisites() {
  local cloud_dir="$1"
  local provider_response_file="$2"
  local runbook_file="$3"
  local execution_plan_file="$4"
  local prefix="${5:-phase-live-provider-prereq}"

  mkdir -p "$cloud_dir"
  node - <<'EOF' "$provider_response_file" "$runbook_file" "$execution_plan_file" "$prefix"
const fs = require("node:fs");
const crypto = require("node:crypto");
const [providerResponseFile, runbookFile, executionPlanFile, prefix] = process.argv.slice(2);
function hash(record) {
  return crypto.createHash("sha256").update(JSON.stringify(record)).digest("hex");
}
const providerResponse = {
  id: `${prefix}-provider-response-rehearsal`,
  createdAt: new Date().toISOString(),
  schema: "openclaw.cloud_consciousness.provider_call_rehearsal.v0",
  requestId: `${prefix}-request`,
  requestContentHash: `${prefix}-request-hash`,
  governance: {
    networkCall: false,
    providerSdkLoaded: false,
    credentialRead: false,
    externalTransmissionAllowed: false
  },
  egressTranscript: {
    cloudCallExecuted: false,
    transmittedExternally: false,
    providerSdkLoaded: false,
    networkCallAttempted: false
  }
};
providerResponse.contentHash = hash(providerResponse);
fs.writeFileSync(providerResponseFile, JSON.stringify(providerResponse) + "\n");

const runbook = {
  id: `${prefix}-live-provider-runbook`,
  createdAt: new Date().toISOString(),
  schema: "openclaw.cloud_consciousness.live_provider_call_runbook.v0",
  governance: {
    networkCall: false,
    providerSdkLoaded: false,
    credentialRead: false,
    liveProviderCallEnabled: false,
    externalTransmissionAllowed: false
  }
};
runbook.contentHash = hash(runbook);
fs.writeFileSync(runbookFile, JSON.stringify(runbook) + "\n");

const executionPlan = {
  id: `${prefix}-live-provider-execution-plan`,
  createdAt: new Date().toISOString(),
  schema: "openclaw.cloud_consciousness.live_provider_call_execution_plan.v0",
  runbookRecordId: runbook.id,
  runbookContentHash: runbook.contentHash,
  endpointFingerprint: `${prefix}-endpoint-fingerprint`,
  credentialReference: "openclaw://credential/provider/live-provider-fixture",
  requestEnvelopeHash: `${prefix}-request-envelope-hash`,
  status: "execution_plan_recorded",
  governance: {
    networkCall: false,
    providerSdkLoaded: false,
    credentialRead: false,
    credentialValueRead: false,
    endpointContacted: false,
    liveProviderCallEnabled: false,
    externalTransmissionAllowed: false
  }
};
executionPlan.contentHash = hash(executionPlan);
fs.writeFileSync(executionPlanFile, JSON.stringify(executionPlan) + "\n");
EOF
}
