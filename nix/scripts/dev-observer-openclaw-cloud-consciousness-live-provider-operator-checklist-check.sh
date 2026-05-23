#!/usr/bin/env bash
set -euo pipefail
PHASE11_CHECK_KIND=live-provider-operator-checklist PHASE11_OBSERVER_CHECK=true PHASE11_PORT_BASE=7930 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-cloud-consciousness-live-provider-common-check.sh"
