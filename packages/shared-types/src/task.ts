export type TaskStatus = "queued" | "running" | "completed" | "failed" | "paused" | "superseded";

export type PolicyDomain = "body_internal" | "user_task" | "cross_boundary";

export type PolicyDecision = "allow" | "audit_only" | "require_approval" | "deny";

export type TaskPolicy = {
  decision: {
    engine: string;
    domain: PolicyDomain;
    risk: "low" | "medium" | "high" | "critical";
    decision: PolicyDecision;
    reason: string;
    approved: boolean;
    auditRequired: boolean;
  };
};

export type Task = {
  id: string;
  type: string;
  goal: string;
  status: TaskStatus;
  policy?: TaskPolicy | null;
  createdAt: string;
  updatedAt: string;
};
