import { createHash } from "node:crypto";

import {
  createOpenClawNativePluginRegistry,
  validateOpenClawNativePluginRegistry,
} from "./plugin-registry.mjs";

export const OPENCLAW_NATIVE_PLUGIN_GENERATION_STORE_VERSION =
  "openclaw-native-plugin-registry-generation-store-v0";
export const OPENCLAW_NATIVE_PLUGIN_GENERATION_STATE_VERSION =
  "openclaw-native-plugin-registry-generation-state-v0";

function buildGeneration(registry, sequence, activatedAt) {
  const canonical = JSON.stringify({ ...registry, generatedAt: null });
  return Object.freeze({
    id: `native-registry-generation-${sequence}`,
    sequence,
    activatedAt,
    hash: createHash("sha256").update(canonical).digest("hex"),
    registry,
  });
}

function buildGenerationMetadata(generation) {
  return {
    id: generation.id,
    sequence: generation.sequence,
    activatedAt: generation.activatedAt,
    hash: generation.hash,
  };
}

function buildPersistedState(active, previous) {
  return {
    version: OPENCLAW_NATIVE_PLUGIN_GENERATION_STATE_VERSION,
    active: buildGenerationMetadata(active),
    previous: previous ? buildGenerationMetadata(previous) : null,
  };
}

function buildRestoredGeneration(registry, metadata, expectedHash) {
  if (
    !metadata
    || typeof metadata !== "object"
    || !Number.isSafeInteger(metadata.sequence)
    || metadata.sequence < 1
    || metadata.id !== `native-registry-generation-${metadata.sequence}`
    || typeof metadata.activatedAt !== "string"
    || !metadata.activatedAt
    || metadata.hash !== expectedHash
  ) {
    return null;
  }

  return buildGeneration(registry, metadata.sequence, metadata.activatedAt);
}

export function createOpenClawNativePluginRegistryGenerationStore({
  registryFactory = createOpenClawNativePluginRegistry,
  validateRegistry = validateOpenClawNativePluginRegistry,
  now = () => new Date().toISOString(),
  onStateChange = () => {},
} = {}) {
  let sequence = 1;
  const initialRegistry = registryFactory({ generatedAt: now() });
  if (!validateRegistry(initialRegistry).ok) {
    throw new Error("Initial native plugin registry generation is invalid.");
  }

  let active = buildGeneration(initialRegistry, sequence, now());
  let previous = null;

  function exportState() {
    return buildPersistedState(active, previous);
  }

  function notifyStateChange() {
    onStateChange(exportState());
  }

  function restore(persistedState) {
    if (!persistedState || typeof persistedState !== "object") {
      return {
        ok: true,
        restored: false,
        reason: "no_persisted_generation_state",
        active,
        previous,
      };
    }

    const reset = (reason) => {
      sequence = 1;
      active = buildGeneration(initialRegistry, sequence, now());
      previous = null;
      notifyStateChange();
      return {
        ok: false,
        restored: false,
        reason,
        active,
        previous,
      };
    };

    if (persistedState.version !== OPENCLAW_NATIVE_PLUGIN_GENERATION_STATE_VERSION) {
      return reset("unsupported_persisted_generation_state");
    }

    const expectedHash = active.hash;
    const restoredActive = buildRestoredGeneration(initialRegistry, persistedState.active, expectedHash);
    if (!restoredActive) {
      return reset("invalid_persisted_active_generation");
    }

    const restoredPrevious = buildRestoredGeneration(initialRegistry, persistedState.previous, expectedHash);
    sequence = restoredActive.sequence;
    active = restoredActive;
    previous = restoredPrevious && restoredPrevious.sequence === restoredActive.sequence - 1
      ? restoredPrevious
      : null;
    notifyStateChange();

    return {
      ok: true,
      restored: true,
      reason: previous ? "restored_active_and_previous_generation" : "restored_active_generation",
      active,
      previous,
    };
  }

  function refresh() {
    const candidateRegistry = registryFactory({ generatedAt: now() });
    const validation = validateRegistry(candidateRegistry);
    if (!validation.ok) {
      return { ok: false, swapped: false, active, previous, validation };
    }

    sequence += 1;
    const candidate = buildGeneration(candidateRegistry, sequence, now());
    previous = active;
    active = candidate;
    notifyStateChange();
    return { ok: true, swapped: true, active, previous, validation };
  }

  return {
    getActiveGeneration: () => active,
    describe: () => ({
      store: OPENCLAW_NATIVE_PLUGIN_GENERATION_STORE_VERSION,
      active,
      previous,
      retainedGenerations: previous ? 2 : 1,
      persistence: "core_state",
    }),
    exportState,
    restore,
    refresh,
  };
}
