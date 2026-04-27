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
  local timeout="${2:-30}"
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

is_managed_service_pid() {
  local pid="$1"
  local cmdline=""
  local cwd=""

  if [[ -z "$pid" ]] || ! kill -0 "$pid" >/dev/null 2>&1; then
    return 1
  fi

  cmdline="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"

  if [[ "$cwd" == "$REPO_ROOT"/services/* ]] || [[ "$cwd" == "$REPO_ROOT"/apps/* ]]; then
    [[ "$cmdline" == *"src/server.mjs"* ]]
    return $?
  fi

  [[ "$cmdline" == *"$REPO_ROOT"* ]] && [[ "$cmdline" == *"src/server.mjs"* ]]
}

kill_listener_on_port() {
  local port="$1"
  local pid=""
  pid="$(find_listener_pid "$port")"
  if is_managed_service_pid "$pid"; then
    kill "$pid" >/dev/null 2>&1 || true
    sleep 0.5
  fi
}

print_health_failure_debug() {
  local name="$1"
  local port="$2"
  local health_url="$3"
  local log_file="$ARTIFACT_DIR/$name.log"
  local pid_file="$ARTIFACT_DIR/$name.pid"
  local pid=""

  if [[ -f "$pid_file" ]]; then
    pid="$(cat "$pid_file" 2>/dev/null || true)"
  fi

  echo "Health check failed for $name at $health_url" >&2
  if [[ -n "$pid" ]]; then
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "Process $pid is still running." >&2
      ps -p "$pid" -o pid=,ppid=,etime=,%cpu=,%mem=,args= >&2 || true
    else
      echo "Process $pid is not running." >&2
    fi
  fi

  echo "Listener status for port $port:" >&2
  ss -ltnp "( sport = :$port )" >&2 || true

  if [[ -f "$log_file" ]]; then
    echo "Last log lines from $log_file:" >&2
    tail -n 40 "$log_file" >&2 || true
  else
    echo "No log file found at $log_file" >&2
  fi
}

start_service_process() {
  local name="$1"
  local working_dir="$2"
  local pid_file="$ARTIFACT_DIR/$name.pid"
  local log_file="$ARTIFACT_DIR/$name.log"

  rm -f "$pid_file" "$log_file"
  (
    cd "$working_dir"
    export OPENCLAW_CORE_HOST="0.0.0.0"
    export OPENCLAW_EVENT_HUB_HOST="0.0.0.0"
    export OPENCLAW_SESSION_MANAGER_HOST="0.0.0.0"
    export OPENCLAW_BROWSER_RUNTIME_HOST="0.0.0.0"
    export OPENCLAW_SCREEN_SENSE_HOST="0.0.0.0"
    export OPENCLAW_SCREEN_ACT_HOST="0.0.0.0"
    export OPENCLAW_SYSTEM_SENSE_HOST="0.0.0.0"
    export OPENCLAW_SYSTEM_HEAL_HOST="0.0.0.0"
    export OBSERVER_UI_HOST="0.0.0.0"
    nohup "$NODE_EXE" src/server.mjs >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )
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
  success=0
  for attempt in 1 2; do
    kill_listener_on_port "$port"
    start_service_process "$name" "$working_dir"
    pid="$(cat "$ARTIFACT_DIR/$name.pid")"

    if wait_health "$health_url"; then
      success=1
      break
    fi

    print_health_failure_debug "$name" "$port" "$health_url"
    if [[ "$attempt" -lt 2 ]]; then
      echo "Retrying $name startup..." >&2
      if is_managed_service_pid "$pid"; then
        kill "$pid" >/dev/null 2>&1 || true
        sleep 0.5
      fi
    fi
  done

  if [[ "$success" -ne 1 ]]; then
    exit 1
  fi

  printf '%s\t%s\t%s\t%s\n' "$name" "$pid" "$working_dir" "$health_url" >>"$STATE_FILE"
  echo "$name is ready."
done

echo
echo "All services are up."
echo "State file: $STATE_FILE"
