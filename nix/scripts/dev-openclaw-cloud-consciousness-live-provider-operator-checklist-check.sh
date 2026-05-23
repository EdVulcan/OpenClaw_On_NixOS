#!/usr/bin/env bash
set -euo pipefail
PHASE11_CHECK_KIND=live-provider-operator-checklist PHASE11_PORT_BASE=7840 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-cloud-consciousness-live-provider-common-check.sh"
