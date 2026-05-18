#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

checks=(
  "dev-openclaw-plugin-search-web-adapter-provider-runtime-sandbox-check.sh"
  "dev-openclaw-plugin-search-web-adapter-provider-runtime-sandbox-task-check.sh"
  "dev-openclaw-plugin-search-web-adapter-provider-runtime-sandbox-denial-recovery-check.sh"
  "dev-openclaw-plugin-search-web-adapter-provider-runtime-sandbox-hardening-check.sh"
  "dev-openclaw-plugin-search-web-adapter-provider-runtime-sandbox-persistence-check.sh"
)

for check in "${checks[@]}"; do
  echo "==> provider runtime sandbox regression: $check"
  bash "$SCRIPT_DIR/$check"
done

echo '{"openclawPluginSearchWebAdapterProviderRuntimeSandboxRegression":{"status":"passed","checks":5}}'
