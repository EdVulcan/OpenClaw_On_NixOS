# OpenClaw Native Engineering Capability Runtime Write Proposal Plan

Updated: 2026-07-16

## Active Slice

Expose the existing bounded `cc_write` redacted diff-metadata proposal through
the common `POST /capabilities/invoke` runtime.

Identity alignment: Level 1, stable user-space control plane.

## Demonstrated Gap

The native write proposal builder already constrains workspace paths, content
size, existing-file reads, overwrite intent, redacted diff metadata, and the
approval-gated write bridge. Its dedicated route was governed, but a local
capability consumer could not request the same proposal through the common
policy, invocation ledger, and capability-event path.

## Implemented Behavior

The registry now exposes:

```text
act.openclaw.engineering_tool.write_proposal
```

The common handler delegates to the existing
`buildNativeEngineeringWriteProposal` owner. Proposal response data retains
only the builder's bounded redacted metadata; content text is not returned by
the write proposal. Invocation and audit evidence retain hashes, target state,
byte/line counts, and governance flags only.

## Governance

```text
audit-only proposal capability
workspace/path, content, existing-file, and overwrite bounds remain active
no filesystem write or overwrite
no task or approval creation
approval remains required before the existing write task
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

The real core and Observer checks invoke a new-file proposal against a fixture,
verify redacted metadata, and prove the requested content is absent from the
response and audit event ledger.

## Observer Common-Path Closure

The existing Observer Write Proposal panel now requests its bounded redacted
proposal through `POST /capabilities/invoke` using
`act.openclaw.engineering_tool.write_proposal`. It unwraps only the transient
builder result for the existing renderer; the dedicated draft route remains a
direct read-model proof. Proposed content is excluded from the capability
summary, event evidence, and response projection.

## Deferred

```text
automatic proposal application
automatic task or approval creation
unbounded content, arbitrary selectors, shell commands, provider egress, and credentials
```

The existing explicit `workspace-text-write-tasks` route remains the approval
bridge and is unchanged by this common entry point.

## Next Smallest Capability

The common runtime execution-evidence follow-up and Observer proposal
common-path closure are now complete in
`OPENCLAW_NATIVE_ENGINEERING_CAPABILITY_RUNTIME_EXECUTION_EVIDENCE_PLAN.md`.
It reads only the existing completed write task and filesystem-ledger evidence;
write content remains outside durable capability evidence. Keep proposal
generation, approval, mutation, and execution evidence separate, then continue
with a concrete Level 2 trusted work-view/session-helper behavior.
