#!/usr/bin/env pwsh
# Start Brave Browser with Remote Debugging for Kleinanzeiger Automation
# Usage: .\start-brave-windows.ps1

Write-Host "🚀 Starting Brave Browser for Kleinanzeiger Automation..." -ForegroundColor Green

# Close existing Brave instances
Write-Host "Closing existing Brave instances..." -ForegroundColor Yellow
Stop-Process -Name "brave" -Force -ErrorAction SilentlyContinue

# Wait for processes to terminate
Start-Sleep -Seconds 2

# Define Brave executable path
$bravePath = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"

# Check if Brave exists
if (-not (Test-Path $bravePath)) {
    Write-Host "❌ ERROR: Brave Browser not found at: $bravePath" -ForegroundColor Red
    Write-Host "Please install Brave Browser or update the path in this script." -ForegroundColor Red
    exit 1
}

# Start Brave with remote debugging
Write-Host "Starting Brave with remote debugging on port 9222..." -ForegroundColor Green
Start-Process $bravePath -ArgumentList "--remote-debugging-port=9222"

# Wait for browser to start
Write-Host "Waiting for browser to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Test connection
Write-Host "Testing connection to Chrome DevTools Protocol..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:9222/json/version" -UseBasicParsing -TimeoutSec 5
    $versionInfo = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ SUCCESS: Browser connected!" -ForegroundColor Green
    Write-Host "Browser: $($versionInfo.'Browser')" -ForegroundColor Cyan
    Write-Host "WebSocket: $($versionInfo.'webSocketDebuggerUrl')" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✨ You can now run your automation script!" -ForegroundColor Green
    Write-Host "Example: python -m src.main --image-folder ./products/mein-produkt --postal-code 10115" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  WARNING: Could not connect to browser on port 9222" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check if port 9222 is in use: Get-NetTCPConnection -LocalPort 9222" -ForegroundColor Gray
    Write-Host "2. Check firewall settings" -ForegroundColor Gray
    Write-Host "3. Try manually: Start-Process '$bravePath' -ArgumentList '--remote-debugging-port=9222'" -ForegroundColor Gray
}
