# OpenClaw Nix Store Runtime Packaging Plan

## Purpose

Advance the kernel evolution whitepaper's Phase A by replacing mutable
`/opt/openclaw` service execution with reproducible, read-only `/nix/store`
runtime closures. This is packaging of the existing user-sovereign body, not a
root daemon, hostd, D-Bus, eBPF, or self-rebuild capability.

## Migration Rules

- Migrate one cohesive service closure at a time and keep an explicit mutable
  fallback for services not yet proven.
- Include only runtime files and local imports required by that service. Do not
  copy the monorepo, tests, caches, artifacts, or unrelated shared modules into
  a closure.
- Preserve service ownership, public routes, state/log paths, environment,
  dependency ordering, browser sandboxing, and recovery semantics.
- A service counts as migrated only when Nix builds the derivation, generated
  systemd config points into its store path, the source is read-only, and a real
  process exercises representative behavior from that path.
- Introduce a shared packaging factory only after two concrete service
  closures prove the same file-selection and unit-wiring shape.

## Completed: Event Hub

`openclaw-event-hub` is the first store-native service closure:

- `nix/packages/openclaw-event-hub.nix` includes only the event-hub package and
  server plus `shared-utils/package.json` and `shared-utils/src/http.mjs`.
- `packages.x86_64-linux.openclaw-event-hub` builds the closure through the
  flake.
- `services.openclaw.runtimePackages.eventHub` defaults to that package while
  retaining `null` as an explicit mutable-repository fallback.
- The generated event-hub unit sets
  `OPENCLAW_BODY_RUNTIME_SOURCE=nix-store` and uses
  `$package/share/openclaw/services/openclaw-event-hub` as WorkingDirectory.
- Other service specs still report `mutable-repo` and continue using
  `services.openclaw.repoRoot`; Phase A is not falsely declared complete.

The existing `dev-body-config-check.sh` milestone now:

1. builds the flake package,
2. rejects unrelated work-view modules in the closure,
3. verifies the server source is read-only,
4. evaluates the real NixOS unit and rejects `/opt/openclaw`,
5. starts Node from the store WorkingDirectory, and
6. proves real health plus persisted audit event write/read behavior using a
   separate writable state directory.

## Evidence

- Package: `nix/packages/openclaw-event-hub.nix`
- Module: `nix/modules/openclaw-body.nix`
- Flake export: `packages.x86_64-linux.openclaw-event-hub`
- Targeted milestone: `nix/scripts/dev-body-config-check.sh`
- Identity route: kernel whitepaper Phase A, before privileged Level 3 work

## Deferred

- Eight remaining OpenClaw services still execute from `repoRoot`.
- No shared closure factory exists yet; one service is insufficient evidence.
- npm dependency closure handling for browser-runtime and Observer is not yet
  designed.
- No root service, hostd, D-Bus control, eBPF probe, Nix self-edit, rebuild, or
  rollback action is enabled.

## Next Slice

Package `openclaw-screen-sense` as the second store-native service. Include its
exact `shared-events` and `shared-utils` runtime imports, preserve its current
system ownership and upstream URLs, evaluate the generated unit, and run a real
screen readback against bounded mock or existing local upstream services from
the store path. After both closures pass, assess whether a small manifest-driven
packaging helper removes real duplication without hiding each service's runtime
files.
