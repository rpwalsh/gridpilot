Param(
  [switch]$NoNewWindows
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$apiCmd = "cd '$repoRoot'; python -m uvicorn apps.api.src.dispatchlayer_api.main:app --port 8000"
$uiCmd = "cd '$repoRoot\apps\dashboard'; npm run dev"

Write-Host "Starting DispatchLayer API and Dashboard..." -ForegroundColor Cyan

if ($NoNewWindows) {
  Start-Job -Name "dispatchlayer-api" -ScriptBlock { param($cmd) Invoke-Expression $cmd } -ArgumentList $apiCmd | Out-Null
  Start-Job -Name "dispatchlayer-ui" -ScriptBlock { param($cmd) Invoke-Expression $cmd } -ArgumentList $uiCmd | Out-Null
} else {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCmd | Out-Null
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $uiCmd | Out-Null
}

function Wait-HttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSec = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        return $true
      }
    } catch {
      # keep retrying
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

$apiOk = Wait-HttpOk -Url "http://localhost:8000/api/v1/health" -TimeoutSec 90
$uiOk = Wait-HttpOk -Url "http://localhost:3000" -TimeoutSec 120

if ($apiOk -and $uiOk) {
  Write-Host "API healthy: http://localhost:8000/api/v1/health" -ForegroundColor Green
  Write-Host "Dashboard healthy: http://localhost:3000" -ForegroundColor Green
  Write-Host "Stack ready." -ForegroundColor Green
  exit 0
}

if (-not $apiOk) {
  Write-Host "API health check failed: http://localhost:8000/api/v1/health" -ForegroundColor Red
}
if (-not $uiOk) {
  Write-Host "Dashboard health check failed: http://localhost:3000" -ForegroundColor Red
}

exit 1
