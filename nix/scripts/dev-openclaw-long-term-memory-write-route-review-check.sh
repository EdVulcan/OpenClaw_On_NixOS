#!/usr/bin/env bash
set -euo pipefail
PHASE7_CHECK_KIND=write-route-review PHASE7_PORT_BASE=7180 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-long-term-memory-common-check.sh"
