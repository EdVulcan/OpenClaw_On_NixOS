export const observerClientRuntimeEngineeringLoopControlsScript = `let latestEngineeringLoopControlState = null;

function focusEngineeringLoopTask(result) {
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

function engineeringLoopEvidenceRoute(kind, taskId) {
  if (kind === "edit") {
    return \`/plugins/native-adapter/engineering-edit-execution/evidence?taskId=\${taskId ?? ""}\`;
  }
  if (kind === "write") {
    return \`/plugins/native-adapter/engineering-write-execution/evidence?taskId=\${taskId ?? ""}\`;
  }
  return \`/plugins/native-adapter/engineering-verification/evidence?taskId=\${taskId ?? ""}\`;
}

function renderEngineeringLoopControlState(kind, result) {
  const taskId = result.task?.id ?? "none";
  const approvalId = result.approval?.id ?? "none";
  const evidenceRoute = engineeringLoopEvidenceRoute(kind, result.task?.id ?? null);
  latestEngineeringLoopControlState = {
    kind,
    taskId: result.task?.id ?? null,
    approvalId: result.approval?.id ?? null,
    evidenceRoute,
  };
  engineeringLoopStateKind.textContent = kind;
  engineeringLoopStateTask.textContent = taskId === "none" ? "none" : taskId.slice(0, 8);
  engineeringLoopStateApproval.textContent = approvalId === "none" ? "none" : approvalId.slice(0, 8);
  engineeringLoopStateNext.textContent = "approve pending approval, then run operator step";
  engineeringLoopStateEvidence.textContent = evidenceRoute;
  engineeringLoopStateCompletion.textContent = "pending approval";
  engineeringLoopStateJson.textContent = [
    \`Kind: \${kind}\`,
    \`Task: \${taskId}\`,
    \`Approval: \${approvalId}\`,
    \`Task Status: \${result.task?.status ?? "unknown"}\`,
    \`Approval Status: \${result.approval?.status ?? "unknown"}\`,
    "Next: approve pending approval, then run operator step",
    \`Evidence: \${evidenceRoute}\`,
    "Boundary: no auto-approval, no automatic operator step, no unapproved mutation.",
  ].join("\\n");
}

async function refreshEngineeringLoopCompletionReadback() {
  if (!latestEngineeringLoopControlState?.taskId) {
    throw new Error("Create an engineering loop task first.");
  }
  const evidence = await fetchJson(\`\${observerConfig.coreUrl}\${latestEngineeringLoopControlState.evidenceRoute}\`);
  const summary = evidence?.summary ?? {};
  const total = summary.total ?? 0;
  const passed = summary.passed ?? 0;
  const failed = summary.failed ?? 0;
  engineeringLoopStateCompletion.textContent = \`total=\${total} passed=\${passed} failed=\${failed}\`;
  engineeringLoopStateJson.textContent = [
    \`Kind: \${latestEngineeringLoopControlState.kind}\`,
    \`Task: \${latestEngineeringLoopControlState.taskId}\`,
    \`Approval: \${latestEngineeringLoopControlState.approvalId ?? "none"}\`,
    \`Evidence: \${latestEngineeringLoopControlState.evidenceRoute}\`,
    \`Completion: total=\${total} passed=\${passed} failed=\${failed}\`,
    \`Registry: \${evidence?.registry ?? "unknown"}\`,
    "Boundary: readback only; no approval, execution, retry, recovery task, mutation, provider call, or result envelope.",
  ].join("\\n");
  setControlMessage(\`Refreshed engineering loop completion evidence for \${latestEngineeringLoopControlState.taskId}.\`);
  await refreshEngineeringLoopControlSurfaces();
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
  renderEngineeringLoopControlState("edit", result);
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
  renderEngineeringLoopControlState("write", result);
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
  renderEngineeringLoopControlState("verification", result);
  setControlMessage(\`Created approval-gated engineering verification task \${result.task?.id ?? "unknown"}; approval and operator step are still required.\`);
  await refreshEngineeringLoopControlSurfaces();
  await refreshSourceCommandPlanDraft();
}

`;
