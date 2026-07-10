import test from "node:test";
import assert from "node:assert/strict";

import {
  createSidecarMessageDecoder,
  encodeSidecarMessage,
} from "../src/trusted-work-view-sidecar-channel.mjs";

test("trusted sidecar channel decodes bounded fragmented JSON lines", () => {
  const messages = [];
  const decoder = createSidecarMessageDecoder({ onMessage: (message) => messages.push(message) });
  const first = encodeSidecarMessage({ type: "bind", taskId: "task-1" });
  const second = encodeSidecarMessage({ type: "heartbeat", count: 2 });

  decoder.push(first.slice(0, 8));
  decoder.push(`${first.slice(8)}${second}`);

  assert.deepEqual(messages, [
    { type: "bind", taskId: "task-1" },
    { type: "heartbeat", count: 2 },
  ]);
});

test("trusted sidecar channel rejects oversized and invalid frames", () => {
  const errors = [];
  const decoder = createSidecarMessageDecoder({
    onMessage: () => {},
    onError: (error) => errors.push(error.message),
    maxMessageBytes: 32,
  });

  assert.throws(
    () => encodeSidecarMessage({ value: "x".repeat(64) }, { maxMessageBytes: 32 }),
    /bounded transport size/u,
  );
  decoder.push("{invalid}\n");
  decoder.push("x".repeat(40));
  assert.equal(errors.length, 2);
  assert.match(errors[0], /JSON|Unexpected token/u);
  assert.equal(errors[1], "Trusted work-view sidecar message exceeds the bounded transport size.");
});
