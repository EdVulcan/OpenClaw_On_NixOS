# Native Capability Runtime System-Heal Bridge

## Status

Complete as a bounded Observer contract closure on 2026-07-16.

## Scope

The existing Observer system-heal controls now invoke the registered
`act.system.heal` capability through Core's common `/capabilities/invoke`
route. The service-heal control uses `heal.restart-service`; the maintenance
control uses `heal.maintenance.tick`. Both requests explicitly pass
`mode: "simulated"` and reuse the existing `openclaw-system-heal` owner.

This closes the declared/runtime/UI path gap without adding a new task,
approval, route, owner, or systemd API. Core policy evaluation, invocation
history, and capability events now cover these Observer actions.

## Boundaries

- The current system-heal service records simulated repair outcomes and does
  not restart a unit or mutate the host.
- Real systemd repair remains on the existing approved hostd/D-Bus lifecycle.
- No root authority, provider call, credential access, desktop capture, or
  automatic recovery was added.
- The UI does not accept arbitrary system-heal endpoints; it sends only the
  two explicit operations above.

## Evidence

- `apps/observer-ui/test/client-script-runtime-system-heal.test.mjs`
- `nix/scripts/dev-observer-capability-invoke-check.sh`
- `nix/scripts/dev-milestone-select-changed-checks.sh`

The focused and real checks must show Core capability invocation evidence and
the simulated mode contract while confirming that the served client contains
no direct system-heal mutation route.

## Next boundary

The next real host mutation remains the already-defined operator-approved
systemd repair path. Do not turn this simulated capability bridge into a live
restart or generic maintenance proxy.
