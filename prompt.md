Ich möchte einen Python-basierten AI-Agent entwickeln, der automatisch Kleinanzeigen aus Produktbildern erstellt. 

Projektstruktur:
- Verwende Python 3.11+ mit asyncio
- Hauptbibliotheken: playwright, anthropic (für Claude API), Pillow, pydantic
- Erstelle eine modulare Architektur mit separaten Komponenten für Bildanalyse, Content-Generierung und Browser-Automation

Kernfunktionalität:
1. ProductAnalyzer-Klasse: Nimmt einen Ordnerpfad, analysiert alle Bilder mit Claude Vision API, extrahiert Produktinformationen
2. ContentGenerator-Klasse: Generiert aus Produktinfos einen Kleinanzeigen-konformen Titel (max 65 Zeichen), Beschreibung und Preisvorschlag
3. KleinanzeigenAutomator-Klasse: Verbindet sich über CDP an laufenden Brave Browser (Port 9222), navigiert kleinanzeigen.de, füllt Anzeigenformular aus

Wichtige Details:
- Der Agent soll im bestehenden Brave-Browser einen neuen Tab öffnen
- Login erfolgt manuell, danach speichert der Agent die Session
- Alle Anzeigen werden als "Nur Abholung" mit PLZ-basiertem Standort erstellt
- Die Anzeige wird nur als Entwurf gespeichert, nicht veröffentlicht
- Implementiere ausführliches Logging und Screenshot-Funktionalität
- Nutze realistische Delays und menschenähnliche Interaktionen

Verwende Type Hints und erstelle eine config.yaml für alle Einstellungen. Der Code soll production-ready sein mit proper error handling. Implentiere Unit-Tests für alle Hauptkomponenten. Implementiere eine CLI mit argparse für die Eingabeparameter (z.B. Bildordner, PLZ, Kategorie). Implementiere die gesamte Lösung in einem Git-Repository mit einer README.md, die Installations- und Nutzungshinweise enthält.

Hier ist ein Vorschlag für die Organisation des Codes:

```
kleinanzeiger/
├── src/
│   ├── vision/
│   │   ├── analyzer.py      # Bildanalyse
│   │   └── models.py        # Datenmodelle
│   ├── content/
│   │   ├── generator.py     # Text-Generierung
│   │   └── categories.py    # Kategorie-Mapping
│   ├── automation/
│   │   ├── browser.py       # Browser-Controller
│   │   ├── kleinanzeigen.py # Seiten-spezifische Logik
│   │   └── actions.py       # UI-Interaktionen
│   └── main.py              # Hauptprogramm
├── config/
│   ├── settings.yaml        # Konfiguration
│   └── categories.json      # Kategorie-Cache
├── logs/                    # Logs und Screenshots
└── requirements.txt
```