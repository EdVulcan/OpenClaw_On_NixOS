#!/usr/bin/env bash
set -euo pipefail
OPENCLAW_CONTEXT_PACKET_CHECK_KIND=openclaw-native-engineering-context-packet \
  bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-native-engineering-context-packet-common-check.sh"
