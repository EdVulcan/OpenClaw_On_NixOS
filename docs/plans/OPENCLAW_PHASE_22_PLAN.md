# OpenClaw on NixOS Phase 22 Plan

Phase 22 starts after `openclaw-cloud-consciousness-live-provider-runtime-adapter-implementation-task`. Phase 21 created the approval-gated runtime adapter implementation task shell, but did not implement adapter code or enable live provider egress.

## Phase 22 Theme

Prove an approved live provider-call runtime adapter implementation task still records a deferred shell instead of implementing runtime adapter behavior.

## Milestone Slice

1. `openclaw-cloud-consciousness-approved-live-provider-runtime-adapter-implementation-deferred`
   - Creates the Phase 21 runtime adapter implementation task shell.
   - Approves the linked operator approval.
   - Runs one operator step.
   - Confirms the task records `deferred_after_approval`.
   - Confirms no SDK load, credential value read, endpoint contact, network egress, or live provider call occurs.
   - Continues to execute through `cloud-live-provider-runtime-implementation.mjs`.

## Exit Boundary

Phase 22 is complete when approved runtime adapter implementation work is visible as deferred evidence in core and Observer, with all live provider activity still disabled.
