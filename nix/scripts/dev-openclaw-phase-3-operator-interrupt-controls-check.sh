#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export OPENCLAW_CORE_PORT="${OPENCLAW_CORE_PORT:-6710}"
export OPENCLAW_EVENT_HUB_PORT="${OPENCLAW_EVENT_HUB_PORT:-6711}"
export OPENCLAW_SESSION_MANAGER_PORT="${OPENCLAW_SESSION_MANAGER_PORT:-6712}"
export OPENCLAW_BROWSER_RUNTIME_PORT="${OPENCLAW_BROWSER_RUNTIME_PORT:-6713}"
export OPENCLAW_SCREEN_SENSE_PORT="${OPENCLAW_SCREEN_SENSE_PORT:-6714}"
export OPENCLAW_SCREEN_ACT_PORT="${OPENCLAW_SCREEN_ACT_PORT:-6715}"
export OPENCLAW_SYSTEM_SENSE_PORT="${OPENCLAW_SYSTEM_SENSE_PORT:-6716}"
export OPENCLAW_SYSTEM_HEAL_PORT="${OPENCLAW_SYSTEM_HEAL_PORT:-6717}"
export OBSERVER_UI_PORT="${OBSERVER_UI_PORT:-6718}"
export OPENCLAW_CORE_STATE_FILE="${OPENCLAW_CORE_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-core-phase-3-operator-interrupt-controls-check.json}"
export OPENCLAW_SYSTEM_HEAL_STATE_FILE="${OPENCLAW_SYSTEM_HEAL_STATE_FILE:-$REPO_ROOT/.artifacts/openclaw-system-heal-phase-3-operator-interrupt-controls-check.json}"

CORE_URL="http://127.0.0.1:$OPENCLAW_CORE_PORT"
SESSION_MANAGER_URL="http://127.0.0.1:$OPENCLAW_SESSION_MANAGER_PORT"
BROWSER_RUNTIME_URL="http://127.0.0.1:$OPENCLAW_BROWSER_RUNTIME_PORT"
LEDGER_DIR="$REPO_ROOT/.artifacts/openclaw-body-evidence-ledger"

"$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
rm -f "$OPENCLAW_CORE_STATE_FILE" "$OPENCLAW_CORE_STATE_FILE.tmp" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE" "$OPENCLAW_SYSTEM_HEAL_STATE_FILE.tmp"
rm -rf "$LEDGER_DIR"

cleanup() {
  rm -f "${CONTROLS_FILE:-}" "${START_PROBE_FILE:-}" "${APPROVED_START_PROBE_FILE:-}" "${CONTROLS_AFTER_PROBE_FILE:-}" \
    "${SUSPENDED_STATE_FILE:-}" "${OLD_BROWSER_ACTION_FILE:-}" "${RESUMED_STATE_FILE:-}" "${RESUMED_BROWSER_ACTION_FILE:-}"
  "$SCRIPT_DIR/dev-down.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-openclaw-http-json-helper.sh"


"$SCRIPT_DIR/dev-up.sh"
post_json "$SESSION_MANAGER_URL/work-view/prepare" '{"displayTarget":"workspace-2","entryUrl":"https://example.com/phase-3-controls"}' >/dev/null

created_task="$(post_json "$CORE_URL/tasks" '{"goal":"Phase 3 operator takeover demo","type":"browser_task","targetUrl":"https://example.com/phase-3-controls","workViewStrategy":"ai-work-view"}')"
task_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.task.id)' "$created_task")"
prepared_state="$(curl --silent --fail "$SESSION_MANAGER_URL/work-view/state")"
attach_body="$(node -e 'const data=JSON.parse(process.argv[1]); const workView=data.workView??{}; process.stdout.write(JSON.stringify({sessionId:data.session?.sessionId??null,status:"ready",visibility:workView.visibility??"hidden",mode:workView.mode??"background",helperStatus:workView.helperStatus??"active",displayTarget:workView.displayTarget??"workspace-2",activeUrl:workView.activeUrl??"https://example.com/phase-3-controls"}));' "$prepared_state")"
post_json "$CORE_URL/tasks/$task_id/attach-work-view" "$attach_body" >/dev/null
takeover="$(post_json "$CORE_URL/control/takeover" '{}')"
SUSPENDED_STATE_FILE="$(mktemp)"
OLD_BROWSER_ACTION_FILE="$(mktemp)"
curl --silent --fail "$SESSION_MANAGER_URL/work-view/state" > "$SUSPENDED_STATE_FILE"
old_browser_action_body="$(node -e 'const data=JSON.parse(process.argv[1]); const r=data.workView?.helperRuntime??{}; const trustedHelperLease={registry:"openclaw-trusted-work-view-helper-lease-v0",owner:r.owner,mode:r.mode,scope:r.scope,leaseId:r.leaseId,sessionId:r.sessionId,workViewId:r.workViewId,heartbeatAt:r.heartbeatAt,actionAuthority:r.actionAuthority}; process.stdout.write(JSON.stringify({text:"must-stay-blocked",trustedHelperLease}));' "$prepared_state")"
old_browser_action_status="$(curl --silent --output "$OLD_BROWSER_ACTION_FILE" --write-out "%{http_code}" \
  -X POST "$BROWSER_RUNTIME_URL/browser/input" \
  -H 'content-type: application/json' \
  --data "$old_browser_action_body")"
CONTROLS_FILE="$(mktemp)"
curl --silent --fail "$CORE_URL/phase-3/operator-interrupt-controls" > "$CONTROLS_FILE"
resume="$(post_json "$CORE_URL/control/resume" '{}')"
RESUMED_STATE_FILE="$(mktemp)"
RESUMED_BROWSER_ACTION_FILE="$(mktemp)"
curl --silent --fail "$SESSION_MANAGER_URL/work-view/state" > "$RESUMED_STATE_FILE"
resumed_browser_action_body="$(node -e 'const data=JSON.parse(process.argv[1]); const r=data.workView?.helperRuntime??{}; const trustedHelperLease={registry:"openclaw-trusted-work-view-helper-lease-v0",owner:r.owner,mode:r.mode,scope:r.scope,leaseId:r.leaseId,sessionId:r.sessionId,workViewId:r.workViewId,heartbeatAt:r.heartbeatAt,actionAuthority:r.actionAuthority}; process.stdout.write(JSON.stringify({text:"allowed-after-explicit-resume",trustedHelperLease}));' "$(cat "$RESUMED_STATE_FILE")")"
curl --silent --fail \
  -X POST "$BROWSER_RUNTIME_URL/browser/input" \
  -H 'content-type: application/json' \
  --data "$resumed_browser_action_body" > "$RESUMED_BROWSER_ACTION_FILE"
sidecar_task="$(post_json "$CORE_URL/work-view/trusted-sidecar/lifecycle-tasks" '{"confirm":true}')"
sidecar_task_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.task.id)' "$sidecar_task")"
sidecar_approval_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.approval.id)' "$sidecar_task")"

START_PROBE_FILE="$(mktemp)"
APPROVED_START_PROBE_FILE="$(mktemp)"
CONTROLS_AFTER_PROBE_FILE="$(mktemp)"
start_probe_status="$(curl --silent --output "$START_PROBE_FILE" --write-out "%{http_code}" \
  -X POST "$CORE_URL/work-view/trusted-sidecar/lifecycle-tasks/$sidecar_task_id/start-probe" \
  -H 'content-type: application/json' \
  --data '{}')"
approved_sidecar="$(post_json "$CORE_URL/approvals/$sidecar_approval_id/approve" '{"approvedBy":"phase-3-operator-controls-check","reason":"approve trusted sidecar lifecycle probe while keeping process start deferred"}')"
approved_start_probe_status="$(curl --silent --output "$APPROVED_START_PROBE_FILE" --write-out "%{http_code}" \
  -X POST "$CORE_URL/work-view/trusted-sidecar/lifecycle-tasks/$sidecar_task_id/start-probe" \
  -H 'content-type: application/json' \
  --data '{}')"
curl --silent --fail "$CORE_URL/phase-3/operator-interrupt-controls" > "$CONTROLS_AFTER_PROBE_FILE"

node - <<'EOF' "$CONTROLS_FILE" "$takeover" "$sidecar_task" "$start_probe_status" "$START_PROBE_FILE" "$approved_sidecar" "$approved_start_probe_status" "$APPROVED_START_PROBE_FILE" "$CONTROLS_AFTER_PROBE_FILE" "$SUSPENDED_STATE_FILE" "$old_browser_action_status" "$OLD_BROWSER_ACTION_FILE" "$resume" "$RESUMED_STATE_FILE" "$RESUMED_BROWSER_ACTION_FILE"
const fs = require("node:fs");
const controls = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const takeover = JSON.parse(process.argv[3]);
const sidecarTask = JSON.parse(process.argv[4]);
const startProbeStatus = process.argv[5];
const startProbe = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const approvedSidecar = JSON.parse(process.argv[7]);
const approvedStartProbeStatus = process.argv[8];
const approvedStartProbe = JSON.parse(fs.readFileSync(process.argv[9], "utf8"));
const controlsAfterProbe = JSON.parse(fs.readFileSync(process.argv[10], "utf8"));
const suspendedState = JSON.parse(fs.readFileSync(process.argv[11], "utf8"));
const oldBrowserActionStatus = process.argv[12];
const oldBrowserAction = JSON.parse(fs.readFileSync(process.argv[13], "utf8"));
const resume = JSON.parse(process.argv[14]);
const resumedState = JSON.parse(fs.readFileSync(process.argv[15], "utf8"));
const resumedBrowserAction = JSON.parse(fs.readFileSync(process.argv[16], "utf8"));

if (!controls.ok
  || controls.registry !== "openclaw-phase-3-operator-interrupt-controls-v0"
  || controls.status !== "operator_interrupt_controls_ready"
  || controls.summary?.ready !== true
  || controls.summary?.takeoverSupported !== true
  || controls.summary?.hiddenAutomation !== false) {
  throw new Error(`operator interrupt controls should be ready: ${JSON.stringify(controls.summary)}`);
}
for (const id of ["pause", "resume", "stop", "takeover"]) {
  if (!controls.controls?.some((control) => control.id === id && control.available === true)) {
    throw new Error(`missing operator control ${id}: ${JSON.stringify(controls.controls)}`);
  }
}
if (!takeover.ok
  || takeover.task?.status !== "paused"
  || takeover.task?.operatorTakeover?.status !== "operator_controlled"
  || takeover.task?.workView?.mode !== "operator-takeover"
  || takeover.workViewAuthority?.workView?.helperRuntime?.status !== "suspended"
  || takeover.workViewAuthority?.workView?.helperRuntime?.actionAuthority !== "suspended") {
  throw new Error(`takeover should pause task and mark operator control: ${JSON.stringify(takeover.task)}`);
}
const suspendedRuntime = suspendedState.workView?.helperRuntime ?? {};
if (suspendedRuntime.status !== "suspended"
  || suspendedRuntime.actionAuthority !== "suspended"
  || suspendedRuntime.leaseMatched !== true
  || controls.helperRuntime?.status !== "suspended"
  || controls.summary?.actionAuthoritySuspended !== true
  || controls.summary?.actionAuthority !== "suspended") {
  throw new Error(`takeover should suspend trusted helper action authority visibly: ${JSON.stringify({ suspendedRuntime, controls: controls.summary })}`);
}
if (oldBrowserActionStatus !== "409"
  || oldBrowserAction.ok !== false
  || oldBrowserAction.mediation?.accepted !== false
  || oldBrowserAction.mediation?.reason !== "trusted_helper_action_authority_suspended") {
  throw new Error(`browser should reject the pre-takeover lease while authority is suspended: ${oldBrowserActionStatus} ${JSON.stringify(oldBrowserAction)}`);
}
const resumedRuntime = resumedState.workView?.helperRuntime ?? {};
if (!resume.ok
  || resume.task?.status !== "queued"
  || resume.task?.operatorTakeover?.status !== "resumed"
  || resume.workViewAuthority?.authority?.rebound !== true
  || resumedRuntime.status !== "active"
  || resumedRuntime.actionAuthority !== "active"
  || resumedRuntime.leaseMatched !== true
  || resumedRuntime.leaseId === suspendedRuntime.leaseId
  || resumedBrowserAction.ok !== true
  || resumedBrowserAction.mediation?.accepted !== true
  || resumedBrowserAction.mediation?.leaseMatched !== true) {
  throw new Error(`explicit resume should rebind a fresh lease before browser actions continue: ${JSON.stringify({ resume, resumedRuntime, resumedBrowserAction })}`);
}
if (!sidecarTask.ok
  || sidecarTask.registry !== "openclaw-work-view-trusted-sidecar-lifecycle-task-v0"
  || sidecarTask.task?.type !== "work_view_trusted_sidecar_lifecycle"
  || sidecarTask.approval?.status !== "pending"
  || sidecarTask.governance?.processStartEnabled !== false
  || sidecarTask.task?.workViewTrustedSidecarLifecycle?.execution !== null) {
  throw new Error(`sidecar lifecycle task should be approval-gated and non-executing: ${JSON.stringify(sidecarTask)}`);
}
if (startProbeStatus !== "409"
  || startProbe.ok !== false
  || startProbe.mode !== "trusted-sidecar-start-probe-blocked"
  || startProbe.readback?.status !== "blocked_before_approval"
  || startProbe.readback?.approvalStatus !== "pending"
  || startProbe.readback?.reason !== "approval_required_before_sidecar_start_probe"
  || startProbe.readback?.execution?.processStarted !== false
  || startProbe.readback?.execution?.processStartEnabled !== false
  || startProbe.readback?.execution?.rootRequired !== false
  || startProbe.readback?.execution?.systemDaemonRequired !== false
  || startProbe.readback?.execution?.desktopWideCapture !== false
  || startProbe.readback?.execution?.hostMutation !== false
  || startProbe.readback?.execution?.providerEgress !== false) {
  throw new Error(`sidecar start probe should be blocked before approval without execution: ${startProbeStatus} ${JSON.stringify(startProbe)}`);
}
if (!approvedSidecar.ok || approvedSidecar.approval?.status !== "approved") {
  throw new Error(`sidecar lifecycle approval should be approved: ${JSON.stringify(approvedSidecar)}`);
}
if (approvedStartProbeStatus !== "200"
  || approvedStartProbe.ok !== true
  || approvedStartProbe.mode !== "trusted-sidecar-start-probe-deferred-after-approval"
  || approvedStartProbe.readback?.status !== "deferred_after_approval"
  || approvedStartProbe.readback?.approvalStatus !== "approved"
  || approvedStartProbe.readback?.reason !== "sidecar_process_start_deferred_to_later_slice"
  || approvedStartProbe.readback?.execution?.processStarted !== false
  || approvedStartProbe.readback?.execution?.processStartEnabled !== false
  || approvedStartProbe.readback?.execution?.rootRequired !== false
  || approvedStartProbe.readback?.execution?.systemDaemonRequired !== false
  || approvedStartProbe.readback?.execution?.desktopWideCapture !== false
  || approvedStartProbe.readback?.execution?.hostMutation !== false
  || approvedStartProbe.readback?.execution?.providerEgress !== false) {
  throw new Error(`approved sidecar start probe should remain deferred without execution: ${approvedStartProbeStatus} ${JSON.stringify(approvedStartProbe)}`);
}
if (!approvedStartProbe.task?.workViewTrustedSidecarLifecycle?.execution
  || approvedStartProbe.task.workViewTrustedSidecarLifecycle.execution.status !== "deferred_after_approval"
  || approvedStartProbe.task.workViewTrustedSidecarLifecycle.execution.execution?.processStarted !== false) {
  throw new Error(`approved sidecar start probe should be recorded on the task: ${JSON.stringify(approvedStartProbe.task?.workViewTrustedSidecarLifecycle)}`);
}
if (controlsAfterProbe.sidecarLifecycle?.taskId !== sidecarTask.task.id
  || controlsAfterProbe.sidecarLifecycle?.approvalStatus !== "approved"
  || controlsAfterProbe.sidecarLifecycle?.latestProbe?.status !== "deferred_after_approval"
  || controlsAfterProbe.sidecarLifecycle?.safety?.processStarted !== false
  || controlsAfterProbe.summary?.sidecarStartProbeStatus !== "deferred_after_approval"
  || controlsAfterProbe.summary?.sidecarProcessStarted !== false) {
  throw new Error(`operator controls should consolidate sidecar lifecycle readback: ${JSON.stringify(controlsAfterProbe.sidecarLifecycle)}`);
}

console.log(JSON.stringify({
  openclawPhase3OperatorInterruptControls: {
    status: "passed",
    registry: controls.registry,
    controls: controls.controls.map((control) => control.id),
    takeoverTaskStatus: takeover.task.status,
    suspendedLease: suspendedRuntime.leaseId,
    oldLeaseActionStatus: oldBrowserActionStatus,
    resumedLease: resumedRuntime.leaseId,
    resumedActionAccepted: resumedBrowserAction.mediation.accepted,
    sidecarTask: sidecarTask.task.id,
    approval: sidecarTask.approval.id,
    startProbeBeforeApproval: startProbe.readback.status,
    startProbeAfterApproval: approvedStartProbe.readback.status,
    controlsSidecarProbe: controlsAfterProbe.sidecarLifecycle.latestProbe.status,
  },
}, null, 2));
EOF
