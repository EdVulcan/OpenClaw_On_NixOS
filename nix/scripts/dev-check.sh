#!/usr/bin/env bash
set -euo pipefail

CHECK_HOST="${OPENCLAW_DEV_CHECK_HOST:-127.0.0.1}"
CORE_PORT="${OPENCLAW_CORE_PORT:-4100}"
EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-4101}"
SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-4102}"
BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-4103}"
SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-4104}"
SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-4105}"
SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-4106}"
SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-4107}"
OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-4170}"

services=(
  "openclaw-event-hub|http://$CHECK_HOST:$EVENT_HUB_PORT/health"
  "openclaw-core|http://$CHECK_HOST:$CORE_PORT/health"
  "openclaw-session-manager|http://$CHECK_HOST:$SESSION_MANAGER_PORT/health"
  "openclaw-browser-runtime|http://$CHECK_HOST:$BROWSER_RUNTIME_PORT/health"
  "openclaw-screen-sense|http://$CHECK_HOST:$SCREEN_SENSE_PORT/health"
  "openclaw-screen-act|http://$CHECK_HOST:$SCREEN_ACT_PORT/health"
  "openclaw-system-sense|http://$CHECK_HOST:$SYSTEM_SENSE_PORT/health"
  "openclaw-system-heal|http://$CHECK_HOST:$SYSTEM_HEAL_PORT/health"
  "observer-ui|http://$CHECK_HOST:$OBSERVER_UI_PORT/health"
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
echo "  1. POST http://$CHECK_HOST:$BROWSER_RUNTIME_PORT/browser/open"
echo "  2. GET  http://$CHECK_HOST:$SCREEN_SENSE_PORT/screen/current"
echo "  3. POST http://$CHECK_HOST:$SCREEN_ACT_PORT/act/mouse/click"
echo "Expected: screen.readiness=ready and action.degraded=false once session/browser state settles."

exit "$failed"
