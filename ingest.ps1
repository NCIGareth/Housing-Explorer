param (
    [int]$Since = 2018,
    [switch]$Truncate = $false,
    [switch]$Sync = $false,
    [switch]$EnrichOnly = $false
)

# 1. Safety Check for Nominatim
if (-not $EnrichOnly) {
    Write-Host "Checking local Nominatim status..." -ForegroundColor Cyan
    $nominatim = docker ps --filter "name=nominatim" --format "{{.Status}}"
    if (-not $nominatim) {
        Write-Warning "Local Nominatim container is not running! Real geocoding will be skipped."
        Write-Host "Run 'docker-compose up -d' if you want high-precision geocoding." -ForegroundColor Gray
    } else {
        Write-Host "Nominatim is $nominatim. Proceeding..." -ForegroundColor Green
    }
}

# 2. Optional: Truncate
if ($Truncate) {
    Write-Host "Wiping existing PropertySale data..." -ForegroundColor Yellow
    pnpm db:truncate:ppr
}

# 4. Run Ingestion
if (-not $EnrichOnly) {
    if ($Sync) {
        Write-Host "Starting automated monthly sync..." -ForegroundColor Cyan
        pnpm ingest:sync
    } else {
        Write-Host "Starting ingestion for records since $Since..." -ForegroundColor Cyan
        pnpm ingest:ppr --since $Since
        
        Write-Host "Starting spatial enrichment..." -ForegroundColor Cyan
        pnpm ingest:enrich
    }
} else {
    Write-Host "Running enrichment jobs only..." -ForegroundColor Cyan
    pnpm ingest:enrich
}

Write-Host "`nProcess complete!" -ForegroundColor Green

