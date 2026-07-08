import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createEventName } from "../../../packages/shared-events/src/event-factory.mjs";

export function createCloudConsciousnessProviderCallRehearsalBuilders(deps) {
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
    buildCloudConsciousnessProviderAdapterExit,
    buildCloudConsciousnessProviderRequestEnvelope,
    compactCloudConsciousnessEvidenceRef,
    CLOUD_CONSCIOUSNESS_PROVIDER_CALL_REHEARSAL_TASK_REGISTRY,
    CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH,
  } = deps;

  function phase10Governance({
    createsTask = false,
    createsApproval = false,
    writesResponseArtifact = false,
    approvedRehearsal = false,
  } = {}) {
    return {
      phase: "phase-10",
      cloudConsciousnessBoundary: "real_provider_call_preflight_rehearsal",
      storageScope: CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH,
      createsTask,
      createsApproval,
      writesResponseArtifact,
      approvedRehearsal,
      mutatesHost: writesResponseArtifact,
      callsCloudModel: false,
      transmitsExternally: false,
      networkCall: false,
      providerSdkLoaded: false,
      providerCredentialRead: false,
      crossesDomain: false,
      startsAutomation: false,
      includesSecrets: false,
      userOwnedDocsTouched: false,
    };
  }

  function cloudConsciousnessProviderResponseFilePath() {
    return path.resolve(process.cwd(), "../..", CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH);
  }

  function cloudConsciousnessProviderResponseDirPath() {
    return path.dirname(cloudConsciousnessProviderResponseFilePath());
  }

  function readCloudConsciousnessProviderResponseRecords() {
    const filePath = cloudConsciousnessProviderResponseFilePath();
    if (!existsSync(filePath)) {
      return {
        exists: false,
        file: CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH,
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
      file: CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH,
      filePath,
      lineCount: lines.length,
      records,
      latest: records.filter((record) => record.ok).at(-1) ?? null,
    };
  }

  async function buildCloudConsciousnessRealProviderCallPlan() {
    const phase9Exit = await buildCloudConsciousnessProviderAdapterExit();
    const checks = [
      {
        id: "phase-9-complete",
        label: "Phase 9 completed the provider adapter contract and local dry-run",
        passed: phase9Exit.summary?.complete === true
          && phase9Exit.next?.recommendedSlice === "openclaw-cloud-consciousness-real-provider-call-plan",
        evidence: phase9Exit.registry,
      },
      {
        id: "real-call-preflight-before-egress",
        label: "Real provider-call work starts with egress and credential preflight before transmission",
        passed: true,
        evidence: "preflight_first_no_egress",
      },
      {
        id: "local-response-rehearsal",
        label: "Phase 10 records only a local provider-response rehearsal artifact",
        passed: true,
        evidence: CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH,
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    const ready = passed === checks.length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-real-provider-call-plan-v0",
      mode: "phase_10_cloud_consciousness_real_provider_call_plan",
      generatedAt: new Date().toISOString(),
      status: ready ? "cloud_consciousness_real_provider_call_plan_ready" : "waiting_for_phase_9_provider_adapter",
      governance: phase10Governance(),
      whitepaperAlignment: {
        thesis: "A real cloud-consciousness call must be preceded by explicit egress, credential, and redaction evidence under user sovereignty.",
        phaseTheme: "Prepare the real provider-call path with a local response rehearsal, without external transmission.",
        avoidsLoop: "No live provider request, provider SDK loading, credential reading, broad approval hardening, or unrelated body-repair expansion is selected.",
      },
      selectedSlices: [
        "openclaw-cloud-consciousness-provider-egress-contract",
        "openclaw-cloud-consciousness-provider-credential-preflight",
        "openclaw-cloud-consciousness-provider-request-redaction-review",
        "openclaw-cloud-consciousness-real-provider-call-route-review",
        "openclaw-cloud-consciousness-real-provider-call-task",
        "openclaw-cloud-consciousness-approved-provider-call-rehearsal",
        "openclaw-cloud-consciousness-provider-response-readback",
        "openclaw-cloud-consciousness-real-provider-call-exit",
      ],
      checks,
      summary: {
        ready,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        phase: "phase-10",
        callsCloudModel: false,
        transmitsExternally: false,
        providerCredentialRead: false,
        writesResponseArtifact: false,
      },
      evidence: {
        phase9Exit: compactCloudConsciousnessEvidenceRef(phase9Exit),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-provider-egress-contract",
        boundary: "define egress and provider-call constraints before credential preflight",
      },
    };
  }

  async function buildCloudConsciousnessProviderEgressContract() {
    const plan = await buildCloudConsciousnessRealProviderCallPlan();
    const contract = {
      id: "openclaw.cloud_consciousness.provider_egress_contract.v0",
      transport: "rehearsal-local",
      liveEndpoint: null,
      allowedEndpointEnv: "OPENCLAW_CLOUD_PROVIDER_ENDPOINT",
      allowedCredentialEnv: "OPENCLAW_CLOUD_PROVIDER_API_KEY",
      requiredBeforeLiveCall: ["operator_review", "explicit_endpoint", "credential_preflight", "redaction_review", "egress_transcript"],
      phase10Allows: ["local_response_rehearsal", "request_shape_validation", "operator_visible_transcript"],
      phase10Forbids: ["network_send", "provider_sdk_load", "credential_value_read", "external_transmission"],
      governance: {
        requiresApprovalForRehearsal: true,
        liveCloudCallAllowed: false,
        externalTransmissionAllowed: false,
        providerCredentialReadAllowed: false,
        storageScope: CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH,
      },
    };
    const checks = [
      {
        id: "plan-ready",
        label: "Real provider-call plan is ready",
        passed: plan.summary?.ready === true,
        evidence: plan.registry,
      },
      {
        id: "egress-contract-defined",
        label: "Egress contract defines endpoint, credential, review, and transcript requirements",
        passed: contract.requiredBeforeLiveCall.includes("egress_transcript")
          && contract.requiredBeforeLiveCall.includes("credential_preflight"),
        evidence: contract.id,
      },
      {
        id: "live-egress-forbidden",
        label: "Phase 10 forbids live network send, provider SDK loading, credential reading, and external transmission",
        passed: contract.governance.liveCloudCallAllowed === false
          && contract.governance.externalTransmissionAllowed === false
          && contract.governance.providerCredentialReadAllowed === false,
        evidence: contract.phase10Forbids.join(","),
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-provider-egress-contract-v0",
      mode: "phase_10_cloud_consciousness_provider_egress_contract",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "cloud_consciousness_provider_egress_contract_ready" : "waiting_for_provider_egress_contract",
      governance: phase10Governance(),
      contract,
      checks,
      summary: {
        ready: passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        requiredPreflightCount: contract.requiredBeforeLiveCall.length,
        callsCloudModel: false,
        transmitsExternally: false,
        providerCredentialRead: false,
      },
      evidence: {
        plan: compactCloudConsciousnessEvidenceRef(plan),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-provider-credential-preflight",
        boundary: "verify credential posture without reading credential values",
      },
    };
  }

  async function buildCloudConsciousnessProviderCredentialPreflight() {
    const egressContract = await buildCloudConsciousnessProviderEgressContract();
    const preflight = {
      id: "openclaw.cloud_consciousness.provider_credential_preflight.v0",
      endpointEnv: egressContract.contract?.allowedEndpointEnv ?? "OPENCLAW_CLOUD_PROVIDER_ENDPOINT",
      credentialEnv: egressContract.contract?.allowedCredentialEnv ?? "OPENCLAW_CLOUD_PROVIDER_API_KEY",
      endpointConfigured: false,
      credentialConfigured: false,
      credentialValueRead: false,
      credentialValueStored: false,
      liveCallPermitted: false,
      rehearsalAllowedWithoutCredential: true,
      note: "Phase 10 verifies the contract shape without reading provider credential values.",
    };
    const checks = [
      {
        id: "egress-contract-ready",
        label: "Provider egress contract is ready",
        passed: egressContract.summary?.ready === true,
        evidence: egressContract.registry,
      },
      {
        id: "credential-not-read",
        label: "Credential value is not read or stored during Phase 10",
        passed: preflight.credentialValueRead === false && preflight.credentialValueStored === false,
        evidence: preflight.credentialEnv,
      },
      {
        id: "live-call-not-permitted",
        label: "Live provider call remains disabled when endpoint and credential are absent",
        passed: preflight.liveCallPermitted === false && preflight.rehearsalAllowedWithoutCredential === true,
        evidence: "local_rehearsal_only",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-provider-credential-preflight-v0",
      mode: "phase_10_cloud_consciousness_provider_credential_preflight",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "cloud_consciousness_provider_credential_preflight_ready" : "waiting_for_provider_credential_preflight",
      governance: phase10Governance(),
      preflight,
      checks,
      summary: {
        ready: passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        endpointConfigured: preflight.endpointConfigured,
        credentialConfigured: preflight.credentialConfigured,
        providerCredentialRead: false,
        callsCloudModel: false,
        transmitsExternally: false,
      },
      evidence: {
        egressContract: compactCloudConsciousnessEvidenceRef(egressContract),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-provider-request-redaction-review",
        boundary: "review the outgoing request envelope before any provider-call task shell",
      },
    };
  }

  async function buildCloudConsciousnessProviderRequestRedactionReview() {
    const credentialPreflight = await buildCloudConsciousnessProviderCredentialPreflight();
    const requestEnvelope = await buildCloudConsciousnessProviderRequestEnvelope();
    const redaction = {
      policy: "provider_request_metadata_only",
      reviewedEnvelopeId: requestEnvelope.envelope?.id ?? null,
      reviewedContentHash: requestEnvelope.envelope?.contentHash ?? null,
      allowedContent: ["approved handoff ids", "content hashes", "bounded body summary", "bounded task summary", "memory record ids"],
      rejectedContent: ["raw user documents", "secrets", "provider credentials", "raw screen pixels", "command stdout", "external account tokens"],
      complete: requestEnvelope.summary?.providerCredentialIncluded === false
        && credentialPreflight.summary?.providerCredentialRead === false
        && requestEnvelope.summary?.transmitsExternally === false,
    };
    const checks = [
      {
        id: "credential-preflight-ready",
        label: "Provider credential preflight is ready",
        passed: credentialPreflight.summary?.ready === true,
        evidence: credentialPreflight.registry,
      },
      {
        id: "request-envelope-ready",
        label: "Provider request envelope from Phase 9 is ready",
        passed: requestEnvelope.summary?.ready === true,
        evidence: requestEnvelope.registry,
      },
      {
        id: "sensitive-content-excluded",
        label: "Credentials, secrets, raw documents, raw screen pixels, and stdout are excluded",
        passed: redaction.complete === true,
        evidence: redaction.policy,
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-provider-request-redaction-review-v0",
      mode: "phase_10_cloud_consciousness_provider_request_redaction_review",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "cloud_consciousness_provider_request_redaction_review_ready" : "waiting_for_provider_request_redaction_review",
      governance: phase10Governance(),
      redaction,
      checks,
      summary: {
        ready: passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        rejectedContentCount: redaction.rejectedContent.length,
        providerCredentialRead: false,
        includesSecrets: false,
        callsCloudModel: false,
        transmitsExternally: false,
      },
      evidence: {
        credentialPreflight: compactCloudConsciousnessEvidenceRef(credentialPreflight),
        requestEnvelope: compactCloudConsciousnessEvidenceRef(requestEnvelope),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-real-provider-call-route-review",
        boundary: "route-review a local provider-call rehearsal before creating a task",
      },
    };
  }

  async function buildCloudConsciousnessRealProviderCallRouteReview() {
    const redactionReview = await buildCloudConsciousnessProviderRequestRedactionReview();
    const decision = {
      selectedSlice: "openclaw-cloud-consciousness-real-provider-call-task",
      deferredSlice: "openclaw-cloud-consciousness-live-provider-call-runbook",
      status: redactionReview.summary?.ready === true ? "selected" : "blocked",
      reason: "Phase 10 may create an approved local provider-call rehearsal response; live provider egress remains deferred.",
      canCreateTask: redactionReview.summary?.ready === true,
      canWriteRehearsalAfterApproval: redactionReview.summary?.ready === true,
      canCallCloudProviderNow: false,
      storageScope: CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH,
    };
    const checks = [
      {
        id: "redaction-review-ready",
        label: "Provider request redaction review is ready",
        passed: redactionReview.summary?.ready === true,
        evidence: redactionReview.registry,
      },
      {
        id: "rehearsal-task-selected",
        label: "Route selects local approval-gated provider-call rehearsal task",
        passed: decision.selectedSlice === "openclaw-cloud-consciousness-real-provider-call-task",
        evidence: decision.selectedSlice,
      },
      {
        id: "live-call-deferred",
        label: "Live cloud provider egress remains deferred",
        passed: decision.canCallCloudProviderNow === false,
        evidence: decision.deferredSlice,
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-real-provider-call-route-review-v0",
      mode: "phase_10_cloud_consciousness_real_provider_call_route_review",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "cloud_consciousness_real_provider_call_route_selected" : "waiting_for_real_provider_call_route",
      governance: phase10Governance(),
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
        providerCredentialRead: false,
      },
      evidence: {
        redactionReview: compactCloudConsciousnessEvidenceRef(redactionReview),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-real-provider-call-task",
        boundary: "create the approval-gated provider-call rehearsal task without live egress",
      },
    };
  }

  async function createCloudConsciousnessProviderCallRehearsalTask({ confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Cloud consciousness real provider-call rehearsal task creation requires confirm=true.");
    }

    const routeReview = await buildCloudConsciousnessRealProviderCallRouteReview();
    if (routeReview.summary?.ready !== true || routeReview.decision?.selectedSlice !== "openclaw-cloud-consciousness-real-provider-call-task") {
      throw new Error("Cloud consciousness provider-call rehearsal task requires a ready route review.");
    }

    const redactionReview = await buildCloudConsciousnessProviderRequestRedactionReview();
    const requestEnvelopeReview = await buildCloudConsciousnessProviderRequestEnvelope();
    const requestEnvelope = requestEnvelopeReview.envelope ?? {};
    const policyRequest = {
      intent: "cloud_consciousness.provider_call.rehearsal",
      domain: "body_internal",
      risk: "high",
      requiresApproval: true,
      audit: true,
      tags: ["cloud_consciousness", "provider_call", "rehearsal_only", "operator_reviewed"],
    };
    const goal = `Record reviewed cloud-consciousness provider-call rehearsal ${requestEnvelope.id ?? "request"}`;
    const policyDecision = evaluatePolicyIntent({
      type: "cloud_consciousness_provider_call_rehearsal_task",
      goal,
      policy: policyRequest,
    }, {
      stage: "cloud_consciousness.provider_call_rehearsal_task.draft",
      type: "cloud_consciousness_provider_call_rehearsal_task",
      goal,
    });
    const providerCallRehearsal = {
      registry: CLOUD_CONSCIOUSNESS_PROVIDER_CALL_REHEARSAL_TASK_REGISTRY,
      routeReviewRegistry: routeReview.registry,
      requestRegistry: requestEnvelopeReview.registry ?? null,
      requestId: requestEnvelope.id ?? null,
      responseFileDisplayPath: CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH,
      artifactWritten: false,
      transmittedExternally: false,
      cloudCallExecuted: false,
      providerSdkLoaded: false,
      credentialRead: false,
    };
    const task = createTask({
      goal,
      type: "cloud_consciousness_provider_call_rehearsal_task",
      workViewStrategy: "cloud-consciousness-provider-call-rehearsal",
      policy: policyRequest,
      plan: {
        planner: "cloud-consciousness-real-provider-call-task-v0",
        strategy: "approval-gated-cloud-consciousness-provider-call-rehearsal",
        summary: "Record an approval-gated local provider-call response rehearsal without live provider egress.",
        governance: phase10Governance({ createsTask: true, createsApproval: true }),
        steps: [
          {
            id: "review-egress-and-redaction",
            phase: "review_provider_egress_and_redaction",
            title: "Review egress contract, credential preflight, and request redaction evidence",
            status: "pending",
            requestId: providerCallRehearsal.requestId,
            requiresApproval: false,
          },
          {
            id: "operator-approval",
            phase: "waiting_for_approval",
            title: "Wait for operator approval before writing the local provider-call rehearsal response",
            status: "pending",
            capabilityId: "act.filesystem.append_text",
            requiresApproval: true,
            risk: "high",
          },
          {
            id: "write-provider-response-rehearsal",
            phase: "cloud_consciousness_provider_response_rehearsal_write",
            title: "Append one local provider response rehearsal inside OpenClaw-owned artifacts",
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
    task.cloudConsciousnessProviderCallRehearsal = providerCallRehearsal;
    const approval = createApprovalRequestForTask(task, policyDecision);
    const reclaimedTasks = supersedeOtherActiveTasks(task.id);
    reconcileRuntimeState();
    persistState();

    await publishEvent(createEventName("task.created"), { task: serialiseTask(task), planner: "cloud-consciousness-real-provider-call-task-v0" });
    await publishTaskApprovalIfPending(task);
    await publishEvent(createEventName("task.planned"), { task: serialiseTask(task), plan: serialisePlanForPublic(task.plan) });
    await Promise.all(reclaimedTasks.map((reclaimedTask) => publishEvent(createEventName("task.phase_changed"), {
      task: serialiseTask(reclaimedTask),
    })));

    return {
      ok: true,
      registry: CLOUD_CONSCIOUSNESS_PROVIDER_CALL_REHEARSAL_TASK_REGISTRY,
      mode: "approval-gated-cloud-consciousness-provider-call-rehearsal-task",
      generatedAt: new Date().toISOString(),
      sourceRegistry: routeReview.registry,
      routeReview,
      requestEnvelope,
      task,
      approval,
      governance: phase10Governance({ createsTask: true, createsApproval: true }),
    };
  }

  function isCloudConsciousnessProviderCallRehearsalTask(task) {
    return task?.type === "cloud_consciousness_provider_call_rehearsal_task"
      && task?.cloudConsciousnessProviderCallRehearsal?.registry === CLOUD_CONSCIOUSNESS_PROVIDER_CALL_REHEARSAL_TASK_REGISTRY;
  }

  async function executeCloudConsciousnessProviderCallRehearsalTask(task) {
    const routeReview = await buildCloudConsciousnessRealProviderCallRouteReview();
    const redactionReview = await buildCloudConsciousnessProviderRequestRedactionReview();
    const requestEnvelopeEnvelope = await buildCloudConsciousnessProviderRequestEnvelope();
    const requestEnvelope = requestEnvelopeEnvelope.envelope ?? {};
    const responseFileDisplayPath = CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH;
    const responseFilePath = cloudConsciousnessProviderResponseFilePath();
    const createdAt = new Date().toISOString();
    const responseStub = {
      schema: "openclaw.cloud_consciousness.provider_response_rehearsal.v0",
      status: "rehearsed_not_sent",
      role: "assistant",
      content: "Local rehearsal response: provider request passed egress, credential, and redaction checks; no live provider call was executed.",
      recommendedNextAction: "prepare a human-visible live provider-call runbook before any external transmission",
    };
    const recordBase = {
      id: `cloud-provider-response-rehearsal-${randomUUID()}`,
      createdAt,
      schema: "openclaw.cloud_consciousness.provider_call_rehearsal.v0",
      requestId: requestEnvelope.id ?? null,
      requestContentHash: requestEnvelope.contentHash ?? null,
      sourceHandoff: requestEnvelope.sourceHandoff ?? null,
      governance: {
        taskId: task.id,
        approvalId: task.approval?.requestId ?? null,
        approved: isTaskPolicyApproved(task),
        liveCloudCallAllowed: false,
        externalTransmissionAllowed: false,
        networkCall: false,
        providerSdkLoaded: false,
        credentialRead: false,
        redactionPolicy: redactionReview.redaction?.policy ?? null,
      },
      egressTranscript: {
        providerEndpoint: null,
        providerCredential: null,
        endpointConfigured: false,
        credentialConfigured: false,
        networkCallAttempted: false,
        transmittedExternally: false,
        cloudCallExecuted: false,
        providerSdkLoaded: false,
      },
      responseStub,
    };
    const contentHash = createHash("sha256").update(JSON.stringify(recordBase)).digest("hex");
    const record = {
      ...recordBase,
      contentHash,
    };
    const line = `${JSON.stringify(record)}\n`;

    await setTaskPhase(task, "cloud_consciousness_provider_response_rehearsal_write", {
      status: "running",
      details: {
        executor: "cloud-consciousness-real-provider-call-task-v0",
        responseFile: responseFileDisplayPath,
        artifactWritten: false,
        cloudCallExecuted: false,
        transmittedExternally: false,
        providerSdkLoaded: false,
        credentialRead: false,
      },
    });

    mkdirSync(cloudConsciousnessProviderResponseDirPath(), { recursive: true });
    const result = await postJson(`${systemSenseUrl}/system/files/append-text`, {
      path: responseFilePath,
      content: line,
      encoding: "utf8",
      createIfMissing: true,
      intent: "cloud_consciousness.provider_call.rehearsal",
    });
    task.cloudConsciousnessProviderCallRehearsal = {
      ...(task.cloudConsciousnessProviderCallRehearsal ?? {}),
      responseFileDisplayPath,
      responseFilePath: result.path ?? responseFilePath,
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
      appendResult: {
        registry: "openclaw-cloud-consciousness-approved-provider-call-rehearsal-v0",
        mode: result.mode ?? "append_text",
        created: result.created === true,
        createIfMissing: result.createIfMissing === true,
        metadata: result.metadata ?? null,
      },
    };
    const completedTask = completeTask(task, {
      executor: "cloud-consciousness-real-provider-call-task-v0",
      summary: `Appended local provider-call response rehearsal ${record.id} to ${responseFileDisplayPath}.`,
      responseFile: responseFileDisplayPath,
      result,
      record,
      hostMutation: true,
      artifactWritten: true,
      transmittedExternally: false,
      cloudCallExecuted: false,
      providerSdkLoaded: false,
      credentialRead: false,
      scheduler: false,
      backgroundWriter: false,
    });
    await publishEvent(createEventName("cloud_consciousness.provider_call_rehearsal_written"), {
      task: serialiseTask(completedTask),
      responseFile: responseFileDisplayPath,
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
        registry: "openclaw-cloud-consciousness-approved-provider-call-rehearsal-v0",
        mode: "approved_local_cloud_provider_call_rehearsal",
        responseFile: responseFileDisplayPath,
        path: result.path ?? null,
        recordId: record.id,
        contentHash,
        hostMutation: true,
        artifactWritten: true,
        transmittedExternally: false,
        cloudCallExecuted: false,
        providerSdkLoaded: false,
        credentialRead: false,
        scheduler: false,
        backgroundWriter: false,
      },
    };
  }

  function buildCloudConsciousnessProviderResponseReadback() {
    const response = readCloudConsciousnessProviderResponseRecords();
    const validRecords = response.records.filter((record) => record.ok === true);
    const latest = validRecords.at(-1) ?? null;
    const checks = [
      {
        id: "response-file-readable",
        label: "Provider response rehearsal JSONL is readable",
        passed: response.exists === true,
        evidence: response.file,
      },
      {
        id: "response-record-present",
        label: "At least one approved local provider-call rehearsal response is present",
        passed: validRecords.length >= 1,
        evidence: `${validRecords.length} record(s)`,
      },
      {
        id: "response-not-transmitted",
        label: "Latest provider response rehearsal has no SDK, credential read, cloud call, or external transmission",
        passed: latest?.schema === "openclaw.cloud_consciousness.provider_call_rehearsal.v0"
          && latest?.governance?.networkCall === false
          && latest?.governance?.providerSdkLoaded === false
          && latest?.governance?.credentialRead === false
          && latest?.egressTranscript?.cloudCallExecuted === false
          && latest?.egressTranscript?.transmittedExternally === false
          && typeof latest?.contentHash === "string",
        evidence: latest?.id ?? "none",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-provider-response-readback-v0",
      mode: "phase_10_cloud_consciousness_provider_response_readback",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "cloud_consciousness_provider_response_readback_ready" : "waiting_for_cloud_provider_response_rehearsal",
      governance: phase10Governance(),
      response: {
        file: response.file,
        exists: response.exists,
        lineCount: response.lineCount,
        validRecordCount: validRecords.length,
        latest: latest ? {
          id: latest.id ?? null,
          schema: latest.schema ?? null,
          requestId: latest.requestId ?? null,
          requestContentHash: latest.requestContentHash ?? null,
          contentHash: latest.contentHash ?? null,
          createdAt: latest.createdAt ?? null,
          transmittedExternally: latest.egressTranscript?.transmittedExternally === true,
          cloudCallExecuted: latest.egressTranscript?.cloudCallExecuted === true,
          providerSdkLoaded: latest.governance?.providerSdkLoaded === true,
          credentialRead: latest.governance?.credentialRead === true,
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
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-real-provider-call-exit",
        boundary: "close Phase 10 after the approved local provider-call rehearsal response is readable and audit-safe",
      },
    };
  }


  async function buildCloudConsciousnessRealProviderCallExit() {
    const [
      plan,
      egressContract,
      credentialPreflight,
      redactionReview,
      routeReview,
    ] = await Promise.all([
      buildCloudConsciousnessRealProviderCallPlan(),
      buildCloudConsciousnessProviderEgressContract(),
      buildCloudConsciousnessProviderCredentialPreflight(),
      buildCloudConsciousnessProviderRequestRedactionReview(),
      buildCloudConsciousnessRealProviderCallRouteReview(),
    ]);
    const readback = buildCloudConsciousnessProviderResponseReadback();
    const checks = [
      {
        id: "real-provider-call-plan-ready",
        label: "Real provider-call plan is complete",
        passed: plan.summary?.ready === true,
        evidence: plan.registry,
      },
      {
        id: "egress-contract-ready",
        label: "Provider egress contract is complete",
        passed: egressContract.summary?.ready === true,
        evidence: egressContract.registry,
      },
      {
        id: "credential-preflight-ready",
        label: "Provider credential preflight is complete without reading credentials",
        passed: credentialPreflight.summary?.ready === true
          && credentialPreflight.summary?.providerCredentialRead === false,
        evidence: credentialPreflight.registry,
      },
      {
        id: "request-redaction-ready",
        label: "Provider request redaction review is complete",
        passed: redactionReview.summary?.ready === true,
        evidence: redactionReview.registry,
      },
      {
        id: "route-reviewed",
        label: "Real provider-call route review defers live egress",
        passed: routeReview.summary?.ready === true
          && routeReview.summary?.callsCloudModel === false,
        evidence: routeReview.registry,
      },
      {
        id: "response-readback-ready",
        label: "Approved local provider response rehearsal is readable",
        passed: readback.summary?.ready === true,
        evidence: readback.registry,
      },
    ];
    const passed = checks.filter((check) => check.passed).length;
    const complete = passed === checks.length;
    return {
      ok: true,
      registry: "openclaw-cloud-consciousness-real-provider-call-exit-v0",
      mode: "phase_10_cloud_consciousness_real_provider_call_exit_gate",
      generatedAt: new Date().toISOString(),
      status: complete ? "phase_10_complete" : "waiting_for_phase_10_real_provider_call_preflight",
      governance: phase10Governance(),
      completedPhase: {
        id: "phase-10",
        name: "Cloud Consciousness Real Provider Call Preflight and Local Response Rehearsal",
        completionClaim: complete ? "phase_10_complete" : "phase_10_incomplete",
      },
      checks,
      summary: {
        complete,
        ready: complete,
        passed,
        total: checks.length,
        completionPercent: complete ? 100 : Math.round((passed / checks.length) * 100),
        phase: "phase-10",
        recordCount: readback.summary?.recordCount ?? 0,
        latestRecordId: readback.summary?.latestRecordId ?? null,
        callsCloudModel: false,
        transmitsExternally: false,
        providerSdkLoaded: false,
        providerCredentialRead: false,
        createsTask: true,
        storageScope: CLOUD_CONSCIOUSNESS_PROVIDER_RESPONSE_FILE_DISPLAY_PATH,
      },
      evidence: {
        plan: compactCloudConsciousnessEvidenceRef(plan),
        egressContract: compactCloudConsciousnessEvidenceRef(egressContract),
        credentialPreflight: compactCloudConsciousnessEvidenceRef(credentialPreflight),
        redactionReview: compactCloudConsciousnessEvidenceRef(redactionReview),
        routeReview: compactCloudConsciousnessEvidenceRef(routeReview),
        readback: compactCloudConsciousnessEvidenceRef(readback),
      },
      next: {
        recommendedSlice: "openclaw-cloud-consciousness-live-provider-call-runbook",
        boundary: "only after the local real-call rehearsal is complete should a separate phase define a human-visible live provider-call runbook",
      },
    };
  }
  return {
    buildCloudConsciousnessRealProviderCallPlan,
    buildCloudConsciousnessProviderEgressContract,
    buildCloudConsciousnessProviderCredentialPreflight,
    buildCloudConsciousnessProviderRequestRedactionReview,
    buildCloudConsciousnessRealProviderCallRouteReview,
    createCloudConsciousnessProviderCallRehearsalTask,
    buildCloudConsciousnessProviderResponseReadback,
    buildCloudConsciousnessRealProviderCallExit,
    isCloudConsciousnessProviderCallRehearsalTask,
    executeCloudConsciousnessProviderCallRehearsalTask,
  };
}
