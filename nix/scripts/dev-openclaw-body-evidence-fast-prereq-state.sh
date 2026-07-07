#!/usr/bin/env bash

openclaw_body_evidence_prepare_demo_status_prereq_state() {
  local script_dir="$1"
  local repo_root="$2"
  local target_core_state="$3"
  local target_system_heal_state="$4"
  local target_ledger_dir="$5"
  local source_core_state="${OPENCLAW_BODY_EVIDENCE_PREREQ_SOURCE_CORE:-$repo_root/.artifacts/openclaw-core-body-evidence-ledger-demo-status-check.json}"
  local source_system_heal_state="${OPENCLAW_BODY_EVIDENCE_PREREQ_SOURCE_SYSTEM_HEAL:-$repo_root/.artifacts/openclaw-system-heal-body-evidence-ledger-demo-status-check.json}"
  local source_ledger_file="${OPENCLAW_BODY_EVIDENCE_PREREQ_SOURCE_LEDGER_FILE:-$repo_root/.artifacts/openclaw-body-evidence-ledger-prereq/body-evidence-ledger.jsonl}"

  if [[ -f "$script_dir/dev-openclaw-fast-prereq-state.sh" ]]; then
    # shellcheck source=/dev/null
    source "$script_dir/dev-openclaw-fast-prereq-state.sh"
  fi

  if [[ ! -f "$source_ledger_file" ]]; then
    echo "Fast body-evidence prerequisite ledger file not found: $source_ledger_file" >&2
    return 1
  fi

  if ! node - <<'EOF' "$source_ledger_file"; then
const fs = require("node:fs");
const [ledgerFile] = process.argv.slice(2);
const lines = fs.readFileSync(ledgerFile, "utf8").trim().split(/\n/).filter(Boolean);
if (lines.length !== 1) {
  throw new Error(`Expected one bootstrap ledger line in ${ledgerFile}, got ${lines.length}`);
}
const record = JSON.parse(lines[0]);
if (record.evidenceType !== "body_evidence_ledger_bootstrap") {
  throw new Error(`Expected body evidence bootstrap record in ${ledgerFile}`);
}
EOF
    return 1
  fi

  declare -F openclaw_reuse_prereq_state >/dev/null \
    && openclaw_reuse_prereq_state \
      "$source_core_state" \
      "$source_system_heal_state" \
      "$target_core_state" \
      "$target_system_heal_state" \
      "body-evidence-ledger-demo-status" \
      "openclaw-body-evidence-ledger-first-record-task-v0" \
      "body_evidence_ledger_bootstrap" \
    && mkdir -p "$target_ledger_dir" \
    && cp "$source_ledger_file" "$target_ledger_dir/body-evidence-ledger.jsonl"
}
