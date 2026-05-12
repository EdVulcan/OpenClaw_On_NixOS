#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9040}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9041}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9042}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9043}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9044}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9045}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9046}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9047}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9110}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-sovereign-maintenance-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-sovereign-maintenance-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-observer-sovereign-maintenance-check-events.jsonl}"

HEAL_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_HEAL_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f \
  "$OPENCLAW_CORE_STATE_FILE" \
  "$OPENCLAW_CORE_STATE_FILE.tmp" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp" \
  "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${BODY_FILE:-}" \
    "${POLICY_FILE:-}" \
    "${TICK_FILE:-}" \
    "${STATE_FILE:-}" \
    "${HISTORY_FILE:-}" \
    "${EVENTS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

post_file() {
  local url="$1"
  local file="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data-binary "@$file"
}

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
BODY_FILE="$(mktemp)"
POLICY_FILE="$(mktemp)"
TICK_FILE="$(mktemp)"
STATE_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

node - <<'EOF' > "$BODY_FILE"
const now = new Date().toISOString();
process.stdout.write(JSON.stringify({
  force: true,
  autofix: true,
  mode: "simulated",
  system: {
    timestamp: now,
    body: {
      hostname: "observer-sovereign-maintenance-body",
      platform: "linux",
      release: "test",
      arch: "x64",
      uptimeSeconds: 720,
      processUptimeSeconds: 15,
      pid: 9110,
      node: process.version,
      stateDir: "/var/lib/openclaw",
      diskPath: "/var/lib/openclaw",
    },
    services: {
      core: {
        name: "core",
        ok: true,
        status: "healthy",
        url: "http://127.0.0.1:9040",
        detail: "openclaw-core",
        stage: "active",
        latencyMs: 2,
        checkedAt: now,
      },
      sessionManager: {
        name: "sessionManager",
        ok: false,
        status: "offline",
        url: "http://127.0.0.1:9042",
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
  },
}, null, 2));
EOF

post_json "$HEAL_URL/maintenance/policy" '{"enabled":true,"intervalMs":600000,"autofix":true,"mode":"simulated","resetSchedule":true}' > "$POLICY_FILE"
post_file "$HEAL_URL/maintenance/tick" "$BODY_FILE" > "$TICK_FILE"
curl --silent --fail "$HEAL_URL/maintenance/state" > "$STATE_FILE"
curl --silent --fail "$HEAL_URL/maintenance/history?limit=5" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=80" > "$EVENTS_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$POLICY_FILE" "$TICK_FILE" "$STATE_FILE" "$HISTORY_FILE" "$EVENTS_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const policy = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const tick = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const state = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const history = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
const events = JSON.parse(fs.readFileSync(process.argv[8], "utf8"));

for (const token of [
  "Maintenance",
  "maintenance-policy-enabled",
  "maintenance-next-due",
  "maintenance-last-tick",
  "maintenance-run-count",
  "maintenance-summary",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}

for (const token of [
  "/maintenance/state",
  "/maintenance/history?limit=5",
  "refreshMaintenanceState",
  "maintenance.policy.updated",
  "maintenance.tick",
  "maintenance.started",
  "maintenance.completed",
  "Governance:",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}

if (!policy.ok || policy.policy?.enabled !== true || policy.policy?.intervalMs !== 600000) {
  throw new Error(`maintenance policy should be visible to Observer: ${JSON.stringify(policy)}`);
}
if (!tick.ok || tick.tick?.status !== "ran" || tick.tick?.reason !== "forced" || tick.run?.status !== "repaired") {
  throw new Error(`maintenance tick should create a conservative run: ${JSON.stringify(tick)}`);
}
if (tick.run?.autonomy?.approvalRequired !== false || tick.run?.autonomy?.governance !== "audit_only") {
  throw new Error(`maintenance run should remain body-internal audit governance: ${JSON.stringify(tick.run?.autonomy)}`);
}
if (!state.ok || state.policy?.enabled !== true || state.policy?.lastTick?.status !== "ran" || state.runCount !== 1) {
  throw new Error(`Observer maintenance state source should expose policy, tick, and run count: ${JSON.stringify(state)}`);
}
if (!history.ok || history.count !== 1 || history.latestRun?.id !== tick.run?.id || history.items?.[0]?.autonomy?.governance !== "audit_only") {
  throw new Error(`Observer maintenance history source should expose latest audit-only run: ${JSON.stringify(history)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["maintenance.policy.updated", "maintenance.tick", "maintenance.started", "maintenance.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`Observer maintenance event stream missing ${type}`);
  }
}

console.log(JSON.stringify({
  observerSovereignMaintenance: {
    htmlMetrics: [
      "maintenance-policy-enabled",
      "maintenance-next-due",
      "maintenance-last-tick",
      "maintenance-run-count",
      "maintenance-summary",
    ],
    clientApis: [
      "/maintenance/state",
      "/maintenance/history?limit=5",
      "refreshMaintenanceState",
    ],
    policy: {
      enabled: state.policy.enabled,
      intervalMs: state.policy.intervalMs,
      lastTick: state.policy.lastTick?.status ?? null,
    },
    latestRun: {
      id: history.latestRun.id,
      status: history.latestRun.status,
      governance: history.latestRun.autonomy?.governance ?? null,
    },
  },
}, null, 2));
EOF
