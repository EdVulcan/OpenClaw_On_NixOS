export type Alert = {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
};

export type SystemHealth = {
  timestamp: string;
  alerts: Alert[];
};

