# OpenClaw on NixOS Phase 36 Plan

Phase 36 starts after `openclaw-cloud-consciousness-live-provider-credential-reference-resolver-regression`. Phase 35 closed the reference-only credential resolver chain.

## Phase 36 Theme

Implement a no-network `sendProviderRequest` envelope that prepares a deferred egress record without contacting provider endpoints.

## Milestone Slice

1. `openclaw-cloud-consciousness-live-provider-no-network-sender`
   - Implements `sendProviderRequest` in the dedicated live provider runtime adapter module.
   - Accepts the Phase 28 provider request and Phase 32 credential reference metadata.
   - Produces a local `dispatch: deferred` egress envelope.
   - Confirms credential values remain absent.
   - Confirms no endpoint contact, network egress, or live provider call occurs.

## Exit Boundary

Phase 36 is complete when the no-network sender envelope is visible in core and Observer, carries the prepared request locally, and performs no live provider activity.
