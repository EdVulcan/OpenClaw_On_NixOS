# OpenClaw on NixOS Phase 17 Plan

Phase 17 starts after `openclaw-cloud-consciousness-live-provider-call-operator-launch-review`. Phase 16 made the launch path reviewable without authorizing launch. Phase 17 defines the runtime implementation plan before any code path can load a provider SDK or touch credentials.

## Phase 17 Theme

Plan the live provider-call runtime implementation without implementing it.

This phase does not create runtime adapter code, perform a live provider request, load a provider SDK, read credential values, contact endpoint hosts, transmit externally, or enable live provider calls.

## Milestone Slices

1. `openclaw-cloud-consciousness-live-provider-call-runtime-implementation-plan`
   - Confirms Phase 16 operator launch review is ready.
   - Links the live execution transcript schema and endpoint/credential-reference binding.
   - Lists the required runtime modules for a future implementation task.
   - Reports `implementsRuntimeAdapter: false` and keeps SDK, credential, endpoint, and network activity disabled.
   - Points next to `openclaw-cloud-consciousness-live-provider-call-runtime-implementation-task`.

## Exit Criteria

Phase 17 is complete when the runtime implementation plan is visible in core and Observer, reports 100% readiness, and still shows no runtime adapter implementation, SDK load, credential value read, endpoint contact, network egress, or live provider call.

## Boundary

Do not implement runtime code, import provider SDKs, read credential values, contact endpoints, transmit externally, execute a live call, or expand unrelated approval hardening in this phase.
