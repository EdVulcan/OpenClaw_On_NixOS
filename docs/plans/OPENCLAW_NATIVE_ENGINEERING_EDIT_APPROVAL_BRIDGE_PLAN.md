# OpenClaw Native Engineering Edit Approval Bridge Plan

Updated: 2026-07-09

## Active Slice

Native governed engineering edit proposal approval bridge.

This slice connects reviewed `cc_edit`-style surgical edit proposal evidence to
the existing approval-gated `act.openclaw.workspace_patch_apply` task path. It
does not write files directly and does not approve or execute the task.

Identity alignment: Level 1, stable user-space control plane.

## Endpoint

```text
POST /plugins/native-adapter/engineering-edit-proposal-tasks

registry: openclaw-native-engineering-edit-proposal-task-v0
mode: approval-gated-edit-proposal-bridge
```

The route requires:

```text
confirm=true
bounded workspace-relative path
exactly one oldString match through native edit proposal validation
existing workspace_patch_apply approval gate
```

## Implemented Behavior

The bridge:

```text
rebuilds native engineering edit proposal evidence before task creation
refuses non-unique, oversized, unreadable, or out-of-workspace proposals
creates a workspace_patch_apply task only after explicit confirm=true
creates an approval request but does not approve it
keeps operator execution blocked until approval
verifies the regenerated proposal hashes match the patch task hashes
serializes task and approval responses through public redaction paths
returns proposal metadata and bounded diff preview without full file content
```

## Deferred

The following remain deferred:

```text
automatic approval
filesystem patch apply before approval
operator execution in this bridge route
edit execution evidence after approval
verification command execution after edit
automatic recovery task creation
provider calls, network egress, result envelopes
```

Approved edit execution remains the existing `workspace_patch_apply` task
capability. Future engineering-specific execution evidence should prove the
approved patch outcome, filesystem ledger, task transcript, Observer recovery,
and targeted verification without weakening the approval gate.

## Evidence

Bridge implementation:

```text
services/openclaw-core/src/workspace-ops.mjs
services/openclaw-core/src/workspace-native-ops-routes.mjs
```

Proposal source:

```text
services/openclaw-core/src/native-engineering-edit-proposal-builders.mjs
```

Observer token:

```text
apps/observer-ui/src/client-script-renderers-engineering-edit.mjs
```

Validation target:

```text
services/openclaw-core/test/workspace-native-ops-routes.test.mjs
openclaw-native-engineering-edit-approval-bridge
observer-openclaw-native-engineering-edit-approval-bridge
```

## Next Slice

The next recommended real capability is:

```text
Native governed engineering edit closed-loop proof
```

That slice may include a thin edit execution evidence readback, but it should
prove the full path: bounded read/search, edit proposal, approval-gated
workspace_patch_apply, filesystem ledger, Observer visibility, verification
command evidence, and recovery recommendation. It should not auto-approve or
bypass operator approval.
