import { eventNames, type EventName } from "./event-names.js";

export function createEventName(type: EventName): EventName {
  if (!isEventName(type)) {
    throw new Error(`Unknown OpenClaw event name: ${String(type)}`);
  }
  return type;
}

export function isEventName(value: string): value is EventName {
  return (eventNames as readonly string[]).includes(value);
}
