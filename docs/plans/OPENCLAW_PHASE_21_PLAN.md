# OpenClaw on NixOS Phase 21 Plan

Phase 21 starts after `openclaw-cloud-consciousness-live-provider-call-runtime-adapter-implementation`. Phase 20 defined the runtime adapter implementation interface scaffold without creating adapter code, loading provider SDKs, reading credential values, contacting endpoints, or transmitting externally.

## Phase 21 Theme

Create the approval-gated live provider-call runtime adapter implementation task shell without implementing the runtime adapter.

## Milestone Slice

1. `openclaw-cloud-consciousness-live-provider-runtime-adapter-implementation-task`
   - Creates an operator-reviewed runtime adapter implementation task shell.
   - Requires explicit `confirm=true`.
   - Creates a linked pending approval.
   - Reuses `cloud-live-provider-runtime-implementation.mjs` so Phase 21 remains modular.
   - Keeps live provider egress disabled.
   - Does not create adapter code, load SDKs, read credential values, contact endpoints, or make live provider calls.

## Exit Boundary

Phase 21 is complete when core and Observer both expose the approval-gated runtime adapter implementation task shell, the task is queued behind approval, and all live-provider activity remains disabled.
