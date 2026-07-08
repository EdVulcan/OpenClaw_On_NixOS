import test from "node:test";
import assert from "node:assert/strict";

import {
  applyWorkspacePatchEdits,
  buildWorkspacePatchDiffPreview,
  normaliseWorkspacePatchEdits,
  validateWorkspacePatchDiffPreview,
} from "../src/workspace-patch-utils.mjs";

test("workspace patch utils apply bounded text replacements", () => {
  const edits = normaliseWorkspacePatchEdits({
    edits: [
      { search: "alpha", replacement: "ALPHA" },
      { search: "gamma", replacement: "GAMMA" },
    ],
  });
  const result = applyWorkspacePatchEdits("alpha\nbeta\ngamma\n", edits);

  assert.equal(result.nextContent, "ALPHA\nbeta\nGAMMA\n");
  assert.equal(result.validation.ok, true);
  assert.deepEqual(result.appliedEdits.map((edit) => edit.changedAtLine), [1, 3]);
});

test("workspace patch utils apply line replacements without exposing content in validation", () => {
  const edits = normaliseWorkspacePatchEdits({
    edits: [{ kind: "replace_lines", startLine: 2, endLine: 3, replacement: "TWO\nTHREE\n" }],
  });
  const result = applyWorkspacePatchEdits("one\ntwo\nthree\nfour\n", edits);

  assert.equal(result.nextContent, "one\nTWO\nTHREE\nfour\n");
  assert.deepEqual(result.validation.ranges, [{
    index: 1,
    kind: "replace_lines",
    start: 4,
    end: 14,
    occurrence: undefined,
    startLine: 2,
    endLine: 3,
    changedAtLine: 2,
  }]);
});

test("workspace patch utils reject overlapping edits", () => {
  const edits = normaliseWorkspacePatchEdits({
    edits: [
      { search: "alpha beta", replacement: "first" },
      { search: "beta gamma", replacement: "second" },
    ],
  });

  assert.throws(
    () => applyWorkspacePatchEdits("alpha beta gamma", edits),
    /overlaps edit/,
  );
});

test("workspace patch utils build bounded multi-hunk diff previews", () => {
  const edits = normaliseWorkspacePatchEdits({
    edits: [
      { search: "alpha", replacement: "ALPHA" },
      { search: "gamma", replacement: "GAMMA" },
    ],
  });
  const result = applyWorkspacePatchEdits("alpha\nbeta\ngamma\n", edits);
  const preview = buildWorkspacePatchDiffPreview("alpha\nbeta\ngamma\n", result.nextContent, result.appliedEdits);
  const validation = validateWorkspacePatchDiffPreview(preview);

  assert.equal(preview.format, "bounded-multi-hunk-line-diff-v0");
  assert.equal(preview.hunkCount, 2);
  assert.equal(validation.ok, true);
  assert.equal(validation.truncated, false);
});
