export const observerClientRuntimeEngineeringLoopControlsScript = `function focusEngineeringLoopTask(result) {
  taskHistoryFocus = "selected-task";
  selectedHistoryTaskId = result.task?.id ?? null;
  taskDetailIdInput.value = result.task?.id ?? "";
  renderPlanPanel(result.task);
}

function boundedEngineeringInput(input, fallback, maxChars) {
  const value = String(input?.value ?? "").trim();
  return (value || fallback).slice(0, maxChars);
}

function readEngineeringEditLoopInput() {
  return {
    relativePath: boundedEngineeringInput(engineeringEditPathInput, "package.json", 240),
    oldString: boundedEngineeringInput(engineeringEditOldInput, "OpenClaw on NixOS monorepo skeleton", 8000),
    newString: boundedEngineeringInput(engineeringEditNewInput, "OpenClaw on NixOS native agent body skeleton", 8000),
  };
}

function readEngineeringWriteLoopInput() {
  return {
    relativePath: boundedEngineeringInput(engineeringWritePathInput, "scratch/observer-engineering-loop.txt", 240),
    content: boundedEngineeringInput(engineeringWriteContentInput, "OpenClaw observer engineering loop write proposal", 16 * 1024),
  };
}

function readEngineeringVerificationLoopInput() {
  return {
    proposalId: boundedEngineeringInput(engineeringVerificationProposalInput, "openclaw:typecheck", 240),
    query: boundedEngineeringInput(engineeringVerificationQueryInput, "verify", 240),
  };
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
  const input = readEngineeringEditLoopInput();
  const result = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/engineering-edit-proposal-tasks\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      relativePath: input.relativePath,
      oldString: input.oldString,
      newString: input.newString,
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
  const input = readEngineeringWriteLoopInput();
  const result = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/engineering-write-proposal-tasks\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      relativePath: input.relativePath,
      content: \`\${input.content}\\n\`,
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
  const input = readEngineeringVerificationLoopInput();
  const result = await fetchJson(\`\${observerConfig.coreUrl}/plugins/native-adapter/source-command-proposals/tasks\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      proposalId: input.proposalId,
      query: input.query,
      confirm: true,
    }),
  });

  focusEngineeringLoopTask(result);
  setControlMessage(\`Created approval-gated engineering verification task \${result.task?.id ?? "unknown"}; approval and operator step are still required.\`);
  await refreshEngineeringLoopControlSurfaces();
  await refreshSourceCommandPlanDraft();
}

`;
