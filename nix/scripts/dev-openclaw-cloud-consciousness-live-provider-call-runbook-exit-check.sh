#!/usr/bin/env bash
set -euo pipefail
PHASE11_CHECK_KIND=live-provider-call-runbook-exit PHASE11_PORT_BASE=7910 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-cloud-consciousness-live-provider-common-check.sh"
