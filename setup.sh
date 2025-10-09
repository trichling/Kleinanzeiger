#!/usr/bin/env bash
# Setup script for Kleinanzeiger

echo "🚀 Setting up Kleinanzeiger..."

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.11"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then 
    echo "❌ Error: Python 3.11 or higher required. Found: $python_version"
    exit 1
fi
echo "✅ Python version OK: $python_version"

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv
echo "✅ Virtual environment created"

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Install Playwright browsers
echo "Installing Playwright browsers..."
playwright install chromium

# Create necessary directories
echo "Creating directories..."
mkdir -p logs/screenshots
mkdir -p products

# Copy .env.example to .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your ANTHROPIC_API_KEY"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your ANTHROPIC_API_KEY"
echo "2. Start Brave with: brave --remote-debugging-port=9222"
echo "3. Login to kleinanzeigen.de in the browser"
echo "4. Run: python -m src.main --image-folder ./products/example --postal-code 10115"
echo ""
echo "Run 'source venv/bin/activate' to activate the virtual environment"
