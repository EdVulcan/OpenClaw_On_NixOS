#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6100}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6101}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6102}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6103}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6104}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6105}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6106}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6107}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6170}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-system-heal-check.json}"

HEAL_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_HEAL_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${BODY_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local file="$2"
  curl --silent -X POST "$url" -H 'content-type: application/json' --data-binary "@$file"
}

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
BODY_FILE="$(mktemp)"
curl --silent "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");

for (const token of ["Heal History", "heal-count", "heal-summary"]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of ["heal.diagnosed", "heal.started", "heal.completed"]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
EOF

node - <<'EOF' > "$BODY_FILE"
const now = new Date().toISOString();
const system = {
  timestamp: now,
  body: {
    hostname: "synthetic-openclaw-body",
    platform: "linux",
    release: "test",
    arch: "x64",
    uptimeSeconds: 120,
    processUptimeSeconds: 5,
    pid: 1234,
    node: process.version,
    stateDir: "/var/lib/openclaw",
    diskPath: "/var/lib/openclaw",
  },
  services: {
    core: {
      name: "core",
      ok: true,
      status: "healthy",
      url: "http://127.0.0.1:6100",
      detail: "openclaw-core",
      stage: "active",
      latencyMs: 2,
      checkedAt: now,
    },
    browserRuntime: {
      name: "browserRuntime",
      ok: false,
      status: "offline",
      url: "http://127.0.0.1:6103",
      detail: "offline",
      stage: null,
      latencyMs: 1500,
      checkedAt: now,
    },
  },
  resources: {
    cpuPercent: 3,
    cpuCores: 4,
    loadAverage: [0.01, 0.02, 0.03],
    memoryPercent: 95,
    memory: {
      totalBytes: 100,
      freeBytes: 5,
      usedBytes: 95,
    },
    diskPercent: 23,
    disk: {
      path: "/var/lib/openclaw",
      available: true,
    },
  },
  network: {
    online: true,
    checkedTargets: 2,
  },
  alerts: [
    {
      id: "alert-memory",
      level: "warning",
      code: "resource.memory.high",
      source: "openclaw-system-sense",
      message: "Memory usage is 95%",
    },
  ],
};

process.stdout.write(JSON.stringify({ system }, null, 2));
EOF

state="$(curl --silent "$HEAL_URL/heal/state")"
diagnosis="$(post_json "$HEAL_URL/heal/diagnose" "$BODY_FILE")"
autofix="$(post_json "$HEAL_URL/heal/autofix" "$BODY_FILE")"
history="$(curl --silent "$HEAL_URL/heal/history")"
state_after="$(curl --silent "$HEAL_URL/heal/state")"

node - <<'EOF' "$state" "$diagnosis" "$autofix" "$history" "$state_after"
const state = JSON.parse(process.argv[2]);
const diagnosis = JSON.parse(process.argv[3]);
const autofix = JSON.parse(process.argv[4]);
const history = JSON.parse(process.argv[5]);
const stateAfter = JSON.parse(process.argv[6]);

if (!state.ok || state.engine !== "heal-v0" || state.capabilities?.diagnose !== true || state.capabilities?.autoFix !== true) {
  throw new Error("heal state should expose heal-v0 capabilities");
}

const plan = diagnosis.diagnosis?.plan;
if (!diagnosis.ok || diagnosis.diagnosis?.status !== "repairable" || plan?.stepCount !== 2) {
  throw new Error("diagnosis should create a two-step repairable plan");
}

const restart = plan.steps.find((step) => step.kind === "restart-service");
const observe = plan.steps.find((step) => step.kind === "observe-only");
if (!restart || restart.service !== "browserRuntime" || restart.risk !== "medium") {
  throw new Error("diagnosis should plan a simulated restart-service step");
}
if (!observe || observe.mode !== "audit_only" || observe.risk !== "high") {
  throw new Error("diagnosis should keep high-risk resource alert observe-only");
}

if (!autofix.ok || autofix.executed?.length !== 1 || autofix.skipped?.length !== 1) {
  throw new Error("autofix should execute one restart and skip one high-risk observation");
}
if (autofix.executed[0]?.service !== "browserRuntime" || autofix.executed[0]?.status !== "completed") {
  throw new Error("autofix restart-service result is wrong");
}
if (autofix.skipped[0]?.action !== "observe-only" || autofix.skipped[0]?.status !== "skipped") {
  throw new Error("autofix observe-only result is wrong");
}
if (!history.ok || history.count < 2 || !Array.isArray(history.items)) {
  throw new Error("heal history should include autofix entries");
}
if (!stateAfter.ok || stateAfter.latestDiagnosis?.status !== "repairable" || stateAfter.historyCount < 2) {
  throw new Error("heal state should retain latest diagnosis and history count");
}

console.log(JSON.stringify({
  systemHeal: {
    engine: stateAfter.engine,
    mode: stateAfter.mode,
    latestStatus: stateAfter.latestDiagnosis?.status ?? null,
    planSteps: stateAfter.latestDiagnosis?.plan?.stepCount ?? 0,
    executed: autofix.executed.map((entry) => ({
      action: entry.action,
      service: entry.service,
      status: entry.status,
      mode: entry.mode,
    })),
    skipped: autofix.skipped.map((entry) => ({
      action: entry.action,
      status: entry.status,
      mode: entry.mode,
      risk: entry.risk,
    })),
    historyCount: history.count,
  },
}, null, 2));
EOF
