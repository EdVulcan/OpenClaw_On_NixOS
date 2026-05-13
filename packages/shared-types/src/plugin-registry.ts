import type { OpenClawNativePluginContract } from "./plugin-contract";

export type OpenClawNativePluginRegistryItem = {
  id: string;
  status: "contract_ready" | "blocked";
  contract: OpenClawNativePluginContract;
};

export type OpenClawNativePluginRegistry = {
  registry: "openclaw-native-plugin-registry-v0";
  mode: "native-contract-registry";
  runtimeOwner: "openclaw_on_nixos";
  activationMode: "manual_adapter_required";
  generatedAt: string;
  items: OpenClawNativePluginRegistryItem[];
};

export type OpenClawNativePluginRegistrySummary = {
  registry: "openclaw-native-plugin-registry-v0";
  runtimeOwner: "openclaw_on_nixos";
  activationMode: "manual_adapter_required";
  totalPlugins: number;
  totalCapabilities: number;
  approvalRequired: number;
  mutationCapable: number;
  executionCapable: number;
  validationOk: boolean;
  issueCount: number;
};
