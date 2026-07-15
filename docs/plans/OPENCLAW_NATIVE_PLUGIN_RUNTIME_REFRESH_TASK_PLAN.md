# OpenClaw Native Plugin Runtime Refresh Task Plan

Updated: 2026-07-15

## Active Slice

Live plugin runtime refresh as a governed lifecycle action.

This slice upgrades the existing read-model refresh evidence into an
approval-gated OpenClaw-native fixed-registry generation lifecycle:

```text
POST /plugins/native-adapter/runtime-refresh-tasks
registry: openclaw-native-plugin-runtime-refresh-task-v0
task type: native_plugin_runtime_refresh
executor evidence: openclaw-native-plugin-runtime-refresh-task-execution-v0
```

Identity alignment: Level 1, stable user-space control plane.

## Implemented Behavior

The runtime refresh task now proves:

- explicit task creation with `confirm=true`
- explicit approval request creation
- `/operator/step` blocks before approval with `policy_requires_approval`
- approval converts the policy decision to audited execution
- approved operator execution builds and validates a new fixed native registry
  generation and atomically swaps it into the shared plan/runtime owner
- refresh evidence and task materialization use only the built-in native
  registry generation; they do not require a reviewed SDK package or manifest
  profile
- failed candidate validation leaves the old generation active
- the immediately previous generation remains available in memory
- the task plan records the pre-approval generation and task execution/readback
  records the previous-to-current generation transition
- subsequent native plugin capability plans resolve against the active
  generation and expose its id, sequence, and content hash
- task outcome stores refresh execution evidence and verification checks
- `/tasks/:taskId` readback exposes the persisted refresh execution evidence
- the active and immediately previous generation metadata is persisted in the
  existing core runtime state and restored after a core restart
- restored generation metadata is checked against the current fixed registry
  hash; invalid or unsupported state resets to generation 1 without restoring
  a stale registry
- Observer milestone coverage keeps the runtime refresh panel visible while
  proving the same approval-gated lifecycle
- Observer now exposes an explicit `Create Refresh Task` control that reuses the
  existing approval inbox and operator-step path; it does not approve or execute
  the task automatically

The executor refreshes the same active native registry generation used by:

```text
GET /plugins/native-adapter/runtime-refresh-evidence
```

This is a real core-state-backed lifecycle state change, not module-loader
activation. The fixed built-in descriptor set is rebuilt and validated before
swap; no workspace or external module path is accepted. Restart recovery
rehydrates only compact generation metadata and reconstructs the current
fixed registry locally.

## Common Capability Runtime Bridge

The existing evidence and task owners are also available through the common
`POST /capabilities/invoke` path as:

```text
sense.openclaw.plugin_runtime.refresh_evidence
act.openclaw.plugin_runtime.refresh_task
```

The evidence capability is read-only. The task capability requires an explicit
`confirm: true` parameter before it calls the existing task builder; that
builder creates the normal pending approval and the operator still must approve
and run the task. The common bridge adds no module import, plugin execution,
runtime activation, cache mutation, provider call, or network egress path.
The invocation ledger stores only generation/count/governance summaries.

## Governance

Capability mapping:

```text
live plugin runtime refresh -> act.openclaw.plugin_runtime.refresh_task
```

Approval and audit:

```text
requires explicit approval: true
creates task: true
creates approval: true
operator step before approval: blocked
approved execution: validated atomic fixed-registry generation swap
audit evidence: task outcome embedded execution record
Observer visibility: runtime refresh panel, explicit task control, and
task/readback milestone proof
```

Disabled boundaries:

```text
no plugin module import
no plugin code execution
no runtime activation
no discovery cache invalidation
no module cache invalidation
no install/enable/disable state mutation
no provider call
no network egress
no root/system daemon escalation
no automatic rollback or generation selection from an external path
```

## Evidence

Task builders:

```text
services/openclaw-core/src/native-plugin-runtime-refresh-task-builders.mjs
```

Route wiring:

```text
services/openclaw-core/src/native-plugin-runtime-routes.mjs
```

Task executor:

```text
services/openclaw-core/src/task-executor-native-plugin-runtime-refresh-handlers.mjs
packages/plugin-runtime/src/plugin-registry-generation-store.mjs
services/openclaw-core/src/capability-runtime-plugin-refresh.mjs
services/openclaw-core/src/capability-runtime.mjs
services/openclaw-core/src/capability-descriptors.mjs
```

Task readback field:

```text
nativePluginRuntimeRefresh.execution
```

Validation targets:

```text
services/openclaw-core/test/native-plugin-plan-builders.test.mjs
services/openclaw-core/test/native-plugin-runtime-routes.test.mjs
services/openclaw-core/test/task-executor.test.mjs
packages/plugin-runtime/test/plugin-runtime.test.mjs
services/openclaw-core/test/capability-runtime-plugin-refresh.test.mjs
openclaw-native-plugin-runtime-refresh-evidence
observer-openclaw-native-plugin-runtime-refresh-evidence
capability-invoke
observer-capability-invoke
```

## Deferred

The following remain deferred:

```text
plugin module import
plugin code execution
runtime activation
dynamic module discovery/import and loader cache invalidation
plugin install/enable/disable mutation
provider egress
result envelopes
root/system daemon work
explicit rollback action
```

The common capability bridge does not change these deferred boundaries.

## Route Status

The dedicated route, approval-gated fixed-registry lifecycle, restart recovery,
and common capability-runtime bridge are closed for this Level 1 plugin
governance slice. The next high-density product target remains:

```text
consume the governed Engineering Context Packet at an explicitly authorized
local model/provider boundary
```

Do not start provider egress or credential reads without explicit operator
authorization. If that boundary remains deferred, choose another real local
capability rather than extending plugin refresh with more readiness shells.
