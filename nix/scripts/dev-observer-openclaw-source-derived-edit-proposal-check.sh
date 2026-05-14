#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-source-derived-edit-proposal-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"
TOOLS_DIR="$WORKSPACE_DIR/src/agents/tools"
TARGET_FILE="$WORKSPACE_DIR/scratch/observer-native-edit.txt"
UNRELATED_SECRET="OBSERVER_SOURCE_DERIVED_EDIT_PROPOSAL_SECRET_DO_NOT_LEAK"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9620}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9621}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9622}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9623}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9624}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9625}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9626}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9627}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9690}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_SYSTEM_ALLOWED_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-source-derived-edit-proposal-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-source-derived-edit-proposal-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$TOOLS_DIR" "$(dirname "$TARGET_FILE")"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{"name":"openclaw","private":true}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "packages/*"
YAML
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export function createObserverSourceDerivedProposalContract() {
  return { capabilityId: "observer-source-derived" };
}
TS
cat > "$PLUGIN_SDK_DIR/types/index.d.ts" <<'TS'
export type ObserverSourceDerivedProposalManifest = { pluginId: string };
TS
cat > "$TOOLS_DIR/edit-proposal-tool.ts" <<'TS'
export function editProposalTool() {
  const OBSERVER_SOURCE_DERIVED_TOOL_SECRET = "must-not-leak";
  return OBSERVER_SOURCE_DERIVED_TOOL_SECRET;
}
TS
cat > "$TARGET_FILE" <<EOF
alpha context
before
safe middle
$UNRELATED_SECRET
omega
tail context
EOF

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${DRAFT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
DRAFT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/workspace-patch-apply/draft?relativePath=scratch/observer-native-edit.txt&search=before&replacement=after&deriveProposalFromSource=true&proposalQuery=edit&contextLines=0" > "$DRAFT_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$DRAFT_FILE" "$UNRELATED_SECRET"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const draft = readJson(4);
const unrelatedSecret = process.argv[5];
const raw = JSON.stringify({ html, client, draft });

for (const token of [
  "Proposal Source Signals: registry=",
  "openclaw-source-derived-edit-proposal-v0",
  "deriveProposalFromSource=true",
  "matchedSemanticFiles=",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer source-derived proposal client missing ${token}`);
  }
}
if (!html.includes("OpenClaw Workspace Patch Apply")) {
  throw new Error("Observer source-derived proposal panel missing");
}
if (
  !draft.ok
  || draft.proposal?.source !== "openclaw-source-derived-edit-proposal-v0"
  || draft.proposalSourceSignals?.toolSignals?.matchedTools < 1
  || draft.proposalSourceSignals?.semanticSignals?.matchedFiles < 1
  || draft.proposalSourceSignals?.governance?.exposesSourceFileContent !== false
) {
  throw new Error(`Observer source-derived proposal draft mismatch: ${JSON.stringify(draft)}`);
}
for (const secret of [unrelatedSecret, "OBSERVER_SOURCE_DERIVED_TOOL_SECRET", "must-not-leak"]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer source-derived proposal leaked content: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawSourceDerivedEditProposal: {
    html: "visible",
    matchedTools: draft.proposalSourceSignals.toolSignals.matchedTools,
    matchedSemanticFiles: draft.proposalSourceSignals.semanticSignals.matchedFiles,
  },
}, null, 2));
EOF
