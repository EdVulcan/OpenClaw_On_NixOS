#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_FILE="$REPO_ROOT/.artifacts/dev-services-unix.tsv"

ports=(4100 4101 4102 4103 4104 4105 4106 4107 4170)

find_listener_pid() {
  local port="$1"
  ss -ltnpH "( sport = :$port )" 2>/dev/null \
    | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' \
    | head -n 1
}

is_managed_service_pid() {
  local pid="$1"
  local cmdline=""

  if [[ -z "$pid" ]] || ! kill -0 "$pid" >/dev/null 2>&1; then
    return 1
  fi

  cmdline="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  [[ "$cmdline" == *"$REPO_ROOT"* ]] && [[ "$cmdline" == *"src/server.mjs"* ]]
}

if [[ ! -f "$STATE_FILE" ]]; then
  echo "No unix dev state file found at $STATE_FILE"
else
  while IFS=$'\t' read -r name pid _rest; do
    if is_managed_service_pid "${pid:-}"; then
      kill "$pid" >/dev/null 2>&1 || true
      echo "Stopped $name (PID $pid)"
    fi
  done <"$STATE_FILE"

  rm -f "$STATE_FILE"
fi

for port in "${ports[@]}"; do
  pid="$(find_listener_pid "$port")"
  if is_managed_service_pid "$pid"; then
    kill "$pid" >/dev/null 2>&1 || true
    echo "Stopped listener on port $port (PID $pid)"
  fi
done

echo "Unix dev services stopped."
