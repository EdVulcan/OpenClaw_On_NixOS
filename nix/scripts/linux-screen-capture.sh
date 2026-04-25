#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="${OPENCLAW_CAPTURE_TMP_DIR:-/tmp/openclaw-capture}"
SCREENSHOT_PATH="${OPENCLAW_CAPTURE_SCREENSHOT_PATH:-$TMP_DIR/frame.png}"
OCR_TEXT_PATH="${OPENCLAW_CAPTURE_OCR_TEXT_PATH:-$TMP_DIR/ocr.txt}"
WINDOW_TITLE_OVERRIDE="${OPENCLAW_CAPTURE_WINDOW_TITLE:-}"
WINDOW_PID_OVERRIDE="${OPENCLAW_CAPTURE_WINDOW_PID:-0}"
SOURCE_NAME="${OPENCLAW_CAPTURE_SOURCE_NAME:-linux-desktop}"
SESSION_TYPE="${XDG_SESSION_TYPE:-unknown}"
DESKTOP_ENV="${XDG_CURRENT_DESKTOP:-unknown}"

mkdir -p "$TMP_DIR"

trim() {
  sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

capture_source="$SOURCE_NAME"
focused_window_title=""
focused_window_pid="$WINDOW_PID_OVERRIDE"
window_list_json="[]"
screenshot_status="not_attempted"
gnome_eval_status="not_attempted"

has_file_payload() {
  local path="$1"
  [[ -f "$path" && -s "$path" ]]
}

capture_with_gnome_shell_dbus() {
  if ! command -v gdbus >/dev/null 2>&1; then
    return 1
  fi

  rm -f "$SCREENSHOT_PATH"

  local reply
  reply="$(
    gdbus call --session \
      --dest org.gnome.Shell.Screenshot \
      --object-path /org/gnome/Shell/Screenshot \
      --method org.gnome.Shell.Screenshot.Screenshot \
      false false "$SCREENSHOT_PATH" 2>/dev/null || true
  )"

  if has_file_payload "$SCREENSHOT_PATH"; then
    capture_source="linux-gnome-shell-dbus"
    screenshot_status="captured"
    return 0
  fi

  if [[ -n "$reply" ]]; then
    screenshot_status="dbus_no_file"
  else
    screenshot_status="dbus_unavailable"
  fi

  return 1
}

capture_with_tool() {
  if [[ "$DESKTOP_ENV" == *GNOME* ]] && capture_with_gnome_shell_dbus; then
    return
  fi

  if command -v grim >/dev/null 2>&1; then
    rm -f "$SCREENSHOT_PATH"
    grim "$SCREENSHOT_PATH" >/dev/null 2>&1 || true
    if has_file_payload "$SCREENSHOT_PATH"; then
      capture_source="linux-grim"
      screenshot_status="captured"
      return
    fi
    screenshot_status="grim_failed"
  fi

  if command -v gnome-screenshot >/dev/null 2>&1; then
    rm -f "$SCREENSHOT_PATH"
    gnome-screenshot -f "$SCREENSHOT_PATH" >/dev/null 2>&1 || true
    if has_file_payload "$SCREENSHOT_PATH"; then
      capture_source="linux-gnome-screenshot"
      screenshot_status="captured"
      return
    fi
    screenshot_status="gnome_screenshot_failed"
  fi

  if command -v import >/dev/null 2>&1; then
    rm -f "$SCREENSHOT_PATH"
    import -window root "$SCREENSHOT_PATH" >/dev/null 2>&1 || true
    if has_file_payload "$SCREENSHOT_PATH"; then
      capture_source="linux-imagemagick"
      screenshot_status="captured"
      return
    fi
    screenshot_status="imagemagick_failed"
  fi

  screenshot_status="no_capture_tool_succeeded"
}

read_gnome_focused_title() {
  if ! command -v gdbus >/dev/null 2>&1; then
    return 1
  fi

  local reply
  reply="$(
    gdbus call --session \
    --dest org.gnome.Shell \
    --object-path /org/gnome/Shell \
    --method org.gnome.Shell.Eval \
    "global.display.focus_window ? global.display.focus_window.get_title() : ''" 2>/dev/null || true
  )"

  if [[ "$reply" == "(true,"* ]]; then
    gnome_eval_status="ok"
  else
    gnome_eval_status="eval_disabled_or_unavailable"
  fi

  printf '%s\n' "$reply" \
    | sed -n "s/^(true, '\(.*\)')$/\1/p" \
    | head -n 1
}

read_gnome_window_list() {
  if ! command -v gdbus >/dev/null 2>&1; then
    return 1
  fi

  gdbus call --session \
    --dest org.gnome.Shell \
    --object-path /org/gnome/Shell \
    --method org.gnome.Shell.Eval \
    "JSON.stringify(global.get_window_actors().map(a => ({ title: a.meta_window ? a.meta_window.get_title() : '' })).filter(w => w.title))" 2>/dev/null \
    | sed -n "s/^(true, '\(.*\)')$/\1/p" \
    | sed "s/\\\\'/'/g" \
    | head -n 1
}

read_x11_focused_title() {
  if command -v xdotool >/dev/null 2>&1; then
    xdotool getwindowfocus getwindowname 2>/dev/null | head -n 1
    return 0
  fi

  if command -v wmctrl >/dev/null 2>&1; then
    wmctrl -lp 2>/dev/null | head -n 1 | cut -d' ' -f5-
    return 0
  fi

  return 1
}

read_x11_window_list() {
  if command -v wmctrl >/dev/null 2>&1; then
    wmctrl -lp 2>/dev/null | python3 - <<'PY'
import json
import sys

items = []
for line in sys.stdin:
    parts = line.strip().split(None, 4)
    if len(parts) < 5:
        continue
    pid = None
    try:
        pid = int(parts[2])
    except ValueError:
        pid = None
    items.append({"title": parts[4], "pid": pid})

print(json.dumps(items, ensure_ascii=False))
PY
    return 0
  fi

  return 1
}

capture_with_tool

if [[ -n "$WINDOW_TITLE_OVERRIDE" ]]; then
  focused_window_title="$WINDOW_TITLE_OVERRIDE"
elif [[ "$DESKTOP_ENV" == *GNOME* ]]; then
  focused_window_title="$(read_gnome_focused_title | trim || true)"
else
  focused_window_title="$(read_x11_focused_title | trim || true)"
fi

if [[ -z "$focused_window_title" ]]; then
  focused_window_title="Linux Work View"
fi

if [[ "$DESKTOP_ENV" == *GNOME* ]]; then
  window_list_json="$(read_gnome_window_list || true)"
fi

if [[ -z "$window_list_json" || "$window_list_json" == "[]" ]]; then
  window_list_json="$(read_x11_window_list || true)"
fi

if [[ -z "$window_list_json" ]]; then
  window_list_json="[]"
fi

if command -v tesseract >/dev/null 2>&1 && [[ -f "$SCREENSHOT_PATH" ]]; then
  tesseract "$SCREENSHOT_PATH" stdout >"$OCR_TEXT_PATH" 2>/dev/null || true
fi

export OPENCLAW_CAPTURE_SOURCE_NAME="$capture_source"
export OPENCLAW_CAPTURE_WINDOW_TITLE="$focused_window_title"
export OPENCLAW_CAPTURE_WINDOW_PID="$focused_window_pid"
export OPENCLAW_CAPTURE_SCREENSHOT_PATH="$SCREENSHOT_PATH"
export OPENCLAW_CAPTURE_OCR_TEXT_PATH="$OCR_TEXT_PATH"
export OPENCLAW_CAPTURE_WINDOW_LIST_JSON="$window_list_json"
export OPENCLAW_CAPTURE_SCREENSHOT_STATUS="$screenshot_status"
export OPENCLAW_CAPTURE_GNOME_EVAL_STATUS="$gnome_eval_status"

python3 - <<'PY'
import json
import os
from pathlib import Path

source = os.environ.get("OPENCLAW_CAPTURE_SOURCE_NAME", "linux-desktop")
title = os.environ.get("OPENCLAW_CAPTURE_WINDOW_TITLE", "Linux Work View")
pid_raw = os.environ.get("OPENCLAW_CAPTURE_WINDOW_PID", "0")
snapshot_path = os.environ.get("OPENCLAW_CAPTURE_SCREENSHOT_PATH", "")
ocr_path = os.environ.get("OPENCLAW_CAPTURE_OCR_TEXT_PATH", "")
window_list_raw = os.environ.get("OPENCLAW_CAPTURE_WINDOW_LIST_JSON", "[]")
session_type = os.environ.get("XDG_SESSION_TYPE", "unknown")
desktop_env = os.environ.get("XDG_CURRENT_DESKTOP", "unknown")
screenshot_status = os.environ.get("OPENCLAW_CAPTURE_SCREENSHOT_STATUS", "unknown")
gnome_eval_status = os.environ.get("OPENCLAW_CAPTURE_GNOME_EVAL_STATUS", "unknown")

try:
    pid = int(pid_raw)
except ValueError:
    pid = 0

try:
    window_list = json.loads(window_list_raw)
    if not isinstance(window_list, list):
        window_list = []
except json.JSONDecodeError:
    window_list = []

snapshot_text = (
    f"OpenClaw Linux capture adapter\n"
    f"Desktop: {desktop_env}\n"
    f"Session: {session_type}\n"
    f"Screenshot: {screenshot_status}\n"
    f"GNOME Eval: {gnome_eval_status}"
)
ocr_blocks = []

if ocr_path and Path(ocr_path).exists():
    snapshot_text = Path(ocr_path).read_text(encoding="utf-8", errors="ignore")
    for line in snapshot_text.splitlines():
        line = line.strip()
        if line:
            ocr_blocks.append({"text": line, "confidence": 0.9})
elif snapshot_path and Path(snapshot_path).exists():
    snapshot_text = f"Screenshot captured at {snapshot_path}\nDesktop: {desktop_env}\nSession: {session_type}"
else:
    snapshot_path = None

focused_window = {
    "title": title,
    "pid": pid if pid > 0 else None,
}

if not window_list:
    window_list = [focused_window]

payload = {
    "source": source,
    "snapshotPath": snapshot_path or None,
    "snapshotText": snapshot_text,
    "focusedWindow": focused_window,
    "windowList": window_list,
    "ocrBlocks": ocr_blocks,
}

print(json.dumps(payload, ensure_ascii=False, indent=2))
PY
