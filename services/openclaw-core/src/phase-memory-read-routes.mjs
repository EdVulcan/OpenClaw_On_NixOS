import { sendJson } from "../../../packages/shared-utils/src/http.mjs";

function phase2NextCapabilityRouteReviewInput(requestUrl) {
  return {
    ledgerDemoStatusCheckpointComplete: requestUrl.searchParams.get("afterLedgerDemoStatus") === "true",
    repairCandidateDemoCheckpointComplete: requestUrl.searchParams.get("afterRepairCandidateDemoStatus") === "true",
  };
}

const GET_ROUTES = new Map([
  ["/mvp/route", { builder: "buildMvpRouteAlignment" }],
  ["/phase-2/repair-demo-status", { builder: "buildPhase2RepairDemoStatus" }],
  ["/phase-2/next-repair-demo-status", { builder: "buildPhase2NextRepairDemoStatus" }],
  ["/phase-2/body-evidence-ledger-followup-record-readiness", { builder: "buildBodyEvidenceLedgerFollowupRecordReadiness" }],
  ["/phase-2/body-evidence-ledger-followup-record-append-route-review", { builder: "buildBodyEvidenceLedgerFollowupRecordAppendRouteReview" }],
  ["/phase-2/body-evidence-ledger-followup-record-append-readiness", { builder: "buildBodyEvidenceLedgerFollowupRecordAppendReadiness" }],
  ["/phase-2/demo-control-room", { builder: "buildPhase2DemoControlRoom" }],
  ["/phase-2/demo-walkthrough", { builder: "buildPhase2DemoWalkthrough" }],
  ["/phase-2/demo-readiness-exit", { builder: "buildPhase2DemoReadinessExit" }],
  [
    "/phase-2/next-capability-route-review",
    {
      builder: "buildPhase2NextCapabilityRouteReview",
      input: phase2NextCapabilityRouteReviewInput,
    },
  ],
  ["/phase-2/completion-readiness", { builder: "buildPhase2CompletionReadiness" }],
  ["/phase-2/exit", { builder: "buildPhase2Exit" }],
  ["/phase-3/plan", { builder: "buildPhase3Plan" }],
  ["/phase-3/background-work-view", { builder: "buildPhase3BackgroundWorkView" }],
  ["/phase-3/operator-interrupt-controls", { builder: "buildPhase3OperatorInterruptControls" }],
  ["/phase-3/completion-readiness", { builder: "buildPhase3CompletionReadiness" }],
  ["/phase-3/exit", { builder: "buildPhase3Exit" }],
  ["/phase-4/plan", { builder: "buildPhase4Plan" }],
  ["/phase-4/self-heal-loop", { builder: "buildPhase4SelfHealLoop" }],
  ["/phase-4/heal-history-evidence", { builder: "buildPhase4HealHistoryEvidence" }],
  ["/phase-4/completion-readiness", { builder: "buildPhase4CompletionReadiness" }],
  ["/phase-4/exit", { builder: "buildPhase4Exit" }],
  ["/phase-5/plan", { builder: "buildPhase5Plan" }],
  ["/phase-5/deployment-inventory", { builder: "buildPhase5DeploymentInventory" }],
  ["/phase-5/rollback-readiness", { builder: "buildPhase5RollbackReadiness" }],
  ["/phase-5/release-control-readiness", { builder: "buildPhase5ReleaseControlReadiness" }],
  ["/phase-5/exit", { builder: "buildPhase5Exit" }],
  ["/mvp/final-readiness", { builder: "buildMvpFinalReadiness" }],
  ["/post-mvp/plan", { builder: "buildPostMvpPlan" }],
  ["/phase-6/plan", { builder: "buildPhase6Plan" }],
  ["/phase-6/memory-substrate-inventory", { builder: "buildPhase6MemorySubstrateInventory" }],
  ["/phase-6/consciousness-context-envelope", { builder: "buildPhase6ConsciousnessContextEnvelope" }],
  ["/phase-6/task-orchestration-records", { builder: "buildPhase6TaskOrchestrationRecords" }],
  ["/phase-6/memory-write-route-review", { builder: "buildPhase6MemoryWriteRouteReview" }],
  ["/phase-6/exit", { builder: "buildPhase6Exit" }],
  ["/long-term-memory/write-plan", { builder: "buildLongTermMemoryWritePlan" }],
  ["/long-term-memory/schema", { builder: "buildLongTermMemorySchema" }],
  ["/long-term-memory/proposal", { builder: "buildLongTermMemoryProposal" }],
  ["/long-term-memory/write-route-review", { builder: "buildLongTermMemoryWriteRouteReview" }],
  ["/long-term-memory/readback", { builder: "buildLongTermMemoryReadback" }],
  ["/long-term-memory/exit", { builder: "buildLongTermMemoryExit" }],
]);

export async function handlePhaseMemoryReadRoute({
  req,
  res,
  requestUrl,
  planBuilder,
}) {
  if (req.method !== "GET") {
    return false;
  }
  const route = GET_ROUTES.get(requestUrl.pathname);
  if (!route) {
    return false;
  }
  const input = route.input ? route.input(requestUrl) : undefined;
  const result = await planBuilder[route.builder](input);
  sendJson(res, 200, result);
  return true;
}
