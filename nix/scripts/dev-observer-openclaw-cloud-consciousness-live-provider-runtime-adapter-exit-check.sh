#!/usr/bin/env bash
set -euo pipefail
PHASE13_14_CHECK_KIND=runtime-adapter-exit PHASE13_14_OBSERVER_CHECK=true PHASE13_14_PORT_BASE=8370 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-cloud-consciousness-live-provider-runtime-adapter-common-check.sh"
