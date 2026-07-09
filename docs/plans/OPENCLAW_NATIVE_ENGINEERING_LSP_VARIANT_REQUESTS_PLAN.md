# OpenClaw Native Engineering LSP Variant Requests Plan

Updated: 2026-07-10

## Active Slice

Governed LSP references and hover variants.

This slice proves that the existing approval-gated `symbol_request` lifecycle
task is not definition-only. It maps `references` and `hover` through the same
proposal, task, approval, short-lived process, bounded response summary, and
Observer control path.

Identity alignment: Level 1, stable user-space control plane.

## Implemented Behavior

The existing LSP symbol lane now covers:

```text
definition -> textDocument/definition
references -> textDocument/references with includeDeclaration=true
hover -> textDocument/hover
```

The Observer LSP panel exposes explicit controls:

```text
Create Definition Task
Create References Task
Create Hover Task
```

All three controls call the same `POST /plugins/native-adapter/engineering-lsp/lifecycle-tasks`
route with `lifecycleAction=symbol_request` and a selected `symbolAction`.

## Boundaries

This slice still blocks:

```text
automatic approval
automatic operator step
multi-request symbol navigation sessions
long-lived language-server process pools
raw response payload exposure
raw source body exposure
provider calls, network egress, root/system daemon work
workspace mutation
```

## Evidence

Runtime:

```text
services/openclaw-core/src/native-engineering-lsp-symbol-request-proposal-builders.mjs
services/openclaw-core/src/native-engineering-lsp-protocol-handshake.mjs
apps/observer-ui/src/observer-panels-operations.mjs
apps/observer-ui/src/client-script-runtime-bindings.mjs
apps/observer-ui/src/client-script-runtime-engineering-loop-controls.mjs
```

Validation targets:

```text
services/openclaw-core/test/native-engineering-lsp-evidence-builders.test.mjs
services/openclaw-core/test/native-engineering-lsp-protocol-handshake.test.mjs
observer-openclaw-native-engineering-lsp-evidence
```

## Follow-up Completed

The target selection follow-up was completed as:

```text
OPENCLAW_NATIVE_ENGINEERING_LSP_RESPONSE_TARGET_SELECTION_PLAN.md
```

It records bounded URI/range target descriptors and a selected target from the
approved symbol response summary without exposing raw response payloads or
mutating the workspace.
