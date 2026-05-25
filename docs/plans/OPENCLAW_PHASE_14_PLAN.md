# OpenClaw on NixOS Phase 14 Plan

Phase 14 starts after `openclaw-cloud-consciousness-live-provider-call-runtime-adapter-plan`. Phase 13 created a plan-only runtime adapter boundary. Phase 14 materializes that boundary as an approval-gated task shell.

## Phase 14 Theme

Create and approve the live provider-call runtime adapter task shell while still deferring implementation and live egress.

This phase does not implement a runtime adapter, perform a live provider request, load a provider SDK, read credential values, contact endpoint hosts, transmit externally, or enable live provider calls.

## Milestone Slices

1. `openclaw-cloud-consciousness-live-provider-runtime-adapter-task`
   - Creates an approval-gated runtime adapter task shell.
   - Does not implement the adapter before approval.
   - Keeps live provider egress disabled.

2. `openclaw-cloud-consciousness-approved-live-provider-runtime-adapter-deferred`
   - After approval, records the runtime adapter shell as deferred.
   - Does not call a provider, load a SDK, read credentials, contact endpoints, or transmit externally.

3. `openclaw-cloud-consciousness-live-provider-runtime-adapter-exit`
   - Closes Phase 14 at 100%.
   - Points next to `openclaw-cloud-consciousness-live-provider-call-final-authorization`.

## Exit Criteria

Phase 14 is complete when the task shell can be created, approved, executed into a deferred state, shown in Observer, and the exit gate reports 100% readiness.

