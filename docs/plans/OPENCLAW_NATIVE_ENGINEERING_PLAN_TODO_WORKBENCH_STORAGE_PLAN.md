# OpenClaw Native Engineering Plan/Todo Workbench Storage Plan

Updated: 2026-07-10

## Active Slice

Native governed engineering plan/todo workbench storage.

This slice moves the `cc_plan_enter`, `cc_plan_exit`, and `cc_todo_write`
migration beyond read-only evidence by giving OpenClaw a small, explicit,
core-state-backed workbench record for visible planning and todo state.

Identity alignment: Level 1, stable user-space control plane.

## Real Capability

The core now exposes:

```text
GET /plugins/native-adapter/engineering-plan-todo/workbench-state
POST /plugins/native-adapter/engineering-plan-todo/workbench-state

registry: openclaw-native-engineering-plan-todo-workbench-storage-v0
capability: act.openclaw.engineering_context.plan_todo_workbench_state
```

`POST` requires:

```text
confirm: true
existing taskId
bounded plan summary / confirmed plan
bounded todo list
```

The route stores one revisioned workbench record per task in OpenClaw core
state. The plan/todo evidence endpoint now reads this storage and reports
`todoSource: workbench_storage` when a stored record exists and no explicit
query todo fixture overrides it.

Observer adds:

```text
engineering-plan-todo-save-button
Save Workbench State
```

The button saves the currently visible planning workbench state and refreshes
the existing Engineering Loop State and Plan/Todo Evidence panels.

The same readback now derives a guidance-only next action suggestion:

```text
registry: openclaw-native-engineering-plan-todo-next-action-v0
mode: operator-guidance-only
```

The suggestion selects the current visible todo, classifies it into an existing
governed Observer control when possible, and records the recommended control
and capability id. It is not an endpoint and does not create tasks, approvals,
commands, workspace mutations, provider calls, or result envelopes.

## Boundaries

This slice does not:

```text
switch hidden planning modes
write .openclaw/cc-todo.md
mutate task status or task plan steps
create tasks or approvals
execute verification commands
call providers or perform network egress
create result envelopes
```

The stored record is an OpenClaw core-state workbench record, not a direct copy
of the enhanced-source `.openclaw/cc-todo.md` persistence model.

## Evidence

Runtime storage:

```text
services/openclaw-core/src/native-engineering-plan-todo-workbench-storage.mjs
services/openclaw-core/src/native-engineering-plan-todo-workbench-routes.mjs
services/openclaw-core/src/native-engineering-plan-todo-next-action.mjs
services/openclaw-core/src/runtime-state.mjs
```

Evidence integration:

```text
services/openclaw-core/src/native-engineering-plan-todo-evidence-builders.mjs
services/openclaw-core/src/observer-read-model-routes.mjs
```

Observer:

```text
apps/observer-ui/src/observer-panels-operations.mjs
apps/observer-ui/src/client-script-runtime-engineering-loop-controls.mjs
```

Validation targets:

```text
services/openclaw-core/test/native-engineering-plan-todo-evidence-builders.test.mjs
services/openclaw-core/test/route-handlers.test.mjs
openclaw-native-engineering-plan-todo-evidence
observer-openclaw-native-engineering-plan-todo-evidence
```

## Deferred

The following remain deferred:

```text
hidden planning mode semantics
plan_exit execution transition
todo-file persistence to .openclaw/cc-todo.md
task-state mutation from todo controls
automatic approval or operator execution
provider calls, network egress, result envelopes
```

## Next Slice

The next high-density slice should use stored visible workbench state to guide
the existing engineering loop through an existing approval-gated creation path
when the operator explicitly asks:

```text
stored workbench suggestion -> explicit governed task creation through existing controls
```

Do not create a new readiness chain for this. Reuse the existing edit, write,
verification, and recovery task controls.
