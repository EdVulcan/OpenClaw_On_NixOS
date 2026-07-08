import { sendJson } from "../../../packages/shared-utils/src/http.mjs";

const BODY_EVIDENCE_GET_ROUTES = new Map([
  ["/system/route/body-evidence-timeline", "buildBodyEvidenceTimeline"],
  ["/system/route/body-evidence-timeline-readiness", "buildBodyEvidenceTimelineReadiness"],
  ["/system/route/body-evidence-ledger-plan", "buildBodyEvidenceLedgerPlan"],
  ["/system/route/body-evidence-ledger-route-review", "buildBodyEvidenceLedgerRouteReview"],
  ["/system/route/body-evidence-ledger-storage-root-plan", "buildBodyEvidenceLedgerStorageRootPlan"],
  ["/system/route/body-evidence-ledger-storage-root-route-review", "buildBodyEvidenceLedgerStorageRootRouteReview"],
  ["/system/route/body-evidence-ledger-first-record-plan", "buildBodyEvidenceLedgerFirstRecordPlan"],
  ["/system/route/body-evidence-ledger-first-record-route-review", "buildBodyEvidenceLedgerFirstRecordRouteReview"],
  ["/system/route/body-evidence-ledger-readiness", "buildBodyEvidenceLedgerReadiness"],
  ["/system/route/body-evidence-ledger-demo-status", "buildBodyEvidenceLedgerDemoStatus"],
  ["/system/route/body-evidence-ledger-followup-record-plan", "buildBodyEvidenceLedgerFollowupRecordPlan"],
  [
    "/system/route/body-evidence-ledger-followup-record-route-review",
    "buildBodyEvidenceLedgerFollowupRecordRouteReview",
  ],
]);

export async function handleSystemBodyEvidenceRoutes({ req, res, requestUrl, builders }) {
  if (req.method !== "GET") {
    return false;
  }

  const builderName = BODY_EVIDENCE_GET_ROUTES.get(requestUrl.pathname);
  if (!builderName) {
    return false;
  }

  const payload = await builders[builderName]();
  sendJson(res, 200, payload);
  return true;
}
