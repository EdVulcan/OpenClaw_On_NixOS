import test from "node:test";
import assert from "node:assert/strict";

import { createCredentialLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskShellRuntime } from "../src/cloud-live-provider-runtime-credential-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-task-shell.mjs";
import { createTaskLifecycleHarness } from "./task-builder-harness.mjs";

const EXECUTION_ROUTE_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-route-v0";
const EXECUTION_TASK_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-task-v0";
const EXECUTION_TASK_SHELL_SLUG =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-execution-task-shell";
const EXECUTION_TASK_FIELD =
  "cloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecution";

function createExecutionRouteHarness(extraDeps = {}) {
  return createTaskLifecycleHarness({
    deps: {
      buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionRoute: async () => ({
        ok: true,
        registry: EXECUTION_ROUTE_REGISTRY,
        decision: {
          credentialReference: "openclaw://credential/provider/live-provider-fixture",
        },
        summary: {
          ready: true,
          sourceRegistry: "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-final-readiness-preflight-v0",
          sourceTaskId: "task-result-envelope-creation-execution-attempt-local-read-result-envelope-creation",
          credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded: true,
          credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated: false,
          credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated: false,
          credentialValueRead: false,
          credentialValueIncluded: false,
          credentialValueExposed: false,
          providerCredentialRead: false,
          endpointContacted: false,
          networkEgress: false,
          providerResponseCreated: false,
          rollbackExecuted: false,
          hostMutation: false,
          liveProviderCallEnabled: false,
          launchExecuted: false,
        },
        next: {
          recommendedSlice: EXECUTION_TASK_SHELL_SLUG,
        },
      }),
      ...extraDeps,
    },
  });
}

test("credential local-read result-envelope creation execution task shell stays approval gated and deferred", async () => {
  const { deps, calls, events } = createExecutionRouteHarness();
  const builders = createCredentialLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskShellRuntime(deps);

  const taskShell = await builders.createCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTask({ confirm: true });
  const shell = taskShell.task[EXECUTION_TASK_FIELD];

  assert.equal(taskShell.registry, EXECUTION_TASK_REGISTRY);
  assert.equal(taskShell.sourceRegistry, EXECUTION_ROUTE_REGISTRY);
  assert.equal(taskShell.approval.status, "pending");
  assert.equal(shell.registry, EXECUTION_TASK_REGISTRY);
  assert.equal(shell.sourceRegistry, EXECUTION_ROUTE_REGISTRY);
  assert.equal(shell.implementationStatus, "task_shell_only");
  assert.equal(shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationFinalReadinessPreflightRecorded, true);
  assert.equal(shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated, true);
  assert.equal(shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskApproved, false);
  assert.equal(shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionDeferred, true);
  assert.equal(shell.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated, false);
  assert.equal(shell.credentialValueRead, false);
  assert.equal(shell.credentialValueIncluded, false);
  assert.equal(shell.credentialValueExposed, false);
  assert.equal(shell.providerCredentialRead, false);
  assert.equal(shell.endpointContacted, false);
  assert.equal(shell.networkEgress, false);
  assert.equal(shell.providerResponseCreated, false);
  assert.equal(shell.rollbackExecuted, false);
  assert.equal(shell.hostMutation, false);
  assert.equal(shell.liveProviderCallEnabled, false);
  assert.equal(calls.filter((call) => call.name === "createTask").length, 1);
  assert.equal(calls.filter((call) => call.name === "createApprovalRequestForTask").length, 1);
  assert.equal(events.filter((event) => event.name === "task.created").length, 1);
  assert.equal(builders.isCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTask(taskShell.task), true);

  taskShell.task.approval = { requestId: taskShell.approval.id, status: "pending" };
  const blocked = await builders.executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTask(taskShell.task);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.reason, "approval_required");

  deps.approvals.set(taskShell.approval.id, {
    id: taskShell.approval.id,
    status: "approved",
    updatedAt: "2026-07-09T02:00:00.000Z",
  });
  const executed = await builders.executeCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTask(taskShell.task);
  const executedShell = executed.task[EXECUTION_TASK_FIELD];

  assert.equal(executed.status, "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_task_shell_deferred_after_approval");
  assert.equal(executed.summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskCreated, true);
  assert.equal(executed.summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionTaskApproved, true);
  assert.equal(executed.summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationExecutionDeferred, true);
  assert.equal(executed.summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated, false);
  assert.equal(executed.summary.credentialValueRead, false);
  assert.equal(executed.summary.credentialValueIncluded, false);
  assert.equal(executed.summary.credentialValueExposed, false);
  assert.equal(executed.summary.endpointContacted, false);
  assert.equal(executed.summary.networkEgress, false);
  assert.equal(executed.summary.liveProviderCallEnabled, false);
  assert.equal(executedShell.implementationStatus, "deferred_after_approval");
  assert.equal(executed.task.phase, "cloud_consciousness_live_provider_credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_execution_task_shell_deferred");
});
