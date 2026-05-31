#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OBSERVER_CHECK="${PHASE48_OBSERVER_CHECK:-false}"
PORT_BASE="${PHASE48_PORT_BASE:-19160}"
CLOUD_DIR="$REPO_ROOT/.artifacts/openclaw-cloud-consciousness"
PROVIDER_RESPONSE_FILE="$CLOUD_DIR/provider-response-rehearsal.jsonl"
RUNBOOK_FILE="$CLOUD_DIR/live-provider-call-runbook.jsonl"
EXECUTION_PLAN_FILE="$CLOUD_DIR/live-provider-call-execution-plan.jsonl"
PLAN_DOC="$REPO_ROOT/docs/plans/OPENCLAW_PHASE_48_PLAN.md"
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
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-48-rollback-note-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-48-rollback-note-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"
REGISTRY="openclaw-cloud-consciousness-live-provider-rollback-note-v0"

. "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-fixtures.sh"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
seed_live_provider_call_prerequisites "$CLOUD_DIR" "$PROVIDER_RESPONSE_FILE" "$RUNBOOK_FILE" "$EXECUTION_PLAN_FILE" "phase48-prereq"
cleanup() {
  rm -f "${DATA_FILE:-}" "${HTML_FILE:-}" "${CLIENT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT
"$SCRIPT_DIR/dev-up.sh"

DATA_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/cloud-consciousness/live-provider-rollback-note" > "$DATA_FILE"

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
  "Cloud Consciousness Live Provider Rollback Note",
  "cloud-consciousness-live-provider-rollback-note-panel",
  "cloud-live-provider-rollback-note-ready",
]) {
  if (!html.includes(token)) throw new Error(`Observer HTML missing ${token}`);
}
for (const token of [
  "/cloud-consciousness/live-provider-rollback-note",
  "refreshCloudConsciousnessLiveProviderRollbackNote",
  registry,
]) {
  if (!client.includes(token)) throw new Error(`Observer client missing ${token}`);
}
if (!data.ok || data.summary?.ready !== true || data.summary?.rollbackNoteReady !== true) {
  throw new Error(`Observer Phase 48 endpoint should be ready and note-only: ${JSON.stringify(data.summary)}`);
}
console.log(JSON.stringify({ observerOpenClawCloudConsciousnessLiveProviderRollbackNote: { status: "passed", registry } }, null, 2));
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
  "openclaw-cloud-consciousness-live-provider-rollback-note",
  "buildRollbackNote",
  "operator-visible",
]) {
  if (!doc.includes(token)) throw new Error(`Phase 48 plan doc missing ${token}`);
}
for (const token of [
  "export function buildRollbackNote",
  "ROLLBACK_NOTE_BUILDER_REGISTRY",
  "openclaw.cloud_consciousness.live_provider_rollback_note.v0",
]) {
  if (!moduleSource.includes(token)) throw new Error(`Runtime adapter module missing rollback note token: ${token}`);
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
  "providerResponseCreated: true",
  "rollbackExecuted: true",
  "rollbackCommandCreated: true",
  "hostMutation: true",
  "liveProviderCallEnabled: true",
]) {
  if (moduleSource.includes(forbidden)) throw new Error(`Rollback note builder contains forbidden live token: ${forbidden}`);
}
if (!data.ok || data.registry !== registry) {
  throw new Error(`Unexpected Phase 48 registry: ${JSON.stringify({ ok: data.ok, registry: data.registry })}`);
}
if (
  data.summary?.ready !== true
  || data.summary?.completionPercent !== 100
  || data.summary?.rollbackNoteReady !== true
  || data.summary?.localOnly !== true
  || data.summary?.rollbackRequired !== false
  || data.summary?.rollbackExecuted !== false
  || data.summary?.rollbackCommandCreated !== false
  || data.summary?.hostMutation !== false
  || data.summary?.dispatchDeferred !== true
  || data.summary?.credentialValueIncluded !== false
  || data.summary?.credentialValueRead !== false
  || data.summary?.credentialValueExposed !== false
  || data.summary?.providerCredentialRead !== false
  || data.summary?.endpointContacted !== false
  || data.summary?.networkEgress !== false
  || data.summary?.providerResponseCreated !== false
  || data.summary?.liveProviderCallEnabled !== false
  || data.rollbackNote?.note?.rollbackCommand !== null
  || data.rollbackNote?.note?.rollbackExecuted !== false
  || typeof data.rollbackNote?.note?.contentHash !== "string"
  || typeof data.rollbackNote?.note?.responseRecordId !== "string"
) {
  throw new Error(`Phase 48 rollback note should remain local-only and non-executing: ${JSON.stringify(data.summary)}`);
}
console.log(JSON.stringify({ openclawCloudConsciousnessLiveProviderRollbackNote: { status: "passed", registry, noteId: data.rollbackNote.note.id } }, null, 2));
EOF
