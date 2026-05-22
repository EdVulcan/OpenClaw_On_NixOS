#!/usr/bin/env bash
set -euo pipefail
PHASE7_CHECK_KIND=proposal PHASE7_OBSERVER_CHECK=true PHASE7_PORT_BASE=7250 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-long-term-memory-common-check.sh"
