# Migration from Python to TypeScript

The Kleinanzeiger project has been completely rewritten in TypeScript. This document explains the changes and how to get started with the new version.

## Summary of Changes

### Technology Stack

| Component | Python Version | TypeScript Version |
|-----------|---------------|-------------------|
| Runtime | Python 3.8+ | Node.js 18+ |
| Type System | None (optional type hints) | Full TypeScript with Zod |
| Package Manager | pip/requirements.txt | npm/package.json |
| Build System | None | TypeScript Compiler (tsc) |
| Module System | Python imports | ES Modules |
| Testing | pytest | Jest |
| CLI Framework | argparse | Commander.js |
| Logging | Python logging module | Winston |
| Browser Automation | Playwright (Python) | Playwright (TypeScript) |
| Vision API | Google Gemini | Google Gemini |

### Project Structure

```
Old (Python):                New (TypeScript):
src/                        src/
├── vision/                 ├── vision/
│   ├── __init__.py        │   ├── models.ts
│   ├── models.py          │   ├── base.ts
│   ├── base.py            │   └── geminiAnalyzer.ts
│   ├── analyzer.py        ├── content/
│   └── gemini_analyzer.py │   └── generator.ts
├── content/               ├── automation/
│   ├── __init__.py       │   ├── browser.ts
│   ├── generator.py       │   ├── actions.ts
│   └── categories.py      │   └── kleinanzeigen.ts
├── automation/            ├── utils/
│   ├── __init__.py       │   └── logger.ts
│   ├── browser.py         └── main.ts
│   ├── actions.py        tests/
│   └── kleinanzeigen.py   └── *.test.ts
└── main.py               dist/  (build output)
tests/
└── *.py
```

## What's New

### Type Safety
- **Zod Schemas**: Runtime validation and type inference
- **Full TypeScript**: Compile-time type checking
- **IntelliSense**: Better IDE support with autocomplete

### Modern JavaScript/TypeScript
- **ES Modules**: Modern import/export syntax
- **Async/Await**: Native promise handling
- **Arrow Functions**: Concise syntax
- **Template Literals**: Better string formatting

### Simplified Architecture
- Removed complex category mapping (kleinanzeigen.de auto-detects from title)
- Simplified content generation (Gemini outputs German directly)
- Streamlined configuration loading

## Getting Started

### Prerequisites

```bash
# Install Node.js (if not already installed)
# macOS:
brew install node

# Or download from: https://nodejs.org/
```

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

The `.env` and `config/settings.yaml` files remain the same format:

**.env:**
```env
GEMINI_API_KEY=your-api-key-here
```

**config/settings.yaml:** (unchanged)

### Running the Tool

**Old (Python):**
```bash
python -m src.main --image-folder ./products/laptop --postal-code 10115
```

**New (TypeScript):**
```bash
# Development mode
npm run dev -- --image-folder ./products/laptop --postal-code 10115

# Production mode
npm start -- --image-folder ./products/laptop --postal-code 10115

# Or use the compiled binary
node dist/main.js --image-folder ./products/laptop --postal-code 10115
```

### Running Tests

**Old (Python):**
```bash
pytest tests/
```

**New (TypeScript):**
```bash
npm test

# Watch mode
npm run test:watch
```

## API Changes

### Module Imports

**Python:**
```python
from src.automation.browser import BrowserController
from src.automation.kleinanzeigen import KleinanzeigenAutomator
from src.vision.models import BrowserConfig, AdContent
```

**TypeScript:**
```typescript
import { BrowserController } from './automation/browser.js';
import { KleinanzeigenAutomator } from './automation/kleinanzeigen.js';
import { BrowserConfig, AdContent } from './vision/models.js';
```

### Type Definitions

**Python (optional type hints):**
```python
def create_ad(
    ad_content: AdContent,
    image_paths: List[Path],
    save_as_draft: bool = True
) -> None:
    pass
```

**TypeScript (enforced types):**
```typescript
async createAd(
  adContent: AdContent,
  imagePaths: string[],
  saveAsDraft: boolean = true
): Promise<void> {
  // ...
}
```

### Configuration Loading

**Python:**
```python
config = yaml.safe_load(open('config/settings.yaml'))
```

**TypeScript:**
```typescript
import YAML from 'yaml';
import fs from 'fs';

const config = YAML.parse(fs.readFileSync('config/settings.yaml', 'utf8'));
```

## Breaking Changes

### 1. File Paths
- **Python**: Used `pathlib.Path` objects
- **TypeScript**: Uses `string` paths (Node.js convention)

### 2. Async/Await
- **Python**: `asyncio.run(main())`
- **TypeScript**: Top-level `await` or `.then()/.catch()`

### 3. Module Names
- **Python**: Snake_case (e.g., `gemini_analyzer.py`)
- **TypeScript**: CamelCase (e.g., `geminiAnalyzer.ts`)

### 4. Property Names
- **Python**: Snake_case (e.g., `suggested_price`)
- **TypeScript**: CamelCase (e.g., `suggestedPrice`)

### 5. Error Handling
- **Python**: `try/except`
- **TypeScript**: `try/catch`

## Removed Features

The following Python-specific features were removed:

1. **Category Mapper**: Removed as kleinanzeigen.de auto-detects categories
2. **Multiple Vision Backends**: Simplified to Gemini only (others can be added later)
3. **HEIC Conversion**: HEIC files are now simply excluded (not converted)

## Development Workflow

### Python Version
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run
python -m src.main --help
```

### TypeScript Version
```bash
# Install dependencies (one-time)
npm install

# Development mode (auto-reload)
npm run dev -- --help

# Build for production
npm run build

# Run production build
npm start -- --help
```

## Troubleshooting

### "Module not found"
Make sure you've built the project:
```bash
npm run build
```

### TypeScript compilation errors
Check your Node.js version:
```bash
node --version  # Should be >= 18.0.0
```

### Import errors
Remember to add `.js` extension to imports:
```typescript
// Correct
import { Foo } from './foo.js';

// Wrong
import { Foo } from './foo';
```

## Benefits of TypeScript Version

1. **Type Safety**: Catch errors at compile-time
2. **Better IDE Support**: IntelliSense, autocomplete, refactoring
3. **Modern Tooling**: npm ecosystem, fast build times
4. **Performance**: V8 JIT compilation
5. **Maintainability**: Self-documenting code with types
6. **Ecosystem**: Access to millions of npm packages

## Next Steps

1. Remove Python files if no longer needed:
   ```bash
   rm -rf src/__pycache__
   rm requirements.txt
   # Optionally remove Python src files
   ```

2. Update documentation to reference TypeScript commands

3. Consider adding more features:
   - Multiple vision backend support
   - Web UI
   - Database integration
   - Batch processing

## Questions?

Refer to:
- [README_TS.md](./README_TS.md) for usage
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Playwright TypeScript Docs](https://playwright.dev/docs/intro)
