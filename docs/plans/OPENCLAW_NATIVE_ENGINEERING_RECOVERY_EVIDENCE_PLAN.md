# OpenClaw Native Engineering Recovery Evidence Plan

Updated: 2026-07-15

## Active Slice

Observer visibility, common capability access, and recovery evidence for native
engineering tool failures.

This slice follows the native `cc_verify` evidence route by making failed
engineering command evidence recoverable to an operator. It does not create a
new recovery executor. It reads failed verification evidence and failed
approval-gated source-command task outcomes, then returns bounded recovery
recommendations and the existing governed recovery endpoint path when a task is
recoverable.

Identity alignment: Level 1, stable user-space control plane.

## Endpoint

```text
GET /plugins/native-adapter/engineering-recovery/evidence

registry: openclaw-native-engineering-recovery-evidence-v0
mode: failed-native-engineering-tool-recovery-evidence
```

Capability mapping:

```text
observer recovery evidence -> sense.openclaw.engineering_tool.recovery_evidence
```

## Implemented Behavior

The native builder:

```text
reads the existing native engineering verification evidence response
reads failed source-command task outcomes when verification evidence is missing
classifies nonzero exit, timeout, incomplete task, and unattached evidence
marks recoverable tasks by using the existing task-recovery rules
marks tasks that already have a recovery task
returns operator-facing recommendations without invoking them
returns read-only work standards coverage inherited from verification evidence
returns audit evidence and Observer-visible governance boundaries
```

The recovery recommendation can include:

```text
/tasks/:taskId/recover
```

That endpoint is only reported as an operator action. The evidence endpoint does
not call it.

## Common Capability Runtime Bridge

The same read-only recovery readback is now available through the common
`POST /capabilities/invoke` path as:

```text
sense.openclaw.engineering_tool.recovery_evidence
```

The bridge reuses the existing verification and recovery builders. It reads the
bounded command-transcript ledger, capability invocation ledger, and task map,
then records the normal policy, invocation, and capability-event evidence.
The response may contain the existing bounded failure previews, while the
invocation and event records keep only failure counts and governance flags.

The direct route remains the Observer read model owner. Neither entry point
creates a recovery task or approval, executes or retries a command, mutates the
workspace, calls a provider, or performs network egress.

## Deferred

The following remain deferred:

```text
automatic recovery task creation
approval creation
command rerun or retry execution
filesystem mutation
provider calls, network egress, result envelopes
LSP startup
```

Actual recovery remains the existing governed task recovery route plus the
existing approval-gated command task path.

## Evidence

Runtime builder:

```text
services/openclaw-core/src/native-engineering-recovery-evidence-builders.mjs
services/openclaw-core/src/capability-runtime-engineering-recovery.mjs
services/openclaw-core/src/capability-runtime.mjs
services/openclaw-core/src/capability-descriptors.mjs
```

Route wiring:

```text
services/openclaw-core/src/observer-read-model-routes.mjs
```

Observer visibility:

```text
apps/observer-ui/src/observer-panels-operations.mjs
apps/observer-ui/src/client-script-renderers-engineering-recovery.mjs
```

Work standards coverage:

```text
OPENCLAW_NATIVE_ENGINEERING_RECOVERY_WORK_STANDARDS_COVERAGE_PLAN.md
```

Validation target:

```text
services/openclaw-core/test/native-engineering-recovery-evidence-builders.test.mjs
services/openclaw-core/test/capability-runtime-engineering-recovery.test.mjs
openclaw-native-engineering-recovery-evidence
observer-openclaw-native-engineering-recovery-evidence
capability-invoke
observer-capability-invoke
```

Direct route validated on 2026-07-09:

```text
node --test services/openclaw-core/test/native-engineering-recovery-evidence-builders.test.mjs services/openclaw-core/test/route-handlers.test.mjs services/openclaw-core/test/native-adapter-plugin-routes.test.mjs
npm --workspace @openclaw/openclaw-core run typecheck
npm --workspace @openclaw/observer-ui run typecheck
OPENCLAW_MILESTONE_CHECKS=openclaw-native-engineering-recovery-evidence,observer-openclaw-native-engineering-recovery-evidence bash nix/scripts/dev-milestone-check.sh
```

Common capability bridge validated on 2026-07-15:

```text
node --test services/openclaw-core/test/capability-runtime-engineering-recovery.test.mjs services/openclaw-core/test/native-engineering-recovery-evidence-builders.test.mjs
npm --workspace @openclaw/openclaw-core test
npm --workspace @openclaw/observer-ui run typecheck
bash nix/scripts/dev-openclaw-native-engineering-recovery-evidence-check.sh
bash nix/scripts/dev-observer-openclaw-native-engineering-recovery-evidence-check.sh
bash nix/scripts/dev-capability-invoke-check.sh
bash nix/scripts/dev-observer-capability-invoke-check.sh
bash nix/scripts/dev-body-config-check.sh
```

## Route Status

The direct route, Observer readback, and common capability-runtime entry point
are closed for this Level 1 recovery evidence slice. Do not add another
recovery/readiness shell. Continue with the smallest concrete Level 2
trusted-work-view/session-helper behavior while preserving explicit operator
review and local/provider/root boundaries.
