import test from "node:test";
import assert from "node:assert/strict";

import { createCredentialLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTaskShellRuntime } from "../src/cloud-live-provider-runtime-credential-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-task-shell.mjs";
import { createTaskLifecycleHarness } from "./task-builder-harness.mjs";

const EXECUTION_ATTEMPT_ROUTE_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-route-v0";
const EXECUTION_ATTEMPT_TASK_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-task-v0";
const EXECUTION_ATTEMPT_TASK_SHELL_SLUG =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-attempt-task-shell";
const EXECUTION_ATTEMPT_TASK_FIELD =
  "cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttempt";
const EXECUTION_FINAL_READINESS_RECORDED_FIELD =
  "credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionFinalReadinessPreflightRecorded";
const EXECUTION_ATTEMPT_TASK_CREATED_FIELD =
  "credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTaskCreated";
const EXECUTION_ATTEMPT_TASK_APPROVED_FIELD =
  "credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTaskApproved";
const EXECUTION_ATTEMPT_TASK_DEFERRED_FIELD =
  "credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptDeferred";

function createExecutionAttemptRouteHarness(extraDeps = {}) {
  return createTaskLifecycleHarness({
    deps: {
      buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptRoute: async () => ({
        ok: true,
        registry: EXECUTION_ATTEMPT_ROUTE_REGISTRY,
        decision: {
          credentialReference: "openclaw://credential/provider/live-provider-fixture",
        },
        summary: {
          ready: true,
          sourceRegistry: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-final-readiness-preflight-v0",
          sourceTaskId: "task-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution",
          [EXECUTION_FINAL_READINESS_RECORDED_FIELD]: true,
          [EXECUTION_ATTEMPT_TASK_CREATED_FIELD]: false,
          credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
          credentialValueRead: false,
          credentialValueIncluded: false,
          credentialValueExposed: false,
          providerCredentialRead: false,
          endpointContacted: false,
          networkEgress: false,
          providerResponseCreated: false,
          rollbackExecuted: false,
          rollbackCommandCreated: false,
          hostMutation: false,
          transmitsExternally: false,
          liveProviderCallEnabled: false,
          launchAuthorized: false,
          launchExecuted: false,
        },
        next: {
          recommendedSlice: EXECUTION_ATTEMPT_TASK_SHELL_SLUG,
        },
      }),
      ...extraDeps,
    },
  });
}

test("credential local-read result-envelope creation execution attempt task shell stays approval gated and deferred", async () => {
  const { deps, calls, events } = createExecutionAttemptRouteHarness();
  const builders = createCredentialLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTaskShellRuntime(deps);

  const taskShell = await builders.createCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTask({ confirm: true });
  const shell = taskShell.task[EXECUTION_ATTEMPT_TASK_FIELD];

  assert.equal(taskShell.registry, EXECUTION_ATTEMPT_TASK_REGISTRY);
  assert.equal(taskShell.sourceRegistry, EXECUTION_ATTEMPT_ROUTE_REGISTRY);
  assert.equal(taskShell.approval.status, "pending");
  assert.equal(shell.registry, EXECUTION_ATTEMPT_TASK_REGISTRY);
  assert.equal(shell.sourceRegistry, EXECUTION_ATTEMPT_ROUTE_REGISTRY);
  assert.equal(shell.implementationStatus, "task_shell_only");
  assert.equal(shell[EXECUTION_FINAL_READINESS_RECORDED_FIELD], true);
  assert.equal(shell[EXECUTION_ATTEMPT_TASK_CREATED_FIELD], true);
  assert.equal(shell[EXECUTION_ATTEMPT_TASK_APPROVED_FIELD], false);
  assert.equal(shell[EXECUTION_ATTEMPT_TASK_DEFERRED_FIELD], true);
  assert.equal(shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated, false);
  assert.equal(shell.credentialValueRead, false);
  assert.equal(shell.credentialValueIncluded, false);
  assert.equal(shell.credentialValueExposed, false);
  assert.equal(shell.providerCredentialRead, false);
  assert.equal(shell.endpointContacted, false);
  assert.equal(shell.networkEgress, false);
  assert.equal(shell.providerResponseCreated, false);
  assert.equal(shell.rollbackExecuted, false);
  assert.equal(shell.rollbackCommandCreated, false);
  assert.equal(shell.hostMutation, false);
  assert.equal(shell.transmitsExternally, false);
  assert.equal(shell.liveProviderCallEnabled, false);
  assert.equal(shell.launchAuthorized, false);
  assert.equal(shell.launchExecuted, false);
  assert.equal(calls.filter((call) => call.name === "createTask").length, 1);
  assert.equal(calls.filter((call) => call.name === "createApprovalRequestForTask").length, 1);
  assert.equal(events.filter((event) => event.name === "task.created").length, 1);
  assert.equal(builders.isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTask(taskShell.task), true);

  taskShell.task.approval = { requestId: taskShell.approval.id, status: "pending" };
  const blocked = await builders.executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTask(taskShell.task);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.reason, "approval_required");

  deps.approvals.set(taskShell.approval.id, {
    id: taskShell.approval.id,
    status: "approved",
    updatedAt: "2026-07-09T08:00:00.000Z",
  });
  const executed = await builders.executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionAttemptTask(taskShell.task);
  const executedShell = executed.task[EXECUTION_ATTEMPT_TASK_FIELD];

  assert.equal(executed.status, "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_attempt_task_shell_deferred_after_approval");
  assert.equal(executed.summary[EXECUTION_ATTEMPT_TASK_CREATED_FIELD], true);
  assert.equal(executed.summary[EXECUTION_ATTEMPT_TASK_APPROVED_FIELD], true);
  assert.equal(executed.summary[EXECUTION_ATTEMPT_TASK_DEFERRED_FIELD], true);
  assert.equal(executed.summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated, false);
  assert.equal(executed.summary.credentialValueRead, false);
  assert.equal(executed.summary.credentialValueIncluded, false);
  assert.equal(executed.summary.credentialValueExposed, false);
  assert.equal(executed.summary.endpointContacted, false);
  assert.equal(executed.summary.networkEgress, false);
  assert.equal(executed.summary.liveProviderCallEnabled, false);
  assert.equal(executedShell.implementationStatus, "deferred_after_approval");
  assert.equal(executedShell[EXECUTION_ATTEMPT_TASK_APPROVED_FIELD], true);
  assert.equal(executedShell.credentialValueRead, false);
  assert.equal(executedShell.endpointContacted, false);
  assert.equal(executedShell.networkEgress, false);
  assert.equal(executed.task.phase, "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_attempt_task_shell_deferred");
});
