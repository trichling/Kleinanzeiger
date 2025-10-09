# Kleinanzeiger 🤖

Ein Python-basierter AI-Agent, der automatisch Kleinanzeigen aus Produktbildern erstellt.

## ✨ Features

- 🖼️ **Automatische Bildanalyse** mit Claude Vision API
- 📝 **Intelligente Content-Generierung** für Titel und Beschreibungen
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
- Anthropic API Key (Claude)

## 🚀 Installation

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd Kleinanzeiger
   ```

2. **Virtuelle Umgebung erstellen**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Unter Windows: venv\Scripts\activate
   ```

3. **Dependencies installieren**
   ```bash
   pip install -r requirements.txt
   ```

4. **Playwright Browser installieren**
   ```bash
   playwright install chromium
   ```

5. **Umgebungsvariablen setzen**
   
   Erstelle eine `.env` Datei im Projektroot:
   ```env
   ANTHROPIC_API_KEY=your-api-key-here
   ```

## 🎯 Verwendung

### 1. Brave Browser vorbereiten

Starte Brave mit aktiviertem Remote Debugging:

```bash
# macOS
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser --remote-debugging-port=9222

# Windows
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222

# Linux
brave-browser --remote-debugging-port=9222
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

```yaml
# API-Konfiguration
anthropic:
  api_key: ${ANTHROPIC_API_KEY}
  model: "claude-3-5-sonnet-20241022"

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
```

Unterstützte Formate: `.jpg`, `.jpeg`, `.png`, `.webp`

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

1. **Bildanalyse**: Claude Vision analysiert alle Bilder im Ordner
2. **Produktinfo-Extraktion**: Name, Beschreibung, Zustand, Marke, Preis
3. **Kategorie-Mapping**: Automatische Zuordnung zu kleinanzeigen.de-Kategorien
4. **Content-Generierung**: Optimierter Titel (max. 65 Zeichen) und Beschreibung
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
- **anthropic**: Claude API Client
- **Pillow**: Bildverarbeitung
- **pydantic**: Datenvalidierung
- **PyYAML**: Konfiguration

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
