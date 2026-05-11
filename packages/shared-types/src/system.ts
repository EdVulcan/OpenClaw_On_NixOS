export type Alert = {
  id: string;
  level: "info" | "warning" | "error";
  code?: string;
  source?: string;
  message: string;
};

export type BodyState = {
  hostname: string;
  platform: string;
  release: string;
  arch: string;
  uptimeSeconds: number;
  processUptimeSeconds: number;
  pid: number;
  node: string;
  stateDir: string;
  diskPath: string;
};

export type ServiceHealth = {
  name: string;
  ok: boolean;
  status: "healthy" | "unhealthy" | "offline";
  url: string;
  detail: string;
  stage?: string | null;
  latencyMs: number;
  checkedAt: string;
};

export type ResourceHealth = {
  cpuPercent: number;
  cpuCores: number;
  loadAverage: number[];
  memoryPercent: number;
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
  };
  diskPercent: number;
  disk: {
    path: string;
    available: boolean;
  };
};

export type SystemHealth = {
  timestamp: string;
  body: BodyState;
  services: Record<string, ServiceHealth>;
  resources: ResourceHealth;
  network: {
    online: boolean;
    checkedTargets: number;
  };
  alerts: Alert[];
};
