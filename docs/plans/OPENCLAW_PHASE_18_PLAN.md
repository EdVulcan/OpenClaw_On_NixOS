# OpenClaw on NixOS Phase 18 Plan

Phase 18 starts after `openclaw-cloud-consciousness-live-provider-call-runtime-implementation-plan`. Phase 17 produced a plan-only runtime implementation boundary. Phase 18 materializes that boundary as an approval-gated task shell in a separate runtime implementation module.

## Phase 18 Theme

Create the live provider-call runtime implementation task shell without implementing runtime code.

This phase does not create provider runtime code, load a provider SDK, read credential values, contact endpoint hosts, transmit externally, or enable live provider calls.

## Milestone Slices

1. `openclaw-cloud-consciousness-live-provider-runtime-implementation-task`
   - Confirms the Phase 17 runtime implementation plan is ready.
   - Creates an approval-gated task shell with a high-risk cross-boundary policy.
   - Keeps `implementationStatus: task_shell_only` and all SDK, credential, endpoint, network, and live-call flags disabled.
   - Uses `cloud-live-provider-runtime-implementation.mjs` as the implementation Module instead of adding more phase logic to `plan-builder.mjs`.

## Exit Criteria

Phase 18 is complete when the task shell can be created, has a pending approval, is visible in Observer, and still shows no runtime implementation, SDK load, credential value read, endpoint contact, network egress, or live provider call.

## Boundary

Do not execute the task into live runtime implementation, import provider SDKs, read credential values, contact endpoints, transmit externally, execute a live call, or add unrelated approval hardening in this phase.
