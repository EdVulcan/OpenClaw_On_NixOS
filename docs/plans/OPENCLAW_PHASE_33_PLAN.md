# OpenClaw on NixOS Phase 33 Plan

Phase 33 starts after `openclaw-cloud-consciousness-live-provider-credential-reference-resolver`. Phase 32 implemented a pure credential reference resolver that validates references without reading credential values.

## Phase 33 Theme

Create an approval-gated task shell around the credential reference resolver before any credential-store access can be considered.

## Milestone Slice

1. `openclaw-cloud-consciousness-live-provider-credential-reference-resolver-task`
   - Requires explicit `confirm=true`.
   - Creates an operator-reviewed task shell for future credential-store access.
   - Links a pending high-risk approval.
   - Confirms the shell remains reference-only.
   - Confirms no credential value read, credential value exposure, endpoint contact, network egress, or live provider call occurs.

## Exit Boundary

Phase 33 is complete when core and Observer both expose the approval-gated credential reference resolver task shell and all credential value access remains disabled.
