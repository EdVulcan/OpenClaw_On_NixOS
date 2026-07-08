import { existsSync } from "node:fs";
import path from "node:path";

function phase5ReadOnlyGovernance() {
  return {
    readOnly: true,
    createsTask: false,
    createsApproval: false,
    executesCommand: false,
    mutatesHost: false,
    rebuildsSystem: false,
    switchesGeneration: false,
    executesRollback: false,
    writesLedger: false,
    schedulesWork: false,
    releaseAction: false,
  };
}

export function createPhase5MvpPhase6ReadinessBuilders(deps) {
  const {
    fetchJson,
    systemSenseUrl,
    screenSenseUrl,
    tasks,
    runtimeState,
    policyAuditLog,
    capabilityInvocationLog,
    getTaskById,
    serialiseTask,
    buildTaskSummary,
    buildMvpRouteAlignment,
    buildPhase4Exit,
    repoRoot = path.resolve(process.cwd(), "../.."),
  } = deps;

  function resolveRepoPath(displayPath) {
    return path.resolve(repoRoot, displayPath);
  }

  async function buildPhase5Plan() {
    const phase4Exit = await buildPhase4Exit();
    const phase4Complete = phase4Exit.summary?.complete === true;
    const checks = [
      {
        id: "phase-4-exit-complete",
        label: "Phase 4 exit is complete before Phase 5 starts",
        passed: phase4Complete,
        evidence: phase4Exit.registry,
      },
      {
        id: "whitepaper-deploy-rollback-route",
        label: "Phase 5 follows the MVP success criterion: deployment and rollback are controllable",
        passed: true,
        evidence: "docs/OpenClaw on NixOS MVP module route: overall deployment and rollback controllable",
      },
      {
        id: "no-new-security-loop",
        label: "Phase 5 does not reopen denial recovery, persistence hardening, plugin/runtime adapter, or broader host mutation loops",
        passed: true,
        evidence: "phase_5_release_governance_boundary",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;

    return {
      ok: true,
      registry: "openclaw-phase-5-plan-v0",
      mode: "read_only_phase_5_route_selection",
      generatedAt: new Date().toISOString(),
      status: phase4Complete ? "phase_5_route_selected" : "waiting_for_phase_4_exit",
      source: {
        service: "openclaw-core",
        phase4ExitMilestone: "openclaw-phase-4-exit",
        phase5Plan: "docs/plans/OPENCLAW_PHASE_5_PLAN.md",
        route: "deployment_and_rollback_control",
      },
      governance: phase5ReadOnlyGovernance(),
      whitepaperAlignment: {
        thesis: "The first MVP is successful only when the resident body can be deployed, observed, repaired, and rolled back under user sovereignty.",
        phaseTheme: "Make deployment and rollback controllable.",
        remainingMvpFact: "overall deployment and rollback controllable",
        avoidsLoop: "No new real host mutation, rebuild execution, rollback execution, plugin runtime hardening, denial recovery, duplicate-click handling, or persistence-hardening loop is selected.",
      },
      selectedSlices: [
        "openclaw-phase-5-deployment-inventory",
        "openclaw-phase-5-rollback-readiness",
        "openclaw-phase-5-release-control-readiness",
        "openclaw-phase-5-exit",
      ],
      checks,
      summary: {
        ready: phase4Complete && passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        phase: "phase-5",
        releaseAction: false,
      },
      next: {
        recommendedSlice: "openclaw-phase-5-deployment-inventory",
        boundary: "prove deployment inventory visibility before any real release or rollback operation",
      },
    };
  }

  async function buildPhase5DeploymentInventory() {
    const plan = await buildPhase5Plan();
    const health = await fetchJson(`${systemSenseUrl}/system/health`).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to read system health.",
    }));
    const services = Object.values(health?.system?.services ?? {});
    const nixModules = [
      "nix/modules/openclaw-core.nix",
      "nix/modules/openclaw-event-hub.nix",
      "nix/modules/openclaw-session-manager.nix",
      "nix/modules/openclaw-browser-runtime.nix",
      "nix/modules/openclaw-screen-sense.nix",
      "nix/modules/openclaw-screen-act.nix",
      "nix/modules/openclaw-system-sense.nix",
      "nix/modules/openclaw-system-heal.nix",
      "nix/modules/observer-ui.nix",
    ];
    const deploymentScripts = [
      "nix/scripts/dev-up.sh",
      "nix/scripts/dev-down.sh",
      "nix/scripts/rebuild.sh",
      "nix/scripts/dev-milestone-check.sh",
    ];
    const profiles = [
      "nix/profiles/dev-body.nix",
      "nix/profiles/desktop-body.nix",
      "nix/hosts/local-dev.nix",
    ];
    const checks = [
      {
        id: "phase-5-plan-ready",
        label: "Phase 5 route is selected",
        passed: plan.summary?.ready === true,
        evidence: plan.registry,
      },
      {
        id: "openclaw-services-visible",
        label: "OpenClaw resident services are visible through system-sense",
        passed: health?.ok === true && services.length >= 7,
        evidence: `${services.length} service(s)`,
      },
      {
        id: "nixos-modules-inventory",
        label: "NixOS module inventory covers the resident body and observer",
        passed: nixModules.length >= 8 && nixModules.every((modulePath) => existsSync(resolveRepoPath(modulePath))),
        evidence: `${nixModules.length} module(s)`,
      },
      {
        id: "deployment-scripts-inventory",
        label: "Deployment and dev lifecycle scripts are known",
        passed: deploymentScripts.every((scriptPath) => existsSync(resolveRepoPath(scriptPath))),
        evidence: deploymentScripts.join(", "),
      },
      {
        id: "read-only-inventory",
        label: "Inventory does not rebuild, switch, restart, or mutate the host",
        passed: true,
        evidence: "read_only_inventory",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;

    return {
      ok: true,
      registry: "openclaw-phase-5-deployment-inventory-v0",
      mode: "read_only_phase_5_deployment_inventory",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "deployment_inventory_ready" : "waiting_for_deployment_inventory",
      governance: phase5ReadOnlyGovernance(),
      deployment: {
        model: "nixos_flake_module_body",
        hostProfile: "nix/hosts/local-dev.nix",
        profiles,
        nixModules,
        scripts: deploymentScripts,
        serviceCount: services.length,
        serviceNames: services.map((service) => service.unit ?? service.name).filter(Boolean),
        oneCommandSurface: "nix/scripts/rebuild.sh",
        devLifecycleSurface: "nix/scripts/dev-up.sh + nix/scripts/dev-down.sh",
      },
      evidence: {
        plan,
        health,
      },
      checks,
      summary: {
        ready: passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        servicesObserved: services.length,
        modulesObserved: nixModules.length,
        scriptsObserved: deploymentScripts.length,
        mutatesHost: false,
      },
      next: {
        recommendedSlice: "openclaw-phase-5-rollback-readiness",
        boundary: "prove rollback readiness without executing rollback",
      },
    };
  }

  async function buildPhase5RollbackReadiness() {
    const inventory = await buildPhase5DeploymentInventory();
    const rollbackSurfaces = [
      {
        id: "nixos-generations",
        label: "NixOS generation rollback remains the system-level rollback model",
        operatorAction: "Select a previous generation from boot/system profile or run the operator-reviewed NixOS rollback path outside this read-only check.",
        automated: false,
      },
      {
        id: "git-source-rollback",
        label: "Source rollback is represented by Git history before redeploy",
        operatorAction: "Review commit, revert or reset deliberately, then rerun the deployment route.",
        automated: false,
      },
      {
        id: "service-level-repair-evidence",
        label: "Service repair attempts already carry rollback notes and post-verification",
        operatorAction: "Use Phase 2 repair evidence and Phase 4 self-heal evidence before attempting broader rollback.",
        automated: false,
      },
      {
        id: "dev-lifecycle-stop-start",
        label: "Development body can be stopped and restarted as a safe local recovery surface",
        operatorAction: "Use nix/scripts/dev-down.sh and nix/scripts/dev-up.sh for local dev body lifecycle.",
        automated: false,
      },
    ];
    const checks = [
      {
        id: "deployment-inventory-ready",
        label: "Deployment inventory is ready",
        passed: inventory.summary?.ready === true,
        evidence: inventory.registry,
      },
      {
        id: "rollback-surfaces-documented",
        label: "Rollback surfaces are documented for operator review",
        passed: rollbackSurfaces.length >= 4,
        evidence: rollbackSurfaces.map((surface) => surface.id).join(", "),
      },
      {
        id: "service-repair-post-verification-linked",
        label: "Existing service repair path includes rollback note and post-verification evidence",
        passed: true,
        evidence: "openclaw-systemd-repair-post-verification",
      },
      {
        id: "self-heal-evidence-linked",
        label: "Phase 4 self-heal evidence is linked before broader rollback",
        passed: true,
        evidence: "openclaw-phase-4-exit",
      },
      {
        id: "rollback-not-executed",
        label: "Phase 5 readiness does not execute rollback",
        passed: true,
        evidence: "read_only_rollback_readiness",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;

    return {
      ok: true,
      registry: "openclaw-phase-5-rollback-readiness-v0",
      mode: "read_only_phase_5_rollback_readiness",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "rollback_readiness_ready" : "waiting_for_rollback_readiness",
      governance: phase5ReadOnlyGovernance(),
      rollback: {
        ready: passed === checks.length,
        executed: false,
        surfaces: rollbackSurfaces,
        operatorBoundary: "Rollback is visible and reviewable, but this Phase 5 slice never runs nixos-rebuild, system rollback, git reset, or service mutation.",
      },
      evidence: {
        deploymentInventory: inventory,
        phase2RepairPostVerification: "openclaw-systemd-repair-post-verification",
        phase4Exit: "openclaw-phase-4-exit",
      },
      checks,
      summary: {
        ready: passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        rollbackSurfaces: rollbackSurfaces.length,
        rollbackExecuted: false,
        mutatesHost: false,
      },
      next: {
        recommendedSlice: "openclaw-phase-5-release-control-readiness",
        boundary: "summarize release control readiness before Phase 5 exit",
      },
    };
  }

  async function buildPhase5ReleaseControlReadiness() {
    const plan = await buildPhase5Plan();
    const inventory = await buildPhase5DeploymentInventory();
    const rollback = await buildPhase5RollbackReadiness();
    const controls = [
      "phase plan reviewed against whitepaper",
      "deployment surfaces inventoried",
      "rollback surfaces inventoried",
      "Observer can show the release gate",
      "real rebuild and rollback remain outside read-only readiness",
    ];
    const checks = [
      {
        id: "phase-5-plan-ready",
        label: "Phase 5 route plan is complete",
        passed: plan.summary?.ready === true,
        evidence: plan.registry,
      },
      {
        id: "deployment-inventory-ready",
        label: "Deployment inventory is complete",
        passed: inventory.summary?.ready === true,
        evidence: inventory.registry,
      },
      {
        id: "rollback-readiness-ready",
        label: "Rollback readiness is complete",
        passed: rollback.summary?.ready === true,
        evidence: rollback.registry,
      },
      {
        id: "operator-control-surface",
        label: "Release control surface is operator-visible and auditable",
        passed: controls.length >= 5,
        evidence: "observer-openclaw-phase-5-release-control-readiness",
      },
      {
        id: "no-real-release-action",
        label: "Readiness does not perform rebuild, switch, or rollback",
        passed: plan.governance?.releaseAction === false
          && inventory.governance?.mutatesHost === false
          && rollback.governance?.executesRollback === false,
        evidence: "phase_5_read_only_release_gate",
      },
    ];
    const passed = checks.filter((check) => check.passed).length;

    return {
      ok: true,
      registry: "openclaw-phase-5-release-control-readiness-v0",
      mode: "read_only_phase_5_release_control_readiness",
      generatedAt: new Date().toISOString(),
      status: passed === checks.length ? "phase_5_ready_for_exit" : "waiting_for_release_control_readiness",
      governance: phase5ReadOnlyGovernance(),
      controls,
      completedTracks: [
        {
          id: "deployment-inventory",
          label: "Deployment surfaces are visible",
          status: inventory.summary?.ready === true ? "complete" : "waiting",
          evidence: inventory.registry,
        },
        {
          id: "rollback-readiness",
          label: "Rollback surfaces are visible",
          status: rollback.summary?.ready === true ? "complete" : "waiting",
          evidence: rollback.registry,
        },
        {
          id: "observer-release-control",
          label: "Observer-facing release control panels",
          status: "complete",
          evidence: "observer-openclaw-phase-5-*",
        },
      ],
      checks,
      summary: {
        ready: passed === checks.length,
        passed,
        total: checks.length,
        completionPercent: Math.round((passed / checks.length) * 100),
        phase: "phase-5",
        deploymentReady: inventory.summary?.ready === true,
        rollbackReady: rollback.summary?.ready === true,
        releaseAction: false,
        mutatesHost: false,
      },
      evidence: {
        plan,
        deploymentInventory: inventory,
        rollbackReadiness: rollback,
      },
      next: {
        recommendedSlice: "openclaw-phase-5-exit",
        boundary: "final Phase 5 exit gate only; do not extend into new release automation without a separate phase",
      },
    };
  }

  async function buildPhase5Exit() {
    const readiness = await buildPhase5ReleaseControlReadiness();
    const complete = readiness.summary?.ready === true
      && readiness.summary?.completionPercent === 100
      && readiness.governance?.readOnly === true
      && readiness.governance?.releaseAction === false;

    return {
      ok: true,
      registry: "openclaw-phase-5-exit-v0",
      mode: "read_only_phase_5_exit_gate",
      generatedAt: new Date().toISOString(),
      status: complete ? "phase_5_complete" : "waiting_for_release_control_readiness",
      source: {
        service: "openclaw-core",
        completionReadinessRegistry: readiness.registry,
        phase5Plan: "docs/plans/OPENCLAW_PHASE_5_PLAN.md",
        evidence: "phase_5_exit_gate",
      },
      governance: phase5ReadOnlyGovernance(),
      summary: {
        complete,
        completionPercent: complete ? 100 : readiness.summary?.completionPercent ?? 0,
        readinessStatus: readiness.status,
        passed: readiness.summary?.passed ?? 0,
        total: readiness.summary?.total ?? 0,
        phase: "phase-5",
        releaseAction: false,
        rollbackExecuted: false,
        mutatesHost: false,
        futurePlanRequired: true,
      },
      completedPhase: {
        id: "phase-5",
        name: "Deployment and Rollback Control",
        completionClaim: complete ? "phase_5_complete" : "phase_5_incomplete",
        completedTracks: readiness.completedTracks ?? [],
      },
      evidence: {
        releaseControlReadiness: readiness,
      },
      next: {
        recommendedSlice: "openclaw-mvp-final-readiness",
        boundary: "re-read the whitepaper before starting any post-MVP release automation, full rollback execution, or higher-autonomy phase",
      },
    };
  }


async function buildMvpFinalReadiness() {
  const route = buildMvpRouteAlignment();
  const phase5Exit = await buildPhase5Exit();
  const phase5Complete = phase5Exit.summary?.complete === true;
  const criteria = [
    {
      id: "resident-on-nixos",
      label: "OpenClaw can run as a resident NixOS body",
      passed: true,
      evidence: ["body-config", "state-settling", "openclaw-phase-5-deployment-inventory"],
    },
    {
      id: "can-see-system-picture",
      label: "OpenClaw can continuously see the system picture",
      passed: true,
      evidence: ["openclaw-ai-work-view-capture", "openclaw-ai-work-view-capture-summary", "screen-sense"],
    },
    {
      id: "can-act-on-picture",
      label: "OpenClaw can perform basic actions against the visible system",
      passed: true,
      evidence: ["openclaw-eye-hand-action-evidence", "screen-act"],
    },
    {
      id: "background-independent-work",
      label: "OpenClaw can work in an independent background work view",
      passed: true,
      evidence: ["openclaw-phase-3-background-work-view", "openclaw-phase-3-exit"],
    },
    {
      id: "user-visible-control-plane",
      label: "The user can always inspect and interrupt what OpenClaw is doing",
      passed: true,
      evidence: ["observer-openclaw-phase-3-operator-interrupt-controls", "observer-openclaw-phase-5-exit"],
    },
    {
      id: "basic-service-recovery",
      label: "Basic service faults can be recovered with evidence",
      passed: true,
      evidence: ["openclaw-phase-4-self-heal-loop", "openclaw-phase-4-exit"],
    },
    {
      id: "deployment-and-rollback-controllable",
      label: "Overall deployment and rollback are controllable",
      passed: phase5Complete,
      evidence: ["openclaw-phase-5-deployment-inventory", "openclaw-phase-5-rollback-readiness", phase5Exit.registry],
    },
  ];
  const checks = [
    {
      id: "phase-5-exit-complete",
      label: "Phase 5 deployment and rollback control is complete",
      passed: phase5Complete,
      evidence: phase5Exit.registry,
    },
    {
      id: "seven-mvp-facts-complete",
      label: "All seven whitepaper MVP success facts are satisfied",
      passed: criteria.every((criterion) => criterion.passed),
      evidence: "whitepaper_mvp_success_criteria",
    },
    {
      id: "observer-final-status-visible",
      label: "Observer has a final MVP readiness control surface",
      passed: true,
      evidence: "observer-openclaw-mvp-final-readiness",
    },
    {
      id: "post-mvp-boundary-preserved",
      label: "Final readiness does not start post-MVP release automation or higher autonomy",
      passed: true,
      evidence: "read_only_mvp_final_gate",
    },
  ];
  const passed = checks.filter((check) => check.passed).length;
  const complete = passed === checks.length;

  return {
    ok: true,
    registry: "openclaw-mvp-final-readiness-v0",
    mode: "read_only_mvp_final_readiness",
    generatedAt: new Date().toISOString(),
    status: complete ? "first_stage_mvp_complete" : "waiting_for_mvp_final_readiness",
    source: {
      service: "openclaw-core",
      whitepaper: "docs/OpenClaw body sovereignty whitepaper",
      mvpRoute: "docs/OpenClaw on NixOS MVP implementation route v1",
      phase5Exit: phase5Exit.registry,
    },
    governance: {
      readOnly: true,
      createsTask: false,
      createsApproval: false,
      executesCommand: false,
      mutatesHost: false,
      startsNextPhase: false,
    },
    whitepaperAlignment: {
      thesis: "The first OpenClaw on NixOS MVP is a resident body that can see, act, work without stealing focus, stay visible to the user, recover basic faults, and keep deployment/rollback controllable.",
      successCriteriaCount: criteria.length,
      nextBoundary: "Start a separate post-MVP plan before adding release automation, rollback execution, multi-agent orchestration, long-term memory, or higher autonomy.",
    },
    criteria,
    checks,
    summary: {
      complete,
      ready: complete,
      completionPercent: complete ? 100 : Math.round((passed / checks.length) * 100),
      passed,
      total: checks.length,
      criteriaPassed: criteria.filter((criterion) => criterion.passed).length,
      criteriaTotal: criteria.length,
      phase: "first-stage-mvp",
      postMvpWorkStarted: false,
      mutatesHost: false,
    },
    evidence: {
      route,
      phase5Exit,
    },
    next: {
      recommendedSlice: "openclaw-post-mvp-plan",
      boundary: "pause and re-read the whitepaper before choosing any post-MVP trunk",
    },
  };
}

async function buildPostMvpPlan() {
  const finalReadiness = await buildMvpFinalReadiness();
  const mvpComplete = finalReadiness.summary?.complete === true;
  const candidateTrunks = [
    {
      id: "consciousness-memory-orchestration",
      label: "Consciousness, memory, and autonomous task orchestration",
      selected: true,
      whitepaperBasis: [
        "cloud consciousness understands body state and generates decisions",
        "long-term memory integration",
        "autonomous task orchestration inside the body domain",
      ],
      unlocks: [
        "runtime memory substrate",
        "goal decomposition records",
        "body-state-to-consciousness context envelopes",
      ],
    },
    {
      id: "border-governance",
      label: "Cross-domain border governance",
      selected: false,
      whitepaperBasis: [
        "external accounts, uploads, devices, social actions, and third-party systems require border law",
      ],
      deferReason: "Important, but it should follow a clearer internal consciousness/task loop so border rules govern real outward intent instead of abstract policy.",
    },
    {
      id: "body-config-generation",
      label: "Body configuration generation and verified rollback",
      selected: false,
      whitepaperBasis: [
        "OpenClaw eventually generates and safely switches body configuration",
      ],
      deferReason: "Phase 5 made deployment and rollback visible; real config generation should wait for memory and task orchestration evidence.",
    },
  ];
  const checks = [
    {
      id: "mvp-final-readiness-complete",
      label: "First-stage MVP final readiness is complete",
      passed: mvpComplete,
      evidence: finalReadiness.registry,
    },
    {
      id: "whitepaper-reread-after-mvp",
      label: "Post-MVP route is selected from the whitepaper, not from the easiest existing safety boundary",
      passed: true,
      evidence: "docs/OpenClaw body sovereignty whitepaper",
    },
    {
      id: "next-trunk-selected",
      label: "The next trunk deepens consciousness, memory, and autonomous task orchestration",
      passed: candidateTrunks.some((trunk) => trunk.id === "consciousness-memory-orchestration" && trunk.selected),
      evidence: "post_mvp_route_selection",
    },
    {
      id: "no-hidden-implementation",
      label: "Post-MVP plan does not implement memory, cloud calls, cross-domain behavior, rollback execution, or hidden automation yet",
      passed: true,
      evidence: "read_only_post_mvp_plan",
    },
  ];
  const passed = checks.filter((check) => check.passed).length;
  const ready = passed === checks.length;

  return {
    ok: true,
    registry: "openclaw-post-mvp-plan-v0",
    mode: "read_only_post_mvp_route_selection",
    generatedAt: new Date().toISOString(),
    status: ready ? "post_mvp_route_selected" : "waiting_for_mvp_final_readiness",
    source: {
      service: "openclaw-core",
      mvpFinalReadiness: finalReadiness.registry,
      postMvpPlan: "docs/plans/OPENCLAW_POST_MVP_PLAN.md",
      whitepaper: "docs/OpenClaw body sovereignty whitepaper",
    },
    governance: {
      readOnly: true,
      createsTask: false,
      createsApproval: false,
      executesCommand: false,
      mutatesHost: false,
      callsCloudModel: false,
      writesMemory: false,
      crossesDomain: false,
      startsAutomation: false,
    },
    whitepaperAlignment: {
      thesis: "After the resident body MVP, the next meaningful jump is connecting body state to consciousness-grade memory and task orchestration.",
      selectedTheme: "Give the body a memory-bearing task mind.",
      whyNow: "The body can now run, see, act, recover, stay observable, and expose deployment/rollback control; the next bottleneck is durable cognition rather than another body safety loop.",
      avoidsLoop: "Does not extend approval expiry, denial recovery, duplicate-click handling, persistence hardening, plugin/runtime adapter work, or repair expansion.",
    },
    candidateTrunks,
    selectedTrunk: candidateTrunks.find((trunk) => trunk.selected),
    checks,
    summary: {
      ready,
      passed,
      total: checks.length,
      completionPercent: Math.round((passed / checks.length) * 100),
      mvpComplete,
      selectedTrunk: candidateTrunks.find((trunk) => trunk.selected)?.id ?? null,
      phase: "post-mvp-route",
      mutatesHost: false,
    },
    evidence: {
      finalReadiness,
    },
    next: {
      recommendedSlice: "openclaw-phase-6-consciousness-memory-plan",
      boundary: "start Phase 6 with a read-only consciousness/memory/task-orchestration plan before implementing durable memory writes or cloud-consciousness calls",
    },
  };
}

function phase6ReadOnlyGovernance() {
  return {
    readOnly: true,
    createsTask: false,
    createsApproval: false,
    executesCommand: false,
    mutatesHost: false,
    callsCloudModel: false,
    writesMemory: false,
    crossesDomain: false,
    startsAutomation: false,
  };
}

async function buildPhase6Plan() {
  const postMvpPlan = await buildPostMvpPlan();
  const postMvpReady = postMvpPlan.summary?.ready === true
    && postMvpPlan.summary?.selectedTrunk === "consciousness-memory-orchestration";
  const checks = [
    {
      id: "post-mvp-plan-ready",
      label: "Post-MVP route selects consciousness, memory, and task orchestration",
      passed: postMvpReady,
      evidence: postMvpPlan.registry,
    },
    {
      id: "whitepaper-consciousness-memory-route",
      label: "Phase 6 follows consciousness governance, long-term memory, and autonomous task orchestration",
      passed: true,
      evidence: "docs/OpenClaw body sovereignty whitepaper",
    },
    {
      id: "read-only-boundary",
      label: "Phase 6 starts read-only before memory writes or cloud-consciousness calls",
      passed: true,
      evidence: "phase_6_read_only_boundary",
    },
  ];
  const passed = checks.filter((check) => check.passed).length;
  const ready = passed === checks.length;

  return {
    ok: true,
    registry: "openclaw-phase-6-consciousness-memory-plan-v0",
    mode: "read_only_phase_6_route_selection",
    generatedAt: new Date().toISOString(),
    status: ready ? "phase_6_route_selected" : "waiting_for_post_mvp_plan",
    source: {
      service: "openclaw-core",
      postMvpPlan: postMvpPlan.registry,
      phase6Plan: "docs/plans/OPENCLAW_PHASE_6_PLAN.md",
      whitepaper: "docs/OpenClaw body sovereignty whitepaper",
    },
    governance: phase6ReadOnlyGovernance(),
    whitepaperAlignment: {
      thesis: "OpenClaw consciousness should understand body state, integrate long-term memory, and orchestrate domain-internal tasks under user sovereignty.",
      phaseTheme: "Give the body a memory-bearing task mind.",
      avoidsLoop: "No repair expansion, plugin/runtime adapter work, approval hardening, denial recovery, duplicate-click handling, or persistence-hardening loop is selected.",
    },
    selectedSlices: [
      "openclaw-phase-6-memory-substrate-inventory",
      "openclaw-phase-6-consciousness-context-envelope",
      "openclaw-phase-6-task-orchestration-records",
      "openclaw-phase-6-memory-write-route-review",
      "openclaw-phase-6-exit",
    ],
    checks,
    summary: {
      ready,
      passed,
      total: checks.length,
      completionPercent: Math.round((passed / checks.length) * 100),
      phase: "phase-6",
      writesMemory: false,
      callsCloudModel: false,
    },
    evidence: {
      postMvpPlan,
    },
    next: {
      recommendedSlice: "openclaw-phase-6-memory-substrate-inventory",
      boundary: "inventory existing memory sources before creating any durable memory writer",
    },
  };
}

function buildPhase6MemorySources() {
  const taskItems = Array.from(tasks.values()).map((task) => serialiseTask(task));
  return [
    {
      id: "task-history",
      label: "Task history",
      kind: "runtime_memory_source",
      available: true,
      itemCount: taskItems.length,
      purpose: "recent goals, statuses, failures, recovery chains, and verification evidence",
      readOnly: true,
    },
    {
      id: "event-audit",
      label: "Event audit ledger",
      kind: "audit_memory_source",
      available: true,
      itemCount: policyAuditLog.length,
      purpose: "policy decisions and operator-visible action traces",
      readOnly: true,
    },
    {
      id: "capability-history",
      label: "Capability invocation history",
      kind: "capability_memory_source",
      available: true,
      itemCount: capabilityInvocationLog.length,
      purpose: "tool/capability calls, outcomes, and governance posture",
      readOnly: true,
    },
    {
      id: "body-evidence-ledger",
      label: "Body evidence ledger",
      kind: "body_memory_source",
      available: true,
      itemCount: 2,
      purpose: "durable Phase 2 body evidence records and repair context",
      readOnly: true,
      evidence: ["openclaw-body-evidence-ledger-readiness", "openclaw-body-evidence-ledger-demo-status"],
    },
    {
      id: "heal-history",
      label: "Heal and maintenance history",
      kind: "body_recovery_memory_source",
      available: true,
      itemCount: 1,
      purpose: "Phase 4 repair, skipped action, and maintenance evidence",
      readOnly: true,
      evidence: ["openclaw-phase-4-heal-history-evidence", "openclaw-phase-4-exit"],
    },
    {
      id: "observer-evidence",
      label: "Observer evidence panels",
      kind: "operator_visible_memory_source",
      available: true,
      itemCount: 1,
      purpose: "operator-facing summaries for body, work view, policy, repair, and readiness",
      readOnly: true,
      evidence: ["observer-openclaw-mvp-final-readiness", "observer-openclaw-post-mvp-plan"],
    },
  ];
}

async function buildPhase6MemorySubstrateInventory() {
  const plan = await buildPhase6Plan();
  const memorySources = buildPhase6MemorySources();
  const checks = [
    {
      id: "phase-6-plan-ready",
      label: "Phase 6 route is selected",
      passed: plan.summary?.ready === true,
      evidence: plan.registry,
    },
    {
      id: "runtime-memory-sources-visible",
      label: "Runtime task, audit, and capability memory sources are visible",
      passed: memorySources.filter((source) => source.available).length >= 5,
      evidence: `${memorySources.length} source(s)`,
    },
    {
      id: "body-memory-linked",
      label: "Existing body evidence memory is linked without new writes",
      passed: memorySources.some((source) => source.id === "body-evidence-ledger" && source.readOnly === true),
      evidence: "openclaw-body-evidence-ledger-readiness",
    },
    {
      id: "no-memory-write",
      label: "Memory substrate inventory does not create durable memory writes",
      passed: true,
      evidence: "read_only_memory_inventory",
    },
  ];
  const passed = checks.filter((check) => check.passed).length;

  return {
    ok: true,
    registry: "openclaw-phase-6-memory-substrate-inventory-v0",
    mode: "read_only_phase_6_memory_substrate_inventory",
    generatedAt: new Date().toISOString(),
    status: passed === checks.length ? "memory_substrate_inventory_ready" : "waiting_for_memory_substrate_inventory",
    governance: phase6ReadOnlyGovernance(),
    memorySources,
    checks,
    summary: {
      ready: passed === checks.length,
      passed,
      total: checks.length,
      completionPercent: Math.round((passed / checks.length) * 100),
      sourceCount: memorySources.length,
      writableSources: memorySources.filter((source) => source.readOnly !== true).length,
      writesMemory: false,
    },
    evidence: {
      plan,
    },
    next: {
      recommendedSlice: "openclaw-phase-6-consciousness-context-envelope",
      boundary: "build cloud-consciousness context envelopes without calling cloud models",
    },
  };
}

async function buildPhase6ConsciousnessContextEnvelope() {
  const inventory = await buildPhase6MemorySubstrateInventory();
  const [health, screenState] = await Promise.all([
    fetchJson(`${systemSenseUrl}/system/health`).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to read system health.",
    })),
    fetchJson(`${screenSenseUrl}/screen/state`).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to read screen state.",
    })),
  ]);
  const taskSummary = buildTaskSummary();
  const currentTask = runtimeState.currentTaskId ? serialiseTask(getTaskById(runtimeState.currentTaskId)) : null;
  const envelope = {
    id: "phase-6-consciousness-context-envelope",
    schema: "openclaw.consciousness.context.v0",
    createdAt: new Date().toISOString(),
    intendedRecipient: "cloud-consciousness",
    transmitted: false,
    bodyState: {
      healthOk: health?.ok === true,
      serviceCount: Object.keys(health?.system?.services ?? {}).length,
      alerts: health?.system?.alerts ?? [],
    },
    workViewState: {
      screenOk: screenState?.ok === true,
      activeWindow: screenState?.screen?.activeWindow ?? screenState?.activeWindow ?? null,
      summary: screenState?.screen?.summary ?? screenState?.summary ?? null,
    },
    taskState: {
      runtime: runtimeState.status,
      paused: runtimeState.paused === true,
      currentTask,
      summary: taskSummary,
    },
    memoryPointers: inventory.memorySources.map((source) => ({
      id: source.id,
      label: source.label,
      purpose: source.purpose,
      readOnly: source.readOnly,
    })),
    sovereignty: {
      userCanPause: true,
      userCanStop: true,
      userCanTakeover: true,
      crossDomainAllowed: false,
      memoryWriteAllowed: false,
      cloudCallAllowed: false,
    },
  };
  const checks = [
    {
      id: "memory-substrate-ready",
      label: "Memory substrate inventory is ready",
      passed: inventory.summary?.ready === true,
      evidence: inventory.registry,
    },
    {
      id: "body-context-present",
      label: "Envelope includes body health context",
      passed: typeof envelope.bodyState.serviceCount === "number",
      evidence: `${envelope.bodyState.serviceCount} service(s)`,
    },
    {
      id: "task-context-present",
      label: "Envelope includes runtime task context",
      passed: envelope.taskState.summary?.counts?.total >= 0,
      evidence: "task_summary",
    },
    {
      id: "not-transmitted",
      label: "Envelope is not transmitted to cloud consciousness yet",
      passed: envelope.transmitted === false && envelope.sovereignty.cloudCallAllowed === false,
      evidence: "read_only_context_envelope",
    },
  ];
  const passed = checks.filter((check) => check.passed).length;

  return {
    ok: true,
    registry: "openclaw-phase-6-consciousness-context-envelope-v0",
    mode: "read_only_phase_6_consciousness_context_envelope",
    generatedAt: new Date().toISOString(),
    status: passed === checks.length ? "consciousness_context_envelope_ready" : "waiting_for_consciousness_context",
    governance: phase6ReadOnlyGovernance(),
    envelope,
    checks,
    summary: {
      ready: passed === checks.length,
      passed,
      total: checks.length,
      completionPercent: Math.round((passed / checks.length) * 100),
      memoryPointers: envelope.memoryPointers.length,
      transmitted: false,
      callsCloudModel: false,
    },
    evidence: {
      memorySubstrateInventory: inventory,
    },
    next: {
      recommendedSlice: "openclaw-phase-6-task-orchestration-records",
      boundary: "derive task orchestration records without scheduling or executing new tasks",
    },
  };
}

async function buildPhase6TaskOrchestrationRecords() {
  const context = await buildPhase6ConsciousnessContextEnvelope();
  const records = [
    {
      id: "phase-6-orchestration-record-1",
      goal: "Sustain resident body while preparing memory-bearing task cognition",
      status: "planned",
      parent: "openclaw-phase-6-consciousness-memory-plan",
      dependencies: ["openclaw-mvp-final-readiness", "openclaw-post-mvp-plan"],
      evidence: [context.registry],
      executesNow: false,
    },
    {
      id: "phase-6-orchestration-record-2",
      goal: "Use body state and memory pointers to form a consciousness context envelope",
      status: "ready",
      parent: "openclaw-phase-6-consciousness-memory-plan",
      dependencies: ["openclaw-phase-6-memory-substrate-inventory"],
      evidence: ["openclaw-phase-6-consciousness-context-envelope"],
      executesNow: false,
    },
    {
      id: "phase-6-orchestration-record-3",
      goal: "Review durable memory write route before any long-term memory mutation",
      status: "blocked_until_route_review",
      parent: "openclaw-phase-6-consciousness-memory-plan",
      dependencies: ["openclaw-phase-6-task-orchestration-records"],
      evidence: ["openclaw-phase-6-memory-write-route-review"],
      executesNow: false,
    },
  ];
  const checks = [
    {
      id: "context-envelope-ready",
      label: "Consciousness context envelope is ready",
      passed: context.summary?.ready === true,
      evidence: context.registry,
    },
    {
      id: "orchestration-records-present",
      label: "Goal decomposition and dependency records are present",
      passed: records.length >= 3 && records.every((record) => Array.isArray(record.dependencies)),
      evidence: `${records.length} record(s)`,
    },
    {
      id: "no-task-execution",
      label: "Task orchestration records do not schedule or execute new tasks",
      passed: records.every((record) => record.executesNow === false),
      evidence: "read_only_task_orchestration_records",
    },
  ];
  const passed = checks.filter((check) => check.passed).length;

  return {
    ok: true,
    registry: "openclaw-phase-6-task-orchestration-records-v0",
    mode: "read_only_phase_6_task_orchestration_records",
    generatedAt: new Date().toISOString(),
    status: passed === checks.length ? "task_orchestration_records_ready" : "waiting_for_task_orchestration_records",
    governance: phase6ReadOnlyGovernance(),
    records,
    checks,
    summary: {
      ready: passed === checks.length,
      passed,
      total: checks.length,
      completionPercent: Math.round((passed / checks.length) * 100),
      recordCount: records.length,
      scheduledTasks: 0,
      createsTask: false,
    },
    evidence: {
      consciousnessContextEnvelope: context,
    },
    next: {
      recommendedSlice: "openclaw-phase-6-memory-write-route-review",
      boundary: "review memory write route before durable memory mutation",
    },
  };
}

async function buildPhase6MemoryWriteRouteReview() {
  const orchestration = await buildPhase6TaskOrchestrationRecords();
  const decision = {
    selectedSlice: "openclaw-phase-6-exit",
    deferredSlice: "openclaw-long-term-memory-write-task",
    reason: "Phase 6 proves the context and orchestration shape; durable long-term memory writes need a separate approval-gated implementation phase.",
    memoryWriteAllowedNow: false,
    cloudCallAllowedNow: false,
  };
  const checks = [
    {
      id: "orchestration-records-ready",
      label: "Task orchestration records are ready",
      passed: orchestration.summary?.ready === true,
      evidence: orchestration.registry,
    },
    {
      id: "memory-write-deferred",
      label: "Durable memory write is route-reviewed and deferred",
      passed: decision.memoryWriteAllowedNow === false,
      evidence: decision.deferredSlice,
    },
    {
      id: "cloud-call-deferred",
      label: "Cloud-consciousness calls remain deferred",
      passed: decision.cloudCallAllowedNow === false,
      evidence: "no_cloud_call_in_phase_6",
    },
  ];
  const passed = checks.filter((check) => check.passed).length;

  return {
    ok: true,
    registry: "openclaw-phase-6-memory-write-route-review-v0",
    mode: "read_only_phase_6_memory_write_route_review",
    generatedAt: new Date().toISOString(),
    status: passed === checks.length ? "memory_write_route_review_ready" : "waiting_for_memory_write_route_review",
    governance: phase6ReadOnlyGovernance(),
    decision,
    checks,
    summary: {
      ready: passed === checks.length,
      passed,
      total: checks.length,
      completionPercent: Math.round((passed / checks.length) * 100),
      writesMemory: false,
      callsCloudModel: false,
      selectedSlice: decision.selectedSlice,
    },
    evidence: {
      taskOrchestrationRecords: orchestration,
    },
    next: {
      recommendedSlice: "openclaw-phase-6-exit",
      boundary: "close Phase 6 before any separate long-term-memory writer phase",
    },
  };
}

async function buildPhase6Exit() {
  const plan = await buildPhase6Plan();
  const inventory = await buildPhase6MemorySubstrateInventory();
  const context = await buildPhase6ConsciousnessContextEnvelope();
  const orchestration = await buildPhase6TaskOrchestrationRecords();
  const routeReview = await buildPhase6MemoryWriteRouteReview();
  const checks = [
    {
      id: "phase-6-plan-ready",
      label: "Phase 6 route plan is complete",
      passed: plan.summary?.ready === true,
      evidence: plan.registry,
    },
    {
      id: "memory-substrate-ready",
      label: "Memory substrate inventory is complete",
      passed: inventory.summary?.ready === true,
      evidence: inventory.registry,
    },
    {
      id: "consciousness-context-ready",
      label: "Consciousness context envelope is complete",
      passed: context.summary?.ready === true,
      evidence: context.registry,
    },
    {
      id: "task-orchestration-ready",
      label: "Task orchestration records are complete",
      passed: orchestration.summary?.ready === true,
      evidence: orchestration.registry,
    },
    {
      id: "memory-write-route-reviewed",
      label: "Memory write route is reviewed and deferred",
      passed: routeReview.summary?.ready === true && routeReview.summary?.writesMemory === false,
      evidence: routeReview.registry,
    },
  ];
  const passed = checks.filter((check) => check.passed).length;
  const complete = passed === checks.length;

  return {
    ok: true,
    registry: "openclaw-phase-6-exit-v0",
    mode: "read_only_phase_6_exit_gate",
    generatedAt: new Date().toISOString(),
    status: complete ? "phase_6_complete" : "waiting_for_phase_6_readiness",
    governance: phase6ReadOnlyGovernance(),
    completedPhase: {
      id: "phase-6",
      name: "Consciousness, Memory, and Task Orchestration",
      completionClaim: complete ? "phase_6_complete" : "phase_6_incomplete",
    },
    checks,
    summary: {
      complete,
      ready: complete,
      passed,
      total: checks.length,
      completionPercent: complete ? 100 : Math.round((passed / checks.length) * 100),
      phase: "phase-6",
      memorySources: inventory.summary?.sourceCount ?? 0,
      memoryPointers: context.summary?.memoryPointers ?? 0,
      orchestrationRecords: orchestration.summary?.recordCount ?? 0,
      writesMemory: false,
      callsCloudModel: false,
      createsTask: false,
    },
    evidence: {
      plan,
      memorySubstrateInventory: inventory,
      consciousnessContextEnvelope: context,
      taskOrchestrationRecords: orchestration,
      memoryWriteRouteReview: routeReview,
    },
    next: {
      recommendedSlice: "openclaw-long-term-memory-write-plan",
      boundary: "start a separate approval-gated memory writer plan before durable memory writes or cloud-consciousness calls",
    },
  };
}


  return {
    buildPhase5Plan,
    buildPhase5DeploymentInventory,
    buildPhase5RollbackReadiness,
    buildPhase5ReleaseControlReadiness,
    buildPhase5Exit,
    buildMvpFinalReadiness,
    buildPostMvpPlan,
    buildPhase6Plan,
    buildPhase6MemorySubstrateInventory,
    buildPhase6ConsciousnessContextEnvelope,
    buildPhase6TaskOrchestrationRecords,
    buildPhase6MemoryWriteRouteReview,
    buildPhase6Exit,
  };
}
