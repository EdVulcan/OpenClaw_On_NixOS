#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6380}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6381}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6382}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6383}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6384}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6385}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6386}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6387}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6450}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-observer-body-evidence-timeline-readiness-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-observer-body-evidence-timeline-readiness-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
SYSTEM_URL="http://127.0.0.1:$OPENCLAW_SYSTEM_SENSE_PORT"
OBSERVER_URL="http://127.0.0.1:$OBSERVER_UI_PORT"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f \
  "$OPENCLAW_CORE_STATE_FILE" \
  "$OPENCLAW_CORE_STATE_FILE.tmp" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" \
  "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"

cleanup() {
  rm -f "${HTML_FILE:-}" "${CLIENT_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/dev-up.sh"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"


created_next_repair="$(post_json "$CORE_URL/system/systemd/next-repair-tasks" '{"confirm":true,"execute":true}')"
next_repair_approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$created_next_repair")"
post_json "$CORE_URL/approvals/$next_repair_approval_id/approve" '{"approvedBy":"observer-milestone-check","reason":"Approve one next repair execution before observer timeline readiness."}' >/dev/null
post_json "$CORE_URL/operator/step" '{}' >/dev/null

curl --silent --fail "$SYSTEM_URL/system/health" >/dev/null

HTML_FILE="$(mktemp)"
CLIENT_FILE="$(mktemp)"
curl --silent --fail "$OBSERVER_URL/" > "$HTML_FILE"
curl --silent --fail "$OBSERVER_URL/client-v5.js" > "$CLIENT_FILE"
readiness="$(curl --silent --fail "$SYSTEM_URL/system/route/body-evidence-timeline-readiness")"

node - <<'EOF' "$HTML_FILE" "$CLIENT_FILE" "$readiness"
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const client = fs.readFileSync(process.argv[3], "utf8");
const readiness = JSON.parse(process.argv[4]);

const requiredHtml = [
  "Evidence Timeline Readiness",
  "body-evidence-timeline-readiness-panel",
  "body-evidence-timeline-readiness-ready",
  "body-evidence-timeline-readiness-checks",
  "body-evidence-timeline-readiness-latest",
  "body-evidence-timeline-readiness-mutation",
  "body-evidence-timeline-readiness-json",
];
const requiredClient = [
  "/system/route/body-evidence-timeline-readiness",
  "refreshBodyEvidenceTimelineReadiness",
  "bodyEvidenceTimelineReadinessReady",
  "bodyEvidenceTimelineReadinessChecks",
  "bodyEvidenceTimelineReadinessLatest",
  "bodyEvidenceTimelineReadinessMutation",
  "bodyEvidenceTimelineReadinessJson",
  "openclaw-phase-2-next-capability-route-review",
  "openclaw-systemd-next-repair-demo-status",
];

for (const token of requiredHtml) {
  if (!html.includes(token)) {
    throw new Error(`Observer HTML missing ${token}`);
  }
}
for (const token of requiredClient) {
  if (!client.includes(token)) {
    throw new Error(`Observer client missing ${token}`);
  }
}
if (!readiness.ok || readiness.registry !== "openclaw-body-evidence-timeline-readiness-v0") {
  throw new Error(`Observer source should expose timeline readiness registry: ${JSON.stringify(readiness)}`);
}
if (readiness.summary?.ready !== true || readiness.summary?.timelineEntries < 8) {
  throw new Error(`Observer timeline readiness should be ready with entries: ${JSON.stringify(readiness.summary)}`);
}
if (readiness.governance?.createsTask !== false
  || readiness.governance?.createsApproval !== false
  || readiness.governance?.executesCommand !== false
  || readiness.governance?.hostMutation !== false) {
  throw new Error(`Observer timeline readiness must remain read-only: ${JSON.stringify(readiness.governance)}`);
}

console.log(JSON.stringify({
  observerOpenClawBodyEvidenceTimelineReadiness: {
    status: "passed",
    panel: "Evidence Timeline Readiness",
    registry: readiness.registry,
    entries: readiness.summary?.timelineEntries,
    checks: `${readiness.summary?.passedChecks}/${readiness.summary?.totalChecks}`,
    hostMutation: readiness.governance?.hostMutation,
  },
}, null, 2));
EOF
