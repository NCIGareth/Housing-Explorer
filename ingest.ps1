param (
    [int]$Since = 2018,
    [switch]$Truncate = $false
)

# 1. Safety Check for Nominatim
Write-Host "Checking local Nominatim status..." -ForegroundColor Cyan
$nominatim = docker ps --filter "name=nominatim" --format "{{.Status}}"
if (-not $nominatim) {
    Write-Error "Local Nominatim container is not running! Please run 'docker-compose up -d' first."
    exit 1
}
Write-Host "Nominatim is $nominatim. Proceeding..." -ForegroundColor Green

# 2. Environment Setup
Write-Host "Setting SSL bypass for government site..." -ForegroundColor Cyan
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

# 3. Optional: Truncate
if ($Truncate) {
    Write-Host "Wiping existing PropertySale data on Supabase..." -ForegroundColor Yellow
    pnpm db:truncate:ppr
}

# 4. Run Ingestion
Write-Host "Starting ingestion for records since $Since..." -ForegroundColor Cyan
pnpm ingest:ppr --since $Since

Write-Host "Process complete!" -ForegroundColor Green
