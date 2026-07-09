export const observerClientEngineeringVerificationRenderersScript = `function renderEngineeringVerificationEvidence(data) {
  const summary = data?.summary ?? {};
  const governance = data?.governance ?? {};
  const evidence = Array.isArray(data?.evidence) ? data.evidence : [];
  const deferred = Array.isArray(data?.deferredExecutionBoundaries) ? data.deferredExecutionBoundaries : [];
  const workStandardsCoverage = data?.workStandardsCoverage ?? {};
  engineeringVerificationRegistry.textContent = data?.registry ?? "openclaw-native-engineering-verification-evidence-v0";
  engineeringVerificationPassed.textContent = String(summary.passed ?? 0);
  engineeringVerificationFailed.textContent = String(summary.failed ?? 0);
  engineeringVerificationAttached.textContent = String(summary.attachedToCompletedTasks ?? 0);
  engineeringVerificationExecution.textContent = governance.canExecuteCommand ? "enabled" : "blocked";

  engineeringVerificationJson.textContent = [
    "Native engineering verification evidence: maps cc_verify semantics onto existing governed command transcripts and task completion evidence.",
    "This reads transcript and capability ledgers only. It does not run commands, create tasks, create approvals, retry execution, mutate files, call providers, or import enhanced source code.",
    \`Registry: \${data?.registry ?? "openclaw-native-engineering-verification-evidence-v0"}\`,
    \`Mode: \${data?.mode ?? "completed-command-transcript-verification-evidence"}\`,
    \`Identity: \${data?.identityLevel ?? "Level 1: stable user-space control plane"}\`,
    \`Capability: \${data?.capability?.id ?? "sense.openclaw.engineering_tool.verify_evidence"} source=\${data?.sourceCapability?.sourceToolName ?? "cc_verify"} risk=\${data?.capability?.risk ?? "medium"} approval=\${Boolean(data?.capability?.approvalRequired)}\`,
    \`Query: taskId=\${data?.query?.taskId ?? "latest"} limit=\${data?.query?.limit ?? 10} maxOutput=\${data?.query?.maxOutputChars ?? "n/a"}\`,
    \`Summary: total=\${summary.total ?? evidence.length} passed=\${summary.passed ?? 0} failed=\${summary.failed ?? 0} timedOut=\${summary.timedOut ?? 0} attached=\${summary.attachedToCompletedTasks ?? 0} truncated=\${summary.outputTruncated ?? 0}\`,
    \`Work Standards Coverage: registry=\${workStandardsCoverage.registry ?? "openclaw-engineering-work-standards-task-coverage-v0"} status=\${workStandardsCoverage.status ?? "unknown"} satisfied=\${workStandardsCoverage.score?.satisfied ?? 0}/\${workStandardsCoverage.score?.required ?? 0} missing=\${workStandardsCoverage.score?.missing ?? 0}\`,
    \`Governance: readTranscript=\${Boolean(governance.canReadCommandTranscriptLedger)} readInvocations=\${Boolean(governance.canReadCapabilityInvocationLedger)} execute=\${Boolean(governance.canExecuteCommand)} task=\${Boolean(governance.canCreateTask)} approval=\${Boolean(governance.canCreateApproval)} mutate=\${Boolean(governance.canMutate)} provider=\${Boolean(governance.canCallProvider)}\`,
    \`Audit: operation=\${data?.auditEvidence?.operation ?? "verification_evidence"} evidence=\${data?.auditEvidence?.evidenceKind ?? "missing"} persisted=\${Boolean(data?.auditEvidence?.persisted)}\`,
    "",
    ...evidence.slice(0, 8).map((item) => {
      const failed = (item.validation?.failedChecks ?? []).map((check) => check.name).join(",") || "none";
      const coverage = item.workStandardsCoverage ?? {};
      return \`\${item.ok ? "pass" : "fail"} task=\${item.taskId ?? "none"} command=\${item.commandShape?.command ?? "unknown"} cwd=\${item.commandShape?.cwd ?? "unknown"} exit=\${item.result?.exitCode ?? "n/a"} timeout=\${Boolean(item.result?.timedOut)} attached=\${Boolean(item.attachment?.attachedToTaskCompletion)} reportReady=\${Boolean(coverage.reportReadiness?.canReportWithEvidence)} recovery=\${Boolean(coverage.reportReadiness?.recoveryEvidenceRecommended)} failedChecks=\${failed}\`;
    }),
    "",
    ...deferred.map((boundary) => \`deferred: \${boundary}\`),
  ].join("\\n");
}

`;
