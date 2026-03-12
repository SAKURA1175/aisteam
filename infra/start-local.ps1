param(
    [switch]$WithApps
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"
$envExamplePath = Join-Path $repoRoot ".env.example"
$composeFile = Join-Path $PSScriptRoot "docker-compose.yml"

if (-not (Test-Path $envPath)) {
    Copy-Item $envExamplePath $envPath
    Write-Host "Created .env from .env.example"
}

docker compose -f $composeFile up -d postgres redis minio minio-init

if ($WithApps) {
    docker compose -f $composeFile up -d main-api ai-orchestrator
}

Write-Host ""
Write-Host "Local infrastructure is starting."
Write-Host "Postgres: localhost:5432"
Write-Host "Redis: localhost:6379"
Write-Host "MinIO: http://localhost:9000"
Write-Host "MinIO Console: http://localhost:9001"
Write-Host ""
Write-Host "Demo accounts become available after main-api finishes startup:"
Write-Host "  admin@tutormarket.ai / Admin123!"
Write-Host "  student@tutormarket.ai / Student123!"
Write-Host ""
Write-Host "Start main-api with:"
Write-Host "  cd services/main-api"
Write-Host "  mvn spring-boot:run"
Write-Host ""
Write-Host "Or start backend containers with:"
Write-Host "  .\\infra\\start-local.ps1 -WithApps"
