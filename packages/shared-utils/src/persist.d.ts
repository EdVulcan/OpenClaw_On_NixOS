type DebouncedPersist = (() => void) & {
  flush: () => void;
};

export function createDebouncedPersist<T>(
  stateFilePath: string,
  buildPayload: () => T,
  debounceMs?: number
): DebouncedPersist;
