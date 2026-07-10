export const BROWSER_TASK_ACTION_DESCRIPTORS = Object.freeze([
  { kind: "keyboard.type", endpoint: "/act/keyboard/type", capabilityId: "act.screen.pointer_keyboard" },
  { kind: "keyboard.hotkey", endpoint: "/act/keyboard/hotkey", capabilityId: "act.screen.pointer_keyboard" },
  { kind: "mouse.click", endpoint: "/act/mouse/click", capabilityId: "act.screen.pointer_keyboard" },
  { kind: "browser.new_tab", endpoint: "/act/browser/new-tab", capabilityId: "act.browser.open" },
]);

const descriptorByKind = new Map(BROWSER_TASK_ACTION_DESCRIPTORS.map((descriptor) => [descriptor.kind, descriptor]));

export function screenActEndpointForBrowserTaskAction(kind) {
  return descriptorByKind.get(kind)?.endpoint ?? "/act/mouse/click";
}

export function capabilityIdForBrowserTaskAction(kind) {
  return descriptorByKind.get(kind)?.capabilityId ?? null;
}

export function observedBrowserTaskUrl({ workViewSummary, workView, snapshotText } = {}) {
  return workViewSummary?.url
    ?? workView?.activeUrl
    ?? snapshotText?.match(/^URL: (.+)$/m)?.[1]
    ?? null;
}
