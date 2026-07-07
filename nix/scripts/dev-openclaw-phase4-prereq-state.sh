#!/usr/bin/env bash

openclaw_phase4_prepare_system_heal_prereq_state() {
  local script_dir="$1"
  local repo_root="$2"
  local target_system_heal_state="$3"
  local source_system_heal_state="${OPENCLAW_PHASE4_SYSTEM_HEAL_PREREQ_SOURCE:-$repo_root/.artifacts/openclaw-system-heal-phase-4-heal-history-evidence-check.json}"

  if [[ -f "$script_dir/dev-openclaw-fast-prereq-state.sh" ]]; then
    # shellcheck source=/dev/null
    source "$script_dir/dev-openclaw-fast-prereq-state.sh"
  fi

  declare -F openclaw_reuse_prereq_state >/dev/null \
    && openclaw_reuse_prereq_state \
      "" \
      "$source_system_heal_state" \
      "" \
      "$target_system_heal_state" \
      "phase-4-self-heal-evidence" \
      "maintenance-v0" \
      "phase-4-memory-pressure"
}
