#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TARGET_URL="https://example.com/observer-capability-plan"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6800}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6801}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6802}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6803}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6804}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6805}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6806}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6807}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6870}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-capability-plan-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp"

cleanup() {
  rm -f \
    "${HTML_FILE:-}" \
    "${CLIENT_FILE:-}" \
    "${BROWSER_PLAN_FILE:-}" \
    "${COMMAND_PLAN_FILE:-}"
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
BROWSER_PLAN_FILE="$(mktemp)"
COMMAND_PLAN_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Observer shows browser plan capabilities\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_URL\",\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"observer capability\"}}]}" > "$BROWSER_PLAN_FILE"
post_json "$CORE_URL/tasks/plan" '{"goal":"Observer shows command approval gate","type":"system_task","policy":{"intent":"system.command","requiresApproval":true},"actions":[{"kind":"system.command","intent":"system.command","params":{"command":"rm","args":["-rf","/tmp/openclaw-danger"]}}]}' > "$COMMAND_PLAN_FILE"

node - <<'EOF' \
  "$HTML_FILE" \
  "$CLIENT_FILE" \
  "$BROWSER_PLAN_FILE" \
  "$COMMAND_PLAN_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const browserPlan = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const commandPlan = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

for (const token of [
  "task-plan-planner",
  "task-plan-capability-count",
  "task-plan-approval-gates",
  "Body Capabilities",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}

for (const token of [
  "capabilitySummary",
  "capability=",
  "risk=",
  "governance=",
  "approval-required",
  "taskPlanCapabilityCount",
  "taskPlanApprovalGates",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}

if (!browserPlan.ok || browserPlan.plan?.planner !== "capability-aware-v1") {
  throw new Error("browser plan should be capability-aware");
}
if (browserPlan.plan?.capabilitySummary?.total < 4) {
  throw new Error("browser plan should summarize multiple body capabilities");
}
const browserAction = (browserPlan.plan?.steps ?? []).find((step) => step.kind === "keyboard.type");
if (browserAction?.capabilityId !== "act.screen.pointer_keyboard" || browserAction.risk !== "medium") {
  throw new Error("browser action should expose pointer/keyboard capability metadata for Observer");
}

const commandAction = (commandPlan.plan?.steps ?? []).find((step) => step.kind === "system.command");
if (
  commandAction?.capabilityId !== "act.system.command.dry_run"
  || commandAction.governance !== "require_approval"
  || commandAction.requiresApproval !== true
) {
  throw new Error("command plan should expose approval-gated command capability metadata for Observer");
}
if (commandPlan.plan?.capabilitySummary?.approvalGates < 1 || commandPlan.task?.approval?.required !== true) {
  throw new Error("command plan should expose approval gates in plan summary and task approval state");
}

console.log(JSON.stringify({
  observerCapabilityPlan: {
    htmlMetrics: [
      "task-plan-planner",
      "task-plan-capability-count",
      "task-plan-approval-gates",
    ],
    clientFields: [
      "capabilitySummary",
      "capability",
      "risk",
      "governance",
      "approval-required",
    ],
    browserCapabilityCount: browserPlan.plan.capabilitySummary.total,
    commandApprovalGates: commandPlan.plan.capabilitySummary.approvalGates,
  },
  planExamples: {
    browserActionCapability: browserAction.capabilityId,
    commandCapability: commandAction.capabilityId,
    commandGovernance: commandAction.governance,
  },
}, null, 2));
EOF
