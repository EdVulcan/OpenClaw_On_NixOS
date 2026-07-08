import test from "node:test";
import assert from "node:assert/strict";

import { createCloudConsciousnessLiveProviderRuntimeReadinessBuilders } from "../src/cloud-consciousness-live-provider-runtime-readiness-builders.mjs";
import { createTaskLifecycleHarness } from "./task-builder-harness.mjs";

test("cloud consciousness live provider runtime-readiness builders preserve no-egress contracts", async () => {
  const { deps } = createTaskLifecycleHarness();
  const builders = createCloudConsciousnessLiveProviderRuntimeReadinessBuilders(deps);

  const adapterPlan = await builders.buildCloudConsciousnessLiveProviderCallRuntimeAdapterPlan();
  const finalAuthorization = await builders.buildCloudConsciousnessLiveProviderCallFinalAuthorization();
  const launchReview = await builders.buildCloudConsciousnessLiveProviderCallOperatorLaunchReview();
  const implementationPlan = await builders.buildCloudConsciousnessLiveProviderCallRuntimeImplementationPlan();

  assert.equal(adapterPlan.registry, "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-plan-v0");
  assert.equal(adapterPlan.summary.ready, true);
  assert.equal(adapterPlan.summary.providerSdkLoaded, false);
  assert.equal(finalAuthorization.registry, "openclaw-cloud-consciousness-live-provider-call-final-authorization-v0");
  assert.equal(finalAuthorization.summary.grantsFinalAuthorization, false);
  assert.equal(finalAuthorization.summary.networkEgress, false);
  assert.equal(launchReview.registry, "openclaw-cloud-consciousness-live-provider-call-operator-launch-review-v0");
  assert.equal(launchReview.summary.launchAuthorized, false);
  assert.equal(implementationPlan.registry, "openclaw-cloud-consciousness-live-provider-call-runtime-implementation-plan-v0");
  assert.equal(implementationPlan.summary.implementsRuntimeAdapter, false);
  assert.equal(implementationPlan.summary.liveProviderCallEnabled, false);
});

test("cloud consciousness live provider runtime-readiness builders create approval-gated adapter tasks", async () => {
  const { deps, calls, events } = createTaskLifecycleHarness();
  const builders = createCloudConsciousnessLiveProviderRuntimeReadinessBuilders(deps);

  await assert.rejects(
    () => builders.createCloudConsciousnessLiveProviderRuntimeAdapterTask({ confirm: false }),
    /requires confirm=true/,
  );

  const result = await builders.createCloudConsciousnessLiveProviderRuntimeAdapterTask({ confirm: true });

  assert.equal(result.registry, "openclaw-cloud-consciousness-live-provider-runtime-adapter-task-v0");
  assert.equal(result.task.type, "cloud_consciousness_live_provider_runtime_adapter_task");
  assert.equal(result.task.cloudConsciousnessLiveProviderRuntimeAdapter.implementationStatus, "deferred");
  assert.equal(result.task.cloudConsciousnessLiveProviderRuntimeAdapter.liveProviderCallEnabled, false);
  assert.equal(result.governance.createsApproval, true);
  assert.deepEqual(
    calls.map((call) => call.name),
    [
      "createTask",
      "createApprovalRequestForTask",
      "supersedeOtherActiveTasks",
      "reconcileRuntimeState",
      "persistState",
    ],
  );
  assert.deepEqual(
    events.map((event) => event.name),
    ["task.created", "approval.pending", "task.planned", "task.phase_changed"],
  );
});

test("cloud consciousness live provider runtime-readiness builders execute approved adapter shells without live egress", async () => {
  const { deps, calls, events } = createTaskLifecycleHarness({
    deps: {
      approvals: new Map([
        ["approval-runtime-adapter", {
          id: "approval-runtime-adapter",
          status: "approved",
          updatedAt: "2026-07-08T00:00:00.000Z",
        }],
      ]),
    },
  });
  const builders = createCloudConsciousnessLiveProviderRuntimeReadinessBuilders(deps);
  const task = {
    id: "task-runtime-adapter",
    type: "cloud_consciousness_live_provider_runtime_adapter_task",
    status: "queued",
    approval: { requestId: "approval-runtime-adapter", status: "approved" },
    cloudConsciousnessLiveProviderRuntimeAdapter: {
      registry: "openclaw-cloud-consciousness-live-provider-runtime-adapter-task-v0",
    },
  };

  assert.equal(builders.isCloudConsciousnessLiveProviderRuntimeAdapterTask(task), true);

  const result = await builders.executeCloudConsciousnessLiveProviderRuntimeAdapterTask(task);

  assert.equal(result.executor, "cloud-consciousness-live-provider-runtime-adapter-task-v0");
  assert.equal(result.status, "runtime_adapter_deferred_after_approval");
  assert.equal(result.summary.implementationStatus, "deferred_after_approval");
  assert.equal(result.summary.transmitsExternally, false);
  assert.equal(result.summary.providerSdkLoaded, false);
  assert.equal(result.summary.providerCredentialRead, false);
  assert.equal(result.summary.liveProviderCallEnabled, false);
  assert.equal(task.cloudConsciousnessLiveProviderRuntimeAdapter.implementationStatus, "deferred_after_approval");
  assert.equal(calls.some((call) => call.name === "appendTaskPhase" && call.phase === "cloud_consciousness_live_provider_runtime_adapter_deferred"), true);
  assert.equal(calls.at(-1).name, "completeTask");
  assert.equal(events.at(-1).name, "task.completed");
});
