#!/usr/bin/env bash
set -euo pipefail
PHASE13_14_CHECK_KIND=approved-runtime-adapter-deferred PHASE13_14_OBSERVER_CHECK=true PHASE13_14_PORT_BASE=8350 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-cloud-consciousness-live-provider-runtime-adapter-common-check.sh"
