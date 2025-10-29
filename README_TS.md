# Kleinanzeiger (TypeScript Version)

Automated Classified Ad Generator for kleinanzeigen.de using AI vision analysis and browser automation.

**This is the TypeScript/Node.js version.** The Python version has been completely replaced.

## Features

- 🤖 **AI Vision Analysis**: Automatically analyzes product images using Google Gemini Vision API
- 🇩🇪 **German Content Generation**: Generates titles, descriptions, and features in German
- 🌐 **Browser Automation**: Automates ad posting with Playwright
- 📸 **Image Upload**: Automatically uploads product photos
- ⚙️ **Configurable**: YAML-based configuration with environment variables
- 🔒 **Type-Safe**: Full TypeScript with Zod schema validation

## Prerequisites

- Node.js >= 18.0.0
- npm
- Brave Browser (or Chrome/Chromium)
- Google Gemini API key

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

1. **Create `.env` file** with your API keys:
```env
GEMINI_API_KEY=your-api-key-here
```

2. **Configure `config/settings.yaml`**:
```yaml
vision:
  backend: gemini
  gemini:
    api_key: ${GEMINI_API_KEY}
    model: gemini-1.5-flash

browser:
  cdp_url: http://127.0.0.1:9222
  timeout: 30000

kleinanzeigen:
  base_url: https://www.kleinanzeigen.de
  draft_mode: true

logging:
  level: INFO
  log_dir: logs
  screenshot_dir: logs/screenshots
```

## Usage

### 1. Start Browser with Remote Debugging

```bash
# macOS/Linux
brave --remote-debugging-port=9222

# Windows
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222
```

### 2. Login to kleinanzeigen.de

Open the browser and manually log in to kleinanzeigen.de.

### 3. Run the Tool

```bash
# Development mode (with tsx)
npm run dev -- --image-folder ./tests/products --postal-code 48429

# Or use the built version
npm start -- --image-folder ./tests/products --postal-code 48429

# With auto-confirm (no manual confirmation)
npm start -- --image-folder ./tests/products --postal-code 48429 --auto-confirm

# Override price
npm start -- --image-folder ./tests/products --postal-code 48429 --price 25.00
```

### Command-Line Options

- `--image-folder <path>` - Path to folder containing product images (required)
- `--postal-code <code>` - 5-digit postal code for ad location (required)
- `--price <amount>` - Override suggested price in EUR (optional)
- `--category <category>` - Override category detection (optional)
- `--draft` - Save as draft instead of publishing (default: true)
- `--auto-confirm` - Skip confirmation prompt before saving draft

## Development

```bash
# Run in development mode with auto-reload
npm run dev -- --image-folder ./tests/products --postal-code 48429

# Build TypeScript
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Clean build artifacts
npm clean
```

## Project Structure

```
├── src/
│   ├── automation/
│   │   ├── actions.ts          # Human-like UI interactions
│   │   ├── browser.ts          # Browser controller
│   │   └── kleinanzeigen.ts    # Kleinanzeigen.de automation
│   ├── content/
│   │   └── generator.ts        # Ad content generator
│   ├── vision/
│   │   ├── base.ts             # Base analyzer interface
│   │   ├── geminiAnalyzer.ts   # Gemini Vision implementation
│   │   └── models.ts           # Type definitions
│   ├── utils/
│   │   └── logger.ts           # Logging utility
│   └── main.ts                 # CLI application
├── tests/                      # Test files
├── config/
│   └── settings.yaml           # Configuration
├── package.json
├── tsconfig.json
└── jest.config.js
```

## How It Works

1. **Image Analysis**: Gemini Vision API analyzes all product images together to:
   - Generate a German product title
   - Create a detailed description
   - Detect condition, brand, color
   - Extract key features
   - Suggest a price

2. **Content Generation**: Formats the vision output into a cohesive ad description

3. **Browser Automation**: Uses Playwright to:
   - Navigate to kleinanzeigen.de
   - Fill out the ad form (title, condition, shipping, price, description)
   - Upload images
   - Save as draft (with optional auto-confirm)

4. **Category Detection**: kleinanzeigen.de automatically detects the category from the German title

## Workflow

```
Images → Gemini Vision API → German Content
                                    ↓
                            Ad Description
                                    ↓
                          Browser Automation
                                    ↓
                        kleinanzeigen.de Draft
```

## Troubleshooting

### "Error: GEMINI_API_KEY not set"
Make sure you have created a `.env` file with your Gemini API key.

### "Failed to connect to browser"
Ensure Brave/Chrome is running with `--remote-debugging-port=9222`.

### "User is not logged in"
Manually log in to kleinanzeigen.de in the browser before running the tool.

### TypeScript Errors
Run `npm run build` to check for type errors. Fix any TypeScript compilation errors before running.

## Migration from Python

The Python version has been completely replaced with this TypeScript implementation. Key changes:

- **Runtime**: Python → Node.js/TypeScript
- **Type Safety**: Added Zod schemas and full TypeScript types
- **Package Manager**: pip → npm
- **Build System**: None → TypeScript compiler (tsc)
- **Module System**: Python imports → ES modules
- **Testing**: pytest → Jest
- **CLI**: argparse → Commander.js
- **Logging**: Python logging → Winston

All functionality has been preserved and improved with better type safety and modern JavaScript/TypeScript patterns.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
