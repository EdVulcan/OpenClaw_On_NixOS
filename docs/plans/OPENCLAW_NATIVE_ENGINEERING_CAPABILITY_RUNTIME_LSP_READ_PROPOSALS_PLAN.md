# OpenClaw Native Engineering Capability Runtime LSP Read Proposals Plan

Updated: 2026-07-16

## Active Slice

Expose the existing read-only and proposal-only LSP refresh builders through the
common `POST /capabilities/invoke` runtime and route the Observer LSP panel
through that shared policy, invocation, and event boundary.

Identity alignment: Level 1, stable user-space control plane.

## Demonstrated Gap

The LSP symbol-request task and its downstream selected-target loop were already
governed, but the Observer LSP panel still refreshed four existing read/proposal
surfaces directly through native-adapter routes. A local capability consumer
therefore could not request the same LSP evidence and proposal contracts through
the common runtime.

## Implemented Behavior

The common registry and handler now expose:

```text
sense.openclaw.engineering_tool.lsp_evidence
plan.openclaw.engineering_tool.lsp_lifecycle
plan.openclaw.engineering_tool.lsp_source_transfer
plan.openclaw.engineering_tool.lsp_symbol_request
```

Each capability delegates to the existing LSP builder owner. The Observer LSP
refresh uses four explicit capability invocations and unwraps only the transient
builder results required by the existing renderer. The explicit lifecycle,
source-transfer, symbol-request task, approval, operator-step, selected-target,
edit, verification, and recovery routes remain unchanged.

## Governance

```text
normal local capability policy, invocation ledger, and capability events
evidence and proposal descriptors remain audit_only
source previews and any transient builder response stay outside invocation summaries and events
no server binary check, LSP process start, didOpen transfer, or JSON-RPC request
no task or approval creation from the refresh capability path
no workspace mutation, provider call, credential access, or network egress
long-lived LSP pools remain deferred
```

The source-transfer result may still contain its bounded preview in the
transient response consumed by the existing renderer. The capability summary
and event evidence retain only hashes, counts, action metadata, and negative
authority flags.

## Evidence

Runtime:

```text
services/openclaw-core/src/capability-descriptors.mjs
services/openclaw-core/src/capability-runtime-engineering-lsp.mjs
services/openclaw-core/src/capability-runtime.mjs
apps/observer-ui/src/client-script-refreshers-workspace-source.mjs
```

Focused unit coverage:

```text
services/openclaw-core/test/capability-runtime-engineering-lsp.test.mjs
```

Real service coverage:

```text
openclaw-native-engineering-lsp-evidence
observer-openclaw-native-engineering-lsp-evidence
```

The Observer check proves all four capability responses, the existing direct
LSP read models, served client wiring, and the absence of source preview content
from capability invocation evidence.

## Deferred

```text
automatic lifecycle/source-transfer/symbol task creation
automatic approval or operator execution
additional LSP request variants or multi-request sessions
long-lived process pools and language-server installation
selected-target edit execution beyond the existing approval-gated loop
provider egress, credentials, root/system daemon work, and desktop capture
```

## Next Smallest Capability

This closes the concrete Observer LSP common-path gap. Do not add another LSP
evidence or readiness wrapper from historical plan text. Select the next slice
only from a new user-visible local capability gap with an explicit authority
owner; the existing LSP task and selected-target engineering loop remain the
execution path.
