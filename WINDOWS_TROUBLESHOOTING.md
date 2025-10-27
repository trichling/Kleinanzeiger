# Windows-Troubleshooting für Brave Browser Verbindung

## Problem
Auf Windows gibt der Befehl zum Starten von Brave sofort zurück, und die Remote-Debugging-Verbindung funktioniert nicht:

```
ERROR: Error during automation: connect ECONNREFUSED 127.0.0.1:9222
```

## Ursache
Unter Windows:
1. **Bestehende Brave-Instanzen** blockieren den Debug-Port
2. Der `&` Operator startet den Prozess falsch (gibt sofort zurück)
3. Der Port 9222 wird möglicherweise nicht freigegeben

## ✅ Lösung 1: Helper-Script (EMPFOHLEN)

Verwende das mitgelieferte PowerShell-Script:

```powershell
.\start-brave-windows.ps1
```

Das Script:
- ✅ Schließt alle bestehenden Brave-Instanzen
- ✅ Startet Brave korrekt mit Remote Debugging
- ✅ Testet die Verbindung automatisch
- ✅ Gibt dir Feedback, ob alles funktioniert

## ✅ Lösung 2: Manuelle Schritte

### Schritt 1: Alle Brave-Instanzen schließen
```powershell
Stop-Process -Name "brave" -Force -ErrorAction SilentlyContinue
```

### Schritt 2: Kurz warten
```powershell
Start-Sleep -Seconds 2
```

### Schritt 3: Brave mit Remote Debugging starten
```powershell
Start-Process "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" -ArgumentList "--remote-debugging-port=9222"
```

### Schritt 4: Verbindung testen
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:9222/json/version" -UseBasicParsing
```

Du solltest eine JSON-Antwort mit Browser-Informationen sehen.

## ✅ Lösung 3: Separates Browser-Profil (wenn du Brave offen lassen willst)

```powershell
Start-Process "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$env:TEMP\brave-automation"
```

Dies startet eine komplett separate Brave-Instanz mit eigenem Profil.

## 🔍 Diagnose-Befehle

### Port 9222 prüfen
```powershell
Get-NetTCPConnection -LocalPort 9222 -ErrorAction SilentlyContinue
```

Wenn ein Ergebnis kommt, ist der Port bereits belegt.

### Brave-Prozesse anzeigen
```powershell
Get-Process -Name "brave" -ErrorAction SilentlyContinue
```

### CDP-Verbindung testen
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:9222/json/version" -UseBasicParsing | Select-Object -ExpandProperty Content
```

Erwartete Ausgabe:
```json
{
   "Browser": "Chrome/141.0.7390.122",
   "Protocol-Version": "1.3",
   "webSocketDebuggerUrl": "ws://127.0.0.1:9222/devtools/browser/..."
}
```

## ⚠️ Häufige Fehler

### "Stop-Process: Cannot find a process with the name 'brave'"
→ Normal, wenn Brave nicht läuft. `-ErrorAction SilentlyContinue` unterdrückt diese Warnung.

### "Invoke-WebRequest: Unable to connect"
→ Brave ist nicht mit Remote Debugging gestartet oder der Port ist blockiert.

### PowerShell-Execution-Policy-Fehler
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🚀 Kompletter Workflow (Windows)

```powershell
# 1. Brave starten
.\start-brave-windows.ps1

# 2. Bei kleinanzeigen.de einloggen (im Brave Browser)
# https://www.kleinanzeigen.de

# 3. Python Virtual Environment aktivieren
.\venv\Scripts\Activate.ps1

# 4. Script ausführen
python -m src.main --image-folder ./products/mein-produkt --postal-code 10115
```

## 📊 Unterschiede Mac vs. Windows

| Aspekt | macOS | Windows |
|--------|-------|---------|
| **Browser starten** | `&` funktioniert | Muss `Start-Process` verwenden |
| **Prozess-Verhalten** | Bleibt im Vordergrund | Gibt sofort zurück |
| **Port-Blockierung** | Seltener | Häufiger durch bestehende Instanzen |
| **Pfad** | `/Applications/...` | `C:\Program Files\...` |

## ✅ Checkliste

Wenn die Verbindung nicht funktioniert:

- [ ] Alle Brave-Instanzen geschlossen?
- [ ] Port 9222 frei? (`Get-NetTCPConnection -LocalPort 9222`)
- [ ] Brave mit `Start-Process` gestartet?
- [ ] 5-10 Sekunden gewartet nach dem Start?
- [ ] CDP-Endpoint erreichbar? (`Invoke-WebRequest http://127.0.0.1:9222/json/version`)
- [ ] Firewall blockiert Port 9222 nicht?
- [ ] Bei kleinanzeigen.de eingeloggt?

## 🆘 Immer noch Probleme?

1. **Firewall prüfen**: Windows Defender Firewall könnte Port 9222 blockieren
2. **Antivirus**: Manche Antivirus-Programme blockieren Remote Debugging
3. **Alternativer Port**: Versuche `--remote-debugging-port=9223` und passe `config/settings.yaml` an
4. **Chrome verwenden**: Funktioniert auch mit Google Chrome statt Brave

---

**Nach diesen Schritten sollte die Verbindung funktionieren! 🎉**
