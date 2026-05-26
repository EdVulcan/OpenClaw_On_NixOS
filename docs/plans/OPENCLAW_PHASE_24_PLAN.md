# OpenClaw on NixOS Phase 24 Plan

Phase 24 starts after `openclaw-cloud-consciousness-runtime-adapter-implementation-regression`. Phase 23 closed the Phase 20-22 chain, proving the runtime adapter implementation path remains deferred and non-live.

## Phase 24 Theme

Define the live provider runtime adapter module boundary as a dedicated contract skeleton before any executable adapter implementation.

## Milestone Slice

1. `openclaw-cloud-consciousness-live-provider-runtime-adapter-module-contract`
   - Adds `cloud-live-provider-runtime-adapter.mjs` as the dedicated runtime adapter module boundary.
   - Exposes the contract through core and Observer.
   - Defines method names and forbidden operations.
   - Confirms every method remains unimplemented.
   - Confirms no SDK import, credential value read, endpoint contact, network egress, or live provider call occurs.

## Exit Boundary

Phase 24 is complete when the adapter module contract is visible in core and Observer, reports 100% readiness, and remains contract-only.
