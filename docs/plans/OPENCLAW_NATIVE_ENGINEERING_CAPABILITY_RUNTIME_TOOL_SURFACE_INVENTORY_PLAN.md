# OpenClaw Native Engineering Tool Surface Inventory Capability Plan

## Active Slice

Expose the existing read-only native engineering tool surface inventory through
the common `POST /capabilities/invoke` runtime.

Identity alignment: Level 1, stable user-space control plane.

## Demonstrated Gap

The inventory already had a production builder, a dedicated Core route, and
Observer visibility, but capability consumers could not request it through the
common policy, invocation ledger, and capability-event path. That left the
declared native capability ahead of its runtime entry point.

## Implemented Behavior

The registry now exposes:

```text
sense.openclaw.engineering_tool_surface_inventory
```

The capability delegates to the existing inventory builder and returns the same
bounded transient metadata. Its common invocation summary keeps only workspace
identity, contract counts, source-index readability, the current documented
next-slice marker, and negative authority flags.

The dedicated route remains the detailed inventory read model and continues to
own source-contract evidence. No source body, package content, or tool output
is copied into invocation history or audit events.

## Observer Common-Path Closure

The existing Observer engineering tool surface panel now requests the inventory
through `POST /capabilities/invoke` using
`sense.openclaw.engineering_tool_surface_inventory`. It unwraps only the
transient detailed result for the existing panel renderer; policy, invocation,
and capability-event evidence remains on the common runtime path. The direct
inventory route remains a read-model proof and builder owner, not a second UI
execution path.

## Governance

```text
audit-only local capability policy
existing native inventory builder remains authoritative
source metadata mapping only
no enhanced-source module import or tool-code execution
no verification command or LSP process start
no edit, patch, write, task, or approval creation
no provider call or external network egress
```

## Evidence

Runtime:

```text
services/openclaw-core/src/capability-runtime-engineering-tool-surface.mjs
services/openclaw-core/src/capability-descriptors.mjs
services/openclaw-core/src/capability-runtime.mjs
```

Focused and production-shape evidence:

```text
services/openclaw-core/test/capability-runtime.test.mjs
services/openclaw-core/test/native-engineering-tool-surface-builders.test.mjs
nix/scripts/dev-capability-invoke-check.sh
nix/scripts/dev-observer-capability-invoke-check.sh
```

## Deferred

```text
enhanced-source module loading or arbitrary tool execution
automatic task/approval creation from inventory metadata
LSP operational sessions and provider/network use
declarative host mutation, root/system daemon work, and desktop-wide capture
```

## Next Smallest Capability

Keep the inventory and Observer bridge read-only. Select the next concrete local
capability from the forward directive after this declared/runtime contract is
proven; do not turn the inventory into a generic tool dispatcher or action proxy.
