import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  buildSystemdIncidentObservationProviderContext,
  buildSystemdIncidentProviderContext,
  materialiseStoredSystemdIncidentProviderExecution,
  materialiseSystemdIncidentProviderHandoff,
} from "../src/systemd-incident-provider-context.mjs";
import {
  createSystemdIncidentObservationTaskFixture,
  createSystemdIncidentRepairTask,
} from "./systemd-incident-fixture.mjs";

function rehashReceipt(receipt) {
  const { receiptHash: _receiptHash, ...content } = receipt;
  receipt.receiptHash = `sha256:${createHash("sha256").update(JSON.stringify(content)).digest("hex")}`;
}

function experienceRecord(sourceReceiptHash, overrides = {}) {
  return {
    incidentPattern: {
      registry: "openclaw-systemd-incident-experience-v0",
      targetUnit: "openclaw-event-hub.service",
      sourceReceiptHash,
      restoredHealthy: false,
      preHealthy: false,
      postHealthy: false,
      journalAvailable: true,
      journalEntries: 2,
      restartCommandSucceeded: true,
      nativeMutationObserved: true,
      journalMessagesIncluded: false,
      providerOutputIncluded: false,
      ...overrides,
    },
    lesson: "This text must not enter the provider request.",
  };
}

function experienceReader(records) {
  return () => ({ records });
}

test("systemd incident provider context projects only bounded receipt evidence", () => {
  const sourceTask = createSystemdIncidentRepairTask();
  const currentReceiptHash = sourceTask.outcome.details.incidentReceipt.receiptHash;
  const priorReceiptHash = `sha256:${"a".repeat(64)}`;
  const context = buildSystemdIncidentProviderContext({
    sourceTask,
    buildExperienceMemoryReadModel: experienceReader([
      experienceRecord(currentReceiptHash),
      experienceRecord(priorReceiptHash),
      experienceRecord(`sha256:${"c".repeat(64)}`, { restoredHealthy: true, postHealthy: true }),
      experienceRecord(`sha256:${"d".repeat(64)}`),
      experienceRecord(`sha256:${"e".repeat(64)}`, { restoredHealthy: true, postHealthy: true }),
      experienceRecord(`sha256:${"b".repeat(64)}`, { targetUnit: "openclaw-system-sense.service" }),
      experienceRecord("not-a-receipt-hash"),
    ]),
  });

  assert.equal(context.ok, true, context.reason);
  assert.equal(context.projection.target.unit, "openclaw-event-hub.service");
  assert.equal(context.projection.target.healthServiceKey, "eventHub");
  assert.equal(context.projection.journalEvidence.returned, 3);
  assert.equal(context.projection.journalEvidence.messagesIncluded, false);
  assert.equal(context.projection.restoredHealthy, false);
  assert.equal(context.projection.operatorRecoveryRecommended, true);
  assert.equal(context.projection.priorIncidentExperience.matchedPatterns, 3);
  assert.equal(context.projection.priorIncidentExperience.restoredPatterns, 1);
  assert.equal(context.projection.priorIncidentExperience.recoveryRequiredPatterns, 2);
  assert.equal(context.projection.priorIncidentExperience.patterns[0].sourceReceiptHash, priorReceiptHash);
  assert.equal(context.evidence.systemdIncidentExperiencePatterns, 3);
  assert.equal(context.evidence.systemdIncidentExperienceRecoveryRequiredPatterns, 2);
  assert.equal(context.evidence.systemdIncidentContextIncluded, true);
  assert.equal(context.evidence.contextContentIncluded, false);
  assert.match(context.contextContentHash, /^[a-f0-9]{64}$/u);
  assert.match(context.requestEnvelope.messages[0].content, /engineering_recommendation_v0|Return only a JSON object/u);
  assert.match(context.requestEnvelope.messages[0].content, /review_systemd_incident_evidence/u);
  const serialized = JSON.stringify({ projection: context.projection, evidence: context.evidence });
  assert.doesNotMatch(serialized, /private-health|private diagnostic|hostd-private-invocation/u);
  assert.doesNotMatch(serialized, /job\/72|kernel_so_peercred/u);
  assert.doesNotMatch(context.requestEnvelope.messages[0].content, /This text must not enter/u);
});

test("incident handoff materializes and later reconstructs one deterministic approved request", () => {
  const sourceTask = createSystemdIncidentRepairTask();
  const tasks = new Map([[sourceTask.id, sourceTask]]);
  const buildExperienceMemoryReadModel = experienceReader([
    experienceRecord(`sha256:${"c".repeat(64)}`, { restoredHealthy: true, postHealthy: true }),
  ]);
  const handoff = materialiseSystemdIncidentProviderHandoff({
    tasks,
    buildExperienceMemoryReadModel,
    liveProviderExecution: {
      requested: true,
      credentialReference: "openclaw://credential/deepseek-api-key",
      responseContract: "engineering_recommendation_v0",
      contextPacket: {
        requested: true,
        sourceTaskId: sourceTask.id,
        includeSystemdIncidentReceipt: true,
      },
    },
  });
  assert.equal(handoff.ok, true, handoff.reason);
  assert.equal(handoff.liveProviderExecution.requestEnvelope.messages.length, 1);
  assert.equal(handoff.liveProviderExecution.contextContentHash, handoff.evidence.contextContentHash);

  const handoffTask = {
    id: "provider-incident-task-1",
    cloudConsciousnessLiveProviderEgressExecution: {
      systemdIncidentContext: handoff.incidentContext,
      incidentContextContentHash: handoff.evidence.contextContentHash,
    },
  };
  tasks.set(handoffTask.id, handoffTask);
  const execution = materialiseStoredSystemdIncidentProviderExecution({
    handoffTask,
    tasks,
    buildExperienceMemoryReadModel,
  });

  assert.equal(execution.handled, true);
  assert.equal(execution.ok, true, execution.reason);
  assert.equal(execution.liveProviderExecution.taskId, handoffTask.id);
  assert.equal(execution.liveProviderExecution.contextPacket.sourceTaskId, sourceTask.id);
  assert.equal(execution.liveProviderExecution.authorization.liveProviderCallEnabled, true);
  assert.equal(
    execution.liveProviderExecution.requestEnvelope.messages[0].content,
    handoff.liveProviderExecution.requestEnvelope.messages[0].content,
  );
  assert.equal(execution.evidence.executionTaskId, handoffTask.id);
  assert.equal(execution.evidence.systemdIncidentExperiencePatterns, 1);
});

test("reviewed observation context binds the compact receipt into one deterministic request", async () => {
  const { sourceTask, providerTask, tasks } = await createSystemdIncidentObservationTaskFixture();
  const receipt = providerTask.cloudConsciousnessLiveProviderEgressExecution
    .systemdIncidentObservationReceipt;
  const context = buildSystemdIncidentObservationProviderContext({ providerTask, tasks });

  assert.equal(context.ok, true, context.reason);
  assert.equal(context.projection.sourceTaskId, providerTask.id);
  assert.equal(context.projection.sourceObservationReceiptHash, receipt.receiptHash);
  assert.equal(context.projection.incident.sourceTaskId, sourceTask.id);
  assert.equal(
    context.projection.incident.sourceReceiptHash,
    sourceTask.outcome.details.incidentReceipt.receiptHash,
  );
  assert.equal(context.projection.target.unit, "openclaw-event-hub.service");
  assert.equal(context.projection.observation.health.serviceHealthy, true);
  assert.equal(context.projection.observation.health.unitRunning, true);
  assert.equal(context.projection.observation.journal.returned, 2);
  assert.equal(context.projection.observation.journal.messagesIncluded, false);
  assert.equal(context.evidence.systemdIncidentObservationContextIncluded, true);
  assert.equal(context.evidence.systemdIncidentObservationReceiptHash, receipt.receiptHash);
  assert.match(context.contextContentHash, /^[a-f0-9]{64}$/u);
  assert.match(context.requestEnvelope.messages[0].content, /reviewed systemd observation context/u);
  assert.doesNotMatch(
    JSON.stringify({ projection: context.projection, evidence: context.evidence }),
    /private\.invalid|private journal message/u,
  );

  const handoff = materialiseSystemdIncidentProviderHandoff({
    tasks,
    liveProviderExecution: {
      requested: true,
      contextPacket: {
        requested: true,
        sourceTaskId: providerTask.id,
        includeSystemdIncidentObservationReceipt: true,
      },
    },
  });
  assert.equal(handoff.ok, true, handoff.reason);
  assert.equal(
    handoff.liveProviderExecution.contextPacket.includeSystemdIncidentObservationReceipt,
    true,
  );
  assert.equal(handoff.evidence.contextContentHash, context.contextContentHash);

  const handoffTask = {
    id: "provider-observation-diagnosis-1",
    cloudConsciousnessLiveProviderEgressExecution: {
      systemdIncidentContext: handoff.incidentContext,
      incidentContextContentHash: handoff.evidence.contextContentHash,
    },
  };
  tasks.set(handoffTask.id, handoffTask);
  const execution = materialiseStoredSystemdIncidentProviderExecution({ handoffTask, tasks });
  assert.equal(execution.handled, true);
  assert.equal(execution.ok, true, execution.reason);
  assert.equal(
    execution.liveProviderExecution.contextPacket.includeSystemdIncidentObservationReceipt,
    true,
  );
  assert.equal(execution.evidence.executionTaskId, handoffTask.id);
  assert.equal(
    execution.liveProviderExecution.requestEnvelope.messages[0].content,
    handoff.liveProviderExecution.requestEnvelope.messages[0].content,
  );
});

test("reviewed observation execution fails closed when its receipt changes after approval", async () => {
  const { providerTask, tasks } = await createSystemdIncidentObservationTaskFixture();
  const handoff = materialiseSystemdIncidentProviderHandoff({
    tasks,
    liveProviderExecution: {
      requested: true,
      contextPacket: {
        requested: true,
        sourceTaskId: providerTask.id,
        includeSystemdIncidentObservationReceipt: true,
      },
    },
  });
  const handoffTask = {
    id: "provider-observation-drift",
    cloudConsciousnessLiveProviderEgressExecution: {
      systemdIncidentContext: handoff.incidentContext,
      incidentContextContentHash: handoff.evidence.contextContentHash,
    },
  };
  providerTask.cloudConsciousnessLiveProviderEgressExecution
    .systemdIncidentObservationReceipt.health.unitRunning = false;

  const execution = materialiseStoredSystemdIncidentProviderExecution({ handoffTask, tasks });

  assert.equal(execution.handled, true);
  assert.equal(execution.ok, false);
  assert.equal(execution.reason, "systemd_incident_observation_receipt_invalid");
});

test("incident execution fails closed when matching experience changes after approval", () => {
  const sourceTask = createSystemdIncidentRepairTask();
  const tasks = new Map([[sourceTask.id, sourceTask]]);
  const handoff = materialiseSystemdIncidentProviderHandoff({
    tasks,
    buildExperienceMemoryReadModel: experienceReader([
      experienceRecord(`sha256:${"d".repeat(64)}`),
    ]),
    liveProviderExecution: {
      requested: true,
      contextPacket: {
        requested: true,
        sourceTaskId: sourceTask.id,
        includeSystemdIncidentReceipt: true,
      },
    },
  });
  const handoffTask = {
    id: "provider-incident-experience-drift",
    cloudConsciousnessLiveProviderEgressExecution: {
      systemdIncidentContext: handoff.incidentContext,
      incidentContextContentHash: handoff.evidence.contextContentHash,
    },
  };

  const execution = materialiseStoredSystemdIncidentProviderExecution({
    handoffTask,
    tasks,
    buildExperienceMemoryReadModel: experienceReader([
      experienceRecord(`sha256:${"e".repeat(64)}`),
    ]),
  });

  assert.equal(execution.handled, true);
  assert.equal(execution.ok, false);
  assert.equal(execution.reason, "systemd_incident_stored_context_mismatch");
});

test("incident context fails closed when receipt or stored projection changes", () => {
  const sourceTask = createSystemdIncidentRepairTask();
  sourceTask.outcome.details.incidentReceipt.restoredHealthy = true;
  const invalidReceipt = buildSystemdIncidentProviderContext({ sourceTask });
  assert.equal(invalidReceipt.ok, false);
  assert.equal(invalidReceipt.reason, "systemd_incident_receipt_hash_mismatch");

  const validSource = createSystemdIncidentRepairTask();
  const built = buildSystemdIncidentProviderContext({ sourceTask: validSource });
  const handoffTask = {
    id: "provider-incident-task-tampered",
    cloudConsciousnessLiveProviderEgressExecution: {
      systemdIncidentContext: {
        ...built.projection,
        restoredHealthy: true,
      },
      incidentContextContentHash: built.contextContentHash,
    },
  };
  const execution = materialiseStoredSystemdIncidentProviderExecution({
    handoffTask,
    tasks: new Map([[validSource.id, validSource]]),
  });
  assert.equal(execution.handled, true);
  assert.equal(execution.ok, false);
  assert.equal(execution.reason, "systemd_incident_stored_context_mismatch");
});

test("incident context rejects internally inconsistent fixed-unit evidence", () => {
  const sourceTask = createSystemdIncidentRepairTask();
  const receipt = sourceTask.outcome.details.incidentReceipt;
  receipt.journalEvidence.unit = "openclaw-system-sense.service";
  rehashReceipt(receipt);

  const context = buildSystemdIncidentProviderContext({ sourceTask });

  assert.equal(context.ok, false);
  assert.equal(context.reason, "systemd_incident_unit_binding_mismatch");
});
