export function createPluginReviewSourceMigration({
  buildWorkspaceRegistry,
} = {}) {
function buildOpenClawMigrationCandidatesForWorkspace(workspace) {
  const profile = workspace.openclawProfile;
  if (!profile) {
    return [];
  }

  const candidates = [];
  const addCandidate = ({
    id,
    capability,
    sourceDomain,
    targetArea,
    migrationKind,
    risk,
    priority,
    evidence,
    rationale,
  }) => {
    candidates.push({
      id: `${workspace.id}:${id}`,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspacePath: workspace.path,
      capability,
      sourceDomain,
      targetArea,
      migrationKind,
      risk,
      priority,
      readiness: "profiled",
      evidence,
      rationale,
      governance: {
        mode: "migration_candidate_read_only",
        canReadFileContent: false,
        canMutate: false,
        canExecute: false,
        requiresHumanReview: true,
        migrationStatus: "candidate_only",
        integrationIntent: "absorb_after_plan",
      },
    });
  };

  if (profile.hasExtensionCatalog) {
    addCandidate({
      id: "extension-catalog",
      capability: "extension_catalog",
      sourceDomain: "extensions",
      targetArea: "capability_registry",
      migrationKind: "inventory_then_adapter",
      risk: "medium",
      priority: "high",
      evidence: {
        domainPresent: true,
        approximateEntries: profile.domainCounts?.extensions ?? 0,
      },
      rationale: "Extensions look like reusable capability providers, but they need adapter and policy review before import.",
    });
  }

  if (profile.hasPluginSdk) {
    addCandidate({
      id: "plugin-sdk",
      capability: "plugin_sdk",
      sourceDomain: "packages/plugin-sdk",
      targetArea: "capability_contracts",
      migrationKind: "contract_review",
      risk: "low",
      priority: "high",
      evidence: {
        packagePresent: true,
      },
      rationale: "A plugin SDK can harden OpenClaw's native capability boundary without making the old repo the runtime owner.",
    });
  }

  if (profile.hasMemoryHostSdk) {
    addCandidate({
      id: "memory-host-sdk",
      capability: "memory_host_sdk",
      sourceDomain: "packages/memory-host-sdk",
      targetArea: "long_term_memory",
      migrationKind: "contract_review",
      risk: "medium",
      priority: "medium",
      evidence: {
        packagePresent: true,
      },
      rationale: "Memory-related APIs are valuable, but need sovereignty and privacy review before becoming native state.",
    });
  }

  if (profile.hasUiWorkspace) {
    addCandidate({
      id: "ui-workspace",
      capability: "ui_workspace",
      sourceDomain: "ui",
      targetArea: "observer_ui",
      migrationKind: "pattern_absorption",
      risk: "low",
      priority: "medium",
      evidence: {
        packagePresent: true,
      },
      rationale: "UI patterns can inform Observer without copying runtime ownership from the source workspace.",
    });
  }

  if (profile.presentDomains?.includes("src")) {
    addCandidate({
      id: "core-source",
      capability: "core_source_patterns",
      sourceDomain: "src",
      targetArea: "openclaw_core",
      migrationKind: "design_review",
      risk: "medium",
      priority: "high",
      evidence: {
        approximateEntries: profile.domainCounts?.src ?? 0,
      },
      rationale: "Core source patterns should be reviewed as design input before any native reimplementation.",
    });
  }

  if (profile.presentDomains?.includes("docs")) {
    addCandidate({
      id: "documentation-canon",
      capability: "documentation_canon",
      sourceDomain: "docs",
      targetArea: "project_memory",
      migrationKind: "canon_reconcile",
      risk: "low",
      priority: "medium",
      evidence: {
        approximateEntries: profile.domainCounts?.docs ?? 0,
      },
      rationale: "Existing docs can preserve intent and constraints while the NixOS body evolves independently.",
    });
  }

  if (profile.presentDomains?.includes("skills")) {
    addCandidate({
      id: "agent-skills",
      capability: "agent_skills",
      sourceDomain: "skills",
      targetArea: "capability_registry",
      migrationKind: "policy_wrap",
      risk: "medium",
      priority: "medium",
      evidence: {
        approximateEntries: profile.domainCounts?.skills ?? 0,
      },
      rationale: "Skills are likely useful but must be wrapped by OpenClaw governance before use.",
    });
  }

  if (profile.presentDomains?.includes("qa") || profile.presentDomains?.includes("test")) {
    addCandidate({
      id: "verification-assets",
      capability: "verification_assets",
      sourceDomain: profile.presentDomains.includes("qa") ? "qa" : "test",
      targetArea: "milestone_checks",
      migrationKind: "test_port",
      risk: "low",
      priority: "medium",
      evidence: {
        qaEntries: profile.domainCounts?.qa ?? 0,
        testEntries: profile.domainCounts?.test ?? 0,
      },
      rationale: "Existing verification assets can strengthen milestone checks without importing runtime behavior.",
    });
  }

  return candidates;
}

function buildOpenClawMigrationMap() {
  const registry = buildWorkspaceRegistry();
  const items = registry.items.flatMap((workspace) => buildOpenClawMigrationCandidatesForWorkspace(workspace));
  return {
    registry: "openclaw-source-migration-map-v0",
    mode: "read-only",
    generatedAt: registry.generatedAt,
    sourceRegistry: registry.registry,
    roots: registry.roots,
    count: items.length,
    items,
    summary: {
      total: items.length,
      workspaces: new Set(items.map((item) => item.workspaceId)).size,
      byWorkspace: items.reduce((accumulator, item) => {
        accumulator[item.workspaceName] = (accumulator[item.workspaceName] ?? 0) + 1;
        return accumulator;
      }, {}),
      byTargetArea: items.reduce((accumulator, item) => {
        accumulator[item.targetArea] = (accumulator[item.targetArea] ?? 0) + 1;
        return accumulator;
      }, {}),
      byMigrationKind: items.reduce((accumulator, item) => {
        accumulator[item.migrationKind] = (accumulator[item.migrationKind] ?? 0) + 1;
        return accumulator;
      }, {}),
      byRisk: items.reduce((accumulator, item) => {
        accumulator[item.risk] = (accumulator[item.risk] ?? 0) + 1;
        return accumulator;
      }, {}),
      byPriority: items.reduce((accumulator, item) => {
        accumulator[item.priority] = (accumulator[item.priority] ?? 0) + 1;
        return accumulator;
      }, {}),
      governance: {
        mode: "migration_candidate_read_only",
        canReadFileContent: false,
        canMutate: false,
        canExecute: false,
        migrationStatus: "candidate_only",
      },
    },
  };
}

const OPENCLAW_MIGRATION_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
};
const OPENCLAW_MIGRATION_RISK_ORDER = {
  low: 0,
  medium: 1,
  high: 2,
};
const OPENCLAW_FIRST_WAVE_CAPABILITIES = new Set([
  "plugin_sdk",
  "core_source_patterns",
  "extension_catalog",
  "verification_assets",
]);

function migrationPlanActionForCandidate(candidate) {
  const actions = {
    extension_catalog: "Inventory extension entry points, design governed adapters, then register safe capability wrappers.",
    plugin_sdk: "Review SDK contracts, extract stable capability boundaries, then reimplement native OpenClaw contracts.",
    memory_host_sdk: "Review privacy and sovereignty boundaries before designing any native long-term-memory adapter.",
    ui_workspace: "Compare UI patterns with Observer needs, then absorb presentation ideas without importing runtime ownership.",
    core_source_patterns: "Review core orchestration patterns as design input, then reimplement compatible patterns natively.",
    documentation_canon: "Reconcile old source docs with the NixOS body canon and capture retained decisions.",
    agent_skills: "Classify skills by risk, wrap candidates behind policy, then expose only approved native capabilities.",
    verification_assets: "Port useful checks into milestone slices before migrating the matching runtime behavior.",
  };
  return actions[candidate.capability] ?? "Review candidate, document fit, then create a separately governed migration slice.";
}

function migrationAcceptanceForCandidate(candidate) {
  const base = [
    "source file contents remain hidden until a later explicit review step",
    "no source workspace mutation or command execution occurs during planning",
    "native OpenClaw governance remains the runtime owner",
  ];
  const byCapability = {
    extension_catalog: [
      "adapter design lists allowed capability IDs, risks, and approval gates",
      "Observer can show imported capability metadata before any execution path exists",
    ],
    plugin_sdk: [
      "contract review identifies stable interfaces and rejected external ownership assumptions",
      "native capability contract tests pass without depending on the source workspace at runtime",
    ],
    memory_host_sdk: [
      "privacy boundary and retention policy are documented before any state import",
      "memory access is gated by explicit OpenClaw governance",
    ],
    ui_workspace: [
      "Observer UX changes preserve current control and audit visibility",
      "UI code remains owned by this repository after absorption",
    ],
    core_source_patterns: [
      "design review records which orchestration patterns are accepted or rejected",
      "new core behavior ships behind targeted milestone checks",
    ],
    documentation_canon: [
      "conflicting terminology is reconciled into current project docs",
      "retained decisions are traceable to OpenClaw body sovereignty goals",
    ],
    agent_skills: [
      "each skill has a risk classification and policy wrapper before exposure",
      "no skill can execute outside OpenClaw governance",
    ],
    verification_assets: [
      "ported checks run as targeted milestone slices",
      "checks fail before the migrated behavior is implemented",
    ],
  };
  return [...base, ...(byCapability[candidate.capability] ?? [])];
}

function buildOpenClawMigrationPlan() {
  const map = buildOpenClawMigrationMap();
  const sortedCandidates = [...map.items].sort((left, right) => {
    const priorityDelta =
      (OPENCLAW_MIGRATION_PRIORITY_ORDER[left.priority] ?? 99)
      - (OPENCLAW_MIGRATION_PRIORITY_ORDER[right.priority] ?? 99);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    const riskDelta =
      (OPENCLAW_MIGRATION_RISK_ORDER[left.risk] ?? 99)
      - (OPENCLAW_MIGRATION_RISK_ORDER[right.risk] ?? 99);
    if (riskDelta !== 0) {
      return riskDelta;
    }
    return left.capability.localeCompare(right.capability);
  });
  const firstWave = sortedCandidates
    .filter((candidate) => OPENCLAW_FIRST_WAVE_CAPABILITIES.has(candidate.capability))
    .map((candidate, index) => ({
      sequence: index + 1,
      candidateId: candidate.id,
      workspaceId: candidate.workspaceId,
      workspaceName: candidate.workspaceName,
      workspacePath: candidate.workspacePath,
      capability: candidate.capability,
      sourceDomain: candidate.sourceDomain,
      targetArea: candidate.targetArea,
      migrationKind: candidate.migrationKind,
      risk: candidate.risk,
      priority: candidate.priority,
      status: "planned_not_imported",
      recommendedNextStep: migrationPlanActionForCandidate(candidate),
      acceptanceCriteria: migrationAcceptanceForCandidate(candidate),
      blockers: [
        "human design review not completed",
        "targeted milestone check not written",
        "source content review not explicitly approved",
      ],
      governance: {
        mode: "migration_plan_only",
        canReadFileContent: false,
        canMutate: false,
        canExecute: false,
        createsTask: false,
        createsApproval: false,
        requiresHumanApprovalBeforeImport: true,
        migrationStatus: "planned_not_imported",
      },
    }));

  return {
    registry: "openclaw-source-migration-plan-v0",
    mode: "plan-only",
    generatedAt: map.generatedAt,
    sourceRegistry: map.registry,
    sourceMode: map.mode,
    roots: map.roots,
    candidateCount: map.count,
    count: firstWave.length,
    items: firstWave,
    backlog: sortedCandidates
      .filter((candidate) => !OPENCLAW_FIRST_WAVE_CAPABILITIES.has(candidate.capability))
      .map((candidate) => ({
        candidateId: candidate.id,
        capability: candidate.capability,
        sourceDomain: candidate.sourceDomain,
        targetArea: candidate.targetArea,
        risk: candidate.risk,
        priority: candidate.priority,
        status: "candidate_only",
      })),
    summary: {
      total: firstWave.length,
      candidateCount: map.count,
      backlog: map.count - firstWave.length,
      byTargetArea: firstWave.reduce((accumulator, item) => {
        accumulator[item.targetArea] = (accumulator[item.targetArea] ?? 0) + 1;
        return accumulator;
      }, {}),
      byMigrationKind: firstWave.reduce((accumulator, item) => {
        accumulator[item.migrationKind] = (accumulator[item.migrationKind] ?? 0) + 1;
        return accumulator;
      }, {}),
      byRisk: firstWave.reduce((accumulator, item) => {
        accumulator[item.risk] = (accumulator[item.risk] ?? 0) + 1;
        return accumulator;
      }, {}),
      byPriority: firstWave.reduce((accumulator, item) => {
        accumulator[item.priority] = (accumulator[item.priority] ?? 0) + 1;
        return accumulator;
      }, {}),
      governance: {
        mode: "migration_plan_only",
        canReadFileContent: false,
        canMutate: false,
        canExecute: false,
        createsTask: false,
        createsApproval: false,
        migrationStatus: "planned_not_imported",
      },
    },
  };
}

  return {
    buildOpenClawMigrationMap,
    buildOpenClawMigrationPlan,
  };
}
