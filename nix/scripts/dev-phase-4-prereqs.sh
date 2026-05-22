#!/usr/bin/env bash

prepare_phase_4_self_heal_evidence() {
  local heal_url="$1"
  local body_file
  body_file="$(mktemp)"

  node - <<'EOF' > "$body_file"
const now = new Date().toISOString();
const system = {
  timestamp: now,
  body: {
    hostname: "phase-4-self-heal-body",
    platform: "linux",
    release: "test",
    arch: "x64",
    uptimeSeconds: 240,
    processUptimeSeconds: 12,
    pid: 4242,
    node: process.version,
    stateDir: "/var/lib/openclaw",
    diskPath: "/var/lib/openclaw",
  },
  services: {
    core: { name: "core", ok: true, status: "healthy", checkedAt: now, latencyMs: 2 },
    eventHub: { name: "eventHub", ok: true, status: "healthy", checkedAt: now, latencyMs: 2 },
    sessionManager: { name: "sessionManager", ok: true, status: "healthy", checkedAt: now, latencyMs: 2 },
    browserRuntime: { name: "browserRuntime", ok: false, status: "offline", checkedAt: now, latencyMs: 1500 },
    screenSense: { name: "screenSense", ok: true, status: "healthy", checkedAt: now, latencyMs: 2 },
    screenAct: { name: "screenAct", ok: true, status: "healthy", checkedAt: now, latencyMs: 2 },
    systemSense: { name: "systemSense", ok: true, status: "healthy", checkedAt: now, latencyMs: 2 },
    systemHeal: { name: "systemHeal", ok: true, status: "healthy", checkedAt: now, latencyMs: 2 },
  },
  resources: {
    cpuPercent: 5,
    cpuCores: 4,
    loadAverage: [0.01, 0.02, 0.03],
    memoryPercent: 96,
    memory: { totalBytes: 100, freeBytes: 4, usedBytes: 96 },
    diskPercent: 30,
    disk: { path: "/var/lib/openclaw", available: true },
  },
  network: { online: true, checkedTargets: 2 },
  alerts: [{
    id: "phase-4-memory-pressure",
    level: "warning",
    code: "resource.memory.high",
    source: "openclaw-system-sense",
    message: "Synthetic memory pressure remains observe-only during Phase 4.",
  }],
};

process.stdout.write(JSON.stringify({ system, autofix: true, mode: "simulated" }, null, 2));
EOF

  curl --silent --fail -X POST "$heal_url/maintenance/run" \
    -H 'content-type: application/json' \
    --data-binary "@$body_file" >/dev/null
  rm -f "$body_file"
}
