export type OpenClawRisk = "low" | "medium" | "high" | "critical";

export type OpenClawPolicyDomain = "body_internal" | "user_task" | "cross_boundary";

export type OpenClawCapabilityKind =
  | "sense"
  | "plan"
  | "act"
  | "observe"
  | "heal";

export type OpenClawRuntimeOwner = "openclaw_on_nixos";

export type OpenClawPluginOrigin =
  | "native"
  | "absorbed_external"
  | "generated_fixture";

export type OpenClawCapabilityPermissions = {
  filesystemRead: boolean;
  filesystemWrite: boolean;
  commandExecution: boolean;
  networkAccess: boolean;
  browserControl: boolean;
  screenControl: boolean;
  systemMutation: boolean;
};

export type OpenClawApprovalPolicy = {
  required: boolean;
  reason: string;
};

export type OpenClawCapabilityContract = {
  id: string;
  title: string;
  description: string;
  kind: OpenClawCapabilityKind;
  domains: OpenClawPolicyDomain[];
  risk: OpenClawRisk;
  runtimeOwner: OpenClawRuntimeOwner;
  permissions: OpenClawCapabilityPermissions;
  approval: OpenClawApprovalPolicy;
  audit: {
    required: boolean;
    ledger: "event_audit" | "capability_history" | "filesystem_ledger" | "command_transcript_ledger";
  };
};

export type OpenClawPluginGovernance = {
  runtimeOwner: OpenClawRuntimeOwner;
  origin: OpenClawPluginOrigin;
  externalRuntimeDependencyAllowed: false;
  sourceContentImported: boolean;
  canCreateTasks: boolean;
  canCreateApprovals: boolean;
  canExecuteDuringRegistration: boolean;
  requiresHumanReviewBeforeActivation: boolean;
};

export type OpenClawNativePluginContract = {
  contractVersion: "openclaw-native-plugin-contract-v0";
  plugin: {
    id: string;
    name: string;
    version: string;
    summary: string;
  };
  governance: OpenClawPluginGovernance;
  capabilities: OpenClawCapabilityContract[];
};

export type OpenClawPluginContractValidationIssue = {
  path: string;
  message: string;
};

export type OpenClawPluginContractValidationResult = {
  ok: boolean;
  issues: OpenClawPluginContractValidationIssue[];
};
