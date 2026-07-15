const EDIT_EXECUTION_EVIDENCE_CAPABILITY_ID = "sense.openclaw.engineering_tool.edit_execution_evidence";
const WRITE_EXECUTION_EVIDENCE_CAPABILITY_ID = "sense.openclaw.engineering_tool.write_execution_evidence";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const TASK_LEDGER_LOOKUP_LIMIT = 100;

function requireBuilder(builder, name) {
  if (typeof builder !== "function") {
    throw new Error(`${name} is not configured.`);
  }
  return builder;
}

function normaliseTaskId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normaliseLimit(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, MAX_LIMIT)
    : DEFAULT_LIMIT;
}

function builderFor(capability, builders) {
  if (capability.id === EDIT_EXECUTION_EVIDENCE_CAPABILITY_ID) {
    return requireBuilder(
      builders.buildNativeEngineeringEditExecutionEvidence,
      "buildNativeEngineeringEditExecutionEvidence",
    );
  }
  if (capability.id === WRITE_EXECUTION_EVIDENCE_CAPABILITY_ID) {
    return requireBuilder(
      builders.buildNativeEngineeringWriteExecutionEvidence,
      "buildNativeEngineeringWriteExecutionEvidence",
    );
  }
  return null;
}

function capabilityKind(capability) {
  return capability.id === EDIT_EXECUTION_EVIDENCE_CAPABILITY_ID
    ? "engineering.edit_execution_evidence"
    : "engineering.write_execution_evidence";
}

export function createEngineeringExecutionEvidenceCapabilityHandlers({
  buildNativeEngineeringEditExecutionEvidence,
  buildNativeEngineeringWriteExecutionEvidence,
  listFilesystemChangeRecords = () => [],
  tasks = new Map(),
} = {}) {
  const builders = {
    buildNativeEngineeringEditExecutionEvidence,
    buildNativeEngineeringWriteExecutionEvidence,
  };

  function callBackend(capability, request) {
    const builder = builderFor(capability, builders);
    if (!builder) {
      return { handled: false, result: null };
    }

    const params = request.params ?? {};
    const taskId = normaliseTaskId(params.taskId) ?? request.taskId ?? null;
    const limit = normaliseLimit(params.limit);
    const ledgerLimit = taskId ? TASK_LEDGER_LOOKUP_LIMIT : limit;
    const filesystemChanges = listFilesystemChangeRecords({ limit: ledgerLimit });

    return {
      handled: true,
      result: builder({
        filesystemChanges: Array.isArray(filesystemChanges) ? filesystemChanges : [],
        tasks,
        taskId,
        limit,
      }),
    };
  }

  function summariseResult(capability, result) {
    if (!builderFor(capability, builders)) {
      return null;
    }
    return {
      kind: capabilityKind(capability),
      ok: result?.ok === true,
      total: result?.summary?.total ?? 0,
      passed: result?.summary?.passed ?? 0,
      failed: result?.summary?.failed ?? 0,
      completedTasks: result?.summary?.completedTasks ?? 0,
      withEngineeringProposal: result?.summary?.withEngineeringProposal ?? 0,
      noMutation: result?.bounds?.noFilesystemWrite === true && result?.governance?.canMutate === false,
      noTaskCreation: result?.bounds?.noTaskCreation === true && result?.governance?.canCreateTask === false,
      noApprovalAction: result?.bounds?.noApprovalAction === true && result?.governance?.canApproveTask === false,
      noProviderEgress: result?.governance?.canCallProvider === false,
    };
  }

  return { callBackend, summariseResult };
}
