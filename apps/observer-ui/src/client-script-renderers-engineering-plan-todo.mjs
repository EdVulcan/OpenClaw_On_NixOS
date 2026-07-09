export const observerClientEngineeringPlanTodoRenderersScript = `function renderEngineeringPlanTodoEvidence(data) {
  const summary = data?.summary ?? {};
  const governance = data?.governance ?? {};
  const todoCounts = summary.evidenceTodoCounts ?? data?.planningEvidence?.todoWrite?.counts ?? {};
  const deferred = Array.isArray(data?.deferredExecutionBoundaries) ? data.deferredExecutionBoundaries : [];
  const taskItems = Array.isArray(data?.taskPlanEvidence?.items) ? data.taskPlanEvidence.items : [];
  const todoItems = Array.isArray(data?.planningEvidence?.todoWrite?.items) ? data.planningEvidence.todoWrite.items : [];
  engineeringPlanTodoRegistry.textContent = data?.registry ?? "openclaw-native-engineering-plan-todo-evidence-v0";
  engineeringPlanTodoTasks.textContent = String(summary.taskPlanCount ?? taskItems.length);
  engineeringPlanTodoTodos.textContent = String(todoCounts.total ?? todoItems.length);
  engineeringPlanTodoDone.textContent = String(todoCounts.done ?? 0);
  engineeringPlanTodoMutation.textContent = governance.canMutateTaskState || governance.canWriteTodoFile ? "enabled" : "blocked";

  engineeringPlanTodoJson.textContent = [
    "Native engineering plan/todo evidence: maps cc_plan_enter, cc_plan_exit, and cc_todo_write into visible task/workbench evidence.",
    "This endpoint does not switch hidden agent modes, write .openclaw/cc-todo.md, mutate tasks, create approvals, execute commands, call providers, or import enhanced source code.",
    \`Registry: \${data?.registry ?? "openclaw-native-engineering-plan-todo-evidence-v0"}\`,
    \`Mode: \${data?.mode ?? "planning-todo-evidence-only"}\`,
    \`Identity: \${data?.identityLevel ?? "Level 1: stable user-space control plane"}\`,
    \`Capability: \${data?.capability?.id ?? "sense.openclaw.engineering_context.plan_todo_evidence"} risk=\${data?.capability?.risk ?? "low"} approval=\${Boolean(data?.capability?.approvalRequired)}\`,
    \`Query: taskId=\${data?.query?.taskId ?? "current-or-latest"} limit=\${data?.query?.limit ?? 10} todoSource=\${summary.todoSource ?? "task_plan_steps"} parseError=\${data?.query?.todosParseError ?? "none"}\`,
    \`Summary: taskPlans=\${summary.taskPlanCount ?? taskItems.length} queryTodos=\${summary.queryTodoCount ?? 0} taskTodos=\${summary.taskTodoCount ?? 0} todos=\${todoCounts.total ?? todoItems.length} done=\${todoCounts.done ?? 0} inProgress=\${todoCounts.in_progress ?? 0} pending=\${todoCounts.pending ?? 0}\`,
    \`Governance: readWorkbench=\${Boolean(governance.canReadTaskWorkbenchState)} hiddenMode=\${Boolean(governance.canSwitchHiddenAgentMode)} writeTodo=\${Boolean(governance.canWriteTodoFile)} mutateTask=\${Boolean(governance.canMutateTaskState)} createTask=\${Boolean(governance.canCreateTask)} execute=\${Boolean(governance.canExecuteCommand)} provider=\${Boolean(governance.canCallProvider)}\`,
    \`Audit: operation=\${data?.auditEvidence?.operation ?? "plan_todo_evidence"} evidence=\${data?.auditEvidence?.evidenceKind ?? "missing"} persisted=\${Boolean(data?.auditEvidence?.persisted)}\`,
    "",
    ...taskItems.slice(0, 5).map((item) => \`task=\${item.taskId ?? "none"} status=\${item.taskStatus ?? "unknown"} planner=\${item.plan?.planner ?? "none"} steps=\${item.plan?.stepCount ?? 0} visibleTodos=\${item.plan?.visibleTodoCount ?? 0}\`),
    "",
    ...todoItems.slice(0, 8).map((item) => \`\${item.status ?? "pending"} \${item.id ?? "todo"} source=\${item.source ?? "unknown"} writesFile=\${Boolean(item.writesFile)} mutatesTask=\${Boolean(item.mutatesTask)}\`),
    "",
    ...deferred.map((boundary) => \`deferred: \${boundary}\`),
  ].join("\\n");
}

`;
