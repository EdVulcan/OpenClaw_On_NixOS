import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { createPluginReviewManifestCapability } from "../src/plugin-review-manifest-capability.mjs";

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonFileIfPresent(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function createManifestFixture() {
  const rootPath = mkdtempSync(path.join(os.tmpdir(), "openclaw-plugin-manifest-"));
  for (const relativePath of [
    "extensions/search-web",
    "packages/plugin-sdk",
  ]) {
    mkdirSync(path.join(rootPath, relativePath), { recursive: true });
  }
  writeJson(path.join(rootPath, "packages/plugin-sdk/package.json"), {
    name: "@openclaw/plugin-sdk",
    private: false,
    types: "./types/index.d.ts",
    exports: {
      ".": "./dist/index.js",
    },
  });
  writeJson(path.join(rootPath, "extensions/search-web/openclaw.plugin.json"), {
    id: "search.web",
    enabledByDefault: true,
    providers: ["search"],
    providerEndpoints: [
      {
        hosts: ["api.search.example"],
      },
    ],
    contracts: {
      tools: ["search.web.query"],
      providers: ["search-provider"],
    },
    providerAuthEnvVars: {
      search: ["SEARCH_TOKEN"],
    },
    uiHints: [
      {
        sensitive: true,
      },
    ],
    configSchema: {
      properties: {
        endpoint: {
          type: "string",
        },
      },
    },
  });
  return rootPath;
}

function createManifestHarness(workspacePath) {
  const implementation = {
    registry: "openclaw-native-plugin-sdk-contract-implementation-v0",
    contract: {
      capabilities: [
        {
          id: "sense.openclaw.plugin_manifest_map",
          kind: "sense",
          risk: "low",
          runtimeOwner: "openclaw_on_nixos",
          approval: {
            required: false,
          },
        },
        {
          id: "plan.openclaw.plugin_capability",
          kind: "plan",
          risk: "low",
          runtimeOwner: "openclaw_on_nixos",
          approval: {
            required: false,
          },
        },
      ],
    },
  };

  return createPluginReviewManifestCapability({
    buildOpenClawNativePluginSdkContractImplementation: () => implementation,
    normalisePositiveLimit: (value, fallback, max) => {
      const parsed = Number.parseInt(String(value ?? ""), 10);
      return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
    },
    readJsonFileIfPresent,
    selectOpenClawToolCatalogWorkspace: () => ({
      registry: {
        registry: "workspace-detect-v0",
      },
      item: {
        id: "openclaw",
        name: "openclaw",
        path: workspacePath,
      },
    }),
    selectReviewedPluginSdkPackage: () => ({
      review: {
        registry: "openclaw-plugin-sdk-contract-review-v0",
        mode: "read-only",
      },
      item: {
        workspaceId: "openclaw",
        workspaceName: "openclaw",
        workspacePath,
        packagePath: path.join(workspacePath, "packages/plugin-sdk"),
      },
    }),
  });
}

test("plugin review manifest capability builders preserve metadata-only planning contracts", () => {
  const workspacePath = createManifestFixture();
  try {
    const builders = createManifestHarness(workspacePath);

    const profile = builders.buildNativePluginManifestProfile();
    const manifestMap = builders.buildOpenClawPluginManifestMap({ query: "search" });
    const capabilityPlan = builders.buildOpenClawPluginCapabilityPlan({ query: "search" });
    const contractTests = builders.buildOpenClawPluginCandidateContractTests({ query: "search" });

    assert.equal(profile.registry, "openclaw-native-plugin-adapter-v0");
    assert.equal(profile.plugin.packageName, "@openclaw/plugin-sdk");
    assert.equal(profile.governance.canReadSourceFileContent, false);
    assert.equal(manifestMap.registry, "openclaw-plugin-manifest-map-v0");
    assert.equal(manifestMap.summary.manifestCount, 1);
    assert.equal(manifestMap.manifests[0].category, "search_and_web");
    assert.equal(manifestMap.summary.exposesManifestBodies, false);
    assert.equal(manifestMap.summary.exposesAuthEnvVarNames, false);
    assert.equal(capabilityPlan.registry, "openclaw-plugin-capability-plan-v0");
    assert.equal(capabilityPlan.summary.candidateCount, 1);
    assert.equal(capabilityPlan.candidates[0].proposedCapability.approvalRequired, true);
    assert.equal(capabilityPlan.candidates[0].canActivateRuntime, false);
    assert.equal(contractTests.registry, "openclaw-plugin-candidate-contract-tests-v0");
    assert.equal(contractTests.ok, true);
    assert.equal(contractTests.summary.nativeAdapterContractTestsReady, true);
    assert.equal(contractTests.summary.createsTask, false);
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});
