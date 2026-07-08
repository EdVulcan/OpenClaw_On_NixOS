import test from "node:test";
import assert from "node:assert/strict";

import { createCredentialLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationRuntime } from "../src/cloud-live-provider-runtime-credential-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation.mjs";
import { createTaskLifecycleHarness } from "./task-builder-harness.mjs";

const FINAL_READINESS_PREFLIGHT_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-final-readiness-preflight-v0";
const CREATION_ROUTE_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-route-v0";

function deferredCredentialFlags() {
  return {
    credentialValueIncluded: false,
    credentialValueRead: false,
    credentialValueExposed: false,
    providerCredentialRead: false,
    endpointNetworkEgressAuthorized: false,
    endpointNetworkEgressDenied: true,
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
  };
}

function createRouteHarness(extraDeps = {}) {
  return createTaskLifecycleHarness({
    deps: {
      buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeFinalReadinessPreflight: async () => ({
        ok: true,
        registry: FINAL_READINESS_PREFLIGHT_REGISTRY,
        preflight: {
          credentialReference: "openclaw://credential/provider/live-provider-fixture",
        },
        summary: {
          ready: true,
          credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded: true,
          sourceTaskId: "task-result-envelope-creation-execution-attempt-local-read-result-envelope",
          ...deferredCredentialFlags(),
        },
      }),
      ...extraDeps,
    },
  });
}

test("credential local-read result-envelope creation route preserves Phase 123 route-only boundary", async () => {
  const { deps } = createRouteHarness();
  const builders = createCredentialLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationRuntime(deps);

  const route = await builders.buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationRoute();

  assert.equal(route.registry, CREATION_ROUTE_REGISTRY);
  assert.equal(route.status, "credential_value_local_read_execution_local_read_attempt_local_read_result_envelope_creation_execution_attempt_local_read_result_envelope_creation_route_ready");
  assert.equal(route.summary.ready, true);
  assert.equal(route.summary.sourceRegistry, FINAL_READINESS_PREFLIGHT_REGISTRY);
  assert.equal(route.summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeFinalReadinessPreflightRecorded, true);
  assert.equal(route.summary.selectedSlice, "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-task-shell");
  assert.equal(route.summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreationExecutionAttemptLocalReadResultEnvelopeCreationTaskCreated, false);
  assert.equal(route.summary.credentialValueLocalReadExecutionLocalReadAttemptLocalReadResultEnvelopeCreated, false);
  assert.equal(route.summary.credentialValueRead, false);
  assert.equal(route.summary.credentialValueIncluded, false);
  assert.equal(route.summary.credentialValueExposed, false);
  assert.equal(route.summary.providerCredentialRead, false);
  assert.equal(route.summary.endpointContacted, false);
  assert.equal(route.summary.networkEgress, false);
  assert.equal(route.summary.providerResponseCreated, false);
  assert.equal(route.summary.rollbackExecuted, false);
  assert.equal(route.summary.hostMutation, false);
  assert.equal(route.summary.liveProviderCallEnabled, false);
  assert.equal(route.summary.launchExecuted, false);
  assert.equal(route.next.recommendedSlice, "openclaw-cloud-consciousness-live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-creation-execution-attempt-local-read-result-envelope-creation-task-shell");
});
