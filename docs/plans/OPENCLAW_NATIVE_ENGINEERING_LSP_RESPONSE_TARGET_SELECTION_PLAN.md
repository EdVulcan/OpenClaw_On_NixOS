# OpenClaw Native Engineering LSP Response Target Selection Plan

Updated: 2026-07-10

## Active Slice

Governed LSP response target selection.

This slice turns approved single-request LSP symbol responses into bounded
target descriptors. It records URI/range metadata and a default selected target
inside the existing symbol response summary, so a later read/search action can
continue from a concrete target without exposing raw source bodies or raw LSP
response payloads.

Identity alignment: Level 1, stable user-space control plane.

## Implemented Behavior

The symbol response summary now records:

```text
targetCount
targetLimit
targetsTruncated
targets[]
selectedTarget
rawTargetsIncluded=false
```

Each target includes only:

```text
uri
range.start.line
range.start.character
range.end.line
range.end.character
```

The Observer Engineering Loop readback displays the selected target and keeps
the route in review/readback mode only.

## Boundaries

This slice still blocks:

```text
automatic target follow-up reads
automatic read/search task creation
raw response payload exposure
raw source body exposure
multi-request symbol navigation sessions
long-lived language-server process pools
provider calls, network egress, root/system daemon work
workspace mutation
```

## Evidence

Runtime:

```text
services/openclaw-core/src/native-engineering-lsp-protocol-handshake.mjs
apps/observer-ui/src/client-script-runtime-engineering-loop-controls.mjs
```

Validation targets:

```text
services/openclaw-core/test/native-engineering-lsp-protocol-handshake.test.mjs
services/openclaw-core/test/task-executor.test.mjs
openclaw-native-engineering-lsp-evidence
observer-openclaw-native-engineering-lsp-evidence
```

## Next Slice

The next smallest real capability is:

```text
LSP selected-target read bridge
```

That follow-up should use the selected target URI/range metadata to propose a
bounded native read/search follow-up, still requiring explicit operator action
and still avoiding raw LSP payload exposure, long-lived process pools, provider
egress, and workspace mutation.
