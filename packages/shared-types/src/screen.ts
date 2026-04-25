export type FocusedWindow = {
  title: string;
  pid?: number;
};

export type OCRBlock = {
  text: string;
  confidence?: number;
};

export type ScreenReadiness = "ready" | "warming_up" | "degraded";

export type ScreenState = {
  timestamp: string;
  snapshotPath: string;
  focusedWindow?: FocusedWindow;
  windowList: FocusedWindow[];
  ocrBlocks: OCRBlock[];
  summary: string;
  readiness: ScreenReadiness;
};
