export const observerClientEngineeringVerificationFollowupRenderersScript = `function verificationFollowupFromTask(task) {
  return task?.outcome?.details?.verificationFollowup ?? task?.verificationFollowup ?? null;
}

function shortVerificationFollowupId(value) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 12) : "none";
}

function verificationFollowupStatus(followup) {
  if (!followup) {
    return "none";
  }
  if (followup.triggered !== true) {
    return "not triggered: " + (followup.reason ?? "unknown");
  }
  if (followup.executed !== true) {
    return followup.autonomyMode === "guardian" ? "pending approval" : "queued";
  }
  return followup.ok === true ? "passed" : "failed";
}

function verificationFollowupBinding(followup, task) {
  if (!followup) {
    return "none";
  }
  const sourceStatus = followup.sourceTaskId && task?.id
    ? followup.sourceTaskId === task.id ? "source-match" : "source-mismatch"
    : "source-unchecked";
  const hashStatus = /^[a-f0-9]{64}$/.test(String(followup.mutationHash ?? ""))
    ? "hash-present:" + shortVerificationFollowupId(followup.mutationHash)
    : "hash-invalid";
  return sourceStatus + " " + hashStatus;
}

function formatEngineeringVerificationFollowupLines(task) {
  const followup = verificationFollowupFromTask(task);
  if (!followup) {
    return [];
  }
  const verificationTask = followup.verificationTask ?? {};
  return [
    "Sovereign Verification Follow-up: " + verificationFollowupStatus(followup),
    "Follow-up Source Task: " + (followup.sourceTaskId ?? "none"),
    "Mutation Binding: " + verificationFollowupBinding(followup, task),
    "Validation: script=" + (followup.scriptName ?? "none") + " proposal=" + (followup.proposalId ?? "none") + " task=" + (verificationTask.id ?? "none") + " taskStatus=" + (verificationTask.status ?? "none"),
    "Execution: executed=" + Boolean(followup.executed) + " ok=" + (followup.ok === true ? "true" : followup.ok === false ? "false" : "pending") + " autonomy=" + (followup.autonomyMode ?? "unknown") + " approval=" + (followup.approvalId ?? "none"),
    followup.reason ? "Reason: " + followup.reason : null,
  ].filter(Boolean);
}

function renderEngineeringVerificationFollowupReadback(task) {
  const followup = verificationFollowupFromTask(task);
  const status = verificationFollowupStatus(followup);
  engineeringLoopStateFollowup.textContent = status;
  engineeringLoopStateFollowupSource.textContent = shortVerificationFollowupId(followup?.sourceTaskId);
  engineeringLoopStateFollowupBinding.textContent = verificationFollowupBinding(followup, task);
  engineeringLoopStateFollowupExecution.textContent = followup
    ? (followup.executed === true ? (followup.ok === true ? "passed" : "failed") : "not executed")
    : "none";

  const marker = "\\n\\nVerification Follow-up:\\n";
  const existing = String(engineeringLoopStateJson.textContent ?? "");
  const base = existing.includes(marker) ? existing.split(marker)[0] : existing;
  const lines = formatEngineeringVerificationFollowupLines(task);
  engineeringLoopStateJson.textContent = lines.length > 0
    ? [base, "Verification Follow-up:", ...lines].join("\\n")
    : base;
  return followup;
}

`;
