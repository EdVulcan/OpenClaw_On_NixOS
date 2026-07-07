export function createDebouncedPersist<T>(
  stateFilePath: string,
  buildPayload: () => T,
  debounceMs?: number
): () => void;
