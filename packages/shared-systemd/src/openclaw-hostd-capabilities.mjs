import descriptor from "./openclaw-hostd-capabilities.json" with { type: "json" };

export const HOSTD_RESTART_CAPABILITY_REGISTRY = descriptor.registry;
export const HOSTD_RESTART_CAPABILITIES = Object.freeze(
  descriptor.capabilities.map((capability) => Object.freeze({ ...capability })),
);

export function findHostdRestartCapability({ operation = null, targetUnit = null } = {}) {
  return HOSTD_RESTART_CAPABILITIES.find((capability) => (
    (operation === null || capability.operation === operation)
    && (targetUnit === null || capability.targetUnit === targetUnit)
  )) ?? null;
}

export function hostdRestartCapabilityForTarget(targetUnit) {
  return findHostdRestartCapability({ targetUnit });
}
