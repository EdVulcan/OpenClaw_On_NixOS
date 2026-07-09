# OpenClaw Native Engineering Loop Operator Controls Plan

Updated: 2026-07-09

## Active Slice

Native governed engineering loop operator controls.

This slice moves the proven engineering closed loop from milestone-only proof
toward operator-visible controls:

```text
Observer control -> existing proposal-task bridge -> pending approval ->
operator step remains blocked until approval
```

Identity alignment: Level 1, stable user-space control plane.

## Implemented Behavior

The Observer now exposes direct controls for existing governed engineering
tasks:

```text
engineering-edit-proposal-task-button
engineering-write-proposal-task-button
engineering-verification-task-button
```

Those controls call only existing approval-gated routes:

```text
POST /plugins/native-adapter/engineering-edit-proposal-tasks
POST /plugins/native-adapter/engineering-write-proposal-tasks
POST /plugins/native-adapter/source-command-proposals/tasks
```

They do not approve tasks, run operator steps, mutate files, execute commands,
call providers, read credentials, or import the enhanced source repository.
Each control focuses the created task in the Observer, refreshes task history,
approval inbox, operator state, and the engineering evidence panels, then leaves
the user-facing approval gate authoritative.

## Evidence

Targeted milestone:

```text
openclaw-native-engineering-loop-operator-controls
```

The milestone proves:

```text
Observer HTML exposes edit/write/verification operator controls
Observer client binds those controls to existing governed POST routes
edit proposal control creates a queued workspace_patch_apply task with pending approval
write proposal control creates a queued workspace_text_write task with pending approval
verification control creates a queued source-command verification task with pending approval
operator step remains blocked by policy before approval
no edit/write mutation happens before approval
```

Runtime UI code:

```text
apps/observer-ui/src/client-script-runtime-engineering-loop-controls.mjs
apps/observer-ui/src/client-script-runtime-bindings.mjs
apps/observer-ui/src/observer-panels-operations.mjs
```

## Deferred

The following remain deferred:

```text
parameterized operator inputs for arbitrary file/search/content values
automatic approval
automatic operator execution after task creation
automatic command execution without approval
automatic recovery task creation
provider calls, network egress, result envelopes
raw credential reads
```

## Next Slice

The next highest-density capability slice should remove the remaining hardcoded
sample inputs from the Observer controls:

```text
Native governed engineering loop parameterized workbench inputs
```

That slice should let an operator choose bounded edit/write/verification
parameters from the workbench while preserving the same proposal, approval,
ledger, verification, and recovery boundaries.
