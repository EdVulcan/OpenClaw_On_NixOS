$payload = [pscustomobject]@{
  source = "command"
  snapshotPath = "D:/mock/captures/external-frame.txt"
  snapshotText = @"
OpenClaw external capture adapter
Title: External Work View
URL: https://example.com/external-capture
Note: replace this script with a real screenshot/OCR collector.
"@
  focusedWindow = [pscustomobject]@{
    title = "External Work View"
    pid = 4242
  }
  windowList = @(
    [pscustomobject]@{
      title = "External Work View"
      pid = 4242
    },
    [pscustomobject]@{
      title = "Observer UI"
      pid = 4170
    }
  )
  ocrBlocks = @(
    [pscustomobject]@{
      text = "External Work View"
      confidence = 0.99
    },
    [pscustomobject]@{
      text = "replace this script with a real screenshot collector"
      confidence = 0.88
    }
  )
}

$payload | ConvertTo-Json -Depth 6
