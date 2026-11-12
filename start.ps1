Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   Ioannina Bus - Real-Time Telematics & Favorite Stops     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Set-Location -Path $PSScriptRoot

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/2] Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "[2/2] Starting local Vite development server..." -ForegroundColor Green
Write-Host "Local URL: http://localhost:5174" -ForegroundColor Green
npm run dev

