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

import { createPluginReviewSourceCommandProposals } from "../src/plugin-review-source-command-proposals.mjs";
import { createPluginReviewSourceMigration } from "../src/plugin-review-source-migration.mjs";
import { createPluginReviewWorkspaceDiscovery } from "../src/plugin-review-workspace-discovery.mjs";

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

function createWorkspaceFixture() {
  const rootPath = mkdtempSync(path.join(os.tmpdir(), "openclaw-plugin-review-"));
  for (const relativePath of [
    "apps",
    "docs",
    "extensions",
    "packages/plugin-sdk",
    "packages/memory-host-sdk",
    "qa",
    "src",
    "ui",
  ]) {
    mkdirSync(path.join(rootPath, relativePath), { recursive: true });
  }
  writeJson(path.join(rootPath, "package.json"), {
    name: "openclaw",
    private: true,
    version: "1.2.3",
    scripts: {
      custom: "node custom.mjs",
      dev: "vite",
      build: "vite build",
      typecheck: "tsc --noEmit",
    },
  });
  writeJson(path.join(rootPath, "ui", "package.json"), {
    name: "openclaw-ui",
  });
  writeFileSync(path.join(rootPath, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - packages/*\n");
  return rootPath;
}

test("plugin review workspace discovery detects workspaces and read-only source profiles", () => {
  const workspacePath = createWorkspaceFixture();
  const missingPath = path.join(workspacePath, "..", "missing-workspace");
  try {
    const discovery = createPluginReviewWorkspaceDiscovery({
      workspaceRoots: [workspacePath, missingPath],
      readJsonFileIfPresent,
    });

    const registry = discovery.buildWorkspaceRegistry();
    const workspace = registry.items.find((item) => item.path === workspacePath);

    assert.equal(discovery.detectWorkspacePackageManager(workspacePath), "pnpm");
    assert.equal(registry.registry, "workspace-detect-v0");
    assert.equal(registry.count, 2);
    assert.equal(registry.summary.detected, 1);
    assert.equal(registry.summary.missing, 1);
    assert.equal(workspace.kind, "node_workspace");
    assert.equal(workspace.openclawProfile.profile, "openclaw-source-workspace-v0");
    assert.equal(workspace.openclawProfile.hasPluginSdk, true);
    assert.equal(workspace.openclawProfile.hasMemoryHostSdk, true);
    assert.equal(workspace.openclawProfile.governance.canMutate, false);
    assert.deepEqual(workspace.workspaces, ["apps/*", "packages/*"]);
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

test("plugin review workspace discovery builds command proposals and migration plans without execution", () => {
  const workspacePath = createWorkspaceFixture();
  try {
    const discovery = createPluginReviewWorkspaceDiscovery({
      workspaceRoots: [workspacePath],
      readJsonFileIfPresent,
    });
    const migration = createPluginReviewSourceMigration({
      buildWorkspaceRegistry: discovery.buildWorkspaceRegistry,
    });

    const proposals = discovery.buildWorkspaceCommandProposals();
    const migrationMap = migration.buildOpenClawMigrationMap();
    const migrationPlan = migration.buildOpenClawMigrationPlan();

    assert.equal(proposals.registry, "workspace-command-proposals-v0");
    assert.deepEqual(proposals.items.map((item) => item.scriptName), [
      "typecheck",
      "build",
      "dev",
      "custom",
    ]);
    assert.equal(proposals.items[0].command, "pnpm");
    assert.equal(proposals.items[0].governance.canExecute, false);
    assert.equal(proposals.items[2].risk, "medium");
    assert.equal(migrationMap.registry, "openclaw-source-migration-map-v0");
    assert.equal(migrationMap.items.some((item) => item.capability === "plugin_sdk"), true);
    assert.equal(migrationMap.summary.governance.canReadFileContent, false);
    assert.equal(migrationPlan.registry, "openclaw-source-migration-plan-v0");
    assert.equal(migrationPlan.items.some((item) => item.capability === "plugin_sdk"), true);
    assert.equal(migrationPlan.summary.governance.canExecute, false);
    assert.equal(discovery.truncatePatchMetadata("x".repeat(300)).length, 240);
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

test("plugin review source command proposals compose workspace, tool, and prompt signals", () => {
  const sourceCommands = createPluginReviewSourceCommandProposals({
    buildWorkspaceCommandProposals: () => ({
      registry: "workspace-command-proposals-v0",
      workspaceRegistry: "workspace-detect-v0",
      roots: ["/tmp/openclaw"],
      summary: {
        byCategory: {
          validation: 1,
        },
      },
      items: [
        {
          id: "openclaw:typecheck",
          workspaceId: "openclaw",
          workspaceName: "openclaw",
          workspacePath: "/tmp/openclaw",
          scriptName: "typecheck",
          category: "validation",
          packageManager: "pnpm",
          command: "pnpm",
          args: ["run", "typecheck"],
          governance: {
            canExecute: false,
          },
        },
      ],
    }),
    buildNativeOpenClawToolCatalogProfile: () => ({
      registry: "openclaw-native-tool-catalog-profile-v0",
      summary: {
        matchedTools: 2,
        matchedDocumentation: 1,
      },
      categories: ["scripts"],
      tools: [
        {
          relativePath: "scripts/typecheck.mjs",
          category: "scripts",
        },
      ],
    }),
    buildNativeOpenClawPromptSemanticsProfile: () => ({
      registry: "openclaw-native-prompt-semantics-profile-v0",
      summary: {
        totalFiles: 1,
      },
      derivedPlanSemantics: {
        promptTermCounts: {
          command: 2,
          safety: 1,
        },
      },
      files: [
        {
          signals: {
            semanticTermCounts: {
              command: 1,
              shell: 1,
            },
          },
        },
      ],
    }),
    normalisePositiveLimit: (value, fallback, max) => Math.min(Number(value) || fallback, max),
    truncatePatchMetadata: (value, maxLength = 240) => String(value).slice(0, maxLength),
  });

  const proposals = sourceCommands.buildOpenClawSourceCommandProposals({
    workspacePath: "/tmp/openclaw",
    query: "run validation safely",
    limit: 50,
  });

  assert.equal(proposals.registry, "openclaw-source-command-proposals-v0");
  assert.equal(proposals.query.limit, 40);
  assert.equal(proposals.summary.matchedTools, 2);
  assert.equal(proposals.summary.promptSemanticFiles, 1);
  assert.equal(proposals.summary.canExecute, false);
  assert.equal(proposals.items[0].sourceCommand.absorbedFromEnhancedOpenClaw, true);
  assert.equal(proposals.items[0].governance.exposesPromptContent, false);
});
