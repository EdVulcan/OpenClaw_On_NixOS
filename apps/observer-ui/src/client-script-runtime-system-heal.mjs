export const observerClientRuntimeSystemHealScript = `async function runHeal(service) {
  const result = await fetchJson(\`\${observerConfig.coreUrl}/capabilities/invoke\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      capabilityId: "act.system.heal",
      operation: "heal.restart-service",
      params: { service, mode: "simulated" },
    }),
  });
  const entry = result.result?.entry ?? {};
  setControlMessage(\`Capability system.heal restart-service completed for \${entry.service ?? service}\`);
  await refreshHealState();
  await refreshCapabilityHistory();
}

async function runMaintenanceTickFromUi() {
  const result = await fetchJson(\`\${observerConfig.coreUrl}/capabilities/invoke\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      capabilityId: "act.system.heal",
      operation: "heal.maintenance.tick",
      params: {
        force: true,
        autofix: true,
        mode: "simulated",
      },
    }),
  });
  const tick = result.result?.tick ?? {};
  const runStatus = result.result?.run?.status ?? "no-run";
  setControlMessage(\`Capability system.heal maintenance tick \${tick.status ?? "unknown"}: \${tick.reason ?? "unknown"} / \${runStatus}\`);
  await refreshMaintenanceState();
  await refreshHealState();
  await refreshSystemState();
  await refreshAuditState();
  await refreshCapabilityHistory();
}
`;
