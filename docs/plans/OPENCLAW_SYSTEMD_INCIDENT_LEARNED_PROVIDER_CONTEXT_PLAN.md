# NixSoma Systemd Incident Learned Provider Context Plan

Updated: 2026-07-18

## Purpose

Let bounded local incident experience influence a later explicitly approved
systemd diagnosis request. This completes the first useful experience loop:
terminal repair outcomes are absorbed locally, recalled for the same fixed
target, and included in the exact request that the operator approves.

The path reuses the existing systemd incident handoff and
`engineering_recommendation_v0`. It adds no provider schema, endpoint, route,
credential owner, approval type, or host authority.

## Delivered Flow

```text
terminal fixed-target incident receipt
-> recall at most four local records so the current receipt can be excluded
-> accept at most three safe matching-target prior patterns
-> build one deterministic incident plus learned-pattern projection
-> bind projection and exact request hash before approval
-> reconstruct receipt and learned patterns at Operator Step/Run
-> reject source or learned-context drift
-> execute only through the existing approved DeepSeek sender
```

## Provider Projection

Each prior pattern contains only:

- source receipt hash;
- restored, pre-health, and post-health booleans;
- journal availability and a bounded entry count;
- restart-success and fixed native-mutation booleans.

The projection excludes the current receipt, records from another unit,
malformed hashes, unbounded counts, generic lesson text, journal messages,
service URLs, errors, provider output, invocation identity, peer identity, and
raw D-Bus job paths. Unsafe records are ignored rather than serialized.

## Binding And Drift

The learned projection is inside the same provider context hash and request hash
approved by the operator. Execution re-runs matching-target recall and rebuilds
the request. A newly recorded matching incident that changes the selected prior
patterns invalidates the stored projection and blocks contact until a fresh
task is created and approved.

Unrelated memory changes that do not alter the selected bounded patterns do not
change the request.

## Authority Boundary

- Creating the handoff task remains local and does not read a credential.
- Existing high-risk provider approval remains mandatory.
- Experience records cannot create a provider task or trigger egress.
- Provider output cannot write an experience record.
- The recommendation cannot invoke hostd, retry repair, activate a generation,
  or roll back the host.
- No real provider contact or host mutation was executed for this slice.

## Evidence

- `services/openclaw-core/src/systemd-incident-provider-context.mjs`
- Plan Builder to credential-egress and Task Executor dependency wiring
- request projection, task persistence, drift rejection, live-execution compact
  evidence, and Observer focused tests
- full workspace, typecheck, Core Nix closure, registry, and path checks

## Deferred

- journal or provider-output learning;
- cross-target generalization;
- automatic task creation, approval, egress, or repair;
- recommendation-driven experience writes;
- provider-specific systemd response schemas.

## Next Real Capability

Give `engineering_recommendation_v0` one systemd-relevant, read-only reviewed
action that opens the existing incident receipt/recovery evidence for the bound
source task. Reuse the existing Observer task detail and operator review owner;
do not add hostd mutation, automatic retry, or a new provider response schema.
