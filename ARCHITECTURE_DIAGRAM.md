# Kleinanzeiger Architecture Diagrams

## High-Level Application Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        KLEINANZEIGER                            │
│                    CLI Application (Node.js)                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   main.ts (Commander)  │
                    │   - Parse CLI args     │
                    │   - Load config        │
                    │   - Orchestrate flow   │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
    ┌─────────┐            ┌──────────┐            ┌──────────┐
    │ STEP 1  │            │ STEP 2   │            │ STEP 3   │
    │ Analysis│            │ Content  │            │ Browser  │
    │         │            │ Gen      │            │ Connect  │
    └────┬────┘            └────┬─────┘            └────┬─────┘
         │                      │                      │
         ▼                      ▼                      ▼
   ┌──────────────┐      ┌─────────────┐      ┌────────────────┐
   │ ProductInfo  │      │ AdContent   │      │ Brave Browser  │
   │ (name, desc, │  ──▶ │ (title,     │  ──▶ │ (via CDP)      │
   │  price, img) │      │  desc, img) │      │ Port 9222      │
   └──────────────┘      └─────────────┘      └────────┬───────┘
                                                        │
                                                ┌───────▼────────┐
                                                │ STEP 5: Submit │
                                                │ Form & Save    │
                                                │ as Draft       │
                                                └────────────────┘
```

## Module Architecture (Layered)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│  main.ts (CLI with Commander.js)                               │
│  - Argument parsing                                            │
│  - Config loading & validation                                │
│  - Workflow orchestration                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                          │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ VISION MODULE (src/vision/)                            │   │
│  │                                                        │   │
│  │  ProductAnalyzer (Facade)                             │   │
│  │     └─▶ VisionAnalyzerFactory                         │   │
│  │         ├─▶ GeminiVisionAnalyzer                      │   │
│  │         ├─▶ ClaudeVisionAnalyzer                      │   │
│  │         ├─▶ OpenAIVisionAnalyzer                      │   │
│  │         └─▶ BLIP2VisionAnalyzer                       │   │
│  │                                                        │   │
│  │  VisionAnalyzer (Abstract Base)                       │   │
│  │     ├─ analyzeImages()                                │   │
│  │     ├─ findImages()                                   │   │
│  │     └─ convertHeicToJpeg()                            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ CONTENT GENERATION MODULE (src/content/)              │   │
│  │                                                        │   │
│  │  ContentGenerator                                      │   │
│  │     ├─ generateAdContent()                            │   │
│  │     └─ formatDescriptionFromFeatures()                │   │
│  │                                                        │   │
│  │  CategoryMapper (future enhancement)                  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ BROWSER AUTOMATION MODULE (src/automation/)           │   │
│  │                                                        │   │
│  │  BrowserController (CDP Connection)                   │   │
│  │     ├─ connect() → Playwright Page                    │   │
│  │     ├─ takeScreenshot()                               │   │
│  │     ├─ handleError()                                  │   │
│  │     └─ close()                                        │   │
│  │                                                        │   │
│  │  KleinanzeigenAutomator (Form Filling)               │   │
│  │     ├─ createAd()                                     │   │
│  │     ├─ fillAdForm()                                   │   │
│  │     ├─ uploadImages()                                 │   │
│  │     ├─ selectCondition()                              │   │
│  │     ├─ selectShippingMethod()                         │   │
│  │     └─ saveAsDraft()                                  │   │
│  │                                                        │   │
│  │  UIActions (Human-like Interactions)                  │   │
│  │     ├─ humanClick()     [random delay]                │   │
│  │     ├─ humanType()      [per-char delay]              │   │
│  │     ├─ scrollRandomly() [human scroll]                │   │
│  │     └─ waitForPageLoad()                              │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ UTILITIES (src/utils/)                                │   │
│  │                                                        │   │
│  │  Logger (Winston)                                      │   │
│  │     ├─ File transport: logs/kleinanzeiger.log         │   │
│  │     └─ Console transport: colored output              │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                  EXTERNAL SERVICES LAYER                        │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Vision APIs      │  │ Brave Browser    │  │ File System  │ │
│  │                  │  │                  │  │              │ │
│  │ - Gemini         │  │ - CDP Protocol   │  │ - Images     │ │
│  │ - Claude         │  │ - Port 9222      │  │ - Logs       │ │
│  │ - OpenAI         │  │ - Playwright     │  │ - Config     │ │
│  │ - Local BLIP-2   │  │                  │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ kleinanzeigen.de Website                               │ │
│  │ Form: https://www.kleinanzeigen.de/p-anzeige-...        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
User Input (CLI Args)
  │
  ├─ --image-folder /path/to/images
  ├─ --postal-code 10115
  ├─ --price 500 (optional)
  └─ --auto-confirm (optional)
     │
     ▼
Config Loading
  │
  ├─ Load .env (API Keys)
  ├─ Parse config/settings.yaml
  └─ Setup Logging (Winston)
     │
     ▼
Image Processing Pipeline
  │
  ├─ findImages(folder)
  │  ├─ Scan directory
  │  └─ Convert HEIC → JPEG (heic-convert)
  │     │
  └─ Load Images
     ├─ Read binary data
     ├─ Base64 encode
     └─ Prepare for API call
        │
        ▼
Vision Analysis (ProductAnalyzer)
  │
  ├─ Select Backend (Gemini/Claude/OpenAI/BLIP-2)
  │
  └─ analyzeImages()
     │
     ├─ Send images to API (or local model)
     │
     └─ Parse Response
        │
        ├─ Product Name (German)
        ├─ Description (German)
        ├─ Condition
        ├─ Category
        ├─ Brand
        ├─ Color
        ├─ Features (array)
        ├─ Suggested Price
        └─ Image Paths
           │
           ▼ ProductInfo Object
           │
Content Generation (ContentGenerator)
  │
  ├─ Format title (max 65 chars)
  ├─ Format description (features + brand + color)
  ├─ Apply price override (if provided)
  └─ Set shipping type (PICKUP)
     │
     ▼ AdContent Object
     │
Browser Automation (BrowserController)
  │
  ├─ Connect via CDP
  │  └─ chromium.connectOverCDP('http://127.0.0.1:9222')
  │
  └─ Get Page object
     │
     ▼
Form Filling (KleinanzeigenAutomator)
  │
  ├─ Navigate to: p-anzeige-aufgeben-schritt2.html
  │
  ├─ Fill Form Fields
  │  ├─ Title (with human delays)
  │  ├─ Condition (dialog selection)
  │  ├─ Shipping Method (radio button)
  │  ├─ Price
  │  ├─ Description
  │  └─ Images (file upload)
  │
  └─ Save as Draft
     ├─ Manual confirmation (if needed)
     ├─ Click "Entwurf speichern"
     └─ Wait for confirmation
        │
        ▼
Success / Error Handling
  │
  ├─ Success:
  │  ├─ Take screenshot (success.png)
  │  ├─ Log completion
  │  └─ Close browser
  │
  └─ Error:
     ├─ Take screenshot (error_TIMESTAMP.png)
     ├─ Log error details
     └─ Close browser
```

## Vision Backend Selection Flow

```
config/settings.yaml: vision.backend = "gemini"
              │
              ▼
VisionAnalyzerFactory.createFromSettings()
              │
              ├─ Read backend name from config
              │
              ▼
VisionAnalyzerFactory.create(backend, config)
              │
        ┌─────┴─────┬─────────┬──────────┐
        │           │         │          │
        ▼           ▼         ▼          ▼
    gemini?     claude?   openai?   blip2?
        │           │         │          │
        ▼           ▼         ▼          ▼
     Gemini    Claude      OpenAI     BLIP-2
     API       API         API        Local
        │           │         │          │
        │           │         │          ▼
        │           │         │      Load Model
        │           │         │      (First run:
        │           │         │       15GB)
        │           │         │          │
        └───────────┴─────────┴──────────┘
                    │
                    ▼
            analyzeImages()
                    │
                    ▼
            ProductInfo
         (name, desc, condition,
          category, price, features,
          imagePaths)
```

## Form Filling Detail (XPath Selectors)

```
┌──────────────────────────────────────────────────────┐
│      Kleinanzeigen.de Ad Form (Step 2)              │
└──────────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
    [1] Title   [2] Condition  [3] Shipping
        │             │             │
        │             ▼             ▼
        │   Click Dialog Button   Radio Button
        │             │             │
        │             ├─ Select    ├─ PICKUP
        │             │ Radio 1-4  ├─ SHIPPING
        │             │            └─ BOTH
        │             ├─ Confirm
        │             │
        │             ▼
        │        Dialog Closes
        │
        └─────────────┼─────────────┐
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
    [4] Price  [5] Price Type [6] Description
        │             │             │
        ▼             ▼             ▼
    Input         Select         Textarea
    Number     "NEGOTIABLE"       Input
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
            [7] Image Upload
                (file input)
                      │
                      ▼
            Select Multiple Files
                      │
                      ▼
            Wait for Upload (1-10 sec)
                      │
                      ▼
        [8] Save as Draft Button
        (//*[@id="j-post-listing-..."])
                      │
                      ▼
            Click "Entwurf speichern"
                      │
                      ▼
        [Optional] Manual Confirmation
            (Press Enter or Ctrl+C)
                      │
                      ▼
        Wait 3 seconds → Ad Saved as Draft
```

## File Organization

```
kleinanzeiger/
│
├── src/
│   ├── main.ts                   [CLI Entry Point - 278 lines]
│   │
│   ├── vision/                   [Image Analysis Module]
│   │   ├── analyzer.ts          [ProductAnalyzer Facade - 39 lines]
│   │   ├── base.ts              [Abstract Base - 176 lines]
│   │   ├── factory.ts           [Factory Pattern - 81 lines]
│   │   ├── models.ts            [Zod Schemas - 102 lines]
│   │   ├── geminiAnalyzer.ts    [Gemini Implementation - 188 lines]
│   │   ├── claudeAnalyzer.ts    [Claude Implementation]
│   │   ├── openaiAnalyzer.ts    [OpenAI Implementation]
│   │   └── blip2Analyzer.ts     [Local BLIP-2 Implementation]
│   │
│   ├── content/                  [Content Generation Module]
│   │   ├── generator.ts         [ContentGenerator - 93 lines]
│   │   └── categories.ts        [Category Mapping]
│   │
│   ├── automation/               [Browser Automation Module]
│   │   ├── browser.ts           [BrowserController - 105 lines]
│   │   ├── kleinanzeigen.ts     [Form Automation - 405 lines]
│   │   └── actions.ts           [UIActions - 85 lines]
│   │
│   └── utils/                    [Utilities]
│       └── logger.ts            [Winston Logger - 65 lines]
│
├── config/
│   ├── settings.yaml            [Multi-Backend Configuration]
│   └── categories.json          [Category Definitions]
│
├── dist/                        [Compiled JavaScript]
│   └── (TypeScript compilation output)
│
├── logs/                        [Runtime Logs]
│   ├── kleinanzeiger.log        [Main Log File]
│   └── screenshots/             [Screenshots]
│       ├── success.png
│       └── error_*.png
│
├── package.json                 [Project Metadata & Dependencies]
├── tsconfig.json               [TypeScript Configuration]
├── jest.config.js              [Jest Configuration]
├── .env                        [Environment Variables (API Keys)]
├── .env.example                [Environment Variable Template]
└── .gitignore                  [Git Ignore Rules]
```

## Dependency Graph

```
                    [main.ts]
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
    Commander      dotenv            YAML
    (CLI args)   (API keys)         (config)
        │               │               │
        │               └───────┬───────┘
        │                       │
        ├──────────┬────────────┤
        │          │            │
        ▼          ▼            ▼
    ProductAnalyzer    ContentGenerator    BrowserController
    (vision facade)   (format content)   (CDP connection)
        │                  │                   │
        └──────────────────┼───────────────────┤
                           │                   │
        ┌──────────────────┴───────────────────┘
        │
        ├─ GoogleGenerativeAI    [Gemini API]
        ├─ @anthropic-ai/sdk     [Claude API]
        ├─ openai                [OpenAI API]
        ├─ Playwright            [Browser Automation]
        ├─ heic-convert          [HEIC Conversion]
        ├─ Winston               [Logging]
        ├─ Zod                   [Validation]
        └─ sharp                 [Image Processing]
```

## Error Handling Flow

```
┌─────────────────────────────────┐
│     Application Error           │
└──────────────┬──────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    Catch      Log Error
    Block      (Winston)
        │             │
        └──────┬──────┘
               │
               ▼
    Check screenshotOnError
        │
        ├─ YES ──────┬──────► Take Screenshot
        │            │       (error_TIMESTAMP.png)
        │            │
        │            ▼
        │       Save to logs/screenshots/
        │            │
        │            ▼
        │       Log filepath
        │
        └─ NO ─────┐
                   │
                   ▼
            Close Browser
                   │
                   ▼
            Exit with Code 1
```

## CDP Connection Architecture

```
┌─────────────────────────────────────────┐
│         Brave Browser                   │
│   (User runs: brave --remote-          │
│    debugging-port=9222)                 │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │ Browser Context                 │  │
│   │ (User's Login Session)          │  │
│   │                                 │  │
│   │  ┌─────────────────────────────┐│  │
│   │  │ Page (kleinanzeigen.de)     ││  │
│   │  │ (DOM, JavaScript, Storage)  ││  │
│   │  └─────────────────────────────┘│  │
│   └─────────────────────────────────┘  │
│                                         │
│      ChromeDevTools Protocol (CDP)      │
│      Websocket on localhost:9222        │
└──────────────┬──────────────────────────┘
               │
               │ chromium.connectOverCDP()
               │
        ┌──────▼───────┐
        │   Playwright │
        │ (TypeScript) │
        │              │
        │ Page API     │
        │ - Locators   │
        │ - Actions    │
        │ - Waits      │
        └──────┬───────┘
               │
        ┌──────▼─────────────────┐
        │  KleinanzeigenAutomator│
        │  + UIActions          │
        │                       │
        │ - Click buttons       │
        │ - Type text           │
        │ - Upload files        │
        │ - Take screenshots    │
        └───────────────────────┘
```

This architecture ensures:
- **Modularity**: Each component has single responsibility
- **Extensibility**: Easy to add new vision backends
- **Maintainability**: Clear separation of concerns
- **Testability**: Each module can be tested independently
- **Reusability**: Business logic independent of CLI interface (ready for Electron)
