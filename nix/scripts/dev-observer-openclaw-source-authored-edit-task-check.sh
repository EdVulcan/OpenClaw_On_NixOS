#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-source-authored-edit-task-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
TARGET_FILE="$WORKSPACE_DIR/src/agents/tools/edit-plan-tool.ts"
PROMPT_SECRET="OBSERVER_SOURCE_AUTHORED_EDIT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9700}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9701}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9702}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9703}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9704}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9705}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9706}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9707}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9770}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-source-authored-edit-task-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-source-authored-edit-task-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$TOOLS_DIR" "$DOCS_TOOLS_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{"name":"openclaw","private":true,"scripts":{"typecheck":"tsc --noEmit","test":"vitest run","lint":"eslint ."}}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "packages/*"
YAML
cat > "$WORKSPACE_DIR/TOOLS.md" <<EOF
# Tools
Observer-visible source-authored edits use target selection, rationale bundle, check bundle, risk notes, approval, and diff preview.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/apply-patch.md" <<'MD'
# Apply Patch
Expose source-authored edit task controls without exposing prompt or source bodies.
MD
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createObserverSourceAuthoredEditContract() {
  return { capabilityId: "observer-source-authored-edit" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type ObserverSourceAuthoredEditManifest = { pluginId: string };
TS
cat > "$TARGET_FILE" <<'TS'
export function editPlanTool() {
  const before = "before";
  const omega = "omega";
  return { before, omega };
}
TS

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
EDITS_JSON='[{"search":"before","replacement":"after","occurrence":1},{"search":"omega","replacement":"zeta","occurrence":1}]'
EDITS_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$EDITS_JSON")"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/source-authored-edit/draft?edits=$EDITS_ENCODED&proposalQuery=edit&targetSelectionQuery=edit&contextLines=0" > "$DRAFT_FILE"
curl --silent --fail \
  -H "content-type: application/json" \
  -d "{\"edits\":$EDITS_JSON,\"proposalQuery\":\"edit\",\"targetSelectionQuery\":\"edit\",\"contextLines\":0,\"confirm\":true}" \
  "$CORE_URL/plugins/native-adapter/source-authored-edit-tasks" > "$TASK_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$DRAFT_FILE" "$TASK_FILE" "$PROMPT_SECRET"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const draft = readJson(4);
const task = readJson(5);
const promptSecret = process.argv[6];
const raw = JSON.stringify({ html, client, draft, task });

for (const token of [
  "Create Source-Authored Task",
  "Source-Authored Edit:",
  "openclaw-source-authored-edit-v0",
  "/plugins/native-adapter/source-authored-edit/draft",
  "/plugins/native-adapter/source-authored-edit-tasks",
]) {
  if (!raw.includes(token)) {
    throw new Error(`Observer source-authored edit client missing ${token}`);
  }
}
if (
  !draft.ok
  || draft.registry !== "openclaw-source-authored-edit-v0"
  || draft.sourceAuthoredEdit?.contentExposed !== false
  || draft.governance?.canExecuteLegacyOpenClawCode !== false
  || draft.governance?.canImportLegacyOpenClawModules !== false
  || draft.governance?.canMutateWithoutApproval !== false
  || draft.proposal?.rationaleBundle?.registry !== "openclaw-rationale-check-bundle-v0"
  || draft.proposal?.checkBundle?.registry !== "openclaw-rationale-check-bundle-v0"
) {
  throw new Error(`Observer source-authored draft mismatch: ${JSON.stringify(draft)}`);
}
if (
  !task.ok
  || task.registry !== "openclaw-source-authored-edit-task-v0"
  || task.approval?.status !== "pending"
  || task.task?.approval?.required !== true
  || task.governance?.usesWorkspacePatchApplyAdapter !== true
) {
  throw new Error(`Observer source-authored task mismatch: ${JSON.stringify(task)}`);
}
if (raw.includes(promptSecret)) {
  throw new Error("Observer source-authored edit leaked prompt body content");
}

console.log(JSON.stringify({
  observerOpenClawSourceAuthoredEditTask: {
    panel: "workspace patch apply",
    draftRegistry: draft.registry,
    taskRegistry: task.registry,
    approval: task.approval.status,
  },
}, null, 2));
EOF
