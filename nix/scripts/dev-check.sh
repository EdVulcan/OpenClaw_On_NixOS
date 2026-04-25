#!/usr/bin/env bash
set -euo pipefail

services=(
  "openclaw-event-hub|http://127.0.0.1:4101/health"
  "openclaw-core|http://127.0.0.1:4100/health"
  "openclaw-session-manager|http://127.0.0.1:4102/health"
  "openclaw-browser-runtime|http://127.0.0.1:4103/health"
  "openclaw-screen-sense|http://127.0.0.1:4104/health"
  "openclaw-screen-act|http://127.0.0.1:4105/health"
  "openclaw-system-sense|http://127.0.0.1:4106/health"
  "openclaw-system-heal|http://127.0.0.1:4107/health"
  "observer-ui|http://127.0.0.1:4170/health"
)

printf '%-26s %-8s %s\n' "name" "status" "url"
printf '%-26s %-8s %s\n' "--------------------------" "--------" "---"

failed=0
for entry in "${services[@]}"; do
  IFS="|" read -r name health_url <<<"$entry"
  if curl --silent --fail "$health_url" >/dev/null 2>&1; then
    printf '%-26s %-8s %s\n' "$name" "200" "$health_url"
  else
    printf '%-26s %-8s %s\n' "$name" "offline" "$health_url"
    failed=1
  fi
done

echo
echo "Optional business flow check:"
echo "  1. POST http://127.0.0.1:4103/browser/open"
echo "  2. GET  http://127.0.0.1:4104/screen/current"
echo "  3. POST http://127.0.0.1:4105/act/mouse/click"
echo "Expected: screen.readiness=ready and action.degraded=false once session/browser state settles."

exit "$failed"
