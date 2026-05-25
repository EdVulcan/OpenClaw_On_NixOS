#!/usr/bin/env bash
set -euo pipefail
PHASE13_14_CHECK_KIND=runtime-adapter-task PHASE13_14_PORT_BASE=8320 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-cloud-consciousness-live-provider-runtime-adapter-common-check.sh"
