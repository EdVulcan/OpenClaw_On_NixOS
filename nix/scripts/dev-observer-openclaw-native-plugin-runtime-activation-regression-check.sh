#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

checks=(
  "dev-observer-openclaw-native-plugin-runtime-activation-plan-check.sh"
  "dev-observer-openclaw-native-plugin-runtime-activation-task-check.sh"
  "dev-observer-openclaw-native-plugin-runtime-activation-denial-recovery-check.sh"
  "dev-observer-openclaw-native-plugin-runtime-activation-hardening-check.sh"
  "dev-observer-openclaw-native-plugin-runtime-activation-persistence-check.sh"
)

for check in "${checks[@]}"; do
  echo "==> observer native plugin runtime activation regression: $check"
  bash "$SCRIPT_DIR/$check"
done

echo '{"observerOpenClawNativePluginRuntimeActivationRegression":{"status":"passed","checks":5}}'
