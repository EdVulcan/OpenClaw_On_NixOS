#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-source-authored-edit-task-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
TARGET_FILE="$WORKSPACE_DIR/src/agents/tools/edit-plan-tool.ts"
PROMPT_SECRET="SOURCE_AUTHORED_EDIT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9690}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9691}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9692}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9693}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9694}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9695}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9696}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9697}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9760}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-source-authored-edit-task-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-source-authored-edit-task-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

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
Source-authored edits must select a target, produce rationale/check/risk bundles, request approval, show diff preview, then verify with typecheck, test, and lint.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/apply-patch.md" <<'MD'
# Apply Patch
OpenClaw-authored patch tasks use source-derived proposal bundles and the existing approval-gated filesystem write path.
MD
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createSourceAuthoredEditContract() {
  return { capabilityId: "source-authored-edit" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type SourceAuthoredEditManifest = { pluginId: string };
TS
cat > "$TARGET_FILE" <<'TS'
export function editPlanTool() {
  const before = "before";
  const omega = "omega";
  return { before, omega };
}
TS

cleanup() {
  rm -f "${DRAFT_FILE:-}" "${TASK_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

DRAFT_FILE="$(mktemp)"
TASK_FILE="$(mktemp)"
EDITS_JSON='[{"search":"before","replacement":"after","occurrence":1},{"search":"omega","replacement":"zeta","occurrence":1}]'
EDITS_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$EDITS_JSON")"

curl --silent --fail "$CORE_URL/plugins/native-adapter/source-authored-edit/draft?edits=$EDITS_ENCODED&proposalQuery=edit&targetSelectionQuery=edit&contextLines=0" > "$DRAFT_FILE"
curl --silent --fail \
  -H "content-type: application/json" \
  -d "{\"edits\":$EDITS_JSON,\"proposalQuery\":\"edit\",\"targetSelectionQuery\":\"edit\",\"contextLines\":0,\"confirm\":true}" \
  "$CORE_URL/plugins/native-adapter/source-authored-edit-tasks" > "$TASK_FILE"

node - <<'EOF' "$DRAFT_FILE" "$TASK_FILE" "$PROMPT_SECRET"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const draft = readJson(2);
const task = readJson(3);
const promptSecret = process.argv[4];
const raw = JSON.stringify({ draft, task });

if (
  !draft.ok
  || draft.registry !== "openclaw-source-authored-edit-v0"
  || draft.sourceRegistry !== "openclaw-native-workspace-patch-apply-draft-v0"
  || draft.sourceAuthoredEdit?.registry !== "openclaw-source-authored-edit-v0"
  || draft.sourceAuthoredEdit?.entrypoint !== "/plugins/native-adapter/source-authored-edit-tasks"
  || draft.proposal?.source !== "openclaw-source-derived-edit-proposal-v0"
  || draft.proposal?.rationaleBundle?.registry !== "openclaw-rationale-check-bundle-v0"
  || draft.proposal?.checkBundle?.registry !== "openclaw-rationale-check-bundle-v0"
  || draft.proposal?.riskNotes?.registry !== "openclaw-rationale-check-bundle-v0"
  || draft.targetSelection?.registry !== "openclaw-native-workspace-edit-target-selection-v0"
  || draft.governance?.usesWorkspacePatchApplyAdapter !== true
  || draft.governance?.canMutateWithoutApproval !== false
  || draft.governance?.canExecuteLegacyOpenClawCode !== false
) {
  throw new Error(`source-authored draft mismatch: ${JSON.stringify(draft)}`);
}
if (
  !task.ok
  || task.registry !== "openclaw-source-authored-edit-task-v0"
  || task.sourceRegistry !== "openclaw-native-workspace-patch-apply-task-v0"
  || task.sourceAuthoredEdit?.mode !== "approval-gated-source-authored-edit-task"
  || task.approval?.status !== "pending"
  || task.task?.approval?.required !== true
  || task.governance?.createsTask !== true
  || task.governance?.createsApproval !== true
  || task.governance?.usesFilesystemWriteCapability !== true
  || task.governance?.canMutateWithoutApproval !== false
) {
  throw new Error(`source-authored task mismatch: ${JSON.stringify(task)}`);
}
for (const check of ["patch-validation", "diff-preview", "approval-required", "filesystem-ledger", "typecheck", "test", "lint"]) {
  if (!task.proposal?.checkBundle?.required?.includes(check)) {
    throw new Error(`source-authored task missing check ${check}: ${JSON.stringify(task.proposal?.checkBundle)}`);
  }
}
if (raw.includes(promptSecret)) {
  throw new Error("source-authored edit leaked prompt body content");
}

console.log(JSON.stringify({
  openclawSourceAuthoredEditTask: {
    draftRegistry: draft.registry,
    taskRegistry: task.registry,
    approval: task.approval.status,
    target: task.target.relativePath,
  },
}, null, 2));
EOF
