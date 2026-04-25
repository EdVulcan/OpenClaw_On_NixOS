#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ARTIFACT_DIR="$REPO_ROOT/.artifacts/command-capture"

mkdir -p "$ARTIFACT_DIR"

cat >"$ARTIFACT_DIR/snapshot.txt" <<'EOF'
OpenClaw command capture adapter
Title: Filesystem-backed Work View
URL: https://example.com/file-capture
State: external file capture is active
EOF

cat >"$ARTIFACT_DIR/ocr.txt" <<'EOF'
Filesystem-backed Work View
https://example.com/file-capture
external file capture is active
EOF

export OPENCLAW_SCREEN_CAPTURE_MODE="command"
unset OPENCLAW_SCREEN_CAPTURE_COMMAND
export OPENCLAW_SCREEN_CAPTURE_NODE_FILE="$REPO_ROOT/nix/scripts/file-screen-capture.mjs"
unset OPENCLAW_SCREEN_CAPTURE_POWERSHELL_FILE
export OPENCLAW_CAPTURE_WINDOW_TITLE="Filesystem-backed Work View"
export OPENCLAW_CAPTURE_WINDOW_PID="4343"
export OPENCLAW_CAPTURE_SNAPSHOT_TEXT_FILE="$ARTIFACT_DIR/snapshot.txt"
export OPENCLAW_CAPTURE_OCR_TEXT_FILE="$ARTIFACT_DIR/ocr.txt"
export OPENCLAW_CAPTURE_SNAPSHOT_PATH="D:/mock/captures/file-backed-frame.txt"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true

cleanup() {
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

provider="$(curl --silent http://127.0.0.1:4104/screen/provider)"
screen="$(curl --silent http://127.0.0.1:4104/screen/current)"

node - <<'EOF' "$provider" "$screen"
const provider = JSON.parse(process.argv[2]);
const screen = JSON.parse(process.argv[3]);
if (provider.provider.mode !== "command") {
  throw new Error(`Expected provider mode command, got ${provider.provider.mode}`);
}
if (!provider.provider.ready) {
  throw new Error("Expected command capture provider to be ready.");
}
if (screen.screen.captureSource !== "command-file") {
  throw new Error(`Expected captureSource command-file, got ${screen.screen.captureSource}`);
}
if (screen.screen.focusedWindow?.title !== "Filesystem-backed Work View") {
  throw new Error("Expected focused window title from file capture adapter.");
}
console.log(JSON.stringify({
  provider: provider.provider,
  screen: {
    captureSource: screen.screen.captureSource,
    focusedWindow: screen.screen.focusedWindow,
    snapshotText: screen.screen.snapshotText,
    ocrBlocks: screen.screen.ocrBlocks,
  },
}, null, 2));
EOF
