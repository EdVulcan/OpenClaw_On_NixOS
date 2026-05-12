#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ARTIFACT_DIR="$REPO_ROOT/.artifacts/milestone-check"

mkdir -p "$ARTIFACT_DIR"

checks=(
  "body-config|dev-body-config-check.sh|NixOS body module, profiles, and systemd service skeleton"
  "state-settling|dev-state-settling-check.sh|Session/browser/screen first-frame settling"
  "task-workbench|dev-task-workbench-check.sh|Task lifecycle, recovery, history, and work view coordination"
  "task-executor|dev-task-executor-check.sh|Executor verification, failed checks, manual and auto recovery"
  "persistence|dev-persistence-check.sh|Core task state persistence and recovery chains"
  "planner|dev-planner-check.sh|Rule planner plan-only and planned execution flows"
  "operator-loop|dev-operator-loop-check.sh|Operator step/run queue consumption and persistence"
  "operator-control|dev-operator-control-check.sh|Operator state, dry-run, pause gate, and resume control"
  "policy|dev-policy-check.sh|Policy governance, audit, and cross-boundary execution gate"
  "sovereign-body-policy|dev-sovereign-body-policy-check.sh|Sovereign body autonomy for body-internal capability governance"
  "sovereign-command-execute|dev-sovereign-command-execute-check.sh|Sovereign body execution of allowlisted system commands"
  "sovereign-command-chain|dev-sovereign-command-chain-check.sh|Sovereign body command chains with persisted transcripts"
  "sovereign-command-branch|dev-sovereign-command-branch-check.sh|Sovereign body command branching from previous transcripts"
  "sovereign-command-recovery|dev-sovereign-command-recovery-check.sh|Sovereign body command recovery from non-zero exit codes"
  "sovereign-command-ledger|dev-sovereign-command-ledger-check.sh|Sovereign body command transcript ledger and restart recovery"
  "sovereign-filesystem-write|dev-sovereign-filesystem-write-check.sh|Sovereign body bounded filesystem text writes"
  "sovereign-filesystem-workspace|dev-sovereign-filesystem-workspace-check.sh|Sovereign body filesystem workspace creation chain"
  "sovereign-filesystem-append|dev-sovereign-filesystem-append-check.sh|Sovereign body bounded filesystem text appends"
  "sovereign-filesystem-ledger|dev-sovereign-filesystem-ledger-check.sh|Sovereign body filesystem change ledger and restart recovery"
  "sovereign-filesystem-read-text|dev-sovereign-filesystem-read-text-check.sh|Sovereign body bounded filesystem text readback"
  "sovereign-filesystem-read-ledger|dev-sovereign-filesystem-read-ledger-check.sh|Sovereign body filesystem read access ledger and restart recovery"
  "approval|dev-approval-check.sh|Approval inbox, user decisions, and operator approval gate"
  "capability|dev-capability-check.sh|Body capability registry, risks, health, and approval boundaries"
  "capability-planner|dev-capability-planner-check.sh|Capability-aware planning with risk and governance metadata"
  "capability-invoke|dev-capability-invoke-check.sh|Policy-governed capability invocation through core"
  "capability-history|dev-capability-history-check.sh|Persistent capability invocation history and restart recovery"
  "capability-operator|dev-capability-operator-check.sh|Operator execution through governed capability invocation"
  "capability-approval-operator|dev-capability-approval-operator-check.sh|Operator waits for user approval before high-risk capability execution"
  "event-audit|dev-event-audit-check.sh|Durable event audit ledger, filters, summary, and restart recovery"
  "system-capability|dev-system-capability-check.sh|Conservative filesystem, process, and command dry-run capabilities"
  "system-sense|dev-system-sense-check.sh|Real body vitals, service latency, resources, and alerts"
  "system-heal|dev-system-heal-check.sh|Conservative diagnosis, repair plan, autofix, and heal history"
  "openclaw-workspace-detect|dev-openclaw-workspace-detect-check.sh|Read-only detection of configured OpenClaw workspaces"
  "openclaw-workspace-command-proposals|dev-openclaw-workspace-command-proposals-check.sh|Proposal-only command shapes for detected OpenClaw workspaces"
  "openclaw-workspace-command-plan|dev-openclaw-workspace-command-plan-check.sh|Plan-only execution drafts for OpenClaw workspace command proposals"
  "openclaw-workspace-command-task|dev-openclaw-workspace-command-task-check.sh|Approval-gated task materialization for OpenClaw workspace commands"
  "openclaw-workspace-command-execute|dev-openclaw-workspace-command-execute-check.sh|Approved execution of allowlisted OpenClaw workspace commands"
  "openclaw-workspace-command-failure|dev-openclaw-workspace-command-failure-check.sh|Failure capture for approved OpenClaw workspace commands"
  "openclaw-workspace-command-denial|dev-openclaw-workspace-command-denial-check.sh|Denial safety for approval-gated OpenClaw workspace commands"
  "openclaw-workspace-command-recovery|dev-openclaw-workspace-command-recovery-check.sh|Recovery of failed OpenClaw workspace commands behind fresh approval"
  "openclaw-workspace-command-recovery-persistence|dev-openclaw-workspace-command-recovery-persistence-check.sh|Restart persistence for recovered OpenClaw workspace command chains"
  "observer-capability-plan|dev-observer-capability-plan-check.sh|Observer visibility for capability-aware plan metadata"
  "observer-capability-invoke|dev-observer-capability-invoke-check.sh|Observer controls for policy-governed capability invocation"
  "observer-capability-history|dev-observer-capability-history-check.sh|Observer visibility for persistent capability invocation history"
  "observer-command-transcript|dev-observer-command-transcript-check.sh|Observer visibility for sovereign command transcripts"
  "observer-command-ledger|dev-observer-command-ledger-check.sh|Observer visibility for sovereign command transcript ledger"
  "observer-filesystem-ledger|dev-observer-filesystem-ledger-check.sh|Observer visibility for sovereign filesystem change ledger"
  "observer-filesystem-read-ledger|dev-observer-filesystem-read-ledger-check.sh|Observer visibility for sovereign filesystem read access ledger"
  "observer-workspace-detect|dev-observer-workspace-detect-check.sh|Observer visibility for read-only OpenClaw workspace detection"
  "observer-workspace-command-proposals|dev-observer-workspace-command-proposals-check.sh|Observer visibility for OpenClaw workspace command proposals"
  "observer-workspace-command-plan|dev-observer-workspace-command-plan-check.sh|Observer visibility for OpenClaw workspace command plan drafts"
  "observer-workspace-command-task|dev-observer-workspace-command-task-check.sh|Observer controls for approval-gated OpenClaw workspace command tasks"
  "observer-workspace-command-execute|dev-observer-workspace-command-execute-check.sh|Observer controls and visibility for approved OpenClaw workspace command execution"
  "observer-workspace-command-failure|dev-observer-workspace-command-failure-check.sh|Observer visibility for failed OpenClaw workspace command execution"
  "observer-workspace-command-denial|dev-observer-workspace-command-denial-check.sh|Observer visibility for denied OpenClaw workspace command approvals"
  "observer-workspace-command-recovery|dev-observer-workspace-command-recovery-check.sh|Observer controls and visibility for recovered OpenClaw workspace commands"
  "observer-workspace-command-recovery-persistence|dev-observer-workspace-command-recovery-persistence-check.sh|Observer visibility for recovered OpenClaw workspace command chains across restarts"
  "observer-operator|dev-observer-operator-check.sh|Observer UI planner/operator controls and API wiring"
)

selected_filter="${OPENCLAW_MILESTONE_CHECKS:-}"
started_at="$(date -Iseconds)"
passed=0
failed=0
summary_json="$ARTIFACT_DIR/summary.json"

should_run_check() {
  local name="$1"
  if [[ -z "$selected_filter" ]]; then
    return 0
  fi

  local item=""
  IFS="," read -ra selected_items <<<"$selected_filter"
  for item in "${selected_items[@]}"; do
    item="${item#"${item%%[![:space:]]*}"}"
    item="${item%"${item##*[![:space:]]}"}"
    if [[ "$item" == "$name" ]]; then
      return 0
    fi
  done
  return 1
}

json_escape() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"
}

results_json=""

echo "OpenClaw milestone check started at $started_at"
echo "Logs: $ARTIFACT_DIR"
if [[ -n "$selected_filter" ]]; then
  echo "Selected checks: $selected_filter"
fi
echo

for entry in "${checks[@]}"; do
  IFS="|" read -r name script description <<<"$entry"
  if ! should_run_check "$name"; then
    continue
  fi

  log_file="$ARTIFACT_DIR/$name.log"
  start_seconds="$SECONDS"
  echo "==> [$name] $description"

  if bash "$SCRIPT_DIR/$script" >"$log_file" 2>&1; then
    duration=$((SECONDS - start_seconds))
    passed=$((passed + 1))
    echo "    PASS (${duration}s)"
    result="{\"name\":$(json_escape "$name"),\"status\":\"passed\",\"durationSeconds\":$duration,\"log\":$(json_escape "$log_file")}"
  else
    status=$?
    duration=$((SECONDS - start_seconds))
    failed=$((failed + 1))
    echo "    FAIL (${duration}s, exit $status)"
    echo "    Last log lines:"
    tail -n 60 "$log_file" | sed 's/^/      /'
    result="{\"name\":$(json_escape "$name"),\"status\":\"failed\",\"durationSeconds\":$duration,\"exitCode\":$status,\"log\":$(json_escape "$log_file")}"
  fi

  if [[ -z "$results_json" ]]; then
    results_json="$result"
  else
    results_json="$results_json,$result"
  fi
  echo
done

finished_at="$(date -Iseconds)"
total=$((passed + failed))
if (( total == 0 )); then
  echo "No milestone checks matched OPENCLAW_MILESTONE_CHECKS='$selected_filter'." >&2
  exit 1
fi

cat >"$summary_json" <<EOF
{
  "startedAt": "$started_at",
  "finishedAt": "$finished_at",
  "total": $total,
  "passed": $passed,
  "failed": $failed,
  "results": [$results_json]
}
EOF

cat "$summary_json"
echo

if (( failed > 0 )); then
  echo "Milestone check failed. Summary: $summary_json" >&2
  exit 1
fi

echo "Milestone check passed. Summary: $summary_json"
