import { buildNativeEngineeringVerificationEvidence } from "./native-engineering-verification-evidence-builders.mjs";

const CAPABILITY_ID = "sense.openclaw.engineering_tool.verify_evidence";
const COMMAND_TRANSCRIPT_LOOKUP_LIMIT = 100;
const CAPABILITY_INVOCATION_LOOKUP_LIMIT = 100;

function normaliseTaskId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalisePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function createEngineeringVerificationCapabilityHandlers({
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
    const limit = normalisePositiveInteger(params.limit, 10, 50);
    const transcriptLimit = taskId ? COMMAND_TRANSCRIPT_LOOKUP_LIMIT : limit;
    const transcriptRecords = listCommandTranscriptRecords({ limit: transcriptLimit });
    const capabilityInvocations = listCapabilityInvocations({
      limit: CAPABILITY_INVOCATION_LOOKUP_LIMIT,
      capabilityId: "act.system.command.execute",
    });

    return {
      handled: true,
      result: buildNativeEngineeringVerificationEvidence({
        transcriptRecords: Array.isArray(transcriptRecords) ? transcriptRecords : [],
        capabilityInvocations: Array.isArray(capabilityInvocations) ? capabilityInvocations : [],
        tasks,
        taskId,
        limit: params.limit,
        maxOutputChars: params.maxOutputChars,
      }),
    };
  }

  function summariseResult(capability, result) {
    if (capability.id !== CAPABILITY_ID) {
      return null;
    }
    return {
      kind: "engineering.verification_evidence",
      ok: result?.ok === true,
      total: result?.summary?.total ?? 0,
      passed: result?.summary?.passed ?? 0,
      failed: result?.summary?.failed ?? 0,
      attachedToCompletedTasks: result?.summary?.attachedToCompletedTasks ?? 0,
      outputTruncated: result?.summary?.outputTruncated ?? 0,
      workStandardsCovered: result?.summary?.workStandardsCovered ?? 0,
      noCommandExecution: result?.bounds?.noCommandExecution === true,
    };
  }

  return { callBackend, summariseResult };
}
