export function createSystemdRepairProposals({
  buildSystemdUnitInventory,
  buildCommandDryRun,
  findInventoryUnit,
  classifySystemdRepairRisk,
  registries = {},
} = {}) {
  const requireDependency = (name, value) => {
    if (typeof value !== "function") {
      throw new TypeError(`createSystemdRepairProposals requires ${name}`);
    }
    return value;
  };

  const buildInventory = requireDependency("buildSystemdUnitInventory", buildSystemdUnitInventory);
  const buildDryRun = requireDependency("buildCommandDryRun", buildCommandDryRun);
  const findUnit = requireDependency("findInventoryUnit", findInventoryUnit);
  const classifyRisk = requireDependency("classifySystemdRepairRisk", classifySystemdRepairRisk);

  const SYSTEMD_REPAIR_PLAN_REGISTRY = registries.systemdRepairPlan ?? "openclaw-systemd-repair-plan-v0";
  const SYSTEMD_REPAIR_DRY_RUN_REGISTRY = registries.systemdRepairDryRun ?? "openclaw-systemd-repair-dry-run-v0";

  function buildSystemdRepairReason(unit, requestedReason) {
    if (typeof requestedReason === "string" && requestedReason.trim()) {
      return requestedReason.trim();
    }
    if (unit.activeState === "failed" || unit.subState === "failed") {
      return `${unit.unit} reports failed state and may need an operator-approved restart.`;
    }
    if (unit.activeState === "inactive") {
      return `${unit.unit} reports inactive state and may need an operator-reviewed start/restart decision.`;
    }
    return `${unit.unit} is an OpenClaw-owned body unit; this proposal demonstrates the controlled repair path without mutating the host.`;
  }

  async function buildSystemdRepairPlan({ unit: requestedUnit, reason } = {}) {
    const inventory = await buildInventory();
    const unit = findUnit(inventory, requestedUnit);
    if (!unit) {
      const error = new Error("Requested unit is not part of the OpenClaw-owned systemd inventory.");
      error.code = "SYSTEMD_UNIT_NOT_OPENCLAW_OWNED";
      error.details = {
        requestedUnit: requestedUnit ?? null,
        allowedUnits: inventory.units.map((item) => item.unit),
      };
      throw error;
    }

    const risk = classifyRisk(unit);
    const command = {
      command: "systemctl",
      args: ["restart", unit.unit],
      shell: false,
      requiresOperator: true,
    };

    return {
      ok: true,
      registry: SYSTEMD_REPAIR_PLAN_REGISTRY,
      mode: "plan_only",
      canMutate: false,
      canRestart: false,
      wouldExecute: false,
      createdAt: new Date().toISOString(),
      source: {
        service: "openclaw-system-sense",
        inventoryRegistry: inventory.registry,
        inventoryObservedAt: inventory.observedAt,
        systemdAvailable: inventory.source.systemdAvailable,
        evidence: "operator_visible_repair_proposal",
      },
      target: {
        key: unit.key,
        name: unit.name,
        unit: unit.unit,
        component: unit.component,
        activeState: unit.activeState,
        subState: unit.subState,
        loadState: unit.loadState,
        unitFileState: unit.unitFileState,
        systemdObserved: unit.systemdObserved,
        observation: unit.observation,
      },
      proposal: {
        action: "restart-service",
        command,
        risk,
        reason: buildSystemdRepairReason(unit, reason),
        approvalRequiredForExecution: true,
        dryRunRequiredBeforeExecution: true,
        rollbackNote: `No automatic rollback is attempted. Before any future execution, capture systemctl status ${unit.unit}; after execution, verify health and journal output, then stop and escalate to the operator if the unit remains unhealthy.`,
      },
      governance: {
        domain: "body_internal",
        autonomy: "operator_visible_plan_only",
        hostMutation: false,
        executesCommand: false,
        approvalFlowCreated: false,
        forbiddenUntilFutureMilestone: ["automatic_restart", "blind_restart", "host_mutation"],
      },
      next: {
        recommendedSlice: "openclaw-systemd-repair-dry-run",
        boundary: "explicit dry-run envelope before any host mutation",
      },
    };
  }

  async function buildSystemdRepairDryRun({ unit, reason } = {}) {
    const plan = await buildSystemdRepairPlan({ unit, reason });
    const dryRun = buildDryRun({
      command: plan.proposal.command.command,
      args: plan.proposal.command.args,
      intent: "systemd.repair.dry_run",
    });

    return {
      ok: true,
      registry: SYSTEMD_REPAIR_DRY_RUN_REGISTRY,
      mode: "operator_visible_dry_run",
      canMutate: false,
      canRestart: false,
      wouldExecute: false,
      createdAt: new Date().toISOString(),
      source: {
        service: "openclaw-system-sense",
        planRegistry: plan.registry,
        inventoryRegistry: plan.source.inventoryRegistry,
        evidence: "explicit_operator_visible_dry_run_envelope",
      },
      target: plan.target,
      plan,
      dryRun: {
        ...dryRun,
        risk: "high",
        governance: "require_future_operator_approval",
        requiresApproval: true,
        checks: [
          ...dryRun.checks,
          {
            name: "operator_visible_before_mutation",
            passed: true,
            detail: "Repair command is visible to Observer before any future host mutation milestone.",
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
        hostMutation: false,
        executesCommand: false,
        approvalFlowCreated: false,
        futureExecutionRequiresSeparateMilestone: true,
      },
      next: {
        recommendedSlice: "operator-reviewed-systemd-repair-execution",
        boundary: "do not execute until a separate whitepaper route review accepts real host mutation",
      },
    };
  }

  return {
    buildSystemdRepairPlan,
    buildSystemdRepairDryRun,
  };
}
