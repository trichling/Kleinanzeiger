# Kleinanzeiger 🤖

Ein Python-basierter AI-Agent, der automatisch Kleinanzeigen aus Produktbildern erstellt.

## ✨ Features

- 🖼️ **Flexible Bildanalyse** mit mehreren AI-Backends:
  - **BLIP-2** (lokal, kostenlos) - Keine API-Keys nötig!
  - **Claude Vision** (Anthropic) - Beste Qualität
  - **GPT-4 Vision** (OpenAI) - Sehr gut
  - **Gemini Vision** (Google) - Kosteneffizient
- 📝 **Intelligente Content-Generierung** mit mehreren Backends:
  - **Simple** (Template-basiert, kostenlos) - Keine API-Keys nötig!
  - **Claude** (Anthropic) - Beste Text-Qualität
  - **Gemini** (Google) - Kosteneffizient
  - **GPT-4** (OpenAI) - Sehr gut
- 🔄 **Unabhängige Backend-Auswahl** für Vision und Content
- 🌐 **Browser-Automation** via Chrome DevTools Protocol (CDP)
- 🎯 **Kategorie-Erkennung** für kleinanzeigen.de
- 🤖 **Menschenähnliche Interaktionen** mit realistischen Verzögerungen
- 📊 **Ausführliches Logging** und Screenshot-Funktionalität
- 💾 **Entwurf-Modus** - Anzeigen werden nur gespeichert, nicht veröffentlicht

## 🏗️ Projektstruktur

```
kleinanzeiger/
├── src/
│   ├── vision/
│   │   ├── analyzer.py      # Bildanalyse mit Claude Vision
│   │   └── models.py        # Pydantic-Datenmodelle
│   ├── content/
│   │   ├── generator.py     # Text-Generierung
│   │   └── categories.py    # Kategorie-Mapping
│   ├── automation/
│   │   ├── browser.py       # Browser-Controller (CDP)
│   │   ├── kleinanzeigen.py # Kleinanzeigen.de-Logik
│   │   └── actions.py       # UI-Interaktionen
│   └── main.py              # CLI-Hauptprogramm
├── config/
│   ├── settings.yaml        # Konfiguration
│   └── categories.json      # Kategorie-Cache
├── tests/                   # Unit-Tests
├── logs/                    # Logs und Screenshots
└── requirements.txt
```

## 📋 Voraussetzungen

- Python 3.11 oder höher
- Brave Browser (oder Chromium-basierter Browser)
- **Vision Backend (wähle einen):**
  - **BLIP-2** (lokal, kostenlos) - Empfohlen für Tests ⭐
  - **Claude** (Anthropic API Key) - Beste Qualität
  - **OpenAI** (OpenAI API Key) - Sehr gut
  - **Gemini** (Google API Key) - Kosteneffizient

📖 **Siehe [VISION_BACKENDS.md](VISION_BACKENDS.md) für Details zu allen Backends**

## 🚀 Installation

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd Kleinanzeiger
   ```

2. **Virtuelle Umgebung erstellen**
   ```bash
   pyenv virtualenv 3.12.0 kleinanzeiger
   pyenv install 3.12.0
   pyenv local kleinanzeiger
   ```

3. **Dependencies installieren**
   ```bash
   pip install -r requirements.txt
   ```

4. **Playwright Browser installieren**
   ```bash
   playwright install chromium
   ```

5. **Vision Backend konfigurieren**
   
   **Option A: BLIP-2 (Kostenlos, lokal)** - Empfohlen zum Starten
   ```yaml
   # In config/settings.yaml
   vision:
     backend: "blip2"
   ```
   Keine API-Keys nötig! Lädt beim ersten Start automatisch das Modell (~15GB).

   **Option B: Claude (Beste Qualität)**
   ```bash
   # In .env
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
   ```yaml
   # In config/settings.yaml
   vision:
     backend: "claude"
   ```

   **Option C: OpenAI oder Gemini**
   ```bash
   # In .env (wähle einen)
   OPENAI_API_KEY=sk-your-key-here
   GEMINI_API_KEY=your-key-here
   ```
   ```yaml
   # In config/settings.yaml
   vision:
     backend: "openai"  # oder "gemini"
   ```

   📖 **Details zu allen Backends:** [VISION_BACKENDS.md](VISION_BACKENDS.md)

## 🎯 Verwendung

### 1. Brave Browser vorbereiten

Starte Brave mit aktiviertem Remote Debugging:

**Bash (macOS/Linux):**
```bash
# macOS
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --remote-debugging-port=9222

# Linux
brave-browser --remote-debugging-port=9222
```

**PowerShell (macOS/Windows):**
```powershell
# macOS
& "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --remote-debugging-port=9222

# Windows
& "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222
```

### 2. Bei kleinanzeigen.de einloggen

- Öffne kleinanzeigen.de im gestarteten Brave Browser
- Logge dich manuell ein
- Die Session wird vom Agent verwendet

### 3. Kleinanzeige erstellen

```bash
python -m src.main --image-folder ./products/laptop --postal-code 10115
```

#### Optionale Parameter

```bash
# Mit Preisüberschreibung
python -m src.main --image-folder ./products/bike --postal-code 80331 --price 150

# Als Entwurf speichern (Standard)
python -m src.main --image-folder ./products/sofa --postal-code 20095 --draft
```

### Beispielaufruf

```bash
python -m src.main \
  --image-folder ./products/gaming-laptop \
  --postal-code 10115 \
  --price 850
```

## ⚙️ Konfiguration

Die Konfiguration erfolgt über `config/settings.yaml`:

### Backend-Auswahl

Das Projekt verwendet **zwei separate Backends**:

1. **Vision Backend** (Bildanalyse): Analysiert die Produktbilder
2. **Content Backend** (Text-Generierung): Erstellt Titel und Beschreibungen

Beide können unabhängig voneinander konfiguriert werden:

```yaml
# Bildanalyse-Backend
vision:
  backend: "gemini"  # 'claude', 'gemini', 'openai', 'blip2'

# Text-Generierungs-Backend
content:
  backend: "gemini"  # 'claude', 'gemini', 'openai', 'simple'
```

**Empfohlene Konfigurationen:**

| Szenario | Vision Backend | Content Backend | API Keys benötigt |
|----------|----------------|-----------------|-------------------|
| **Kostenlos (lokal)** | `blip2` | `simple` | Keine |
| **Beste Qualität** | `claude` | `claude` | ANTHROPIC_API_KEY |
| **Günstig** | `gemini` | `gemini` | GEMINI_API_KEY |
| **Gemischt** | `blip2` | `gemini` | GEMINI_API_KEY |

### Weitere Einstellungen

```yaml
# Browser-Konfiguration
browser:
  cdp_url: "http://localhost:9222"
  timeout: 30000

# Kleinanzeigen-Einstellungen
kleinanzeigen:
  base_url: "https://www.kleinanzeigen.de"
  shipping_type: "PICKUP"
  draft_mode: true
```

## 📂 Bildordner vorbereiten

Lege deine Produktbilder in einem Ordner ab:

```
products/
├── laptop/
│   ├── front.jpg
│   ├── keyboard.jpg
│   └── ports.jpg
├── bike/
│   ├── full.jpg
│   └── details.jpg
├── phone/
│   ├── IMG_1234.heic  # HEIC files werden automatisch konvertiert
│   └── IMG_1235.heic
```

**Unterstützte Formate:**
- Direkt: `.jpg`, `.jpeg`, `.png`, `.webp`
- **Automatische Konvertierung**: `.heic`, `.heif` (z.B. iPhone-Fotos) → werden zu `.jpg` konvertiert

**Hinweis:** HEIC-Dateien (typisch von iPhones) werden beim Laden automatisch zu JPEG konvertiert und im gleichen Ordner gespeichert.

## 🧪 Tests ausführen

```bash
# Alle Tests
pytest

# Mit Coverage
pytest --cov=src

# Spezifischer Test
pytest tests/test_categories.py
```

## 📝 Workflow

1. **Bildanalyse**: Gewähltes Vision-Backend analysiert alle Bilder im Ordner
2. **Produktinfo-Extraktion**: Name, Beschreibung, Zustand, Marke, Preis
3. **Kategorie-Mapping**: Automatische Zuordnung zu kleinanzeigen.de-Kategorien
4. **Content-Generierung**: Gewähltes Content-Backend erstellt optimierten Titel und Beschreibung
5. **Browser-Automation**: Verbindung zum laufenden Brave Browser via CDP
6. **Formular-Ausfüllung**: Menschenähnliche Eingaben mit Verzögerungen
7. **Entwurf speichern**: Anzeige als Entwurf speichern (nicht veröffentlichen)

## 🔒 Sicherheit

- ✅ Nur Entwürfe werden erstellt (keine automatische Veröffentlichung)
- ✅ Manuelle Login-Session wird verwendet
- ✅ Keine Passwörter im Code
- ✅ API-Keys via Umgebungsvariablen
- ✅ Ausführliches Logging für Nachvollziehbarkeit

## 📊 Logging

Logs werden in `logs/kleinanzeiger.log` geschrieben.
Screenshots bei Fehlern: `logs/screenshots/error_*.png`

```python
# Log-Level in config/settings.yaml anpassen
logging:
  level: "INFO"  # DEBUG, INFO, WARNING, ERROR
```

## 🛠️ Troubleshooting

### Browser verbindet nicht
- Stelle sicher, dass Brave mit `--remote-debugging-port=9222` gestartet wurde
- Prüfe, ob Port 9222 frei ist: `lsof -i :9222` (macOS/Linux)

### Claude API Fehler
- Prüfe `ANTHROPIC_API_KEY` in `.env`
- Verifiziere API-Guthaben unter console.anthropic.com

### Kategorie nicht gefunden
- Passe `config/categories.json` an
- Füge Keywords hinzu

### Selektoren nicht gefunden
- kleinanzeigen.de könnte HTML geändert haben
- Passe Selektoren in `automation/kleinanzeigen.py` an

## 📚 Dependencies

- **playwright**: Browser-Automation
- **Pillow**: Bildverarbeitung
- **pillow-heif**: HEIC/HEIF Bildformat-Unterstützung (iPhone-Fotos)
- **pydantic**: Datenvalidierung
- **PyYAML**: Konfiguration
- **anthropic**: Claude API Client (optional, je nach Backend)
- **google-generativeai**: Gemini API Client (optional, je nach Backend)
- **openai**: OpenAI API Client (optional, je nach Backend)
- **torch/transformers**: BLIP-2 lokales Modell (optional, je nach Backend)

## 🤝 Beitragen

1. Fork das Repository
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

## ⚖️ Lizenz

Dieses Projekt ist für den persönlichen Gebrauch bestimmt. Bitte beachte die Nutzungsbedingungen von kleinanzeigen.de.

## ⚠️ Haftungsausschluss

Dieses Tool ist für Bildungszwecke und persönlichen Gebrauch gedacht. Die Nutzung erfolgt auf eigene Verantwortung. Bitte beachte die Nutzungsbedingungen und Richtlinien von kleinanzeigen.de.

## 📧 Support

Bei Fragen oder Problemen öffne ein Issue im Repository.

---

**Viel Erfolg beim Erstellen deiner Kleinanzeigen! 🎉**
