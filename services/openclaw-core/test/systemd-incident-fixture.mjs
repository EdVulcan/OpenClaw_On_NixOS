import { createHash } from "node:crypto";

import {
  SYSTEMD_INCIDENT_OBSERVATION_CAPABILITY_ID,
  createSystemdIncidentObservationCapabilityHandlers,
} from "../src/capability-runtime-systemd-incident-observation.mjs";

function receiptHash(receipt) {
  return `sha256:${createHash("sha256").update(JSON.stringify(receipt)).digest("hex")}`;
}

export function createSystemdIncidentRepairTask({
  id = "systemd-incident-source-1",
  status = "failed",
  restoredHealthy = false,
} = {}) {
  const targetUnit = "openclaw-event-hub.service";
  const receipt = {
    registry: "openclaw-systemd-repair-incident-receipt-v0",
    mode: restoredHealthy
      ? "fixed_restart_verified_healthy"
      : "fixed_restart_requires_operator_recovery",
    recordedAt: "2026-07-18T09:00:00.000Z",
    task: {
      id,
      stepId: "execute-next-systemd-restart",
      approvalId: "systemd-repair-approval-1",
    },
    target: {
      unit: targetUnit,
      healthServiceKey: "eventHub",
    },
    preHealth: {
      checkedAt: "2026-07-18T08:59:58.000Z",
      healthServiceKey: "eventHub",
      unit: {
        unit: targetUnit,
        loadState: "loaded",
        activeState: "failed",
        subState: "failed",
        mainPid: 0,
        systemdObserved: true,
      },
      service: {
        key: "eventHub",
        name: "eventHub",
        ok: false,
        status: "offline",
        url: "http://127.0.0.1:4101/private-health",
        checkedAt: "2026-07-18T08:59:58.000Z",
      },
      healthy: false,
      errors: ["private diagnostic text must not leave the host"],
    },
    journalEvidence: {
      registry: "openclaw-systemd-journal-evidence-v0",
      available: true,
      unit: targetUnit,
      requestedLines: 25,
      returned: 3,
      parseErrors: 0,
      filteredEntries: 0,
      latestEntryAt: "2026-07-18T08:59:57.000Z",
      errorCode: null,
      messagesPersisted: false,
    },
    hostdReceipt: {
      invocationId: "hostd-private-invocation",
      owner: "openclaw-hostd",
      transport: "dbus_native",
      method: "org.freedesktop.systemd1.Manager.RestartUnit",
      unit: targetUnit,
      capability: {
        operation: "restart_event_hub",
        capabilityId: "hostd.restart_event_hub",
      },
      jobPath: "/org/freedesktop/systemd1/job/72",
      beforeMainPid: 101,
      afterMainPid: 202,
      commandSucceeded: true,
      peerIdentity: {
        boundary: "kernel_so_peercred",
        verified: true,
        matched: true,
      },
    },
    postHealth: {
      checkedAt: "2026-07-18T09:00:00.000Z",
      healthServiceKey: "eventHub",
      unit: {
        unit: targetUnit,
        loadState: "loaded",
        activeState: "active",
        subState: "running",
        mainPid: 202,
        systemdObserved: true,
      },
      service: {
        key: "eventHub",
        name: "eventHub",
        ok: restoredHealthy,
        status: restoredHealthy ? "healthy" : "offline",
        url: "http://127.0.0.1:4101/private-health",
        checkedAt: "2026-07-18T09:00:00.000Z",
      },
      healthy: restoredHealthy,
      errors: [],
    },
    restoredHealthy,
    governance: {
      fixedTarget: true,
      singleRestartAttempt: true,
      automaticRecovery: false,
      persistsJournalMessages: false,
    },
  };

  return {
    id,
    type: "systemd_next_repair_task",
    status,
    goal: "Restore the fixed event-hub service and verify application health.",
    outcome: {
      kind: status === "completed"
        ? "systemd_next_repair_execution_completed"
        : "systemd_next_repair_execution_failed",
      details: {
        incidentReceipt: {
          ...receipt,
          receiptHash: receiptHash(receipt),
        },
      },
    },
  };
}

export async function createSystemdIncidentObservationTaskFixture({
  providerTaskId = "provider-observation-source-1",
} = {}) {
  const sourceTask = createSystemdIncidentRepairTask();
  const sourceReceipt = sourceTask.outcome.details.incidentReceipt;
  const providerTask = {
    id: providerTaskId,
    type: "cloud_consciousness_live_provider_egress_execution_task",
    status: "completed",
    cloudConsciousnessLiveProviderEgressExecution: {
      responseContract: "engineering_recommendation_v0",
      recommendation: {
        registry: "openclaw-cloud-consciousness-live-provider-engineering-recommendation-v0",
        contract: "engineering_recommendation_v0",
        valid: true,
        actionId: "refresh_systemd_incident_observation",
        existingObserverControlId: "refresh-systemd-journal-evidence-button",
        existingCapabilityId: SYSTEMD_INCIDENT_OBSERVATION_CAPABILITY_ID,
        requiresOperatorReview: true,
        requiresApproval: false,
      },
      contextPacket: {
        sourceTaskId: sourceTask.id,
        systemdIncidentReceiptHash: sourceReceipt.receiptHash,
      },
      systemdIncidentContext: {
        registry: "openclaw-systemd-incident-provider-context-v0",
        sourceTaskId: sourceTask.id,
        sourceReceiptHash: sourceReceipt.receiptHash,
        target: { ...sourceReceipt.target },
      },
    },
  };
  const tasks = new Map([
    [sourceTask.id, sourceTask],
    [providerTask.id, providerTask],
  ]);
  const handlers = createSystemdIncidentObservationCapabilityHandlers({
    tasks,
    systemSenseUrl: "http://system-sense.invalid",
    fetchJson: async (url) => {
      if (url.endsWith("/system/health")) {
        return { system: { services: { eventHub: { ok: true, privateUrl: "http://private.invalid" } } } };
      }
      if (url.endsWith("/system/systemd/units")) {
        return {
          units: [{
            unit: sourceReceipt.target.unit,
            systemdObserved: true,
            loadState: "loaded",
            activeState: "active",
            subState: "running",
          }],
        };
      }
      if (url.includes("/system/systemd/journal-evidence?")) {
        return {
          registry: "openclaw-systemd-journal-evidence-v0",
          unit: sourceReceipt.target.unit,
          requestedLines: 25,
          available: true,
          summary: { returned: 2, parseErrors: 0 },
          entries: [{ message: "private journal message" }],
        };
      }
      throw new Error(`Unexpected fixture URL: ${url}`);
    },
    now: () => "2026-07-18T13:15:00.000Z",
  });
  await handlers.callBackend(
    { id: SYSTEMD_INCIDENT_OBSERVATION_CAPABILITY_ID },
    { params: { providerTaskId: providerTask.id, confirm: true } },
  );
  return { sourceTask, providerTask, tasks };
}
