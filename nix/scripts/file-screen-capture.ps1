$snapshotPath = $env:OPENCLAW_CAPTURE_SNAPSHOT_PATH
$snapshotTextFile = $env:OPENCLAW_CAPTURE_SNAPSHOT_TEXT_FILE
$ocrTextFile = $env:OPENCLAW_CAPTURE_OCR_TEXT_FILE
$windowTitle = if ($env:OPENCLAW_CAPTURE_WINDOW_TITLE) { $env:OPENCLAW_CAPTURE_WINDOW_TITLE } else { "External File Capture" }
$windowPid = if ($env:OPENCLAW_CAPTURE_WINDOW_PID) { [int]$env:OPENCLAW_CAPTURE_WINDOW_PID } else { 4242 }

$snapshotText = if ($snapshotTextFile -and (Test-Path $snapshotTextFile)) {
  Get-Content -Raw -Path $snapshotTextFile
} else {
  "OpenClaw file capture adapter`nNo snapshot text file configured."
}

$ocrLines = if ($ocrTextFile -and (Test-Path $ocrTextFile)) {
  Get-Content -Path $ocrTextFile | Where-Object { $_.Trim().Length -gt 0 }
} else {
  @("No OCR text file configured.")
}

$payload = [pscustomobject]@{
  source = "command-file"
  snapshotPath = if ($snapshotPath) { $snapshotPath } else { $snapshotTextFile }
  snapshotText = $snapshotText
  focusedWindow = [pscustomobject]@{
    title = $windowTitle
    pid = $windowPid
  }
  windowList = @(
    [pscustomobject]@{
      title = $windowTitle
      pid = $windowPid
    },
    [pscustomobject]@{
      title = "Observer UI"
      pid = 4170
    }
  )
  ocrBlocks = @(
    foreach ($line in $ocrLines) {
      [pscustomobject]@{
        text = $line
        confidence = 0.9
      }
    }
  )
}

$payload | ConvertTo-Json -Depth 6
