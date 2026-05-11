export type TaskStatus = "queued" | "running" | "completed" | "failed" | "paused" | "superseded";

export type Task = {
  id: string;
  type: string;
  goal: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};
