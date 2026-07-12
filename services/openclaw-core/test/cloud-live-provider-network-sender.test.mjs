import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLiveProviderConfig,
  buildLiveProviderEgressGate,
  sendLiveProviderRequest,
  CLOUD_PROVIDER_API_KEY_ENV,
  CLOUD_PROVIDER_ENDPOINT_ENV,
  CLOUD_PROVIDER_LIVE_EGRESS_ENV,
} from "../src/cloud-live-provider-network-sender.mjs";

const credentialReference = "openclaw://credential/test-provider-key";
const authorised = {
  state: "authorized",
  confirmed: true,
  credentialValueAccessAuthorized: true,
  endpointNetworkEgressAuthorized: true,
  liveProviderCallEnabled: true,
};

function providerRequest(body = {}) {
  return {
    request: {
      credentialReference,
      body: {
        model: "operator-selected-model",
        messages: [{ role: "user", content: "hello" }],
        ...body,
      },
    },
  };
}

function responseFromJson(value, { status = 200, ok = status >= 200 && status < 300 } = {}) {
  const text = JSON.stringify(value);
  return {
    ok,
    status,
    headers: { get: () => String(Buffer.byteLength(text, "utf8")) },
    text: async () => text,
  };
}

test("live provider configuration is disabled and invalid without an explicit endpoint", () => {
  const config = buildLiveProviderConfig({ env: {} });
  assert.equal(config.ok, false);
  assert.equal(config.liveEgressEnabled, false);
  assert.equal(config.endpoint.allowed, false);
  assert.equal(config.endpoint.requestUrl, null);
});

test("the egress gate rejects a non-DeepSeek endpoint and incomplete authorization", () => {
  const config = buildLiveProviderConfig({
    env: {
      [CLOUD_PROVIDER_ENDPOINT_ENV]: "https://example.invalid",
      [CLOUD_PROVIDER_LIVE_EGRESS_ENV]: "true",
    },
  });
  const gate = buildLiveProviderEgressGate({ config, operatorAuthorization: {} });
  assert.equal(gate.allowed, false);
  assert.equal(gate.checks.endpointAllowlisted, false);
  assert.equal(gate.checks.operatorAuthorized, false);
});

test("a denied gate does not read the credential or call fetch", async () => {
  let credentialRead = false;
  const env = new Proxy({
    [CLOUD_PROVIDER_ENDPOINT_ENV]: "https://api.deepseek.com",
    [CLOUD_PROVIDER_LIVE_EGRESS_ENV]: "false",
  }, {
    get(target, property, receiver) {
      if (property === CLOUD_PROVIDER_API_KEY_ENV) credentialRead = true;
      return Reflect.get(target, property, receiver);
    },
  });
  let fetchCalled = false;
  const result = await sendLiveProviderRequest({
    env,
    providerRequest: providerRequest(),
    credentialResolution: { credential: { reference: credentialReference } },
    fetchImpl: async () => {
      fetchCalled = true;
      throw new Error("fetch should not run");
    },
    operatorAuthorization: authorised,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "live_provider_egress_gate_not_satisfied");
  assert.equal(credentialRead, false);
  assert.equal(fetchCalled, false);
});

test("authorised DeepSeek request sends only bounded chat fields and redacts credential output", async () => {
  const secret = "test-secret-value";
  let capturedUrl;
  let capturedOptions;
  const result = await sendLiveProviderRequest({
    env: {
      [CLOUD_PROVIDER_ENDPOINT_ENV]: "https://api.deepseek.com",
      [CLOUD_PROVIDER_API_KEY_ENV]: secret,
      [CLOUD_PROVIDER_LIVE_EGRESS_ENV]: "true",
    },
    providerRequest: providerRequest({
      metadata: { shouldNotLeaveOpenClaw: true },
      temperature: 0.2,
      max_tokens: 64,
    }),
    credentialResolution: { credential: { reference: credentialReference } },
    operatorAuthorization: authorised,
    fetchImpl: async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return responseFromJson({
        id: "chatcmpl-test",
        model: "deepseek-chat",
        choices: [{ message: { role: "assistant", content: "hello from DeepSeek" } }],
        usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
      });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(capturedUrl, "https://api.deepseek.com/v1/chat/completions");
  assert.equal(capturedOptions.headers.authorization, `Bearer ${secret}`);
  const sentBody = JSON.parse(capturedOptions.body);
  assert.deepEqual(sentBody, {
    model: "deepseek-chat",
    messages: [{ role: "user", content: "hello" }],
    max_tokens: 64,
    temperature: 0.2,
  });
  assert.equal(result.response.assistantContent, "hello from DeepSeek");
  assert.equal(result.governance.credentialValueExposed, false);
  assert.equal(result.audit.providerResponseCreated, true);
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test("provider HTTP errors remain bounded and do not expose the credential", async () => {
  const secret = "test-secret-value";
  const result = await sendLiveProviderRequest({
    env: {
      [CLOUD_PROVIDER_ENDPOINT_ENV]: "https://api.deepseek.com",
      [CLOUD_PROVIDER_API_KEY_ENV]: secret,
      [CLOUD_PROVIDER_LIVE_EGRESS_ENV]: "true",
    },
    providerRequest: providerRequest(),
    credentialResolution: { credential: { reference: credentialReference } },
    operatorAuthorization: authorised,
    fetchImpl: async () => responseFromJson({ error: { code: "bad_request", message: "request rejected" } }, { status: 400, ok: false }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_http_error");
  assert.equal(result.status, 400);
  assert.equal(JSON.stringify(result).includes(secret), false);
});
