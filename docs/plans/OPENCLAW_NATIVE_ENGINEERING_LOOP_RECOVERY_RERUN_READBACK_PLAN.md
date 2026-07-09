# OpenClaw Native Engineering Loop Recovery Rerun Readback Plan

Updated: 2026-07-09

## Active Slice

Native governed engineering recovery rerun readback.

This slice proves the recovery action draft can continue through the existing
approval/operator path and read back verification evidence for the recovered
task. It completes the failed-verification recovery loop without adding a new
shell executor, auto-approval path, or backend recovery wrapper.

Identity alignment: Level 1, stable user-space control plane.

## Implemented Behavior

The Engineering Loop State completion readback now understands recovery states.
For a created recovery task it reads:

```text
GET /plugins/native-adapter/engineering-recovery/evidence?taskId=:sourceTaskId
GET /plugins/native-adapter/engineering-verification/evidence?taskId=:recoveredTaskId
```

The readback reports:

```text
source failure recovery status
recovered task id
approval id when present
recovered-task verification rerun totals
rerun pass/fail count
governance boundary that readback does not execute or mutate
```

The recovery task still follows the existing path:

```text
failed approval-gated verification task
-> Observer drafts /tasks/:sourceTaskId/recover
-> operator explicitly creates recovered task
-> recovered task remains queued behind approval
-> operator approves recovered task
-> operator step reruns the existing source-command task
-> verification evidence attaches to the recovered task
-> recovery evidence remains linked to the source failure
```

## Boundaries

This slice does not:

```text
auto-approve recovered tasks
auto-run operator step after recovery creation
execute commands from the readback function
mutate files from the Observer
call providers or perform network egress
read credentials
create result envelopes
add a second recovery endpoint
```

## Evidence

Observer implementation:

```text
apps/observer-ui/src/client-script-runtime-engineering-loop-controls.mjs
```

Validation target:

```text
openclaw-native-engineering-loop-operator-controls
```

The targeted milestone now proves:

```text
failed source-command verification produces recovery evidence
explicit recovery task creation preserves approval gates
operator step is blocked before recovered task approval
after approval, the recovered verification task reruns through operator step
the rerun completes with attached verification evidence
source recovery evidence stays linked to the recovered task
Observer client contains recovery rerun readback route/state tokens
```

## Deferred

The following remain deferred:

```text
automatic recovery approval
automatic recovery rerun
state restoration after Observer reload from core task/approval history
provider calls, network egress, result envelopes
raw credential reads
```

## Next Slice

The next highest-density capability slice is:

```text
Native governed engineering planning workbench state bridge
```

That slice should turn existing plan/todo evidence into operator-visible
workbench state for engineering tasks without hidden planning modes or
filesystem todo mutation.
