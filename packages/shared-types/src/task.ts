export type TaskStatus = "queued" | "running" | "completed" | "failed" | "paused";

export type Task = {
  id: string;
  type: string;
  goal: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

