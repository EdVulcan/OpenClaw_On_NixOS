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
  "approval|dev-approval-check.sh|Approval inbox, user decisions, and operator approval gate"
  "capability|dev-capability-check.sh|Body capability registry, risks, health, and approval boundaries"
  "capability-planner|dev-capability-planner-check.sh|Capability-aware planning with risk and governance metadata"
  "capability-invoke|dev-capability-invoke-check.sh|Policy-governed capability invocation through core"
  "event-audit|dev-event-audit-check.sh|Durable event audit ledger, filters, summary, and restart recovery"
  "system-capability|dev-system-capability-check.sh|Conservative filesystem, process, and command dry-run capabilities"
  "system-sense|dev-system-sense-check.sh|Real body vitals, service latency, resources, and alerts"
  "system-heal|dev-system-heal-check.sh|Conservative diagnosis, repair plan, autofix, and heal history"
  "observer-capability-plan|dev-observer-capability-plan-check.sh|Observer visibility for capability-aware plan metadata"
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
