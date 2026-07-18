export const observerClientEngineeringProviderHandoffRefreshersScript = `function syncEngineeringProviderIncidentMode() {
  const incidentMode = engineeringProviderHandoffIncludeSystemdIncident?.checked === true
    || engineeringProviderHandoffIncludeSystemdObservation?.checked === true;
  if (engineeringProviderHandoffPromptInput) {
    engineeringProviderHandoffPromptInput.disabled = incidentMode;
  }
  if (engineeringProviderHandoffResponseContract) {
    engineeringProviderHandoffResponseContract.disabled = incidentMode;
    if (incidentMode) {
      engineeringProviderHandoffResponseContract.value = "engineering_recommendation_v0";
    }
  }
}

async function createEngineeringProviderHandoffTask() {
  if (!engineeringProviderHandoffCreateButton || !engineeringProviderHandoffPromptInput) {
    return;
  }

  const prompt = engineeringProviderHandoffPromptInput.value.trim();
  const sourceTaskId = engineeringProviderHandoffSourceTaskIdInput?.value.trim() ?? "";
  const includeSystemdIncidentReceipt = engineeringProviderHandoffIncludeSystemdIncident?.checked === true;
  const includeSystemdIncidentObservationReceipt =
    engineeringProviderHandoffIncludeSystemdObservation?.checked === true;
  const includeBoundSystemdContext =
    includeSystemdIncidentReceipt || includeSystemdIncidentObservationReceipt;
  const responseContract = !includeBoundSystemdContext
    && engineeringProviderHandoffResponseContract?.value === "engineering_plan_v0"
    ? "engineering_plan_v0"
    : "engineering_recommendation_v0";
  if (!includeBoundSystemdContext && !prompt) {
    setControlMessage("Enter a bounded provider request before creating the handoff task.");
    engineeringProviderHandoffPromptInput.focus();
    return;
  }
  if (includeBoundSystemdContext && !sourceTaskId) {
    setControlMessage(includeSystemdIncidentObservationReceipt
      ? "Select the completed provider task containing the reviewed observation receipt."
      : "Select a completed systemd repair task before creating the incident handoff.");
    engineeringProviderHandoffSourceTaskIdInput?.focus();
    return;
  }

  engineeringProviderHandoffCreateButton.disabled = true;
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/capabilities/invoke\`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        capabilityId: "act.openclaw.engineering_context.provider_handoff_task",
        approved: true,
        params: {
          confirm: true,
          liveProviderExecution: {
            credentialReference: "openclaw://credential/deepseek-api-key",
            ...(!includeBoundSystemdContext
              ? {
                  requestEnvelope: {
                    model: "deepseek-chat",
                    messages: [{ role: "user", content: prompt }],
                  },
                }
              : {}),
            responseContract,
            ...((sourceTaskId || responseContract === "engineering_plan_v0" || includeBoundSystemdContext)
              ? {
                  contextPacket: {
                    requested: true,
                    ...(sourceTaskId ? { sourceTaskId } : {}),
                    ...(responseContract === "engineering_plan_v0" ? { includePlanTodo: true } : {}),
                    ...(includeSystemdIncidentReceipt ? { includeSystemdIncidentReceipt: true } : {}),
                    ...(includeSystemdIncidentObservationReceipt
                      ? { includeSystemdIncidentObservationReceipt: true }
                      : {}),
                  },
                }
              : {}),
          },
        },
      }),
    });
    renderEngineeringProviderHandoff(data);
    const taskId = data?.result?.task?.id ?? "unknown";
    setControlMessage(includeBoundSystemdContext
      ? \`Created pending systemd \${includeSystemdIncidentObservationReceipt ? "observation" : "incident"} diagnosis task \${taskId}; approval remains required before provider contact.\`
      : \`Created pending DeepSeek handoff task \${taskId}; approval and operator execution remain separate.\`);
  } catch (error) {
    engineeringProviderHandoffStatus.textContent = "blocked";
    engineeringProviderHandoffJson.textContent = \`Unable to create the provider handoff task: \${formatError(error)}\`;
    setControlMessage("Provider handoff task was not created.");
  } finally {
    engineeringProviderHandoffCreateButton.disabled = false;
  }
}

engineeringProviderHandoffCreateButton?.addEventListener("click", () => {
  void createEngineeringProviderHandoffTask();
});
engineeringProviderHandoffIncludeSystemdIncident?.addEventListener("change", () => {
  if (engineeringProviderHandoffIncludeSystemdIncident.checked
    && engineeringProviderHandoffIncludeSystemdObservation) {
    engineeringProviderHandoffIncludeSystemdObservation.checked = false;
  }
  syncEngineeringProviderIncidentMode();
});
engineeringProviderHandoffIncludeSystemdObservation?.addEventListener("change", () => {
  if (engineeringProviderHandoffIncludeSystemdObservation.checked
    && engineeringProviderHandoffIncludeSystemdIncident) {
    engineeringProviderHandoffIncludeSystemdIncident.checked = false;
  }
  syncEngineeringProviderIncidentMode();
});
syncEngineeringProviderIncidentMode();

`;
