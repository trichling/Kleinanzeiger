# Schnellstart-Anleitung

## 🚀 In 5 Minuten loslegen

### 1. Setup (einmalig)

```bash
# Projekt klonen (falls noch nicht geschehen)
cd Kleinanzeiger

# Setup ausführen
./setup.sh

# .env bearbeiten und API-Key eintragen
# ANTHROPIC_API_KEY=dein-api-key-hier
```

### 2. Brave Browser starten

**macOS:**
```bash
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser --remote-debugging-port=9222
```

**Windows (PowerShell):**
```powershell
& "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222
```

**Linux:**
```bash
brave-browser --remote-debugging-port=9222
```

### 3. Bei kleinanzeigen.de einloggen

1. Öffne im gestarteten Brave Browser: https://www.kleinanzeigen.de
2. Logge dich manuell ein
3. Lasse den Browser offen

### 4. Produktbilder vorbereiten

Erstelle einen Ordner mit deinen Produktbildern:

```bash
mkdir -p products/mein-produkt
# Kopiere deine Bilder in products/mein-produkt/
```

### 5. Kleinanzeige erstellen

```bash
# Virtual Environment aktivieren (falls nicht aktiv)
source venv/bin/activate  # Windows: venv\Scripts\activate

# Kleinanzeige erstellen
python -m src.main \
  --image-folder ./products/mein-produkt \
  --postal-code 10115
```

## 💡 Tipps

### Gute Produktbilder
- ✅ Mehrere Perspektiven (Front, Seite, Details)
- ✅ Gute Beleuchtung
- ✅ Klarer Hintergrund
- ✅ Nahaufnahmen von wichtigen Features

### Preis überschreiben
```bash
python -m src.main \
  --image-folder ./products/laptop \
  --postal-code 10115 \
  --price 450
```

### Debug-Modus
```bash
# In config/settings.yaml:
logging:
  level: "DEBUG"  # Mehr Details in den Logs
```

## 🔍 Troubleshooting

### "Browser nicht verbunden"
- ✅ Brave mit `--remote-debugging-port=9222` gestartet?
- ✅ Port 9222 frei? → `lsof -i :9222` (Mac/Linux)

### "ANTHROPIC_API_KEY nicht gefunden"
- ✅ `.env` Datei existiert?
- ✅ API-Key eingetragen?
- ✅ Virtual Environment aktiviert?

### "Keine Bilder gefunden"
- ✅ Bildordner-Pfad korrekt?
- ✅ Unterstützte Formate? (jpg, jpeg, png, webp)
- ✅ Bilder im Ordner? → `ls products/mein-produkt`

## 📂 Beispiel-Workflow

```bash
# 1. Setup (einmalig)
./setup.sh
nano .env  # API-Key eintragen

# 2. Browser starten
brave --remote-debugging-port=9222 &

# 3. Produktbilder organisieren
mkdir -p products/gaming-laptop
cp ~/Desktop/laptop*.jpg products/gaming-laptop/

# 4. Virtual Environment aktivieren
source venv/bin/activate

# 5. Anzeige erstellen
python -m src.main \
  --image-folder ./products/gaming-laptop \
  --postal-code 10115 \
  --price 750

# 6. Logs prüfen
tail -f logs/kleinanzeiger.log
```

## 📊 Was passiert im Hintergrund?

1. 🖼️ **Bildanalyse**: Claude Vision analysiert alle Bilder
2. 📝 **Info-Extraktion**: Produkt, Zustand, Marke, Features
3. 🏷️ **Kategorie**: Automatische Zuordnung
4. ✍️ **Content**: Titel (max 65 Zeichen) + Beschreibung
5. 🌐 **Browser**: Verbindung zu Brave via CDP
6. 📋 **Formular**: Ausfüllen mit menschlichen Verzögerungen
7. 💾 **Entwurf**: Speichern (NICHT veröffentlichen)

## ✅ Checkliste vor dem Start

- [ ] Python 3.11+ installiert
- [ ] Brave Browser installiert
- [ ] Anthropic API Key vorhanden
- [ ] `.env` Datei mit API-Key erstellt
- [ ] Dependencies installiert (`./setup.sh`)
- [ ] Brave mit CDP gestartet
- [ ] Bei kleinanzeigen.de eingeloggt
- [ ] Produktbilder vorbereitet

---

**Viel Erfolg! 🎉**

Bei Fragen: Siehe `README.md` oder öffne ein Issue.
