#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9030}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9031}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9032}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9033}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9034}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9035}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9036}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9037}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9100}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-maintenance-scheduler-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-sovereign-maintenance-scheduler-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-maintenance-scheduler-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
HEAL_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_HEAL_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f \
  "$OPENCLAW_CORE_STATE_FILE" \
  "$OPENCLAW_CORE_STATE_FILE.tmp" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp" \
  "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${BODY_FILE:-}" \
    "${DISABLED_TICK_FILE:-}" \
    "${POLICY_FILE:-}" \
    "${NOT_DUE_TICK_FILE:-}" \
    "${FORCED_TICK_FILE:-}" \
    "${CAPABILITY_TICK_FILE:-}" \
    "${STATE_FILE:-}" \
    "${HISTORY_FILE:-}" \
    "${EVENTS_FILE:-}" \
    "${POST_RESTART_POLICY_FILE:-}" \
    "${POST_RESTART_STATE_FILE:-}" \
    "${POST_RESTART_HISTORY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local file="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data-binary "@$file"
}

post_inline() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

"$SCRIPT_DIR/dev-up.sh"

BODY_FILE="$(mktemp)"
DISABLED_TICK_FILE="$(mktemp)"
POLICY_FILE="$(mktemp)"
NOT_DUE_TICK_FILE="$(mktemp)"
FORCED_TICK_FILE="$(mktemp)"
CAPABILITY_TICK_FILE="$(mktemp)"
STATE_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"
POST_RESTART_POLICY_FILE="$(mktemp)"
POST_RESTART_STATE_FILE="$(mktemp)"
POST_RESTART_HISTORY_FILE="$(mktemp)"

node - <<'EOF' > "$BODY_FILE"
const now = new Date().toISOString();
const system = {
  timestamp: now,
  body: {
    hostname: "sovereign-maintenance-scheduler-body",
    platform: "linux",
    release: "test",
    arch: "x64",
    uptimeSeconds: 720,
    processUptimeSeconds: 15,
    pid: 9090,
    node: process.version,
    stateDir: "/var/lib/openclaw",
    diskPath: "/var/lib/openclaw",
  },
  services: {
    core: {
      name: "core",
      ok: true,
      status: "healthy",
      url: "http://127.0.0.1:9030",
      detail: "openclaw-core",
      stage: "active",
      latencyMs: 2,
      checkedAt: now,
    },
    sessionManager: {
      name: "sessionManager",
      ok: false,
      status: "offline",
      url: "http://127.0.0.1:9032",
      detail: "offline",
      stage: null,
      latencyMs: 1500,
      checkedAt: now,
    },
  },
  resources: {
    cpuPercent: 5,
    cpuCores: 4,
    loadAverage: [0.01, 0.02, 0.03],
    memoryPercent: 31,
    memory: {
      totalBytes: 100,
      freeBytes: 69,
      usedBytes: 31,
    },
    diskPercent: 24,
    disk: {
      path: "/var/lib/openclaw",
      available: true,
    },
  },
  network: {
    online: true,
    checkedTargets: 8,
  },
  alerts: [],
};

process.stdout.write(JSON.stringify({ system, autofix: true, mode: "simulated" }, null, 2));
EOF

post_json "$HEAL_URL/maintenance/tick" "$BODY_FILE" > "$DISABLED_TICK_FILE"
post_inline "$HEAL_URL/maintenance/policy" '{"enabled":true,"intervalMs":600000,"autofix":true,"mode":"simulated","resetSchedule":true}' > "$POLICY_FILE"
post_json "$HEAL_URL/maintenance/tick" "$BODY_FILE" > "$NOT_DUE_TICK_FILE"
post_inline "$HEAL_URL/maintenance/tick" "$(node - <<'EOF' "$BODY_FILE"
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
body.force = true;
process.stdout.write(JSON.stringify(body));
EOF
)" > "$FORCED_TICK_FILE"

post_inline "$CORE_URL/capabilities/invoke" "$(node - <<'EOF' "$BODY_FILE"
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
process.stdout.write(JSON.stringify({
  capabilityId: "act.system.heal",
  intent: "heal.maintenance.tick",
  operation: "tick",
  params: {
    ...body,
    force: true,
  },
}));
EOF
)" > "$CAPABILITY_TICK_FILE"

curl --silent --fail "$HEAL_URL/maintenance/state" > "$STATE_FILE"
curl --silent --fail "$HEAL_URL/maintenance/history?limit=8" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=120" > "$EVENTS_FILE"

node - <<'EOF' "$DISABLED_TICK_FILE" "$POLICY_FILE" "$NOT_DUE_TICK_FILE" "$FORCED_TICK_FILE" "$CAPABILITY_TICK_FILE" "$STATE_FILE" "$HISTORY_FILE" "$EVENTS_FILE"
const fs = require("node:fs");
const disabledTick = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const policy = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const notDueTick = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const forcedTick = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const capabilityTick = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const state = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
const history = JSON.parse(fs.readFileSync(process.argv[8], "utf8"));
const events = JSON.parse(fs.readFileSync(process.argv[9], "utf8"));

if (!disabledTick.ok || disabledTick.tick?.status !== "skipped" || disabledTick.tick?.reason !== "maintenance_policy_disabled" || disabledTick.run !== null) {
  throw new Error(`disabled scheduler tick should skip safely: ${JSON.stringify(disabledTick)}`);
}
if (!policy.ok || policy.policy?.enabled !== true || policy.policy?.intervalMs !== 600000 || !policy.policy?.nextDueAt) {
  throw new Error(`maintenance policy should enable persisted scheduling: ${JSON.stringify(policy)}`);
}
if (!notDueTick.ok || notDueTick.tick?.status !== "skipped" || notDueTick.tick?.reason !== "maintenance_not_due" || notDueTick.run !== null) {
  throw new Error(`not-due scheduler tick should skip without running: ${JSON.stringify(notDueTick)}`);
}
if (!forcedTick.ok || forcedTick.tick?.status !== "ran" || forcedTick.tick?.reason !== "forced" || forcedTick.run?.status !== "repaired") {
  throw new Error(`forced scheduler tick should run conservative maintenance: ${JSON.stringify(forcedTick)}`);
}
if (forcedTick.run?.autonomy?.approvalRequired !== false || forcedTick.run?.autonomy?.governance !== "audit_only") {
  throw new Error(`forced scheduler run should remain autonomous audit-only: ${JSON.stringify(forcedTick.run?.autonomy)}`);
}
if (!capabilityTick.ok || capabilityTick.invoked !== true || capabilityTick.summary?.status !== "ran" || capabilityTick.summary?.tickReason !== "forced") {
  throw new Error(`core capability should invoke maintenance tick: ${JSON.stringify(capabilityTick)}`);
}
if (!state.ok || state.policy?.enabled !== true || state.policy?.lastTick?.status !== "ran" || state.runCount !== 2) {
  throw new Error(`maintenance scheduler state should expose latest tick and two runs: ${JSON.stringify(state)}`);
}
if (!history.ok || history.count !== 2 || history.items?.some((run) => run.autonomy?.approvalRequired !== false)) {
  throw new Error(`maintenance scheduler history should contain two autonomous runs: ${JSON.stringify(history)}`);
}
const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["maintenance.policy.updated", "maintenance.tick", "maintenance.started", "maintenance.completed", "capability.invoked"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`maintenance scheduler audit log missing ${type}`);
  }
}
EOF

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$HEAL_URL/maintenance/policy" > "$POST_RESTART_POLICY_FILE"
curl --silent --fail "$HEAL_URL/maintenance/state" > "$POST_RESTART_STATE_FILE"
curl --silent --fail "$HEAL_URL/maintenance/history?limit=8" > "$POST_RESTART_HISTORY_FILE"

node - <<'EOF' "$STATE_FILE" "$POST_RESTART_POLICY_FILE" "$POST_RESTART_STATE_FILE" "$POST_RESTART_HISTORY_FILE"
const fs = require("node:fs");
const stateBefore = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const policyAfter = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const stateAfter = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const historyAfter = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

if (!policyAfter.ok || policyAfter.policy?.enabled !== true || policyAfter.policy?.intervalMs !== 600000 || policyAfter.policy?.lastTick?.status !== "ran") {
  throw new Error(`maintenance policy should survive restart: ${JSON.stringify(policyAfter)}`);
}
if (!stateAfter.ok || stateAfter.runCount !== stateBefore.runCount || stateAfter.policy?.nextDueAt !== stateBefore.policy?.nextDueAt) {
  throw new Error(`maintenance scheduler state should survive restart: ${JSON.stringify({ stateBefore, stateAfter })}`);
}
if (!historyAfter.ok || historyAfter.count !== 2 || historyAfter.items?.length !== 2) {
  throw new Error(`maintenance scheduler history should survive restart: ${JSON.stringify(historyAfter)}`);
}

console.log(JSON.stringify({
  sovereignMaintenanceScheduler: {
    autonomyMode: process.env.OPENCLAW_AUTONOMY_MODE,
    disabledTick: "skipped",
    notDueTick: "skipped",
    forcedTick: "ran",
    capabilityTick: "ran",
    runCount: stateAfter.runCount,
    policy: {
      enabled: policyAfter.policy.enabled,
      intervalMs: policyAfter.policy.intervalMs,
      lastTick: policyAfter.policy.lastTick?.status ?? null,
      nextDueAt: policyAfter.policy.nextDueAt,
    },
  },
}, null, 2));
EOF
