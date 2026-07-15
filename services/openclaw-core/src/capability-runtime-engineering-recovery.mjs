import { buildNativeEngineeringRecoveryEvidence } from "./native-engineering-recovery-evidence-builders.mjs";
import { buildNativeEngineeringVerificationEvidence } from "./native-engineering-verification-evidence-builders.mjs";

const CAPABILITY_ID = "sense.openclaw.engineering_tool.recovery_evidence";
const VERIFICATION_LOOKUP_LIMIT = 100;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function normaliseTaskId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normaliseLimit(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, MAX_LIMIT)
    : DEFAULT_LIMIT;
}

export function createEngineeringRecoveryCapabilityHandlers({
  listCommandTranscriptRecords = () => [],
  listCapabilityInvocations = () => [],
  tasks = new Map(),
} = {}) {
  function callBackend(capability, request) {
    if (capability.id !== CAPABILITY_ID) {
      return { handled: false, result: null };
    }

    const params = request.params ?? {};
    const taskId = normaliseTaskId(params.taskId) ?? request.taskId ?? null;
    const limit = normaliseLimit(params.limit);
    const transcriptLimit = taskId ? VERIFICATION_LOOKUP_LIMIT : limit;
    const transcriptRecords = listCommandTranscriptRecords({ limit: transcriptLimit });
    const capabilityInvocations = listCapabilityInvocations({
      limit: VERIFICATION_LOOKUP_LIMIT,
      capabilityId: "act.system.command.execute",
    });
    const verificationEvidence = buildNativeEngineeringVerificationEvidence({
      transcriptRecords: Array.isArray(transcriptRecords) ? transcriptRecords : [],
      capabilityInvocations: Array.isArray(capabilityInvocations) ? capabilityInvocations : [],
      tasks,
      taskId,
      limit: params.limit,
      maxOutputChars: params.maxOutputChars,
    });

    return {
      handled: true,
      result: buildNativeEngineeringRecoveryEvidence({
        verificationEvidence,
        tasks,
        taskId,
        limit: params.limit,
      }),
    };
  }

  function summariseResult(capability, result) {
    if (capability.id !== CAPABILITY_ID) {
      return null;
    }
    const summary = result?.summary ?? {};
    const governance = result?.governance ?? {};
    const bounds = result?.bounds ?? {};
    return {
      kind: "engineering.recovery_evidence",
      ok: result?.ok === true,
      totalFailures: summary.totalFailures ?? 0,
      recoverableFailures: summary.recoverableFailures ?? 0,
      alreadyRecovered: summary.alreadyRecovered ?? 0,
      workStandardsCoveredFailures: summary.workStandardsCoveredFailures ?? 0,
      workStandardsRecoveryRecommended: summary.workStandardsRecoveryRecommended ?? 0,
      noRecoveryTaskCreation: governance.canCreateRecoveryTask === false
        && bounds.noRecoveryTaskCreation === true,
      noApprovalCreation: governance.canApproveRecovery === false
        && bounds.noApprovalCreation === true,
      noCommandExecution: governance.canExecuteCommand === false
        && bounds.noCommandExecution === true,
      noProviderEgress: governance.canCallProvider === false,
    };
  }

  function validateRequest(capability, request) {
    if (capability.id !== CAPABILITY_ID) {
      return null;
    }
    const taskId = request.params?.taskId;
    if (taskId !== undefined && taskId !== null && typeof taskId !== "string") {
      return "Engineering recovery evidence taskId must be a string.";
    }
    return null;
  }

  return { callBackend, summariseResult, validateRequest };
}
