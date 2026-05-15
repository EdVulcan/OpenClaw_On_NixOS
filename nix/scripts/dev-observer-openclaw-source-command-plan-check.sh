#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-source-command-plan-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
PROMPT_SECRET="OBSERVER_SOURCE_COMMAND_PLAN_PROMPT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9740}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9741}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9742}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9743}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9744}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9745}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9746}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9747}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9810}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-source-command-plan-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-source-command-plan-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$TOOLS_DIR" "$DOCS_TOOLS_DIR"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "private": true,
  "scripts": {
    "dev": "echo observer-source-command-plan-secret-dev",
    "test": "echo observer-source-command-plan-secret-test",
    "typecheck": "echo observer-source-command-plan-secret-typecheck"
  }
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "packages/*"
YAML
cat > "$WORKSPACE_DIR/TOOLS.md" <<EOF
# Tools
Observer source command plans must stay plan-only and require approval before shell or process execution.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/command-runner.md" <<'MD'
# Command Runner
Render source command plans without creating tasks or approvals.
MD
cat > "$TOOLS_DIR/command-tool.ts" <<'TS'
export function observerCommandPlanTool() {
  const secret = "OBSERVER_SOURCE_COMMAND_PLAN_TOOL_SECRET_DO_NOT_LEAK";
  return { kind: "command-plan", secret };
}
TS
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createObserverSourceCommandPlanContract() {
  return { capabilityId: "observer-source-command-plan" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type ObserverSourceCommandPlanManifest = { pluginId: string };
TS

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${PLAN_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
PLAN_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/source-command-proposals/plan?proposalId=openclaw:typecheck&query=command" > "$PLAN_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$PLAN_FILE" "$PROMPT_SECRET"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const planDraft = readJson(4);
const promptSecret = process.argv[5];
const raw = JSON.stringify({ html, client, planDraft });

for (const token of [
  "OpenClaw Source Command Plan",
  "source-command-plan-registry",
  "openclaw-source-command-plan-draft-v0",
  "/plugins/native-adapter/source-command-proposals/plan?proposalId=openclaw:typecheck",
  "Source-derived command plan:",
]) {
  if (!raw.includes(token)) {
    throw new Error(`Observer source command plan missing ${token}`);
  }
}
if (
  !planDraft.ok
  || planDraft.registry !== "openclaw-source-command-plan-draft-v0"
  || planDraft.sourceCommandPlan?.registry !== "openclaw-source-command-plan-draft-v0"
  || planDraft.sourceCommandProposal?.sourceCommand?.registry !== "openclaw-source-command-proposals-v0"
  || planDraft.draft?.governance?.createsTask !== false
  || planDraft.draft?.governance?.createsApproval !== false
  || planDraft.draft?.governance?.canExecute !== false
  || planDraft.governance?.canExecute !== false
) {
  throw new Error(`Observer source command plan mismatch: ${JSON.stringify(planDraft)}`);
}
for (const secret of [
  promptSecret,
  "observer-source-command-plan-secret-dev",
  "observer-source-command-plan-secret-test",
  "observer-source-command-plan-secret-typecheck",
  "OBSERVER_SOURCE_COMMAND_PLAN_TOOL_SECRET_DO_NOT_LEAK",
]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer source command plan leaked body content: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawSourceCommandPlan: {
    panel: "visible",
    registry: planDraft.registry,
    proposal: planDraft.sourceCommandProposal.id,
    governance: planDraft.governance,
  },
}, null, 2));
EOF
