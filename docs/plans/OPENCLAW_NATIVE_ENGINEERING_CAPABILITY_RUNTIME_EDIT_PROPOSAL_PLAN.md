# OpenClaw Native Engineering Capability Runtime Edit Proposal Plan

Updated: 2026-07-15

## Active Slice

Expose the existing bounded `cc_edit` exact-match diff proposal through the
common `POST /capabilities/invoke` runtime.

Identity alignment: Level 1, stable user-space control plane.

## Demonstrated Gap

The native edit proposal builder and its approval/task bridge already enforce
workspace scope, one exact replacement, bounded output, and no-write behavior.
The dedicated draft route and Observer controls could use it, but a governed
local capability consumer could not request the same proposal through the
common policy, invocation ledger, and capability-event path.

## Implemented Behavior

The registry now exposes:

```text
act.openclaw.engineering_tool.edit_proposal
```

The common handler delegates to the existing
`buildNativeEngineeringEditProposal` owner and accepts only its bounded
workspace, target, replacement, context, and output-limit inputs. The response
may contain the transient diff preview required for operator review. Invocation
and audit evidence retain only target path, hashes, counts, line metadata, and
governance flags; search/replacement text and diff lines are not persisted.

## Governance

```text
audit-only proposal capability
existing workspace/path, size, binary, and exact-match bounds remain active
no filesystem write or patch apply
no task or approval creation
approval remains required before the existing apply task
no command execution, provider call, credential read, or network egress
```

## Evidence

Runtime and tests:

```text
services/openclaw-core/src/capability-runtime-engineering-proposals.mjs
services/openclaw-core/src/capability-runtime.mjs
services/openclaw-core/test/capability-runtime.test.mjs
nix/scripts/dev-capability-invoke-check.sh
nix/scripts/dev-observer-capability-invoke-check.sh
```

The real core and Observer capability checks invoke the proposal against a
fixture, verify the bounded transient diff, and prove the raw proposal text is
absent from the event ledger.

## Deferred

```text
automatic proposal application
automatic task or approval creation
unbounded edits, selectors, shell commands, provider egress, and credentials
```

The existing explicit `engineering-edit-proposal-tasks` route remains the
approval bridge and is unchanged by this common entry point.

## Next Smallest Capability

Keep proposal generation and apply approval separate. Extend common runtime
access only when the existing approval bridge can carry a concrete operator
decision without making proposal content part of durable capability evidence.
