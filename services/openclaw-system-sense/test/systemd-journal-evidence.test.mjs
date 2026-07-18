import test from "node:test";
import assert from "node:assert/strict";

import {
  createSystemdJournalEvidence,
  JOURNAL_EVIDENCE_REGISTRY,
} from "../src/systemd-journal-evidence.mjs";

const allowedUnits = [
  "openclaw-core.service",
  "openclaw-system-sense.service",
];

test("journal evidence binds the unit and line budget to a fixed read-only command", async () => {
  let invocation = null;
  const { buildSystemdJournalEvidence } = createSystemdJournalEvidence({
    allowedUnits,
    journalctlPath: "/nix/systemd/bin/journalctl",
    maxLines: 10,
    execFileAsync: async (command, args, options) => {
      invocation = { command, args, options };
      return {
        stdout: [
          JSON.stringify({
            __REALTIME_TIMESTAMP: "1784250210749564",
            _SYSTEMD_UNIT: "openclaw-core.service",
            SYSLOG_IDENTIFIER: "openclaw-core",
            PRIORITY: "3",
            _PID: "42",
            MESSAGE: "provider token=sk-secret-value password=hunter2",
          }),
          JSON.stringify({
            _SYSTEMD_UNIT: "other.service",
            MESSAGE: "must be filtered",
          }),
          "not-json",
        ].join("\n"),
      };
    },
  });

  const evidence = await buildSystemdJournalEvidence({
    unit: "openclaw-core.service",
    lines: 7,
  });

  assert.equal(evidence.ok, true);
  assert.equal(evidence.registry, JOURNAL_EVIDENCE_REGISTRY);
  assert.equal(evidence.available, true);
  assert.deepEqual(invocation.args, [
    "--no-pager",
    "--quiet",
    "--output=json",
    "--reverse",
    "--lines",
    "7",
    "--unit",
    "openclaw-core.service",
  ]);
  assert.equal(invocation.options.timeout, 2500);
  assert.equal(invocation.options.maxBuffer, 256 * 1024);
  assert.equal(evidence.summary.returned, 1);
  assert.equal(evidence.summary.parseErrors, 1);
  assert.equal(evidence.entries[0].unit, "openclaw-core.service");
  assert.match(evidence.entries[0].message, /token=\[REDACTED\]/u);
  assert.match(evidence.entries[0].message, /password=\[REDACTED\]/u);
  assert.doesNotMatch(evidence.entries[0].message, /sk-secret-value|hunter2/u);
  assert.equal(evidence.governance.hostMutation, false);
  assert.equal(evidence.governance.canMutate, false);
  assert.equal(evidence.governance.commandArgsBound, true);
});

test("journal evidence rejects non-OpenClaw and user-manager units", async () => {
  const { buildSystemdJournalEvidence } = createSystemdJournalEvidence({ allowedUnits });

  await assert.rejects(
    () => buildSystemdJournalEvidence({ unit: "ssh.service", lines: 5 }),
    (error) => error?.code === "SYSTEMD_JOURNAL_UNIT_NOT_ALLOWED"
      && error.details.allowedUnits.includes("openclaw-core.service"),
  );
});

test("journal evidence reports a bounded unavailable read without exposing stderr", async () => {
  const { buildSystemdJournalEvidence } = createSystemdJournalEvidence({
    allowedUnits,
    execFileAsync: async () => {
      const error = new Error("journalctl: permission denied secret=do-not-return");
      error.code = "EACCES";
      error.stderr = "permission denied api_key=do-not-return";
      throw error;
    },
  });

  const evidence = await buildSystemdJournalEvidence({ unit: "openclaw-system-sense.service" });

  assert.equal(evidence.available, false);
  assert.equal(evidence.summary.returned, 0);
  assert.match(evidence.error.message, /api_key=\[REDACTED\]/u);
  assert.doesNotMatch(evidence.error.message, /do-not-return/u);
  assert.equal(evidence.governance.hostMutation, false);
});
