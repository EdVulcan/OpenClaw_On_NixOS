import { eventNames } from "./event-names.mjs";

export function createEventName(type) {
  if (!isEventName(type)) {
    throw new Error(`Unknown OpenClaw event name: ${String(type)}`);
  }
  return type;
}

export function isEventName(value) {
  return eventNames.includes(value);
}
