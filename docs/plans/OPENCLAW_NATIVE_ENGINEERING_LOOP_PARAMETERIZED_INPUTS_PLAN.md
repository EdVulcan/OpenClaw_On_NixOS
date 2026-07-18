# OpenClaw Native Engineering Loop Parameterized Inputs Plan

Updated: 2026-07-18

## Active Slice

Native governed engineering loop parameterized workbench inputs.

This slice removes the hardcoded-only Observer engineering loop controls and
lets the operator provide bounded values for the existing edit, write, and
verification approval-task bridges.

Identity alignment: Level 1, stable user-space control plane.

## Implemented Behavior

The Observer now exposes operator-editable workbench fields:

```text
engineering-edit-path-input
engineering-edit-old-input
engineering-edit-new-input
engineering-write-path-input
engineering-write-content-input
engineering-verification-proposal-input
engineering-verification-query-input
```

The client reads those fields through bounded helpers before calling the same
approval-gated routes:

```text
POST /plugins/native-adapter/engineering-edit-proposal-tasks
POST /plugins/native-adapter/engineering-write-proposal-tasks
POST /plugins/native-adapter/source-command-proposals/tasks
```

Client-side limits are ergonomic guardrails only. Core bounded workspace
builders, proposal validation, approval policy, filesystem ledgering, and
verification/recovery evidence remain the authoritative controls.

The completed-outcome follow-up is also closed in the existing read models.
Observer Task History and Engineering Loop State now show the bounded
post-write verification follow-up metadata when a write completed in
`sovereign_body`, including source-task binding status and the validation result.
This remains read-only and does not add task, approval, command, retry, or
mutation authority.

## Evidence

Validation target:

```text
openclaw-native-engineering-loop-operator-controls
```

The targeted milestone now proves both operator controls and parameterized
inputs:

```text
Observer HTML exposes edit/write/verification inputs and task buttons
Observer client reads bounded operator inputs before POST
custom edit replacement creates a queued workspace_patch_apply task
custom write path creates a queued workspace_text_write task
verification proposal/query creates a queued source-command task
operator step remains blocked by policy before approval
no edit/write mutation happens before approval
```

## Deferred

The following remain deferred:

```text
multi-line text editing controls
input persistence across Observer reloads
automatic approval
automatic operator execution after task creation
automatic command execution without approval
automatic recovery task creation
provider calls, network egress, result envelopes
raw credential reads
```

## Next Slice

The loop-state guidance follow-up was completed as:

```text
OPENCLAW_NATIVE_ENGINEERING_LOOP_STATE_GUIDANCE_PLAN.md
```

The completed-outcome readback follow-up was completed as part of the bounded
write closed-loop lane:

```text
OPENCLAW_NATIVE_ENGINEERING_WRITE_CLOSED_LOOP_PLAN.md
```

Route the next slice from the active forward-work directive. Do not keep adding
Observer mirrors to this completed loop unless a concrete operator gap appears.
