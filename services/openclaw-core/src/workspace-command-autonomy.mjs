const AUTONOMOUS_VALIDATION_SCRIPTS = new Set(["typecheck", "test", "lint"]);
const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);

export const WORKSPACE_COMMAND_AUTONOMY_REGISTRY = "openclaw-workspace-command-autonomy-v0";
export const WORKSPACE_COMMAND_AUTONOMOUS_GRANT_REGISTRY = "openclaw-workspace-command-autonomous-execution-v0";

function exactValidationScript(proposal) {
  return typeof proposal?.scriptName === "string"
    && AUTONOMOUS_VALIDATION_SCRIPTS.has(proposal.scriptName)
    && proposal.category === "validation"
    && proposal.risk === "low";
}

function fixedCommandShape(proposal) {
  const packageManager = typeof proposal?.packageManager === "string" ? proposal.packageManager : null;
  const expectedCommand = packageManager;
  const expectedArgs = ["run", proposal?.scriptName];
  return PACKAGE_MANAGERS.has(packageManager)
    && proposal.command === expectedCommand
    && Array.isArray(proposal.args)
    && JSON.stringify(proposal.args) === JSON.stringify(expectedArgs)
    && proposal.usesShell === false
    && typeof proposal.workspaceId === "string"
    && proposal.workspaceId.trim()
    && typeof proposal.workspacePath === "string"
    && proposal.workspacePath.trim()
    && proposal.cwd === proposal.workspacePath;
}

export function assessWorkspaceCommandAutonomy({ proposal, autonomyMode } = {}) {
  const checks = {
    sovereignBody: autonomyMode === "sovereign_body",
    registeredValidationScript: exactValidationScript(proposal),
    fixedCommandShape: fixedCommandShape(proposal),
  };
  const authorized = Object.values(checks).every(Boolean);
  let reason = "workspace_command_requires_explicit_user_approval";
  if (authorized) {
    reason = "bounded_sovereign_body_validation_audit_only";
  } else if (!checks.sovereignBody) {
    reason = "workspace_command_requires_explicit_user_approval";
  } else if (!checks.registeredValidationScript) {
    reason = "workspace_command_script_is_not_registered_low_risk_validation";
  } else if (!checks.fixedCommandShape) {
    reason = "workspace_command_shape_is_not_fixed_or_shell_free";
  }

  return {
    registry: WORKSPACE_COMMAND_AUTONOMY_REGISTRY,
    mode: authorized ? "audit_only" : "approval_gated",
    authorized,
    reason,
    checks,
    scope: authorized
      ? {
          workspaceId: proposal.workspaceId,
          workspacePath: proposal.workspacePath,
          scriptName: proposal.scriptName,
          packageManager: proposal.packageManager,
          command: proposal.command,
          args: [...proposal.args],
          cwd: proposal.cwd,
          usesShell: false,
        }
      : null,
  };
}

export function buildWorkspaceCommandAutonomousGrant({ proposal, requestHash } = {}) {
  const assessment = assessWorkspaceCommandAutonomy({ proposal, autonomyMode: "sovereign_body" });
  if (!assessment.authorized || typeof requestHash !== "string" || !requestHash) {
    return null;
  }
  return {
    registry: WORKSPACE_COMMAND_AUTONOMOUS_GRANT_REGISTRY,
    mode: "sovereign_body_audit_only",
    owner: "workspace-command-task-v0",
    capabilityId: "act.system.command.execute",
    requestHash,
    ...assessment.scope,
  };
}

export function validateWorkspaceCommandAutonomousGrant({ task, step, capability, requestHash } = {}) {
  const grant = step?.autonomousExecution;
  if (!grant || typeof grant !== "object") {
    return { ok: false, reason: "autonomous_execution_grant_missing" };
  }
  if (grant.registry !== WORKSPACE_COMMAND_AUTONOMOUS_GRANT_REGISTRY
    || grant.mode !== "sovereign_body_audit_only"
    || grant.owner !== "workspace-command-task-v0"
    || grant.capabilityId !== "act.system.command.execute"
    || capability?.id !== grant.capabilityId) {
    return { ok: false, reason: "autonomous_execution_grant_invalid" };
  }
  if (task?.type !== "system_task"
    || task.workViewStrategy !== "workspace-command"
    || task.policy?.decision?.decision !== "audit_only"
    || task.policy?.decision?.autonomyMode !== "sovereign_body"
    || task.policy?.decision?.domain !== "body_internal"
    || task.policy?.decision?.risk !== "low"
    || task.policy?.decision?.autonomous !== true
    || task.policy?.request?.requiresApproval === true) {
    return { ok: false, reason: "autonomous_execution_task_policy_invalid" };
  }
  if (["completed", "skipped"].includes(step.status)) {
    return { ok: false, reason: "autonomous_execution_step_completed" };
  }
  if (["running", "reserved"].includes(step.status)) {
    return { ok: false, reason: "autonomous_execution_step_already_consumed" };
  }
  if (step.status === "failed") {
    return { ok: false, reason: "autonomous_execution_step_failed" };
  }
  if (!AUTONOMOUS_VALIDATION_SCRIPTS.has(grant.scriptName)
    || typeof grant.workspaceId !== "string"
    || !grant.workspaceId.trim()
    || typeof grant.workspacePath !== "string"
    || !grant.workspacePath.trim()
    || grant.cwd !== grant.workspacePath
    || grant.usesShell !== false
    || typeof grant.command !== "string"
    || !PACKAGE_MANAGERS.has(grant.command)
    || !Array.isArray(grant.args)
    || JSON.stringify(grant.args) !== JSON.stringify(["run", grant.scriptName])) {
    return { ok: false, reason: "autonomous_execution_grant_scope_invalid" };
  }
  if (typeof grant.requestHash !== "string" || !grant.requestHash || grant.requestHash !== requestHash) {
    return { ok: false, reason: "autonomous_execution_request_mismatch" };
  }
  return {
    ok: true,
    mode: "sovereign_body_audit_only",
    grant,
  };
}
