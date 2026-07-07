import type { EventName } from "./event-names.js";
import type { OpenClawEvent } from "@openclaw/shared-types/events";

export type EventSchema<T = Record<string, unknown>> = Pick<OpenClawEvent<T>, "payload"> & {
  type: EventName;
};
