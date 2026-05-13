#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/.artifacts/openclaw-native-plugin-invoke-deferred-fixture"
WORKSPACE_DIR="$FIXTURE_DIR/openclaw"
PLUGIN_SDK_DIR="$WORKSPACE_DIR/packages/plugin-sdk"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-9220}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-9221}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-9222}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-9223}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-9224}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-9225}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-9226}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-9227}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-9290}"
export OPENCLAW_WORKSPACE_ROOTS="$WORKSPACE_DIR"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-native-plugin-invoke-deferred-check.json}"
export OPENCLAW_EVENT_LOG_FILE="${OPENCLAW_EVENT_LOG_FILE:-$REPO_ROOT/.artifacts/openclaw-native-plugin-invoke-deferred-check-events.jsonl}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
EVENT_HUB_URL="http://127.0.0.1:$OPENCLAW_EVENT_HUB_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -rf "$FIXTURE_DIR"
mkdir -p "$WORKSPACE_DIR/.git" "$WORKSPACE_DIR/.openclaw" "$WORKSPACE_DIR/extensions/provider-a" "$WORKSPACE_DIR/extensions/provider-b" "$PLUGIN_SDK_DIR/src" "$PLUGIN_SDK_DIR/types" "$WORKSPACE_DIR/ui"
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_EVENT_LOG_FILE"
for index in $(seq 1 9); do mkdir -p "$WORKSPACE_DIR/extensions/provider-extra-$index"; done

cat > "$WORKSPACE_DIR/package.json" <<'JSON'
{
  "name": "openclaw",
  "version": "0.0.0-invoke-deferred-fixture",
  "private": true,
  "scripts": {
    "build": "echo INVOKE_DEFERRED_ROOT_SECRET_BUILD_BODY"
  }
}
JSON
cat > "$WORKSPACE_DIR/pnpm-workspace.yaml" <<'YAML'
packages:
  - "extensions/*"
  - "packages/*"
  - "ui"
YAML
cat > "$PLUGIN_SDK_DIR/package.json" <<'JSON'
{
  "name": "@openclaw/plugin-sdk",
  "version": "0.0.0-invoke-deferred-fixture",
  "private": false,
  "types": "./types/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "echo INVOKE_DEFERRED_SDK_SECRET_BUILD_BODY"
  },
  "dependencies": {
    "zod": "999.0.0-invoke-deferred-secret-version"
  }
}
JSON
cat > "$PLUGIN_SDK_DIR/src/index.ts" <<'TS'
export const INVOKE_DEFERRED_SDK_SECRET_SOURCE_CONTENT = "must-not-leak";
TS

cleanup() {
  rm -f "${TASK_FILE:-}" "${APPROVED_FILE:-}" "${DEFERRED_FILE:-}" "${HISTORY_FILE:-}" "${EVENTS_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

post_json() {
  local url="$1"
  local body="$2"
  curl --silent --fail -X POST "$url" -H 'content-type: application/json' -d "$body"
}

"$SCRIPT_DIR/dev-up.sh"

TASK_FILE="$(mktemp)"
APPROVED_FILE="$(mktemp)"
DEFERRED_FILE="$(mktemp)"
HISTORY_FILE="$(mktemp)"
EVENTS_FILE="$(mktemp)"

post_json "$CORE_URL/plugins/native-adapter/invoke-tasks" '{"capabilityId":"act.plugin.capability.invoke","confirm":true}' > "$TASK_FILE"

approval_id="$(node - <<'EOF' "$TASK_FILE"
const fs = require("node:fs");
const response = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!response.ok || response.approval?.status !== "pending" || !response.approval?.id) {
  throw new Error(`native plugin invoke task should create a pending approval: ${JSON.stringify(response)}`);
}
process.stdout.write(response.approval.id);
EOF
)"

post_json "$CORE_URL/approvals/$approval_id/approve" '{"approvedBy":"dev-openclaw-native-plugin-invoke-deferred-check","reason":"approve adapter-deferred native plugin invocation"}' > "$APPROVED_FILE"
post_json "$CORE_URL/operator/step" '{}' > "$DEFERRED_FILE"
curl --silent --fail "$CORE_URL/capabilities/invocations?limit=10" > "$HISTORY_FILE"
curl --silent --fail "$EVENT_HUB_URL/events/audit?type=task.blocked&source=openclaw-core&limit=20" > "$EVENTS_FILE"

node - <<'EOF' "$TASK_FILE" "$APPROVED_FILE" "$DEFERRED_FILE" "$HISTORY_FILE" "$EVENTS_FILE"
const fs = require("node:fs");
const readText = (index) => fs.readFileSync(process.argv[index], "utf8");
const readJson = (index) => JSON.parse(readText(index));

const taskResponse = readJson(2);
const approved = readJson(3);
const deferred = readJson(4);
const history = readJson(5);
const eventsText = readText(6);
const raw = JSON.stringify({ taskResponse, approved, deferred, history, eventsText });

if (approved.approval?.status !== "approved" || approved.task?.approval?.status !== "approved") {
  throw new Error(`approval should be approved before deferred execution: ${JSON.stringify(approved)}`);
}
if (approved.task?.policy?.decision?.decision !== "audit_only" || approved.task?.policy?.decision?.approved !== true) {
  throw new Error(`approved native plugin task should become audited, not freely executable: ${JSON.stringify(approved.task?.policy)}`);
}
if (
  !deferred.ok
  || deferred.ran !== false
  || deferred.blocked !== true
  || deferred.reason !== "runtime_adapter_deferred"
  || deferred.execution !== null
  || deferred.task?.id !== taskResponse.task?.id
  || deferred.task?.status !== "queued"
  || deferred.task?.executionPhase !== "runtime_adapter_deferred"
  || deferred.policy?.decision !== "audit_only"
  || deferred.approval?.status !== "approved"
) {
  throw new Error(`approved native plugin invocation should defer at the runtime adapter boundary: ${JSON.stringify(deferred)}`);
}
const invokeStep = (deferred.task?.plan?.steps ?? []).find((step) => step.kind === "plugin.capability.invoke");
if (
  !invokeStep
  || invokeStep.status !== "completed"
  || invokeStep.details?.reason !== "runtime_adapter_deferred"
  || invokeStep.details?.canExecutePluginCode !== false
  || invokeStep.details?.canActivateRuntime !== false
  || invokeStep.details?.requiresRuntimeAdapterBeforeExecution !== true
) {
  throw new Error(`deferred task should record a safe runtime adapter boundary: ${JSON.stringify(invokeStep)}`);
}
if ((history.items ?? []).some((entry) => entry.capability?.id === "act.plugin.capability.invoke")) {
  throw new Error(`deferred native plugin invocation must not execute plugin capability: ${JSON.stringify(history.items)}`);
}
const events = JSON.parse(eventsText);
if (
  !Array.isArray(events.items)
  || !events.items.some((event) => event.payload?.reason === "runtime_adapter_deferred")
) {
  throw new Error(`event stream should include the runtime adapter deferred boundary: ${eventsText}`);
}
for (const secret of [
  "INVOKE_DEFERRED_ROOT_SECRET_BUILD_BODY",
  "INVOKE_DEFERRED_SDK_SECRET_BUILD_BODY",
  "INVOKE_DEFERRED_SDK_SECRET_SOURCE_CONTENT",
  "999.0.0-invoke-deferred-secret-version",
  "0.0.0-invoke-deferred-fixture",
]) {
  if (raw.includes(secret)) {
    throw new Error(`deferred invocation must not expose source contents, script bodies, dependency versions, or package versions: ${secret}`);
  }
}

console.log(JSON.stringify({
  openclawNativePluginInvokeDeferred: {
    task: {
      id: deferred.task.id,
      status: deferred.task.status,
      phase: deferred.task.executionPhase,
    },
    blocked: {
      reason: deferred.reason,
      ran: deferred.ran,
    },
    approval: {
      id: deferred.approval.id,
      status: deferred.approval.status,
    },
  },
}, null, 2));
EOF
