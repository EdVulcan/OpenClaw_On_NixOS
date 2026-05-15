#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-source-command-proposals-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
DOCS_TOOLS_DIR="$WORKSPACE_DIR/docs/tools"
PROMPT_SECRET="OBSERVER_SOURCE_COMMAND_PROMPT_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9720}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9721}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9722}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9723}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9724}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9725}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9726}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9727}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9790}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-source-command-proposals-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-openclaw-source-command-proposals-check-events.jsonl}"

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
    "build": "echo observer-source-command-secret-build",
    "dev": "echo observer-source-command-secret-dev",
    "test": "echo observer-source-command-secret-test",
    "typecheck": "echo observer-source-command-secret-typecheck"
  }
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "packages/*"
YAML
cat > "$WORKSPACE_DIR/TOOLS.md" <<EOF
# Tools
Observer command and shell proposal panels must show proposal-only process metadata and hide script bodies.
$PROMPT_SECRET
EOF
cat > "$DOCS_TOOLS_DIR/command-runner.md" <<'MD'
# Command Runner
Show source-derived command proposals without executing shell or process operations.
MD
cat > "$TOOLS_DIR/command-tool.ts" <<'TS'
export function observerCommandTool() {
  const secret = "OBSERVER_SOURCE_COMMAND_TOOL_SECRET_DO_NOT_LEAK";
  return { kind: "command", secret };
}
TS
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createObserverSourceCommandProposalContract() {
  return { capabilityId: "observer-source-command-proposals" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type ObserverSourceCommandProposalManifest = { pluginId: string };
TS

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${PROPOSALS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
PROPOSALS_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/source-command-proposals?query=command&limit=12" > "$PROPOSALS_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$PROPOSALS_FILE" "$PROMPT_SECRET"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const proposals = readJson(4);
const promptSecret = process.argv[5];
const raw = JSON.stringify({ html, client, proposals });

for (const token of [
  "OpenClaw Source Command Proposals",
  "source-command-registry",
  "source-command-json",
  "openclaw-source-command-proposals-v0",
  "/plugins/native-adapter/source-command-proposals",
  "Source-derived command proposals:",
]) {
  if (!raw.includes(token)) {
    throw new Error(`Observer source command proposals missing ${token}`);
  }
}
if (
  !proposals.ok
  || proposals.registry !== "openclaw-source-command-proposals-v0"
  || proposals.sourceCommandSignals?.toolSignals?.matchedTools < 1
  || proposals.sourceCommandSignals?.promptSignals?.commandVocabularyFiles < 1
  || proposals.governance?.canExecute !== false
  || proposals.governance?.createsTask !== false
  || proposals.governance?.exposesScriptBodies !== false
) {
  throw new Error(`Observer source command proposal mismatch: ${JSON.stringify(proposals)}`);
}
for (const secret of [
  promptSecret,
  "observer-source-command-secret-build",
  "observer-source-command-secret-dev",
  "observer-source-command-secret-test",
  "observer-source-command-secret-typecheck",
  "OBSERVER_SOURCE_COMMAND_TOOL_SECRET_DO_NOT_LEAK",
]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer source command proposals leaked body content: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawSourceCommandProposals: {
    panel: "visible",
    registry: proposals.registry,
    total: proposals.summary.total,
    matchedTools: proposals.sourceCommandSignals.toolSignals.matchedTools,
  },
}, null, 2));
EOF
