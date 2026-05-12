#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-7200}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-7201}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-7202}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-7203}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-7204}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-7205}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-7206}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-7207}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-7270}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-capability-history-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-observer-capability-history-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${VITALS_FILE:-}" \
    "${BLOCKED_FILE:-}" \
    "${HISTORY_FILE:-}" \
    "${RESTORED_HISTORY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
VITALS_FILE="$(mktemp)"
BLOCKED_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
RESTORED_HISTORY_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
post_json "$CORE_URL/capabilities/invoke" '{"capabilityId":"sense.system.vitals","intent":"system.observe"}' > "$VITALS_FILE"
post_json "$CORE_URL/capabilities/invoke" '{"capabilityId":"act.system.command.dry_run","intent":"system.command","params":{"command":"rm","args":["-rf","/tmp/openclaw-danger"]}}' > "$BLOCKED_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=8" > "$HISTORY_FILE"

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$CORE_URL/capabilities/invocations?limit=8" > "$RESTORED_HISTORY_FILE"

node - <<'EOF' \
  "$HTML_FILE" \
  "$CLIENT_FILE" \
  "$VITALS_FILE" \
  "$BLOCKED_FILE" \
  "$HISTORY_FILE" \
  "$RESTORED_HISTORY_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const vitals = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const blocked = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const history = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const restoredHistory = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));

for (const token of [
  "Capability History",
  "capability-history-total",
  "capability-history-invoked",
  "capability-history-blocked",
  "capability-history-latest",
  "capability-history-json",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}

for (const token of [
  "/capabilities/invocations?limit=8",
  "renderCapabilityHistory",
  "refreshCapabilityHistory",
  "byCapability",
  "byPolicy",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}

if (!vitals.invocation?.id || vitals.invocation?.capability?.id !== "sense.system.vitals") {
  throw new Error("vitals invocation should expose a history record for Observer");
}
if (!blocked.invocation?.id || blocked.invocation?.blocked !== true || blocked.invocation?.reason !== "policy_requires_approval") {
  throw new Error("blocked invocation should expose policy_requires_approval history for Observer");
}
if (history.summary?.total !== 2 || history.summary?.invoked !== 1 || history.summary?.blocked !== 1) {
  throw new Error(`unexpected capability history summary: ${JSON.stringify(history.summary)}`);
}
if (!history.items?.some((item) => item.capability?.id === "sense.system.vitals" && item.invoked === true)) {
  throw new Error("history should include invoked vitals entry");
}
if (!history.items?.some((item) => item.capability?.id === "act.system.command.dry_run" && item.blocked === true)) {
  throw new Error("history should include blocked command dry-run entry");
}
if (restoredHistory.summary?.total !== history.summary?.total || restoredHistory.summary?.blocked !== history.summary?.blocked) {
  throw new Error("Observer capability history source should survive restart");
}

console.log(JSON.stringify({
  observerCapabilityHistory: {
    htmlMetrics: [
      "capability-history-total",
      "capability-history-invoked",
      "capability-history-blocked",
      "capability-history-latest",
    ],
    clientApis: [
      "/capabilities/invocations?limit=8",
      "renderCapabilityHistory",
      "refreshCapabilityHistory",
    ],
    before: history.summary,
    after: restoredHistory.summary,
  },
  examples: {
    vitalsInvocation: vitals.invocation.id,
    blockedReason: blocked.invocation.reason,
  },
}, null, 2));
EOF
