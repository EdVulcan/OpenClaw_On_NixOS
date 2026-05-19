#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5810}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5811}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5812}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5813}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5814}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5815}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5816}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5817}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5880}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-system-health-self-heal-evidence-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-self-heal-evidence-check.json}"

SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"
HEAL_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_HEAL_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f \
  "$OPENCLAW_CORE_STATE_FILE" \
  "$OPENCLAW_CORE_STATE_FILE.tmp" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"

cleanup() {
  rm -f "${BODY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json_file() {
  local url="$1"
  local file="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data-binary "@$file"
}

"$SCRIPT_DIR/dev-up.sh"

BODY_FILE="$(mktemp)"
health="$(curl --silent --fail "$SYSTEM_URL/system/health")"

node - <<'EOF' "$health" > "$BODY_FILE"
const health = JSON.parse(process.argv[2]);
if (!health.ok || !health.system) {
  throw new Error(`system health should expose the OpenClaw body: ${JSON.stringify(health)}`);
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
    detail: "synthetic self-heal evidence fault",
    latencyMs: 1500,
    checkedAt: now,
  },
};
system.resources = {
  ...(system.resources ?? {}),
  memoryPercent: Math.max(system.resources?.memoryPercent ?? 0, 95),
};
system.alerts = [
  ...(Array.isArray(system.alerts) ? system.alerts : []),
  {
    id: "synthetic-memory-pressure",
    level: "warning",
    code: "resource.memory.high",
    source: "openclaw-system-sense",
    message: "Synthetic memory pressure remains observe-only during conservative self-heal evidence.",
  },
];

process.stdout.write(JSON.stringify({
  system,
  autofix: true,
  mode: "simulated",
}, null, 2));
EOF

diagnosis="$(post_json_file "$HEAL_URL/heal/diagnose" "$BODY_FILE")"
run="$(post_json_file "$HEAL_URL/maintenance/run" "$BODY_FILE")"
heal_state="$(curl --silent --fail "$HEAL_URL/heal/state")"
heal_history="$(curl --silent --fail "$HEAL_URL/heal/history")"
maintenance_state="$(curl --silent --fail "$HEAL_URL/maintenance/state")"
maintenance_history="$(curl --silent --fail "$HEAL_URL/maintenance/history")"

node - <<'EOF' "$health" "$diagnosis" "$run" "$heal_state" "$heal_history" "$maintenance_state" "$maintenance_history"
const health = JSON.parse(process.argv[2]);
const diagnosisResponse = JSON.parse(process.argv[3]);
const runResponse = JSON.parse(process.argv[4]);
const healState = JSON.parse(process.argv[5]);
const healHistory = JSON.parse(process.argv[6]);
const maintenanceState = JSON.parse(process.argv[7]);
const maintenanceHistory = JSON.parse(process.argv[8]);

if (!health.system?.body?.hostname || Object.keys(health.system?.services ?? {}).length < 7) {
  throw new Error(`system-sense should provide body and service health evidence: ${JSON.stringify(health.system)}`);
}

const diagnosis = diagnosisResponse.diagnosis;
if (!diagnosisResponse.ok || diagnosis?.engine !== "heal-v0" || diagnosis.status !== "repairable") {
  throw new Error(`diagnosis should be repairable heal-v0 evidence: ${JSON.stringify(diagnosisResponse)}`);
}
if (diagnosis.source?.hostname !== health.system.body.hostname) {
  throw new Error(`diagnosis should retain source body hostname: ${JSON.stringify(diagnosis.source)}`);
}
const restartStep = diagnosis.plan?.steps?.find((step) => step.kind === "restart-service");
const observeStep = diagnosis.plan?.steps?.find((step) => step.kind === "observe-only");
if (!restartStep || restartStep.service !== "browserRuntime" || restartStep.risk !== "medium") {
  throw new Error(`diagnosis should plan conservative restart-service for browserRuntime: ${JSON.stringify(diagnosis.plan)}`);
}
if (!observeStep || observeStep.risk !== "high" || observeStep.mode !== "audit_only") {
  throw new Error(`diagnosis should keep high-risk resource pressure observe-only: ${JSON.stringify(diagnosis.plan)}`);
}

const run = runResponse.run;
if (!runResponse.ok || run?.engine !== "maintenance-v0" || run.status !== "repaired") {
  throw new Error(`maintenance run should repair the simple service fault: ${JSON.stringify(runResponse)}`);
}
if (run.autonomy?.domain !== "body_internal" || run.autonomy?.governance !== "audit_only" || run.autonomy?.approvalRequired !== false) {
  throw new Error(`maintenance run should stay body-internal and approval-free: ${JSON.stringify(run.autonomy)}`);
}
if (!run.executed?.some((entry) => entry.action === "restart-service" && entry.service === "browserRuntime")) {
  throw new Error(`maintenance should execute a simulated restart-service for browserRuntime: ${JSON.stringify(run.executed)}`);
}
if (run.skipped?.length < 1 || !run.skipped.some((entry) => entry.action === "observe-only" && entry.status === "skipped")) {
  throw new Error(`maintenance should skip observe-only high-risk alerts: ${JSON.stringify(run.skipped)}`);
}

if (!healState.ok || healState.latestDiagnosis?.status !== "repairable" || healState.historyCount < 2) {
  throw new Error(`heal state should retain latest diagnosis and heal ledger: ${JSON.stringify(healState)}`);
}
if (!healHistory.ok || !healHistory.items?.some((entry) => entry.action === "restart-service" && entry.service === "browserRuntime")) {
  throw new Error(`heal history should include restart-service evidence: ${JSON.stringify(healHistory)}`);
}
if (!maintenanceState.ok || maintenanceState.latestRun?.id !== run.id || maintenanceState.runCount < 1) {
  throw new Error(`maintenance state should expose latest self-heal run: ${JSON.stringify(maintenanceState)}`);
}
if (!maintenanceHistory.ok || !maintenanceHistory.items?.some((item) => item.id === run.id)) {
  throw new Error(`maintenance history should include the self-heal run: ${JSON.stringify(maintenanceHistory)}`);
}

console.log(JSON.stringify({
  systemHealthSelfHealEvidence: {
    status: "passed",
    body: health.system.body.hostname,
    diagnosis: diagnosis.status,
    executed: run.executed.map((entry) => `${entry.action}:${entry.service}`),
    skipped: run.skipped.map((entry) => `${entry.action}:${entry.status}`),
    governance: run.autonomy.governance,
    historyCount: healState.historyCount,
    maintenanceRuns: maintenanceState.runCount,
  },
}, null, 2));
EOF
