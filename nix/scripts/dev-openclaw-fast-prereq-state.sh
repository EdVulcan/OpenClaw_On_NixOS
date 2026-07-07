#!/usr/bin/env bash

openclaw_reuse_prereq_state() {
  local source_core_state="$1"
  local source_system_heal_state="$2"
  local target_core_state="$3"
  local target_system_heal_state="$4"
  local prereq_name="$5"
  local expected_registry="$6"
  local expected_marker="$7"

  if [[ "${OPENCLAW_MILESTONE_PREREQ_MODE:-full}" != "fast" ]]; then
    return 1
  fi

  local validation_state="$source_core_state"
  if [[ -z "$validation_state" ]]; then
    validation_state="$source_system_heal_state"
  fi

  if [[ -z "$validation_state" || ! -f "$validation_state" ]]; then
    echo "Fast prerequisite state for $prereq_name not found: ${validation_state:-<none>}" >&2
    return 1
  fi

  if ! node - <<'EOF' "$validation_state" "$expected_registry" "$expected_marker" "$prereq_name"; then
const fs = require("node:fs");
const [stateFile, expectedRegistry, expectedMarker, prereqName] = process.argv.slice(2);
const raw = fs.readFileSync(stateFile, "utf8");
JSON.parse(raw);
if (!raw.includes(expectedRegistry)) {
  throw new Error(`Fast prerequisite ${prereqName} missing registry ${expectedRegistry}`);
}
if (!raw.includes(expectedMarker)) {
  throw new Error(`Fast prerequisite ${prereqName} missing marker ${expectedMarker}`);
}
EOF
    return 1
  fi

  if [[ -n "$source_core_state" && -f "$source_core_state" && -n "$target_core_state" ]]; then
    mkdir -p "$(dirname "$target_core_state")"
    cp "$source_core_state" "$target_core_state"
    rm -f "$target_core_state.tmp"
  fi

  if [[ -n "$source_system_heal_state" && -f "$source_system_heal_state" && -n "$target_system_heal_state" ]]; then
    mkdir -p "$(dirname "$target_system_heal_state")"
    cp "$source_system_heal_state" "$target_system_heal_state"
    rm -f "$target_system_heal_state.tmp"
  fi

  echo "Reused fast prerequisite state for $prereq_name from $validation_state"
  return 0
}
