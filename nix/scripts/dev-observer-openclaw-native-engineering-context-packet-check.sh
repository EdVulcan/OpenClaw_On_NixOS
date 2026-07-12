#!/usr/bin/env bash
set -euo pipefail
OPENCLAW_CONTEXT_PACKET_CHECK_KIND=observer-openclaw-native-engineering-context-packet \
OPENCLAW_CONTEXT_PACKET_OBSERVER_CHECK=true \
  bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-native-engineering-context-packet-common-check.sh"
