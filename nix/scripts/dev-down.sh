#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_FILE="$REPO_ROOT/.artifacts/dev-services-unix.tsv"

ports=(
  4100 4101 4102 4103 4104 4105 4106 4107 4170
  "${OPENCLAW_CORE_PORT:-}"
  "${OPENCLAW_EVENT_HUB_PORT:-}"
  "${OPENCLAW_SESSION_MANAGER_PORT:-}"
  "${OPENCLAW_BROWSER_RUNTIME_PORT:-}"
  "${OPENCLAW_SCREEN_SENSE_PORT:-}"
  "${OPENCLAW_SCREEN_ACT_PORT:-}"
  "${OPENCLAW_SYSTEM_SENSE_PORT:-}"
  "${OPENCLAW_SYSTEM_HEAL_PORT:-}"
  "${OBSERVER_UI_PORT:-}"
)
if [[ "${OPENCLAW_DEV_INCLUDE_HIGH_PORT_PHASES:-true}" == "true" ]]; then
  for port in $(seq 19160 19238); do
    ports+=("$port")
  done
fi

find_listener_pid() {
  local port="$1"
  local pid=""
  if command -v ss >/dev/null 2>&1; then
    pid="$(
      {
        ss -ltnpH "( sport = :$port )" 2>/dev/null
        if command -v sudo >/dev/null 2>&1; then
          sudo -n ss -ltnpH "( sport = :$port )" 2>/dev/null || true
        fi
      } \
        | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' \
        | head -n 1
    )"
  fi
  if [[ -z "$pid" ]] && command -v netstat >/dev/null 2>&1; then
    pid="$(netstat -ltnp 2>/dev/null | awk -v port=":$port" '$4 ~ port { split($7, parts, "/"); if (parts[1] ~ /^[0-9]+$/) { print parts[1]; exit } }' || true)"
  fi
  if [[ -z "$pid" ]] && command -v netstat >/dev/null 2>&1; then
    pid="$(netstat -ano 2>/dev/null | awk -v port=":$port" '$0 ~ port && ($0 ~ /LISTEN/ || $0 ~ /BOUND/) { print $NF; exit }' || true)"
  fi
  echo "$pid"
}

wait_port_released() {
  local port="$1"
  local deadline=$((SECONDS + 5))
  while (( SECONDS < deadline )); do
    if [[ -z "$(find_listener_pid "$port")" ]]; then
      return 0
    fi
    sleep 0.2
  done
  return 1
}

is_managed_service_pid() {
  local pid="$1"
  local cmdline=""
  local cwd=""

  if [[ -z "$pid" ]] || { ! kill -0 "$pid" >/dev/null 2>&1 && ! { command -v sudo >/dev/null 2>&1 && sudo -n kill -0 "$pid" >/dev/null 2>&1; }; }; then
    return 1
  fi

  cmdline="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  if [[ -z "$cmdline" ]] && ps -W -f >/dev/null 2>&1; then
    cmdline="$(ps -W -f 2>/dev/null | awk -v pid="$pid" '$2 == pid { $1=$2=$3=$4=$5=""; sub(/^[[:space:]]+/, ""); print; exit }' || true)"
  fi
  cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  if [[ -z "$cwd" ]] && command -v sudo >/dev/null 2>&1; then
    cwd="$(sudo -n readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  fi

  if [[ "$cwd" == "$REPO_ROOT"/services/* ]] || [[ "$cwd" == "$REPO_ROOT"/apps/* ]]; then
    [[ "$cmdline" == *"src/server.mjs"* ]]
    return $?
  fi

  # Git Bash on Windows may not expose /proc/$pid/cwd, and node is started
  # from each service directory as `node src/server.mjs`.
  if [[ -z "$cwd" ]] && [[ "$cmdline" == *"src/server.mjs"* ]] && { [[ "$cmdline" == *"node"* ]] || [[ "$cmdline" == *"nohup"* ]]; }; then
    return 0
  fi

  [[ "$cmdline" == *"$REPO_ROOT"* ]] && [[ "$cmdline" == *"src/server.mjs"* ]]
}

terminate_pid() {
  local pid="$1"
  kill "$pid" >/dev/null 2>&1 && return 0
  if command -v taskkill.exe >/dev/null 2>&1; then
    taskkill.exe //PID "$pid" //T //F >/dev/null 2>&1 && return 0
  fi
  if command -v sudo >/dev/null 2>&1; then
    sudo -n kill "$pid" >/dev/null 2>&1 && return 0
  fi
  return 1
}

if [[ ! -f "$STATE_FILE" ]]; then
  echo "No unix dev state file found at $STATE_FILE"
else
  while IFS=$'\t' read -r name pid _rest; do
    if is_managed_service_pid "${pid:-}"; then
      terminate_pid "$pid" || true
      echo "Stopped $name (PID $pid)"
    fi
  done <"$STATE_FILE"

  rm -f "$STATE_FILE"
fi

for port in "${ports[@]}"; do
  if [[ -z "$port" ]]; then
    continue
  fi
  pid="$(find_listener_pid "$port")"
  if is_managed_service_pid "$pid"; then
    terminate_pid "$pid" || true
    echo "Stopped listener on port $port (PID $pid)"
    wait_port_released "$port" >/dev/null 2>&1 || true
  fi
done

while read -r pid; do
  if is_managed_service_pid "$pid"; then
    terminate_pid "$pid" || true
    echo "Stopped stale managed service (PID $pid)"
  fi
done < <(
  if command -v pgrep >/dev/null 2>&1; then
    pgrep -f 'src/server\.mjs' 2>/dev/null || true
  elif ps -W -f >/dev/null 2>&1; then
    ps -W -f 2>/dev/null | awk '/src\/server\.mjs/ && !/awk/ { print $2 }' || true
  fi
)

for port in "${ports[@]}"; do
  if [[ -n "$port" ]]; then
    wait_port_released "$port" >/dev/null 2>&1 || true
  fi
done

echo "Unix dev services stopped."
