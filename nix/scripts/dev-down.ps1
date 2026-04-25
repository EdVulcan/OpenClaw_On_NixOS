$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$stateFile = Join-Path $repoRoot ".artifacts\dev-services.json"

if (-not (Test-Path $stateFile)) {
  Write-Host "No dev state file found at $stateFile"
  exit 0
}

$services = Get-Content $stateFile | ConvertFrom-Json

foreach ($service in $services) {
  try {
    $process = Get-Process -Id $service.pid -ErrorAction Stop
    Stop-Process -Id $process.Id -Force
    Write-Host "Stopped $($service.name) (PID $($service.pid))"
  } catch {
    Write-Host "Process already gone for $($service.name) (PID $($service.pid))"
  }
}

Remove-Item $stateFile -Force
Write-Host "Dev services stopped."
