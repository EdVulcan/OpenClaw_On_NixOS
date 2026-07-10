export const observerClientEngineeringPlanTodoRenderersScript = `let latestEngineeringPlanTodoEvidence = null;
let latestEngineeringPlanTodoWorkbenchState = null;

function buildEngineeringPlanTodoWorkbenchState(data) {
  const summary = data?.summary ?? {};
  const governance = data?.governance ?? {};
  const taskItems = Array.isArray(data?.taskPlanEvidence?.items) ? data.taskPlanEvidence.items : [];
  const todoItems = Array.isArray(data?.planningEvidence?.todoWrite?.items) ? data.planningEvidence.todoWrite.items : [];
  const todoCounts = summary.evidenceTodoCounts ?? data?.planningEvidence?.todoWrite?.counts ?? {};
  const selectedTask = taskItems[0] ?? null;
  const currentTodo = todoItems.find((item) => item.status === "in_progress")
    ?? todoItems.find((item) => item.status === "pending")
    ?? todoItems[0]
    ?? null;
  if (!selectedTask && todoItems.length === 0) {
    return null;
  }

  return {
    registry: "openclaw-native-engineering-planning-workbench-state-v0",
    mode: "operator-visible-planning-workbench-state",
    sourceRegistry: data?.registry ?? "openclaw-native-engineering-plan-todo-evidence-v0",
    identityLevel: data?.identityLevel ?? "Level 1: stable user-space control plane",
    taskId: selectedTask?.taskId ?? data?.taskPlanEvidence?.selectedTaskId ?? null,
    taskStatus: selectedTask?.taskStatus ?? null,
    planner: selectedTask?.plan?.planner ?? selectedTask?.plan?.strategy ?? "none",
    todoSource: summary.todoSource ?? "task_plan_steps",
    counts: {
      total: todoCounts.total ?? todoItems.length,
      done: todoCounts.done ?? 0,
      inProgress: todoCounts.in_progress ?? 0,
      pending: todoCounts.pending ?? 0,
    },
    currentTodo,
    governance: {
      hiddenModeCreated: false,
      todoFileWritten: false,
      taskStateMutated: false,
      createsTask: Boolean(governance.canCreateTask),
      executesCommand: Boolean(governance.canExecuteCommand),
      callsProvider: Boolean(governance.canCallProvider),
    },
    deferredExecutionBoundaries: [
      "workbench bridge is Observer-visible readback only",
      "no hidden planning mode switch",
      "no .openclaw/cc-todo.md write",
      "no task state mutation",
      "no command execution or provider call",
    ],
  };
}

function renderEngineeringPlanTodoWorkbenchState(state) {
  latestEngineeringPlanTodoWorkbenchState = state ?? null;
  if (!state) {
    engineeringPlanTodoWorkbench.textContent = "none";
    engineeringPlanTodoWorkbenchJson.textContent = "No task plan or todo evidence available for the planning workbench bridge.";
    return;
  }

  engineeringPlanTodoWorkbench.textContent = state.taskId ? state.taskId.slice(0, 8) : "ready";
  engineeringPlanTodoWorkbenchJson.textContent = [
    "Native engineering planning workbench state: bridges plan/todo evidence into an operator-visible engineering loop state.",
    \`Registry: \${state.registry}\`,
    \`Mode: \${state.mode}\`,
    \`Task: \${state.taskId ?? "none"} status=\${state.taskStatus ?? "unknown"} planner=\${state.planner}\`,
    \`Todo Source: \${state.todoSource}\`,
    \`Todos: total=\${state.counts.total} done=\${state.counts.done} inProgress=\${state.counts.inProgress} pending=\${state.counts.pending}\`,
    \`Current: \${state.currentTodo?.id ?? "none"} \${state.currentTodo?.status ?? "none"} \${state.currentTodo?.description ?? ""}\`,
    \`Boundary: hiddenMode=\${Boolean(state.governance.hiddenModeCreated)} writeTodo=\${Boolean(state.governance.todoFileWritten)} mutateTask=\${Boolean(state.governance.taskStateMutated)} execute=\${Boolean(state.governance.executesCommand)} provider=\${Boolean(state.governance.callsProvider)}\`,
    "",
    ...state.deferredExecutionBoundaries.map((boundary) => \`deferred: \${boundary}\`),
  ].join("\\n");
}

function renderEngineeringPlanTodoEvidence(data) {
  latestEngineeringPlanTodoEvidence = data ?? null;
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
  renderEngineeringPlanTodoWorkbenchState(buildEngineeringPlanTodoWorkbenchState(data));

  engineeringPlanTodoJson.textContent = [
    "Native engineering plan/todo evidence: maps cc_plan_enter, cc_plan_exit, and cc_todo_write into visible task/workbench evidence.",
    "This endpoint does not switch hidden agent modes, write .openclaw/cc-todo.md, mutate tasks, create approvals, execute commands, call providers, or import enhanced source code.",
    \`Registry: \${data?.registry ?? "openclaw-native-engineering-plan-todo-evidence-v0"}\`,
    \`Mode: \${data?.mode ?? "planning-todo-evidence-only"}\`,
    \`Identity: \${data?.identityLevel ?? "Level 1: stable user-space control plane"}\`,
    \`Capability: \${data?.capability?.id ?? "sense.openclaw.engineering_context.plan_todo_evidence"} risk=\${data?.capability?.risk ?? "low"} approval=\${Boolean(data?.capability?.approvalRequired)}\`,
    \`Query: taskId=\${data?.query?.taskId ?? "current-or-latest"} limit=\${data?.query?.limit ?? 10} todoSource=\${summary.todoSource ?? "task_plan_steps"} parseError=\${data?.query?.todosParseError ?? "none"}\`,
    \`Summary: taskPlans=\${summary.taskPlanCount ?? taskItems.length} queryTodos=\${summary.queryTodoCount ?? 0} taskTodos=\${summary.taskTodoCount ?? 0} todos=\${todoCounts.total ?? todoItems.length} done=\${todoCounts.done ?? 0} inProgress=\${todoCounts.in_progress ?? 0} pending=\${todoCounts.pending ?? 0}\`,
    \`Storage: workbench_storage persisted=\${Boolean(data?.workbenchStorage?.persisted)} revision=\${data?.workbenchStorage?.revision ?? 0} todoFileWritten=\${Boolean(data?.workbenchStorage?.todoFileWritten)} taskMutated=\${Boolean(data?.workbenchStorage?.taskStateMutated)}\`,
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
