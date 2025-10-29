# Setup script for Kleinanzeiger (PowerShell)
# Run with: .\setup.ps1

Write-Host "🚀 Setting up Kleinanzeiger (TypeScript)..." -ForegroundColor Cyan

# Check Node.js version
Write-Host "Checking Node.js version..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>&1 | Select-String -Pattern "v(\d+\.\d+\.\d+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    $requiredVersion = [version]"18.0.0"
    $currentVersion = [version]$nodeVersion

    if ($currentVersion -lt $requiredVersion) {
        Write-Host "❌ Error: Node.js 18 or higher required. Found: $nodeVersion" -ForegroundColor Red
        Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Node.js version OK: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: Node.js not found. Please install Node.js 18 or higher." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check npm version
Write-Host "Checking npm version..." -ForegroundColor Yellow
try {
    $npmVersion = & npm --version 2>&1
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: npm not found. Please install Node.js which includes npm." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Build TypeScript project
Write-Host "Building TypeScript project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ TypeScript build complete" -ForegroundColor Green

# Create necessary directories
Write-Host "Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "logs\screenshots" | Out-Null
New-Item -ItemType Directory -Force -Path "products" | Out-Null
Write-Host "✅ Directories created" -ForegroundColor Green

# Copy .env.example to .env if not exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please edit .env and add your API keys:" -ForegroundColor Yellow
    Write-Host "   - GEMINI_API_KEY (for Gemini vision)" -ForegroundColor Yellow
    Write-Host "   - ANTHROPIC_API_KEY (for Claude vision, optional)" -ForegroundColor Yellow
    Write-Host "   - OPENAI_API_KEY (for OpenAI vision, optional)" -ForegroundColor Yellow
}
else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env and add your API key(s) (at minimum GEMINI_API_KEY)"
Write-Host "2. Start Brave with: & 'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe' --remote-debugging-port=9222"
Write-Host "3. Login to kleinanzeigen.de in the browser"
Write-Host "4. Run: npm start -- --image-folder ./products/example --postal-code 10115"
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  npm start          - Run the application"
Write-Host "  npm test           - Run tests"
Write-Host "  npm run build      - Build TypeScript"
Write-Host ""
