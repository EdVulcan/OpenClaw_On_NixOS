export const observerClientRuntimeEngineeringPlanScript = `const ENGINEERING_PLAN_CONTRACT = "engineering_plan_v0";
const ENGINEERING_PLAN_REGISTRY = "openclaw-cloud-consciousness-live-provider-engineering-plan-v0";
const MAX_ENGINEERING_PLAN_TODOS = 8;
const FORBIDDEN_ENGINEERING_PLAN_CONTENT = /(?:https?:\\/\\/|file:\\/\\/|[\\\\/]|\\b(?:password|passwd|secret|token|api[_-]?key|credential)\\b|Bearer\\s+|\\bsk-[A-Za-z0-9_-]{16,}\\b)/iu;
let latestEngineeringPlan = null;

function engineeringPlanFromResult(result) {
  const candidates = [];
  if (result?.execution?.plan) candidates.push({ plan: result.execution.plan, result });
  if (result?.plan) candidates.push({ plan: result.plan, result });
  for (const step of result?.steps ?? []) {
    if (step?.execution?.plan) candidates.push({ plan: step.execution.plan, result: step });
  }
  return candidates.at(-1) ?? null;
}

function engineeringPlanSourceTaskId(result) {
  return [
    result?.execution?.contextPacket?.sourceTaskId,
    result?.execution?.summary?.contextPacket?.sourceTaskId,
    result?.summary?.contextPacket?.sourceTaskId,
    result?.task?.cloudConsciousnessLiveProviderEgressExecution?.requestBinding?.sourceTaskId,
    result?.task?.id,
  ].find((value) => typeof value === "string" && value.trim())?.trim() ?? null;
}

function validateEngineeringPlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error("No transient AI engineering plan is available.");
  }
  if (plan.registry !== ENGINEERING_PLAN_REGISTRY || plan.contract !== ENGINEERING_PLAN_CONTRACT) {
    throw new Error("AI engineering plan contract is not supported.");
  }
  if (plan.requiresOperatorReview !== true
    || plan.createsTaskAutomatically !== false
    || plan.createsApprovalAutomatically !== false
    || plan.executesAutomatically !== false) {
    throw new Error("AI engineering plan requires explicit operator review and cannot execute automatically.");
  }
  if (typeof plan.planSummary !== "string" || !plan.planSummary.trim() || plan.planSummary.length > 240
    || FORBIDDEN_ENGINEERING_PLAN_CONTENT.test(plan.planSummary)) {
    throw new Error("AI engineering plan summary is invalid.");
  }
  if (!Array.isArray(plan.todos) || plan.todos.length < 1 || plan.todos.length > MAX_ENGINEERING_PLAN_TODOS) {
    throw new Error("AI engineering plan todo count is outside the bound.");
  }
  const ids = new Set();
  for (const todo of plan.todos) {
    if (!todo || typeof todo !== "object" || Array.isArray(todo)
      || typeof todo.id !== "string" || !todo.id.trim() || todo.id.length > 80
      || typeof todo.description !== "string" || !todo.description.trim() || todo.description.length > 240
      || ids.has(todo.id)
      || FORBIDDEN_ENGINEERING_PLAN_CONTENT.test(todo.id)
      || FORBIDDEN_ENGINEERING_PLAN_CONTENT.test(todo.description)) {
      throw new Error("AI engineering plan todo content is invalid.");
    }
    ids.add(todo.id);
  }
  return plan;
}

function renderEngineeringPlanReadback(plan, sourceTaskId) {
  latestEngineeringPlan = null;
  if (!engineeringProviderPlanStatus || !engineeringProviderPlanApplyButton || !engineeringProviderPlanJson) {
    return;
  }
  if (!plan) {
    engineeringProviderPlanStatus.textContent = "none";
    engineeringProviderPlanApplyButton.disabled = true;
    engineeringProviderPlanJson.textContent = "No transient AI plan draft available.";
    return;
  }
  try {
    validateEngineeringPlan(plan);
    if (!sourceTaskId) {
      throw new Error("AI engineering plan has no existing source task for workbench review.");
    }
    latestEngineeringPlan = { plan, sourceTaskId };
    engineeringProviderPlanStatus.textContent = "ready_for_review";
    engineeringProviderPlanApplyButton.disabled = false;
    engineeringProviderPlanJson.textContent = JSON.stringify({
      registry: plan.registry,
      contract: plan.contract,
      status: "transient_plan_ready_for_operator_review",
      sourceTaskId,
      planSummary: plan.planSummary,
      todos: plan.todos,
      requiresOperatorReview: true,
      createsTaskAutomatically: false,
      createsApprovalAutomatically: false,
      executesAutomatically: false,
    }, null, 2);
  } catch (error) {
    engineeringProviderPlanStatus.textContent = "blocked";
    engineeringProviderPlanApplyButton.disabled = true;
    engineeringProviderPlanJson.textContent = JSON.stringify({
      status: "invalid_transient_plan",
      reason: formatError(error),
      boundary: "No workbench state was changed.",
    }, null, 2);
  }
}

function renderEngineeringPlanFromOperatorResult(result) {
  const candidate = engineeringPlanFromResult(result);
  renderEngineeringPlanReadback(candidate?.plan ?? null, engineeringPlanSourceTaskId(candidate?.result ?? result));
}

async function applyEngineeringPlanToWorkbench() {
  if (!latestEngineeringPlan) {
    throw new Error("No reviewed AI engineering plan is available.");
  }
  validateEngineeringPlan(latestEngineeringPlan.plan);
  engineeringProviderPlanApplyButton.disabled = true;
  try {
    const response = await fetchJson(\`\${observerConfig.coreUrl}/capabilities/invoke\`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        capabilityId: "act.openclaw.engineering_context.plan_todo_workbench_state",
        approved: true,
        params: {
          confirm: true,
          taskId: latestEngineeringPlan.sourceTaskId,
          source: "observer_ai_plan_review",
          planSummary: latestEngineeringPlan.plan.planSummary,
          confirmedPlan: latestEngineeringPlan.plan.planSummary,
          todos: latestEngineeringPlan.plan.todos.map((todo) => ({
            id: todo.id,
            description: todo.description,
            status: "pending",
          })),
        },
      }),
    });
    if (response.invoked !== true || response.result?.ok !== true) {
      throw new Error(response.result?.reason ?? response.reason ?? "AI plan workbench save was blocked.");
    }
    engineeringProviderPlanStatus.textContent = \`saved_revision_\${response.result?.record?.revision ?? "unknown"}\`;
    engineeringProviderPlanJson.textContent += "\\n\\nSaved only after explicit operator confirmation through the existing workbench capability.";
    setControlMessage(\`Saved the reviewed AI plan to workbench revision \${response.result?.record?.revision ?? "unknown"}; no task execution started.\`);
    if (typeof refreshEngineeringPlanTodoEvidence === "function") {
      await refreshEngineeringPlanTodoEvidence();
    }
  } catch (error) {
    engineeringProviderPlanStatus.textContent = "blocked";
    setControlMessage(\`AI plan workbench save was blocked: \${formatError(error)}\`);
    throw error;
  } finally {
    engineeringProviderPlanApplyButton.disabled = false;
  }
}

engineeringProviderPlanApplyButton?.addEventListener("click", () => {
  void applyEngineeringPlanToWorkbench().catch(() => {});
});

`;
