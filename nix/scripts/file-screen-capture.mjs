import fs from "node:fs";

const snapshotPath = process.env.OPENCLAW_CAPTURE_SNAPSHOT_PATH ?? null;
const snapshotTextFile = process.env.OPENCLAW_CAPTURE_SNAPSHOT_TEXT_FILE ?? "";
const ocrTextFile = process.env.OPENCLAW_CAPTURE_OCR_TEXT_FILE ?? "";
const windowTitle = process.env.OPENCLAW_CAPTURE_WINDOW_TITLE ?? "External File Capture";
const windowPid = Number.parseInt(process.env.OPENCLAW_CAPTURE_WINDOW_PID ?? "4242", 10);

function readOptionalFile(path, fallback) {
  if (!path || !fs.existsSync(path)) {
    return fallback;
  }

  return fs.readFileSync(path, "utf8");
}

const snapshotText = readOptionalFile(
  snapshotTextFile,
  "OpenClaw file capture adapter\nNo snapshot text file configured.",
);

const ocrLines = readOptionalFile(ocrTextFile, "No OCR text file configured.")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const payload = {
  source: "command-file",
  snapshotPath: snapshotPath ?? snapshotTextFile ?? null,
  snapshotText,
  focusedWindow: {
    title: windowTitle,
    pid: Number.isFinite(windowPid) ? windowPid : 4242,
  },
  windowList: [
    {
      title: windowTitle,
      pid: Number.isFinite(windowPid) ? windowPid : 4242,
    },
    {
      title: "Observer UI",
      pid: 4170,
    },
  ],
  ocrBlocks: ocrLines.map((text) => ({
    text,
    confidence: 0.9,
  })),
};

process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
