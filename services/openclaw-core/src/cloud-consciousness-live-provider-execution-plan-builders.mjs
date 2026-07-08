import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createEventName } from "../../../packages/shared-events/src/event-factory.mjs";

export function createCloudConsciousnessLiveProviderExecutionPlanBuilders(deps) {
  const {
    postJson,
    systemSenseUrl,
    evaluatePolicyIntent,
    createTask,
    createApprovalRequestForTask,
    supersedeOtherActiveTasks,
    reconcileRuntimeState,
    persistState,
    completeTask,
    publishEvent,
    publishTaskApprovalIfPending,
    serialiseTask,
    serialisePlanForPublic,
    setTaskPhase,
    isTaskPolicyApproved,
    buildCloudConsciousnessLiveProviderRunbookReadback,
    CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_TASK_REGISTRY,
    CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_FILE_DISPLAY_PATH,
  } = deps;

  function phase12Governance(overrides = {}) {
    return {
      phase: "phase-12",
      createsTask: false,
      createsApproval: false,
      writesExecutionPlanArtifact: false,
      callsCloudModel: false,
      transmitsExternally: false,
      liveProviderCallEnabled: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      credentialValueRead: false,
      endpointContacted: false,
      networkEgress: false,
      ...overrides,
    };
  }

  function phase12EvidenceRef(evidence) {
    return {
      registry: evidence?.registry ?? null,
      status: evidence?.status ?? null,
      ready: evidence?.summary?.ready ?? evidence?.summary?.complete ?? null,
      completionPercent: evidence?.summary?.completionPercent ?? null,
    };
  }

  function cloudConsciousnessLiveProviderExecutionPlanFilePath() {
    return path.resolve(process.cwd(), "../..", CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_FILE_DISPLAY_PATH);
  }

  function cloudConsciousnessLiveProviderExecutionPlanDirPath() {
    return path.dirname(cloudConsciousnessLiveProviderExecutionPlanFilePath());
  }

  function readCloudConsciousnessLiveProviderExecutionPlanRecords() {
    const filePath = cloudConsciousnessLiveProviderExecutionPlanFilePath();
    if (!existsSync(filePath)) {
      return {
        exists: false,
        file: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_FILE_DISPLAY_PATH,
        filePath,
        lineCount: 0,
        records: [],
        latest: null,
      };
    }

    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const records = lines.map((line, index) => {
      try {
        return {
          ok: true,
          index,
          ...JSON.parse(line),
        };
      } catch (error) {
        return {
          ok: false,
          index,
          error: error instanceof Error ? error.message : "Invalid JSONL record.",
        };
      }
    });
    return {
      exists: true,
      file: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_FILE_DISPLAY_PATH,
      filePath,
      lineCount: lines.length,
      records,
      latest: records.filter((record) => record.ok).at(-1) ?? null,
    };
  }

  async function buildCloudConsciousnessLiveProviderCallExecutionPlan() {
    const runbookReadback = buildCloudConsciousnessLiveProviderRunbookReadback();
    const checks = [
      {
        id: "phase-11-runbook-readable",
        label: "Phase 11 approved local live provider-call runbook is readable",
        passed: runbookReadback.summary?.ready === true,
        evidence: runbookReadback.registry,
      },
      {
        id: "execution-plan-artifact-local",
        label: "Phase 12 writes only a local execution-plan artifact",
        passed: true,
        evidence: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_FILE_DISPLAY_PATH,
      },
      {
        id: "live-egress-still-disabled",
        label: "Execution planning does not call a cloud provider or read credential values",
        passed: true,
        evidence: "plan_only_no_external_transmission",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    const ready = passed === checks.length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-live-provider-call-execution-plan-v0",
      mode: "phase_12_cloud_consciousness_live_provider_call_execution_plan",
      generatedAt: new Date().toISOString(),
      status: ready ? "cloud_consciousness_live_provider_call_execution_plan_ready" : "waiting_for_phase_11_live_provider_runbook",
      governance: phase12Governance(),
      whitepaperAlignment: {
        thesis: "Cloud-consciousness live egress must be intentional, reviewable, and reversible before any external call exists.",
        phaseTheme: "Create the operator-visible live provider-call execution plan without enabling live provider execution.",
        avoidsLoop: "This phase advances toward user-visible provider execution planning instead of adding another approval-hardening chain.",
      },
      selectedSlices: [
        "openclaw-cloud-consciousness-live-provider-endpoint-credential-binding",
        "openclaw-cloud-consciousness-live-provider-execution-transcript-schema",
        "openclaw-cloud-consciousness-live-provider-execution-route-review",
        "openclaw-cloud-consciousness-live-provider-execution-plan-task",
        "openclaw-cloud-consciousness-approved-live-provider-execution-plan",
        "openclaw-cloud-consciousness-live-provider-execution-plan-readback",
        "openclaw-cloud-consciousness-live-provider-call-execution-plan-exit",
      ],
      checks,
      summary: {
        ready,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        phase: "phase-12",
        callsCloudModel: false,
        transmitsExternally: false,
        liveProviderCallEnabled: false,
        writesExecutionPlanArtifact: false,
      },
      evidence: {
        runbookReadback: phase12EvidenceRef(runbookReadback),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-endpoint-credential-binding",
        boundary: "bind endpoint and credential metadata fingerprints before materializing the local execution-plan task",
      },
    };
  }

  async function buildCloudConsciousnessLiveProviderEndpointCredentialBinding() {
    const plan = await buildCloudConsciousnessLiveProviderCallExecutionPlan();
    const binding = {
      id: "openclaw.cloud_consciousness.live_provider.endpoint_credential_binding.v0",
      endpoint: {
        provider: "operator_selected_provider",
        hostFingerprintRequired: true,
        hostValueExposed: false,
        contacted: false,
      },
      credential: {
        source: "operator_selected_secret_reference",
        valueRead: false,
        envVarNameExposed: false,
        mounted: false,
      },
      requestEnvelope: {
        reviewedRunbookRecordId: plan.evidence?.runbookReadback?.latestRecordId ?? null,
        contentHashRequired: true,
        rawPromptExposed: false,
      },
    };
    const checks = [
      {
        id: "execution-plan-ready",
        label: "Execution-plan route starts from a readable Phase 11 runbook",
        passed: plan.summary?.ready === true,
        evidence: plan.registry,
      },
      {
        id: "endpoint-fingerprint-only",
        label: "Endpoint binding requires fingerprint metadata without contacting the endpoint",
        passed: binding.endpoint.hostFingerprintRequired === true && binding.endpoint.contacted === false,
        evidence: binding.id,
      },
      {
        id: "credential-reference-only",
        label: "Credential binding uses a secret reference without reading credential values",
        passed: binding.credential.valueRead === false && binding.credential.mounted === false,
        evidence: binding.credential.source,
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-live-provider-endpoint-credential-binding-v0",
      mode: "phase_12_endpoint_credential_binding_metadata_only",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "endpoint_credential_binding_ready" : "waiting_for_execution_plan",
      governance: phase12Governance(),
      binding,
      checks,
      summary: {
        ready: passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        endpointContacted: false,
        providerCredentialRead: false,
        credentialValueRead: false,
        callsCloudModel: false,
        transmitsExternally: false,
      },
      evidence: {
        executionPlan: phase12EvidenceRef(plan),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-execution-transcript-schema",
        boundary: "define the execution transcript schema before route review",
      },
    };
  }

  async function buildCloudConsciousnessLiveProviderExecutionTranscriptSchema() {
    const binding = await buildCloudConsciousnessLiveProviderEndpointCredentialBinding();
    const schema = {
      id: "openclaw.cloud_consciousness.live_provider.execution_plan_transcript.v0",
      requiredFields: [
        "id",
        "createdAt",
        "runbookRecordId",
        "runbookContentHash",
        "endpointFingerprint",
        "credentialReference",
        "requestEnvelopeHash",
        "operatorAuthorizationState",
        "executionPlanStatus",
        "egressAttempted",
        "providerResponseReceived",
        "contentHash",
      ],
      phase12AllowedStatus: "execution_plan_recorded",
    };
    const checks = [
      {
        id: "binding-ready",
        label: "Endpoint and credential binding metadata is ready",
        passed: binding.summary?.ready === true,
        evidence: binding.registry,
      },
      {
        id: "schema-fields-defined",
        label: "Execution transcript schema captures endpoint, credential reference, request hash, and egress state",
        passed: schema.requiredFields.includes("endpointFingerprint")
          && schema.requiredFields.includes("credentialReference")
          && schema.requiredFields.includes("egressAttempted"),
        evidence: schema.id,
      },
      {
        id: "status-plan-recorded",
        label: "Phase 12 transcript status records planning only",
        passed: schema.phase12AllowedStatus === "execution_plan_recorded",
        evidence: schema.phase12AllowedStatus,
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-live-provider-execution-transcript-schema-v0",
      mode: "phase_12_live_provider_execution_transcript_schema",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "execution_transcript_schema_ready" : "waiting_for_endpoint_credential_binding",
      governance: phase12Governance(),
      schema,
      checks,
      summary: {
        ready: passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        requiredFieldCount: schema.requiredFields.length,
        callsCloudModel: false,
        transmitsExternally: false,
      },
      evidence: {
        binding: phase12EvidenceRef(binding),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-execution-route-review",
        boundary: "route-review local execution-plan artifact creation before task materialization",
      },
    };
  }

  async function buildCloudConsciousnessLiveProviderExecutionRouteReview() {
    const transcriptSchema = await buildCloudConsciousnessLiveProviderExecutionTranscriptSchema();
    const decision = {
      selectedSlice: "openclaw-cloud-consciousness-live-provider-execution-plan-task",
      deferredSlice: "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-plan",
      status: transcriptSchema.summary?.ready === true ? "selected" : "blocked",
      reason: "Phase 12 may write an approved local execution plan; actual provider egress remains deferred to a future runtime adapter phase.",
      canCreateTask: transcriptSchema.summary?.ready === true,
      canWriteExecutionPlanAfterApproval: transcriptSchema.summary?.ready === true,
      canCallCloudProviderNow: false,
      storageScope: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_FILE_DISPLAY_PATH,
    };
    const checks = [
      {
        id: "transcript-schema-ready",
        label: "Execution transcript schema is ready",
        passed: transcriptSchema.summary?.ready === true,
        evidence: transcriptSchema.registry,
      },
      {
        id: "execution-plan-task-selected",
        label: "Route selects local approval-gated live provider-call execution-plan task",
        passed: decision.selectedSlice === "openclaw-cloud-consciousness-live-provider-execution-plan-task",
        evidence: decision.selectedSlice,
      },
      {
        id: "live-egress-deferred",
        label: "Actual live provider egress remains deferred",
        passed: decision.canCallCloudProviderNow === false,
        evidence: decision.deferredSlice,
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-live-provider-execution-route-review-v0",
      mode: "phase_12_live_provider_execution_plan_route_review",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "live_provider_execution_plan_route_selected" : "waiting_for_execution_route",
      governance: phase12Governance(),
      decision,
      checks,
      summary: {
        ready: passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        selectedSlice: decision.selectedSlice,
        deferredSlice: decision.deferredSlice,
        createsTask: false,
        callsCloudModel: false,
        transmitsExternally: false,
        liveProviderCallEnabled: false,
      },
      evidence: {
        transcriptSchema: phase12EvidenceRef(transcriptSchema),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-execution-plan-task",
        boundary: "create the approval-gated local execution-plan task without live egress",
      },
    };
  }

  async function createCloudConsciousnessLiveProviderExecutionPlanTask({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Cloud consciousness live provider-call execution-plan task creation requires confirm=true.");
    }

    const routeReview = await buildCloudConsciousnessLiveProviderExecutionRouteReview();
    if (routeReview.summary?.ready !== true || routeReview.decision?.selectedSlice !== "openclaw-cloud-consciousness-live-provider-execution-plan-task") {
      throw new Error("Cloud consciousness live provider-call execution-plan task requires a ready route review.");
    }

    const transcriptSchema = await buildCloudConsciousnessLiveProviderExecutionTranscriptSchema();
    const policyRequest = {
      intent: "cloud_consciousness.live_provider_call.execution_plan_write",
      domain: "body_internal",
      risk: "high",
      requiresApproval: true,
      audit: true,
      tags: ["cloud_consciousness", "live_provider_call", "execution_plan_only", "operator_reviewed"],
    };
    const goal = "Record reviewed live provider-call execution plan without contacting the provider";
    const policyDecision = evaluatePolicyIntent({
      type: "cloud_consciousness_live_provider_execution_plan_task",
      goal,
      policy: policyRequest,
    }, {
      stage: "cloud_consciousness.live_provider_execution_plan_task.draft",
      type: "cloud_consciousness_live_provider_execution_plan_task",
      goal,
    });
    const liveProviderExecutionPlan = {
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_TASK_REGISTRY,
      routeReviewRegistry: routeReview.registry,
      transcriptSchemaRegistry: transcriptSchema.registry,
      executionPlanFileDisplayPath: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_FILE_DISPLAY_PATH,
      artifactWritten: false,
      transmittedExternally: false,
      cloudCallExecuted: false,
      providerSdkLoaded: false,
      credentialRead: false,
      liveProviderCallEnabled: false,
    };
    const task = createTask({
      goal,
      type: "cloud_consciousness_live_provider_execution_plan_task",
      workViewStrategy: "cloud-consciousness-live-provider-execution-plan",
      policy: policyRequest,
      plan: {
        planner: "cloud-consciousness-live-provider-execution-plan-task-v0",
        strategy: "approval-gated-cloud-consciousness-live-provider-call-execution-plan",
        summary: "Record an approval-gated local live provider-call execution plan without live provider egress.",
        governance: phase12Governance({ createsTask: true, createsApproval: true }),
        steps: [
          {
            id: "review-execution-plan-evidence",
            phase: "review_live_provider_execution_plan_evidence",
            title: "Review endpoint binding, credential reference, transcript schema, and route decision",
            status: "pending",
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before writing the local execution plan",
            status: "pending",
            capabilityId: "act.filesystem.append_text",
            requiresApproval: true,
            risk: "high",
          },
          {
            id: "write-live-provider-execution-plan",
            phase: "cloud_consciousness_live_provider_execution_plan_write",
            title: "Append one local live provider-call execution plan inside OpenClaw-owned artifacts",
            status: "pending",
            capabilityId: "act.filesystem.append_text",
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
    task.cloudConsciousnessLiveProviderExecutionPlan = liveProviderExecutionPlan;
    const approval = createApprovalRequestForTask(task, policyDecision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent(createEventName("task.created"), { task: serialiseTask(task), planner: "cloud-consciousness-live-provider-execution-plan-task-v0" });
    await publishTaskApprovalIfPending(task);
    await publishEvent(createEventName("task.planned"), { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
    await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent(createEventName("task.phase_changed"), {
      task: serialiseTask(reclaimedTask),
    })));

    return {
      ok: true,
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_TASK_REGISTRY,
      mode: "approval-gated-cloud-consciousness-live-provider-execution-plan-task",
      generatedAt: new Date().toISOString(),
      sourceRegistry: routeReview.registry,
      routeReview,
      transcriptSchema,
      task,
      approval,
      governance: phase12Governance({ createsTask: true, createsApproval: true }),
    };
  }

  function isCloudConsciousnessLiveProviderExecutionPlanTask(task) {
    return task?.type === "cloud_consciousness_live_provider_execution_plan_task"
      && task?.cloudConsciousnessLiveProviderExecutionPlan?.registry === CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_TASK_REGISTRY;
  }

  async function executeCloudConsciousnessLiveProviderExecutionPlanTask(task) {
    const routeReview = await buildCloudConsciousnessLiveProviderExecutionRouteReview();
    const transcriptSchema = await buildCloudConsciousnessLiveProviderExecutionTranscriptSchema();
    const runbookReadback = buildCloudConsciousnessLiveProviderRunbookReadback();
    const executionPlanFileDisplayPath = CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_FILE_DISPLAY_PATH;
    const executionPlanFilePath = cloudConsciousnessLiveProviderExecutionPlanFilePath();
    const createdAt = new Date().toISOString();
    const executionPlan = {
      steps: [
        "verify operator-selected endpoint fingerprint",
        "verify credential reference without reading the credential value",
        "recompute request envelope hash",
        "prepare egress transcript before any network send",
        "require a future runtime adapter authorization immediately before live egress",
        "stop without external transmission if endpoint, credential, request hash, or transcript schema differs",
      ],
      deferredRuntimeAdapter: routeReview.decision?.deferredSlice ?? "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-plan",
      liveCallEnabled: false,
    };
    const recordBase = {
      id: `cloud-live-provider-execution-plan-${randomUUID()}`,
      createdAt,
      schema: "openclaw.cloud_consciousness.live_provider_call_execution_plan.v0",
      transcriptSchema: transcriptSchema.schema?.id ?? null,
      runbookRecordId: runbookReadback.summary?.latestRecordId ?? null,
      runbookContentHash: runbookReadback.summary?.latestContentHash ?? null,
      governance: {
        taskId: task.id,
        approvalId: task.approval?.requestId ?? null,
        approved: isTaskPolicyApproved(task),
        liveProviderCallEnabled: false,
        externalTransmissionAllowed: false,
        endpointContacted: false,
        networkCall: false,
        providerSdkLoaded: false,
        credentialRead: false,
        credentialValueRead: false,
        runtimeAdapterEnabled: false,
      },
      executionPlan,
    };
    const contentHash = createHash("sha256").update(JSON.stringify(recordBase)).digest("hex");
    const record = {
      ...recordBase,
      contentHash,
    };
    const line = `${JSON.stringify(record)}\n`;

    await setTaskPhase(task, "cloud_consciousness_live_provider_execution_plan_write", {
      status: "running",
      details: {
        executor: "cloud-consciousness-live-provider-execution-plan-task-v0",
        executionPlanFile: executionPlanFileDisplayPath,
        artifactWritten: false,
        cloudCallExecuted: false,
        transmittedExternally: false,
        providerSdkLoaded: false,
        credentialRead: false,
        liveProviderCallEnabled: false,
      },
    });

    mkdirSync(cloudConsciousnessLiveProviderExecutionPlanDirPath(), { recursive: true });
    const result = await postJson(`${systemSenseUrl}/system/files/append-text`, {
      path: executionPlanFilePath,
      content: line,
      encoding: "utf8",
      createIfMissing: true,
      intent: "cloud_consciousness.live_provider_call.execution_plan_write",
    });
    task.cloudConsciousnessLiveProviderExecutionPlan = {
      ...(task.cloudConsciousnessLiveProviderExecutionPlan ?? {}),
      executionPlanFileDisplayPath,
      executionPlanFilePath: result.path ?? executionPlanFilePath,
      allowedRoot: result.root ?? null,
      recordId: record.id,
      contentHash,
      contentBytes: result.contentBytes ?? Buffer.byteLength(line, "utf8"),
      previousBytes: result.previousBytes ?? 0,
      totalBytes: result.totalBytes ?? null,
      artifactWritten: true,
      transmittedExternally: false,
      cloudCallExecuted: false,
      providerSdkLoaded: false,
      credentialRead: false,
      liveProviderCallEnabled: false,
      appendResult: {
        registry: "openclaw-cloud-consciousness-approved-live-provider-execution-plan-v0",
        mode: result.mode ?? "append_text",
        created: result.created === true,
        createIfMissing: result.createIfMissing === true,
        metadata: result.metadata ?? null,
      },
    };
    const completedTask = completeTask(task, {
      executor: "cloud-consciousness-live-provider-execution-plan-task-v0",
      summary: `Appended local live provider-call execution plan ${record.id} to ${executionPlanFileDisplayPath}.`,
      executionPlanFile: executionPlanFileDisplayPath,
      result,
      record,
      hostMutation: true,
      artifactWritten: true,
      transmittedExternally: false,
      cloudCallExecuted: false,
      providerSdkLoaded: false,
      credentialRead: false,
      liveProviderCallEnabled: false,
      scheduler: false,
      backgroundWriter: false,
    });
    await publishEvent(createEventName("cloud_consciousness.live_provider_execution_plan_written"), {
      task: serialiseTask(completedTask),
      executionPlanFile: executionPlanFileDisplayPath,
      recordId: record.id,
      contentHash,
    });

    return {
      task: completedTask,
      policy: completedTask.policy?.decision ?? null,
      approval: completedTask.approval ?? null,
      actions: [],
      verification: null,
      execution: {
        registry: "openclaw-cloud-consciousness-approved-live-provider-execution-plan-v0",
        mode: "approved_local_live_provider_call_execution_plan",
        executionPlanFile: executionPlanFileDisplayPath,
        path: result.path ?? null,
        recordId: record.id,
        contentHash,
        hostMutation: true,
        artifactWritten: true,
        transmittedExternally: false,
        cloudCallExecuted: false,
        providerSdkLoaded: false,
        credentialRead: false,
        liveProviderCallEnabled: false,
        scheduler: false,
        backgroundWriter: false,
      },
    };
  }

  function buildCloudConsciousnessLiveProviderExecutionPlanReadback() {
    const executionPlan = readCloudConsciousnessLiveProviderExecutionPlanRecords();
    const validRecords = executionPlan.records.filter((record) => record.ok === true);
    const latest = validRecords.at(-1) ?? null;
    const checks = [
      {
        id: "execution-plan-file-readable",
        label: "Live provider-call execution-plan JSONL is readable",
        passed: executionPlan.exists === true,
        evidence: executionPlan.file,
      },
      {
        id: "execution-plan-record-present",
        label: "At least one approved local live provider-call execution plan is present",
        passed: validRecords.length >= 1,
        evidence: `${validRecords.length} record(s)`,
      },
      {
        id: "execution-plan-not-live",
        label: "Latest execution plan has no SDK, credential read, cloud call, live enablement, or external transmission",
        passed: latest?.schema === "openclaw.cloud_consciousness.live_provider_call_execution_plan.v0"
          && latest?.governance?.networkCall === false
          && latest?.governance?.providerSdkLoaded === false
          && latest?.governance?.credentialRead === false
          && latest?.governance?.credentialValueRead === false
          && latest?.governance?.endpointContacted === false
          && latest?.governance?.liveProviderCallEnabled === false
          && typeof latest?.contentHash === "string",
        evidence: latest?.id ?? "none",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-live-provider-execution-plan-readback-v0",
      mode: "phase_12_cloud_consciousness_live_provider_execution_plan_readback",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "live_provider_execution_plan_readback_ready" : "waiting_for_live_provider_execution_plan",
      governance: phase12Governance(),
      executionPlan: {
        file: executionPlan.file,
        exists: executionPlan.exists,
        lineCount: executionPlan.lineCount,
        validRecordCount: validRecords.length,
        latest: latest ? {
          id: latest.id ?? null,
          schema: latest.schema ?? null,
          runbookRecordId: latest.runbookRecordId ?? null,
          runbookContentHash: latest.runbookContentHash ?? null,
          contentHash: latest.contentHash ?? null,
          createdAt: latest.createdAt ?? null,
          transmittedExternally: latest.governance?.externalTransmissionAllowed === true,
          cloudCallExecuted: latest.governance?.networkCall === true,
          providerSdkLoaded: latest.governance?.providerSdkLoaded === true,
          credentialRead: latest.governance?.credentialRead === true,
          liveProviderCallEnabled: latest.governance?.liveProviderCallEnabled === true,
        } : null,
      },
      checks,
      summary: {
        ready: passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        recordCount: validRecords.length,
        latestRecordId: latest?.id ?? null,
        latestContentHash: latest?.contentHash ?? null,
        callsCloudModel: false,
        transmitsExternally: false,
        providerSdkLoaded: false,
        providerCredentialRead: false,
        liveProviderCallEnabled: false,
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-call-execution-plan-exit",
        boundary: "close Phase 12 after the approved local execution plan is readable and audit-safe",
      },
    };
  }

  async function buildCloudConsciousnessLiveProviderCallExecutionPlanExit() {
    const [
      plan,
      binding,
      transcriptSchema,
      routeReview,
    ] = await Promise.all([
      buildCloudConsciousnessLiveProviderCallExecutionPlan(),
      buildCloudConsciousnessLiveProviderEndpointCredentialBinding(),
      buildCloudConsciousnessLiveProviderExecutionTranscriptSchema(),
      buildCloudConsciousnessLiveProviderExecutionRouteReview(),
    ]);
    const readback = buildCloudConsciousnessLiveProviderExecutionPlanReadback();
    const checks = [
      {
        id: "execution-plan-ready",
        label: "Live provider-call execution plan is complete",
        passed: plan.summary?.ready === true,
        evidence: plan.registry,
      },
      {
        id: "endpoint-credential-binding-ready",
        label: "Endpoint and credential binding metadata is complete",
        passed: binding.summary?.ready === true,
        evidence: binding.registry,
      },
      {
        id: "execution-transcript-schema-ready",
        label: "Execution transcript schema is complete",
        passed: transcriptSchema.summary?.ready === true,
        evidence: transcriptSchema.registry,
      },
      {
        id: "route-reviewed",
        label: "Execution route review defers live provider call runtime adapter",
        passed: routeReview.summary?.ready === true
          && routeReview.summary?.callsCloudModel === false,
        evidence: routeReview.registry,
      },
      {
        id: "execution-plan-readback-ready",
        label: "Approved local live provider-call execution plan is readable",
        passed: readback.summary?.ready === true,
        evidence: readback.registry,
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    const complete = passed === checks.length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-live-provider-call-execution-plan-exit-v0",
      mode: "phase_12_cloud_consciousness_live_provider_call_execution_plan_exit_gate",
      generatedAt: new Date().toISOString(),
      status: complete ? "phase_12_complete" : "waiting_for_phase_12_live_provider_execution_plan",
      governance: phase12Governance(),
      completedPhase: {
        id: "phase-12",
        name: "Cloud Consciousness Live Provider Call Execution Plan",
        completionClaim: complete ? "phase_12_complete" : "phase_12_incomplete",
      },
      checks,
      summary: {
        complete,
        ready: complete,
        passed,
        total: checks.length,
        completionPercent: complete ? 100 : Math.round((passed / checks.length) * 100),
        phase: "phase-12",
        recordCount: readback.summary?.recordCount ?? 0,
        latestRecordId: readback.summary?.latestRecordId ?? null,
        callsCloudModel: false,
        transmitsExternally: false,
        providerSdkLoaded: false,
        providerCredentialRead: false,
        liveProviderCallEnabled: false,
        createsTask: true,
        storageScope: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_EXECUTION_PLAN_FILE_DISPLAY_PATH,
      },
      evidence: {
        plan: phase12EvidenceRef(plan),
        binding: phase12EvidenceRef(binding),
        transcriptSchema: phase12EvidenceRef(transcriptSchema),
        routeReview: phase12EvidenceRef(routeReview),
        readback: phase12EvidenceRef(readback),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-call-runtime-adapter-plan",
        boundary: "only after the execution plan is complete should a separate phase consider a runtime adapter for actual live provider egress",
      },
    };
  }

  return {
    buildCloudConsciousnessLiveProviderCallExecutionPlan,
    buildCloudConsciousnessLiveProviderEndpointCredentialBinding,
    buildCloudConsciousnessLiveProviderExecutionTranscriptSchema,
    buildCloudConsciousnessLiveProviderExecutionRouteReview,
    createCloudConsciousnessLiveProviderExecutionPlanTask,
    isCloudConsciousnessLiveProviderExecutionPlanTask,
    executeCloudConsciousnessLiveProviderExecutionPlanTask,
    buildCloudConsciousnessLiveProviderExecutionPlanReadback,
    buildCloudConsciousnessLiveProviderCallExecutionPlanExit,
    phase12EvidenceRef,
  };
}
