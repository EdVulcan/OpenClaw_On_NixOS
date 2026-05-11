#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TARGET_URL="https://www.baidu.com"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-5900}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-5901}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-5902}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-5903}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-5904}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-5905}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-5906}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-5907}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-5970}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-policy-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent -X POST "$url" -H 'content-type: application/json' -d "$body"
}

assert_json() {
  local json="$1"
  local script="$2"
  node -e "$script" "$json"
}

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");

for (const token of ["Policy Governance", "policy-decision", "policy-domain", "policy-audit-count"]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of ["/policy/state", "policy.evaluated", "refreshPolicyState"]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
EOF

initial_policy="$(curl --silent "$CORE_URL/policy/state")"
assert_json "$initial_policy" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.policy?.engine!=="policy-v0" || data.policy?.rules?.crossBoundaryDefault!=="require_approval"){throw new Error("policy state missing v0 defaults");}'

body_policy="$(post_json "$CORE_URL/policy/evaluate" '{"intent":"heal.restart-service","type":"heal_task"}')"
assert_json "$body_policy" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.policy?.domain!=="body_internal" || data.policy?.decision!=="audit_only"){throw new Error("body internal policy should allow with audit");}'

user_policy="$(post_json "$CORE_URL/policy/evaluate" "{\"type\":\"browser_task\",\"goal\":\"Open page\",\"targetUrl\":\"$TARGET_URL\"}")"
assert_json "$user_policy" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.policy?.domain!=="user_task" || data.policy?.decision!=="allow"){throw new Error("ordinary user task should be allowed");}'

cross_policy="$(post_json "$CORE_URL/policy/evaluate" '{"intent":"data.upload","targetUrl":"https://example.com/upload"}')"
assert_json "$cross_policy" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.policy?.domain!=="cross_boundary" || data.policy?.decision!=="require_approval" || data.policy?.approved!==false){throw new Error("cross-boundary task should require approval");}'

approved_cross_policy="$(post_json "$CORE_URL/policy/evaluate" '{"intent":"data.upload","targetUrl":"https://example.com/upload","approved":true}')"
assert_json "$approved_cross_policy" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.policy?.domain!=="cross_boundary" || data.policy?.decision!=="audit_only" || data.policy?.approved!==true){throw new Error("approved cross-boundary task should pass with audit");}'

denied_policy="$(post_json "$CORE_URL/policy/evaluate" '{"intent":"security.disable"}')"
assert_json "$denied_policy" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.policy?.decision!=="deny" || data.policy?.reason!=="absolute_boundary"){throw new Error("absolute boundary policy should deny");}'

blocked_task="$(post_json "$CORE_URL/tasks" "{\"goal\":\"Try unapproved cross-boundary upload\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_URL\",\"policy\":{\"intent\":\"data.upload\"}}")"
assert_json "$blocked_task" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.policy?.decision?.decision!=="require_approval"){throw new Error("blocked task should carry require_approval policy");}'

blocked_step="$(post_json "$CORE_URL/operator/step" '{}')"
assert_json "$blocked_step" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.ran!==false || data.blocked!==true || data.reason!=="policy_requires_approval" || data.task?.status!=="queued"){throw new Error("operator should block unapproved cross-boundary task");}'

stopped_task="$(post_json "$CORE_URL/control/stop" '{}')"
assert_json "$stopped_task" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.status!=="failed"){throw new Error("failed to stop blocked policy task");}'

approved_task="$(post_json "$CORE_URL/tasks/plan" "{\"goal\":\"Approved cross-boundary audit task\",\"type\":\"browser_task\",\"targetUrl\":\"$TARGET_URL\",\"policy\":{\"intent\":\"data.upload\",\"approved\":true},\"actions\":[{\"kind\":\"keyboard.type\",\"params\":{\"text\":\"policy approved\"}}]}")"
assert_json "$approved_task" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.task?.policy?.decision?.decision!=="audit_only"){throw new Error("approved task should carry audit policy");}'

run_result="$(post_json "$CORE_URL/operator/run" '{"maxSteps":2}')"
assert_json "$run_result" 'const data=JSON.parse(process.argv[1]); if(!data.ok || data.ran!==true || data.steps?.[0]?.task?.status!=="completed" || data.steps?.[0]?.policy?.decision!=="audit_only"){throw new Error("approved audited task should execute");}'

final_policy="$(curl --silent "$CORE_URL/policy/state")"

node - <<'EOF' "$initial_policy" "$body_policy" "$user_policy" "$cross_policy" "$approved_cross_policy" "$denied_policy" "$blocked_step" "$run_result" "$final_policy"
const initialPolicy = JSON.parse(process.argv[2]);
const bodyPolicy = JSON.parse(process.argv[3]);
const userPolicy = JSON.parse(process.argv[4]);
const crossPolicy = JSON.parse(process.argv[5]);
const approvedCrossPolicy = JSON.parse(process.argv[6]);
const deniedPolicy = JSON.parse(process.argv[7]);
const blockedStep = JSON.parse(process.argv[8]);
const runResult = JSON.parse(process.argv[9]);
const finalPolicy = JSON.parse(process.argv[10]);

const counts = finalPolicy.policy?.counts ?? {};
if ((counts.require_approval ?? 0) < 1 || (counts.audit_only ?? 0) < 2 || (counts.deny ?? 0) < 1) {
  throw new Error("final policy audit counts did not include expected governance decisions");
}

console.log(JSON.stringify({
  policyEngine: {
    stateFile: process.env.OPENCLAW_CORE_STATE_FILE ?? null,
    mode: finalPolicy.policy?.mode ?? null,
    rules: initialPolicy.policy?.rules ?? null,
    counts,
  },
  bodyGovernance: {
    domain: bodyPolicy.policy?.domain ?? null,
    decision: bodyPolicy.policy?.decision ?? null,
  },
  userTaskGovernance: {
    domain: userPolicy.policy?.domain ?? null,
    decision: userPolicy.policy?.decision ?? null,
  },
  crossBoundaryGovernance: {
    unapproved: crossPolicy.policy?.decision ?? null,
    approved: approvedCrossPolicy.policy?.decision ?? null,
    denied: deniedPolicy.policy?.decision ?? null,
  },
  operatorGate: {
    blocked: blockedStep.blocked,
    reason: blockedStep.reason,
  },
  approvedExecution: {
    ran: runResult.ran,
    taskStatus: runResult.steps?.[0]?.task?.status ?? null,
    policyDecision: runResult.steps?.[0]?.policy?.decision ?? null,
  },
}, null, 2));
EOF
