# OpenClaw Native Engineering Verification Work Standards Coverage Plan

Updated: 2026-07-10

## Active Slice

Verification evidence work standards coverage.

This slice extends the existing native engineering verification evidence route
with read-only coverage against `openclaw-engineering-work-standards-v0`. It
does not add a new endpoint, milestone lane, task creation path, approval path,
command execution path, or mutation path.

Identity alignment: Level 1, stable user-space control plane.

## Implemented Behavior

Existing endpoint:

```text
GET /plugins/native-adapter/engineering-verification/evidence
```

now returns:

```text
workStandardsCoverage.registry: openclaw-engineering-work-standards-task-coverage-v0
workStandardsCoverage.status
workStandardsCoverage.score
evidence[].workStandardsCoverage
summary.workStandardsCovered
summary.workStandardsRecoveryRecommended
```

The coverage answers whether each verification transcript is attached to a
completed task outcome and can support the work standard:

```text
verification_evidence_before_report
```

A failed verification can still satisfy evidence-before-report when the failure
is attached to task completion; the route then recommends recovery evidence
instead of treating the missing pass as missing evidence.

## Governance

The route remains read-only:

```text
no new command execution
no shell invocation
no task creation
no approval creation
no mutation
no provider call
no automatic recovery rerun
```

## Evidence

Runtime builder:

```text
services/openclaw-core/src/native-engineering-verification-evidence-builders.mjs
```

Observer renderer:

```text
apps/observer-ui/src/client-script-renderers-engineering-verification.mjs
```

Validation targets:

```text
services/openclaw-core/test/native-engineering-verification-evidence-builders.test.mjs
openclaw-native-engineering-verification-evidence
observer-openclaw-native-engineering-verification-evidence
```

## Deferred

The following remain deferred:

```text
server-side policy enforcement from prompt standards
automatic task approval
automatic command execution
automatic retry or recovery rerun
provider/network egress
root/system daemon work
```

## Next Slice

The next safe slice should use the coverage in existing recovery or completion
readbacks only when it reduces operator ambiguity without adding another
readiness chain.
