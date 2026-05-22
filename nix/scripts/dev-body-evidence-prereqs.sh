#!/usr/bin/env bash

prepare_body_evidence_timeline_readiness() {
  local core_url="$1"
  local reason="${2:-Prepare one next repair execution before body evidence ledger checks.}"
  local created_next_repair
  local next_repair_approval_id

  created_next_repair="$(curl --silent --fail -X POST "$core_url/system/systemd/next-repair-tasks" \
    -H 'content-type: application/json' \
    --data '{"confirm":true,"execute":true}')"
  next_repair_approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$created_next_repair")"
  curl --silent --fail -X POST "$core_url/approvals/$next_repair_approval_id/approve" \
    -H 'content-type: application/json' \
    --data "{\"approvedBy\":\"milestone-check\",\"reason\":\"$reason\"}" >/dev/null
  curl --silent --fail -X POST "$core_url/operator/step" \
    -H 'content-type: application/json' \
    --data '{}' >/dev/null
}
