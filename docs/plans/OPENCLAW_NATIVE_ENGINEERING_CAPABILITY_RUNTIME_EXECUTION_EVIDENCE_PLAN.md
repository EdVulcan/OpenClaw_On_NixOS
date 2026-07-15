# OpenClaw Native Engineering Capability Runtime Execution Evidence Plan

Updated: 2026-07-15

## Active Slice

Expose the existing read-only edit/write execution evidence builders through the
common `POST /capabilities/invoke` runtime.

Identity alignment: Level 1, stable user-space control plane.

## Demonstrated Gap

The native engineering loop already proved approval-gated edit and write
execution, filesystem ledger records, and Observer readback through dedicated
routes. A common capability consumer could not request the same completed-task
evidence through the shared policy, invocation ledger, and capability-event
boundary.

## Implemented Behavior

The registry now exposes:

```text
sense.openclaw.engineering_tool.edit_execution_evidence
sense.openclaw.engineering_tool.write_execution_evidence
```

The common handler reuses the existing pure evidence builders and injects the
executor's bounded filesystem-change ledger lookup through the existing
`plan-builder -> task-executor` dependency boundary. An optional `taskId` reads
the bounded task-specific ledger window; the response contains only the
builder's compact metadata, hashes/counts, proposal linkage, and validation
checks.

Invocation and audit evidence retain only the capability id, task id, operation,
policy decision, and compact summary. File content, diff lines, replacement
text, and arbitrary ledger payloads are not persisted in capability history or
events.

## Governance

```text
read-only evidence capability
no filesystem write
no task creation
no approval creation or approval action
no operator-step execution
no command execution
no provider call or network egress
existing approval-gated edit/write task paths remain the mutation owners
```

The common entry point does not approve or re-run a task. It only reads the
already completed task and filesystem evidence after the existing operator path
has executed it.

## Evidence

Runtime:

```text
services/openclaw-core/src/capability-runtime-engineering-execution-evidence.mjs
services/openclaw-core/src/capability-runtime.mjs
services/openclaw-core/src/capability-descriptors.mjs
services/openclaw-core/src/plan-builder.mjs
services/openclaw-core/src/plugin-review.mjs
services/openclaw-core/src/server.mjs
```

Existing builders remain the single evidence owners:

```text
services/openclaw-core/src/native-engineering-edit-execution-evidence-builders.mjs
services/openclaw-core/src/native-engineering-write-execution-evidence-builders.mjs
```

Tests and real service proof:

```text
services/openclaw-core/test/capability-runtime.test.mjs
nix/scripts/dev-openclaw-native-engineering-edit-closed-loop-check.sh
nix/scripts/dev-openclaw-native-engineering-write-execution-evidence-check.sh
nix/scripts/dev-observer-openclaw-native-engineering-write-execution-evidence-check.sh
```

The existing edit closed-loop and write execution milestones now execute the
shared capability after approved mutation and assert the same task-specific
ledger result, compact summary, and no-content/no-mutation boundary. No new
milestone or duplicate evidence route is introduced.

## Deferred

```text
automatic approval or task creation
automatic verification or recovery execution
raw file-content or diff persistence
unbounded filesystem-ledger queries
provider calls, credentials, and network egress
ACPX/Codex live process execution
```

## Next Smallest Capability

Treat this as the final Level 1 common-runtime evidence closure. Continue with a
concrete Level 2 trusted work-view/session-helper operator behavior only when its
authority owner and user-visible decision are explicit; do not add another
standalone evidence or readiness wrapper.
