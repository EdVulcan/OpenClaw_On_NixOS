#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TARGET_URL="https://example.com/capability-planner"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6700}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6701}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6702}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6703}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6704}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6705}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6706}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6707}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6770}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-capability-planner-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp"

cleanup() {
  rm -f \
    "${BROWSER_PLAN_FILE:-}" \
    "${FILESYSTEM_PLAN_FILE:-}" \
    "${PROCESS_PLAN_FILE:-}" \
    "${COMMAND_PLAN_FILE:-}" \
    "${CAPABILITIES_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

"$SCRIPT_DIR/dev-up.sh"

BROWSER_PLAN_FILE="$(mktemp)"
FILESYSTEM_PLAN_FILE="$(mktemp)"
PROCESS_PLAN_FILE="$(mktemp)"
COMMAND_PLAN_FILE="$(mktemp)"
CAPABILITIES_FILE="$(mktemp)"

post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Plan browser work with body capabilities\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_URL\",\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"capability aware\"}},{\"kind\":\"mouse.click\",\"params\":{\"x\":420,\"y\":240,\"button\":\"left\"}}]}" > "$BROWSER_PLAN_FILE"
post_json "$CORE_URL/tasks/plan" '{"goal":"Plan filesystem body sensing","type":"system_task","intent":"filesystem.search","actions":[{"kind":"filesystem.search","params":{"path":".","query":"openclaw"}}]}' > "$FILESYSTEM_PLAN_FILE"
post_json "$CORE_URL/tasks/plan" '{"goal":"Plan process body sensing","type":"system_task","intent":"process.list","actions":[{"kind":"process.list","params":{"limit":10}}]}' > "$PROCESS_PLAN_FILE"
post_json "$CORE_URL/tasks/plan" '{"goal":"Plan conservative command dry-run","type":"system_task","policy":{"intent":"system.command","requiresApproval":true},"actions":[{"kind":"system.command","intent":"system.command","params":{"command":"rm","args":["-rf","/tmp/openclaw-danger"]}}]}' > "$COMMAND_PLAN_FILE"
curl --silent --fail "$CORE_URL/capabilities" > "$CAPABILITIES_FILE"

node - <<'EOF' \
  "$BROWSER_PLAN_FILE" \
  "$FILESYSTEM_PLAN_FILE" \
  "$PROCESS_PLAN_FILE" \
  "$COMMAND_PLAN_FILE" \
  "$CAPABILITIES_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const browserPlan = readJson(2);
const filesystemPlan = readJson(3);
const processPlan = readJson(4);
const commandPlan = readJson(5);
const capabilities = readJson(6);

const byCapabilityId = Object.fromEntries((capabilities.capabilities ?? []).map((capability) => [capability.id, capability]));
const requireCapability = (id) => {
  if (!byCapabilityId[id]) {
    throw new Error(`capability registry missing ${id}`);
  }
  return byCapabilityId[id];
};

for (const id of [
  "act.work_view.control",
  "act.browser.open",
  "sense.screen.observe",
  "act.screen.pointer_keyboard",
  "sense.filesystem.read",
  "sense.process.list",
  "act.system.command.dry_run",
  "operate.task.loop",
]) {
  requireCapability(id);
}

const requirePlan = (response, name) => {
  if (!response.ok || response.plan?.strategy !== "rule-v1" || response.plan?.planner !== "capability-aware-v1") {
    throw new Error(`${name} should return a capability-aware rule plan`);
  }
  const steps = response.plan?.steps ?? [];
  if (steps.length < 1 || !steps.every((step) => step.capabilityId && step.risk && step.governance)) {
    throw new Error(`${name} should annotate every plan step with capability, risk, and governance`);
  }
  if (response.plan?.capabilityAware !== true || !Array.isArray(response.plan?.capabilitySummary?.ids)) {
    throw new Error(`${name} should expose a capability summary`);
  }
  return steps;
};

const browserSteps = requirePlan(browserPlan, "browser plan");
const browserByKind = Object.fromEntries(browserSteps.map((step) => [step.kind, step]));
if (browserByKind["work_view.prepare"]?.capabilityId !== "act.work_view.control") {
  throw new Error("work view preparation should use work view control capability");
}
if (browserByKind["browser.open"]?.capabilityId !== "act.browser.open") {
  throw new Error("browser open should use browser runtime navigation capability");
}
if (browserByKind["screen.observe"]?.capabilityId !== "sense.screen.observe") {
  throw new Error("screen observe should use screen observation capability");
}
const browserActions = browserSteps.filter((step) => step.phase === "acting_on_target");
if (browserActions.length !== 2 || !browserActions.every((step) => step.capabilityId === "act.screen.pointer_keyboard")) {
  throw new Error("browser action steps should use pointer and keyboard capability");
}
if (browserPlan.plan?.capabilitySummary?.approvalGates !== 0) {
  throw new Error("ordinary browser plan should not introduce approval gates");
}

const filesystemSteps = requirePlan(filesystemPlan, "filesystem plan");
const filesystemAction = filesystemSteps.find((step) => step.kind === "filesystem.search");
if (filesystemAction?.capabilityId !== "sense.filesystem.read" || filesystemAction.risk !== "medium" || filesystemAction.governance !== "audit_only") {
  throw new Error("filesystem search should map to medium-risk audited filesystem sense");
}

const processSteps = requirePlan(processPlan, "process plan");
const processAction = processSteps.find((step) => step.kind === "process.list");
if (processAction?.capabilityId !== "sense.process.list" || processAction.risk !== "medium" || processAction.governance !== "audit_only") {
  throw new Error("process list should map to medium-risk audited process sense");
}

const commandSteps = requirePlan(commandPlan, "command dry-run plan");
const commandAction = commandSteps.find((step) => step.kind === "system.command");
if (
  commandAction?.capabilityId !== "act.system.command.dry_run"
  || commandAction.risk !== "high"
  || commandAction.governance !== "require_approval"
  || commandAction.requiresApproval !== true
) {
  throw new Error("system command plan should map to high-risk approval-gated command dry-run capability");
}
if (commandPlan.plan?.capabilitySummary?.approvalGates < 1 || commandPlan.task?.approval?.required !== true) {
  throw new Error("command dry-run plan should surface an approval gate at plan and task level");
}

console.log(JSON.stringify({
  capabilityPlanner: {
    planner: browserPlan.plan.planner,
    strategy: browserPlan.plan.strategy,
    browserCapabilities: browserPlan.plan.capabilitySummary.ids,
    filesystemCapability: filesystemAction.capabilityId,
    processCapability: processAction.capabilityId,
    commandCapability: commandAction.capabilityId,
    approvalGates: commandPlan.plan.capabilitySummary.approvalGates,
  },
  policyGate: {
    taskApprovalRequired: commandPlan.task.approval.required,
    policyDecision: commandPlan.task.policy.decision.decision,
  },
  registry: {
    total: capabilities.summary?.total ?? null,
    commandGovernance: byCapabilityId["act.system.command.dry_run"].governance,
  },
}, null, 2));
EOF
