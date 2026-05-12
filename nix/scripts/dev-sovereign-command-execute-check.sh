#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/sovereign-command-execute-fixture"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-7500}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-7501}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-7502}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-7503}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-7504}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-7505}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-7506}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-7507}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-7570}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$FIXTURE_DIR"
export OPENCLAW_SYSTEM_COMMAND_ALLOWLIST="${OPENCLAW_SYSTEM_COMMAND_ALLOWLIST:-printf,pwd,whoami,ls}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-command-execute-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-command-execute-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${REGISTRY_FILE:-}" \
    "${PLAN_FILE:-}" \
    "${STEP_FILE:-}" \
    "${APPROVALS_FILE:-}" \
    "${HISTORY_FILE:-}" \
    "${DIRECT_REJECT_FILE:-}" \
    "${EVENTS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

"$SCRIPT_DIR/dev-up.sh"

REGISTRY_FILE="$(mktemp)"
PLAN_FILE="$(mktemp)"
STEP_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
DIRECT_REJECT_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/capabilities" > "$REGISTRY_FILE"
post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Sovereign body executes allowlisted command\",\"type\":\"system_task\",\"policy\":{\"intent\":\"system.command.execute\"},\"actions\":[{\"kind\":\"system.command.execute\",\"intent\":\"system.command.execute\",\"params\":{\"command\":\"printf\",\"args\":[\"openclaw-exec-ok\"],\"cwd\":\"$FIXTURE_DIR\",\"timeoutMs\":1000}}]}" > "$PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$STEP_FILE"
curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent -X POST "$SYSTEM_URL/system/command/execute" -H 'content-type: application/json' -d "{\"command\":\"rm\",\"args\":[\"-rf\",\"$FIXTURE_DIR\"],\"cwd\":\"$FIXTURE_DIR\"}" > "$DIRECT_REJECT_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?limit=120" > "$EVENTS_FILE"

node - <<'EOF' \
  "$REGISTRY_FILE" \
  "$PLAN_FILE" \
  "$STEP_FILE" \
  "$APPROVALS_FILE" \
  "$HISTORY_FILE" \
  "$DIRECT_REJECT_FILE" \
  "$EVENTS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const registry = readJson(2);
const plan = readJson(3);
const step = readJson(4);
const approvals = readJson(5);
const history = readJson(6);
const directReject = readJson(7);
const events = readJson(8);

const byId = Object.fromEntries((registry.capabilities ?? []).map((capability) => [capability.id, capability]));
const executeCapability = byId["act.system.command.execute"];
if (!executeCapability || executeCapability.governance !== "require_approval" || executeCapability.requiresApproval !== true) {
  throw new Error("registry should expose controlled command execute as an approval-governed capability");
}
if (!executeCapability.intents?.includes("system.command.execute") || executeCapability.domains?.[0] !== "body_internal") {
  throw new Error("command execute capability should be body-internal and explicitly invokable");
}

const action = (plan.plan?.steps ?? []).find((step) => step.kind === "system.command.execute");
if (
  action?.capabilityId !== "act.system.command.execute"
  || action.risk !== "high"
  || action.governance !== "require_approval"
  || action.requiresApproval !== true
) {
  throw new Error("system.command.execute plan should map to high-risk execute capability");
}
if (plan.task?.policy?.decision?.decision !== "audit_only") {
  throw new Error("system.command.execute task should be body-internal audited before capability execution");
}
if (!step.ok || step.ran !== true || step.blocked !== false || step.task?.status !== "completed") {
  throw new Error("operator should complete allowlisted command execution in sovereign body mode");
}
if ((approvals.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error("sovereign command execution should not create pending approvals");
}

const invocation = step.execution?.capabilityInvocations?.[0];
if (
  invocation?.capabilityId !== "act.system.command.execute"
  || invocation.invoked !== true
  || invocation.summary?.kind !== "command.execute"
  || invocation.summary?.wouldExecute !== true
  || invocation.summary?.exitCode !== 0
  || invocation.summary?.stdout !== "openclaw-exec-ok"
) {
  throw new Error(`unexpected command execution invocation: ${JSON.stringify(invocation)}`);
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.byCapability?.["act.system.command.execute"] !== 1) {
  throw new Error(`command execution should be persisted in capability history: ${JSON.stringify(history.summary)}`);
}
const historyItem = history.items?.[0];
if (
  historyItem?.policy?.decision !== "audit_only"
  || historyItem.policy?.reason !== "body_sovereignty_autonomy"
  || historyItem.policy?.autonomous !== true
) {
  throw new Error("capability invocation policy should record sovereign body autonomous audit");
}
if (directReject.ok !== false || directReject.code !== "COMMAND_NOT_ALLOWLISTED") {
  throw new Error("system-sense should reject non-allowlisted direct command execution");
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["system.command.executed", "capability.invoked", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}
if (eventTypes.has("approval.created")) {
  throw new Error("sovereign command execution should not emit approval.created");
}

console.log(JSON.stringify({
  sovereignCommandExecute: {
    capability: {
      id: executeCapability.id,
      governance: executeCapability.governance,
      requiresApproval: executeCapability.requiresApproval,
    },
    task: {
      status: step.task?.status ?? null,
      taskPolicyReason: plan.task?.policy?.decision?.reason ?? null,
      capabilityPolicyReason: historyItem.policy?.reason ?? null,
      autonomous: historyItem.policy?.autonomous ?? null,
      executor: step.execution?.executor ?? null,
    },
    command: {
      capabilityId: invocation.capabilityId,
      wouldExecute: invocation.summary.wouldExecute,
      exitCode: invocation.summary.exitCode,
      stdout: invocation.summary.stdout,
      pendingApprovals: approvals.summary?.pendingCount ?? 0,
    },
    rejectedCommand: {
      ok: directReject.ok,
      code: directReject.code,
    },
    history: history.summary,
  },
  auditEvents: [...eventTypes].filter((type) => type.startsWith("system.command") || type.startsWith("capability.") || type.startsWith("task.")),
}, null, 2));
EOF
