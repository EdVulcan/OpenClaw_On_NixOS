# OpenClaw Native Engineering Context Provider Handoff Bridge Plan

Updated: 2026-07-14

## Active Slice

Explicitly approved provider consumption of the existing work-view observation
and plan/todo context bridges.

Identity alignment: Level 1 to Level 2 boundary, with provider egress still
owned by the existing approval-gated DeepSeek task.

## Demonstrated Gap

The local Engineering Context Packet could already report trusted work-view
capture freshness, frame provenance, semantic-target counts, and visible
plan/todo state. The approved provider materializer only assembled transcript,
verification, and recovery evidence, so an operator could not deliberately
include those newer summaries in the same bound request.

## Implemented Behavior

The existing `contextPacket` request may explicitly add:

```json
{
  "includeWorkView": true,
  "includeWorkViewObservation": true,
  "includePlanTodo": true
}
```

The provider materializer then:

```text
reads the authoritative session-manager state through the existing local route
derives the same compact work-view association and observation summary used by
the local packet
reuses the existing bounded plan/todo evidence builder
microcompacts the caller-owned packet while retaining protected evidence
materializes one bounded provider message in memory
includes the resulting content hash in the existing request binding check
returns only compact inclusion/status/hash evidence to durable task state
```

Observation metadata is provenance only. The provider message does not include
page URLs, page text, pixels, data URLs, semantic-target items, selectors,
input values, lease ids, credentials, or arbitrary endpoint data. Credential-like
patterns are redacted across task, transcript, work-view, and plan/todo message
text before the provider message is materialized.

`includeWorkViewObservation` without the explicit `includeWorkView` request is
rejected rather than silently ignored. The work-view read can still report an
unavailable local state; it does not invent authority or automatically recover
the helper.

## Governance

```text
explicit operator request and existing approved provider task required
context content remains transient in the current execution request
request and context hashes are rechecked before credential read or network send
no task, approval, action, plan transition, or todo-file mutation is automatic
no provider call occurs during local materialization
no credential-store read occurs during context assembly
recommendations remain review-only and use the existing allowlist
```

The new flags are part of the materialized request shape. Changing them changes
the provider request content hash and therefore fails the existing approval
binding instead of turning an approval for one context into approval for another.

The follow-up source-task binding is documented in
`OPENCLAW_NATIVE_ENGINEERING_CONTEXT_PROVIDER_SOURCE_TASK_PLAN.md`. It keeps
the provider egress task id as the approval owner while allowing an explicit
existing engineering task to supply the bounded context. The source task must
exist, and both ids plus the materialized content hash are retained as compact
provenance.

## Evidence

Runtime:

```text
services/openclaw-core/src/cloud-live-provider-runtime-context-packet.mjs
services/openclaw-core/src/cloud-live-provider-runtime-live-execution.mjs
services/openclaw-core/src/task-executor.mjs
```

Tests:

```text
services/openclaw-core/test/cloud-live-provider-runtime-context-packet.test.mjs
services/openclaw-core/test/cloud-live-provider-runtime-live-execution.test.mjs
services/openclaw-core/test/task-executor.test.mjs
```

The tests prove explicit flag handling, local work-view read assembly, plan/todo
assembly, sensitive payload exclusion, compact durable evidence, and the
existing hash-bound live execution path.

## Deferred

```text
automatic provider calls
automatic use of provider recommendations
raw page or visual payload transfer
long-lived LSP or ACPX/Codex process execution
new provider routes or credential sources
desktop-wide capture, root work, and arbitrary endpoint execution
```

## Next Smallest Capability

Keep this bridge transient and review-only. Select a further Level 2 action only
after a concrete operator decision cannot be made from the current bounded
observation and plan/todo summaries.
