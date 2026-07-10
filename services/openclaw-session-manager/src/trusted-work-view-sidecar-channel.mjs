const DEFAULT_MAX_MESSAGE_BYTES = 64 * 1024;

export function encodeSidecarMessage(message, { maxMessageBytes = DEFAULT_MAX_MESSAGE_BYTES } = {}) {
  const encoded = `${JSON.stringify(message)}\n`;
  if (Buffer.byteLength(encoded, "utf8") > maxMessageBytes) {
    throw new Error("Trusted work-view sidecar message exceeds the bounded transport size.");
  }
  return encoded;
}

export function createSidecarMessageDecoder({
  onMessage,
  onError = () => {},
  maxMessageBytes = DEFAULT_MAX_MESSAGE_BYTES,
} = {}) {
  if (typeof onMessage !== "function") {
    throw new Error("Trusted work-view sidecar decoder requires onMessage.");
  }

  let buffered = "";

  function push(chunk) {
    buffered += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    if (Buffer.byteLength(buffered, "utf8") > maxMessageBytes) {
      buffered = "";
      onError(new Error("Trusted work-view sidecar message exceeds the bounded transport size."));
      return;
    }

    let newlineIndex = buffered.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffered.slice(0, newlineIndex);
      buffered = buffered.slice(newlineIndex + 1);
      if (line.trim()) {
        try {
          onMessage(JSON.parse(line));
        } catch (error) {
          onError(error instanceof Error ? error : new Error("Invalid trusted sidecar JSON message."));
        }
      }
      newlineIndex = buffered.indexOf("\n");
    }
  }

  function reset() {
    buffered = "";
  }

  return { push, reset };
}
