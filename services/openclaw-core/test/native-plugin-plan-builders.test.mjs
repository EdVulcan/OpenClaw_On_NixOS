import test from "node:test";
import assert from "node:assert/strict";

import { createNativePluginPlanBuilders } from "../src/native-plugin-plan-builders.mjs";
import { createTaskLifecycleHarness } from "./task-builder-harness.mjs";

function createNativePluginHarness() {
  return createTaskLifecycleHarness({
    deps: {
      autonomyMode: "guardian",
      buildNativePluginManifestProfile: () => ({
        registry: "openclaw-native-plugin-adapter-v0",
        mode: "manifest-profile",
        plugin: {
          id: "openclaw.native.plugin-sdk",
          packageName: "@openclaw/native-plugin-sdk",
          hasTypes: true,
          hasExports: true,
          exportKeys: ["activate"],
          scriptNames: ["test"],
          dependencySummary: { total: 0 },
        },
      }),
    },
  });
}

test("native plugin plan builders preserve runtime preflight and adapter contracts", () => {
  const { deps } = createNativePluginHarness();
  const builders = createNativePluginPlanBuilders(deps);

  const plan = builders.buildNativePluginCapabilityInvokePlan();
  const preflight = builders.buildNativePluginRuntimePreflight();
  const activationPlan = builders.buildNativePluginRuntimeActivationPlan();
  const refreshEvidence = builders.buildNativePluginRuntimeRefreshEvidence();
  const adapterContract = builders.buildNativePluginRuntimeAdapterContract();
  const adapterDraft = builders.buildNativePluginRuntimeAdapterTaskDraft();
  const activationDraft = builders.buildNativePluginRuntimeActivationTaskDraft();

  assert.equal(plan.registry, "openclaw-native-plugin-invoke-plan-v0");
  assert.equal(plan.capability.id, "act.plugin.capability.invoke");
  assert.equal(preflight.governance.canExecutePluginCode, false);
  assert.equal(activationPlan.summary.activationReady, false);
  assert.equal(refreshEvidence.registry, "openclaw-native-plugin-runtime-refresh-evidence-v0");
  assert.equal(refreshEvidence.summary.readModelRefreshed, true);
  assert.equal(refreshEvidence.governance.canImportModule, false);
  assert.equal(refreshEvidence.governance.canActivateRuntime, false);
  assert.equal(adapterContract.runtimeContract.execution.canImportModule, false);
  assert.equal(adapterContract.summary.canExecutePluginCode, false);
  assert.equal(adapterDraft.registry, "openclaw-native-plugin-runtime-adapter-task-draft-v0");
  assert.equal(activationDraft.registry, "openclaw-native-plugin-runtime-activation-task-draft-v0");
});

test("native plugin plan builders create approval-gated task shells", async () => {
  const { deps, calls, events } = createNativePluginHarness();
  const builders = createNativePluginPlanBuilders(deps);

  await assert.rejects(
    () => builders.createNativePluginInvokeTask({ confirm: false }),
    /requires confirm=true/,
  );

  const invoke = await builders.createNativePluginInvokeTask({ confirm: true });
  const adapter = await builders.createNativePluginRuntimeAdapterTask({ confirm: true });
  const activation = await builders.createNativePluginRuntimeActivationTask({ confirm: true });

  assert.equal(invoke.registry, "openclaw-native-plugin-invoke-task-v0");
  assert.equal(invoke.task.type, "native_plugin_capability");
  assert.equal(adapter.registry, "openclaw-native-plugin-runtime-adapter-task-v0");
  assert.equal(adapter.task.type, "native_plugin_runtime_adapter_implementation");
  assert.equal(activation.registry, "openclaw-native-plugin-runtime-activation-task-v0");
  assert.equal(activation.task.type, "native_plugin_runtime_activation");
  assert.equal(calls.filter((call) => call.name === "createTask").length, 3);
  assert.equal(calls.filter((call) => call.name === "createApprovalRequestForTask").length, 3);
  assert.equal(events.filter((event) => event.name === "task.created").length, 3);
  assert.equal(events.filter((event) => event.name === "approval.pending").length, 3);
  assert.equal(events.filter((event) => event.name === "task.planned").length, 3);
});
