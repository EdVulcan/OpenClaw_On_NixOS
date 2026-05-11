#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6000}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6001}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6002}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6003}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6004}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6005}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6006}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6007}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6070}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-system-sense-check.json}"

SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");

for (const token of ["system-body-uptime", "Body Uptime"]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of ["system.updated", "uptimeSeconds", "loadAverage"]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
EOF

health="$(curl --silent "$SYSTEM_URL/system/health")"
body="$(curl --silent "$SYSTEM_URL/system/body")"
services="$(curl --silent "$SYSTEM_URL/system/services")"
alerts="$(curl --silent "$SYSTEM_URL/system/alerts")"
refresh="$(curl --silent -X POST "$SYSTEM_URL/system/refresh" -H 'content-type: application/json' -d '{}')"

node - <<'EOF' "$health" "$body" "$services" "$alerts" "$refresh"
const health = JSON.parse(process.argv[2]);
const body = JSON.parse(process.argv[3]);
const services = JSON.parse(process.argv[4]);
const alerts = JSON.parse(process.argv[5]);
const refresh = JSON.parse(process.argv[6]);

if (!health.ok || !health.system) {
  throw new Error("system health response missing system body");
}
const system = health.system;
for (const key of ["body", "services", "resources", "network", "alerts"]) {
  if (!(key in system)) {
    throw new Error(`system health missing ${key}`);
  }
}
for (const key of ["hostname", "platform", "arch", "uptimeSeconds", "pid", "node", "stateDir", "diskPath"]) {
  if (!(key in system.body)) {
    throw new Error(`system body missing ${key}`);
  }
}
for (const key of ["cpuPercent", "cpuCores", "loadAverage", "memoryPercent", "memory", "diskPercent", "disk"]) {
  if (!(key in system.resources)) {
    throw new Error(`system resources missing ${key}`);
  }
}
if (!Array.isArray(system.resources.loadAverage)) {
  throw new Error("loadAverage should be an array");
}
if (typeof system.resources.memoryPercent !== "number" || system.resources.memoryPercent < 0 || system.resources.memoryPercent > 100) {
  throw new Error("memoryPercent should be a percentage");
}
if (typeof system.resources.diskPercent !== "number" || system.resources.diskPercent < 0 || system.resources.diskPercent > 100) {
  throw new Error("diskPercent should be a percentage");
}
if (typeof system.network.online !== "boolean" || system.network.checkedTargets < 7) {
  throw new Error("network summary should expose checked service targets");
}
const serviceValues = Object.values(system.services);
if (serviceValues.length < 7 || serviceValues.some((service) => typeof service.latencyMs !== "number" || !service.checkedAt)) {
  throw new Error("service health should include latency and checkedAt");
}
if (!body.ok || body.body?.hostname !== system.body.hostname) {
  throw new Error("system body endpoint does not match health body");
}
if (!services.ok || Object.keys(services.services ?? {}).length < 7) {
  throw new Error("system services endpoint missing services");
}
if (!alerts.ok || !Array.isArray(alerts.alerts)) {
  throw new Error("system alerts endpoint missing alerts array");
}
if (!refresh.ok || !refresh.system?.resources || !refresh.system?.body) {
  throw new Error("system refresh did not return body/resources");
}

console.log(JSON.stringify({
  systemSense: {
    body: {
      hostname: system.body.hostname,
      platform: system.body.platform,
      arch: system.body.arch,
      uptimeSeconds: system.body.uptimeSeconds,
      node: system.body.node,
    },
    resources: {
      cpuPercent: system.resources.cpuPercent,
      cpuCores: system.resources.cpuCores,
      loadAverage: system.resources.loadAverage,
      memoryPercent: system.resources.memoryPercent,
      diskPercent: system.resources.diskPercent,
    },
    services: {
      total: serviceValues.length,
      healthy: serviceValues.filter((service) => service.ok).length,
      checkedTargets: system.network.checkedTargets,
    },
    alerts: system.alerts.length,
    refreshEvent: refresh.system.alerts?.length > 0 ? "service.failed" : "system.updated",
  },
}, null, 2));
EOF
