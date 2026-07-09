import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNativeAcpxCodexBridgeProcessSpawnProposal,
  createNativeAcpxCodexBridgeBuilders,
  NATIVE_ACPX_CODEX_BRIDGE_PROCESS_SPAWN_PROPOSAL_REGISTRY,
} from "../src/native-acpx-codex-bridge-builders.mjs";

function createHarness() {
  const events = [];
  let persistCount = 0;
  const state = {
    acpxBridgeSessionRecords: new Map(),
    MAX_ACPX_BRIDGE_SESSION_RECORDS: 100,
    persistState: () => {
      persistCount += 1;
    },
  };
  const builders = createNativeAcpxCodexBridgeBuilders({
    state,
    publishEvent: async (name, body) => {
      events.push({ name, body });
    },
  });
  return { builders, events, persistCount: () => persistCount };
}

test("native ACPX/Codex bridge compatibility reports credential and execution boundaries", () => {
  const { builders } = createHarness();

  const evidence = builders.buildNativeAcpxCodexBridgeCompatibility({
    sessionKey: "agent:codex:missing",
  });

  assert.equal(evidence.registry, "openclaw-native-acpx-codex-bridge-compatibility-v0");
  assert.equal(evidence.compatibility.posixCommand, "npx");
  assert.equal(evidence.compatibility.windowsCommandLesson, "npx.cmd");
  assert.equal(evidence.authIsolation.authJsonRead, false);
  assert.equal(evidence.authIsolation.credentialValueRead, false);
  assert.equal(evidence.governance.canPersistSessionMetadata, true);
  assert.equal(evidence.governance.canReadCredentialValue, false);
  assert.equal(evidence.governance.canWriteWrapper, false);
  assert.equal(evidence.governance.canSpawnCodexAcp, false);
  assert.equal(evidence.governance.observerVisible, true);
  assert.equal(evidence.governance.observerVisibilityDeferred, false);
  assert.equal(evidence.persistence.missingSessionReturnsNull, true);
  assert.equal(evidence.persistence.selectedRecord, null);
});

test("native ACPX/Codex session metadata persistence supports independent sessions and overwrite", async () => {
  const { builders, events, persistCount } = createHarness();

  await assert.rejects(
    () => builders.recordNativeAcpxCodexSession({ sessionKey: "agent:codex:one" }),
    /confirm=true/,
  );

  const first = await builders.recordNativeAcpxCodexSession({
    sessionKey: "agent:codex:one",
    recordId: "record-one",
    metadata: { purpose: "first", authToken: "must-not-leak" },
    confirm: true,
  });
  const second = await builders.recordNativeAcpxCodexSession({
    sessionKey: "agent:codex:two",
    recordId: "record-two",
    metadata: { purpose: "second" },
    confirm: true,
  });
  const overwritten = await builders.recordNativeAcpxCodexSession({
    sessionKey: "agent:codex:one",
    recordId: "record-one-updated",
    metadata: { purpose: "updated", secret: "still-not-leaked" },
    confirm: true,
  });
  const evidence = builders.buildNativeAcpxCodexBridgeCompatibility({
    sessionKey: "agent:codex:one",
  });

  assert.equal(first.summary.created, true);
  assert.equal(second.summary.created, true);
  assert.equal(overwritten.summary.overwritten, true);
  assert.equal(overwritten.session.revision, 2);
  assert.equal(overwritten.session.acpxRecordId, "record-one-updated");
  assert.equal(overwritten.session.metadata.secret, "[redacted-key]");
  assert.equal(evidence.persistence.totalRecords, 2);
  assert.equal(evidence.persistence.selectedRecord.acpxRecordId, "record-one-updated");
  assert.equal(evidence.persistence.supportsIndependentSessions, true);
  assert.equal(evidence.persistence.supportsOverwrite, true);
  assert.equal(persistCount(), 3);
  assert.equal(events.filter((event) => event.name === "acpx_codex.session_recorded").length, 3);
});

test("native ACPX/Codex wrapper draft depends on persisted session metadata without execution", async () => {
  const { builders } = createHarness();

  const blocked = builders.buildNativeAcpxCodexBridgeWrapperDraft({
    sessionKey: "agent:codex:missing",
  });
  assert.equal(blocked.registry, "openclaw-native-acpx-codex-bridge-wrapper-draft-v0");
  assert.equal(blocked.summary.readyForApprovalBridge, false);
  assert.equal(blocked.proposal.status, "blocked_missing_session_metadata");
  assert.equal(blocked.governance.createsTask, false);
  assert.equal(blocked.governance.createsApproval, false);
  assert.equal(blocked.governance.canWriteWrapper, false);
  assert.equal(blocked.governance.canSpawnCodexAcp, false);

  await builders.recordNativeAcpxCodexSession({
    sessionKey: "agent:codex:ready",
    recordId: "record-ready",
    metadata: { purpose: "wrapper-draft", credential: "must-not-leak" },
    confirm: true,
  });
  const draft = builders.buildNativeAcpxCodexBridgeWrapperDraft({
    sessionKey: "agent:codex:ready",
    command: "npx.cmd",
    wrapperName: "codex-acp-ready",
  });

  assert.equal(draft.summary.readyForApprovalBridge, true);
  assert.equal(draft.proposal.status, "ready_for_approval_bridge");
  assert.equal(draft.proposal.command.command, "npx.cmd");
  assert.equal(draft.proposal.command.commandExecuted, false);
  assert.equal(draft.proposal.wrapper.relativePath, ".openclaw/acpx/codex-bridge/codex-acp-ready.sh");
  assert.equal(draft.proposal.wrapper.wrapperWritten, false);
  assert.equal(draft.proposal.authIsolation.credentialValueRead, false);
  assert.equal(draft.proposal.session.selectedRecord.metadata.credential, "[redacted-key]");
  assert.equal(draft.governance.futureWrapperWriteRequiresApproval, true);
  assert.equal(draft.governance.futureProcessSpawnRequiresApproval, true);
});

test("native ACPX/Codex wrapper write proposal previews content without writing or reading auth", async () => {
  const { builders } = createHarness();

  const blocked = builders.buildNativeAcpxCodexBridgeWrapperWriteProposal({
    sessionKey: "agent:codex:missing",
  });
  assert.equal(blocked.registry, "openclaw-native-acpx-codex-bridge-wrapper-write-proposal-v0");
  assert.equal(blocked.summary.readyForWriteApproval, false);
  assert.equal(blocked.proposal.status, "blocked_missing_session_metadata");
  assert.equal(blocked.proposal.wrapper.wrapperWritten, false);
  assert.equal(blocked.proposal.writeBoundary.writeTaskCreated, false);
  assert.equal(blocked.governance.createsTask, false);
  assert.equal(blocked.governance.createsApproval, false);

  await builders.recordNativeAcpxCodexSession({
    sessionKey: "agent:codex:ready",
    recordId: "record-ready",
    metadata: { purpose: "wrapper-write", authToken: "must-not-leak" },
    confirm: true,
  });
  const proposal = builders.buildNativeAcpxCodexBridgeWrapperWriteProposal({
    sessionKey: "agent:codex:ready",
    command: "npx.cmd",
    wrapperName: "codex-acp-ready",
  });
  const raw = JSON.stringify(proposal);

  assert.equal(proposal.summary.readyForWriteApproval, true);
  assert.equal(proposal.proposal.status, "ready_for_write_approval");
  assert.equal(proposal.proposal.wrapper.relativePath, ".openclaw/acpx/codex-bridge/codex-acp-ready.sh");
  assert.match(proposal.proposal.wrapper.contentHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(proposal.proposal.wrapper.contentPreview, /^#!\/usr\/bin\/env node/);
  assert.match(proposal.proposal.wrapper.contentPreview, /__OPENCLAW_APPROVED_CODEX_HOME__/);
  assert.match(proposal.proposal.wrapper.contentPreview, /@zed-industries\/codex-acp@\^0\.11\.1/);
  assert.equal(proposal.proposal.authIsolation.credentialValueRead, false);
  assert.equal(proposal.proposal.authIsolation.authMaterialCopied, false);
  assert.equal(proposal.proposal.wrapper.wrapperWritten, false);
  assert.equal(proposal.proposal.wrapper.directoryCreated, false);
  assert.equal(proposal.proposal.wrapper.chmodApplied, false);
  assert.equal(proposal.proposal.command.commandExecuted, false);
  assert.equal(proposal.proposal.command.processSpawned, false);
  assert.equal(proposal.proposal.writeBoundary.futureWriteCapabilityId, "act.openclaw.workspace_text_write");
  assert.equal(proposal.governance.canWriteWrapper, false);
  assert.equal(proposal.governance.futureWrapperWriteUsesWorkspaceTextWrite, true);
  assert.equal(raw.includes("must-not-leak"), false);
});

test("native ACPX/Codex process spawn proposal requires approved wrapper write evidence", () => {
  const blocked = buildNativeAcpxCodexBridgeProcessSpawnProposal({
    wrapperWriteExecutionEvidence: {
      registry: "openclaw-native-acpx-codex-wrapper-write-execution-evidence-v0",
      evidence: [],
      recoveryRecommendation: { needed: false, status: "not_needed", createsTask: false },
    },
  });
  assert.equal(blocked.registry, NATIVE_ACPX_CODEX_BRIDGE_PROCESS_SPAWN_PROPOSAL_REGISTRY);
  assert.equal(blocked.proposal.status, "blocked_missing_approved_wrapper_write_evidence");
  assert.equal(blocked.summary.readyForSpawnApprovalDesign, false);
  assert.equal(blocked.recoveryRecommendation.needed, true);
  assert.equal(blocked.governance.createsTask, false);
  assert.equal(blocked.governance.canSpawnCodexAcp, false);

  const ready = buildNativeAcpxCodexBridgeProcessSpawnProposal({
    taskId: "task-acpx-write",
    wrapperWriteExecutionEvidence: {
      registry: "openclaw-native-acpx-codex-wrapper-write-execution-evidence-v0",
      recoveryRecommendation: { needed: false, status: "not_needed", createsTask: false },
      evidence: [{
        taskId: "task-acpx-write",
        invocationId: "write-1",
        validation: { ok: true },
        wrapper: {
          registry: "openclaw-native-acpx-codex-bridge-wrapper-write-task-v0",
          target: {
            relativePath: ".openclaw/acpx/codex-bridge/codex-acp-test.sh",
            contentHash: "sha256:abc123",
            contentPreviewBytes: 123,
            contentPreviewExposed: false,
            chmodApplied: false,
          },
        },
      }],
    },
  });

  assert.equal(ready.proposal.status, "ready_for_spawn_approval_design");
  assert.equal(ready.summary.readyForSpawnApprovalDesign, true);
  assert.equal(ready.proposal.commandContract.futureCapabilityId, "act.system.command.execute");
  assert.equal(ready.proposal.commandContract.commandExecuted, false);
  assert.equal(ready.proposal.commandContract.processSpawned, false);
  assert.equal(ready.proposal.commandContract.argsExposed, false);
  assert.equal(ready.proposal.wrapper.contentPreviewExposed, false);
  assert.equal(ready.governance.canExecuteWrapper, false);
  assert.equal(ready.governance.canSpawnCodexAcp, false);
  assert.equal(JSON.stringify(ready).includes("@zed-industries/codex-acp"), false);
});

test("native ACPX/Codex session metadata rejects traversal-like keys", async () => {
  const { builders } = createHarness();

  await assert.rejects(
    () => builders.recordNativeAcpxCodexSession({
      sessionKey: "../codex",
      confirm: true,
    }),
    /sessionKey/,
  );
  assert.throws(
    () => builders.buildNativeAcpxCodexBridgeWrapperDraft({
      sessionKey: "agent:codex:one",
      wrapperName: "../codex-acp",
    }),
    /wrapperName/,
  );
  assert.throws(
    () => builders.buildNativeAcpxCodexBridgeWrapperWriteProposal({
      sessionKey: "agent:codex:one",
      wrapperName: "../codex-acp",
    }),
    /wrapperName/,
  );
});
