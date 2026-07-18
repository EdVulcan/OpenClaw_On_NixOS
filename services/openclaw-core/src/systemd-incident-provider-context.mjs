import { createHash } from "node:crypto";

import { DEEPSEEK_CREDENTIAL_REFERENCE } from "./cloud-live-provider-network-sender.mjs";
import {
  CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_RECOMMENDATION_CONTRACT,
  buildCloudLiveProviderEngineeringRecommendationInstruction,
} from "./cloud-live-provider-runtime-response-contract.mjs";
import {
  SYSTEMD_INCIDENT_EXPERIENCE_REGISTRY,
  SYSTEMD_INCIDENT_RECEIPT_REGISTRY,
  validateSystemdIncidentReceiptTask,
} from "./systemd-incident-receipt.mjs";
import {
  SYSTEMD_INCIDENT_OBSERVATION_RECEIPT_REGISTRY,
  validateSystemdIncidentObservationReceiptTask,
} from "./capability-runtime-systemd-incident-observation.mjs";

export const SYSTEMD_INCIDENT_PROVIDER_CONTEXT_REGISTRY =
  "openclaw-systemd-incident-provider-context-v0";
export const SYSTEMD_INCIDENT_OBSERVATION_PROVIDER_CONTEXT_REGISTRY =
  "openclaw-systemd-incident-observation-provider-context-v0";

const DEEPSEEK_MODEL = "deepseek-chat";
const SYSTEMD_INCIDENT_EXPERIENCE_CONTEXT_REGISTRY =
  "openclaw-systemd-incident-experience-context-v0";
const MAX_INCIDENT_EXPERIENCE_PATTERNS = 3;
const MAX_INCIDENT_JOURNAL_ENTRIES = 100;
const RECEIPT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

function taskList(tasks) {
  if (tasks instanceof Map) return [...tasks.values()];
  return Array.isArray(tasks) ? tasks : [];
}

function taskForId(tasks, taskId) {
  return taskList(tasks).find((task) => task?.id === taskId) ?? null;
}

function compactUnitState(state) {
  return state
    ? {
        unit: state.unit ?? null,
        loadState: state.loadState ?? null,
        activeState: state.activeState ?? null,
        subState: state.subState ?? null,
        mainPid: Number.isInteger(state.mainPid) ? state.mainPid : null,
        systemdObserved: state.systemdObserved === true,
      }
    : null;
}

function compactServiceHealth(service) {
  return service
    ? {
        key: service.key ?? null,
        name: service.name ?? null,
        ok: service.ok === true,
        status: service.status ?? null,
        checkedAt: service.checkedAt ?? null,
      }
    : null;
}

function compactHealth(health) {
  return {
    checkedAt: health?.checkedAt ?? null,
    healthServiceKey: health?.healthServiceKey ?? null,
    unit: compactUnitState(health?.unit),
    service: compactServiceHealth(health?.service),
    healthy: health?.healthy === true,
  };
}

function compactJournalEvidence(journal) {
  return {
    registry: journal.registry,
    available: journal.available === true,
    unit: journal.unit ?? null,
    requestedLines: Number.isInteger(journal.requestedLines) ? journal.requestedLines : null,
    returned: Number.isInteger(journal.returned) ? journal.returned : 0,
    parseErrors: Number.isInteger(journal.parseErrors) ? journal.parseErrors : 0,
    filteredEntries: Number.isInteger(journal.filteredEntries) ? journal.filteredEntries : 0,
    latestEntryAt: journal.latestEntryAt ?? null,
    errorCode: journal.errorCode ?? null,
    messagesIncluded: false,
  };
}

function compactHostdReceipt(hostd) {
  return {
    owner: hostd?.owner ?? null,
    transport: hostd?.transport ?? null,
    method: hostd?.method ?? null,
    unit: hostd?.unit ?? null,
    capability: hostd?.capability
      ? {
          operation: hostd.capability.operation ?? null,
          capabilityId: hostd.capability.capabilityId ?? null,
        }
      : null,
    jobPathPresent: typeof hostd?.jobPath === "string" && hostd.jobPath.length > 0,
    beforeMainPid: Number.isInteger(hostd?.beforeMainPid) ? hostd.beforeMainPid : null,
    afterMainPid: Number.isInteger(hostd?.afterMainPid) ? hostd.afterMainPid : null,
    commandSucceeded: hostd?.commandSucceeded === true,
  };
}

function compactIncidentExperience({ experienceMemory, targetUnit, sourceReceiptHash }) {
  const patterns = [];
  for (const record of Array.isArray(experienceMemory?.records) ? experienceMemory.records : []) {
    const pattern = record?.incidentPattern;
    if (!pattern
      || pattern.registry !== SYSTEMD_INCIDENT_EXPERIENCE_REGISTRY
      || pattern.targetUnit !== targetUnit
      || pattern.sourceReceiptHash === sourceReceiptHash
      || !RECEIPT_HASH_PATTERN.test(pattern.sourceReceiptHash ?? "")
      || pattern.journalMessagesIncluded !== false
      || pattern.providerOutputIncluded !== false
      || !Number.isInteger(pattern.journalEntries)
      || pattern.journalEntries < 0
      || pattern.journalEntries > MAX_INCIDENT_JOURNAL_ENTRIES
      || [
        "restoredHealthy",
        "preHealthy",
        "postHealthy",
        "journalAvailable",
        "restartCommandSucceeded",
        "nativeMutationObserved",
      ].some((key) => typeof pattern[key] !== "boolean")) {
      continue;
    }
    patterns.push({
      sourceReceiptHash: pattern.sourceReceiptHash,
      restoredHealthy: pattern.restoredHealthy,
      preHealthy: pattern.preHealthy,
      postHealthy: pattern.postHealthy,
      journalAvailable: pattern.journalAvailable,
      journalEntries: pattern.journalEntries,
      restartCommandSucceeded: pattern.restartCommandSucceeded,
      nativeMutationObserved: pattern.nativeMutationObserved,
    });
    if (patterns.length >= MAX_INCIDENT_EXPERIENCE_PATTERNS) break;
  }
  return {
    registry: SYSTEMD_INCIDENT_EXPERIENCE_CONTEXT_REGISTRY,
    targetUnit,
    matchedPatterns: patterns.length,
    restoredPatterns: patterns.filter((pattern) => pattern.restoredHealthy).length,
    recoveryRequiredPatterns: patterns.filter((pattern) => !pattern.restoredHealthy).length,
    patterns,
    governance: {
      advisoryOnly: true,
      currentReceiptExcluded: true,
      journalMessagesIncluded: false,
      providerOutputIncluded: false,
      createsTaskAutomatically: false,
      executesAutomatically: false,
    },
  };
}

function projectionText(projection) {
  return JSON.stringify(projection);
}

function buildRequestContent(projection) {
  return [
    "NixSoma bounded systemd incident context, explicitly included for this one approved provider call:",
    projectionText(projection),
    "Operator request: Diagnose the bounded incident evidence. State whether service health was restored and recommend only an existing governed operator action. Do not infer missing journal content or request another restart.",
    buildCloudLiveProviderEngineeringRecommendationInstruction(),
  ].join("\n\n");
}

function buildObservationRequestContent(projection) {
  return [
    "NixSoma reviewed systemd observation context, explicitly included for this one approved provider call:",
    projectionText(projection),
    "Operator request: Diagnose whether the fixed service remains healthy after the reviewed observation. Return review_systemd_incident_observation as the existing governed operator action. Do not infer missing journal messages, execute repair, refresh again, or request automatic egress.",
    buildCloudLiveProviderEngineeringRecommendationInstruction(),
  ].join("\n\n");
}

function invalid(reason) {
  return { ok: false, reason, projection: null, requestEnvelope: null, evidence: null };
}

export function buildSystemdIncidentProviderContext({
  sourceTask,
  buildExperienceMemoryReadModel = () => null,
} = {}) {
  const validation = validateSystemdIncidentReceiptTask({ sourceTask });
  if (!validation.ok) return invalid(validation.reason);
  const { receipt, targetUnit, healthServiceKey: expectedHealthServiceKey } = validation;
  const journal = receipt.journalEvidence;
  let experienceMemory;
  try {
    experienceMemory = buildExperienceMemoryReadModel({
      taskType: sourceTask.type,
      goal: sourceTask.goal ?? null,
      incidentTargetUnit: targetUnit,
      limit: MAX_INCIDENT_EXPERIENCE_PATTERNS + 1,
    });
  } catch {
    return invalid("systemd_incident_experience_recall_failed");
  }
  const priorIncidentExperience = compactIncidentExperience({
    experienceMemory,
    targetUnit,
    sourceReceiptHash: receipt.receiptHash,
  });

  const projection = {
    registry: SYSTEMD_INCIDENT_PROVIDER_CONTEXT_REGISTRY,
    mode: "bounded_systemd_incident_diagnosis_context",
    sourceTaskId: sourceTask.id,
    sourceTaskStatus: sourceTask.status,
    sourceReceiptHash: receipt.receiptHash,
    target: {
      unit: receipt.target.unit,
      healthServiceKey: expectedHealthServiceKey,
    },
    preHealth: compactHealth(receipt.preHealth),
    journalEvidence: compactJournalEvidence(journal),
    hostdReceipt: compactHostdReceipt(receipt.hostdReceipt),
    postHealth: compactHealth(receipt.postHealth),
    restoredHealthy: receipt.restoredHealthy === true,
    operatorRecoveryRecommended: receipt.restoredHealthy !== true,
    priorIncidentExperience,
    governance: {
      guidanceOnly: true,
      journalMessagesIncluded: false,
      serviceUrlsIncluded: false,
      errorTextIncluded: false,
      credentialsIncluded: false,
      createsTaskAutomatically: false,
      createsApprovalAutomatically: false,
      executesAutomatically: false,
      authorizesRepair: false,
    },
  };
  const contextContentHash = hashText(projectionText(projection));
  const requestEnvelope = {
    model: DEEPSEEK_MODEL,
    messages: [{ role: "user", content: buildRequestContent(projection) }],
  };
  return {
    ok: true,
    projection,
    contextContentHash,
    requestEnvelope,
    evidence: {
      registry: SYSTEMD_INCIDENT_PROVIDER_CONTEXT_REGISTRY,
      sourceRegistry: SYSTEMD_INCIDENT_RECEIPT_REGISTRY,
      taskId: sourceTask.id,
      executionTaskId: null,
      sourceTaskId: sourceTask.id,
      responseContract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_RECOMMENDATION_CONTRACT,
      contextContentHash,
      providerMessageChars: requestEnvelope.messages[0].content.length,
      requestEnvelopeMaterialized: true,
      systemdIncidentContextIncluded: true,
      systemdIncidentTargetUnit: projection.target.unit,
      systemdIncidentHealthServiceKey: projection.target.healthServiceKey,
      systemdIncidentRestoredHealthy: projection.restoredHealthy,
      systemdIncidentJournalAvailable: projection.journalEvidence.available,
      systemdIncidentJournalEntries: projection.journalEvidence.returned,
      systemdIncidentReceiptHash: projection.sourceReceiptHash,
      systemdIncidentExperiencePatterns: projection.priorIncidentExperience.matchedPatterns,
      systemdIncidentExperienceRestoredPatterns: projection.priorIncidentExperience.restoredPatterns,
      systemdIncidentExperienceRecoveryRequiredPatterns:
        projection.priorIncidentExperience.recoveryRequiredPatterns,
      journalMessagesIncluded: false,
      providerOutputIncluded: false,
      contextContentIncluded: false,
    },
  };
}

export function buildSystemdIncidentObservationProviderContext({
  providerTask,
  tasks = new Map(),
} = {}) {
  if (providerTask?.type !== "cloud_consciousness_live_provider_egress_execution_task"
    || providerTask.status !== "completed") {
    return invalid("systemd_incident_observation_provider_task_not_completed");
  }
  const validation = validateSystemdIncidentObservationReceiptTask({ providerTask, tasks });
  if (!validation.ok) return invalid(validation.reason);
  const { receipt, sourceTask, sourceValidation } = validation;
  const sourceReceipt = sourceValidation.receipt;
  const projection = {
    registry: SYSTEMD_INCIDENT_OBSERVATION_PROVIDER_CONTEXT_REGISTRY,
    mode: "bounded_systemd_incident_observation_diagnosis_context",
    sourceTaskId: providerTask.id,
    sourceObservationReceiptHash: receipt.receiptHash,
    incident: {
      sourceTaskId: sourceTask.id,
      sourceReceiptHash: sourceReceipt.receiptHash,
      restoredHealthy: sourceReceipt.restoredHealthy === true,
    },
    target: { ...receipt.target },
    observation: {
      observedAt: receipt.observedAt,
      health: { ...receipt.health },
      journal: { ...receipt.journal },
    },
    governance: {
      guidanceOnly: true,
      journalMessagesIncluded: false,
      providerOutputIncluded: false,
      serviceUrlsIncluded: false,
      credentialsIncluded: false,
      createsTaskAutomatically: false,
      createsApprovalAutomatically: false,
      executesAutomatically: false,
      authorizesRepair: false,
    },
  };
  const contextContentHash = hashText(projectionText(projection));
  const requestEnvelope = {
    model: DEEPSEEK_MODEL,
    messages: [{ role: "user", content: buildObservationRequestContent(projection) }],
  };
  return {
    ok: true,
    projection,
    contextContentHash,
    requestEnvelope,
    evidence: {
      registry: SYSTEMD_INCIDENT_OBSERVATION_PROVIDER_CONTEXT_REGISTRY,
      sourceRegistry: SYSTEMD_INCIDENT_OBSERVATION_RECEIPT_REGISTRY,
      taskId: providerTask.id,
      executionTaskId: null,
      sourceTaskId: providerTask.id,
      responseContract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_RECOMMENDATION_CONTRACT,
      contextContentHash,
      providerMessageChars: requestEnvelope.messages[0].content.length,
      requestEnvelopeMaterialized: true,
      systemdIncidentContextIncluded: true,
      systemdIncidentObservationContextIncluded: true,
      systemdIncidentTargetUnit: receipt.target.unit,
      systemdIncidentHealthServiceKey: receipt.target.healthServiceKey,
      systemdIncidentRestoredHealthy:
        receipt.health.serviceHealthy === true && receipt.health.unitRunning === true,
      systemdIncidentJournalAvailable: receipt.journal.available,
      systemdIncidentJournalEntries: receipt.journal.returned,
      systemdIncidentReceiptHash: sourceReceipt.receiptHash,
      systemdIncidentObservationReceiptHash: receipt.receiptHash,
      systemdIncidentExperiencePatterns: 0,
      systemdIncidentExperienceRestoredPatterns: 0,
      systemdIncidentExperienceRecoveryRequiredPatterns: 0,
      journalMessagesIncluded: false,
      providerOutputIncluded: false,
      contextContentIncluded: false,
    },
  };
}

export function materialiseSystemdIncidentProviderHandoff({
  liveProviderExecution,
  tasks,
  buildExperienceMemoryReadModel,
} = {}) {
  const includeIncidentReceipt =
    liveProviderExecution?.contextPacket?.includeSystemdIncidentReceipt === true;
  const includeObservationReceipt =
    liveProviderExecution?.contextPacket?.includeSystemdIncidentObservationReceipt === true;
  if (!includeIncidentReceipt && !includeObservationReceipt) {
    return { ok: true, liveProviderExecution, incidentContext: null, evidence: null };
  }
  if (includeIncidentReceipt && includeObservationReceipt) {
    return invalid("systemd_incident_provider_context_selectors_conflict");
  }
  const sourceTaskId = liveProviderExecution.contextPacket.sourceTaskId;
  const sourceTask = taskForId(tasks, sourceTaskId);
  const context = includeObservationReceipt
    ? buildSystemdIncidentObservationProviderContext({ providerTask: sourceTask, tasks })
    : buildSystemdIncidentProviderContext({ sourceTask, buildExperienceMemoryReadModel });
  if (!context.ok) return context;
  return {
    ok: true,
    incidentContext: context.projection,
    evidence: context.evidence,
    liveProviderExecution: {
      requested: true,
      credentialReference: DEEPSEEK_CREDENTIAL_REFERENCE,
      requestEnvelope: context.requestEnvelope,
      responseContract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_RECOMMENDATION_CONTRACT,
      contextContentHash: context.contextContentHash,
      contextPacket: {
        requested: true,
        sourceTaskId,
        responseContract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_RECOMMENDATION_CONTRACT,
        ...(includeIncidentReceipt ? { includeSystemdIncidentReceipt: true } : {}),
        ...(includeObservationReceipt ? { includeSystemdIncidentObservationReceipt: true } : {}),
      },
      systemdIncidentContext: context.projection,
    },
  };
}

export function materialiseStoredSystemdIncidentProviderExecution({
  handoffTask,
  tasks,
  buildExperienceMemoryReadModel,
} = {}) {
  const stored = handoffTask?.cloudConsciousnessLiveProviderEgressExecution?.systemdIncidentContext;
  if (!stored) return { handled: false, ok: true, liveProviderExecution: null, evidence: null };
  const sourceTask = taskForId(tasks, stored.sourceTaskId);
  const observationContext = stored.registry === SYSTEMD_INCIDENT_OBSERVATION_PROVIDER_CONTEXT_REGISTRY;
  const context = observationContext
    ? buildSystemdIncidentObservationProviderContext({ providerTask: sourceTask, tasks })
    : buildSystemdIncidentProviderContext({ sourceTask, buildExperienceMemoryReadModel });
  if (!context.ok) return { handled: true, ...context };
  if (context.contextContentHash
      !== handoffTask.cloudConsciousnessLiveProviderEgressExecution.incidentContextContentHash
    || projectionText(context.projection) !== projectionText(stored)) {
    return { handled: true, ...invalid("systemd_incident_stored_context_mismatch") };
  }
  return {
    handled: true,
    ok: true,
    evidence: {
      ...context.evidence,
      executionTaskId: handoffTask.id,
    },
    liveProviderExecution: {
      requested: true,
      taskId: handoffTask.id,
      credentialReference: DEEPSEEK_CREDENTIAL_REFERENCE,
      requestEnvelope: context.requestEnvelope,
      responseContract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_RECOMMENDATION_CONTRACT,
      contextPacket: {
        requested: true,
        taskId: handoffTask.id,
        sourceTaskId: sourceTask.id,
        responseContract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_RECOMMENDATION_CONTRACT,
        ...(observationContext
          ? { includeSystemdIncidentObservationReceipt: true }
          : { includeSystemdIncidentReceipt: true }),
      },
      authorization: {
        confirmed: true,
        credentialValueAccessAuthorized: true,
        endpointNetworkEgressAuthorized: true,
        liveProviderCallEnabled: true,
      },
    },
  };
}
