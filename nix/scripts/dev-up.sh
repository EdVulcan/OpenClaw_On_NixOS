#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ARTIFACT_DIR="$REPO_ROOT/.artifacts"
STATE_FILE="$ARTIFACT_DIR/dev-services-unix.tsv"

mkdir -p "$ARTIFACT_DIR"

NODE_EXE="${NODE_EXE:-$(command -v node || true)}"
if [[ -z "$NODE_EXE" ]]; then
  echo "Unable to locate node." >&2
  exit 1
fi

wait_health() {
  local url="$1"
  local timeout="${2:-20}"
  local deadline=$((SECONDS + timeout))
  while (( SECONDS < deadline )); do
    if curl --silent --fail "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.4
  done
  return 1
}

find_listener_pid() {
  local port="$1"
  ss -ltnpH "( sport = :$port )" 2>/dev/null \
    | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' \
    | head -n 1
}

kill_listener_on_port() {
  local port="$1"
  local pid=""
  pid="$(find_listener_pid "$port")"
  if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    sleep 0.5
  fi
}

services=(
  "openclaw-event-hub|$REPO_ROOT/services/openclaw-event-hub|http://127.0.0.1:4101/health|4101"
  "openclaw-core|$REPO_ROOT/services/openclaw-core|http://127.0.0.1:4100/health|4100"
  "openclaw-session-manager|$REPO_ROOT/services/openclaw-session-manager|http://127.0.0.1:4102/health|4102"
  "openclaw-browser-runtime|$REPO_ROOT/services/openclaw-browser-runtime|http://127.0.0.1:4103/health|4103"
  "openclaw-screen-sense|$REPO_ROOT/services/openclaw-screen-sense|http://127.0.0.1:4104/health|4104"
  "openclaw-screen-act|$REPO_ROOT/services/openclaw-screen-act|http://127.0.0.1:4105/health|4105"
  "openclaw-system-sense|$REPO_ROOT/services/openclaw-system-sense|http://127.0.0.1:4106/health|4106"
  "openclaw-system-heal|$REPO_ROOT/services/openclaw-system-heal|http://127.0.0.1:4107/health|4107"
  "observer-ui|$REPO_ROOT/apps/observer-ui|http://127.0.0.1:4170/health|4170"
)

: >"$STATE_FILE"

for entry in "${services[@]}"; do
  IFS="|" read -r name working_dir health_url port <<<"$entry"
  echo "Starting $name ..."
  kill_listener_on_port "$port"
  (
    cd "$working_dir"
    nohup "$NODE_EXE" src/server.mjs >"$ARTIFACT_DIR/$name.log" 2>&1 &
    echo $! >"$ARTIFACT_DIR/$name.pid"
  )
  pid="$(cat "$ARTIFACT_DIR/$name.pid")"

  if ! wait_health "$health_url"; then
    echo "Health check failed for $name at $health_url" >&2
    exit 1
  fi

  printf '%s\t%s\t%s\t%s\n' "$name" "$pid" "$working_dir" "$health_url" >>"$STATE_FILE"
  echo "$name is ready."
done

echo
echo "All services are up."
echo "State file: $STATE_FILE"
