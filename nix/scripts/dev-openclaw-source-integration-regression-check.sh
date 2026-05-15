#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

checks=(
  "dev-openclaw-source-derived-edit-proposal-check.sh"
  "dev-openclaw-workspace-edit-target-selection-check.sh"
  "dev-openclaw-prompt-semantics-edit-plan-check.sh"
  "dev-openclaw-rationale-check-bundle-check.sh"
  "dev-openclaw-source-authored-edit-task-check.sh"
)

for check in "${checks[@]}"; do
  echo "==> source integration regression: $check"
  bash "$SCRIPT_DIR/$check"
done

echo '{"openclawSourceIntegrationRegression":{"status":"passed","checks":5}}'
