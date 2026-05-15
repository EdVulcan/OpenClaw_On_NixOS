#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

checks=(
  "dev-observer-openclaw-source-command-proposals-check.sh"
  "dev-observer-openclaw-source-command-plan-check.sh"
  "dev-observer-openclaw-source-command-task-check.sh"
  "dev-observer-openclaw-source-command-execute-check.sh"
  "dev-observer-openclaw-source-command-denial-recovery-check.sh"
  "dev-observer-openclaw-source-command-hardening-check.sh"
  "dev-observer-openclaw-source-command-persistence-check.sh"
)

for check in "${checks[@]}"; do
  echo "==> observer source command regression: $check"
  bash "$SCRIPT_DIR/$check"
done

echo '{"observerOpenClawSourceCommandRegression":{"status":"passed","checks":7}}'
