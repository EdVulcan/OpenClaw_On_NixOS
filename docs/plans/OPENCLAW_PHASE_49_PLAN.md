# OpenClaw on NixOS Phase 49 Plan

Phase 49 starts after `openclaw-cloud-consciousness-live-provider-rollback-note`. Phase 48 implemented the local rollback note builder but did not attach it to any executable runtime path.

## Phase 49 Theme

Create an approval-gated task shell for the local provider rollback note.

## Milestone Slice

1. `openclaw-cloud-consciousness-live-provider-rollback-note-task`
   - Requires `confirm=true` before task creation.
   - Creates a high-risk operator-reviewed task shell for the rollback note.
   - Keeps rollback handling local-only and keeps rollback execution, host mutation, endpoint contact, network egress, provider response creation, and live provider calls disabled.

## Exit Boundary

Phase 49 is complete when the rollback note task shell is visible in core and Observer with pending approval and no rollback command, host mutation, endpoint contact, network egress, credential value read, provider response creation, or live provider call.
