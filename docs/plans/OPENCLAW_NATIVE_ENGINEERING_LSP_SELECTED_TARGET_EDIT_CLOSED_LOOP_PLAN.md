# OpenClaw Native Engineering LSP Selected-Target Edit Closed Loop Plan

Updated: 2026-07-10

## Active Slice

LSP selected-target edit closed-loop proof.

This slice proves the continuous operator path from an approved LSP symbol
request target to a governed workspace edit:

```text
selected LSP target
-> selected-target edit seed
-> explicit edit task creation
-> approval-gated workspace_patch_apply
-> filesystem ledger
-> edit execution evidence
-> bounded readback
```

Identity alignment: Level 1, stable user-space control plane.

## Implemented Behavior

No new runtime endpoint is added. The existing LSP and edit surfaces are now
proven together by the LSP evidence milestone:

```text
GET /plugins/native-adapter/engineering-lsp/selected-target-edit-proposal-seed
POST /plugins/native-adapter/engineering-edit-proposal-tasks
POST /approvals/:id/approve
POST /operator/step
GET /filesystem/changes
GET /plugins/native-adapter/engineering-edit-execution/evidence
GET /plugins/native-adapter/engineering-read-search/read
```

The proof verifies:

```text
the seed comes from the completed bounded LSP selected target
the edit task is created only by an explicit operator request
the edit remains blocked before approval
the approved operator step applies the patch through act.openclaw.workspace_patch_apply
the filesystem ledger records the write
the edit execution evidence readback links to the completed task
the final bounded read returns the replacement and no longer returns the old exact line
```

## Boundaries

This slice still blocks:

```text
automatic edit task creation
automatic approval
automatic operator execution
automatic replacement generation
long-lived LSP process pools
multi-request LSP sessions
raw LSP response payload exposure
provider calls, network egress, root/system daemon work
```

## Evidence

Runtime reused:

```text
services/openclaw-core/src/native-engineering-lsp-selected-target-read-bridge-builders.mjs
services/openclaw-core/src/workspace-ops.mjs
services/openclaw-core/src/workspace-native-ops-routes.mjs
services/openclaw-core/src/native-engineering-edit-execution-evidence-builders.mjs
```

Milestone proof:

```text
nix/scripts/dev-openclaw-native-engineering-lsp-evidence-check.sh
openclaw-native-engineering-lsp-evidence
```

## Next Slice

The next smallest real capability is:

```text
LSP selected-target verification handoff
```

That follow-up should attach a verification command proposal or evidence
readback to the selected-target edit flow after manual approval/execution,
without creating another standalone readiness chain.
