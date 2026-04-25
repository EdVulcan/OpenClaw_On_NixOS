export const eventNames = [
  "service.started",
  "task.created",
  "task.started",
  "task.paused",
  "task.completed",
  "task.failed",
  "screen.updated",
  "window.changed",
  "action.started",
  "action.completed",
  "action.failed",
  "browser.started",
  "browser.updated",
  "service.failed",
  "heal.started",
  "heal.completed",
] as const;

export type EventName = (typeof eventNames)[number];
