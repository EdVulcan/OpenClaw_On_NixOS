#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5820}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5821}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5822}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5823}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5824}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5825}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5826}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5827}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5890}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-system-health-self-heal-evidence-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-self-heal-evidence-check.json}"

SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"
HEAL_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_HEAL_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f \
  "$OPENCLAW_CORE_STATE_FILE" \
  "$OPENCLAW_CORE_STATE_FILE.tmp" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${BODY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json_file() {
  local url="$1"
  local file="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data-binary "@$file"
}

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
BODY_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");

const requiredHtml = [
  "System Health",
  "system-services-online",
  "system-alert-count",
  "Body Uptime",
  "Heal History",
  "heal-count",
  "heal-summary",
  "Maintenance",
  "maintenance-policy-enabled",
  "maintenance-run-count",
  "maintenance-summary",
];
const requiredClient = [
  "/system/health",
  "/heal/history",
  "/maintenance/state",
  "/maintenance/history?limit=5",
  "refreshSystemState",
  "refreshHealState",
  "refreshMaintenanceState",
  "runMaintenanceTickFromUi",
  "heal.diagnosed",
  "heal.started",
  "heal.completed",
  "maintenance.completed",
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
EOF

health="$(curl --silent --fail "$SYSTEM_URL/system/health")"
node - <<'EOF' "$health" > "$BODY_FILE"
const health = JSON.parse(process.argv[2]);
if (!health.ok || !health.system) {
  throw new Error(`observer self-heal check needs system health: ${JSON.stringify(health)}`);
}

const system = structuredClone(health.system);
const now = new Date().toISOString();
system.timestamp = now;
system.services = {
  ...system.services,
  browserRuntime: {
    ...(system.services?.browserRuntime ?? {}),
    name: "browserRuntime",
    ok: false,
    status: "offline",
    detail: "synthetic observer self-heal evidence fault",
    latencyMs: 1500,
    checkedAt: now,
  },
};
system.alerts = [
  ...(Array.isArray(system.alerts) ? system.alerts : []),
  {
    id: "synthetic-disk-pressure",
    level: "warning",
    code: "resource.disk.high",
    source: "openclaw-system-sense",
    message: "Synthetic disk pressure remains observe-only in Observer self-heal evidence.",
  },
];

process.stdout.write(JSON.stringify({
  system,
  autofix: true,
  mode: "simulated",
}, null, 2));
EOF

run="$(post_json_file "$HEAL_URL/maintenance/run" "$BODY_FILE")"
heal_history="$(curl --silent --fail "$HEAL_URL/heal/history")"
maintenance_state="$(curl --silent --fail "$HEAL_URL/maintenance/state")"
maintenance_history="$(curl --silent --fail "$HEAL_URL/maintenance/history?limit=5")"

node - <<'EOF' "$run" "$heal_history" "$maintenance_state" "$maintenance_history"
const runResponse = JSON.parse(process.argv[2]);
const healHistory = JSON.parse(process.argv[3]);
const maintenanceState = JSON.parse(process.argv[4]);
const maintenanceHistory = JSON.parse(process.argv[5]);

const run = runResponse.run;
if (!runResponse.ok || run?.status !== "repaired") {
  throw new Error(`observer-facing maintenance run should repair the simple fault: ${JSON.stringify(runResponse)}`);
}
if (!run.executed?.some((entry) => entry.action === "restart-service" && entry.service === "browserRuntime")) {
  throw new Error(`observer-facing run should expose executed restart evidence: ${JSON.stringify(run.executed)}`);
}
if (!run.skipped?.some((entry) => entry.action === "observe-only" && entry.status === "skipped")) {
  throw new Error(`observer-facing run should expose skipped observe-only evidence: ${JSON.stringify(run.skipped)}`);
}
if (!healHistory.ok || healHistory.count < 2) {
  throw new Error(`Observer heal panel source should expose heal history: ${JSON.stringify(healHistory)}`);
}
if (!maintenanceState.ok || maintenanceState.latestRun?.id !== run.id || maintenanceState.latestRun?.autonomy?.governance !== "audit_only") {
  throw new Error(`Observer maintenance panel source should expose latest audited run: ${JSON.stringify(maintenanceState)}`);
}
if (!maintenanceHistory.ok || !maintenanceHistory.items?.some((item) => item.id === run.id)) {
  throw new Error(`Observer maintenance history source should include latest run: ${JSON.stringify(maintenanceHistory)}`);
}

console.log(JSON.stringify({
  observerSystemHealthSelfHealEvidence: {
    status: "passed",
    panels: ["System Health", "Heal History", "Maintenance"],
    runStatus: run.status,
    executed: run.executed.map((entry) => `${entry.action}:${entry.service}`),
    skipped: run.skipped.map((entry) => `${entry.action}:${entry.status}`),
    governance: maintenanceState.latestRun.autonomy.governance,
  },
}, null, 2));
EOF
