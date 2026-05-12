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

export type HealStep = {
  id: string;
  kind: "restart-service" | "observe-only";
  service: string | null;
  reason: string;
  risk: "low" | "medium" | "high" | "critical";
  mode: "simulated" | "audit_only";
  evidence?: unknown;
  status: "planned";
};

export type HealDiagnosis = {
  id: string;
  at: string;
  engine: "heal-v0";
  status: "healthy" | "repairable" | "attention_required";
  source: {
    timestamp: string | null;
    hostname: string | null;
    alerts: number;
    services: number;
  };
  plan: {
    mode: "simulated";
    stepCount: number;
    steps: HealStep[];
  };
};

export type HealHistoryEntry = {
  id: string;
  action: "restart-service" | "observe-only";
  service: string | null;
  status: "completed" | "skipped";
  mode: "simulated" | "audit_only";
  reason: string;
  risk: "low" | "medium" | "high" | "critical";
  evidence?: unknown;
  startedAt: string;
  completedAt: string;
};
