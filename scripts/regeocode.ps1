# scripts/regeocode.ps1
# Launch the detached re-geocode job on the server and walk away.
#
# Usage:
#   .\scripts\regeocode.ps1          # start job detached (idempotent)
#   .\scripts\regeocode.ps1 -logs    # follow job logs
#   .\scripts\regeocode.ps1 -stop    # stop and remove job container

param(
  [switch]$Logs,
  [switch]$Stop
)

$Remote = "oracle"
$Compose = "docker compose -f docker-compose.prod.yml --profile jobs"
$Name = "housing-regeocode"

if ($Logs) {
  ssh $Remote "docker logs -f $Name 2>&1"
  exit
}

if ($Stop) {
  ssh $Remote "docker rm -f $Name 2>/dev/null; echo stopped"
  exit
}

Write-Host "Starting re-geocode job (detached)..." -ForegroundColor Cyan
ssh $Remote "docker rm -f $Name 2>/dev/null; cd ~/housing && $Compose run -d --name $Name ingest pnpm --filter @housing/ingestion ppr:regeocode 2>&1"

Start-Sleep -Seconds 5
$Status = ssh $Remote "docker ps --filter name=$Name --format '{{.Names}} {{.Status}}'"
if ($Status) {
  Write-Host "Running: $Status" -ForegroundColor Green
} else {
  Write-Host "Container not visible yet - check with '.\scripts\regeocode.ps1 -logs'" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Monitor: .\scripts\regeocode.ps1 -logs"
Write-Host "Stop:    .\scripts\regeocode.ps1 -stop"
