#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_FILE="$REPO_ROOT/.artifacts/dev-services-unix.tsv"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "No unix dev state file found at $STATE_FILE"
  exit 0
fi

while IFS=$'\t' read -r name pid _rest; do
  if [[ -n "${pid:-}" ]] && kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    echo "Stopped $name (PID $pid)"
  fi
done <"$STATE_FILE"

rm -f "$STATE_FILE"
echo "Unix dev services stopped."
