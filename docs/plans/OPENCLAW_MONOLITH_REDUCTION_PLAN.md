# OpenClaw Monolith Reduction Plan

Created after Phase 116.

## Current Audit

Tracked files over 1000 lines: 14.

Tracked files over 2000 lines: 10.

Tracked files over 5000 lines: 4.

Largest files:

| Lines | File | Priority | Notes |
| ---: | --- | --- | --- |
| 16195 | `services/openclaw-core/src/cloud-live-provider-runtime-implementation.mjs` | P0 | Live provider runtime registry, governance, route builders, task factories, executor helpers, and long local-read chain are all in one module. |
| 12575 | `services/openclaw-core/src/plan-builder.mjs` | P0 | Plan construction and many phase surfaces share one module. |
| 5723 | `services/openclaw-core/src/plugin-review.mjs` | P1 | Plugin review flows should be split by review surface and provider/runtime checks. |
| 5004 | `services/openclaw-system-sense/src/server.mjs` | P1 | HTTP server, probes, summaries, and body/system sensing logic share one file. |
| 4388 | `services/openclaw-core/src/route-handlers.mjs` | P0 | Core route router is a single branch chain; live-provider routes are especially dense. |
| 3423 | `services/openclaw-core/src/task-executor.mjs` | P0 | Execution dispatch and executor implementations are mixed. |
| 3259 | `apps/observer-ui/src/client-script-refreshers-cloud.mjs` | P1 | Cloud refreshers should be split by provider/runtime/credential lane. |
| 2993 | `apps/observer-ui/src/client-script-runtime-actions.mjs` | P1 | Runtime actions should be split by command domain. |
| 2371 | `apps/observer-ui/src/server.mjs` | P1 | HTML shell is still embedded in the HTTP server. |
| 2347 | `docs/plans/OPENCLAW_SOURCE_INTEGRATION_STAGE_PLAN.md` | P3 | Long documentation, lower risk. |
| 1803 | `apps/observer-ui/src/client-script-refreshers-app.mjs` | P2 | App refreshers can be split after cloud refreshers. |
| 1746 | `services/openclaw-core/src/workspace-ops.mjs` | P2 | Workspace operations can be grouped by read/index/edit surfaces. |
| 1503 | `apps/observer-ui/src/client-script-renderers.mjs` | P2 | Renderer helpers can be grouped by task/event/workspace surfaces. |
| 1266 | `apps/observer-ui/src/client-script-config-dom.mjs` | P2 | DOM selector registry can be split after Observer panels are modularized. |

## Guardrails

- Do not change runtime behavior while reducing monoliths unless a phase explicitly requires it.
- Prefer thin compatibility shims so existing exports and routes remain stable.
- Move pure constants, governance records, route groups, and renderer/refresh groups before moving stateful execution logic.
- Keep new modules under 1000 lines whenever practical; never create a new replacement monolith.
- Every extraction slice must pass `npm run typecheck`, `npm run build`, and a focused milestone/regression check that exercises the moved code.
- Do not continue feature phases in the live-provider lane until the P0 live-provider/core-router/task-executor split has started.

## Optimization Order

1. Split `cloud-live-provider-runtime-implementation.mjs` pure phase metadata:
   - Extract registry constants into focused registry modules.
   - Extract phase governance helpers into stage-scoped modules.
   - Keep the public `createCloudLiveProviderRuntimeImplementation(deps)` API unchanged.

2. Split the Phase 107-116 credential local-read/result-envelope execution-attempt lane:
   - Move route builders, task shell factories, `is...Task` predicates, and executor helpers into a lane module.
   - Pass only the required runtime context from the main implementation.
   - Verify Phase 111-116 route/task/deferred/preflight/local-read checks still pass.

3. Split `route-handlers.mjs` by route domain:
   - Move cloud live-provider GET/POST route groups to `route-handlers-cloud-live-provider.mjs`.
   - Move plugin/native-adapter route groups to a plugin route module.
   - Preserve `registerRoutes(deps)` as the stable entry point.

4. Split `task-executor.mjs` dispatch:
   - Extract cloud live-provider executor dispatch into a table-driven module.
   - Extract body/systemd/plugin/workspace executors into domain modules.
   - Keep `runOperatorStep` and recovery behavior stable.

5. Split Observer cloud scripts:
   - Split `client-script-refreshers-cloud.mjs` by cloud lane.
   - Split cloud DOM selector declarations in parallel or move to grouped selector objects.
   - Keep `/client-v5.js` assembly stable through `client-script.mjs`.

6. Split remaining P1/P2 files:
   - `plan-builder.mjs` by phase family.
   - `plugin-review.mjs` by review surface.
   - `openclaw-system-sense/src/server.mjs` into HTTP, probe, and summary modules.
   - `workspace-ops.mjs`, app refreshers, renderers, and config DOM as follow-up slices.

## First Slice

Start with a behavior-preserving extraction from `cloud-live-provider-runtime-implementation.mjs` because it is the largest and most likely to keep growing during future provider phases.

Minimum proof:

- File line count decreases for `cloud-live-provider-runtime-implementation.mjs`.
- No new file exceeds 1000 lines.
- `npm run typecheck` passes.
- `npm run build` passes.
- Phase 116 core and observer milestone pair still passes.
