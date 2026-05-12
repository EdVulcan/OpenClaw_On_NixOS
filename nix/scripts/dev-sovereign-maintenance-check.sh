#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9020}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9021}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9022}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9023}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9024}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9025}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9026}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9027}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9090}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-maintenance-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-sovereign-maintenance-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-maintenance-check-events.jsonl}"

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
    "${CAPABILITY_FILE:-}" \
    "${PLAN_FILE:-}" \
    "${PLAN_RESULT_FILE:-}" \
    "${STEP_FILE:-}" \
    "${APPROVALS_FILE:-}" \
    "${HISTORY_FILE:-}" \
    "${MAINTENANCE_STATE_FILE:-}" \
    "${EVENTS_FILE:-}" \
    "${POST_RESTART_HISTORY_FILE:-}" \
    "${POST_RESTART_STATE_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local file="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' --data-binary "@$file"
}

"$SCRIPT_DIR/dev-up.sh"

BODY_FILE="$(mktemp)"
CAPABILITY_FILE="$(mktemp)"
PLAN_FILE="$(mktemp)"
PLAN_RESULT_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
MAINTENANCE_STATE_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"
POST_RESTART_HISTORY_FILE="$(mktemp)"
POST_RESTART_STATE_FILE="$(mktemp)"

node - <<'EOF' > "$BODY_FILE"
const now = new Date().toISOString();
const system = {
  timestamp: now,
  body: {
    hostname: "sovereign-maintenance-body",
    platform: "linux",
    release: "test",
    arch: "x64",
    uptimeSeconds: 360,
    processUptimeSeconds: 12,
    pid: 4242,
    node: process.version,
    stateDir: "/var/lib/openclaw",
    diskPath: "/var/lib/openclaw",
  },
  services: {
    core: {
      name: "core",
      ok: true,
      status: "healthy",
      url: "http://127.0.0.1:9020",
      detail: "openclaw-core",
      stage: "active",
      latencyMs: 2,
      checkedAt: now,
    },
    browserRuntime: {
      name: "browserRuntime",
      ok: false,
      status: "offline",
      url: "http://127.0.0.1:9023",
      detail: "offline",
      stage: null,
      latencyMs: 1500,
      checkedAt: now,
    },
  },
  resources: {
    cpuPercent: 4,
    cpuCores: 4,
    loadAverage: [0.01, 0.02, 0.03],
    memoryPercent: 96,
    memory: {
      totalBytes: 100,
      freeBytes: 4,
      usedBytes: 96,
    },
    diskPercent: 20,
    disk: {
      path: "/var/lib/openclaw",
      available: true,
    },
  },
  network: {
    online: true,
    checkedTargets: 8,
  },
  alerts: [
    {
      id: "alert-memory",
      level: "warning",
      code: "resource.memory.high",
      source: "openclaw-system-sense",
      message: "Memory usage is 96%",
    },
  ],
};

process.stdout.write(JSON.stringify({
  capabilityId: "act.system.heal",
  intent: "heal.maintenance",
  operation: "maintenance",
  params: {
    system,
    autofix: true,
    mode: "simulated",
  },
}, null, 2));
EOF

post_json "$CORE_URL/capabilities/invoke" "$BODY_FILE" > "$CAPABILITY_FILE"

node - <<'EOF' "$CAPABILITY_FILE"
const fs = require("node:fs");
const result = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!result.ok || result.invoked !== true || result.blocked === true) {
  throw new Error(`sovereign maintenance capability should invoke without blocking: ${JSON.stringify(result)}`);
}
if (result.capability?.id !== "act.system.heal") {
  throw new Error(`maintenance should invoke act.system.heal: ${JSON.stringify(result.capability)}`);
}
if (result.policy?.decision !== "audit_only" || result.policy?.domain !== "body_internal") {
  throw new Error(`maintenance should remain body-internal audit-only: ${JSON.stringify(result.policy)}`);
}
if (result.summary?.kind !== "maintenance.run" || result.summary?.status !== "repaired" || result.summary?.executed !== 1 || result.summary?.skipped !== 1) {
  throw new Error(`maintenance summary should show one conservative repair and one skipped high-risk observation: ${JSON.stringify(result.summary)}`);
}
if (result.response?.run?.autonomy?.approvalRequired !== false || result.response?.run?.autonomy?.governance !== "audit_only") {
  throw new Error(`maintenance run should record autonomous audit governance: ${JSON.stringify(result.response?.run?.autonomy)}`);
}
EOF

node - <<'EOF' "$BODY_FILE" > "$PLAN_FILE"
const fs = require("node:fs");
const capabilityRequest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
process.stdout.write(JSON.stringify({
  goal: "Sovereign body runs conservative maintenance through operator",
  type: "system_task",
  policy: {
    intent: "heal.maintenance",
  },
  actions: [
    {
      kind: "heal.maintenance",
      intent: "heal.maintenance",
      params: capabilityRequest.params,
    },
  ],
}, null, 2));
EOF

post_json "$CORE_URL/tasks/plan" "$PLAN_FILE" > "$PLAN_RESULT_FILE"
post_json "$CORE_URL/operator/step" /dev/null > "$STEP_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=8" > "$APPROVALS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?capabilityId=act.system.heal&limit=8" > "$HISTORY_FILE"
curl --silent --fail "$HEAL_URL/maintenance/state" > "$MAINTENANCE_STATE_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=120" > "$EVENTS_FILE"

node - <<'EOF' "$PLAN_RESULT_FILE" "$STEP_FILE" "$APPROVALS_FILE" "$HISTORY_FILE" "$MAINTENANCE_STATE_FILE" "$EVENTS_FILE"
const fs = require("node:fs");
const plan = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const step = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const approvals = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const history = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const maintenanceState = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const events = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));

if (!plan.ok || plan.task?.status !== "queued" || plan.task?.approval?.required === true) {
  throw new Error(`maintenance system task should be queued without approval gate: ${JSON.stringify(plan)}`);
}
const maintenanceStep = (plan.task?.plan?.steps ?? []).find((item) => item.phase === "acting_on_target");
if (maintenanceStep?.capabilityId !== "act.system.heal" || maintenanceStep?.governance !== "audit_only") {
  throw new Error(`maintenance plan step should be annotated with act.system.heal audit-only capability: ${JSON.stringify(maintenanceStep)}`);
}
if (!step.ok || step.ran !== true || step.task?.status !== "completed") {
  throw new Error(`operator should complete autonomous maintenance task: ${JSON.stringify(step)}`);
}
const invocation = step.execution?.capabilityInvocations?.[0];
if (invocation?.capability?.id !== "act.system.heal" || invocation?.summary?.status !== "repaired") {
  throw new Error(`operator maintenance invocation should repair conservatively: ${JSON.stringify(invocation)}`);
}
if (approvals.summary?.counts?.pending !== 0 || approvals.summary?.counts?.total !== 0) {
  throw new Error(`sovereign maintenance should not create approvals: ${JSON.stringify(approvals.summary)}`);
}
if (history.summary?.total !== 2 || history.summary?.invoked !== 2 || history.summary?.blocked !== 0 || history.summary?.byCapability?.["act.system.heal"] !== 2) {
  throw new Error(`capability history should include direct and operator maintenance invocations: ${JSON.stringify(history.summary)}`);
}
if (!maintenanceState.ok || maintenanceState.runCount !== 2 || maintenanceState.healHistoryCount !== 4 || maintenanceState.latestRun?.status !== "repaired") {
  throw new Error(`maintenance state should track two runs and four heal entries: ${JSON.stringify(maintenanceState)}`);
}
const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["maintenance.started", "maintenance.completed", "heal.started", "heal.completed", "capability.invoked", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`maintenance audit log missing ${type}`);
  }
}
EOF

"$SCRIPT_DIR/dev-down.sh" >/dev/null
"$SCRIPT_DIR/dev-up.sh" >/dev/null

curl --silent --fail "$HEAL_URL/maintenance/history?limit=8" > "$POST_RESTART_HISTORY_FILE"
curl --silent --fail "$HEAL_URL/maintenance/state" > "$POST_RESTART_STATE_FILE"

node - <<'EOF' "$MAINTENANCE_STATE_FILE" "$POST_RESTART_HISTORY_FILE" "$POST_RESTART_STATE_FILE"
const fs = require("node:fs");
const before = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const historyAfter = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const stateAfter = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

if (!historyAfter.ok || historyAfter.count !== 2 || historyAfter.items?.length !== 2) {
  throw new Error(`maintenance history should survive restart: ${JSON.stringify(historyAfter)}`);
}
if (!stateAfter.ok || stateAfter.runCount !== before.runCount || stateAfter.healHistoryCount !== before.healHistoryCount) {
  throw new Error(`maintenance state counts should survive restart: ${JSON.stringify({ before, stateAfter })}`);
}
if (stateAfter.latestRun?.status !== "repaired" || stateAfter.latestRun?.autonomy?.approvalRequired !== false) {
  throw new Error(`latest autonomous maintenance run should survive restart: ${JSON.stringify(stateAfter.latestRun)}`);
}

console.log(JSON.stringify({
  sovereignMaintenance: {
    autonomyMode: process.env.OPENCLAW_AUTONOMY_MODE,
    capability: "act.system.heal",
    approvalRequired: stateAfter.latestRun.autonomy.approvalRequired,
    governance: stateAfter.latestRun.autonomy.governance,
    latestStatus: stateAfter.latestRun.status,
    runCount: stateAfter.runCount,
    healHistoryCount: stateAfter.healHistoryCount,
    stateFile: stateAfter.stateFilePath,
  },
}, null, 2));
EOF
