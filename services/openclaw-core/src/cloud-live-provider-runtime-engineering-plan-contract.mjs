export const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_CONTRACT =
  "engineering_plan_v0";
export const CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_REGISTRY =
  "openclaw-cloud-consciousness-live-provider-engineering-plan-v0";

const MAX_PLAN_SUMMARY_CHARS = 240;
const MAX_TODO_COUNT = 8;
const MAX_TODO_ID_CHARS = 80;
const MAX_TODO_DESCRIPTION_CHARS = 240;
const TOP_LEVEL_KEYS = new Set(["planSummary", "todos", "requiresOperatorReview"]);
const TODO_KEYS = new Set(["id", "description"]);
const FORBIDDEN_CONTENT = /(?:https?:\/\/|file:\/\/|[\\/]|\b(?:password|passwd|secret|token|api[_-]?key|credential)\b|Bearer\s+|\bsk-[A-Za-z0-9_-]{16,}\b)/iu;

function boundedText(value, maxChars) {
  return typeof value === "string" ? value.trim() : "";
}

function responseJsonText(value) {
  const text = boundedText(value, 16_000);
  if (!text.startsWith("```")) return text;
  const lines = text.split("\n");
  if (lines.length < 3 || !lines.at(-1).trim().startsWith("```")) return text;
  return lines.slice(1, -1).join("\n").trim();
}

function invalidEvidence(reason, responseContentHash) {
  return {
    registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_REGISTRY,
    contract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_CONTRACT,
    status: "invalid_plan",
    valid: false,
    reason,
    planTodoCount: 0,
    planSummaryChars: 0,
    contentIncluded: false,
    responseContentHash: responseContentHash ?? null,
  };
}

function invalidText(value, maxChars) {
  const text = boundedText(value, maxChars);
  return !text || text.length > maxChars || FORBIDDEN_CONTENT.test(text);
}

export function buildCloudLiveProviderEngineeringPlanInstruction() {
  return [
    "Return only a JSON object with keys planSummary, todos, and requiresOperatorReview.",
    "planSummary must be a concise string of at most 240 characters.",
    "todos must contain 1 to 8 objects, each with only id and description; each field is bounded and statuses are assigned by OpenClaw after review.",
    "requiresOperatorReview must be true.",
    "Do not include commands, file paths, URLs, credentials, secrets, automatic task creation, approval, or execution requests.",
  ].join(" ");
}

export function parseCloudLiveProviderEngineeringPlan({
  contract,
  assistantContent,
  responseContentHash = null,
} = {}) {
  if (contract === undefined || contract === null) {
    return { ok: true, plan: null, evidence: null };
  }
  if (contract !== CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_CONTRACT) {
    return {
      ok: false,
      reason: "provider_engineering_plan_contract_not_supported",
      plan: null,
      evidence: invalidEvidence("contract_not_supported", responseContentHash),
    };
  }

  const text = responseJsonText(assistantContent);
  if (!text) {
    return {
      ok: false,
      reason: "provider_engineering_plan_empty_response",
      plan: null,
      evidence: invalidEvidence("empty_response", responseContentHash),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      reason: "provider_engineering_plan_invalid_json",
      plan: null,
      evidence: invalidEvidence("invalid_json", responseContentHash),
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      reason: "provider_engineering_plan_object_required",
      plan: null,
      evidence: invalidEvidence("object_required", responseContentHash),
    };
  }

  if (Object.keys(parsed).some((key) => !TOP_LEVEL_KEYS.has(key))) {
    return {
      ok: false,
      reason: "provider_engineering_plan_keys_not_allowed",
      plan: null,
      evidence: invalidEvidence("keys_not_allowed", responseContentHash),
    };
  }
  const planSummary = boundedText(parsed.planSummary, MAX_PLAN_SUMMARY_CHARS);
  const todos = parsed.todos;
  if (parsed.requiresOperatorReview !== true
    || invalidText(parsed.planSummary, MAX_PLAN_SUMMARY_CHARS)
    || !Array.isArray(todos)
    || todos.length < 1
    || todos.length > MAX_TODO_COUNT) {
    return {
      ok: false,
      reason: "provider_engineering_plan_fields_invalid",
      plan: null,
      evidence: invalidEvidence("fields_invalid", responseContentHash),
    };
  }

  const seenIds = new Set();
  const normalisedTodos = [];
  for (const item of todos) {
    if (!item || typeof item !== "object" || Array.isArray(item)
      || Object.keys(item).some((key) => !TODO_KEYS.has(key))) {
      return {
        ok: false,
        reason: "provider_engineering_plan_todo_shape_invalid",
        plan: null,
        evidence: invalidEvidence("todo_shape_invalid", responseContentHash),
      };
    }
    const id = boundedText(item.id, MAX_TODO_ID_CHARS);
    const description = boundedText(item.description, MAX_TODO_DESCRIPTION_CHARS);
    if (invalidText(item.id, MAX_TODO_ID_CHARS)
      || invalidText(item.description, MAX_TODO_DESCRIPTION_CHARS)
      || seenIds.has(id)) {
      return {
        ok: false,
        reason: "provider_engineering_plan_todo_fields_invalid",
        plan: null,
        evidence: invalidEvidence("todo_fields_invalid", responseContentHash),
      };
    }
    seenIds.add(id);
    normalisedTodos.push({
      id,
      description,
      status: "pending",
      source: "provider_transient_plan",
      writesFile: false,
      mutatesTask: false,
    });
  }

  return {
    ok: true,
    plan: {
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_REGISTRY,
      contract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_CONTRACT,
      planSummary,
      todos: normalisedTodos,
      requiresOperatorReview: true,
      createsTaskAutomatically: false,
      createsApprovalAutomatically: false,
      executesAutomatically: false,
    },
    evidence: {
      registry: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_REGISTRY,
      contract: CLOUD_CONSCIOUSNESS_LIVE_PROVIDER_ENGINEERING_PLAN_CONTRACT,
      status: "valid_plan",
      valid: true,
      reason: null,
      planTodoCount: normalisedTodos.length,
      planSummaryChars: planSummary.length,
      contentIncluded: false,
      responseContentHash: responseContentHash ?? null,
    },
  };
}
