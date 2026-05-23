#!/usr/bin/env bash
set -euo pipefail
PHASE11_CHECK_KIND=live-provider-egress-transcript-schema PHASE11_PORT_BASE=7850 bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-cloud-consciousness-live-provider-common-check.sh"
