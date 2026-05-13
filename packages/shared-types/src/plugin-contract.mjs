export const OPENCLAW_NATIVE_PLUGIN_CONTRACT_VERSION = "openclaw-native-plugin-contract-v0";

export const OPENCLAW_NATIVE_RUNTIME_OWNER = "openclaw_on_nixos";

export const OPENCLAW_RISKS = ["low", "medium", "high", "critical"];

export const OPENCLAW_POLICY_DOMAINS = ["body_internal", "user_task", "cross_boundary"];

export const OPENCLAW_CAPABILITY_KINDS = ["sense", "plan", "act", "observe", "heal"];

export const OPENCLAW_PLUGIN_ORIGINS = ["native", "absorbed_external", "generated_fixture"];

export const OPENCLAW_PERMISSION_KEYS = [
  "filesystemRead",
  "filesystemWrite",
  "commandExecution",
  "networkAccess",
  "browserControl",
  "screenControl",
  "systemMutation",
];

export const OPENCLAW_AUDIT_LEDGERS = [
  "event_audit",
  "capability_history",
  "filesystem_ledger",
  "command_transcript_ledger",
];

export const defaultOpenClawCapabilityPermissions = Object.freeze({
  filesystemRead: false,
  filesystemWrite: false,
  commandExecution: false,
  networkAccess: false,
  browserControl: false,
  screenControl: false,
  systemMutation: false,
});

export const defaultOpenClawPluginGovernance = Object.freeze({
  runtimeOwner: OPENCLAW_NATIVE_RUNTIME_OWNER,
  origin: "native",
  externalRuntimeDependencyAllowed: false,
  sourceContentImported: false,
  canCreateTasks: false,
  canCreateApprovals: false,
  canExecuteDuringRegistration: false,
  requiresHumanReviewBeforeActivation: true,
});

export function createOpenClawNativePluginContract({
  plugin,
  governance = {},
  capabilities = [],
} = {}) {
  return {
    contractVersion: OPENCLAW_NATIVE_PLUGIN_CONTRACT_VERSION,
    plugin: {
      id: plugin?.id ?? "",
      name: plugin?.name ?? "",
      version: plugin?.version ?? "0.0.0",
      summary: plugin?.summary ?? "",
    },
    governance: {
      ...defaultOpenClawPluginGovernance,
      ...governance,
      runtimeOwner: OPENCLAW_NATIVE_RUNTIME_OWNER,
      externalRuntimeDependencyAllowed: false,
    },
    capabilities: capabilities.map((capability) => normaliseOpenClawCapabilityContract(capability)),
  };
}

export function normaliseOpenClawCapabilityContract(capability = {}) {
  return {
    id: capability.id ?? "",
    title: capability.title ?? "",
    description: capability.description ?? "",
    kind: capability.kind ?? "observe",
    domains: Array.isArray(capability.domains) ? [...capability.domains] : [],
    risk: capability.risk ?? "low",
    runtimeOwner: OPENCLAW_NATIVE_RUNTIME_OWNER,
    permissions: {
      ...defaultOpenClawCapabilityPermissions,
      ...(capability.permissions ?? {}),
    },
    approval: {
      required: Boolean(capability.approval?.required),
      reason: capability.approval?.reason ?? "",
    },
    audit: {
      required: capability.audit?.required !== false,
      ledger: capability.audit?.ledger ?? "capability_history",
    },
  };
}

export function validateOpenClawNativePluginContract(contract) {
  const issues = [];
  const addIssue = (path, message) => issues.push({ path, message });

  if (!isPlainObject(contract)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "contract must be an object" }],
    };
  }

  if (contract.contractVersion !== OPENCLAW_NATIVE_PLUGIN_CONTRACT_VERSION) {
    addIssue("contractVersion", `must be ${OPENCLAW_NATIVE_PLUGIN_CONTRACT_VERSION}`);
  }

  validatePluginIdentity(contract.plugin, addIssue);
  validatePluginGovernance(contract.governance, addIssue);

  if (!Array.isArray(contract.capabilities) || contract.capabilities.length === 0) {
    addIssue("capabilities", "must contain at least one capability contract");
  } else {
    contract.capabilities.forEach((capability, index) => {
      validateCapabilityContract(capability, `capabilities[${index}]`, addIssue);
    });
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function summariseOpenClawNativePluginContract(contract) {
  const capabilities = Array.isArray(contract?.capabilities) ? contract.capabilities : [];
  const byRisk = Object.fromEntries(OPENCLAW_RISKS.map((risk) => [risk, 0]));
  const byKind = Object.fromEntries(OPENCLAW_CAPABILITY_KINDS.map((kind) => [kind, 0]));
  let approvalRequired = 0;
  let mutationCapable = 0;
  let executionCapable = 0;

  for (const capability of capabilities) {
    if (OPENCLAW_RISKS.includes(capability?.risk)) {
      byRisk[capability.risk] += 1;
    }
    if (OPENCLAW_CAPABILITY_KINDS.includes(capability?.kind)) {
      byKind[capability.kind] += 1;
    }
    if (capability?.approval?.required === true) {
      approvalRequired += 1;
    }
    if (hasMutationPermission(capability?.permissions)) {
      mutationCapable += 1;
    }
    if (capability?.permissions?.commandExecution === true) {
      executionCapable += 1;
    }
  }

  return {
    registry: OPENCLAW_NATIVE_PLUGIN_CONTRACT_VERSION,
    runtimeOwner: contract?.governance?.runtimeOwner ?? null,
    origin: contract?.governance?.origin ?? null,
    totalCapabilities: capabilities.length,
    approvalRequired,
    mutationCapable,
    executionCapable,
    byRisk,
    byKind,
  };
}

function validatePluginIdentity(plugin, addIssue) {
  if (!isPlainObject(plugin)) {
    addIssue("plugin", "must be an object");
    return;
  }
  for (const field of ["id", "name", "version", "summary"]) {
    if (!nonEmptyString(plugin[field])) {
      addIssue(`plugin.${field}`, "must be a non-empty string");
    }
  }
}

function validatePluginGovernance(governance, addIssue) {
  if (!isPlainObject(governance)) {
    addIssue("governance", "must be an object");
    return;
  }
  if (governance.runtimeOwner !== OPENCLAW_NATIVE_RUNTIME_OWNER) {
    addIssue("governance.runtimeOwner", "must stay owned by OpenClawOnNixOS");
  }
  if (!OPENCLAW_PLUGIN_ORIGINS.includes(governance.origin)) {
    addIssue("governance.origin", `must be one of ${OPENCLAW_PLUGIN_ORIGINS.join(", ")}`);
  }
  if (governance.externalRuntimeDependencyAllowed !== false) {
    addIssue("governance.externalRuntimeDependencyAllowed", "must be false");
  }
  for (const field of [
    "sourceContentImported",
    "canCreateTasks",
    "canCreateApprovals",
    "canExecuteDuringRegistration",
    "requiresHumanReviewBeforeActivation",
  ]) {
    if (typeof governance[field] !== "boolean") {
      addIssue(`governance.${field}`, "must be boolean");
    }
  }
  if (governance.canExecuteDuringRegistration === true) {
    addIssue("governance.canExecuteDuringRegistration", "registration must never execute plugin code");
  }
}

function validateCapabilityContract(capability, path, addIssue) {
  if (!isPlainObject(capability)) {
    addIssue(path, "must be an object");
    return;
  }
  for (const field of ["id", "title", "description"]) {
    if (!nonEmptyString(capability[field])) {
      addIssue(`${path}.${field}`, "must be a non-empty string");
    }
  }
  if (!OPENCLAW_CAPABILITY_KINDS.includes(capability.kind)) {
    addIssue(`${path}.kind`, `must be one of ${OPENCLAW_CAPABILITY_KINDS.join(", ")}`);
  }
  if (!Array.isArray(capability.domains) || capability.domains.length === 0) {
    addIssue(`${path}.domains`, "must include at least one policy domain");
  } else {
    capability.domains.forEach((domain, index) => {
      if (!OPENCLAW_POLICY_DOMAINS.includes(domain)) {
        addIssue(`${path}.domains[${index}]`, `must be one of ${OPENCLAW_POLICY_DOMAINS.join(", ")}`);
      }
    });
  }
  if (!OPENCLAW_RISKS.includes(capability.risk)) {
    addIssue(`${path}.risk`, `must be one of ${OPENCLAW_RISKS.join(", ")}`);
  }
  if (capability.runtimeOwner !== OPENCLAW_NATIVE_RUNTIME_OWNER) {
    addIssue(`${path}.runtimeOwner`, "must stay owned by OpenClawOnNixOS");
  }

  validatePermissions(capability.permissions, `${path}.permissions`, addIssue);
  validateApproval(capability, path, addIssue);
  validateAudit(capability.audit, `${path}.audit`, addIssue);
}

function validatePermissions(permissions, path, addIssue) {
  if (!isPlainObject(permissions)) {
    addIssue(path, "must be an object");
    return;
  }
  for (const key of OPENCLAW_PERMISSION_KEYS) {
    if (typeof permissions[key] !== "boolean") {
      addIssue(`${path}.${key}`, "must be boolean");
    }
  }
}

function validateApproval(capability, path, addIssue) {
  if (!isPlainObject(capability.approval)) {
    addIssue(`${path}.approval`, "must be an object");
    return;
  }
  if (typeof capability.approval.required !== "boolean") {
    addIssue(`${path}.approval.required`, "must be boolean");
  }
  if (!nonEmptyString(capability.approval.reason)) {
    addIssue(`${path}.approval.reason`, "must be a non-empty string");
  }

  const requiresApproval =
    capability.risk === "high"
    || capability.risk === "critical"
    || capability.domains?.includes("cross_boundary")
    || hasMutationPermission(capability.permissions)
    || capability.permissions?.commandExecution === true;

  if (requiresApproval && capability.approval.required !== true) {
    addIssue(`${path}.approval.required`, "must be true for high-risk, cross-boundary, mutating, or command-executing capabilities");
  }
}

function validateAudit(audit, path, addIssue) {
  if (!isPlainObject(audit)) {
    addIssue(path, "must be an object");
    return;
  }
  if (audit.required !== true) {
    addIssue(`${path}.required`, "must be true for native plugin capabilities");
  }
  if (!OPENCLAW_AUDIT_LEDGERS.includes(audit.ledger)) {
    addIssue(`${path}.ledger`, `must be one of ${OPENCLAW_AUDIT_LEDGERS.join(", ")}`);
  }
}

function hasMutationPermission(permissions) {
  return Boolean(
    permissions?.filesystemWrite
    || permissions?.browserControl
    || permissions?.screenControl
    || permissions?.systemMutation,
  );
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
