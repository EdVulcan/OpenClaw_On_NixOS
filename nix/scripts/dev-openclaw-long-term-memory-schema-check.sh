#!/usr/bin/env bash
set -euo pipefail
PHASE7_CHECK_KIND=schema PHASE7_PORT_BASE=7160 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-long-term-memory-common-check.sh"
