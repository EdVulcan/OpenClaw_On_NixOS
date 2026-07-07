#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE_CORE_STATE="$REPO_ROOT/.artifacts/openclaw-core-body-evidence-ledger-demo-status-check.json"
SOURCE_SYSTEM_HEAL_STATE="$REPO_ROOT/.artifacts/openclaw-system-heal-body-evidence-ledger-demo-status-check.json"
SOURCE_LEDGER_FILE="$REPO_ROOT/.artifacts/openclaw-body-evidence-ledger-prereq/body-evidence-ledger.jsonl"

if [[ ! -f "$SOURCE_CORE_STATE" || ! -f "$SOURCE_SYSTEM_HEAL_STATE" || ! -f "$SOURCE_LEDGER_FILE" ]]; then
  bash "$SCRIPT_DIR/dev-openclaw-body-evidence-ledger-demo-status-check.sh" >/dev/null
  mkdir -p "$(dirname "$SOURCE_LEDGER_FILE")"
  cp "$REPO_ROOT/.artifacts/openclaw-body-evidence-ledger/body-evidence-ledger.jsonl" "$SOURCE_LEDGER_FILE"
fi

OPENCLAW_MILESTONE_PREREQ_MODE=fast \
OPENCLAW_BODY_EVIDENCE_FAST_PREREQ_REQUIRED=true \
OPENCLAW_BODY_EVIDENCE_PREREQ_SOURCE_CORE="$SOURCE_CORE_STATE" \
OPENCLAW_BODY_EVIDENCE_PREREQ_SOURCE_SYSTEM_HEAL="$SOURCE_SYSTEM_HEAL_STATE" \
OPENCLAW_BODY_EVIDENCE_PREREQ_SOURCE_LEDGER_FILE="$SOURCE_LEDGER_FILE" \
  bash "$SCRIPT_DIR/dev-openclaw-body-evidence-ledger-followup-record-readiness-check.sh"
