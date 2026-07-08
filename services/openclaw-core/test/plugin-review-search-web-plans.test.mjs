import test from "node:test";
import assert from "node:assert/strict";

import { createPluginReviewSearchWebPlans } from "../src/plugin-review-search-web-plans.mjs";

function createSearchWebPlansHarness() {
  const calls = [];
  const builders = createPluginReviewSearchWebPlans({
    autonomyMode: "manual",
    buildOpenClawPluginCandidateContractTests: (input) => {
      calls.push(input);
      return {
        ok: true,
        registry: "openclaw-plugin-candidate-contract-tests-v0",
        workspace: {
          root: "/repo",
          packageName: "fixture",
        },
        candidates: [
          {
            id: "candidate-1",
            manifestId: "search-provider",
            extensionName: "Search Provider",
            sourceManifestPath: "extensions/search/manifest.json",
            category: "search_and_web",
            proposedCapability: {
              id: "cap.search",
              risk: "high",
              auditLedger: "capability_history",
            },
            signals: {
              contractKeys: ["search", "fetchUrl"],
            },
          },
        ],
      };
    },
  });

  return { builders, calls };
}

test("plugin review search-web plans build metadata-only contracts and activation gates", () => {
  const { builders, calls } = createSearchWebPlansHarness();

  const contract = builders.buildOpenClawPluginSearchWebAdapterContract({
    workspacePath: "/repo",
    query: "native search",
    limit: 4,
  });
  assert.equal(contract.registry, "openclaw-plugin-search-web-adapter-contract-v0");
  assert.equal(contract.providerContracts.length, 1);
  assert.equal(contract.providerContracts[0].runtime.canUseNetwork, false);
  assert.equal(contract.providerContracts[0].privacy.endpointHostsExposed, false);
  assert.deepEqual(contract.providerContracts[0].operations, ["search.query", "web.fetch_metadata"]);
  assert.equal(calls[0].category, "search_and_web");

  const taskDraft = builders.buildOpenClawPluginSearchWebAdapterTaskDraft({
    providerContractId: "search-provider",
    query: "  local-first search  ",
  });
  assert.equal(taskDraft.registry, "openclaw-plugin-search-web-adapter-task-draft-v0");
  assert.equal(taskDraft.policy.decision.autonomyMode, "manual");
  assert.equal(taskDraft.query.contentExposed, false);
  assert.equal(taskDraft.query.length, "local-first search".length);
  assert.match(taskDraft.query.digest, /^[a-f0-9]{16}$/u);
  assert.equal(taskDraft.plan.governance.canUseNetwork, false);

  const preflight = builders.buildOpenClawPluginSearchWebAdapterRuntimePreflight();
  assert.equal(preflight.registry, "openclaw-plugin-search-web-adapter-runtime-preflight-v0");
  assert.equal(preflight.executionEnvelope.constraints.canUseNetwork, false);
  assert.equal(preflight.executionEnvelope.query.contentExposed, false);

  const activationPlan = builders.buildOpenClawPluginSearchWebAdapterRuntimeActivationPlan();
  assert.equal(activationPlan.registry, "openclaw-plugin-search-web-adapter-runtime-activation-plan-v0");
  assert.equal(activationPlan.activationReady, false);
  assert.equal(activationPlan.summary.createsApproval, false);
  assert.equal(
    activationPlan.gates.some((gate) => gate.id === "network_runtime_adapter_required" && gate.status === "blocked"),
    true,
  );

  const sandbox = builders.buildOpenClawPluginSearchWebAdapterProviderRuntimeSandbox();
  assert.equal(sandbox.registry, "openclaw-plugin-search-web-adapter-provider-runtime-sandbox-v0");
  assert.equal(sandbox.sandbox.egress.networkEgressDefault, "deny");
  assert.equal(sandbox.sandbox.execution.canActivateRuntime, false);

  const activationTaskDraft = builders.buildOpenClawPluginSearchWebAdapterRuntimeActivationTaskDraft();
  assert.equal(activationTaskDraft.registry, "openclaw-plugin-search-web-adapter-runtime-activation-task-draft-v0");
  assert.equal(activationTaskDraft.policy.request.requiresApproval, true);

  const sandboxTaskDraft = builders.buildOpenClawPluginSearchWebAdapterProviderRuntimeSandboxTaskDraft();
  assert.equal(sandboxTaskDraft.registry, "openclaw-plugin-search-web-adapter-provider-runtime-sandbox-task-draft-v0");
  assert.equal(sandboxTaskDraft.policy.request.requiresApproval, true);
});

test("plugin review search-web plans reject unknown provider contracts", () => {
  const { builders } = createSearchWebPlansHarness();

  assert.throws(
    () => builders.buildOpenClawPluginSearchWebAdapterTaskDraft({ providerContractId: "missing-provider" }),
    /not part of the search\/web adapter contract/u,
  );
});
