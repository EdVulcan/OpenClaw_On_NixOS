#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-workspace-patch-validation-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
TARGET_RELATIVE_PATH="scratch/observer-native-edit.txt"
TARGET_FILE="$WORKSPACE_DIR/$TARGET_RELATIVE_PATH"
UNRELATED_SECRET="OBSERVER_NATIVE_WORKSPACE_PATCH_VALIDATION_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9560}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9561}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9562}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9563}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9564}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9565}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9566}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9567}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9630}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-native-workspace-patch-validation-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-native-workspace-patch-validation-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$WORKSPACE_DIR/src/agents/tools" "$WORKSPACE_DIR/scratch"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "private": true
}
JSON
cat > "$TARGET_FILE" <<EOF
alpha context
before
safe middle
$UNRELATED_SECRET
omega
tail context
EOF

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${DRAFT_FILE:-}" "${OVERLAP_FILE:-}" "${PREVIEW_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
DRAFT_FILE="$(mktemp)"
OVERLAP_FILE="$(mktemp)"
PREVIEW_FILE="$(mktemp)"

VALID_EDITS='[{"search":"before","replacement":"after","occurrence":1},{"search":"omega","replacement":"zeta","occurrence":1}]'
OVERLAP_EDITS='[{"search":"before","replacement":"after","occurrence":1},{"search":"before","replacement":"again","occurrence":1}]'
LONG_REPLACEMENT="$(node -e 'process.stdout.write(Array.from({ length: 80 }, (_, index) => `line-${index}`).join("\n"))')"
PREVIEW_EDITS="$(node - "$LONG_REPLACEMENT" <<'NODE'
const replacement = process.argv[2];
process.stdout.write(JSON.stringify([{ search: "before", replacement, occurrence: 1 }]));
NODE
)"

encode_json() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"
}

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/workspace-patch-apply/draft?relativePath=$TARGET_RELATIVE_PATH&edits=$(encode_json "$VALID_EDITS")&contextLines=0" > "$DRAFT_FILE"
curl --silent --show-error --output "$OVERLAP_FILE" --write-out "%{http_code}" \
  "$CORE_URL/plugins/native-adapter/workspace-patch-apply/draft?relativePath=$TARGET_RELATIVE_PATH&edits=$(encode_json "$OVERLAP_EDITS")&contextLines=0" | grep -qx "400"
curl --silent --show-error --output "$PREVIEW_FILE" --write-out "%{http_code}" \
  "$CORE_URL/plugins/native-adapter/workspace-patch-apply/draft?relativePath=$TARGET_RELATIVE_PATH&edits=$(encode_json "$PREVIEW_EDITS")&contextLines=0" | grep -qx "400"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$DRAFT_FILE" "$OVERLAP_FILE" "$PREVIEW_FILE" "$UNRELATED_SECRET"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const draft = readJson(4);
const overlap = readJson(5);
const preview = readJson(6);
const unrelatedSecret = process.argv[7];
const raw = JSON.stringify({ html, client, draft, overlap, preview });

for (const token of [
  "OpenClaw Workspace Patch Apply",
  "workspace-patch-apply-preview",
  "workspace-patch-apply-task-button",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer validation HTML missing ${token}`);
  }
}
for (const token of [
  "Validation: ok=",
  "openclaw-native-workspace-patch-validation-v0",
  "openclaw-native-workspace-patch-preview-validation-v0",
  "appliesAgainstOriginal",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer validation client missing ${token}`);
  }
}
if (
  !draft.ok
  || draft.validation?.ok !== true
  || draft.validation?.structuredPatch?.engine !== "openclaw-native-workspace-patch-validation-v0"
  || draft.validation?.preview?.engine !== "openclaw-native-workspace-patch-preview-validation-v0"
  || draft.validation?.structuredPatch?.checks?.appliesAgainstOriginalContent !== true
  || draft.diffPreview?.format !== "bounded-multi-hunk-line-diff-v0"
) {
  throw new Error(`Observer validation draft mismatch: ${JSON.stringify(draft)}`);
}
if (overlap.ok !== false || !String(overlap.error).includes("overlaps")) {
  throw new Error(`Observer overlap validation did not fail safely: ${JSON.stringify(overlap)}`);
}
if (preview.ok !== false || !String(preview.error).includes("preview")) {
  throw new Error(`Observer preview validation did not fail safely: ${JSON.stringify(preview)}`);
}
if (raw.includes(unrelatedSecret)) {
  throw new Error("Observer patch validation leaked unrelated file content");
}

console.log(JSON.stringify({
  observerOpenClawNativeWorkspacePatchValidation: {
    html: "visible",
    structuredValidation: draft.validation.structuredPatch.engine,
    previewValidation: draft.validation.preview.engine,
    rejectedOverlap: overlap.error,
    rejectedPreview: preview.error,
  },
}, null, 2));
EOF
