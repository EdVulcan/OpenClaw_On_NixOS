import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import { handleCloudConsciousnessReadRoute } from "../src/cloud-consciousness-read-routes.mjs";

const ROUTE_CASES = [
  ["/cloud-consciousness/context-review", "buildCloudConsciousnessContextReview"],
  ["/cloud-consciousness/envelope-schema", "buildCloudConsciousnessEnvelopeSchema"],
  ["/cloud-consciousness/context-package", "buildCloudConsciousnessContextPackage"],
  ["/cloud-consciousness/redaction-review", "buildCloudConsciousnessRedactionReview"],
  ["/cloud-consciousness/transmission-route-review", "buildCloudConsciousnessTransmissionRouteReview"],
  ["/cloud-consciousness/handoff-readback", "buildCloudConsciousnessHandoffReadback"],
  ["/cloud-consciousness/exit", "buildCloudConsciousnessExit"],
  ["/cloud-consciousness/provider-adapter-plan", "buildCloudConsciousnessProviderAdapterPlan"],
  ["/cloud-consciousness/provider-contract", "buildCloudConsciousnessProviderContract"],
  ["/cloud-consciousness/provider-request-envelope", "buildCloudConsciousnessProviderRequestEnvelope"],
  ["/cloud-consciousness/provider-dry-run-route-review", "buildCloudConsciousnessProviderDryRunRouteReview"],
  ["/cloud-consciousness/provider-dry-run-readback", "buildCloudConsciousnessProviderDryRunReadback"],
  ["/cloud-consciousness/provider-adapter-exit", "buildCloudConsciousnessProviderAdapterExit"],
  ["/cloud-consciousness/real-provider-call-plan", "buildCloudConsciousnessRealProviderCallPlan"],
  ["/cloud-consciousness/provider-egress-contract", "buildCloudConsciousnessProviderEgressContract"],
  ["/cloud-consciousness/provider-credential-preflight", "buildCloudConsciousnessProviderCredentialPreflight"],
  ["/cloud-consciousness/provider-request-redaction-review", "buildCloudConsciousnessProviderRequestRedactionReview"],
  ["/cloud-consciousness/real-provider-call-route-review", "buildCloudConsciousnessRealProviderCallRouteReview"],
  ["/cloud-consciousness/provider-response-readback", "buildCloudConsciousnessProviderResponseReadback"],
  ["/cloud-consciousness/real-provider-call-exit", "buildCloudConsciousnessRealProviderCallExit"],
  ["/cloud-consciousness/live-provider-call-runbook", "buildCloudConsciousnessLiveProviderCallRunbook"],
  ["/cloud-consciousness/live-provider-operator-checklist", "buildCloudConsciousnessLiveProviderOperatorChecklist"],
  ["/cloud-consciousness/live-provider-egress-transcript-schema", "buildCloudConsciousnessLiveProviderEgressTranscriptSchema"],
  ["/cloud-consciousness/live-provider-final-authorization-review", "buildCloudConsciousnessLiveProviderFinalAuthorizationReview"],
  ["/cloud-consciousness/live-provider-runbook-route-review", "buildCloudConsciousnessLiveProviderRunbookRouteReview"],
  ["/cloud-consciousness/live-provider-runbook-readback", "buildCloudConsciousnessLiveProviderRunbookReadback"],
  ["/cloud-consciousness/live-provider-call-runbook-exit", "buildCloudConsciousnessLiveProviderCallRunbookExit"],
  ["/cloud-consciousness/live-provider-call-execution-plan", "buildCloudConsciousnessLiveProviderCallExecutionPlan"],
  ["/cloud-consciousness/live-provider-endpoint-credential-binding", "buildCloudConsciousnessLiveProviderEndpointCredentialBinding"],
  ["/cloud-consciousness/live-provider-execution-transcript-schema", "buildCloudConsciousnessLiveProviderExecutionTranscriptSchema"],
  ["/cloud-consciousness/live-provider-execution-route-review", "buildCloudConsciousnessLiveProviderExecutionRouteReview"],
  ["/cloud-consciousness/live-provider-execution-plan-readback", "buildCloudConsciousnessLiveProviderExecutionPlanReadback"],
  ["/cloud-consciousness/live-provider-call-execution-plan-exit", "buildCloudConsciousnessLiveProviderCallExecutionPlanExit"],
  ["/cloud-consciousness/live-provider-call-runtime-adapter-plan", "buildCloudConsciousnessLiveProviderCallRuntimeAdapterPlan"],
  ["/cloud-consciousness/live-provider-runtime-adapter-exit", "buildCloudConsciousnessLiveProviderRuntimeAdapterExit"],
  ["/cloud-consciousness/live-provider-call-final-authorization", "buildCloudConsciousnessLiveProviderCallFinalAuthorization"],
  ["/cloud-consciousness/live-provider-call-operator-launch-review", "buildCloudConsciousnessLiveProviderCallOperatorLaunchReview"],
  ["/cloud-consciousness/live-provider-call-runtime-implementation-plan", "buildCloudConsciousnessLiveProviderCallRuntimeImplementationPlan"],
  ["/cloud-consciousness/live-provider-call-runtime-adapter-implementation", "buildCloudConsciousnessLiveProviderCallRuntimeAdapterImplementation"],
  ["/cloud-consciousness/live-provider-runtime-adapter-module-contract", "buildCloudConsciousnessLiveProviderRuntimeAdapterModuleContract"],
  ["/cloud-consciousness/live-provider-request-builder", "buildCloudConsciousnessLiveProviderRequestBuilder"],
  ["/cloud-consciousness/live-provider-credential-reference-resolver", "buildCloudConsciousnessLiveProviderCredentialReferenceResolver"],
  ["/cloud-consciousness/live-provider-no-network-sender", "buildCloudConsciousnessLiveProviderNoNetworkSender"],
  ["/cloud-consciousness/live-provider-egress-transcript-recorder", "buildCloudConsciousnessLiveProviderEgressTranscriptRecorder"],
  ["/cloud-consciousness/live-provider-response-verifier", "buildCloudConsciousnessLiveProviderResponseVerifier"],
  ["/cloud-consciousness/live-provider-rollback-note", "buildCloudConsciousnessLiveProviderRollbackNote"],
  ["/cloud-consciousness/live-provider-runtime-adapter-completion", "buildCloudConsciousnessLiveProviderRuntimeAdapterCompletion"],
  ["/cloud-consciousness/live-provider-runtime-adapter-closure-exit", "buildCloudConsciousnessLiveProviderRuntimeAdapterClosureExit"],
  ["/cloud-consciousness/live-provider-real-launch-route-review", "buildCloudConsciousnessLiveProviderRealLaunchRouteReview"],
  ["/cloud-consciousness/live-provider-real-launch-execution-preflight", "buildCloudConsciousnessLiveProviderRealLaunchExecutionPreflight"],
  ["/cloud-consciousness/live-provider-credential-value-access-gate", "buildCloudConsciousnessLiveProviderCredentialValueAccessGate"],
  ["/cloud-consciousness/live-provider-endpoint-network-egress-gate", "buildCloudConsciousnessLiveProviderEndpointNetworkEgressGate"],
  ["/cloud-consciousness/live-provider-egress-execution-route-task-preflight", "buildCloudConsciousnessLiveProviderEgressExecutionRouteTaskPreflight"],
  ["/cloud-consciousness/live-provider-egress-execution-approved-deferred", "buildCloudConsciousnessLiveProviderEgressExecutionApprovedDeferred"],
  ["/cloud-consciousness/live-provider-credential-value-authorization-route", "buildCloudConsciousnessLiveProviderCredentialValueAuthorizationRoute"],
  ["/cloud-consciousness/live-provider-credential-value-authorization-approved-deferred", "buildCloudConsciousnessLiveProviderCredentialValueAuthorizationApprovedDeferred"],
  ["/cloud-consciousness/live-provider-credential-value-readiness-preflight", "buildCloudConsciousnessLiveProviderCredentialValueReadinessPreflight"],
  ["/cloud-consciousness/live-provider-credential-value-read-approved-deferred", "buildCloudConsciousnessLiveProviderCredentialValueReadApprovedDeferred"],
  ["/cloud-consciousness/live-provider-credential-value-access-authorization-route", "buildCloudConsciousnessLiveProviderCredentialValueAccessAuthorizationRoute"],
  ["/cloud-consciousness/live-provider-credential-value-access-authorization-approved-deferred", "buildCloudConsciousnessLiveProviderCredentialValueAccessAuthorizationApprovedDeferred"],
  ["/cloud-consciousness/live-provider-credential-value-final-readiness-preflight", "buildCloudConsciousnessLiveProviderCredentialValueFinalReadinessPreflight"],
  ["/cloud-consciousness/live-provider-credential-value-access-authorization-decision-route", "buildCloudConsciousnessLiveProviderCredentialValueAccessAuthorizationDecisionRoute"],
  ["/cloud-consciousness/live-provider-credential-value-access-authorization-decision-approved-deferred", "buildCloudConsciousnessLiveProviderCredentialValueAccessAuthorizationDecisionApprovedDeferred"],
  ["/cloud-consciousness/live-provider-credential-value-access-authorized-local-proof", "buildCloudConsciousnessLiveProviderCredentialValueAccessAuthorizedLocalProof"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-route", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadRoute"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-approved-deferred", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadApprovedDeferred"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-final-readiness-preflight", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadFinalReadinessPreflight"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-route", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionRoute"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-approved-deferred", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionApprovedDeferred"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-final-readiness-preflight", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionFinalReadinessPreflight"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-route", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadRoute"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-approved-deferred", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadApprovedDeferred"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-final-readiness-preflight", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadFinalReadinessPreflight"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-attempt-route", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptRoute"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-attempt-approved-deferred", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptApprovedDeferred"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-attempt-final-readiness-preflight", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptFinalReadinessPreflight"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-attempt-local-read-route", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadRoute"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-attempt-local-read-approved-deferred", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadApprovedDeferred"],
  ["/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-attempt-local-read-final-readiness-preflight", "buildCloudConsciousnessLiveProviderCredentialValueLocalReadExecutionLocalReadAttemptLocalReadFinalReadinessPreflight"],
];

async function invokeCloudConsciousnessReadRoute(planBuilder, method, path) {
  const req = Readable.from([]);
  req.method = method;
  req.headers = {};

  let statusCode = null;
  let headers = null;
  let payload = "";
  const res = {
    writeHead(code, responseHeaders) {
      statusCode = code;
      headers = responseHeaders;
    },
    end(chunk = "") {
      payload = String(chunk);
    },
  };

  const handled = await handleCloudConsciousnessReadRoute({
    req,
    res,
    requestUrl: new URL(path, "http://127.0.0.1:4100"),
    planBuilder,
  });

  return {
    handled,
    statusCode,
    headers,
    body: payload ? JSON.parse(payload) : null,
  };
}

test("cloud consciousness read route maps every moved GET path to its builder", async () => {
  for (const [path, builderName] of ROUTE_CASES) {
    const response = await invokeCloudConsciousnessReadRoute({
      [builderName]: () => ({
        ok: true,
        path,
        builderName,
      }),
    }, "GET", path);

    assert.equal(response.handled, true, path);
    assert.equal(response.statusCode, 200, path);
    assert.match(response.headers["content-type"], /application\/json/, path);
    assert.deepEqual(response.body, { ok: true, path, builderName }, path);
  }
});

test("cloud consciousness read route reports misses without writing a response", async () => {
  const unknown = await invokeCloudConsciousnessReadRoute({}, "GET", "/cloud-consciousness/live-provider-credential-value-local-read-execution-local-read-attempt-local-read-result-envelope-route");

  assert.equal(unknown.handled, false);
  assert.equal(unknown.statusCode, null);
  assert.equal(unknown.body, null);

  const postOverlap = await invokeCloudConsciousnessReadRoute({}, "POST", "/cloud-consciousness/live-provider-egress-execution-route-task-preflight");

  assert.equal(postOverlap.handled, false);
  assert.equal(postOverlap.statusCode, null);
  assert.equal(postOverlap.body, null);
});
