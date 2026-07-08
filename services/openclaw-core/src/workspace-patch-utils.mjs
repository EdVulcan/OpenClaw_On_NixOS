export function countOccurrences(text, search) {
  if (!search) {
    return 0;
  }
  let count = 0;
  let position = 0;
  while (position <= text.length) {
    const next = text.indexOf(search, position);
    if (next === -1) {
      break;
    }
    count += 1;
    position = next + search.length;
  }
  return count;
}

export function replaceNthOccurrence(text, search, replacement, occurrence = 1) {
  const safeOccurrence = Number.isInteger(occurrence) && occurrence > 0 ? occurrence : 1;
  let seen = 0;
  let position = 0;
  while (position <= text.length) {
    const next = text.indexOf(search, position);
    if (next === -1) {
      return null;
    }
    seen += 1;
    if (seen === safeOccurrence) {
      return {
        text: `${text.slice(0, next)}${replacement}${text.slice(next + search.length)}`,
        index: next,
      };
    }
    position = next + search.length;
  }
  return null;
}

export function findNthOccurrenceRange(text, search, occurrence = 1) {
  const safeOccurrence = Number.isInteger(occurrence) && occurrence > 0 ? occurrence : 1;
  let seen = 0;
  let position = 0;
  while (position <= text.length) {
    const next = text.indexOf(search, position);
    if (next === -1) {
      return null;
    }
    seen += 1;
    if (seen === safeOccurrence) {
      return {
        start: next,
        end: next + search.length,
      };
    }
    position = next + search.length;
  }
  return null;
}

export function buildTextLineRanges(text) {
  const ranges = [];
  let line = 1;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\n") {
      ranges.push({ line, start, end: index + 1 });
      line += 1;
      start = index + 1;
    } else if (char === "\r") {
      const end = text[index + 1] === "\n" ? index + 2 : index + 1;
      ranges.push({ line, start, end });
      line += 1;
      start = end;
      if (end === index + 2) {
        index += 1;
      }
    }
  }
  if (start < text.length) {
    ranges.push({ line, start, end: text.length });
  }
  return ranges;
}

export function normaliseWorkspacePatchEdits({ edits = null, search = "", replacement = "", occurrence = 1 } = {}) {
  const rawEdits = Array.isArray(edits) && edits.length > 0
    ? edits
    : [{ search, replacement, occurrence }];
  if (rawEdits.length > 8) {
    throw new Error("OpenClaw workspace patch drafts are limited to 8 edit hunks.");
  }
  return rawEdits.map((edit, index) => {
    const kind = edit?.kind === "replace_lines" ? "replace_lines" : "replace_text";
    const safeReplacement = typeof edit?.replacement === "string"
      ? edit.replacement
      : Array.isArray(edit?.replacementLines)
        ? edit.replacementLines.map((line) => String(line)).join("\n")
        : "";
    if (Buffer.byteLength(safeReplacement, "utf8") > 16 * 1024) {
      throw new Error(`OpenClaw workspace patch edit ${index + 1} exceeds the per-hunk replacement size limit.`);
    }
    if (kind === "replace_lines") {
      const startLine = Number.isInteger(edit?.startLine) ? edit.startLine : null;
      const endLine = Number.isInteger(edit?.endLine) ? edit.endLine : startLine;
      if (!startLine || !endLine || startLine < 1 || endLine < startLine) {
        throw new Error(`valid startLine/endLine are required for OpenClaw workspace line edit ${index + 1}.`);
      }
      return {
        kind,
        startLine,
        endLine,
        replacement: safeReplacement,
      };
    }
    const safeSearch = typeof edit?.search === "string" ? edit.search : "";
    if (!safeSearch) {
      throw new Error(`search text is required for OpenClaw workspace patch edit ${index + 1}.`);
    }
    if (Buffer.byteLength(safeSearch, "utf8") > 16 * 1024) {
      throw new Error(`OpenClaw workspace patch edit ${index + 1} exceeds the per-hunk search size limit.`);
    }
    return {
      kind,
      search: safeSearch,
      replacement: safeReplacement,
      occurrence: Number.isInteger(edit?.occurrence) && edit.occurrence > 0 ? edit.occurrence : 1,
    };
  });
}

export function applyWorkspacePatchEdits(originalContent, edits) {
  const lineRanges = buildTextLineRanges(originalContent);
  const ranges = edits.map((edit, index) => {
    if (edit.kind === "replace_lines") {
      const startLine = lineRanges[edit.startLine - 1] ?? null;
      const endLine = lineRanges[edit.endLine - 1] ?? null;
      if (!startLine || !endLine) {
        throw new Error(`OpenClaw workspace line edit ${index + 1} targets lines outside the file.`);
      }
      return {
        index: index + 1,
        kind: edit.kind,
        edit,
        replacementsAvailable: 1,
        start: startLine.start,
        end: endLine.end,
      };
    }
    const replacementsAvailable = countOccurrences(originalContent, edit.search);
    const range = findNthOccurrenceRange(originalContent, edit.search, edit.occurrence);
    if (!range) {
      throw new Error(`OpenClaw workspace patch search text was not found for edit ${index + 1}.`);
    }
    return {
      index: index + 1,
      kind: edit.kind,
      edit,
      replacementsAvailable,
      ...range,
    };
  });
  const sortedRanges = [...ranges].sort((left, right) => left.start - right.start || left.end - right.end);
  for (let index = 1; index < sortedRanges.length; index += 1) {
    const previous = sortedRanges[index - 1];
    const current = sortedRanges[index];
    if (current.start < previous.end) {
      throw new Error(`OpenClaw workspace patch edit ${current.index} overlaps edit ${previous.index}; overlapping hunks are not allowed.`);
    }
  }

  let cursor = 0;
  let nextContent = "";
  for (const range of sortedRanges) {
    nextContent += originalContent.slice(cursor, range.start);
    nextContent += range.edit.replacement;
    cursor = range.end;
  }
  nextContent += originalContent.slice(cursor);

  const appliedEdits = ranges.map((range) => {
    const singleEditContent = `${originalContent.slice(0, range.start)}${range.edit.replacement}${originalContent.slice(range.end)}`;
    return {
      index: range.index,
      kind: range.kind,
      occurrence: range.edit.occurrence,
      startLine: range.edit.startLine ?? null,
      endLine: range.edit.endLine ?? null,
      originalStart: range.start,
      originalEnd: range.end,
      searchBytes: Buffer.byteLength(range.edit.search ?? originalContent.slice(range.start, range.end), "utf8"),
      replacementsAvailable: range.replacementsAvailable,
      replacementBytes: Buffer.byteLength(range.edit.replacement, "utf8"),
      changedAtLine: lineNumberForIndex(originalContent, range.start),
      beforeText: originalContent,
      afterText: singleEditContent,
    };
  });

  return {
    nextContent,
    appliedEdits,
    validation: {
      ok: true,
      engine: "openclaw-native-workspace-patch-validation-v0",
      editCount: edits.length,
      checks: {
        allMatchesFound: true,
        originalRangesResolved: true,
        structuredLineRangesResolved: true,
        overlappingEditsRejected: true,
        appliesAgainstOriginalContent: true,
      },
      ranges: appliedEdits.map((edit) => ({
        index: edit.index,
        kind: edit.kind,
        start: edit.originalStart,
        end: edit.originalEnd,
        occurrence: edit.occurrence,
        startLine: edit.startLine,
        endLine: edit.endLine,
        changedAtLine: edit.changedAtLine,
      })),
    },
  };
}

export function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

export function sanitiseDiffLine(line) {
  const text = typeof line === "string" ? line : "";
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

export function buildDiffPreview(oldText, newText, { contextLines = 1, maxPreviewLines = 40 } = {}) {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < oldLines.length - prefix
    && suffix < newLines.length - prefix
    && oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const oldChangedEnd = oldLines.length - suffix;
  const newChangedEnd = newLines.length - suffix;
  const safeContext = Math.max(0, Math.min(Number.isInteger(contextLines) ? contextLines : 1, 3));
  const oldStart = Math.max(0, prefix - safeContext);
  const newStart = Math.max(0, prefix - safeContext);
  const oldEnd = Math.min(oldLines.length, oldChangedEnd + safeContext);
  const newEnd = Math.min(newLines.length, newChangedEnd + safeContext);
  const lines = [];

  for (let index = oldStart; index < prefix; index += 1) {
    lines.push({ type: "context", oldLine: index + 1, newLine: newStart + (index - oldStart) + 1, text: sanitiseDiffLine(oldLines[index]) });
  }
  for (let index = prefix; index < oldChangedEnd; index += 1) {
    lines.push({ type: "remove", oldLine: index + 1, text: sanitiseDiffLine(oldLines[index]) });
  }
  for (let index = prefix; index < newChangedEnd; index += 1) {
    lines.push({ type: "add", newLine: index + 1, text: sanitiseDiffLine(newLines[index]) });
  }
  for (let oldIndex = oldChangedEnd, newIndex = newChangedEnd; oldIndex < oldEnd && newIndex < newEnd; oldIndex += 1, newIndex += 1) {
    lines.push({ type: "context", oldLine: oldIndex + 1, newLine: newIndex + 1, text: sanitiseDiffLine(oldLines[oldIndex]) });
  }

  return {
    format: "bounded-line-diff-v0",
    oldStartLine: oldStart + 1,
    newStartLine: newStart + 1,
    oldLineCount: Math.max(0, oldChangedEnd - prefix),
    newLineCount: Math.max(0, newChangedEnd - prefix),
    contextLines: safeContext,
    previewLineCount: Math.min(lines.length, maxPreviewLines),
    truncated: lines.length > maxPreviewLines,
    lines: lines.slice(0, maxPreviewLines),
  };
}

export function buildWorkspacePatchDiffPreview(originalContent, nextContent, appliedEdits, { contextLines = 1 } = {}) {
  if (appliedEdits.length <= 1) {
    return buildDiffPreview(originalContent, nextContent, { contextLines, maxPreviewLines: 40 });
  }

  const hunks = appliedEdits.map((edit) => ({
    editIndex: edit.index,
    ...buildDiffPreview(edit.beforeText, edit.afterText, { contextLines, maxPreviewLines: 16 }),
  }));
  const lines = hunks.flatMap((hunk) => hunk.lines.map((line) => ({
    ...line,
    hunk: hunk.editIndex,
  })));

  return {
    format: "bounded-multi-hunk-line-diff-v0",
    hunkCount: hunks.length,
    contextLines: hunks[0]?.contextLines ?? 0,
    previewLineCount: lines.length,
    truncated: hunks.some((hunk) => hunk.truncated),
    hunks,
    lines,
  };
}

export function validateWorkspacePatchDiffPreview(diffPreview, { maxPreviewLines = 64 } = {}) {
  if (diffPreview.truncated) {
    throw new Error("OpenClaw workspace patch diff preview exceeds the bounded per-hunk preview limit.");
  }
  if ((diffPreview.previewLineCount ?? 0) > maxPreviewLines) {
    throw new Error("OpenClaw workspace patch diff preview exceeds the bounded total preview limit.");
  }
  return {
    ok: true,
    engine: "openclaw-native-workspace-patch-preview-validation-v0",
    format: diffPreview.format,
    previewLineCount: diffPreview.previewLineCount ?? 0,
    maxPreviewLines,
    truncated: false,
  };
}
