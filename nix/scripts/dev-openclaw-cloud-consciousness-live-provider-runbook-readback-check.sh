#!/usr/bin/env bash
set -euo pipefail
PHASE11_CHECK_KIND=live-provider-runbook-readback PHASE11_PORT_BASE=7900 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-cloud-consciousness-live-provider-common-check.sh"
