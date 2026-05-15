#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

checks=(
  "dev-observer-openclaw-source-derived-edit-proposal-check.sh"
  "dev-observer-openclaw-workspace-edit-target-selection-check.sh"
  "dev-observer-openclaw-prompt-semantics-edit-plan-check.sh"
  "dev-observer-openclaw-rationale-check-bundle-check.sh"
  "dev-observer-openclaw-source-authored-edit-task-check.sh"
)

for check in "${checks[@]}"; do
  echo "==> observer source integration regression: $check"
  bash "$SCRIPT_DIR/$check"
done

echo '{"observerOpenClawSourceIntegrationRegression":{"status":"passed","checks":5}}'
