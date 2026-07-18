# NixSoma Systemd Incident Reviewed Action Plan

Updated: 2026-07-18

## Purpose

Let one structured provider recommendation lead to a useful operator-reviewed,
read-only action without gaining repair authority. The action opens the exact
terminal incident task already bound into the approved provider handoff, so the
operator can inspect its receipt and recovery evidence in Observer.

This reuses `engineering_recommendation_v0`, the protected Core task-detail
route, and the existing Observer task-history panel. It adds no response schema,
Core route, capability executor, task type, approval type, or hostd operation.

## Delivered Flow

```text
approved systemd incident provider task
-> transient review_systemd_incident_evidence recommendation
-> explicit Use Recommendation selection in Observer
-> read persisted provider task through operator-authenticated Core route
-> verify recommendation and stored systemd context binding
-> read and verify the exact bound terminal incident task
-> show its existing receipt and recovery evidence in task detail
```

## Binding

Observer accepts the action only when all of these agree:

- recommendation registry and `engineering_recommendation_v0` contract;
- fixed `review_systemd_incident_evidence` action id;
- existing `load-selected-task-button` read-only control;
- completed provider task id from the transient Operator result;
- persisted valid recommendation action and review metadata;
- stored context source task id and receipt hash;
- terminal incident task id, receipt registry, receipt hash, and fixed unit.

An absent task, mismatched action, changed receipt, divergent source id, or
different unit is rejected before Observer changes the selected task detail.

## Authority Boundary

- Explicit operator selection remains required.
- The action has no executable capability id and requires no mutation approval.
- It performs two protected Core task reads only.
- It creates no task, approval, provider request, command, retry, or repair.
- It does not invoke system-sense, system-heal, hostd, activation, or rollback.
- No provider response text enters task detail or persistent review evidence.

## Evidence

- response-contract allowlist and parsing tests;
- systemd incident request and live-execution recommendation tests;
- generated Observer client syntax;
- positive bound-source task-detail review;
- persisted-action mismatch rejection before UI selection changes.

## Next Real Capability

The separately reviewed read-only refresh is complete through
`OPENCLAW_SYSTEMD_INCIDENT_REVIEWED_REFRESH_PLAN.md`. The next capability should
create a compact hash-bound local receipt for the new observation without
retaining journal messages, automatically contacting a provider, or authorizing
repair.
