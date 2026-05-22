#!/usr/bin/env bash
set -euo pipefail
PHASE7_CHECK_KIND=readback PHASE7_OBSERVER_CHECK=true PHASE7_PORT_BASE=7290 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-long-term-memory-common-check.sh"
