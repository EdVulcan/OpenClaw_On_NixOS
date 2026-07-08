export function createSystemdNextRepairPlanning({
  buildSystemdUnitInventory,
  buildSystemdDependencyMap,
  buildBodyEvidenceLedgerDemoStatus,
  buildCommandDryRun,
  findInventoryUnit,
  classifySystemdRepairRisk,
  registries = {},
} = {}) {
  const requireDependency = (name, value) => {
    if (typeof value !== "function") {
      throw new TypeError(`createSystemdNextRepairPlanning requires ${name}`);
    }
    return value;
  };

  const buildInventory = requireDependency("buildSystemdUnitInventory", buildSystemdUnitInventory);
  const buildDependencyMap = requireDependency("buildSystemdDependencyMap", buildSystemdDependencyMap);
  const buildLedgerDemoStatus = requireDependency("buildBodyEvidenceLedgerDemoStatus", buildBodyEvidenceLedgerDemoStatus);
  const buildDryRun = requireDependency("buildCommandDryRun", buildCommandDryRun);
  const findUnit = requireDependency("findInventoryUnit", findInventoryUnit);
  const classifyRisk = requireDependency("classifySystemdRepairRisk", classifySystemdRepairRisk);

  const SYSTEMD_NEXT_REPAIR_SCOPE_REVIEW_REGISTRY = registries.systemdNextRepairScopeReview ?? "openclaw-systemd-next-repair-scope-review-v0";
  const SYSTEMD_NEXT_REPAIR_PLAN_REGISTRY = registries.systemdNextRepairPlan ?? "openclaw-systemd-next-repair-plan-v0";
  const SYSTEMD_NEXT_REPAIR_ROUTE_REVIEW_REGISTRY = registries.systemdNextRepairRouteReview ?? "openclaw-systemd-next-repair-route-review-v0";
  const SYSTEMD_NEXT_REPAIR_DRY_RUN_REGISTRY = registries.systemdNextRepairDryRun ?? "openclaw-systemd-next-repair-dry-run-v0";
  const SYSTEMD_NEXT_REPAIR_TASK_ROUTE_REGISTRY = registries.systemdNextRepairTaskRoute ?? "openclaw-systemd-next-repair-task-route-v0";

  async function buildSystemdNextRepairScopeReview() {
    const inventory = await buildInventory();
    const dependencyMap = await buildDependencyMap();
    const ledgerDemoStatus = await buildLedgerDemoStatus();
    const nodeByUnit = new Map((dependencyMap.nodes ?? []).map((node) => [node.unit, node]));
    const completedDemoUnit = "openclaw-browser-runtime.service";
    const candidates = (inventory.units ?? [])
      .filter((unit) => unit.component === "body")
      .map((unit) => {
        const node = nodeByUnit.get(unit.unit) ?? {};
        const isCompletedDemoTarget = unit.unit === completedDemoUnit;
        const isFoundational = ["openclaw-event-hub.service", "openclaw-core.service"].includes(unit.unit);
        const isSelected = unit.unit === "openclaw-system-sense.service";
        return {
          unit: unit.unit,
          component: unit.component,
          activeState: unit.activeState,
          subState: unit.subState,
          impactClass: node.impactClass ?? "unknown",
          impactRadius: node.impactRadius ?? 0,
          dependencyLayer: node.dependencyLayer ?? null,
          score: isSelected ? 96 : isCompletedDemoTarget ? 20 : isFoundational ? 45 : 70 - Math.min(20, node.impactRadius ?? 0),
          recommended: isSelected,
          mutation: false,
          reason: isSelected
            ? "System Sense is the body introspection organ that produced the ledger evidence; review its repair scope next before any new mutation."
            : isCompletedDemoTarget
              ? "Browser Runtime already served as the completed real repair demo target; do not loop back into it."
              : isFoundational
                ? "Foundational control-plane units are deferred until lower-risk body organs have a fresh scope review."
                : "Candidate remains available for future route review, but System Sense is the narrowest next body-memory-adjacent scope.",
        };
      })
      .sort((left, right) => right.score - left.score);
    const selected = candidates.find((candidate) => candidate.recommended) ?? candidates[0] ?? null;
    const reviewReady = ledgerDemoStatus.summary?.demoReady === true && selected?.unit === "openclaw-system-sense.service";

    return {
      ok: true,
      registry: SYSTEMD_NEXT_REPAIR_SCOPE_REVIEW_REGISTRY,
      mode: "read_only_next_systemd_repair_scope_review",
      generatedAt: new Date().toISOString(),
      source: {
        service: "openclaw-system-sense",
        inventoryRegistry: inventory.registry,
        dependencyMapRegistry: dependencyMap.registry,
        ledgerDemoStatusRegistry: ledgerDemoStatus.registry,
        phase2Plan: "docs/plans/OPENCLAW_PHASE_2_PLAN.md",
        evidence: "systemd_next_repair_scope_review",
      },
      governance: {
        domain: "body_internal",
        risk: "low",
        autonomy: "scope_review_only",
        approvalRequired: false,
        hostMutation: false,
        canMutate: false,
        canRestart: false,
        createsTask: false,
        createsApproval: false,
        executesCommand: false,
        triggersRecovery: false,
        schedulesFollowUp: false,
      },
      decision: {
        selectedTrack: "Track A: Real NixOS/systemd Repair Semantics",
        selectedSlice: "openclaw-systemd-next-repair-plan",
        selectedUnit: selected?.unit ?? null,
        status: reviewReady ? "selected" : "blocked_until_ledger_demo_ready",
        rationale: "Return to real systemd repair semantics with a read-only scope review anchored in durable body evidence; do not replay the completed browser-runtime demo path.",
        notSelected: [
          "no browser-runtime repair demo loop",
          "no immediate repair task",
          "no systemctl execution",
          "no broader host mutation",
          "no automatic repair",
          "no plugin/runtime adapter work",
          "no additional ledger writes",
        ],
      },
      summary: {
        ready: reviewReady,
        selectedUnit: selected?.unit ?? null,
        candidateCount: candidates.length,
        ledgerDemoReady: ledgerDemoStatus.summary?.demoReady === true,
        completedDemoUnit,
        hiddenMutation: false,
      },
      candidates,
      evidence: {
        ledgerDemo: {
          registry: ledgerDemoStatus.registry,
          demoReady: ledgerDemoStatus.summary?.demoReady === true,
          recordCount: ledgerDemoStatus.summary?.recordCount ?? 0,
          bootstrapRecordId: ledgerDemoStatus.summary?.bootstrapRecordId ?? null,
        },
        selectedDependencyNode: selected ? nodeByUnit.get(selected.unit) ?? null : null,
        inventorySummary: inventory.summary,
        dependencySummary: dependencyMap.summary,
      },
      next: {
        recommendedSlice: "openclaw-systemd-next-repair-plan",
        boundary: "plan-only repair scope for the selected unit; do not create tasks, approvals, restarts, or host mutation",
      },
    };
  }

  async function buildSystemdNextRepairPlan() {
    const scopeReview = await buildSystemdNextRepairScopeReview();
    const selectedUnit = scopeReview.decision?.selectedUnit ?? null;
    const inventory = await buildInventory();
    const unit = findUnit(inventory, selectedUnit);
    const dependencyNode = scopeReview.evidence?.selectedDependencyNode ?? null;
    const risk = unit ? classifyRisk(unit) : "unknown";

    return {
      ok: true,
      registry: SYSTEMD_NEXT_REPAIR_PLAN_REGISTRY,
      mode: "plan_only_next_systemd_repair_scope",
      generatedAt: new Date().toISOString(),
      source: {
        service: "openclaw-system-sense",
        scopeReviewRegistry: scopeReview.registry,
        inventoryRegistry: inventory.registry,
        ledgerDemoStatusRegistry: scopeReview.evidence?.ledgerDemo?.registry ?? null,
        phase2Plan: "docs/plans/OPENCLAW_PHASE_2_PLAN.md",
        evidence: "systemd_next_repair_plan",
      },
      governance: {
        domain: "body_internal",
        risk,
        autonomy: "plan_only",
        approvalRequired: false,
        hostMutation: false,
        canMutate: false,
        canRestart: false,
        createsTask: false,
        createsApproval: false,
        executesCommand: false,
        triggersRecovery: false,
        schedulesFollowUp: false,
      },
      scope: {
        selectedUnit,
        selectedSlice: scopeReview.decision?.selectedSlice ?? null,
        scopeReady: scopeReview.summary?.ready === true,
        ledgerDemoReady: scopeReview.summary?.ledgerDemoReady === true,
        completedDemoUnit: scopeReview.summary?.completedDemoUnit ?? null,
        rationale: scopeReview.decision?.rationale ?? null,
      },
      target: unit ? {
        key: unit.key,
        name: unit.name,
        unit: unit.unit,
        component: unit.component,
        activeState: unit.activeState,
        subState: unit.subState,
        loadState: unit.loadState,
        unitFileState: unit.unitFileState,
        systemdObserved: unit.systemdObserved,
        impactClass: dependencyNode?.impactClass ?? "unknown",
        impactRadius: dependencyNode?.impactRadius ?? 0,
        dependencyLayer: dependencyNode?.dependencyLayer ?? null,
      } : null,
      plan: {
        intent: "systemd.next_repair.plan",
        targetUnit: unit?.unit ?? null,
        commandPreview: unit ? `systemctl restart ${unit.unit}` : null,
        commandPreviewOnly: true,
        createsExecutableTask: false,
        createsApproval: false,
        executesCommand: false,
        restartsService: false,
        reason: unit
          ? `${unit.unit} is the selected next Track A scope; this plan records the repair shape before any dry-run, task, approval, or restart.`
          : "No selected OpenClaw-owned unit is available for the next repair plan.",
        requiredBeforeExecution: [
          "separate route review for the selected next repair plan",
          "operator-visible dry-run envelope",
          "approval-gated task shell",
          "explicit operator approval",
          "post-execution verification bundle",
        ],
        notSelected: [
          "no immediate dry-run",
          "no immediate repair task",
          "no approval creation",
          "no systemctl execution",
          "no automatic repair",
          "no browser-runtime repair demo replay",
          "no additional ledger writes",
        ],
      },
      next: {
        recommendedSlice: "openclaw-systemd-next-repair-route-review",
        boundary: "route review before any dry-run, task, approval, restart, or host mutation for the selected unit",
      },
    };
  }

  async function buildSystemdNextRepairRouteReview() {
    const repairPlan = await buildSystemdNextRepairPlan();
    const planReady = repairPlan.plan?.targetUnit === "openclaw-system-sense.service"
      && repairPlan.plan?.commandPreviewOnly === true
      && repairPlan.governance?.hostMutation === false
      && repairPlan.governance?.executesCommand === false;
    const candidates = [
      {
        track: "Track A",
        id: "next-repair-dry-run-envelope",
        label: "Operator-visible dry-run envelope for the selected system-sense repair plan",
        score: planReady ? 96 : 50,
        recommended: true,
        firstSlice: "openclaw-systemd-next-repair-dry-run",
        mutation: false,
        reason: planReady
          ? "The selected system-sense repair scope has a plan-only command preview; the next smallest Track A step is a non-mutating dry-run envelope."
          : "The dry-run route waits until the next repair plan is ready and non-mutating.",
      },
      {
        track: "Track A",
        id: "immediate-task-shell",
        label: "Approval-gated task shell for the selected system-sense repair",
        score: 58,
        recommended: false,
        firstSlice: "defer-next-repair-task-shell",
        mutation: false,
        reason: "Task materialization is too early; the selected unit needs an Observer-visible dry-run envelope first.",
      },
      {
        track: "Track A",
        id: "immediate-systemctl-execution",
        label: "Immediate systemctl restart execution",
        score: 20,
        recommended: false,
        firstSlice: "defer-next-repair-real-execution",
        mutation: true,
        reason: "Real restart would mutate the host and must wait for dry-run, task, approval, and verification slices.",
      },
      {
        track: "Track B",
        id: "browser-runtime-demo-replay",
        label: "Replay the completed browser-runtime repair demo",
        score: 18,
        recommended: false,
        firstSlice: "defer-browser-runtime-demo-replay",
        mutation: false,
        reason: "The browser-runtime repair demo is already complete; replaying it would slow Phase 2 progress.",
      },
      {
        track: "Deferred Track",
        id: "plugin-runtime-adapter",
        label: "Plugin/runtime adapter work",
        score: 10,
        recommended: false,
        firstSlice: "defer-plugin-runtime-adapter",
        mutation: false,
        reason: "Plugin/runtime adapter work is still not needed for this body repair route.",
      },
    ];

    return {
      ok: true,
      registry: SYSTEMD_NEXT_REPAIR_ROUTE_REVIEW_REGISTRY,
      mode: "read_only_next_systemd_repair_route_selection",
      generatedAt: new Date().toISOString(),
      source: {
        service: "openclaw-system-sense",
        nextRepairPlanRegistry: repairPlan.registry,
        scopeReviewRegistry: repairPlan.source?.scopeReviewRegistry ?? null,
        phase2Plan: "docs/plans/OPENCLAW_PHASE_2_PLAN.md",
        evidence: "systemd_next_repair_route_review",
      },
      governance: {
        domain: "body_internal",
        risk: "low",
        autonomy: "route_selection_only",
        approvalRequired: false,
        hostMutation: false,
        canMutate: false,
        canRestart: false,
        createsTask: false,
        createsApproval: false,
        executesCommand: false,
        triggersRecovery: false,
        schedulesFollowUp: false,
      },
      decision: {
        selectedTrack: "Track A: Real NixOS/systemd Repair Semantics",
        selectedSlice: "openclaw-systemd-next-repair-dry-run",
        selectedUnit: repairPlan.plan?.targetUnit ?? null,
        status: planReady ? "selected" : "blocked_until_next_repair_plan_ready",
        rationale: "Advance the selected system-sense repair route by one non-mutating step: a dry-run envelope, not a task or restart.",
        notSelected: [
          "no immediate repair task",
          "no approval creation",
          "no systemctl execution",
          "no host mutation",
          "no browser-runtime repair demo replay",
          "no automatic repair",
          "no persistence hardening",
          "no denial recovery or duplicate-click work",
          "no plugin/runtime adapter work",
        ],
      },
      evidence: {
        planReady,
        targetUnit: repairPlan.plan?.targetUnit ?? null,
        commandPreview: repairPlan.plan?.commandPreview ?? null,
        commandPreviewOnly: repairPlan.plan?.commandPreviewOnly === true,
        planRegistry: repairPlan.registry,
        scopeReviewRegistry: repairPlan.source?.scopeReviewRegistry ?? null,
        requiredBeforeExecution: repairPlan.plan?.requiredBeforeExecution ?? [],
        targetImpactClass: repairPlan.target?.impactClass ?? "unknown",
        targetImpactRadius: repairPlan.target?.impactRadius ?? 0,
        routePriorityOrder: [
          "operator-visible-dry-run-envelope",
          "defer-task-materialization",
          "defer-host-mutation",
          "avoid-completed-demo-replay",
          "plugin-runtime-adapter-deferred",
        ],
      },
      candidates,
      next: {
        recommendedSlice: "openclaw-systemd-next-repair-dry-run",
        boundary: "operator-visible dry-run envelope only; do not create tasks, approvals, restarts, recovery actions, schedulers, or host mutation",
      },
    };
  }

  async function buildSystemdNextRepairDryRun() {
    const routeReview = await buildSystemdNextRepairRouteReview();
    const repairPlan = await buildSystemdNextRepairPlan();
    const dryRun = buildDryRun({
      command: "systemctl",
      args: ["restart", repairPlan.plan?.targetUnit ?? ""].filter(Boolean),
      intent: "systemd.next_repair.dry_run",
    });

    return {
      ok: true,
      registry: SYSTEMD_NEXT_REPAIR_DRY_RUN_REGISTRY,
      mode: "operator_visible_next_systemd_repair_dry_run",
      canMutate: false,
      canRestart: false,
      wouldExecute: false,
      generatedAt: new Date().toISOString(),
      source: {
        service: "openclaw-system-sense",
        routeReviewRegistry: routeReview.registry,
        nextRepairPlanRegistry: repairPlan.registry,
        scopeReviewRegistry: repairPlan.source?.scopeReviewRegistry ?? null,
        evidence: "systemd_next_repair_dry_run_envelope",
      },
      target: repairPlan.target,
      plan: repairPlan,
      routeReview: {
        registry: routeReview.registry,
        selectedSlice: routeReview.decision?.selectedSlice ?? null,
        selectedUnit: routeReview.decision?.selectedUnit ?? null,
        status: routeReview.decision?.status ?? "unknown",
      },
      dryRun: {
        ...dryRun,
        risk: "high",
        governance: "require_future_operator_approval",
        requiresApproval: true,
        checks: [
          ...dryRun.checks,
          {
            name: "route_review_selected_dry_run",
            passed: routeReview.decision?.selectedSlice === "openclaw-systemd-next-repair-dry-run",
            detail: "The previous route review selected this dry-run envelope before any task or host mutation.",
          },
          {
            name: "target_is_system_sense",
            passed: repairPlan.plan?.targetUnit === "openclaw-system-sense.service",
            detail: "The dry-run envelope is limited to the selected system-sense repair scope.",
          },
          {
            name: "operator_visible_before_mutation",
            passed: true,
            detail: "The restart command is visible before any future task, approval, or host mutation milestone.",
          },
          {
            name: "no_restart_executed",
            passed: true,
            detail: "This endpoint does not execute systemctl restart.",
          },
        ],
      },
      governance: {
        domain: "body_internal",
        autonomy: "dry_run_only",
        approvalRequired: false,
        hostMutation: false,
        canMutate: false,
        canRestart: false,
        createsTask: false,
        createsApproval: false,
        executesCommand: false,
        triggersRecovery: false,
        schedulesFollowUp: false,
        futureExecutionRequiresSeparateMilestone: true,
      },
      next: {
        recommendedSlice: "openclaw-systemd-next-repair-task-route",
        boundary: "route-review task materialization before creating approvals, executing systemctl, restarting services, or mutating the host",
      },
    };
  }

  async function buildSystemdNextRepairTaskRoute() {
    const envelope = await buildSystemdNextRepairDryRun();
    const routeReady = envelope.registry === SYSTEMD_NEXT_REPAIR_DRY_RUN_REGISTRY
      && envelope.target?.unit === "openclaw-system-sense.service"
      && envelope.dryRun?.wouldExecute === false
      && envelope.governance?.hostMutation === false
      && envelope.governance?.executesCommand === false;

    return {
      ok: true,
      registry: SYSTEMD_NEXT_REPAIR_TASK_ROUTE_REGISTRY,
      mode: "read_only_next_systemd_repair_task_route",
      generatedAt: new Date().toISOString(),
      source: {
        service: "openclaw-system-sense",
        nextRepairDryRunRegistry: envelope.registry,
        nextRepairPlanRegistry: envelope.source?.nextRepairPlanRegistry ?? null,
        routeReviewRegistry: envelope.source?.routeReviewRegistry ?? null,
        phase2Plan: "docs/plans/OPENCLAW_PHASE_2_PLAN.md",
        evidence: "systemd_next_repair_task_route",
      },
      governance: {
        domain: "body_internal",
        risk: "medium",
        autonomy: "task_route_only",
        approvalRequired: false,
        hostMutation: false,
        canMutate: false,
        canRestart: false,
        createsTask: false,
        createsApproval: false,
        executesCommand: false,
        triggersRecovery: false,
        schedulesFollowUp: false,
      },
      routeDecision: {
        targetUnit: envelope.target?.unit ?? null,
        status: routeReady ? "task_shell_route_available" : "blocked_until_dry_run_ready",
        selectedSlice: "openclaw-systemd-next-repair-task-shell",
        taskShellAllowed: routeReady,
        reason: routeReady
          ? "The system-sense repair dry-run is visible and non-mutating; a future task shell may be created but must still stop before approval and execution."
          : "Task shell route waits until the selected repair dry-run is ready and non-mutating.",
      },
      requiredBeforeTaskCreation: [
        "Observer-visible next repair plan",
        "read-only route review selecting dry-run",
        "operator-visible dry-run envelope",
        "explicit task shell milestone",
        "separate operator approval before execution",
      ],
      allowedNextActions: [
        {
          id: "create-task-shell",
          label: "Create approval-gated task shell for the selected system-sense repair",
          allowedNow: routeReady,
          createsTask: true,
          createsApproval: true,
          mutatesHost: false,
          boundary: "task shell only; no approval auto-grant, no command execution, no restart",
        },
        {
          id: "execute-restart",
          label: "Execute systemctl restart for the selected system-sense repair",
          allowedNow: false,
          createsTask: false,
          createsApproval: false,
          mutatesHost: true,
          boundary: "requires later approval and real execution milestones",
        },
      ],
      evidence: {
        dryRunReady: routeReady,
        dryRunRegistry: envelope.registry,
        targetUnit: envelope.target?.unit ?? null,
        command: envelope.dryRun?.command ?? null,
        args: envelope.dryRun?.args ?? [],
        wouldExecute: envelope.dryRun?.wouldExecute === true,
        routeReview: envelope.routeReview,
        checks: envelope.dryRun?.checks ?? [],
      },
      next: {
        recommendedSlice: "openclaw-systemd-next-repair-task-shell",
        boundary: "approval-gated task shell only; do not approve, execute, restart, recover, schedule, or broaden systemd control",
      },
    };
  }

  return {
    buildSystemdNextRepairScopeReview,
    buildSystemdNextRepairPlan,
    buildSystemdNextRepairRouteReview,
    buildSystemdNextRepairDryRun,
    buildSystemdNextRepairTaskRoute,
  };
}
