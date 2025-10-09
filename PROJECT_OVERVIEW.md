# Kleinanzeiger - Projektübersicht

## 📁 Vollständige Projektstruktur

```
kleinanzeiger/
├── .env.example              # Vorlage für Umgebungsvariablen
├── .gitignore               # Git-Ignore-Regeln
├── README.md                # Hauptdokumentation
├── QUICKSTART.md            # Schnellstart-Anleitung
├── requirements.txt         # Python-Dependencies
├── pytest.ini               # pytest-Konfiguration
├── setup.sh                 # Setup-Script
│
├── config/
│   ├── settings.yaml        # Hauptkonfiguration
│   └── categories.json      # Kategorie-Definitionen
│
├── src/
│   ├── __init__.py
│   ├── main.py              # CLI-Hauptprogramm
│   │
│   ├── vision/              # Bildanalyse-Komponenten
│   │   ├── __init__.py
│   │   ├── analyzer.py      # ProductAnalyzer (Claude Vision)
│   │   └── models.py        # Pydantic-Datenmodelle
│   │
│   ├── content/             # Content-Generierung
│   │   ├── __init__.py
│   │   ├── generator.py     # ContentGenerator
│   │   └── categories.py    # CategoryMapper
│   │
│   └── automation/          # Browser-Automation
│       ├── __init__.py
│       ├── browser.py       # BrowserController (CDP)
│       ├── kleinanzeigen.py # KleinanzeigenAutomator
│       └── actions.py       # UIActions (human-like)
│
└── tests/                   # Unit-Tests
    ├── __init__.py
    ├── test_models.py
    └── test_categories.py
```

## 🎯 Kernkomponenten

### 1. Vision-Modul (`src/vision/`)

#### `analyzer.py` - ProductAnalyzer
- **Aufgabe**: Analysiert Produktbilder mit Claude Vision API
- **Features**:
  - Unterstützt JPG, PNG, WEBP
  - Automatisches Resizing großer Bilder
  - Base64-Encoding für API
  - Extraktion von: Name, Beschreibung, Zustand, Marke, Preis, Features

#### `models.py` - Datenmodelle
- **ProductInfo**: Produkt-Informationen aus Bildanalyse
- **AdContent**: Generierter Anzeigen-Content
- **BrowserConfig**: Browser-Konfiguration
- **AnthropicConfig**: API-Konfiguration
- **DelaysConfig**: Verzögerungs-Einstellungen
- **VisionConfig**: Bild-Verarbeitungs-Einstellungen

### 2. Content-Modul (`src/content/`)

#### `generator.py` - ContentGenerator
- **Aufgabe**: Generiert optimierte Anzeigen-Inhalte
- **Features**:
  - Titel-Generierung (max 65 Zeichen)
  - Beschreibungs-Verbesserung mit Claude
  - Preis-Vorschläge
  - Kleinanzeigen-optimierter Schreibstil

#### `categories.py` - CategoryMapper
- **Aufgabe**: Ordnet Produkte zu kleinanzeigen.de-Kategorien zu
- **Features**:
  - Keyword-basiertes Matching
  - Hierarchische Kategorie/Subkategorie-Struktur
  - Fallback zu "Sonstiges"

### 3. Automation-Modul (`src/automation/`)

#### `browser.py` - BrowserController
- **Aufgabe**: Verbindung zum Browser via CDP
- **Features**:
  - CDP-Verbindung zu laufendem Brave Browser
  - Context- und Page-Management
  - Screenshot-Funktionalität
  - Error-Handling mit Screenshots

#### `kleinanzeigen.py` - KleinanzeigenAutomator
- **Aufgabe**: Kleinanzeigen.de-spezifische Automation
- **Features**:
  - Navigation zu Post-Ad-Seite
  - Login-Status-Check
  - Kategorie-Auswahl
  - Formular-Ausfüllung
  - Bild-Upload
  - Entwurf-Speicherung

#### `actions.py` - UIActions
- **Aufgabe**: Menschenähnliche UI-Interaktionen
- **Features**:
  - Realistische Tipp-Verzögerungen
  - Human-like Clicks
  - Scroll-Behavior
  - Random Delays

### 4. Main-Modul (`src/main.py`)

- **CLI mit argparse**
- **Workflow-Orchestrierung**:
  1. Config laden
  2. Logging einrichten
  3. Produktbilder analysieren
  4. Kategorie zuordnen
  5. Content generieren
  6. Browser-Automation durchführen
  7. Screenshot bei Erfolg/Fehler

## 🔧 Konfiguration

### `config/settings.yaml`
```yaml
anthropic:        # Claude API-Einstellungen
browser:          # CDP/Browser-Einstellungen
kleinanzeigen:    # Plattform-spezifisch
content:          # Content-Generierung
delays:           # Human-like Verzögerungen
logging:          # Log-Konfiguration
vision:           # Bildverarbeitung
```

### `config/categories.json`
- Kategorie-Hierarchie für kleinanzeigen.de
- Keywords für automatisches Matching
- Subcategory-Mappings

## 🧪 Tests

### `tests/test_models.py`
- Pydantic-Modell-Validierung
- Preis-Validierung
- PLZ-Validierung
- Titel-Längen-Check

### `tests/test_categories.py`
- Kategorie-Mapping-Logik
- Keyword-Matching
- Subcategory-Erkennung
- Fallback-Verhalten

## 🚀 Verwendung

### Setup
```bash
./setup.sh
```

### Anzeige erstellen
```bash
# 1. Brave starten
brave --remote-debugging-port=9222

# 2. Bei kleinanzeigen.de einloggen

# 3. Agent starten
python -m src.main \
  --image-folder ./products/laptop \
  --postal-code 10115 \
  --price 500
```

## 📊 Datenfluss

```
Produktbilder
    ↓
[ProductAnalyzer]
    ↓ (ProductInfo)
[CategoryMapper]
    ↓ (Category/Subcategory)
[ContentGenerator]
    ↓ (AdContent)
[BrowserController] → Brave Browser (CDP)
    ↓
[KleinanzeigenAutomator] → kleinanzeigen.de
    ↓
Entwurf gespeichert ✅
```

## 🔐 Sicherheit

- ✅ Nur Entwurf-Modus (keine automatische Veröffentlichung)
- ✅ Manuelle Login-Session
- ✅ API-Keys via Umgebungsvariablen
- ✅ Keine Passwörter im Code
- ✅ Ausführliches Logging

## 📝 Logging

**Log-Dateien:**
- `logs/kleinanzeiger.log` - Hauptlog
- `logs/screenshots/error_*.png` - Fehler-Screenshots
- `logs/screenshots/success.png` - Erfolgs-Screenshot

**Log-Level:** DEBUG, INFO, WARNING, ERROR

## 🛠️ Dependencies

### Core
- **playwright** (1.40.0) - Browser-Automation
- **anthropic** (0.8.1) - Claude API
- **Pillow** (10.1.0) - Bildverarbeitung
- **pydantic** (2.5.0) - Datenvalidierung
- **PyYAML** (6.0.1) - Config-Parsing

### Testing
- **pytest** (7.4.3)
- **pytest-asyncio** (0.21.1)
- **pytest-cov** (4.1.0)

### Dev Tools
- **black** (23.12.1) - Code-Formatierung
- **flake8** (6.1.0) - Linting
- **mypy** (1.7.1) - Type-Checking

## 🎯 Features

✅ **Automatische Bildanalyse** mit Claude Vision  
✅ **Intelligente Content-Generierung**  
✅ **Kategorie-Erkennung**  
✅ **Browser-Automation** via CDP  
✅ **Menschenähnliche Interaktionen**  
✅ **Ausführliches Logging**  
✅ **Screenshot-Funktionalität**  
✅ **Entwurf-Modus** (sichere Vorschau)  
✅ **Type-Hints** (Python 3.11+)  
✅ **Unit-Tests**  
✅ **Modulare Architektur**  
✅ **Error-Handling**  

## 📚 Nächste Schritte

1. ✅ Projekt ist vollständig implementiert
2. ⚙️ Setup durchführen: `./setup.sh`
3. 🔑 API-Key in `.env` eintragen
4. 🚀 Erste Anzeige erstellen
5. 🔧 Selektoren anpassen falls nötig (kleinanzeigen.de HTML)
6. 🎨 Kategorien erweitern in `categories.json`
7. 📈 Feedback sammeln und optimieren

## 💡 Tipps für die Nutzung

### Beste Ergebnisse
- Mehrere klare Produktbilder (3-5)
- Gute Beleuchtung
- Verschiedene Perspektiven
- Nahaufnahmen von Details

### Customization
- Kategorien: `config/categories.json`
- Delays: `config/settings.yaml` → `delays`
- Prompts: `src/vision/analyzer.py`, `src/content/generator.py`

### Debugging
- Log-Level auf DEBUG setzen
- Screenshots in `logs/screenshots/` prüfen
- Browser-DevTools öffnen (F12)

---

**Status: ✅ Vollständig implementiert und dokumentiert**
