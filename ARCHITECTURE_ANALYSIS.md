# Kleinanzeiger Architecture Analysis

## Executive Summary

Kleinanzeiger is a **TypeScript-based automated classified ad generator** for kleinanzeigen.de. It automates the creation of product ads by:
1. Analyzing product images using AI vision backends
2. Generating ad content (title, description, pricing)
3. Automating form submission via browser CDP

**Current Status**: TypeScript (migrated from Python), CLI-based, production-ready

---

## 1. ENTRY POINTS & APPLICATION FLOW

### Primary Entry Point: `src/main.ts`

**Type**: CLI Application using Commander.js
**Execution**: 
```bash
npm run dev          # Development with tsx
npm run start        # Production (from dist/)
```

**Command Structure**:
```
kleinanzeiger --image-folder <path> --postal-code <5-digit> [options]
  --price <amount>              # Optional price override
  --category <category>         # Optional category override
  --draft                       # Save as draft (default: true)
  --auto-confirm                # Skip manual confirmation
```

**Workflow Orchestration (5 Steps)**:

1. **Configuration Loading**
   - Load `.env` file
   - Parse `config/settings.yaml`
   - Expand environment variables (vision backends)
   - Create loggers

2. **Image Analysis** (ProductAnalyzer)
   - Scan image folder
   - Auto-convert HEIC → JPEG (via heic-convert)
   - Call vision backend (Gemini, Claude, OpenAI, BLIP-2)
   - Extract: name, description, condition, category, brand, color, features, price

3. **Content Generation** (ContentGenerator)
   - Format product info into ad content
   - Use vision-generated title (max 65 chars)
   - Format description with features, brand, color
   - Apply price override if provided
   - Set default shipping (PICKUP)

4. **Browser Connection** (BrowserController)
   - Connect to Brave Browser via CDP (Chrome DevTools Protocol)
   - CDP URL: `http://127.0.0.1:9222`
   - Reuse existing context/page

5. **Ad Creation & Draft Save** (KleinanzeigenAutomator)
   - Navigate to form (step 2)
   - Fill form fields with human-like delays
   - Upload images
   - Click "Entwurf speichern" (Save Draft)
   - Manual confirmation prompt (unless --auto-confirm)

**Error Handling**:
- Screenshots on error (saved to `logs/screenshots/`)
- Detailed error logging to Winston
- Graceful browser cleanup on failure

---

## 2. TYPESCRIPT CONFIGURATION & BUILD SETUP

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",                    // Modern JavaScript target
    "module": "ES2022",                    // ES modules (no CommonJS)
    "moduleResolution": "node",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,                        // All strict checks enabled
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFalltextCasesInSwitch": true,
    "declaration": true,                   // Generate .d.ts files
    "sourceMap": true,                     // For debugging
    "allowSyntheticDefaultImports": true
  }
}
```

**Key Features**:
- **Strict mode**: All type checking enabled
- **ES Modules**: Pure ESM, no CommonJS
- **Declarations**: TypeScript type definitions generated
- **Source maps**: Full debugging support

### Build Scripts (`package.json`)

```json
{
  "scripts": {
    "build": "tsc",                        // Compile src/ → dist/
    "dev": "tsx src/main.ts",             // Run with hot reload
    "start": "node dist/main.js",         // Production run
    "test": "NODE_OPTIONS=... jest",      // Jest with ESM support
    "lint": "eslint src/**/*.ts"           // TypeScript linting
  }
}
```

**Build Output**:
- Source: `src/**/*.ts`
- Output: `dist/**/*.js` + `.d.ts` files
- CLI Entry: `bin.kleinanzeiger` → `dist/main.js`

---

## 3. DEPENDENCIES & PACKAGE.JSON

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-ai/sdk` | ^0.32.1 | Claude API (vision analysis) |
| `@google/generative-ai` | ^0.21.0 | Gemini API (vision analysis) |
| `commander` | ^12.1.0 | CLI argument parsing |
| `dotenv` | ^16.4.5 | `.env` file loading |
| `heic-convert` | ^2.1.0 | HEIC → JPEG conversion (pure JS) |
| `openai` | ^4.77.3 | OpenAI API (vision analysis) |
| `playwright` | ^1.48.2 | Browser automation (uses CDP) |
| `sharp` | ^0.33.5 | Image processing (future use) |
| `winston` | ^3.17.0 | Structured logging |
| `yaml` | ^2.6.1 | Config file parsing |
| `zod` | ^3.24.1 | Type-safe schema validation |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.7.2 | TypeScript compiler |
| `tsx` | ^4.19.2 | TypeScript executor (for `dev` script) |
| `jest` | ^29.7.0 | Testing framework |
| `ts-jest` | ^29.2.5 | Jest + TypeScript integration |
| `eslint` | ^9.17.0 | Code linting |
| `@typescript-eslint/*` | ^8.18.2 | TypeScript ESLint support |

### Node Version Requirement
```json
"engines": { "node": ">=18.0.0" }
```
- Requires **Node 18+** for native ESM support
- Tested with Node 22.x

---

## 4. BACKEND/API STRUCTURE

### Module Organization

```
src/
├── main.ts                          # CLI entry point
├── vision/                          # Image analysis
│   ├── analyzer.ts                 # ProductAnalyzer facade
│   ├── base.ts                     # VisionAnalyzer abstract base
│   ├── factory.ts                  # Strategy factory pattern
│   ├── models.ts                   # Type definitions (Zod)
│   ├── geminiAnalyzer.ts           # Google Gemini implementation
│   ├── claudeAnalyzer.ts           # Anthropic Claude implementation
│   ├── openaiAnalyzer.ts           # OpenAI GPT-4V implementation
│   └── blip2Analyzer.ts            # Local BLIP-2 implementation
├── content/                        # Ad content generation
│   ├── generator.ts                # ContentGenerator
│   └── categories.ts               # Category mapping
├── automation/                     # Browser automation
│   ├── browser.ts                  # BrowserController (CDP)
│   ├── kleinanzeigen.ts            # Form automation & submission
│   └── actions.ts                  # UIActions (human-like interactions)
└── utils/
    └── logger.ts                   # Winston logging setup
```

### Core Classes & Patterns

#### Vision Analysis Layer (Strategy Pattern)

**Architecture**:
```
VisionAnalyzerFactory
    ├─ creates → GeminiVisionAnalyzer
    ├─ creates → ClaudeVisionAnalyzer
    ├─ creates → OpenAIVisionAnalyzer
    └─ creates → BLIP2VisionAnalyzer
                (all inherit from VisionAnalyzer)
```

**ProductAnalyzer** (Facade):
```typescript
class ProductAnalyzer {
  private backend: VisionAnalyzer;
  
  constructor(visionSettings: VisionConfig) {
    this.backend = VisionAnalyzerFactory.createFromSettings({vision: visionSettings});
  }
  
  async analyzeImages(imageFolder: string): Promise<ProductInfo> {
    return await this.backend.analyzeImages(imageFolder);
  }
}
```

**VisionAnalyzer** (Abstract Base):
- `analyzeImages(folder)`: Main method (implemented by subclasses)
- `findImages(folder)`: Collects supported images + auto-converts HEIC
- `isSupportedImage(path)`: Format validation
- `backendName`: Property identifying the backend

#### Content Generation Layer

**ContentGenerator**:
```typescript
class ContentGenerator {
  generateAdContent(
    productInfo: ProductInfo,
    postalCode: string,
    category?: string,
    subcategory?: string,
    priceOverride?: number
  ): AdContent {
    // Uses vision output directly (German content)
    // Formats description with features, brand, color
    // Applies price override or uses suggestion
    // Returns AdContent ready for form submission
  }
}
```

#### Browser Automation Layer

**BrowserController** (CDP Connection):
```typescript
class BrowserController {
  async connect(): Promise<Page> {
    // chromium.connectOverCDP(cdpUrl)
    // Reuses existing browser context
    // Returns Page object for automation
  }
  
  async takeScreenshot(filename, dir): Promise<void>
  async handleError(error, dir): Promise<void>
  async close(): Promise<void>
}
```

**KleinanzeigenAutomator** (Form Automation):
```typescript
class KleinanzeigenAutomator {
  async createAd(
    adContent: AdContent,
    imagePaths: string[],
    saveAsDraft: boolean,
    autoConfirm: boolean
  ): Promise<void> {
    // navigateToPostAd()
    // fillAdForm(adContent, imagePaths)
    // uploadImages(imagePaths)
    // saveAsDraft(autoConfirm)
  }
}
```

**UIActions** (Human-like Interactions):
```typescript
class UIActions {
  async humanClick(element: Locator): Promise<void>      // Random delay
  async humanType(element: Locator, text: string): Promise<void> // Per-char delays
  async scrollRandomly(): Promise<void>                  // Random scroll amount
  async waitForPageLoad(): Promise<void>                 // Load state wait
}
```

---

## 5. IMAGE HANDLING & AD CREATION WORKFLOW

### Image Processing Pipeline

```
Input Images (JPEG, PNG, HEIC, WebP, BMP)
        ↓
[VisionAnalyzer.findImages()]
    • Scan folder (max 10 images)
    • Detect HEIC/HEIF files
        ↓
    [convertHeicToJpeg()]  ← heic-convert (pure JS)
        • Read binary HEIC
        • Convert to JPEG buffer
        • Write to disk
    ↓
[Collect web-compatible images]
    ✓ .jpg, .jpeg, .png, .webp, .gif, .bmp
    ✗ .heic, .heif (converted above)
        ↓
[Load for API/Analysis]
    • Read binary content
    • Base64 encode
    • Determine MIME type
        ↓
[Vision Backend]
    • Send to API with base64 data
    • Extract metadata
        ↓
ProductInfo (extracted data)
```

### AD Creation Workflow (5-Step Form)

**Step 1: Image Analysis → ProductInfo**

Vision backends return:
```typescript
interface ProductInfo {
  name: string;              // "Macbook Pro 16 2021"
  description: string;       // Detailed German description
  condition: string;         // "Gebraucht", "Gut", etc.
  category?: string;         // "Elektronik"
  subcategory?: string;      // "Computer & Zubehör"
  brand?: string;            // "Apple"
  color?: string;            // "Space Gray"
  features: string[];        // ["Intel i9", "16GB RAM", etc.]
  suggestedPrice?: number;   // 800.0
  imagePaths: string[];      // ["/path/to/img1.jpg", ...]
}
```

**Step 2: Content Generation → AdContent**

```typescript
interface AdContent {
  title: string;        // Max 65 chars, German
  description: string;  // Features + brand + color + pickup notice
  price: number;        // EUR (or override)
  category: string;     // From vision analysis
  subcategory?: string;
  condition: string;    // From vision analysis
  shippingType: string; // "PICKUP"
  postalCode: string;   // 5 digits
}
```

**Step 3: Form Filling (HTML XPath selectors)**

```
Browser (Brave via CDP) → Playwright
    ↓
Navigate to: https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html
    ↓
Fill Form Fields:
  [1] Title Input         (//*[@id="postad-title"])
      → Type with human delays
      → Press Tab to trigger auto-category
      
  [2] Condition Dialog    (//*[@id="j-post-listing-frontend-conditions"]/...)
      → Click trigger button
      → Select radio button (1-4)
      → Confirm
      
  [3] Shipping Method     (//*[@id="shipping-pickup-selector"]/...)
      → Select radio button (1-3)
      
  [4] Price Input         (//*[@id="micro-frontend-price"])
      → Type price
      
  [5] Price Type Select   (//*[@id="micro-frontend-price-type"])
      → Select "NEGOTIABLE"
      
  [6] Description        (//*[@id="pstad-descrptn"])
      → Type description
      
  [7] Image Upload       (input[type="file"][accept*="image"])
      → setInputFiles() with multiple paths
      → Wait for upload completion
```

**Step 4: Draft Save**

```
[saveAsDraft(autoConfirm)]
    ↓
If !autoConfirm:
    Display: "MANUAL CONFIRMATION REQUIRED"
    Prompt: "Press Enter to save as draft, or Ctrl+C to cancel"
    Wait for user input
    ↓
Click "Entwurf speichern" Button
    (//*[@id="j-post-listing-frontend-draft-button"]/...)
    ↓
Wait 3 seconds for save confirmation
    ↓
Success: Ad saved as draft (not published)
```

**Step 5: Error Handling & Screenshots**

```
On Error:
    1. Take error screenshot: logs/screenshots/error_TIMESTAMP.png
    2. Log error details to Winston
    3. Close browser connection
    4. Exit with code 1

On Success:
    1. Take success screenshot: logs/screenshots/success.png
    2. Log completion message
    3. Close browser gracefully
```

---

## 6. BROWSER AUTOMATION WITH CDP

### Chrome DevTools Protocol (CDP) Integration

**Browser Setup Requirements**:
```bash
# Start Brave with CDP enabled on port 9222
brave --remote-debugging-port=9222

# Or manually:
# 1. Open Brave
# 2. Devtools → Settings → Experiments → "Enable local overrides"
```

**BrowserController Flow**:

```typescript
// Step 1: Connect
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

// Step 2: Get existing context (user's login session)
const contexts = browser.contexts();
const context = contexts[0]; // Reuse existing context

// Step 3: Get or create page
const pages = context.pages();
const page = pages.length > 0 ? pages[0] : await context.newPage();

// Step 4: Use page for automation
await page.goto('https://www.kleinanzeigen.de/...');
```

**Key CDP Features Used**:

1. **Context Reuse**: Maintains user's login session
   - No re-authentication needed
   - Cookies/storage preserved
   
2. **Page Management**: Single page automation
   - Locate elements via XPath
   - Type with delays
   - Click buttons
   - Wait for states
   
3. **File Input Handling**: Upload multiple images
   - `page.setInputFiles(paths)`
   - Works with hidden file inputs
   
4. **Screenshot Capability**: Full-page screenshots
   - `page.screenshot({fullPage: true})`
   - Saved to `logs/screenshots/`

**Playwright Integration**:
```typescript
import { chromium, Browser, Page, BrowserContext } from 'playwright';

// Playwright wraps CDP protocol
// - Element locators: XPath, CSS, text matching
// - Actions: click, type, press, fill
// - Waits: waitFor, waitForLoadState
```

### Human-like Behavior Simulation

**Delays Configuration** (`config/settings.yaml`):
```yaml
delays:
  min_typing: 50ms     # Per-character typing delay
  max_typing: 150ms
  min_click: 100ms     # Pre-click random wait
  max_click: 300ms
  page_load: 2000ms    # Post-navigation wait
  form_field: 500ms    # Between form field changes
```

**Implementation** (`src/automation/actions.ts`):
```typescript
async humanClick(element: Locator): Promise<void> {
  const delay = Math.random() * 200 + 100; // 100-300ms
  await new Promise(resolve => setTimeout(resolve, delay));
  await element.click();
}

async humanType(element: Locator, text: string): Promise<void> {
  await element.click();
  for (const char of text) {
    const delay = Math.random() * 100 + 50; // 50-150ms per char
    await element.type(char, {delay});
  }
}

async scrollRandomly(): Promise<void> {
  const amount = Math.floor(Math.random() * 500) + 200; // 200-700px
  await page.evaluate(amount => window.scrollBy({top: amount, behavior: 'smooth'}), amount);
}
```

---

## 7. VISION BACKENDS & MULTI-BACKEND ARCHITECTURE

### Supported Vision Backends

| Backend | Type | Cost | Speed | Quality | Setup |
|---------|------|------|-------|---------|-------|
| **Gemini** | Cloud API | Free tier available | Fast | Excellent | Need API key |
| **Claude** | Cloud API | Paid | Medium | Best | Need API key |
| **OpenAI GPT-4V** | Cloud API | Paid | Medium | Excellent | Need API key |
| **BLIP-2** | Local | Free | Slow (first run) | Good | 15GB download |

### Backend Selection

**Config File** (`config/settings.yaml`):
```yaml
vision:
  backend: "gemini"  # or "claude", "openai", "blip2"
  
  gemini:
    api_key: ${GEMINI_API_KEY}
    model: "gemini-2.5-flash"
    
  claude:
    api_key: ${ANTHROPIC_API_KEY}
    model: "claude-3-5-sonnet-20241022"
    
  openai:
    api_key: ${OPENAI_API_KEY}
    model: "gpt-4-vision-preview"
    
  blip2:
    model_name: "Salesforce/blip2-opt-2.7b"
    device: "auto"  # "auto", "cuda", or "cpu"
```

### Vision Analysis Prompt

**Language**: German (outputs in German for direct use in ads)

**Example Gemini Prompt**:
```
WICHTIG: Alle N Bilder zeigen DAS GLEICHE PRODUKT...
Extrahiere die folgenden Informationen über dieses EINE Produkt IN DEUTSCHER SPRACHE:

1. Produktname (kurz und präzise, auf Deutsch)
2. Detaillierte Produktbeschreibung (Zustand, Merkmale...)
3. Zustand (Neu, Wie Neu, Gebraucht, oder Defekt)
4. Kategorie (z.B. Elektronik, Möbel, Kleidung...)
5. Marke/Hersteller (falls erkennbar)
6. Farbe (falls relevant)
7. Wichtige Merkmale (Liste, auf Deutsch)
8. Vorgeschlagener Preis in EUR

Antworte mit NUR EINEM JSON-Objekt:
{
  "name": "...",
  "description": "...",
  "condition": "Gebraucht",
  "category": "...",
  "brand": "...",
  "color": "...",
  "features": ["..."],
  "suggested_price": 50.00
}
```

---

## 8. CONFIGURATION & ENVIRONMENT

### `.env` File Structure

```bash
# Vision Backend API Keys (set only what you use)
ANTHROPIC_API_KEY=sk-ant-...       # Claude
OPENAI_API_KEY=sk-...              # GPT-4V
GEMINI_API_KEY=AIza...             # Gemini
```

### Configuration File (`config/settings.yaml`)

**Sections**:

1. **Browser Configuration**
   ```yaml
   browser:
     cdp_url: "http://127.0.0.1:9222"
     headless: false
     timeout: 30000
     screenshot_on_error: true
   ```

2. **Kleinanzeigen Configuration**
   ```yaml
   kleinanzeigen:
     base_url: "https://www.kleinanzeigen.de"
     shipping_type: "PICKUP"
     draft_mode: true  # Always save as draft
   ```

3. **Vision Backend Configuration**
   ```yaml
   vision:
     backend: "gemini"
     max_images_per_ad: 10
     supported_formats: [".jpg", ".jpeg", ".png", ".webp"]
     # ... backend-specific settings
   ```

4. **Logging Configuration**
   ```yaml
   logging:
     level: "DEBUG"
     log_dir: "logs"
     screenshot_dir: "logs/screenshots"
   ```

### Validation & Type Safety

**Zod Schema Definitions** (`src/vision/models.ts`):
```typescript
const ProductInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  condition: z.string().default('Gebraucht'),
  category: z.string().optional(),
  suggestedPrice: z.number().min(0).optional(),
  features: z.array(z.string()).default([]),
  imagePaths: z.array(z.string()).default([]),
});

const AdContentSchema = z.object({
  title: z.string().max(65),
  description: z.string(),
  price: z.number().min(0),
  category: z.string(),
  condition: z.string().default('Gebraucht'),
  shippingType: z.string().default('PICKUP'),
  postalCode: z.string().length(5).regex(/^\d+$/),
});
```

---

## 9. LOGGING & DEBUGGING

### Winston Logger Setup

**Configuration** (`src/utils/logger.ts`):
```typescript
// File transport: logs/kleinanzeiger.log
// Console transport: colored output to stdout
// Format: timestamp - LEVEL: message

setupLogging(logLevel, logDir);
const logger = createLogger('ModuleName');

logger.info('Application started');
logger.warn('User not logged in');
logger.error('Failed to upload image');
logger.debug('Image metadata: {...}');
```

**Log Output Example**:
```
2024-11-25 10:30:45 - INFO: Kleinanzeiger - Automated Classified Ad Generator
2024-11-25 10:30:45 - INFO: Initializing components...
2024-11-25 10:30:46 - INFO: Using vision backend: gemini
2024-11-25 10:30:46 - INFO: Step 1: Analyzing product images...
2024-11-25 10:30:52 - INFO: Product identified: Macbook Pro 16
2024-11-25 10:30:52 - INFO: Suggested price: €800
2024-11-25 10:30:52 - DEBUG: PRODUCT ANALYSIS (Vision Backend)
2024-11-25 10:30:52 - DEBUG: {...full JSON...}
...
```

### Screenshot Captures

**Locations**:
- Success: `logs/screenshots/success.png`
- Errors: `logs/screenshots/error_2024-11-25T10-30-45-123Z.png`

---

## 10. TESTING & CODE QUALITY

### Testing Framework

**Jest Configuration**:
```javascript
// jest.config.js
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
```

**Run Tests**:
```bash
npm test            # Run all tests
npm run test:watch  # Watch mode
```

### Code Quality Tools

```bash
npm run lint        # ESLint with TypeScript plugin
npm run build       # TypeScript compilation (with strict checking)
```

---

## ARCHITECTURE SUMMARY TABLE

| Component | Technology | Pattern | Purpose |
|-----------|-----------|---------|---------|
| CLI | Commander.js | Command Pattern | Parse CLI args |
| Config | YAML + dotenv | Strategy | Multi-backend config |
| Vision | Multiple APIs + local model | Factory + Strategy | Image analysis |
| Content | TypeScript class | Facade | Ad content generation |
| Browser | Playwright + CDP | Controller | Browser automation |
| Form Automation | Playwright locators | Template | Form filling |
| UI Actions | Playwright | Utility | Human-like behavior |
| Logging | Winston | Observer | Event logging |
| Validation | Zod | Schema | Type-safe data |

---

## PLANNING FOR ELECTRON INTEGRATION

### Key Considerations

1. **Current Architecture**: 
   - Pure Node.js CLI with TypeScript
   - No UI framework
   - All logic is in classes/modules
   
2. **What Will Change**:
   - Replace Commander CLI with Electron main/preload processes
   - Add React/Vue/Svelte UI for settings & monitoring
   - IPC (Inter-Process Communication) for data flow
   - Possibly embed Playwright/Chrome differently
   
3. **What Stays the Same**:
   - All business logic (vision, content, automation)
   - YAML config (can be read/written from UI)
   - Browser CDP connection (Brave still runs separately)
   - Winston logging (can pipe to UI)
   
4. **Integration Points**:
   - **Main Process**: Orchestrates workflow, manages config
   - **Renderer Process**: UI for settings, image upload, progress
   - **IPC Bridge**: `invoke` for long-running tasks, `on` for updates
   - **File System**: Still uses disk for images, logs, configs

---

## FILE STRUCTURE SUMMARY

```
src/
├── main.ts                              # CLI entry point
├── vision/
│   ├── analyzer.ts                     # Facade
│   ├── base.ts                         # Abstract base (HEIC conversion, image finding)
│   ├── factory.ts                      # Backend factory
│   ├── models.ts                       # Zod schemas & interfaces
│   ├── geminiAnalyzer.ts               # 188 lines
│   ├── claudeAnalyzer.ts               # Similar structure
│   ├── openaiAnalyzer.ts               # Similar structure
│   └── blip2Analyzer.ts                # Similar structure
├── content/
│   ├── generator.ts                    # 93 lines - Format ProductInfo → AdContent
│   └── categories.ts                   # Category mapping
├── automation/
│   ├── browser.ts                      # 105 lines - CDP connection
│   ├── kleinanzeigen.ts                # 405 lines - Form automation
│   └── actions.ts                      # 85 lines - Human-like UI interactions
└── utils/
    └── logger.ts                       # 65 lines - Winston setup

config/
├── settings.yaml                       # Multi-backend config
└── categories.json

dist/                                   # Compiled JavaScript
```

