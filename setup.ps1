# Setup script for Kleinanzeiger (PowerShell)
# Run with: .\setup.ps1

Write-Host "🚀 Setting up Kleinanzeiger..." -ForegroundColor Cyan

# Check Python version
Write-Host "Checking Python version..." -ForegroundColor Yellow
try {
    $pythonVersion = & python --version 2>&1 | Select-String -Pattern "(\d+\.\d+\.\d+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    $requiredVersion = [version]"3.11.0"
    $currentVersion = [version]$pythonVersion
    
    if ($currentVersion -lt $requiredVersion) {
        Write-Host "❌ Error: Python 3.11 or higher required. Found: $pythonVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Python version OK: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: Python not found. Please install Python 3.11 or higher." -ForegroundColor Red
    exit 1
}

# Create virtual environment
Write-Host "Creating virtual environment..." -ForegroundColor Yellow
python -m venv venv
Write-Host "✅ Virtual environment created" -ForegroundColor Green

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Install Playwright browsers
Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
playwright install chromium

# Create necessary directories
Write-Host "Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "logs\screenshots" | Out-Null
New-Item -ItemType Directory -Force -Path "products" | Out-Null
Write-Host "✅ Directories created" -ForegroundColor Green

# Copy .env.example to .env if not exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please edit .env and add your ANTHROPIC_API_KEY" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env and add your ANTHROPIC_API_KEY"
Write-Host "2. Start Brave with: & 'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe' --remote-debugging-port=9222"
Write-Host "3. Login to kleinanzeigen.de in the browser"
Write-Host "4. Run: python -m src.main --image-folder ./products/example --postal-code 10115"
Write-Host ""
Write-Host "Run '.\venv\Scripts\Activate.ps1' to activate the virtual environment" -ForegroundColor Yellow
