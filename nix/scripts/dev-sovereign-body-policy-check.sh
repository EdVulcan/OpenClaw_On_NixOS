#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-7400}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-7401}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-7402}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-7403}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-7404}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-7405}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-7406}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-7407}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-7470}"
export OPENCLAW_AUTONOMY_MODE="${OPENCLAW_AUTONOMY_MODE:-sovereign_body}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-sovereign-body-policy-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-sovereign-body-policy-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f \
    "${INITIAL_POLICY_FILE:-}" \
    "${BODY_POLICY_FILE:-}" \
    "${CROSS_POLICY_FILE:-}" \
    "${DENIED_POLICY_FILE:-}" \
    "${COMMAND_PLAN_FILE:-}" \
    "${COMMAND_STEP_FILE:-}" \
    "${APPROVALS_FILE:-}" \
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

"$SCRIPT_DIR/dev-up.sh"

INITIAL_POLICY_FILE="$(mktemp)"
BODY_POLICY_FILE="$(mktemp)"
CROSS_POLICY_FILE="$(mktemp)"
DENIED_POLICY_FILE="$(mktemp)"
COMMAND_PLAN_FILE="$(mktemp)"
COMMAND_STEP_FILE="$(mktemp)"
APPROVALS_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/policy/state" > "$INITIAL_POLICY_FILE"
post_json "$CORE_URL/policy/evaluate" '{"intent":"system.command","type":"system_task","requiresApproval":true}' > "$BODY_POLICY_FILE"
post_json "$CORE_URL/policy/evaluate" '{"intent":"data.upload","targetUrl":"https://example.com/upload"}' > "$CROSS_POLICY_FILE"
post_json "$CORE_URL/policy/evaluate" '{"intent":"security.disable"}' > "$DENIED_POLICY_FILE"

post_json "$CORE_URL/tasks/plan" '{"goal":"Sovereign body runs command dry-run without per-action approval","type":"system_task","policy":{"intent":"system.command"},"actions":[{"kind":"system.command","intent":"system.command","params":{"command":"rm","args":["-rf","/tmp/openclaw-sovereign-danger"]}}]}' > "$COMMAND_PLAN_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$COMMAND_STEP_FILE"

curl --silent --fail "$CORE_URL/approvals?limit=10" > "$APPROVALS_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?source=openclaw-core&limit=80" > "$EVENTS_FILE"

node - <<'EOF' \
  "$INITIAL_POLICY_FILE" \
  "$BODY_POLICY_FILE" \
  "$CROSS_POLICY_FILE" \
  "$DENIED_POLICY_FILE" \
  "$COMMAND_PLAN_FILE" \
  "$COMMAND_STEP_FILE" \
  "$APPROVALS_FILE" \
  "$HISTORY_FILE" \
  "$EVENTS_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));
const initialPolicy = readJson(2);
const bodyPolicy = readJson(3);
const crossPolicy = readJson(4);
const deniedPolicy = readJson(5);
const commandPlan = readJson(6);
const commandStep = readJson(7);
const approvals = readJson(8);
const history = readJson(9);
const events = readJson(10);

if (!initialPolicy.ok || initialPolicy.policy?.autonomyMode !== "sovereign_body") {
  throw new Error("policy state should expose sovereign_body autonomy mode");
}
if (initialPolicy.policy?.rules?.bodyInternalAutonomy !== "autonomous_with_audit") {
  throw new Error("sovereign body mode should make body-internal autonomy audited by default");
}
if (initialPolicy.policy?.rules?.crossBoundaryAutonomy !== "approval_gated") {
  throw new Error("sovereign body mode should not bypass cross-boundary approval");
}

if (
  !bodyPolicy.ok
  || bodyPolicy.policy?.domain !== "body_internal"
  || bodyPolicy.policy?.decision !== "audit_only"
  || bodyPolicy.policy?.reason !== "body_sovereignty_autonomy"
  || bodyPolicy.policy?.autonomous !== true
) {
  throw new Error("body-internal approval-gated intent should become autonomous audited execution");
}
if (crossPolicy.policy?.decision !== "require_approval" || crossPolicy.policy?.domain !== "cross_boundary") {
  throw new Error("cross-boundary intent should still require approval in sovereign_body mode");
}
if (deniedPolicy.policy?.decision !== "deny" || deniedPolicy.policy?.reason !== "absolute_boundary") {
  throw new Error("absolute denied intents should remain denied");
}

const commandAction = (commandPlan.plan?.steps ?? []).find((step) => step.kind === "system.command");
if (commandAction?.capabilityId !== "act.system.command.dry_run" || commandAction.requiresApproval !== true) {
  throw new Error("plan should still mark command dry-run as inherently approval-gated/high-risk");
}
if (!commandStep.ok || commandStep.ran !== true || commandStep.blocked !== false || commandStep.task?.status !== "completed") {
  throw new Error("operator should autonomously complete body-internal command dry-run in sovereign_body mode");
}
if (commandStep.approval?.status === "pending" || (approvals.items ?? []).some((approval) => approval.status === "pending")) {
  throw new Error("sovereign body command dry-run should not create a pending approval");
}
const invocation = commandStep.execution?.capabilityInvocations?.[0];
if (
  invocation?.capabilityId !== "act.system.command.dry_run"
  || invocation.invoked !== true
  || invocation.summary?.wouldExecute !== false
) {
  throw new Error("autonomous command capability must still remain dry-run only");
}
if (history.summary?.total !== 1 || history.summary?.invoked !== 1 || history.summary?.blocked !== 0) {
  throw new Error(`unexpected sovereign body capability history: ${JSON.stringify(history.summary)}`);
}

const eventTypes = new Set((events.items ?? []).map((event) => event.type));
for (const type of ["policy.evaluated", "capability.invoked", "task.completed"]) {
  if (!eventTypes.has(type)) {
    throw new Error(`audit log missing ${type}`);
  }
}
if (eventTypes.has("approval.created")) {
  throw new Error("sovereign body path should not create approval events for body-internal command dry-run");
}

console.log(JSON.stringify({
  sovereignBodyPolicy: {
    autonomyMode: initialPolicy.policy.autonomyMode,
    bodyInternalAutonomy: initialPolicy.policy.rules.bodyInternalAutonomy,
    crossBoundaryAutonomy: initialPolicy.policy.rules.crossBoundaryAutonomy,
    bodyDecision: {
      decision: bodyPolicy.policy.decision,
      reason: bodyPolicy.policy.reason,
      autonomous: bodyPolicy.policy.autonomous,
    },
    crossBoundaryDecision: crossPolicy.policy.decision,
    deniedDecision: deniedPolicy.policy.decision,
    commandExecution: {
      taskStatus: commandStep.task?.status ?? null,
      executor: commandStep.execution?.executor ?? null,
      wouldExecute: invocation.summary.wouldExecute,
      pendingApprovals: approvals.summary?.pendingCount ?? 0,
    },
    history: history.summary,
  },
  auditEvents: [...eventTypes].filter((type) => type === "policy.evaluated" || type.startsWith("capability.") || type.startsWith("task.")),
}, null, 2));
EOF
