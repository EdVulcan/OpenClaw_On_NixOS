#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

checks=(
  "dev-openclaw-source-command-proposals-check.sh"
  "dev-openclaw-source-command-plan-check.sh"
  "dev-openclaw-source-command-task-check.sh"
  "dev-openclaw-source-command-execute-check.sh"
  "dev-openclaw-source-command-denial-recovery-check.sh"
  "dev-openclaw-source-command-hardening-check.sh"
  "dev-openclaw-source-command-persistence-check.sh"
)

for check in "${checks[@]}"; do
  echo "==> source command regression: $check"
  bash "$SCRIPT_DIR/$check"
done

echo '{"openclawSourceCommandRegression":{"status":"passed","checks":7}}'
