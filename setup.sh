#!/usr/bin/env bash
# Setup script for Kleinanzeiger (TypeScript)

echo "🚀 Setting up Kleinanzeiger (TypeScript)..."

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js not found. Please install Node.js 18 or higher."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

node_version=$(node --version | sed 's/v//')
required_version="18.0.0"

if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Error: Node.js 18 or higher required. Found: $node_version"
    echo "Download from: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js version OK: $node_version"

# Check npm version
echo "Checking npm version..."
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm not found. Please install Node.js which includes npm."
    exit 1
fi

npm_version=$(npm --version)
echo "✅ npm version: $npm_version"

# Install dependencies
echo "Installing npm dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: npm install failed"
    exit 1
fi
echo "✅ Dependencies installed"

# Build TypeScript project
echo "Building TypeScript project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed"
    exit 1
fi
echo "✅ TypeScript build complete"

# Create necessary directories
echo "Creating directories..."
mkdir -p logs/screenshots
mkdir -p products
echo "✅ Directories created"

# Copy .env.example to .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your API keys:"
    echo "   - GEMINI_API_KEY (for Gemini vision)"
    echo "   - ANTHROPIC_API_KEY (for Claude vision, optional)"
    echo "   - OPENAI_API_KEY (for OpenAI vision, optional)"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your API key(s) (at minimum GEMINI_API_KEY)"
echo "2. Start Brave with: brave --remote-debugging-port=9222"
echo "   (On macOS: /Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser --remote-debugging-port=9222)"
echo "3. Login to kleinanzeigen.de in the browser"
echo "4. Run: npm start -- --image-folder ./products/example --postal-code 10115"
echo ""
echo "Available commands:"
echo "  npm start          - Run the application"
echo "  npm test           - Run tests"
echo "  npm run build      - Build TypeScript"
echo ""
