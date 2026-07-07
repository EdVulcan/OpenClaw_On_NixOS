#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE_SYSTEM_HEAL_STATE="$REPO_ROOT/.artifacts/openclaw-system-heal-phase-4-heal-history-evidence-check.json"

if [[ ! -f "$SOURCE_SYSTEM_HEAL_STATE" ]]; then
  bash "$SCRIPT_DIR/dev-openclaw-phase-4-heal-history-evidence-check.sh" >/dev/null
fi

OPENCLAW_MILESTONE_PREREQ_MODE=fast \
OPENCLAW_PHASE4_FAST_PREREQ_REQUIRED=true \
OPENCLAW_PHASE4_SYSTEM_HEAL_PREREQ_SOURCE="$SOURCE_SYSTEM_HEAL_STATE" \
  bash "$SCRIPT_DIR/dev-openclaw-phase-6-consciousness-context-envelope-check.sh"
