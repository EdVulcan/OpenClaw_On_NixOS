#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-workspace-structured-edit-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
TARGET_RELATIVE_PATH="scratch/observer-native-structured-edit.txt"
TARGET_FILE="$WORKSPACE_DIR/$TARGET_RELATIVE_PATH"
UNRELATED_SECRET="OBSERVER_NATIVE_WORKSPACE_STRUCTURED_EDIT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9580}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9581}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9582}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9583}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9584}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9585}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9586}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9587}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9650}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-native-workspace-structured-edit-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-native-workspace-structured-edit-check-events.jsonl}"

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
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${DRAFT_FILE:-}" "${TASK_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
DRAFT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"

EDITS_JSON="$(node - <<'NODE'
process.stdout.write(JSON.stringify([
  { kind: "replace_text", search: "before", replacement: "after", occurrence: 1 },
  { kind: "replace_lines", startLine: 5, endLine: 5, replacement: "zeta\n" },
]));
NODE
)"
EDITS_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$EDITS_JSON")"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/workspace-patch-apply/draft?relativePath=$TARGET_RELATIVE_PATH&edits=$EDITS_ENCODED&contextLines=0" > "$DRAFT_FILE"
curl --silent --fail \
  -H "content-type: application/json" \
  -d "{\"relativePath\":\"$TARGET_RELATIVE_PATH\",\"edits\":$EDITS_JSON,\"contextLines\":0,\"confirm\":true}" \
  "$CORE_URL/plugins/native-adapter/workspace-patch-apply-tasks" > "$TASK_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$DRAFT_FILE" "$TASK_FILE" "$UNRELATED_SECRET"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const draft = readJson(4);
const task = readJson(5);
const unrelatedSecret = process.argv[6];
const raw = JSON.stringify({ html, client, draft, task });

for (const token of [
  "OpenClaw Workspace Patch Apply",
  "workspace-patch-apply-preview",
  "workspace-patch-apply-task-button",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer structured edit HTML missing ${token}`);
  }
}
for (const token of [
  "Structured Edits: supportedKinds=replace_text,replace_lines",
  "replace_lines",
  "observedKinds",
  "structuredLineRangesResolved",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer structured edit client missing ${token}`);
  }
}
if (
  !draft.ok
  || draft.validation?.structuredPatch?.checks?.structuredLineRangesResolved !== true
  || !draft.edits?.some((edit) => edit.kind === "replace_lines" && edit.startLine === 5 && edit.endLine === 5)
  || !draft.diffPreview?.lines?.some((line) => line.hunk === 2 && line.type === "add" && line.text === "zeta")
) {
  throw new Error(`Observer structured edit draft mismatch: ${JSON.stringify(draft)}`);
}
if (
  !task.ok
  || task.approval?.status !== "pending"
  || task.task?.approval?.required !== true
  || !task.edits?.some((edit) => edit.kind === "replace_lines" && edit.replacementExposed === false)
  || !task.task?.plan?.steps?.some((step) => step.capabilityId === "act.filesystem.write_text" && String(step.params?.content ?? "").startsWith("[redacted:"))
) {
  throw new Error(`Observer structured edit task mismatch: ${JSON.stringify(task)}`);
}
if (raw.includes(unrelatedSecret)) {
  throw new Error("Observer structured edit leaked unrelated file content");
}

console.log(JSON.stringify({
  observerOpenClawNativeWorkspaceStructuredEdit: {
    html: "visible",
    task: task.task.id,
    kinds: draft.edits.map((edit) => edit.kind),
  },
}, null, 2));
EOF
