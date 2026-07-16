import test from "node:test";
import assert from "node:assert/strict";

import { createWorkspaceEditTargetCapabilityHandlers } from "../src/capability-runtime-workspace-edit-target.mjs";

const capability = { id: "sense.openclaw.workspace_edit_target_select" };

test("workspace edit target capability delegates bounded selection and emits a no-authority summary", () => {
  const calls = [];
  const handlers = createWorkspaceEditTargetCapabilityHandlers({
    buildNativeOpenClawWorkspaceEditTargetSelection: (input) => {
      calls.push(input);
      return {
        ok: true,
        registry: "openclaw-native-workspace-edit-target-selection-v0",
        query: { scope: "tools" },
        selectedTarget: { relativePath: "src/agents/tools/edit-target-tool.ts" },
        summary: {
          candidateCount: 3,
          selected: true,
          canFeedPatchProposal: true,
          exposesSourceFileContent: false,
          canExecutePluginCode: false,
          canExecuteToolCode: false,
          canActivateRuntime: false,
          canMutate: false,
          createsTask: false,
          createsApproval: false,
          canCallProvider: false,
          canUseNetwork: false,
        },
        governance: {
          exposesSourceFileContent: false,
          canExecutePluginCode: false,
          canExecuteToolCode: false,
          canActivateRuntime: false,
          canMutate: false,
          createsTask: false,
          createsApproval: false,
          canCallProvider: false,
          canUseNetwork: false,
        },
      };
    },
  });

  const backend = handlers.callBackend(capability, {
    params: {
      workspacePath: "/tmp/openclaw-fixture",
      scope: "tools",
      q: "edit",
      limit: 8,
    },
  });

  assert.equal(backend.handled, true);
  assert.deepEqual(calls, [{
    workspacePath: "/tmp/openclaw-fixture",
    scope: "tools",
    query: "edit",
    limit: 8,
  }]);
  assert.deepEqual(handlers.summariseResult(capability, backend.result), {
    kind: "openclaw.workspace_edit_target_select",
    ok: true,
    registry: "openclaw-native-workspace-edit-target-selection-v0",
    scope: "tools",
    candidateCount: 3,
    selected: true,
    selectedTarget: "src/agents/tools/edit-target-tool.ts",
    canFeedPatchProposal: true,
    noSourceContentExposure: true,
    noMutation: true,
    noTaskCreation: true,
    noApprovalCreation: true,
    noPluginExecution: true,
    noRuntimeActivation: true,
    canCallProvider: false,
    canUseNetwork: false,
    noProviderEgress: true,
  });
});

test("workspace edit target handler leaves unrelated capabilities untouched", () => {
  const handlers = createWorkspaceEditTargetCapabilityHandlers({
    buildNativeOpenClawWorkspaceEditTargetSelection: () => ({ ok: true }),
  });

  assert.deepEqual(handlers.callBackend({ id: "sense.system.vitals" }, { params: {} }), {
    handled: false,
    result: null,
  });
  assert.equal(handlers.summariseResult({ id: "sense.system.vitals" }, {}), null);
});
