# OpenClaw Trusted Work-View Session Contract Plan

Updated: 2026-07-10

## Active Slice

Identity-upgrade bridge: trusted AI work-view session contract and helper
readiness recommendation.

This slice moves OpenClaw from a plain Level 1 user-space work-view readback
toward Level 2 trusted session/work-view behavior by making the AI-owned work
view boundary explicit in the existing session, browser, screen-sense, core, and
Observer state flow.

It does not create a root daemon, a desktop-wide capture path, a nested
compositor, a live provider path, or a new readiness-only phase.

## Real Capability

The existing work-view routes now carry a shared `trustedSession` contract:

```text
kind: openclaw-trusted-session-work-view-contract
identityLevel: level_2_trusted_session_work_view
boundary.workViewScope: ai_owned_work_view_only
operatorGates.reveal: explicit_operator_action
boundary.rootRequired: false
boundary.desktopWideCapture: false
boundary.hostMutation: false
helperReadiness.state: ready | prepared_hidden | needs_prepare | degraded
recoveryRecommendation.action: none | prepare_work_view | reveal_work_view
```

The helper readiness portion makes the contract actionable without adding a new
execution path. A visible work view reports `ready` with no recovery action. A
prepared hidden work view recommends `/work-view/reveal`. A missing or degraded
browser-runtime-backed work view recommends `/work-view/prepare`. All recovery
recommendations remain user-space, Observer-visible, and root-free.

The contract is emitted through:

```text
GET /work-view/state
GET /session/state
GET /browser/capture
GET /screen/current
GET /phase-3/background-work-view
Observer work-view and screen panels
```

## Evidence

Runtime contract builder:

```text
packages/shared-utils/src/work-view-trust.mjs
packages/shared-utils/test/work-view-trust.test.mjs
```

Service propagation:

```text
services/openclaw-session-manager/src/server.mjs
services/openclaw-browser-runtime/src/server.mjs
services/openclaw-screen-sense/src/server.mjs
services/openclaw-core/src/phase3-work-view-builders.mjs
```

Observer visibility:

```text
apps/observer-ui/src/client-script-refreshers-runtime.mjs
apps/observer-ui/src/client-script-refreshers-mvp-phases.mjs
```

Targeted milestone coverage:

```text
openclaw-ai-work-view-capture
observer-openclaw-ai-work-view-capture
openclaw-ai-work-view-capture-summary
observer-openclaw-ai-work-view-capture-summary
openclaw-phase-3-background-work-view
observer-openclaw-phase-3-background-work-view
```

## Deferred

The following remain intentionally deferred:

```text
single authoritative session identity across session-manager and browser-runtime
desktop-wide GNOME/Wayland capture
session helper process or sidecar installation
root/system daemon or polkit integration
nested compositor or graphics-stack-native workspace
host mutation and input execution beyond existing governed user-space paths
provider egress or credential access
automatic recovery execution; the contract recommends existing operator actions
```

## Next Slice

The next high-density identity-upgrade slice should turn helper readiness into a
recoverable operator workflow without escalating privileges:

```text
AI work-view helper recovery action bridge
```

That should reuse the existing `/work-view/state`, `/screen/current`, Observer
work-view panel, and `/work-view/prepare|reveal|hide` actions where possible.
It should keep automatic execution deferred; the useful increment is making the
recommended action explicit enough for Observer/operator control surfaces to
invoke the existing governed action deliberately.
