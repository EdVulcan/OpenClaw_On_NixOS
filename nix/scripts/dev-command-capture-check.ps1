$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$artifactDir = Join-Path $repoRoot ".artifacts\command-capture"

if (-not (Test-Path $artifactDir)) {
  New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
}

$snapshotTextFile = Join-Path $artifactDir "snapshot.txt"
$ocrTextFile = Join-Path $artifactDir "ocr.txt"

@"
OpenClaw command capture adapter
Title: Filesystem-backed Work View
URL: https://example.com/file-capture
State: external file capture is active
"@ | Set-Content -Path $snapshotTextFile -Encoding UTF8

@"
Filesystem-backed Work View
https://example.com/file-capture
external file capture is active
"@ | Set-Content -Path $ocrTextFile -Encoding UTF8

$previousMode = $env:OPENCLAW_SCREEN_CAPTURE_MODE
$previousCommand = $env:OPENCLAW_SCREEN_CAPTURE_COMMAND
$previousNodeFile = $env:OPENCLAW_SCREEN_CAPTURE_NODE_FILE
$previousPowerShellFile = $env:OPENCLAW_SCREEN_CAPTURE_POWERSHELL_FILE
$previousWindowTitle = $env:OPENCLAW_CAPTURE_WINDOW_TITLE
$previousWindowPid = $env:OPENCLAW_CAPTURE_WINDOW_PID
$previousSnapshotFile = $env:OPENCLAW_CAPTURE_SNAPSHOT_TEXT_FILE
$previousOcrFile = $env:OPENCLAW_CAPTURE_OCR_TEXT_FILE
$previousSnapshotPath = $env:OPENCLAW_CAPTURE_SNAPSHOT_PATH

try {
  $env:OPENCLAW_SCREEN_CAPTURE_MODE = "command"
  Remove-Item Env:OPENCLAW_SCREEN_CAPTURE_COMMAND -ErrorAction SilentlyContinue
  $env:OPENCLAW_SCREEN_CAPTURE_NODE_FILE = "$repoRoot\\nix\\scripts\\file-screen-capture.mjs"
  Remove-Item Env:OPENCLAW_SCREEN_CAPTURE_POWERSHELL_FILE -ErrorAction SilentlyContinue
  $env:OPENCLAW_CAPTURE_WINDOW_TITLE = "Filesystem-backed Work View"
  $env:OPENCLAW_CAPTURE_WINDOW_PID = "4343"
  $env:OPENCLAW_CAPTURE_SNAPSHOT_TEXT_FILE = $snapshotTextFile
  $env:OPENCLAW_CAPTURE_OCR_TEXT_FILE = $ocrTextFile
  $env:OPENCLAW_CAPTURE_SNAPSHOT_PATH = "D:/mock/captures/file-backed-frame.txt"

  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "dev-down.ps1") | Out-Null
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "dev-up.ps1")

  $provider = Invoke-RestMethod -Uri "http://127.0.0.1:4104/screen/provider"
  $screen = Invoke-RestMethod -Uri "http://127.0.0.1:4104/screen/current"

  if ($provider.provider.mode -ne "command") {
    throw "Expected provider mode 'command', got '$($provider.provider.mode)'."
  }

  if (-not $provider.provider.ready) {
    throw "Expected command capture provider to be ready."
  }

  if ($screen.screen.captureSource -ne "command-file") {
    throw "Expected screen captureSource 'command-file', got '$($screen.screen.captureSource)'."
  }

  if ($screen.screen.focusedWindow.title -ne "Filesystem-backed Work View") {
    throw "Expected focused window title from file capture adapter."
  }

  [pscustomobject]@{
    provider = $provider.provider
    screen = [pscustomobject]@{
      captureSource = $screen.screen.captureSource
      focusedWindow = $screen.screen.focusedWindow
      snapshotText = $screen.screen.snapshotText
      ocrBlocks = $screen.screen.ocrBlocks
    }
  } | ConvertTo-Json -Depth 6
} finally {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "dev-down.ps1") | Out-Null

  $env:OPENCLAW_SCREEN_CAPTURE_MODE = $previousMode
  if ($null -eq $previousCommand) {
    Remove-Item Env:OPENCLAW_SCREEN_CAPTURE_COMMAND -ErrorAction SilentlyContinue
  } else {
    $env:OPENCLAW_SCREEN_CAPTURE_COMMAND = $previousCommand
  }
  if ($null -eq $previousNodeFile) {
    Remove-Item Env:OPENCLAW_SCREEN_CAPTURE_NODE_FILE -ErrorAction SilentlyContinue
  } else {
    $env:OPENCLAW_SCREEN_CAPTURE_NODE_FILE = $previousNodeFile
  }
  if ($null -eq $previousPowerShellFile) {
    Remove-Item Env:OPENCLAW_SCREEN_CAPTURE_POWERSHELL_FILE -ErrorAction SilentlyContinue
  } else {
    $env:OPENCLAW_SCREEN_CAPTURE_POWERSHELL_FILE = $previousPowerShellFile
  }
  $env:OPENCLAW_CAPTURE_WINDOW_TITLE = $previousWindowTitle
  $env:OPENCLAW_CAPTURE_WINDOW_PID = $previousWindowPid
  $env:OPENCLAW_CAPTURE_SNAPSHOT_TEXT_FILE = $previousSnapshotFile
  $env:OPENCLAW_CAPTURE_OCR_TEXT_FILE = $previousOcrFile
  $env:OPENCLAW_CAPTURE_SNAPSHOT_PATH = $previousSnapshotPath
}
