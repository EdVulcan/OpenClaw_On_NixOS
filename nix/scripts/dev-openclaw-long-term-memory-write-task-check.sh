#!/usr/bin/env bash
set -euo pipefail
PHASE7_CHECK_KIND=write-task PHASE7_PORT_BASE=7190 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-long-term-memory-common-check.sh"
