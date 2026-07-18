export const observerClientRuntimeFixedUnitIncidentTriageScript = `function canCreateFixedUnitIncidentTriage(task) {
  return task?.type === "systemd_fixed_unit_incident_task"
    && task?.status === "completed"
    && task?.systemdIncidentObservation?.registry === "openclaw-fixed-unit-incident-observation-v0"
    && task?.systemdIncidentObservation?.health?.healthy === false;
}

function renderFixedUnitIncidentTriageAction(task) {
  return canCreateFixedUnitIncidentTriage(task)
    ? \`<button class="secondary" data-task-action="triage-fixed-unit-incident" data-task-id="\${task.id}">Triage</button>\`
    : "";
}

async function createFixedUnitIncidentTriageTask(taskId) {
  const result = await fetchJson(\`\${observerConfig.coreUrl}/system/systemd/fixed-unit-incident-triage-tasks\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceTaskId: taskId, confirm: true }),
  });
  taskHistoryFocus = "selected-task";
  selectedHistoryTaskId = result.task?.id ?? null;
  taskDetailIdInput.value = result.task?.id ?? "";
  setControlMessage(\`Reviewed local fixed-unit incident triage in task \${result.task?.id ?? "unknown"}; approvalCreated=\${String(Boolean(result.governance?.createsApproval))} repairExecuted=\${String(Boolean(result.governance?.executesRepair))}.\`);
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshOperatorState();
}
`;
