#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-native-engineering-read-search-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"

source "$SCRIPT_DIR/openclaw-engineering-read-search-fixture.sh"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9990}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9991}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9992}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9993}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9994}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9995}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9996}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9997}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9998}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-engineering-read-search-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-engineering-read-search-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$FIXTURE_DIR"
prepare_engineering_read_search_fixture "$WORKSPACE_DIR" "ENGINEERING_READ_SEARCH"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"

cleanup() {
  rm -f "${READ_FILE:-}" "${GLOB_FILE:-}" "${GREP_FILE:-}" "${LARGE_FILE:-}" "${BINARY_FILE:-}" "${BAD_PATH_FILE:-}" "${ADAPTER_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

READ_FILE="$(mktemp)"
GLOB_FILE="$(mktemp)"
GREP_FILE="$(mktemp)"
LARGE_FILE="$(mktemp)"
BINARY_FILE="$(mktemp)"
BAD_PATH_FILE="$(mktemp)"
ADAPTER_FILE="$(mktemp)"

curl --silent --fail "$CORE_URL/plugins/native-adapter/engineering-read-search/read?relativePath=src/app.ts&startLine=2&endLine=3&maxOutputChars=1000" > "$READ_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/engineering-read-search/glob?pattern=src/**/*.ts&limit=10" > "$GLOB_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/engineering-read-search/grep?query=OpenClawNeedle&literal=true&include=**/*.ts&limit=10&maxOutputChars=1200" > "$GREP_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/engineering-read-search/read?relativePath=src/large.txt&maxFileSizeBytes=256" > "$LARGE_FILE"
curl --silent --fail "$CORE_URL/plugins/native-adapter/engineering-read-search/read?relativePath=assets/binary.bin" > "$BINARY_FILE"
BAD_STATUS="$(curl --silent --output "$BAD_PATH_FILE" --write-out "%{http_code}" "$CORE_URL/plugins/native-adapter/engineering-read-search/read?relativePath=../package.json")"
curl --silent --fail "$CORE_URL/plugins/openclaw-native-plugin-adapter" > "$ADAPTER_FILE"

node - <<'EOF' "$READ_FILE" "$GLOB_FILE" "$GREP_FILE" "$LARGE_FILE" "$BINARY_FILE" "$BAD_PATH_FILE" "$BAD_STATUS" "$ADAPTER_FILE"
const fs = require("node:fs");
const readJson = (index) => JSON.parse(fs.readFileSync(process.argv[index], "utf8"));

const read = readJson(2);
const glob = readJson(3);
const grep = readJson(4);
const large = readJson(5);
const binary = readJson(6);
const bad = readJson(7);
const badStatus = process.argv[8];
const adapter = readJson(9);
const raw = JSON.stringify({ read, glob, grep, large, binary, bad, adapter });

if (
  !read.ok
  || read.registry !== "openclaw-native-engineering-read-search-v0"
  || read.operation !== "read"
  || read.capability?.id !== "sense.openclaw.engineering_tool.read"
  || read.summary?.lineCount !== 2
  || !read.content.includes("OpenClawNeedle")
  || read.governance?.canReadArbitrarySystemPath !== false
  || read.governance?.canMutate !== false
  || read.governance?.canExecuteToolCode !== false
  || read.bounds?.workspaceRootConstrained !== true
  || read.bounds?.pathTraversalProtection !== true
  || read.auditEvidence?.operation !== "read"
) {
  throw new Error(`bounded read mismatch: ${JSON.stringify(read)}`);
}
if (
  !glob.ok
  || glob.operation !== "glob"
  || glob.capability?.id !== "sense.openclaw.engineering_tool.glob"
  || glob.summary?.matchedResults !== 2
  || glob.matches?.some((entry) => entry.relativePath.includes("node_modules") || entry.relativePath.includes(".cache") || entry.relativePath.includes("generated"))
  || glob.governance?.canMutate !== false
  || glob.auditEvidence?.operation !== "glob"
) {
  throw new Error(`bounded glob mismatch: ${JSON.stringify(glob)}`);
}
if (
  !grep.ok
  || grep.operation !== "grep"
  || grep.capability?.id !== "sense.openclaw.engineering_tool.grep"
  || grep.summary?.matchedResults !== 3
  || grep.summary?.filesRead < 2
  || grep.governance?.canExecuteToolCode !== false
  || grep.governance?.createsTask !== false
  || grep.auditEvidence?.operation !== "grep"
) {
  throw new Error(`bounded grep mismatch: ${JSON.stringify(grep)}`);
}
if (
  large.ok !== false
  || large.blocked !== true
  || large.target?.blockedReason !== "max_file_size_exceeded"
  || large.content !== ""
) {
  throw new Error(`large file boundary mismatch: ${JSON.stringify(large)}`);
}
if (
  binary.ok !== false
  || binary.blocked !== true
  || binary.target?.blockedReason !== "binary_file_skipped"
) {
  throw new Error(`binary boundary mismatch: ${JSON.stringify(binary)}`);
}
if (badStatus !== "400" || bad.ok !== false || !String(bad.error ?? "").includes("workspace")) {
  throw new Error(`path traversal should be rejected with 400: status=${badStatus} body=${JSON.stringify(bad)}`);
}
if (
  !adapter.implementedCapabilities?.includes("sense.openclaw.engineering_tool.read")
  || !adapter.implementedCapabilities?.includes("sense.openclaw.engineering_tool.glob")
  || !adapter.implementedCapabilities?.includes("sense.openclaw.engineering_tool.grep")
  || adapter.summary?.canReadBoundedEngineeringFiles !== true
  || adapter.summary?.canRunBoundedEngineeringGlob !== true
  || adapter.summary?.canRunBoundedEngineeringGrep !== true
) {
  throw new Error(`native adapter missing read/search capabilities: ${JSON.stringify(adapter)}`);
}
for (const secret of [
  "ENGINEERING_READ_SEARCH_NODE_MODULES_SECRET",
  "ENGINEERING_READ_SEARCH_CACHE_SECRET",
  "ENGINEERING_READ_SEARCH_GENERATED_SECRET",
  "0.0.0-ENGINEERING_READ_SEARCH-secret-version",
]) {
  if (raw.includes(secret)) {
    throw new Error(`read/search leaked skipped directory or package secret: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawNativeEngineeringReadSearch: {
    readLines: read.summary.lineCount,
    globMatches: glob.summary.matchedResults,
    grepMatches: grep.summary.matchedResults,
    largeBoundary: large.target.blockedReason,
    binaryBoundary: binary.target.blockedReason,
    traversalStatus: badStatus,
  },
}, null, 2));
EOF
