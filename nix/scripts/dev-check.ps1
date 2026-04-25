$ErrorActionPreference = "Stop"

$services = @(
  @{ name = "openclaw-event-hub"; healthUrl = "http://127.0.0.1:4101/health" },
  @{ name = "openclaw-core"; healthUrl = "http://127.0.0.1:4100/health" },
  @{ name = "openclaw-session-manager"; healthUrl = "http://127.0.0.1:4102/health" },
  @{ name = "openclaw-browser-runtime"; healthUrl = "http://127.0.0.1:4103/health" },
  @{ name = "openclaw-screen-sense"; healthUrl = "http://127.0.0.1:4104/health" },
  @{ name = "openclaw-screen-act"; healthUrl = "http://127.0.0.1:4105/health" },
  @{ name = "openclaw-system-sense"; healthUrl = "http://127.0.0.1:4106/health" },
  @{ name = "openclaw-system-heal"; healthUrl = "http://127.0.0.1:4107/health" },
  @{ name = "observer-ui"; healthUrl = "http://127.0.0.1:4170/health" }
)

$results = foreach ($service in $services) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing $service.healthUrl -TimeoutSec 3
    [pscustomobject]@{
      name = $service.name
      ok = $true
      status = $response.StatusCode
      url = $service.healthUrl
    }
  } catch {
    [pscustomobject]@{
      name = $service.name
      ok = $false
      status = "offline"
      url = $service.healthUrl
    }
  }
}

$results | Format-Table -AutoSize

if ($results.ok -contains $false) {
  exit 1
}

Write-Host ""
Write-Host "Optional business flow check:" -ForegroundColor Cyan
Write-Host "  1. POST http://127.0.0.1:4103/browser/open"
Write-Host "  2. GET  http://127.0.0.1:4104/screen/current"
Write-Host "  3. POST http://127.0.0.1:4105/act/mouse/click"
Write-Host "Expected: screen.readiness=ready and action.degraded=false once session/browser state settles." -ForegroundColor DarkGray
