import type { EventName } from "./event-names.js";

export type EventSchema = {
  type: EventName;
  payload: Record<string, unknown>;
};

