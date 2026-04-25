export type AISessionState = {
  sessionId: string;
  status: "starting" | "running" | "failed" | "stopped";
  displayTarget: string;
};

