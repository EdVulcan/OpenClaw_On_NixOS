import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createNativeEngineeringReadSearchBuilders,
  NATIVE_ENGINEERING_READ_SEARCH_REGISTRY,
} from "../src/native-engineering-read-search-builders.mjs";

function safeStat(filePath) {
  try {
    return statSync(filePath);
  } catch {
    return null;
  }
}

function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "openclaw-engineering-read-search-"));
  mkdirSync(path.join(root, "src", "nested"), { recursive: true });
  mkdirSync(path.join(root, "node_modules", "pkg"), { recursive: true });
  mkdirSync(path.join(root, ".cache"), { recursive: true });
  mkdirSync(path.join(root, "generated"), { recursive: true });
  mkdirSync(path.join(root, ".git"), { recursive: true });
  mkdirSync(path.join(root, ".openclaw"), { recursive: true });
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "openclaw-read-search-fixture" }, null, 2));
  writeFileSync(
    path.join(root, "src", "app.ts"),
    [
      "export const first = 'safe';",
      "export const needle = 'OpenClawNeedle';",
      "export const second = 'OpenClawNeedle again';",
      "export const done = true;",
    ].join("\n"),
  );
  writeFileSync(path.join(root, "src", "nested", "search-target.ts"), "export const nested = 'OpenClawNeedle nested';\n");
  writeFileSync(path.join(root, "src", "large.txt"), "x".repeat(2048));
  writeFileSync(path.join(root, "src", "binary.bin"), Buffer.from([0x41, 0x00, 0x42]));
  writeFileSync(path.join(root, "node_modules", "pkg", "leak.ts"), "OpenClawNeedle node_modules leak\n");
  writeFileSync(path.join(root, ".cache", "leak.ts"), "OpenClawNeedle cache leak\n");
  writeFileSync(path.join(root, "generated", "leak.ts"), "OpenClawNeedle generated leak\n");
  return root;
}

function createHarness(root) {
  return createNativeEngineeringReadSearchBuilders({
    safeStat,
    selectOpenClawToolCatalogWorkspace: () => ({
      registry: {
        registry: "openclaw-source-workspace-v0",
      },
      item: {
        id: "fixture",
        name: "Read Search Fixture",
        path: root,
      },
    }),
  });
}

test("native engineering read/search reads bounded workspace file content", (t) => {
  const root = createFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const builders = createHarness(root);

  const read = builders.buildNativeEngineeringReadFile({
    relativePath: "src/app.ts",
    startLine: 2,
    endLine: 3,
    maxOutputChars: 1000,
  });

  assert.equal(read.ok, true);
  assert.equal(read.registry, NATIVE_ENGINEERING_READ_SEARCH_REGISTRY);
  assert.equal(read.operation, "read");
  assert.equal(read.capability.id, "sense.openclaw.engineering_tool.read");
  assert.equal(read.summary.lineCount, 2);
  assert.match(read.content, /OpenClawNeedle/u);
  assert.equal(read.lines[0].lineNumber, 2);
  assert.equal(read.governance.canReadArbitrarySystemPath, false);
  assert.equal(read.governance.canMutate, false);
  assert.equal(read.governance.canExecuteToolCode, false);
  assert.equal(read.auditEvidence.operation, "read");
});

test("native engineering read/search rejects traversal and skipped directories", (t) => {
  const root = createFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const builders = createHarness(root);

  assert.throws(
    () => builders.buildNativeEngineeringReadFile({ relativePath: "../package.json" }),
    /workspace/i,
  );
  assert.throws(
    () => builders.buildNativeEngineeringReadFile({ relativePath: ".cache/leak.ts" }),
    /hidden\/generated\/cache/i,
  );
});

test("native engineering read/search blocks large and binary files", (t) => {
  const root = createFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const builders = createHarness(root);

  const large = builders.buildNativeEngineeringReadFile({
    relativePath: "src/large.txt",
    maxFileSizeBytes: 256,
  });
  assert.equal(large.ok, false);
  assert.equal(large.blocked, true);
  assert.equal(large.target.blockedReason, "max_file_size_exceeded");
  assert.equal(large.content, "");

  const binary = builders.buildNativeEngineeringReadFile({
    relativePath: "src/binary.bin",
  });
  assert.equal(binary.ok, false);
  assert.equal(binary.target.blockedReason, "binary_file_skipped");
});

test("native engineering read/search performs bounded glob and grep", (t) => {
  const root = createFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const builders = createHarness(root);

  const glob = builders.buildNativeEngineeringGlob({
    pattern: "src/**/*.ts",
    limit: 1,
  });
  assert.equal(glob.ok, true);
  assert.equal(glob.operation, "glob");
  assert.equal(glob.matches.length, 1);
  assert.equal(glob.summary.resultsTruncated, true);
  assert.equal(glob.matches.some((entry) => entry.relativePath.includes("node_modules")), false);
  assert.equal(glob.governance.canMutate, false);

  const grep = builders.buildNativeEngineeringGrep({
    query: "OpenClawNeedle",
    include: "src/**/*.ts",
    literal: true,
    limit: 2,
    maxOutputChars: 80,
  });
  const raw = JSON.stringify(grep);
  assert.equal(grep.ok, true);
  assert.equal(grep.operation, "grep");
  assert.equal(grep.matches.length, 2);
  assert.equal(grep.summary.resultsTruncated, true);
  assert.equal(grep.summary.binaryFilesSkipped, 0);
  assert.equal(grep.governance.canReadWorkspaceContent, true);
  assert.equal(grep.governance.createsTask, false);
  assert.equal(raw.includes("node_modules leak"), false);
  assert.equal(raw.includes("cache leak"), false);
  assert.equal(raw.includes("generated leak"), false);
});
