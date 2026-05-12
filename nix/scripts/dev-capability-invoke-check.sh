#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/capability-invoke-fixture"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6900}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6901}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6902}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6903}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6904}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6905}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6906}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6907}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6970}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-capability-invoke-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-capability-invoke-check-events.jsonl}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR/nested"
printf 'OpenClaw capability invoke fixture\n' > "$FIXTURE_DIR/openclaw-capability-invoke.txt"
printf 'Nested invoke search fixture\n' > "$FIXTURE_DIR/nested/search-note.md"

cleanup() {
  rm -f \
    "${VITALS_FILE:-}" \
    "${FILES_FILE:-}" \
    "${SEARCH_FILE:-}" \
    "${PROCESS_FILE:-}" \
    "${BLOCKED_COMMAND_FILE:-}" \
    "${APPROVED_COMMAND_FILE:-}" \
    "${EVENTS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

"$SCRIPT_DIR/dev-up.sh"

VITALS_FILE="$(mktemp)"
FILES_FILE="$(mktemp)"
SEARCH_FILE="$(mktemp)"
PROCESS_FILE="$(mktemp)"
BLOCKED_COMMAND_FILE="$(mktemp)"
APPROVED_COMMAND_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

post_json "$CORE_URL/capabilities/invoke" '{"capabilityId":"sense.system.vitals","intent":"system.observe"}' > "$VITALS_FILE"
post_json "$CORE_URL/capabilities/invoke" "{\"capabilityId\":\"sense.filesystem.read\",\"intent\":\"filesystem.list\",\"operation\":\"list\",\"params\":{\"path\":\"$FIXTURE_DIR\",\"limit\":10}}" > "$FILES_FILE"
post_json "$CORE_URL/capabilities/invoke" "{\"capabilityId\":\"sense.filesystem.read\",\"intent\":\"filesystem.search\",\"operation\":\"search\",\"params\":{\"path\":\"$FIXTURE_DIR\",\"query\":\"search-note\",\"limit\":10}}" > "$SEARCH_FILE"
post_json "$CORE_URL/capabilities/invoke" '{"capabilityId":"sense.process.list","intent":"process.list","params":{"limit":20}}' > "$PROCESS_FILE"
post_json "$CORE_URL/capabilities/invoke" '{"capabilityId":"act.system.command.dry_run","intent":"system.command","params":{"command":"rm","args":["-rf","/tmp/openclaw-danger"]}}' > "$BLOCKED_COMMAND_FILE"
post_json "$CORE_URL/capabilities/invoke" '{"capabilityId":"act.system.command.dry_run","intent":"system.command","approved":true,"params":{"command":"rm","args":["-rf","/tmp/openclaw-danger"]}}' > "$APPROVED_COMMAND_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?source=openclaw-core&limit=80" > "$EVENTS_FILE"

node - <<'EOF' \
  "$VITALS_FILE" \
  "$FILES_FILE" \
  "$SEARCH_FILE" \
  "$PROCESS_FILE" \
  "$BLOCKED_COMMAND_FILE" \
  "$APPROVED_COMMAND_FILE" \
  "$EVENTS_FILE" \
  "$FIXTURE_DIR"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const vitals = readJson(2);
const files = readJson(3);
const search = readJson(4);
const processes = readJson(5);
const blockedCommand = readJson(6);
const approvedCommand = readJson(7);
const events = readJson(8);
const fixtureDir = process.argv[9];

if (!vitals.ok || vitals.invoked !== true || vitals.capability?.id !== "sense.system.vitals" || vitals.policy?.decision !== "audit_only") {
  throw new Error("system vitals capability should be invoked with audit-only governance");
}
if (!files.ok || files.invoked !== true || files.result?.path !== fixtureDir || !files.result?.entries?.some((entry) => entry.name === "nested")) {
  throw new Error("filesystem list capability should route through core to allowed fixture root");
}
if (files.policy?.decision !== "audit_only" || files.summary?.kind !== "filesystem.read") {
  throw new Error("filesystem list invocation should remain audited and summarized");
}
if (!search.ok || search.result?.count < 1 || !search.result?.results?.some((entry) => entry.name === "search-note.md")) {
  throw new Error("filesystem search capability should find nested fixture");
}
if (!processes.ok || processes.invoked !== true || processes.result?.count < 1 || processes.summary?.kind !== "process.list") {
  throw new Error("process list capability should route through core");
}
if (!blockedCommand.ok || blockedCommand.invoked !== false || blockedCommand.blocked !== true || blockedCommand.reason !== "policy_requires_approval") {
  throw new Error("unapproved command dry-run capability should be blocked by policy");
}
if (blockedCommand.policy?.decision !== "require_approval") {
  throw new Error("blocked command dry-run should expose require_approval decision");
}
if (!approvedCommand.ok || approvedCommand.invoked !== true || approvedCommand.policy?.decision !== "audit_only") {
  throw new Error("approved command dry-run should invoke under audit-only governance");
}
if (approvedCommand.result?.plan?.wouldExecute !== false || approvedCommand.summary?.wouldExecute !== false) {
  throw new Error("approved command capability must still be dry-run only");
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["policy.evaluated", "capability.invoked", "capability.blocked"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  capabilityInvoke: {
    vitals: {
      invoked: vitals.invoked,
      policy: vitals.policy.decision,
      alerts: vitals.summary.alerts,
    },
    filesystem: {
      path: files.result.path,
      entries: files.result.count,
      searchResults: search.result.count,
      policy: files.policy.decision,
    },
    process: {
      count: processes.result.count,
      policy: processes.policy.decision,
    },
    commandDryRun: {
      blockedReason: blockedCommand.reason,
      approvedPolicy: approvedCommand.policy.decision,
      wouldExecute: approvedCommand.summary.wouldExecute,
    },
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("capability.") || type === "policy.evaluated"),
}, null, 2));
EOF
