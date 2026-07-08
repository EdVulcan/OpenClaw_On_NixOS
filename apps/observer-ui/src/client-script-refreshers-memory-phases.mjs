export const observerClientMemoryPhaseRefreshersScript = `async function refreshPhase6Plan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/plan\`);
    const summary = data.summary ?? {};
    phase6PlanReady.textContent = String(Boolean(summary.ready));
    phase6PlanNext.textContent = data.next?.recommendedSlice ?? "openclaw-phase-6-memory-substrate-inventory";
    phase6PlanWritesMemory.textContent = String(Boolean(summary.writesMemory));
    phase6PlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-consciousness-memory-plan-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Give the body a memory-bearing task mind."),
      "Slices: " + ((data.selectedSlices ?? []).join(", ") || "none"),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    phase6PlanReady.textContent = "false";
    phase6PlanNext.textContent = "unknown";
    phase6PlanWritesMemory.textContent = "false";
    phase6PlanJson.textContent = "Unable to read Phase 6 plan.";
  }
}

async function refreshPhase6MemorySubstrateInventory() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/memory-substrate-inventory\`);
    const summary = data.summary ?? {};
    phase6MemoryReady.textContent = String(Boolean(summary.ready));
    phase6MemorySources.textContent = String(summary.sourceCount ?? 0);
    phase6MemoryWritable.textContent = String(summary.writableSources ?? 0);
    phase6MemoryJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-memory-substrate-inventory-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " sources=" + (summary.sourceCount ?? 0) + " writable=" + (summary.writableSources ?? 0),
      "Sources: " + ((data.memorySources ?? []).map((source) => source.id).join(", ") || "none"),
    ].join("\\n");
  } catch {
    phase6MemoryReady.textContent = "false";
    phase6MemorySources.textContent = "0";
    phase6MemoryWritable.textContent = "0";
    phase6MemoryJson.textContent = "Unable to read Phase 6 memory substrate inventory.";
  }
}

async function refreshPhase6ConsciousnessContextEnvelope() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/consciousness-context-envelope\`);
    const summary = data.summary ?? {};
    phase6ContextReady.textContent = String(Boolean(summary.ready));
    phase6ContextPointers.textContent = String(summary.memoryPointers ?? 0);
    phase6ContextTransmitted.textContent = String(Boolean(summary.transmitted));
    phase6ContextJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-consciousness-context-envelope-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " pointers=" + (summary.memoryPointers ?? 0) + " transmitted=" + Boolean(summary.transmitted),
      "Schema: " + (data.envelope?.schema ?? "unknown"),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    phase6ContextReady.textContent = "false";
    phase6ContextPointers.textContent = "0";
    phase6ContextTransmitted.textContent = "false";
    phase6ContextJson.textContent = "Unable to read Phase 6 consciousness context envelope.";
  }
}

async function refreshPhase6TaskOrchestrationRecords() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/task-orchestration-records\`);
    const summary = data.summary ?? {};
    phase6OrchestrationReady.textContent = String(Boolean(summary.ready));
    phase6OrchestrationRecords.textContent = String(summary.recordCount ?? 0);
    phase6OrchestrationScheduled.textContent = String(summary.scheduledTasks ?? 0);
    phase6OrchestrationJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-task-orchestration-records-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " records=" + (summary.recordCount ?? 0) + " scheduled=" + (summary.scheduledTasks ?? 0),
      "Records: " + ((data.records ?? []).map((record) => record.id + "=" + record.status).join(" | ") || "none"),
    ].join("\\n");
  } catch {
    phase6OrchestrationReady.textContent = "false";
    phase6OrchestrationRecords.textContent = "0";
    phase6OrchestrationScheduled.textContent = "0";
    phase6OrchestrationJson.textContent = "Unable to read Phase 6 task orchestration records.";
  }
}

async function refreshPhase6MemoryWriteRouteReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/memory-write-route-review\`);
    const summary = data.summary ?? {};
    phase6RouteReady.textContent = String(Boolean(summary.ready));
    phase6RouteSelected.textContent = summary.selectedSlice ?? "unknown";
    phase6RouteWritesMemory.textContent = String(Boolean(summary.writesMemory));
    phase6RouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-memory-write-route-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " selected=" + (summary.selectedSlice ?? "unknown"),
      "Deferred: " + (data.decision?.deferredSlice ?? "unknown"),
      "Writes Memory: " + Boolean(summary.writesMemory) + " cloud=" + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    phase6RouteReady.textContent = "false";
    phase6RouteSelected.textContent = "unknown";
    phase6RouteWritesMemory.textContent = "false";
    phase6RouteJson.textContent = "Unable to read Phase 6 memory write route review.";
  }
}

async function refreshPhase6Exit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/phase-6/exit\`);
    const summary = data.summary ?? {};
    phase6ExitComplete.textContent = String(Boolean(summary.complete));
    phase6ExitPercent.textContent = String(summary.completionPercent ?? 0);
    phase6ExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-long-term-memory-write-plan";
    phase6ExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-phase-6-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Evidence: sources=" + (summary.memorySources ?? 0) + " pointers=" + (summary.memoryPointers ?? 0) + " records=" + (summary.orchestrationRecords ?? 0),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-long-term-memory-write-plan"),
    ].join("\\n");
  } catch {
    phase6ExitComplete.textContent = "false";
    phase6ExitPercent.textContent = "0";
    phase6ExitNext.textContent = "openclaw-long-term-memory-write-plan";
    phase6ExitJson.textContent = "Unable to read Phase 6 exit gate.";
  }
}

async function refreshLongTermMemoryWritePlan() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/write-plan\`);
    const summary = data.summary ?? {};
    longTermMemoryPlanReady.textContent = String(Boolean(summary.ready));
    longTermMemoryPlanScope.textContent = data.storage?.file ?? "unknown";
    longTermMemoryPlanWrites.textContent = String(Boolean(summary.writesMemory));
    longTermMemoryPlanJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-write-plan-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Theme: " + (data.whitepaperAlignment?.phaseTheme ?? "Give the body its first governed long-term memory write."),
      "Scope: " + (data.storage?.file ?? "unknown"),
      "Next: " + (data.next?.recommendedSlice ?? "unknown"),
    ].join("\\n");
  } catch {
    longTermMemoryPlanReady.textContent = "false";
    longTermMemoryPlanScope.textContent = "unknown";
    longTermMemoryPlanWrites.textContent = "false";
    longTermMemoryPlanJson.textContent = "Unable to read long-term memory write plan.";
  }
}

async function refreshLongTermMemorySchema() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/schema\`);
    const summary = data.summary ?? {};
    longTermMemorySchemaReady.textContent = String(Boolean(summary.ready));
    longTermMemorySchemaFields.textContent = String(summary.requiredFieldCount ?? 0);
    longTermMemorySchemaCloud.textContent = String(Boolean(summary.callsCloudModel));
    longTermMemorySchemaJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-schema-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Schema: " + (data.schema?.id ?? "unknown"),
      "Fields: " + ((data.schema?.requiredFields ?? []).join(", ") || "none"),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    longTermMemorySchemaReady.textContent = "false";
    longTermMemorySchemaFields.textContent = "0";
    longTermMemorySchemaCloud.textContent = "false";
    longTermMemorySchemaJson.textContent = "Unable to read long-term memory schema.";
  }
}

async function refreshLongTermMemoryProposal() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/proposal\`);
    const summary = data.summary ?? {};
    longTermMemoryProposalReady.textContent = String(Boolean(summary.ready));
    longTermMemoryProposalType.textContent = summary.memoryType ?? "unknown";
    longTermMemoryProposalBulk.textContent = String(Boolean(summary.bulkImport));
    longTermMemoryProposalJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-proposal-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Proposal: " + (data.proposal?.id ?? "unknown"),
      "Type: " + (summary.memoryType ?? "unknown"),
      "Source: " + (data.proposal?.sourceRegistry ?? "unknown"),
    ].join("\\n");
  } catch {
    longTermMemoryProposalReady.textContent = "false";
    longTermMemoryProposalType.textContent = "unknown";
    longTermMemoryProposalBulk.textContent = "false";
    longTermMemoryProposalJson.textContent = "Unable to read long-term memory proposal.";
  }
}

async function refreshLongTermMemoryWriteRouteReview() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/write-route-review\`);
    const summary = data.summary ?? {};
    longTermMemoryRouteReady.textContent = String(Boolean(summary.ready));
    longTermMemoryRouteSelected.textContent = summary.selectedSlice ?? "unknown";
    longTermMemoryRouteWrites.textContent = String(Boolean(summary.writesMemory));
    longTermMemoryRouteJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-write-route-review-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Selected: " + (summary.selectedSlice ?? "unknown"),
      "Can Append After Approval: " + Boolean(data.decision?.canAppendAfterApproval),
      "Writes Now: " + Boolean(summary.writesMemory),
    ].join("\\n");
  } catch {
    longTermMemoryRouteReady.textContent = "false";
    longTermMemoryRouteSelected.textContent = "unknown";
    longTermMemoryRouteWrites.textContent = "false";
    longTermMemoryRouteJson.textContent = "Unable to read long-term memory write route review.";
  }
}

async function refreshLongTermMemoryWriteTask() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/write-route-review\`);
    const summary = data.summary ?? {};
    longTermMemoryTaskReady.textContent = String(Boolean(summary.ready));
    longTermMemoryTaskCreates.textContent = "true";
    longTermMemoryTaskApproval.textContent = data.decision?.canCreateTask === true ? "required" : "blocked";
    longTermMemoryTaskJson.textContent = [
      "Registry: openclaw-long-term-memory-write-task-v0",
      "Route: " + (data.registry ?? "openclaw-long-term-memory-write-route-review-v0"),
      "Ready: " + Boolean(summary.ready),
      "Creates Task: true",
      "Approval: required before JSONL append",
    ].join("\\n");
  } catch {
    longTermMemoryTaskReady.textContent = "false";
    longTermMemoryTaskCreates.textContent = "false";
    longTermMemoryTaskApproval.textContent = "unknown";
    longTermMemoryTaskJson.textContent = "Unable to read long-term memory write task boundary.";
  }
}

async function refreshLongTermMemoryApprovedWrite() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/readback\`);
    const summary = data.summary ?? {};
    longTermMemoryApprovedRecords.textContent = String(summary.recordCount ?? 0);
    longTermMemoryApprovedLatest.textContent = summary.latestRecordId ?? "none";
    longTermMemoryApprovedCloud.textContent = String(Boolean(summary.callsCloudModel));
    longTermMemoryApprovedJson.textContent = [
      "Registry: openclaw-long-term-memory-approved-write-v0",
      "Readback: " + (data.registry ?? "openclaw-long-term-memory-readback-v0"),
      "Records: " + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Cloud Call: " + Boolean(summary.callsCloudModel),
    ].join("\\n");
  } catch {
    longTermMemoryApprovedRecords.textContent = "0";
    longTermMemoryApprovedLatest.textContent = "none";
    longTermMemoryApprovedCloud.textContent = "false";
    longTermMemoryApprovedJson.textContent = "No approved long-term memory write evidence yet.";
  }
}

async function refreshLongTermMemoryReadback() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/readback\`);
    const summary = data.summary ?? {};
    longTermMemoryReadbackReady.textContent = String(Boolean(summary.ready));
    longTermMemoryReadbackRecords.textContent = String(summary.recordCount ?? 0);
    longTermMemoryReadbackHash.textContent = summary.latestContentHash ?? "none";
    longTermMemoryReadbackJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-readback-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Ready: " + Boolean(summary.ready) + " records=" + (summary.recordCount ?? 0),
      "Latest: " + (summary.latestRecordId ?? "none"),
      "Hash: " + (summary.latestContentHash ?? "none"),
    ].join("\\n");
  } catch {
    longTermMemoryReadbackReady.textContent = "false";
    longTermMemoryReadbackRecords.textContent = "0";
    longTermMemoryReadbackHash.textContent = "none";
    longTermMemoryReadbackJson.textContent = "Unable to read long-term memory readback.";
  }
}

async function refreshLongTermMemoryExit() {
  try {
    const data = await fetchJson(\`\${observerConfig.coreUrl}/long-term-memory/exit\`);
    const summary = data.summary ?? {};
    longTermMemoryExitComplete.textContent = String(Boolean(summary.complete));
    longTermMemoryExitPercent.textContent = String(summary.completionPercent ?? 0);
    longTermMemoryExitNext.textContent = data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-context-review";
    longTermMemoryExitJson.textContent = [
      "Registry: " + (data.registry ?? "openclaw-long-term-memory-exit-v0"),
      "Mode: " + (data.mode ?? "unknown") + " status=" + (data.status ?? "unknown"),
      "Complete: " + Boolean(summary.complete) + " percent=" + (summary.completionPercent ?? 0),
      "Records: " + (summary.recordCount ?? 0),
      "Next: " + (data.next?.recommendedSlice ?? "openclaw-cloud-consciousness-context-review"),
    ].join("\\n");
  } catch {
    longTermMemoryExitComplete.textContent = "false";
    longTermMemoryExitPercent.textContent = "0";
    longTermMemoryExitNext.textContent = "openclaw-cloud-consciousness-context-review";
    longTermMemoryExitJson.textContent = "Unable to read long-term memory exit gate.";
  }
}

`;
