# Phase C Kernel Process-Exec Capture Plan

Status: implementation pushed; package build and switched-VM acceptance pending, 2026-07-13

## Purpose

Advance the kernel evolution whitepaper from the completed Nix-store and fixed
native D-Bus foundations to one real, read-only eBPF body nerve. The selected
capability is bounded `sched_process_exec` observation owned by system-sense.

This is a capability slice, not a general kernel event bus. A successful read
returns only `timestampNs`, `pid`, `uid`, and `comm` through a libbpf ring
buffer. The user-space route validates the event contract and exposes a
bounded read model through the existing core system-sense proxy and Observer.

## Identity Alignment

- Whitepaper level: Phase C, first eBPF kernel nerve.
- Runtime owner: store-native `openclaw-system-sense`.
- User-visible result: an operator can inspect recent process-exec events and
  distinguish disabled, captured, busy, unavailable, permission-denied, and
  invalid-output states.
- Authority: desktop-body configuration explicitly enables the capability and
  grants only `CAP_BPF` and `CAP_PERFMON` to the system-sense service.

## Implementation Contract

- BPF attachment: `sched_process_exec` tracepoint.
- Transport: libbpf ring buffer.
- Capture bounds: one fixed configuration window of at most 5 seconds and at
  most 4096 events; desktop defaults are 1000ms and 128 events.
- Output fields: `timestampNs`, `pid`, `uid`, `comm` only.
- Runtime behavior: one capture at a time, no automatic retry, no persistence,
  no policy execution, and no host mutation.
- Failure behavior: permission and execution failures become explicit bounded
  status values without exposing raw stderr, command paths, argv, or file
  content.

## Evidence

- `services/openclaw-system-sense/test/kernel-process-exec-capture.test.mjs`
  proves disabled behavior, bounds, field validation, permission redaction,
  and concurrent-request serialization.
- `services/openclaw-system-sense/test/system-kernel-event-routes.test.mjs`
  proves the read-only route dispatch contract.
- `services/openclaw-core/test/route-handlers.test.mjs` proves the production
  core proxy forwards the route to system-sense.
- `openclaw-kernel-process-exec-capture` and its Observer pair are the
  switched-VM acceptance checks for the explicit Nix probe path, capabilities,
  and validation child process observed through the core proxy.
- `dev-body-config-check.sh` is the acceptance check for the probe derivation,
  system-sense source closure, desktop service environment, and capability
  bounding set.

Local implementation, Nix evaluation/parse, shell validation, system-sense
tests (45/45), core route tests (32/32), and Observer served-source assembly
checks pass. The actual derivation build was started but stopped after the
environment's cache transfer stalled at approximately 1.4 KB/s for the clang
closure; no compiler result or switched-VM event result is claimed yet.

## Deliberately Deferred

- command-line, executable path, file-content, environment, and network
  capture;
- network eBPF hooks, VFS hooks, syscall interception, blocking, or enforcement;
- persistent event black-box storage or automatic policy/action execution;
- arbitrary probe parameters, arbitrary tracepoints, root hostd expansion,
  kernel socket peer credentials, and declarative Nix self-evolution.

## Next Slice

After the real capture and Observer proof, select the smallest useful event
readback or bounded event ledger requirement. Do not add more eBPF event kinds
until the process-exec read model demonstrates a concrete operator gap.
