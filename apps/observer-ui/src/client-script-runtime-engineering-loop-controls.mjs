export const observerClientRuntimeEngineeringLoopControlsScript = `function focusEngineeringLoopTask(result) {
  taskHistoryFocus = "selected-task";
  selectedHistoryTaskId = result.task?.id ?? null;
  taskDetailIdInput.value = result.task?.id ?? "";
  renderPlanPanel(result.task);
}

async function refreshEngineeringLoopControlSurfaces() {
  await refreshRuntime();
  await refreshTaskList();
  await refreshTaskHistoryDetail();
  await refreshApprovalState();
  await refreshOperatorState();
  await refreshEngineeringEditProposal();
  await refreshEngineeringWriteProposal();
  await refreshEngineeringWriteExecutionEvidence();
  await refreshEngineeringVerificationEvidence();
  await refreshEngineeringRecoveryEvidence();
}

async function createEngineeringEditLoopApprovalTask() {
  const result = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/engineering-edit-proposal-tasks\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      relativePath: "package.json",
      oldString: "OpenClaw on NixOS monorepo skeleton",
      newString: "OpenClaw on NixOS native agent body skeleton",
      contextLines: 1,
      maxOutputChars: 8000,
      confirm: true,
    }),
  });

  focusEngineeringLoopTask(result);
  setControlMessage(\`Created approval-gated engineering edit task \${result.task?.id ?? "unknown"}; approval and operator step are still required.\`);
  await refreshEngineeringLoopControlSurfaces();
  await refreshWorkspacePatchApplyDraft();
}

async function createEngineeringWriteLoopApprovalTask() {
  const result = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/engineering-write-proposal-tasks\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      relativePath: "scratch/observer-engineering-loop.txt",
      content: "OpenClaw observer engineering loop write proposal\\n",
      overwrite: true,
      contextLines: 1,
      confirm: true,
    }),
  });

  focusEngineeringLoopTask(result);
  setControlMessage(\`Created approval-gated engineering write task \${result.task?.id ?? "unknown"}; approval and operator step are still required.\`);
  await refreshEngineeringLoopControlSurfaces();
  await refreshWorkspaceTextWriteDraft();
}

async function createEngineeringVerificationLoopApprovalTask() {
  const result = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/source-command-proposals/tasks\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      proposalId: "openclaw:typecheck",
      query: "verify",
      confirm: true,
    }),
  });

  focusEngineeringLoopTask(result);
  setControlMessage(\`Created approval-gated engineering verification task \${result.task?.id ?? "unknown"}; approval and operator step are still required.\`);
  await refreshEngineeringLoopControlSurfaces();
  await refreshSourceCommandPlanDraft();
}

`;
