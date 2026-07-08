import { createEventName } from "../../../packages/shared-events/src/event-factory.mjs";

export function createBodyEvidenceTaskBuilders(deps) {
  const {
    fetchJson,
    systemSenseUrl,
    evaluatePolicyIntent,
    createTask,
    createApprovalRequestForTask,
    supersedeOtherActiveTasks,
    reconcileRuntimeState,
    persistState,
    publishEvent,
    publishTaskApprovalIfPending,
    serialiseTask,
    serialisePlanForPublic,
  } = deps;

  async function createBodyEvidenceLedgerDirectoryTaskShell({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Body evidence ledger directory task shell creation requires confirm=true.");
    }

    const routeReview = await fetchJson(`${systemSenseUrl}/system/route/body-evidence-ledger-storage-root-route-review`);
    if (routeReview.decision?.selectedSlice !== "openclaw-body-evidence-ledger-directory-task"
      || routeReview.evidence?.rootInsideWorkspace !== true) {
      throw new Error("Body evidence ledger directory task shell requires a workspace-bounded storage-root route review.");
    }
    const selectedDisplayPath = routeReview.evidence?.selectedDisplayPath ?? ".artifacts/openclaw-body-evidence-ledger";
    const policyRequest = {
      intent: "body.evidence.ledger.directory.create",
      domain: "body_internal",
      risk: "medium",
      requiresApproval: true,
      audit: true,
      tags: ["body_evidence_ledger", "filesystem", "mkdir", "host_mutation_candidate"],
    };
    const goal = `Create OpenClaw body evidence ledger directory at ${selectedDisplayPath}`;
    const policyDecision = evaluatePolicyIntent({
      type: "body_evidence_ledger_directory_task",
      goal,
      policy: policyRequest,
    }, {
      stage: "body_evidence_ledger_directory_task.draft",
      type: "body_evidence_ledger_directory_task",
      goal,
    });
    const ledgerDirectory = {
      registry: "openclaw-body-evidence-ledger-directory-task-v0",
      routeReviewRegistry: routeReview.registry,
      selectedRootId: routeReview.evidence?.selectedRootId ?? null,
      displayPath: selectedDisplayPath,
      rootInsideWorkspace: routeReview.evidence?.rootInsideWorkspace === true,
      directoryCreated: false,
      durableStorageWritten: false,
      recordWritesEnabled: false,
    };
    const task = createTask({
      goal,
      type: "body_evidence_ledger_directory_task",
      workViewStrategy: "body-evidence-ledger-directory",
      policy: policyRequest,
      plan: {
        planner: "body-evidence-ledger-directory-task-v0",
        strategy: "approval-gated-ledger-directory-task-shell",
        summary: `Create an approval-gated task shell for ${selectedDisplayPath}; do not create the directory until approval.`,
        steps: [
          {
            id: "review-storage-root",
            phase: "review_ledger_storage_root",
            title: "Review the selected workspace-bounded ledger root",
            status: "pending",
            displayPath: selectedDisplayPath,
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before creating the ledger directory",
            status: "pending",
            capabilityId: "act.filesystem.mkdir",
            requiresApproval: true,
            risk: "medium",
          },
          {
            id: "defer-directory-create",
            phase: "deferred_directory_creation_shell",
            title: "Defer mkdir execution to the approved execution milestone",
            status: "pending",
            displayPath: selectedDisplayPath,
            requiresApproval: true,
            executesNow: false,
          },
        ],
      },
    }, { skipInitialPolicy: true });
    task.policy = {
      request: policyRequest,
      decision: policyDecision,
    };
    task.bodyEvidenceLedgerDirectory = ledgerDirectory;
    const approval = createApprovalRequestForTask(task, policyDecision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent(createEventName("task.created"), { task: serialiseTask(task), planner: "body-evidence-ledger-directory-task-v0" });
    await publishTaskApprovalIfPending(task);
    await publishEvent(createEventName("task.planned"), { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
    await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent(createEventName("task.phase_changed"), {
      task: serialiseTask(reclaimedTask),
    })));

    return {
      registry: "openclaw-body-evidence-ledger-directory-task-v0",
      mode: "approval-gated-ledger-directory-task-shell",
      generatedAt: new Date().toISOString(),
      sourceRegistry: routeReview.registry,
      routeReview,
      task,
      approval,
      ledgerDirectory,
      governance: {
        createsTask: true,
        createsApproval: true,
        canExecuteWithoutApproval: false,
        canCreateDirectory: false,
        canWriteLedger: false,
        executed: false,
        hostMutation: false,
        directoryCreated: false,
        durableStorageWritten: false,
        requiresExplicitApproval: true,
        recordWritesEnabled: false,
      },
    };
  }

  async function createBodyEvidenceLedgerFirstRecordTaskShell({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Body evidence ledger first record task shell creation requires confirm=true.");
    }

    const routeReview = await fetchJson(`${systemSenseUrl}/system/route/body-evidence-ledger-first-record-route-review`);
    if (routeReview.decision?.selectedSlice !== "openclaw-body-evidence-ledger-first-record-task"
      || routeReview.evidence?.firstRecordPlanReady !== true
      || routeReview.evidence?.directoryExists !== true
      || routeReview.evidence?.plannedRecordType !== "body_evidence_ledger_bootstrap") {
      throw new Error("Body evidence ledger first record task shell requires a ready first-record route review.");
    }
    const policyRequest = {
      intent: "body.evidence.ledger.record.append",
      domain: "body_internal",
      risk: "medium",
      requiresApproval: true,
      audit: true,
      tags: ["body_evidence_ledger", "append_only", "durable_storage_candidate", "operator_reviewed"],
    };
    const recordType = routeReview.evidence?.plannedRecordType ?? "body_evidence_ledger_bootstrap";
    const goal = `Append first OpenClaw body evidence ledger record of type ${recordType}`;
    const policyDecision = evaluatePolicyIntent({
      type: "body_evidence_ledger_first_record_task",
      goal,
      policy: policyRequest,
    }, {
      stage: "body_evidence_ledger_first_record_task.draft",
      type: "body_evidence_ledger_first_record_task",
      goal,
    });
    const firstRecord = {
      registry: "openclaw-body-evidence-ledger-first-record-task-v0",
      routeReviewRegistry: routeReview.registry,
      plannedRecordType: recordType,
      sourceRegistry: routeReview.evidence?.sourceRegistry ?? null,
      requiredFieldCount: routeReview.evidence?.requiredFieldCount ?? 0,
      directoryExists: routeReview.evidence?.directoryExists === true,
      recordAppended: false,
      durableStorageWritten: false,
      appendExecutionEnabled: false,
    };
    const task = createTask({
      goal,
      type: "body_evidence_ledger_first_record_task",
      workViewStrategy: "body-evidence-ledger-first-record",
      policy: policyRequest,
      plan: {
        planner: "body-evidence-ledger-first-record-task-v0",
        strategy: "approval-gated-ledger-first-record-task-shell",
        summary: `Create an approval-gated task shell for the first ${recordType} ledger append; do not append the record in this milestone.`,
        steps: [
          {
            id: "review-first-record-plan",
            phase: "review_first_record_plan",
            title: "Review planned bootstrap ledger record evidence",
            status: "pending",
            recordType,
            sourceRegistry: firstRecord.sourceRegistry,
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before the first ledger append",
            status: "pending",
            capabilityId: "act.filesystem.append_jsonl",
            requiresApproval: true,
            risk: "medium",
          },
          {
            id: "defer-first-record-append",
            phase: "deferred_first_record_append_shell",
            title: "Defer JSONL append execution to the approved append milestone",
            status: "pending",
            recordType,
            requiresApproval: true,
            executesNow: false,
          },
        ],
      },
    }, { skipInitialPolicy: true });
    task.policy = {
      request: policyRequest,
      decision: policyDecision,
    };
    task.bodyEvidenceLedgerFirstRecord = firstRecord;
    const approval = createApprovalRequestForTask(task, policyDecision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent(createEventName("task.created"), { task: serialiseTask(task), planner: "body-evidence-ledger-first-record-task-v0" });
    await publishTaskApprovalIfPending(task);
    await publishEvent(createEventName("task.planned"), { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
    await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent(createEventName("task.phase_changed"), {
      task: serialiseTask(reclaimedTask),
    })));

    return {
      registry: "openclaw-body-evidence-ledger-first-record-task-v0",
      mode: "approval-gated-ledger-first-record-task-shell",
      generatedAt: new Date().toISOString(),
      sourceRegistry: routeReview.registry,
      routeReview,
      task,
      approval,
      firstRecord,
      governance: {
        createsTask: true,
        createsApproval: true,
        canExecuteWithoutApproval: false,
        canAppendLedgerRecord: false,
        canWriteLedger: false,
        executed: false,
        hostMutation: false,
        recordAppended: false,
        durableStorageWritten: false,
        requiresExplicitApproval: true,
        appendExecutionEnabled: false,
      },
    };
  }

  async function createBodyEvidenceLedgerFollowupRecordTaskShell({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Body evidence ledger follow-up record task shell creation requires confirm=true.");
    }

    const routeReview = await fetchJson(`${systemSenseUrl}/system/route/body-evidence-ledger-followup-record-route-review`);
    if (routeReview.decision?.selectedSlice !== "openclaw-body-evidence-ledger-followup-record-task"
      || routeReview.decision?.status !== "selected"
      || routeReview.evidence?.followupRecordPlanReady !== true
      || routeReview.evidence?.plannedRecordType !== "body_evidence_timeline_followup"
      || routeReview.evidence?.plannedSequence !== 2
      || routeReview.evidence?.existingRecordCount !== 1) {
      throw new Error("Body evidence ledger follow-up record task shell requires a ready follow-up route review.");
    }
    const policyRequest = {
      intent: "body.evidence.ledger.followup_record.append",
      domain: "body_internal",
      risk: "medium",
      requiresApproval: true,
      audit: true,
      tags: ["body_evidence_ledger", "append_only", "followup_record_candidate", "operator_reviewed"],
    };
    const recordType = routeReview.evidence?.plannedRecordType ?? "body_evidence_timeline_followup";
    const plannedSequence = routeReview.evidence?.plannedSequence ?? 2;
    const goal = `Prepare approval-gated follow-up OpenClaw body evidence ledger record ${plannedSequence} of type ${recordType}`;
    const policyDecision = evaluatePolicyIntent({
      type: "body_evidence_ledger_followup_record_task",
      goal,
      policy: policyRequest,
    }, {
      stage: "body_evidence_ledger_followup_record_task.draft",
      type: "body_evidence_ledger_followup_record_task",
      goal,
    });
    const followupRecord = {
      registry: "openclaw-body-evidence-ledger-followup-record-task-v0",
      routeReviewRegistry: routeReview.registry,
      plannedRecordType: recordType,
      plannedSequence,
      existingRecordCount: routeReview.evidence?.existingRecordCount ?? 0,
      latestRecordId: routeReview.evidence?.latestRecordId ?? null,
      sourceRegistry: routeReview.evidence?.sourceRegistry ?? null,
      sourceEndpoint: routeReview.evidence?.sourceEndpoint ?? null,
      preAppendChecks: routeReview.evidence?.preAppendChecks ?? [],
      deferredActions: routeReview.evidence?.deferredActions ?? [],
      recordAppended: false,
      durableStorageWritten: false,
      appendExecutionEnabled: false,
    };
    const task = createTask({
      goal,
      type: "body_evidence_ledger_followup_record_task",
      workViewStrategy: "body-evidence-ledger-followup-record",
      policy: policyRequest,
      plan: {
        planner: "body-evidence-ledger-followup-record-task-v0",
        strategy: "approval-gated-ledger-followup-record-task-shell",
        summary: `Create an approval-gated task shell for follow-up ledger record ${plannedSequence}; do not append the record in this milestone.`,
        steps: [
          {
            id: "review-followup-record-route",
            phase: "review_followup_record_route",
            title: "Review selected follow-up ledger record route",
            status: "pending",
            recordType,
            plannedSequence,
            sourceRegistry: followupRecord.sourceRegistry,
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before any follow-up ledger append",
            status: "pending",
            capabilityId: "act.filesystem.append_jsonl",
            requiresApproval: true,
            risk: "medium",
          },
          {
            id: "defer-followup-record-append",
            phase: "deferred_followup_record_append_shell",
            title: "Defer second JSONL append execution to a later approved append milestone",
            status: "pending",
            recordType,
            plannedSequence,
            requiresApproval: true,
            executesNow: false,
          },
        ],
      },
    }, { skipInitialPolicy: true });
    task.policy = {
      request: policyRequest,
      decision: policyDecision,
    };
    task.bodyEvidenceLedgerFollowupRecord = followupRecord;
    const approval = createApprovalRequestForTask(task, policyDecision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent(createEventName("task.created"), { task: serialiseTask(task), planner: "body-evidence-ledger-followup-record-task-v0" });
    await publishTaskApprovalIfPending(task);
    await publishEvent(createEventName("task.planned"), { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
    await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent(createEventName("task.phase_changed"), {
      task: serialiseTask(reclaimedTask),
    })));

    return {
      registry: "openclaw-body-evidence-ledger-followup-record-task-v0",
      mode: "approval-gated-ledger-followup-record-task-shell",
      generatedAt: new Date().toISOString(),
      sourceRegistry: routeReview.registry,
      routeReview,
      task,
      approval,
      followupRecord,
      governance: {
        createsTask: true,
        createsApproval: true,
        canExecuteWithoutApproval: false,
        canAppendLedgerRecord: false,
        canWriteLedger: false,
        executed: false,
        hostMutation: false,
        recordAppended: false,
        durableStorageWritten: false,
        requiresExplicitApproval: true,
        appendExecutionEnabled: false,
        schedulesFollowUp: false,
        backgroundWriter: false,
        bulkImport: false,
      },
    };
  }

  return {
    createBodyEvidenceLedgerDirectoryTaskShell,
    createBodyEvidenceLedgerFirstRecordTaskShell,
    createBodyEvidenceLedgerFollowupRecordTaskShell,
  };
}
