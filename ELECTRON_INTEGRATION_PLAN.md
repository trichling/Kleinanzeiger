# Electron Integration Plan for Kleinanzeiger

## Overview

This document outlines the strategy for integrating Kleinanzeiger's existing TypeScript business logic into an Electron desktop application while preserving all current functionality.

## Current State Analysis

### Strengths of Current Architecture

1. **Well-Organized Business Logic**
   - Modular structure (vision, content, automation)
   - Clear separation of concerns
   - Factory/Strategy patterns for extensibility
   - Type-safe with TypeScript strict mode

2. **No UI Framework Dependencies**
   - Pure Node.js/Playwright backend
   - No frontend framework coupling
   - Easy to extract and reuse

3. **Configuration-Driven**
   - YAML-based config (easy to expose in UI)
   - Environment variable support
   - Extensible validation with Zod

4. **Comprehensive Logging**
   - Winston logger with file/console output
   - Can be piped to UI

### What Can Be Reused

```
Vision Analysis (100% reusable)
├── ProductAnalyzer
├── VisionAnalyzerFactory
├── All backend implementations
└── Image processing pipeline

Content Generation (100% reusable)
├── ContentGenerator
└── CategoryMapper

Automation Logic (95% reusable)
├── KleinanzeigenAutomator (only CLI prompts change)
├── UIActions (human-like delays stay)
└── All form automation logic

Configuration System (100% reusable)
├── YAML parsing
├── Zod validation
└── Env variable expansion

Logging (100% reusable)
└── Winston logger
```

### What Needs Modification

```
CLI Interface (needs replacement)
├── main.ts (Commander.js)
└── CLI argument handling

Manual Confirmation (needs UI)
├── Command-line readline prompt
└── Replace with dialog/button in UI
```

## Integration Architecture

### Phase 1: Refactor Business Logic (Week 1)

#### Step 1: Create Orchestrator Class

**New File**: `src/core/orchestrator.ts`

```typescript
export class AdCreationOrchestrator {
  /**
   * Single entry point for the entire workflow
   * Returns progress updates via callback
   */
  async createAdFromImages(options: {
    imageFolder: string;
    postalCode: string;
    priceOverride?: number;
    categoryOverride?: string;
    visionBackend?: string;
    autoConfirm?: boolean;
    
    // Progress callback for UI updates
    onProgress?: (update: ProgressUpdate) => void;
  }): Promise<AdCreationResult> {
    // 1. Analyze images
    // 2. Generate content
    // 3. Connect to browser
    // 4. Fill form
    // 5. Return result
  }
}

export interface ProgressUpdate {
  step: 'analyzing' | 'generating' | 'connecting' | 'filling' | 'saving';
  status: 'in_progress' | 'completed' | 'error';
  message: string;
  progress: number; // 0-100
  data?: any;
}

export interface AdCreationResult {
  success: boolean;
  message: string;
  productInfo?: ProductInfo;
  adContent?: AdContent;
  screenshotPath?: string;
  error?: string;
}
```

#### Step 2: Extract Configuration Manager

**New File**: `src/core/configManager.ts`

```typescript
export class ConfigManager {
  async loadConfig(configPath: string): Promise<AppConfig> {
    // Load YAML
    // Expand env variables
    // Validate with Zod
  }

  async saveConfig(configPath: string, config: AppConfig): Promise<void> {
    // Save YAML with validation
  }

  async getAvailableVisionBackends(): Promise<string[]> {
    return ['gemini', 'claude', 'openai', 'blip2'];
  }

  async validateApiKey(backend: string, apiKey: string): Promise<boolean> {
    // Test API key validity
  }
}
```

#### Step 3: Browser Management

**Modify**: `src/automation/browser.ts`

```typescript
export class BrowserController {
  // Add method to track browser health
  async isBrowserRunning(): Promise<boolean> {
    try {
      await chromium.connectOverCDP(this.config.cdpUrl);
      return true;
    } catch {
      return false;
    }
  }

  // Add status/diagnostics
  async getStatus(): Promise<BrowserStatus> {
    return {
      running: await this.isBrowserRunning(),
      cdpUrl: this.config.cdpUrl,
      lastConnected?: this.lastConnected,
      errorMessage?: this.lastError,
    };
  }
}
```

### Phase 2: Create Electron IPC Bridge (Week 2)

#### Main Process Architecture

**File**: `src/electron/main.ts`

```typescript
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { AdCreationOrchestrator } from '../core/orchestrator';
import { ConfigManager } from '../core/configManager';
import { BrowserController } from '../automation/browser';

const configManager = new ConfigManager();
let mainWindow: BrowserWindow;

// IPC Handlers
ipcMain.handle('config:load', async () => {
  return await configManager.loadConfig('./config/settings.yaml');
});

ipcMain.handle('config:save', async (event, config) => {
  await configManager.saveConfig('./config/settings.yaml', config);
});

ipcMain.handle('ad:create', async (event, options) => {
  const orchestrator = new AdCreationOrchestrator();
  
  // Progress updates sent to renderer
  const result = await orchestrator.createAdFromImages({
    ...options,
    onProgress: (update) => {
      mainWindow.webContents.send('ad:progress', update);
    },
  });
  
  return result;
});

ipcMain.handle('browser:status', async () => {
  const controller = new BrowserController(/* config */);
  return await controller.getStatus();
});

ipcMain.handle('browser:start', async () => {
  // Start Brave with CDP if not running
  // Store instructions for user
});

// More handlers...
```

#### Preload Script for Security

**File**: `src/electron/preload.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose IPC methods to renderer (whitelist approach)
contextBridge.exposeInMainWorld('api', {
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (config) => ipcRenderer.invoke('config:save', config),
  },
  ad: {
    create: (options) => ipcRenderer.invoke('ad:create', options),
    onProgress: (callback) => ipcRenderer.on('ad:progress', (event, data) => callback(data)),
  },
  browser: {
    getStatus: () => ipcRenderer.invoke('browser:status'),
    start: () => ipcRenderer.invoke('browser:start'),
  },
  dialog: {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    selectFiles: () => ipcRenderer.invoke('dialog:selectFiles'),
  },
});
```

### Phase 3: Build Renderer UI (Week 3)

#### Technology Choice

**Recommended**: React + TypeScript

**Alternatives**:
- Vue 3 (lightweight, great DX)
- Svelte (smallest bundle, blazing fast)

#### UI Structure

```
src/renderer/
├── components/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Settings/
│   │   ├── ConfigEditor.tsx
│   │   ├── ApiKeyInput.tsx
│   │   ├── BrowserSetup.tsx
│   │   └── VisionBackendSelector.tsx
│   ├── AdCreator/
│   │   ├── ImageUpload.tsx
│   │   ├── FormPreview.tsx
│   │   ├── ProgressMonitor.tsx
│   │   └── ConfirmationDialog.tsx
│   └── Logs/
│       └── LogViewer.tsx
│
├── pages/
│   ├── SettingsPage.tsx
│   ├── CreateAdPage.tsx
│   ├── LogsPage.tsx
│   └── DashboardPage.tsx
│
├── hooks/
│   ├── useApi.ts
│   ├── useConfig.ts
│   ├── useAdCreation.ts
│   └── useProgress.ts
│
├── styles/
│   └── globals.css
│
├── App.tsx
└── index.html
```

#### Key UI Components

**1. Settings/API Configuration**
```typescript
// Allow users to select vision backend and enter API keys
// Show which backends are available
// Test API key validity
// Save to config file
```

**2. Image Upload**
```typescript
// Drag & drop support
// Multiple file selection
// Preview thumbnails
// Format validation (convert HEIC automatically)
```

**3. Form Preview**
```typescript
// Show vision-analyzed product info
// Allow edits before submission
// Price override input
// Category override (optional)
```

**4. Progress Monitor**
```typescript
// Real-time progress updates from backend
// Log viewer showing Winston logs
// Screenshots from automation
// Error display with troubleshooting
```

**5. Browser Status**
```typescript
// Show if Brave is running on port 9222
// Instructions if not running
// One-click to show setup guide
// Connection test
```

### Phase 4: Webpack/Bundling Setup (Week 4)

#### Build Configuration

**webpack.main.config.ts** (Main process)
```javascript
{
  entry: './src/electron/main.ts',
  target: 'electron-main',
  output: { path: './dist/main.js' },
}
```

**webpack.preload.config.ts** (Preload script)
```javascript
{
  entry: './src/electron/preload.ts',
  target: 'electron-preload',
  output: { path: './dist/preload.js' },
}
```

**webpack.renderer.config.ts** (Renderer)
```javascript
{
  entry: './src/renderer/index.tsx',
  target: 'web',
  output: { path: './dist/renderer' },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ]
  }
}
```

#### Build Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"webpack watch\" \"electron .\"",
    "build": "webpack --mode=production",
    "dist": "electron-builder",
    "test": "jest"
  }
}
```

## File Structure After Integration

```
kleinanzeiger-electron/
│
├── src/
│   ├── core/                         [New: Business Logic]
│   │   ├── orchestrator.ts          [Main workflow coordinator]
│   │   ├── configManager.ts         [Config loading/saving]
│   │   └── types.ts                 [Shared type definitions]
│   │
│   ├── electron/                     [New: Desktop Framework]
│   │   ├── main.ts                  [Electron main process]
│   │   ├── preload.ts               [Security bridge]
│   │   └── ipc-handlers.ts          [IPC endpoint definitions]
│   │
│   ├── renderer/                     [New: UI (React/Vue/Svelte)]
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── App.tsx
│   │   └── index.html
│   │
│   ├── vision/                       [Existing: unchanged]
│   │   ├── analyzer.ts
│   │   ├── base.ts
│   │   ├── factory.ts
│   │   ├── models.ts
│   │   ├── geminiAnalyzer.ts
│   │   ├── claudeAnalyzer.ts
│   │   ├── openaiAnalyzer.ts
│   │   └── blip2Analyzer.ts
│   │
│   ├── content/                      [Existing: unchanged]
│   │   ├── generator.ts
│   │   └── categories.ts
│   │
│   ├── automation/                   [Existing: mostly unchanged]
│   │   ├── browser.ts               [Add: status methods]
│   │   ├── kleinanzeigen.ts         [Remove: CLI prompts]
│   │   └── actions.ts
│   │
│   └── utils/
│       └── logger.ts
│
├── config/
│   ├── settings.yaml
│   └── categories.json
│
├── webpack.config.ts                [Bundling config]
├── tsconfig.json                    [Updated for monorepo]
├── package.json                     [Updated dependencies]
└── README.md                        [Updated docs]
```

## Dependencies to Add

```json
{
  "devDependencies": {
    "electron": "^latest",
    "electron-builder": "^latest",
    "webpack": "^5",
    "@types/webpack": "^5",
    "react": "^18",
    "react-dom": "^18",
    "typescript": "^5.3",
    "concurrently": "^8"
  }
}
```

## Testing Strategy

### Unit Tests (Jest)
```
- ProductAnalyzer
- ContentGenerator
- Orchestrator
- ConfigManager
- Validation schemas
```

### Integration Tests
```
- Full workflow (image → ad draft)
- Config load/save
- Vision backend switching
```

### E2E Tests (Playwright)
```
- UI interaction
- Form filling
- Screenshot verification
```

## Migration Path (Minimal Disruption)

### Option A: Dual Build (Recommended)
- Keep CLI version working
- Add Electron version alongside
- Users choose which to use
- Shared business logic

```bash
npm run dev:cli        # Terminal version
npm run dev:electron   # Desktop version
npm run build:all      # Both distributions
```

### Option B: Gradual Replacement
1. Release Electron as beta
2. Gather feedback
3. Deprecate CLI version after stabilization
4. Move CLI code to legacy/ folder

## Performance Considerations

### Prevent UI Freezing
- Use Web Workers for image processing
- Stream logs in real-time (don't load all at once)
- Debounce config saves

### Memory Management
- Unload unused vision backends
- Limit log file size
- Cache parsed configs

### Battery/CPU
- Respect reduced motion settings
- Implement idle detection
- Offer "light mode" for delays (no human-like behavior)

## Security Considerations

### Preload Script Whitelist
```typescript
// Only expose safe IPC methods
contextBridge.exposeInMainWorld('api', {
  config: { load, save },
  ad: { create },
  browser: { getStatus },
  dialog: { selectFolder },
});

// Never expose:
// - require()
// - process
// - fs directly
// - exec()
```

### Sensitive Data
- API keys stored in .env (never in localStorage)
- Images processed locally (never sent to server)
- Logs sanitized (no API keys in logs)

### Sandboxing
```typescript
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: PRELOAD_SCRIPT_PATH,
    sandbox: true,
    contextIsolation: true,
    enableRemoteModule: false,
    nodeIntegration: false,
  },
});
```

## Recommended Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Refactoring | 1 week | Orchestrator + ConfigManager |
| 2. IPC Bridge | 1 week | Electron main + preload |
| 3. UI Development | 2 weeks | React components + integration |
| 4. Testing | 1 week | Unit + E2E tests |
| 5. Build Setup | 1 week | Webpack + electron-builder |
| 6. Release | 1 week | Beta release + feedback |
| **Total** | **~7 weeks** | Production-ready Electron app |

## Success Criteria

- [ ] All business logic works identically in Electron
- [ ] UI responsive and intuitive
- [ ] Configuration persists correctly
- [ ] Progress updates real-time in UI
- [ ] Error messages helpful and actionable
- [ ] Browser status detection working
- [ ] Screenshots visible in app
- [ ] Logs accessible in app
- [ ] Works on Windows/Mac/Linux
- [ ] < 200MB download size
- [ ] < 300MB RAM during operation

## Future Enhancements

1. **Batch Processing**
   - Process multiple ad folders in queue
   - Schedule periodic submissions

2. **Draft Management**
   - List saved drafts from kleinanzeigen.de
   - Edit/delete drafts from app
   - Preview before publication

3. **Analytics**
   - Track successful ads
   - Monitor backend API costs
   - Performance metrics

4. **Cloud Sync** (Optional)
   - Sync config across devices
   - Cloud storage for images/drafts

5. **Mobile Companion**
   - React Native companion app
   - Start ad creation from phone
   - Monitor from anywhere

## References

- [Electron Documentation](https://www.electronjs.org/docs)
- [IPC Best Practices](https://www.electronjs.org/docs/tutorial/ipc)
- [Webpack 5 Guide](https://webpack.js.org/guides/)
- [React TypeScript Handbook](https://react-typescript-cheatsheet.netlify.app/)

---

**Ready to begin? Start with Phase 1 by creating `src/core/orchestrator.ts`**
