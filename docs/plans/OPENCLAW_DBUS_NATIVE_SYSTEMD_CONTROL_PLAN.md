# OpenClaw Native D-Bus Systemd Control Plan

## Purpose

Advance kernel-whitepaper Phase B by replacing command-line `systemctl`
wrappers with a native Node.js D-Bus boundary. Start with real read-only systemd
unit inventory from the local system bus; privileged mutation and Polkit policy
remain separate later slices.

## Phase A Prerequisite

Phase A is complete: all nine main services and the non-auto-started trusted
sidecar template execute from reviewed read-only Nix store closures while state,
logs, browser profiles, and recovery intent remain on explicit writable paths.
The `dev-body-config-check.sh` milestone builds every closure, evaluates every
unit, and runs representative behavior from each store path.

## Existing Command Seams

- `openclaw-system-sense/src/systemd-inspection.mjs` invokes `systemctl show`
  for read-only unit inventory.
- Core repair execution still delegates a fixed `systemctl restart` command to
  a Nix-generated helper, optionally through narrowly scoped sudo.
- Existing repair proposals, approvals, audit evidence, Observer routes, and
  fail-closed behavior must remain stable while transport changes underneath.

## First Slice: Read-Only Native Inventory

1. Add one maintained Node D-Bus client as an explicit system-sense production
   dependency and package it reproducibly from the committed lockfile.
2. Introduce a cohesive systemd D-Bus adapter that connects to the local system
   bus and reads unit properties without shelling out.
3. Inject that adapter into the existing systemd inspection owner; preserve the
   current inventory response and Observer contract rather than adding a new
   readiness route.
4. Keep the current command adapter only until native inventory equivalence is
   proven on the VM, then remove it and fail closed when D-Bus is unavailable.
5. Prove at least one real OpenClaw unit inventory result through D-Bus and
   attach transport evidence to the existing readback.

## Boundaries

- Identity route: first bounded Level 3 substrate, still initiated by the
  existing user-space control plane.
- No service restart/start/stop/reload through D-Bus in the first slice.
- No root daemon, hostd, Polkit rule, sudo expansion, password prompt, or new
  privileged socket.
- No arbitrary bus name, object path, interface, method, or unit supplied by an
  external request.
- No removal of the existing approved repair path until native mutation has its
  own policy, authorization, audit, recovery, and VM proof.

## Evidence

- Focused adapter and inspection unit tests prove the fixed read-only method set,
  bounded unit names, property allowlist, native-first behavior, and fail-closed
  handling without command fallback.
- `dev-openclaw-systemd-unit-inventory-check.sh` proves all nine unit records and
  a real `loaded/active/running` core unit through `dbus_native` transport.
- `dev-observer-openclaw-systemd-unit-inventory-check.sh` proves the same native
  evidence remains visible through the existing Observer panel.
- The system-sense Nix closure contains 20 reviewed runtime source files plus
  the lockfile-pinned production D-Bus dependency and excludes Puppeteer and
  workspace development packages.

## Completed First Slice

The read-only native inventory slice is complete. System-sense now uses only
`org.freedesktop.systemd1.Manager.GetUnit` and
`org.freedesktop.DBus.Properties.GetAll`, retains only eight allowlisted unit
properties, and closes the bus after each inventory. The public route and
Observer contract are unchanged, while response evidence identifies
`source.transport = "dbus_native"` and contains no read-only command evidence.
If the system bus is unavailable, inventory remains planned and unobserved; it
does not shell out to `systemctl`.

## Deferred

- D-Bus start/stop/restart/reload operations.
- Polkit policy and authorization-agent integration.
- Dedicated `openclaw-hostd` ownership boundary.
- Removal of the fixed sudo repair helper.
- eBPF kernel event transport and declarative Nix self-evolution.

## Next Slice

Design and authorize the smallest native systemd mutation behind the existing
repair proposal, approval, audit, and recovery path. This requires an explicit
Polkit/privilege decision before implementation. Do not invoke `RestartUnit`,
change host policy, or remove the existing fixed repair helper without that
authority and a real VM recovery proof.
