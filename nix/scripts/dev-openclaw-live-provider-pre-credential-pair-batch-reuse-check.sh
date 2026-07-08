#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST_FILE="${OPENCLAW_LIVE_PROVIDER_PRE_CREDENTIAL_PAIR_MILESTONES_FILE:-$SCRIPT_DIR/openclaw-live-provider-pre-credential-pair-milestones.tsv}"
PORT_BASE="${OPENCLAW_LIVE_PROVIDER_PRE_CREDENTIAL_PAIR_BATCH_PORT_BASE:-29800}"
RUN_ID="${OPENCLAW_LIVE_PROVIDER_PRE_CREDENTIAL_PAIR_BATCH_RUN_ID:-pre-credential-pair-batch-$$}"
GROUP_FILTER_RAW="${OPENCLAW_LIVE_PROVIDER_PRE_CREDENTIAL_PAIR_BATCH_GROUPS:-}"

export OPENCLAW_DEV_RUN_ID="$RUN_ID"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/$RUN_ID-events.jsonl}"
export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-$PORT_BASE}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-$((PORT_BASE + 1))}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-$((PORT_BASE + 2))}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-$((PORT_BASE + 3))}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-$((PORT_BASE + 4))}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-$((PORT_BASE + 5))}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-$((PORT_BASE + 6))}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-$((PORT_BASE + 7))}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-$((PORT_BASE + 8))}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-pre-credential-pair-batch-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-pre-credential-pair-batch-check.json}"

mapfile -t PAIR_ROWS < <(awk -F '\t' '$0 !~ /^#/ && NF { print }' "$MANIFEST_FILE")
read -r -a GROUP_FILTERS <<< "${GROUP_FILTER_RAW//,/ }"

run_dev_down() {
  OPENCLAW_DEV_SERVICES_KEEP_UP=false \
  OPENCLAW_DEV_SERVICES_ALREADY_UP=false \
  OPENCLAW_DEV_DOWN_FORCE=true \
    bash "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}

cleanup() {
  run_dev_down
}
trap cleanup EXIT

contains_token() {
  local token="$1"
  shift
  local candidate
  for candidate in "$@"; do
    if [[ "$candidate" == "$token" ]]; then
      return 0
    fi
  done
  return 1
}

group_selected() {
  local group="$1"
  if ((${#GROUP_FILTERS[@]} == 0)); then
    return 0
  fi
  contains_token "$group" "${GROUP_FILTERS[@]}"
}

run_pair_common_check() {
  local row="$1"
  local observer_check="$2"
  local already_up="$3"
  local label
  local public_check
  local observer_public_check
  local common_script
  local port_var
  local observer_var
  local extra_env
  local group
  local check_kind="core"
  local check_name
  local check_start
  local check_duration
  local -a extra_env_args=()

  IFS=$'\t' read -r label _phase public_check observer_public_check common_script port_var observer_var extra_env group <<< "$row"
  if [[ ! -f "$SCRIPT_DIR/$common_script" ]]; then
    echo "Missing pre-credential pair common check for $label: $SCRIPT_DIR/$common_script" >&2
    exit 1
  fi

  if [[ "$extra_env" != "-" ]]; then
    IFS="," read -r -a extra_env_args <<< "$extra_env"
  fi

  check_name="$public_check"
  if [[ "$observer_check" == "true" ]]; then
    check_kind="observer"
    check_name="$observer_public_check"
  fi

  check_start="$SECONDS"
  env \
    "$port_var=$PORT_BASE" \
    "$observer_var=$observer_check" \
    OPENCLAW_DEV_SERVICES_KEEP_UP=true \
    OPENCLAW_DEV_SERVICES_ALREADY_UP="$already_up" \
    "${extra_env_args[@]}" \
      bash "$SCRIPT_DIR/$common_script"
  check_duration=$((SECONDS - check_start))
  CHECK_TIMING_LABELS+=("$label")
  CHECK_TIMING_KINDS+=("$check_kind")
  CHECK_TIMING_GROUPS+=("$group")
  CHECK_TIMING_NAMES+=("$check_name")
  CHECK_TIMING_DURATIONS+=("$check_duration")
}

PAIR_LABELS=()
PAIR_PUBLIC_CHECKS=()
PAIR_OBSERVER_CHECKS=()
PAIR_GROUPS=()
ALL_PAIR_GROUPS=()
SELECTED_PAIR_ROWS=()
CHECK_TIMING_LABELS=()
CHECK_TIMING_KINDS=()
CHECK_TIMING_GROUPS=()
CHECK_TIMING_NAMES=()
CHECK_TIMING_DURATIONS=()
GROUP_TIMING_GROUPS=()
GROUP_TIMING_DURATIONS=()
GROUP_TIMING_CORE_DURATIONS=()
GROUP_TIMING_OBSERVER_DURATIONS=()

for row in "${PAIR_ROWS[@]}"; do
  IFS=$'\t' read -r label _phase public_check observer_check _common_script _port_var _observer_var _extra_env group <<< "$row"
  if [[ " ${ALL_PAIR_GROUPS[*]} " != *" $group "* ]]; then
    ALL_PAIR_GROUPS+=("$group")
  fi
  if ! group_selected "$group"; then
    continue
  fi
  SELECTED_PAIR_ROWS+=("$row")
  PAIR_LABELS+=("$label")
  PAIR_PUBLIC_CHECKS+=("$public_check")
  PAIR_OBSERVER_CHECKS+=("$observer_check")
  if [[ " ${PAIR_GROUPS[*]} " != *" $group "* ]]; then
    PAIR_GROUPS+=("$group")
  fi
done

for group_filter in "${GROUP_FILTERS[@]}"; do
  if [[ -n "$group_filter" ]] && ! contains_token "$group_filter" "${ALL_PAIR_GROUPS[@]}"; then
    echo "Unknown pre-credential pair batch group filter: $group_filter" >&2
    echo "Known groups: ${ALL_PAIR_GROUPS[*]}" >&2
    exit 1
  fi
done

if ((${#SELECTED_PAIR_ROWS[@]} == 0)); then
  echo "No pre-credential pair rows selected by group filter: ${GROUP_FILTER_RAW:-<all>}" >&2
  exit 1
fi

BATCH_START="$SECONDS"
for group in "${PAIR_GROUPS[@]}"; do
  group_start="$SECONDS"
  run_dev_down
  rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"

  already_up=false
  core_start="$SECONDS"
  for row in "${SELECTED_PAIR_ROWS[@]}"; do
    IFS=$'\t' read -r _label _phase _public_check _observer_check _common_script _port_var _observer_var _extra_env row_group <<< "$row"
    if [[ "$row_group" == "$group" ]]; then
      run_pair_common_check "$row" false "$already_up"
      already_up=true
    fi
  done
  core_duration=$((SECONDS - core_start))

  observer_start="$SECONDS"
  for row in "${SELECTED_PAIR_ROWS[@]}"; do
    IFS=$'\t' read -r _label _phase _public_check _observer_check _common_script _port_var _observer_var _extra_env row_group <<< "$row"
    if [[ "$row_group" == "$group" ]]; then
      run_pair_common_check "$row" true true
    fi
  done
  observer_duration=$((SECONDS - observer_start))
  group_duration=$((SECONDS - group_start))
  GROUP_TIMING_GROUPS+=("$group")
  GROUP_TIMING_DURATIONS+=("$group_duration")
  GROUP_TIMING_CORE_DURATIONS+=("$core_duration")
  GROUP_TIMING_OBSERVER_DURATIONS+=("$observer_duration")
done
BATCH_DURATION=$((SECONDS - BATCH_START))

node - <<'NODE' "$PORT_BASE" "$RUN_ID" "$GROUP_FILTER_RAW" "${#PAIR_ROWS[@]}" "${#ALL_PAIR_GROUPS[@]}" "$BATCH_DURATION" "${PAIR_LABELS[*]}" "${PAIR_PUBLIC_CHECKS[*]}" "${PAIR_OBSERVER_CHECKS[*]}" "${PAIR_GROUPS[*]}" "${GROUP_TIMING_GROUPS[*]}" "${GROUP_TIMING_DURATIONS[*]}" "${GROUP_TIMING_CORE_DURATIONS[*]}" "${GROUP_TIMING_OBSERVER_DURATIONS[*]}" "${CHECK_TIMING_LABELS[*]}" "${CHECK_TIMING_KINDS[*]}" "${CHECK_TIMING_GROUPS[*]}" "${CHECK_TIMING_NAMES[*]}" "${CHECK_TIMING_DURATIONS[*]}"
const [
  portBaseRaw,
  runId,
  groupFilterRaw,
  fullPairCountRaw,
  fullGroupCountRaw,
  batchDurationRaw,
  labelsRaw,
  coreChecksRaw,
  observerChecksRaw,
  groupsRaw,
  groupTimingGroupsRaw,
  groupTimingDurationsRaw,
  groupTimingCoreDurationsRaw,
  groupTimingObserverDurationsRaw,
  checkTimingLabelsRaw,
  checkTimingKindsRaw,
  checkTimingGroupsRaw,
  checkTimingNamesRaw,
  checkTimingDurationsRaw,
] = process.argv.slice(2);
const split = (raw) => raw.split(/\s+/).filter(Boolean);
const labels = split(labelsRaw);
const coreChecks = split(coreChecksRaw);
const observerChecks = split(observerChecksRaw);
const groups = split(groupsRaw);
const groupTimingGroups = split(groupTimingGroupsRaw);
const groupTimingDurations = split(groupTimingDurationsRaw);
const groupTimingCoreDurations = split(groupTimingCoreDurationsRaw);
const groupTimingObserverDurations = split(groupTimingObserverDurationsRaw);
const checkTimingLabels = split(checkTimingLabelsRaw);
const checkTimingKinds = split(checkTimingKindsRaw);
const checkTimingGroups = split(checkTimingGroupsRaw);
const checkTimingNames = split(checkTimingNamesRaw);
const checkTimingDurations = split(checkTimingDurationsRaw);
const groupTimings = groupTimingGroups.map((group, index) => ({
  group,
  durationSeconds: Number.parseInt(groupTimingDurations[index] ?? "0", 10),
  coreDurationSeconds: Number.parseInt(groupTimingCoreDurations[index] ?? "0", 10),
  observerDurationSeconds: Number.parseInt(groupTimingObserverDurations[index] ?? "0", 10),
}));
const checkTimings = checkTimingNames.map((checkName, index) => ({
  label: checkTimingLabels[index],
  kind: checkTimingKinds[index],
  group: checkTimingGroups[index],
  checkName,
  durationSeconds: Number.parseInt(checkTimingDurations[index] ?? "0", 10),
}));
const slowestGroups = [...groupTimings]
  .sort((left, right) => right.durationSeconds - left.durationSeconds);
const slowestChecks = [...checkTimings]
  .sort((left, right) => right.durationSeconds - left.durationSeconds)
  .slice(0, 10);
const groupFilter = groupFilterRaw.trim();
console.log(JSON.stringify({
  openclawLiveProviderPreCredentialPairBatchReuse: {
    status: "passed",
    phaseRange: "24-57",
    coverage: groupFilter ? "group-filtered" : "full",
    fullCoverage: !groupFilter,
    groupFilter: groupFilter || null,
    fullManifestPairCount: Number.parseInt(fullPairCountRaw, 10),
    fullManifestGroupCount: Number.parseInt(fullGroupCountRaw, 10),
    pairCount: labels.length,
    coreChecks: coreChecks.length,
    observerChecks: observerChecks.length,
    groupCount: groups.length,
    serviceLifecycle: "one shared lifecycle per adjacent pre-credential capability group",
    batchShape: "manifest-driven-compatible-pre-credential-pairs",
    durationSeconds: Number.parseInt(batchDurationRaw, 10),
    runId,
    runtimeProfileFile: process.env.OPENCLAW_RUNTIME_PROFILE_FILE || null,
    groups,
    groupTimings,
    slowestGroups,
    slowestChecks,
    checkTimings,
    labels,
    representativePairs: coreChecks,
    observerPairs: observerChecks,
    portBase: Number.parseInt(portBaseRaw, 10),
  },
}, null, 2));
NODE
