import { createHash } from "node:crypto";

import { createEventName } from "../../../packages/shared-events/src/event-factory.mjs";
import { validateFixedUnitIncidentTask } from "./fixed-unit-incident-scheduler.mjs";

export const FIXED_UNIT_INCIDENT_TRIAGE_REGISTRY =
  "openclaw-fixed-unit-incident-triage-v0";
export const FIXED_UNIT_INCIDENT_TRIAGE_TASK_TYPE =
  "systemd_fixed_unit_incident_triage_task";

function bindingHash(binding) {
  return `sha256:${createHash("sha256").update(JSON.stringify(binding)).digest("hex")}`;
}

function sourceTaskId(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 128) {
    throw new Error("Fixed-unit incident triage requires a bounded sourceTaskId.");
  }
  return value.trim();
}

function findExistingTriage(tasks, sourceId, fingerprint) {
  return [...tasks.values()].find((task) => (
    task.type === FIXED_UNIT_INCIDENT_TRIAGE_TASK_TYPE
    && task.status === "completed"
    && task.systemdIncidentTriage?.source?.taskId === sourceId
    && task.systemdIncidentTriage?.source?.fingerprint === fingerprint
  )) ?? null;
}

function assertCurrentSchedulerSource(schedulerState, sourceTask, observation, target) {
  const unitState = schedulerState.units?.[target.unit];
  if (unitState?.status !== "unhealthy"
    || unitState.fingerprint !== observation.fingerprint
    || unitState.latestTaskId !== sourceTask.id) {
    throw new Error("Fixed-unit incident triage requires the scheduler's current unhealthy fingerprint.");
  }
}

export function createFixedUnitIncidentTriageBuilders({
  tasks = new Map(),
  schedulerState = {},
  buildSystemdRepairExecutionTaskDraft,
  evaluatePolicyIntent,
  createTask,
  completeTask,
  persistState = () => {},
  publishEvent = async () => ({ ok: true }),
  serialiseTask = (task) => task,
  now = () => new Date().toISOString(),
} = {}) {
  const inFlightBySourceTask = new Map();

  async function performFixedUnitIncidentTriage(sourceId) {
    const sourceTask = tasks.get(sourceId);
    const validation = validateFixedUnitIncidentTask(sourceTask);
    if (!validation.ok) {
      throw new Error(`Fixed-unit incident triage rejected source: ${validation.reason}.`);
    }
    const observation = validation.observation;
    assertCurrentSchedulerSource(schedulerState, sourceTask, observation, validation.target);

    const existing = findExistingTriage(tasks, sourceTask.id, observation.fingerprint);
    if (existing) {
      return {
        registry: FIXED_UNIT_INCIDENT_TRIAGE_REGISTRY,
        mode: "operator_reviewed_local_triage",
        generatedAt: existing.systemdIncidentTriage?.createdAt ?? existing.createdAt ?? null,
        task: existing,
        triage: existing.systemdIncidentTriage,
        governance: {
          createdTask: false,
          reusedExistingTask: true,
          createsApproval: false,
          executesRepair: false,
          invokesHostd: false,
          callsProvider: false,
        },
      };
    }

    const repairDraft = await buildSystemdRepairExecutionTaskDraft({
      unit: validation.target.unit,
      execute: false,
    });
    if (repairDraft?.target?.unit !== validation.target.unit
      || repairDraft?.governance?.createsTask !== false
      || repairDraft?.governance?.createsApproval !== false
      || repairDraft?.governance?.hostMutation !== false) {
      throw new Error("Fixed-unit incident triage repair draft crossed the planning boundary.");
    }
    assertCurrentSchedulerSource(schedulerState, sourceTask, observation, validation.target);

    const createdAt = now();
    const binding = {
      sourceTaskId: sourceTask.id,
      sourceFingerprint: observation.fingerprint,
      sourceObservedAt: observation.observedAt,
      targetUnit: validation.target.unit,
      healthServiceKey: validation.target.healthServiceKey,
      repairDraftRegistry: repairDraft.registry,
      repairSourceRegistry: repairDraft.sourceRegistry,
    };
    const triage = {
      registry: FIXED_UNIT_INCIDENT_TRIAGE_REGISTRY,
      mode: "operator_reviewed_local_plan",
      createdAt,
      binding: {
        ...binding,
        bindingHash: bindingHash(binding),
      },
      source: {
        taskId: sourceTask.id,
        registry: observation.registry,
        fingerprint: observation.fingerprint,
        observedAt: observation.observedAt,
      },
      target: { ...validation.target },
      repairPlanningBoundary: {
        registry: repairDraft.registry,
        sourceRegistry: repairDraft.sourceRegistry,
        targetUnit: repairDraft.target.unit,
        policyDecision: repairDraft.draft?.policy?.decision?.decision ?? null,
        createsTask: false,
        createsApproval: false,
        executesRepair: false,
      },
      governance: {
        domain: "body_internal",
        risk: "low",
        approvalRequired: false,
        sourceCurrent: true,
        createsApproval: false,
        executesRepair: false,
        invokesHostd: false,
        callsProvider: false,
        activatesGeneration: false,
        rollsBackGeneration: false,
      },
    };

    const audit = await publishEvent("systemd.fixed_unit_incident_triage_recorded", {
      registry: triage.registry,
      source: triage.source,
      target: triage.target,
      binding: triage.binding,
      governance: triage.governance,
    });
    if (audit?.ok !== true) {
      throw new Error("Fixed-unit incident triage audit failed before task creation.");
    }
    assertCurrentSchedulerSource(schedulerState, sourceTask, observation, validation.target);

    const policyRequest = {
      intent: "systemd_incident.triage",
      domain: "body_internal",
      risk: "low",
      approvalRequired: false,
    };
    const policyDecision = evaluatePolicyIntent({
      type: FIXED_UNIT_INCIDENT_TRIAGE_TASK_TYPE,
      goal: `Review local repair planning for scheduled incident on ${validation.target.unit}`,
      policy: policyRequest,
    }, {
      stage: "fixed_unit_incident_triage.task",
      type: FIXED_UNIT_INCIDENT_TRIAGE_TASK_TYPE,
    });
    const task = createTask({
      goal: `Review local repair planning for scheduled incident on ${validation.target.unit}`,
      type: FIXED_UNIT_INCIDENT_TRIAGE_TASK_TYPE,
      workViewStrategy: "local-systemd-incident-triage",
      plan: {
        planner: "fixed-unit-incident-triage-v0",
        strategy: "operator-reviewed-local-systemd-triage",
        summary: `Bind scheduled incident evidence to the existing repair draft for ${validation.target.unit}; stop before approval or execution.`,
        steps: [
          {
            id: "review-scheduled-incident",
            phase: "review_scheduled_incident",
            title: "Review the current scheduler incident fingerprint",
            status: "completed",
            requiresApproval: false,
          },
          {
            id: "review-repair-planning-boundary",
            phase: "review_repair_planning_boundary",
            title: "Review the existing fixed-unit repair draft boundary",
            status: "completed",
            requiresApproval: false,
          },
        ],
      },
      policy: policyRequest,
      systemdIncidentTriage: triage,
    }, { skipInitialPolicy: true });
    task.policy = {
      request: policyRequest,
      decision: policyDecision,
    };
    const completedTask = completeTask(task, {
      summary: `Reviewed local repair planning boundary for ${validation.target.unit}.`,
      systemdIncidentTriage: triage,
      createsApproval: false,
      executesRepair: false,
    });
    persistState();
    await publishEvent(createEventName("task.created"), {
      task: serialiseTask(completedTask),
      planner: "fixed-unit-incident-triage-v0",
    });
    await publishEvent(createEventName("task.completed"), {
      task: serialiseTask(completedTask),
    });

    return {
      registry: FIXED_UNIT_INCIDENT_TRIAGE_REGISTRY,
      mode: "operator_reviewed_local_triage",
      generatedAt: createdAt,
      task: completedTask,
      triage,
      governance: {
        createdTask: true,
        reusedExistingTask: false,
        createsApproval: false,
        executesRepair: false,
        invokesHostd: false,
        callsProvider: false,
      },
    };
  }

  async function createFixedUnitIncidentTriageTask({ sourceTaskId: inputTaskId = null, confirm = false } = {}) {
    if (confirm !== true) {
      throw new Error("Fixed-unit incident triage task creation requires confirm=true.");
    }
    const sourceId = sourceTaskId(inputTaskId);
    const existingOperation = inFlightBySourceTask.get(sourceId);
    if (existingOperation) return existingOperation;

    const operation = performFixedUnitIncidentTriage(sourceId);
    inFlightBySourceTask.set(sourceId, operation);
    try {
      return await operation;
    } finally {
      if (inFlightBySourceTask.get(sourceId) === operation) {
        inFlightBySourceTask.delete(sourceId);
      }
    }
  }

  return { createFixedUnitIncidentTriageTask };
}
