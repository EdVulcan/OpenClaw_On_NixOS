# OpenClaw Native Engineering Context Packet Plan

Updated: 2026-07-13

## Active Slice

Local governed engineering context assembly.

This slice gives OpenClaw a cohesive local owner for preparing model-ready
engineering context without invoking a provider. It combines bounded command
transcripts, task summaries, verification summary, recovery summary, output
redaction, and the native microcompact projection into one packet.

Identity alignment: Level 1, stable user-space control plane.

## Endpoint

```text
POST /plugins/native-adapter/engineering-context/packet
registry: openclaw-native-engineering-context-packet-v0
capability: sense.openclaw.engineering_context.packet
```

Optional request fields select an existing task, transcript count, per-record
output limit, microcompact threshold, and recent assistant-turn protection.

## Implemented Behavior

The packet owner:

```text
reads the existing command transcript ledger and task map
reuses existing verification and recovery builders
orders selected command evidence chronologically
adds bounded task goal/status/outcome summaries
caps stdout/stderr per record
redacts password/token/secret/api-key/credential, Bearer, and sk-* patterns
applies the native in-memory microcompact projection
marks verification and recovery summaries as protected evidence
persists a summary-only audit event before returning packet content
fails closed with HTTP 503 when audit persistence is unavailable
is available from an explicit Observer control that reuses the same core route
and displays bounded packet summaries and messages without provider consumption
```

## Governance

```text
local context assembly only
no credential-store read
no task, transcript, or event-content mutation
no task or approval creation
no command execution
no provider SDK or provider call
no network egress
no raw packet content in audit events
```

The packet may contain bounded local command output because its purpose is to
prepare useful engineering context. Credential-like output is redacted first,
and callers can scope the packet to one task.

## Evidence

Implementation:

```text
services/openclaw-core/src/native-engineering-context-packet.mjs
services/openclaw-core/src/native-engineering-context-routes.mjs
```

Tests:

```text
services/openclaw-core/test/native-engineering-context-packet.test.mjs
services/openclaw-core/test/native-engineering-context-routes.test.mjs
services/openclaw-core/test/route-handlers.test.mjs
apps/observer-ui/src/observer-panels-engineering-context.mjs
apps/observer-ui/src/client-script-renderers-engineering-context.mjs
apps/observer-ui/src/client-script-refreshers-engineering-context.mjs
nix/scripts/dev-openclaw-native-engineering-context-packet-common-check.sh
```

Tests prove task filtering, output bounds, credential-like redaction,
microcompaction, verification/recovery protection, no provider/network flags,
and summary-only audit publication. The core/Observer milestone also proves an
explicit packet build from an approved command transcript, visible HTML/client
tokens, redaction and microcompaction evidence, and no provider/network use.

## Deferred

```text
automatic packet persistence
automatic task execution or recovery
unbounded transcript/output inclusion
provider SDK loading
provider calls or network egress outside the explicitly approved live-provider task
credential value access outside the existing sender gate
```

## Observer Follow-Up Complete

Observer now exposes a `Build Context Packet` control in a dedicated panel. It
uses the selected task when present, otherwise the bounded current ledger, and
renders the returned packet only after the operator requests it. The control
does not create a task, approval, command, provider request, or persistent packet
artifact.

## Provider Handoff Follow-Up Complete

The existing approved live-provider task can now consume this packet through
the same explicit `POST /operator/step` execution call. The handoff is:

```text
bounded transcript/task evidence -> redaction and microcompact -> one bounded
provider message -> existing endpoint/credential/egress gate -> transient response
```

The operator must request `contextPacket` with the current task id; a manual
`requestEnvelope` and context packet cannot be combined. The bridge reuses the
existing verification and recovery evidence builders, keeps packet content in
the current execution request only, and persists only counts, hashes, redaction,
truncation, and materialization evidence. No new provider route, task type,
automatic call, credential read path, or Observer execution control was added.

This advances the Level 1 cloud-consciousness boundary from local context
assembly to an explicitly approved provider handoff while preserving local
operator control.

## Next Slice

The next provider-related slice, if selected, should define an explicit local
response transcript/readback retention policy before persisting any assistant
content. Until that policy is chosen, keep provider response content transient
and do not resume the historical Phase 59-136 wrapper chain.
