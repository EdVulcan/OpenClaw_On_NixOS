export type OpenClawEvent<T = Record<string, unknown>> = {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  payload: T;
};

