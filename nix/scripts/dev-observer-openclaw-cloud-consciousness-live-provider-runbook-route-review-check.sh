#!/usr/bin/env bash
set -euo pipefail
PHASE11_CHECK_KIND=live-provider-runbook-route-review PHASE11_OBSERVER_CHECK=true PHASE11_PORT_BASE=7960 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-cloud-consciousness-live-provider-common-check.sh"
