# OpenClaw Forward Work Directive

Updated: 2026-07-09

This is the active guidance document for continuing OpenClaw development after
the Phase 136 checkpoint and the discovery that the locally optimized
`openclaw` source has not yet been preserved on GitHub or migrated into
`OpenClawOnNixOS`.

Use this document as the first stop for new agents. Historical phase plans and
milestone checks remain valuable evidence, but they must not be treated as an
automatic instruction to continue with Phase 137.

## Current Diagnosis

The project has not fundamentally drifted from the whitepaper:

- The NixOS body has a service skeleton and resident control plane.
- The AI work-view route exists through session, browser, screen-sense, and
  screen-act services.
- Body health, conservative self-heal, systemd repair, evidence ledgers, and
  Observer visibility exist.
- Memory, cloud-consciousness, provider-call, and result-envelope routes have
  strong governance evidence.
- The core and Observer have been decoupled significantly since the earlier
  giant-file phase.

The risk is local drift:

- Phase 59 through Phase 136 became too dominated by nested cloud-provider,
  credential, local-read, result-envelope, approved-deferred, and readiness
  gates.
- Some of those gates are valid sovereignty boundaries, but continuing that
  pattern mechanically would create more shell/checklist work than product
  capability.
- The locally enhanced `openclaw` source contains real Claude Code-grade
  engineering improvements that are not yet stored in GitHub and not yet
  integrated as native OpenClaw body capabilities.

## Governing Vision

The controlling architecture documents are:

```text
docs/architecture/OPENCLAW_SYSTEM_IDENTITY_UPGRADE_PATH.md
docs/architecture/KERNEL_LEVEL_EVOLUTION_WHITEPAPER.md
docs/plans/OPENCLAW_ENHANCED_SOURCE_MIGRATION_BRIEF.md
```

The identity route is:

```text
stable user-space control plane
-> trusted session/work-view component
-> controlled system-level body daemon
-> graphics-stack-native AI workspace
-> later kernel-level body nerves
```

Do not root-ify the whole system. Do not try to take over the full user desktop
as the main route. First make OpenClaw stable, observable, useful, and capable
inside its own body and work-view.

## Immediate Stop Rule

Do not continue with another generic cloud/provider/credential phase unless it
unlocks an actual live capability that has been explicitly selected after this
directive.

In particular, do not create a Phase 137 that only adds another:

```text
route
task shell
approved-deferred record
final-readiness preflight
readback wrapper
observer mirror
```

Those patterns are allowed only when they are the smallest necessary slice for a
new product capability.

## First Required Work: Preserve Enhanced Source

The optimized Windows-host `openclaw` source is not currently on GitHub. Before
real migration work proceeds, preserve it as a GitHub-visible source reference.

Source working tree:

```text
D:\OpenclawAndClaudecode\openclaw
```

Observed important source material:

```text
extensions/cc-tools/
src/agents/pi-embedded-runner/microcompact.ts
src/agents/pi-embedded-runner/run/attempt.ts
src/agents/pi-tools.ts
src/agents/system-prompt.ts
src/plugins/runtime/runtime-registry-loader.ts
src/plugins/runtime/runtime-registry-loader.test.ts
src/auto-reply/reply/commands-plugins.ts
src/auto-reply/reply/commands-plugins.test.ts
src/auto-reply/reply/commands-plugins.install.test.ts
extensions/acpx/src/codex-auth-bridge.ts
extensions/acpx/src/runtime-persistence.test.ts
ui/index.html
ui/src/styles/
HEARTBEAT.md
SOUL.md
TOOLS.md
gateway-architecture.html
```

Do not preserve accidental local state unless the human explicitly asks:

```text
.openclaw/workspace-state.json
help.txt
temp_test.txt
```

Preferred GitHub preservation target:

```text
EdVulcan/openclaw-enhanced-source
```

Acceptable alternative:

```text
an EdVulcan fork of openclaw with branch:
edvulcan/enhanced-cc-tools-source-2026-07-09
```

Do not push this branch to `openclaw/openclaw` unless the human explicitly wants
an upstream PR flow.

After the enhanced source is pushed, update:

```text
docs/plans/OPENCLAW_ENHANCED_SOURCE_MIGRATION_BRIEF.md
```

with:

```text
source repository URL
branch name
commit hash
intended migration scope
excluded local files
```

## Second Required Work: Enhanced Source Gap Audit

After the enhanced source is preserved, perform a source-integration gap audit.
The audit must classify every enhanced capability as one of:

```text
absorbed
partially absorbed
not absorbed
should not migrate
requires source transfer
```

Minimum capability list:

```text
cc_read / precise file read
cc_edit / surgical string replacement
cc_write / controlled new-file or overwrite path
cc_glob and cc_grep / fast codebase navigation
cc_lsp / definition, references, hover
cc_verify / verification loop and command evidence
cc_plan_enter, cc_plan_exit, cc_todo_write / planning state
microcompact / in-memory old tool-result compaction
live plugin runtime refresh
ACPX/Codex bridge compatibility and persistence tests
engineering prompt semantics
operator-facing UI refinements
identity notes: HEARTBEAT, SOUL, TOOLS
```

The audit output should become a new document:

```text
docs/plans/OPENCLAW_ENHANCED_SOURCE_GAP_AUDIT.md
```

## Third Required Work: Select Real Capability Slices

After the audit, the recommended trunk is:

```text
Native governed engineering tool surface
```

The first slices should move in this order:

1. Read-only tool inventory and contract mapping.
2. Native governed read/search surface.
3. Surgical edit proposal with diff preview, not raw write.
4. Verification command evidence attached to task completion.
5. Observer visibility and recovery evidence.
6. Microcompact as context-management evidence, not hidden transcript mutation.
7. Live plugin runtime refresh as a governed lifecycle action.

Only after these are proven should the project continue deeper cloud-provider
execution work.

## Identity-Upgrade Alignment

Every new capability must state which identity level it serves:

```text
Level 1: user-space control plane
Level 2: trusted session/work-view component
Level 3: controlled system-level body daemon
Level 4: graphics-stack-native AI workspace
```

The enhanced `openclaw` migration currently belongs mostly to Level 1. Some
future work-view manager and session helper work belongs to Level 2. Host repair
and controlled privileged actions belong to Level 3. Nested compositor and AI
session work belongs to Level 4.

Do not jump identity levels to make a milestone pass.

## Phase Plan Cleanup Policy

Historical phase plan files under `docs/plans/OPENCLAW_PHASE_*_PLAN.md` are not
the active roadmap. Many are still referenced by milestone checks and must remain
in place until the checks are refactored.

Use them as:

```text
evidence
test fixtures
historical implementation records
```

Do not use them as:

```text
automatic next-phase instructions
the current product roadmap
permission to continue nested safety shells
```

The active routing documents are listed in `docs/README.md` and
`docs/plans/README.md`.

## Definition Of Real Progress

A development slice counts as real progress only if it answers:

```text
What user-visible or operator-visible capability became more real?
Which whitepaper or identity-upgrade goal does it serve?
What evidence proves it?
What remains deliberately deferred?
What is the next smallest real capability step?
```

If a slice cannot answer those questions, it is likely a checklist shell and
should be stopped or merged into a more meaningful slice.

## VM Agent Startup Checklist

Use this exact startup order on the VM:

```bash
cd /home/edvulcan/OpenClaw_On_NixOS
git pull origin main
git status --short
git log -10 --oneline
sed -n '1,260p' docs/OPENCLAW_FORWARD_WORK_DIRECTIVE.md
sed -n '1,220p' docs/README.md
sed -n '1,260p' docs/plans/OPENCLAW_ENHANCED_SOURCE_MIGRATION_BRIEF.md
sed -n '1,260p' docs/architecture/OPENCLAW_SYSTEM_IDENTITY_UPGRADE_PATH.md
```

Then report:

```text
1. Is the enhanced openclaw source preserved on GitHub?
2. If yes, what source URL and commit hash?
3. If no, stop source migration and preserve it first.
4. Which active trunk is selected next?
5. Why is it real capability progress instead of another safety wrapper?
```
