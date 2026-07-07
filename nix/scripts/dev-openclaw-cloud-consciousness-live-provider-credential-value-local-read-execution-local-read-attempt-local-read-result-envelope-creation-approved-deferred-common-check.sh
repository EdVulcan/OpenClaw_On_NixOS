#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OBSERVER_CHECK="${PHASE105_OBSERVER_CHECK:-false}"
PORT_BASE="${PHASE105_PORT_BASE:-25400}"
PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_105_PLAN.md"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$PORT_BASE}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((PORT_BASE + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((PORT_BASE + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((PORT_BASE + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((PORT_BASE + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((PORT_BASE + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((PORT_BASE + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((PORT_BASE + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((PORT_BASE + 8))}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-105-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-approved-deferred-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-105-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-approved-deferred-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
RESULT_ENVELOPE_CREATION_TASK_REGISTRY="openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-task-v0"
RESULT_ENVELOPE_CREATION_APPROVED_DEFERRED_REGISTRY="openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-approved-deferred-v0"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${APPROVED_DEFERRED_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true

if [[ "$OBSERVER_CHECK" == "true" ]]; then
  "$SCRIPT_DIR/dev-up.sh"
  HTML_FILE="$(mktemp)"
  CLIENT_FILE="$(mktemp)"
  curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
  curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
  node - <<'EOF' "$RESULT_ENVELOPE_CREATION_TASK_REGISTRY" "$RESULT_ENVELOPE_CREATION_APPROVED_DEFERRED_REGISTRY" "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const resultEnvelopeCreationTaskRegistry = process.argv[2];
const resultEnvelopeCreationApprovedDeferredRegistry = process.argv[3];
const html = fs.readFileSync(process.argv[4], "utf8");
const client = fs.readFileSync(process.argv[5], "utf8");
for (const token of [
  "Cloud Consciousness Live Provider Credential Value Local Read Execution Local Read Attempt Local Read Result Envelope Creation Approved Deferred",
  "cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-approved-deferred-panel",
]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of [
  "/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-approved-deferred",
  "refreshCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationApprovedDeferred",
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-final-readiness-preflight",
  resultEnvelopeCreationTaskRegistry,
  resultEnvelopeCreationApprovedDeferredRegistry,
]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
console.log(JSON.stringify({ observerOpenClawCloudConsciousnessCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationApprovedDeferred: { status: "passed", resultEnvelopeCreationTaskRegistry, resultEnvelopeCreationApprovedDeferredRegistry } }, null, 2));
EOF
  exit 0
fi

rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
PHASE104_PORT_BASE="$PORT_BASE" OPENCLAW_CORE_STATE_FILE="$OPENCLAW_CORE_STATE_FILE" OPENCLAW_SYSTEM_HEAL_STATE_FILE="$OPENCLAW_SYSTEM_HEAL_STATE_FILE" \
  bash "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-task-shell-common-check.sh" >/dev/null

"$SCRIPT_DIR/dev-up.sh"
APPROVED_DEFERRED_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-approved-deferred" > "$APPROVED_DEFERRED_FILE"

node - <<'EOF' "$RESULT_ENVELOPE_CREATION_TASK_REGISTRY" "$RESULT_ENVELOPE_CREATION_APPROVED_DEFERRED_REGISTRY" "$PLAN_DOC" "$APPROVED_DEFERRED_FILE"
const fs = require("node:fs");
const resultEnvelopeCreationTaskRegistry = process.argv[2];
const resultEnvelopeCreationApprovedDeferredRegistry = process.argv[3];
const doc = fs.readFileSync(process.argv[4], "utf8");
const approvedDeferred = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
for (const token of [
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-approved-deferred",
  "Requires Phase 104 credential value local read execution local-read attempt local-read result envelope creation task shell evidence",
  "credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved: true",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 105 plan doc missing ${token}`);
}
const summary = approvedDeferred.summary ?? {};
if (
  !approvedDeferred.ok
  || approvedDeferred.registry !== resultEnvelopeCreationApprovedDeferredRegistry
  || approvedDeferred.status !== "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_approved_deferred_ready"
  || summary.ready !== true
  || summary.sourceRegistry !== resultEnvelopeCreationTaskRegistry
  || summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskCreated !== true
  || summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationTaskApproved !== true
  || summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationDeferred !== true
  || summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated !== false
  || summary.credentialValueRead !== false
  || summary.credentialValueIncluded !== false
  || summary.credentialValueExposed !== false
  || summary.providerCredentialRead !== false
  || summary.endpointContacted !== false
  || summary.networkEgress !== false
  || summary.liveProviderCallEnabled !== false
  || approvedDeferred.next?.recommendedSlice !== "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-final-readiness-preflight"
) {
  throw new Error(`Phase 105 should expose approved deferred result envelope creation evidence without reading credentials, creating envelopes, or egress: ${JSON.stringify(approvedDeferred)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationApprovedDeferred: { status: "passed", sourceTaskId: summary.sourceTaskId, resultEnvelopeCreationTaskRegistry, resultEnvelopeCreationApprovedDeferredRegistry } }, null, 2));
EOF
