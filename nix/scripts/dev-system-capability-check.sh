#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/system-capability-fixture"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6600}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6601}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6602}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6603}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6604}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6605}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6606}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6607}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6670}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-system-capability-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-system-capability-check-events.jsonl}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"
SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR/nested"
printf 'OpenClaw system capability fixture\n' > "$FIXTURE_DIR/openclaw-system-capability.txt"
printf 'Nested body sense fixture\n' > "$FIXTURE_DIR/nested/process-note.md"

cleanup() {
  rm -f \
    "${METADATA_FILE:-}" \
    "${LIST_FILE:-}" \
    "${SEARCH_FILE:-}" \
    "${ESCAPE_FILE:-}" \
    "${PROCESSES_FILE:-}" \
    "${DRY_SAFE_FILE:-}" \
    "${DRY_RISKY_FILE:-}" \
    "${CAPABILITIES_FILE:-}" \
    "${EVENTS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

METADATA_FILE="$(mktemp)"
LIST_FILE="$(mktemp)"
SEARCH_FILE="$(mktemp)"
ESCAPE_FILE="$(mktemp)"
PROCESSES_FILE="$(mktemp)"
DRY_SAFE_FILE="$(mktemp)"
DRY_RISKY_FILE="$(mktemp)"
CAPABILITIES_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

curl --silent --fail "$SYSTEM_URL/system/files/metadata?path=$FIXTURE_DIR/openclaw-system-capability.txt" > "$METADATA_FILE"
curl --silent --fail "$SYSTEM_URL/system/files/list?path=$FIXTURE_DIR&limit=10" > "$LIST_FILE"
curl --silent --fail "$SYSTEM_URL/system/files/search?path=$FIXTURE_DIR&query=process-note&limit=10" > "$SEARCH_FILE"
curl --silent "$SYSTEM_URL/system/files/list?path=/etc&limit=5" > "$ESCAPE_FILE"
curl --silent --fail "$SYSTEM_URL/system/processes?limit=20" > "$PROCESSES_FILE"
curl --silent --fail -X POST "$SYSTEM_URL/system/command/dry-run" -H 'content-type: application/json' -d '{"command":"ls","args":["-la"],"intent":"system.command"}' > "$DRY_SAFE_FILE"
curl --silent --fail -X POST "$SYSTEM_URL/system/command/dry-run" -H 'content-type: application/json' -d '{"command":"rm","args":["-rf","/tmp/openclaw-danger"],"intent":"system.command"}' > "$DRY_RISKY_FILE"
curl --silent --fail "$CORE_URL/capabilities" > "$CAPABILITIES_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?source=openclaw-system-sense&limit=20" > "$EVENTS_FILE"

node - <<'EOF' \
  "$METADATA_FILE" \
  "$LIST_FILE" \
  "$SEARCH_FILE" \
  "$ESCAPE_FILE" \
  "$PROCESSES_FILE" \
  "$DRY_SAFE_FILE" \
  "$DRY_RISKY_FILE" \
  "$CAPABILITIES_FILE" \
  "$EVENTS_FILE" \
  "$FIXTURE_DIR"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const metadata = readJson(2);
const list = readJson(3);
const search = readJson(4);
const escape = readJson(5);
const processes = readJson(6);
const drySafe = readJson(7);
const dryRisky = readJson(8);
const capabilities = readJson(9);
const events = readJson(10);
const fixtureDir = process.argv[11];

if (!metadata.ok || metadata.metadata?.type !== "file" || metadata.metadata?.name !== "openclaw-system-capability.txt") {
  throw new Error("metadata endpoint should describe the fixture file");
}
if (!list.ok || list.path !== fixtureDir || !list.entries?.some((entry) => entry.name === "nested" && entry.type === "directory")) {
  throw new Error("list endpoint should expose allowed fixture directory entries");
}
if (!search.ok || search.count < 1 || !search.results?.some((entry) => entry.name === "process-note.md")) {
  throw new Error("search endpoint should find nested fixture file");
}
if (escape.ok !== false || !String(escape.error ?? "").includes("outside allowed")) {
  throw new Error("filesystem sense should reject paths outside allowed roots");
}
if (!processes.ok || processes.count < 1 || !Array.isArray(processes.items) || typeof processes.items[0].pid !== "number") {
  throw new Error("process list should expose local process summaries");
}
if (!drySafe.ok || drySafe.plan?.wouldExecute !== false || drySafe.plan?.risk !== "low" || drySafe.plan?.governance !== "audit_only") {
  throw new Error("safe dry-run command should be audit-only and never execute");
}
if (!dryRisky.ok || dryRisky.plan?.wouldExecute !== false || dryRisky.plan?.risk !== "high" || dryRisky.plan?.requiresApproval !== true) {
  throw new Error("risky dry-run command should require approval and never execute");
}

const byId = Object.fromEntries((capabilities.capabilities ?? []).map((capability) => [capability.id, capability]));
for (const id of ["sense.filesystem.read", "sense.process.list", "act.system.command.dry_run"]) {
  if (!byId[id]) {
    throw new Error(`capability registry missing ${id}`);
  }
}
if (byId["act.system.command.dry_run"].governance !== "require_approval" || byId["act.system.command.dry_run"].requiresApproval !== true) {
  throw new Error("command dry-run capability should be approval-gated");
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["system.files.listed", "system.files.searched", "system.processes.listed", "system.command.planned"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}

console.log(JSON.stringify({
  systemCapabilities: {
    allowedRoot: fixtureDir,
    fileEntries: list.count,
    searchResults: search.count,
    processCount: processes.count,
    rejectedEscape: escape.ok === false,
  },
  dryRun: {
    safe: {
      risk: drySafe.plan.risk,
      governance: drySafe.plan.governance,
      wouldExecute: drySafe.plan.wouldExecute,
    },
    risky: {
      risk: dryRisky.plan.risk,
      governance: dryRisky.plan.governance,
      requiresApproval: dryRisky.plan.requiresApproval,
      wouldExecute: dryRisky.plan.wouldExecute,
    },
  },
  capabilityRegistry: {
    filesystem: byId["sense.filesystem.read"].status,
    process: byId["sense.process.list"].status,
    commandDryRun: byId["act.system.command.dry_run"].governance,
    total: capabilities.summary?.total ?? null,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("system.")),
}, null, 2));
EOF
