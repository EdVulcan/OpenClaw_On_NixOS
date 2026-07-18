# NixSoma Systemd Incident Reviewed Refresh Plan

Updated: 2026-07-18

## Purpose

Let a structured provider recommendation refresh current system evidence after
explicit operator review, without turning guidance into repair authority. The
action is bound to the same terminal incident receipt as the approved provider
task and refreshes only existing read-only Observer owners.

This reuses `engineering_recommendation_v0`, protected Core task detail, body
health, native fixed-unit inventory, and bounded service journal evidence. It
adds no provider schema, Core route, task, approval, command path, or hostd
operation.

## Delivered Flow

```text
approved systemd incident provider task
-> transient refresh_systemd_incident_observation recommendation
-> explicit Use Recommendation selection in Observer
-> reconstruct and verify provider task plus terminal incident receipt
-> fix the journal selector to the receipt's unit
-> refresh body health, native unit inventory, and bounded journal evidence
-> show the new read-only observation in existing Observer panels
```

## Binding

The refresh reuses the reviewed action's shared resolver. Recommendation
registry, response contract, action, existing control, provider task, persisted
recommendation evidence, context source task, receipt hash, and fixed unit must
all agree before any system-sense read starts.

The journal target cannot be selected from caller text or the current UI value.
It is replaced with the unit from the verified terminal incident receipt.

## Authority Boundary

- Explicit operator selection remains required.
- The action has no executable capability id and no mutation approval.
- It reads body health, fixed-unit inventory, and bounded journal evidence only.
- It creates no task, approval, provider request, command, retry, or repair.
- It does not invoke system-heal, hostd, activation, or rollback.
- Endpoint failure renders the existing panel offline and never falls back to a
  mutation or broader query.

## Evidence

- response-contract allowlist and read-only action metadata test;
- shared provider/source/receipt binding regressions;
- exact bound-unit journal selector test;
- exact health, unit-inventory, and journal refresh-owner call test;
- generated Observer client syntax and full workspace validation.

## Next Real Capability

Create one compact hash-bound local observation receipt from the reviewed
refresh. Bind it to the provider task, source incident receipt, fixed unit,
health booleans, journal availability/count, and observation time. Do not store
journal messages, create automatic follow-up egress, or authorize repair.
