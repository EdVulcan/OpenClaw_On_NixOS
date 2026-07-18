#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_SYSTEMD_JOURNAL_EVIDENCE_CHECK_KIND=observer \
  bash "$(dirname "${BASH_SOURCE[0]}")/dev-openclaw-systemd-journal-evidence-common-check.sh"
