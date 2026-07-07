#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_BASE="${OPENCLAW_CORE_OBSERVER_PAIR_BATCH_PORT_BASE:-26800}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-core-observer-pair-runner.sh"

cleanup() {
  openclaw_core_observer_pair_down "core-observer-pair-phase59-$$" "$PORT_BASE"
  openclaw_core_observer_pair_down "core-observer-pair-phase60-$$" "$((PORT_BASE + 100))"
}
trap cleanup EXIT

OPENCLAW_CORE_OBSERVER_PAIR_RUN_ID="core-observer-pair-phase59-$$" \
  openclaw_run_core_observer_pair \
    "phase59" \
    "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-real-launch-execution-preflight-common-check.sh" \
    "PHASE59_PORT_BASE" \
    "PHASE59_OBSERVER_CHECK" \
    "$PORT_BASE"

OPENCLAW_CORE_OBSERVER_PAIR_RUN_ID="core-observer-pair-phase60-$$" \
  openclaw_run_core_observer_pair \
    "phase60" \
    "$SCRIPT_DIR/dev-openclaw-cloud-consciousness-live-provider-credential-value-access-gate-common-check.sh" \
    "PHASE60_PORT_BASE" \
    "PHASE60_OBSERVER_CHECK" \
    "$((PORT_BASE + 100))"

node - <<'NODE' "$PORT_BASE"
const portBase = Number.parseInt(process.argv[2], 10);
console.log(JSON.stringify({
  openclawCoreObserverPairBatchReuse: {
    status: "passed",
    pairCount: 2,
    coreChecks: 2,
    observerChecks: 2,
    serviceLifecycle: "one per core-observer pair",
    representativePairs: [
      "openclaw-cloud-consciousness-live-provider-real-launch-execution-preflight",
      "openclaw-cloud-consciousness-live-provider-credential-value-access-gate",
    ],
    portBases: [portBase, portBase + 100],
  },
}, null, 2));
NODE
