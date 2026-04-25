#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="${OPENCLAW_CAPTURE_TMP_DIR:-/tmp/openclaw-capture}"
SCREENSHOT_PATH="${OPENCLAW_CAPTURE_SCREENSHOT_PATH:-$TMP_DIR/frame.png}"
OCR_TEXT_PATH="${OPENCLAW_CAPTURE_OCR_TEXT_PATH:-$TMP_DIR/ocr.txt}"
WINDOW_TITLE="${OPENCLAW_CAPTURE_WINDOW_TITLE:-Linux Work View}"
WINDOW_PID="${OPENCLAW_CAPTURE_WINDOW_PID:-0}"
SOURCE_NAME="${OPENCLAW_CAPTURE_SOURCE_NAME:-linux-grim}"

mkdir -p "$TMP_DIR"

if command -v grim >/dev/null 2>&1; then
  grim "$SCREENSHOT_PATH" >/dev/null 2>&1 || true
fi

if command -v tesseract >/dev/null 2>&1 && [[ -f "$SCREENSHOT_PATH" ]]; then
  tesseract "$SCREENSHOT_PATH" stdout >"$OCR_TEXT_PATH" 2>/dev/null || true
fi

SNAPSHOT_TEXT="OpenClaw Linux capture adapter"
if [[ -f "$OCR_TEXT_PATH" ]]; then
  SNAPSHOT_TEXT="$(cat "$OCR_TEXT_PATH")"
elif [[ -f "$SCREENSHOT_PATH" ]]; then
  SNAPSHOT_TEXT="Screenshot captured at $SCREENSHOT_PATH"
fi

python3 - <<'PY'
import json
import os
from pathlib import Path

source = os.environ.get("OPENCLAW_CAPTURE_SOURCE_NAME", "linux-grim")
title = os.environ.get("OPENCLAW_CAPTURE_WINDOW_TITLE", "Linux Work View")
pid_raw = os.environ.get("OPENCLAW_CAPTURE_WINDOW_PID", "0")
snapshot_path = os.environ.get("OPENCLAW_CAPTURE_SCREENSHOT_PATH", "")
ocr_path = os.environ.get("OPENCLAW_CAPTURE_OCR_TEXT_PATH", "")

try:
    pid = int(pid_raw)
except ValueError:
    pid = 0

snapshot_text = "OpenClaw Linux capture adapter"
ocr_blocks = []

if ocr_path and Path(ocr_path).exists():
    snapshot_text = Path(ocr_path).read_text(encoding="utf-8", errors="ignore")
    for line in snapshot_text.splitlines():
        line = line.strip()
        if line:
            ocr_blocks.append({"text": line, "confidence": 0.9})
elif snapshot_path and Path(snapshot_path).exists():
    snapshot_text = f"Screenshot captured at {snapshot_path}"

payload = {
    "source": source,
    "snapshotPath": snapshot_path or None,
    "snapshotText": snapshot_text,
    "focusedWindow": {
        "title": title,
        "pid": pid if pid > 0 else None,
    },
    "windowList": [
        {
            "title": title,
            "pid": pid if pid > 0 else None,
        }
    ],
    "ocrBlocks": ocr_blocks,
}

print(json.dumps(payload, ensure_ascii=False, indent=2))
PY
