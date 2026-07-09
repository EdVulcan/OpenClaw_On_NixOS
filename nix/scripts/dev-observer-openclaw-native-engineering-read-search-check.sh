#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/observer-openclaw-native-engineering-read-search-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

source "$SCRIPT_DIR/openclaw-engineering-read-search-fixture.sh"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-10010}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-10011}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-10012}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-10013}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-10014}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-10015}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-10016}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-10017}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-10018}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-engineering-read-search-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/observer-engineering-read-search-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
prepare_engineering_read_search_fixture "$WORKSPACE_DIR" "OBSERVER_ENGINEERING_READ_SEARCH"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}" "${READ_FILE:-}" "${GLOB_FILE:-}" "${GREP_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
READ_FILE="$(mktemp)"
GLOB_FILE="$(mktemp)"
GREP_FILE="$(mktemp)"

curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/engineering-read-search/read?relativePath=src/app.ts&startLine=2&endLine=3&maxOutputChars=1000" > "$READ_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/engineering-read-search/glob?pattern=src/**/*.ts&limit=10" > "$GLOB_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/engineering-read-search/grep?query=OpenClawNeedle&literal=true&include=**/*.ts&limit=10&maxOutputChars=1200" > "$GREP_FILE"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$READ_FILE" "$GLOB_FILE" "$GREP_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const html = readText(2);
const client = readText(3);
const read = readJson(4);
const glob = readJson(5);
const grep = readJson(6);
const raw = JSON.stringify({ html, client, read, glob, grep });

for (const token of [
  "OpenClaw Engineering Read/Search",
  "engineering-read-search-registry",
  "engineering-read-search-read",
  "engineering-read-search-glob",
  "engineering-read-search-grep",
  "engineering-read-search-bounds",
  "engineering-read-search-json",
]) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing engineering read/search token: ${token}`);
  }
}
for (const token of [
  "/plugins/native-adapter/engineering-read-search/read",
  "/plugins/native-adapter/engineering-read-search/glob",
  "/plugins/native-adapter/engineering-read-search/grep",
  "refreshEngineeringReadSearch",
  "renderEngineeringReadSearch",
  "Native governed read/search surface",
]) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing engineering read/search token: ${token}`);
  }
}
if (
  !read.ok
  || read.summary?.lineCount !== 2
  || read.governance?.canMutate !== false
  || read.bounds?.workspaceRootConstrained !== true
  || read.auditEvidence?.operation !== "read"
) {
  throw new Error(`Observer read evidence mismatch: ${JSON.stringify(read)}`);
}
if (
  !glob.ok
  || glob.summary?.matchedResults !== 2
  || glob.governance?.canExecuteToolCode !== false
  || glob.auditEvidence?.operation !== "glob"
) {
  throw new Error(`Observer glob evidence mismatch: ${JSON.stringify(glob)}`);
}
if (
  !grep.ok
  || grep.summary?.matchedResults !== 3
  || grep.governance?.createsTask !== false
  || grep.auditEvidence?.operation !== "grep"
) {
  throw new Error(`Observer grep evidence mismatch: ${JSON.stringify(grep)}`);
}
for (const secret of [
  "OBSERVER_ENGINEERING_READ_SEARCH_NODE_MODULES_SECRET",
  "OBSERVER_ENGINEERING_READ_SEARCH_CACHE_SECRET",
  "OBSERVER_ENGINEERING_READ_SEARCH_GENERATED_SECRET",
  "0.0.0-OBSERVER_ENGINEERING_READ_SEARCH-secret-version",
]) {
  if (raw.includes(secret)) {
    throw new Error(`Observer read/search leaked skipped directory or package secret: ${secret}`);
  }
}

console.log(JSON.stringify({
  observerOpenClawNativeEngineeringReadSearch: {
    html: "visible",
    client: "visible",
    readLines: read.summary.lineCount,
    globMatches: glob.summary.matchedResults,
    grepMatches: grep.summary.matchedResults,
  },
}, null, 2));
EOF
