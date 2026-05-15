#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-rationale-check-bundle-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
TARGET_FILE="$WORKSPACE_DIR/src/agents/tools/edit-plan-tool.ts"
PROMPT_SECRET="RATIONALE_BUNDLE_PROMPT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9670}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9671}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9672}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9673}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9674}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9675}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9676}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9677}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9740}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-rationale-check-bundle-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-rationale-check-bundle-check-events.jsonl}"

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
Plan each edit with rationale, target context, approval, patch validation, diff preview, typecheck, test, and lint.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/apply-patch.md" <<'MD'
# Apply Patch
Generate a rationale bundle, expected check bundle, risk notes, diff preview, and approval gate before writing.
MD
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createRationaleBundleContract() {
  return { capabilityId: "rationale-check-bundle" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type RationaleBundleManifest = { pluginId: string };
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

curl --silent --fail "$CORE_URL/plugins/native-adapter/workspace-patch-apply/draft?edits=$EDITS_ENCODED&deriveProposalFromSource=true&proposalQuery=edit&selectTargetFromSource=true&targetSelectionQuery=edit&contextLines=0" > "$DRAFT_FILE"
curl --silent --fail \
  -H "content-type: application/json" \
  -d "{\"edits\":$EDITS_JSON,\"deriveProposalFromSource\":true,\"proposalQuery\":\"edit\",\"selectTargetFromSource\":true,\"targetSelectionQuery\":\"edit\",\"contextLines\":0,\"confirm\":true}" \
  "$CORE_URL/plugins/native-adapter/workspace-patch-apply-tasks" > "$TASK_FILE"

node - <<'EOF' "$DRAFT_FILE" "$TASK_FILE" "$PROMPT_SECRET"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const draft = readJson(2);
const task = readJson(3);
const promptSecret = process.argv[4];
const raw = JSON.stringify({ draft, task });
const assertBundle = (proposal, label) => {
  if (
    proposal?.rationaleBundle?.registry !== "openclaw-rationale-check-bundle-v0"
    || proposal.rationaleBundle.contentExposed !== false
    || proposal.rationaleBundle.reasons?.length < 3
    || proposal.rationaleBundle.sourceSignals?.contentExposed !== false
    || proposal.rationaleBundle.sourceSignals?.matchedTools < 1
    || proposal.rationaleBundle.sourceSignals?.matchedSemanticFiles < 1
    || proposal.rationaleBundle.sourceSignals?.promptSemanticFiles < 1
  ) {
    throw new Error(`${label} rationale bundle mismatch: ${JSON.stringify(proposal?.rationaleBundle)}`);
  }
  for (const check of ["patch-validation", "diff-preview", "approval-required", "filesystem-ledger", "typecheck", "test", "lint"]) {
    if (!proposal.checkBundle?.required?.includes(check)) {
      throw new Error(`${label} check bundle missing ${check}: ${JSON.stringify(proposal?.checkBundle)}`);
    }
  }
  if (
    proposal.checkBundle.registry !== "openclaw-rationale-check-bundle-v0"
    || proposal.checkBundle.contentExposed !== false
    || !proposal.checkBundle.blockedUntilApproval?.includes("filesystem mutation")
    || proposal.riskNotes?.registry !== "openclaw-rationale-check-bundle-v0"
    || proposal.riskNotes?.risk !== "high"
    || proposal.riskNotes?.approvalRequired !== true
    || proposal.riskNotes?.contentExposed !== false
  ) {
    throw new Error(`${label} check/risk bundle mismatch: ${JSON.stringify({ checkBundle: proposal?.checkBundle, riskNotes: proposal?.riskNotes })}`);
  }
};

if (!draft.ok || draft.proposal?.source !== "openclaw-source-derived-edit-proposal-v0") {
  throw new Error(`draft source-derived proposal mismatch: ${JSON.stringify(draft.proposal)}`);
}
if (!task.ok || task.approval?.status !== "pending" || task.task?.approval?.required !== true) {
  throw new Error(`task approval mismatch: ${JSON.stringify(task)}`);
}
assertBundle(draft.proposal, "draft");
assertBundle(task.proposal, "task");
if (raw.includes(promptSecret)) {
  throw new Error("rationale/check bundle leaked prompt body content");
}

console.log(JSON.stringify({
  openclawRationaleCheckBundle: {
    reasons: draft.proposal.rationaleBundle.reasons.length,
    requiredChecks: draft.proposal.checkBundle.required,
    risk: draft.proposal.riskNotes.risk,
  },
}, null, 2));
EOF
