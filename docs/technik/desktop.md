# MAEHR FIT am Rechner (`desktop/mf_dienst.py`)

> **Kernaussage.** Ein kleines Python-Programm läuft still auf deinem Rechner und zeigt dieselbe App wie auf dem Handy im
> Browser. Es sammelt alle Messwerte in einer Datei in deinem Benutzerordner. Neue Werte kommen auf drei Wegen an: vom
> gekoppelten Handy über dein WLAN, als verschlüsselte Datei aus einem geteilten Cloud-Ordner oder als WHOOP-Export, den du in
> den Eingangsordner legst. Nichts geht ins Internet.

## Auf einen Blick

| Frage | Antwort |
|---|---|
| Was muss installiert sein? | Python ab 3.10. Sonst nichts. Freiwillig: `cryptography`, `pystray` + `Pillow`, `qrcode` (siehe unten). |
| Wo läuft die App? | `http://127.0.0.1:8765/` im Browser. Öffnet sich beim Start von selbst. |
| Wo liegen meine Daten? | `~/.maehrfit/` (Windows: `C:\Users\<Name>\.maehrfit\`): `mf.sqlite` (alles), `eingang/`, `mf_dienst.log`, `einstellungen.json`. |
| Welche Ports? | 8765 auf `127.0.0.1` (nur dieser Rechner) und auf der Heimnetz-Adresse (z. B. `192.168.178.20`) für das Handy. |
| Wer darf rein? | Am Rechner nur die App, die der Dienst selbst ausliefert (Sitzungsschlüssel). Aus dem WLAN nur gekoppelte Handys mit gültiger Unterschrift. Siehe `docs/technik/sync.md`. |

## Einrichten in 5 Schritten

### macOS
1. Python prüfen: Terminal öffnen, `python3 --version` (≥ 3.10; sonst von python.org installieren).
2. Repo holen: `git clone https://github.com/maehrsteuern/maehr-fit.git ~/maehr-fit` (oder vorhandenen Ordner nehmen).
3. Erweiterungen (empfohlen): `cd ~/maehr-fit && python3 -m pip install --user cryptography pystray Pillow qrcode`.
4. Starten: `python3 desktop/mf_dienst.py` – der Browser öffnet MAEHR FIT; beim ersten Mal fragt macOS evtl., ob Python
   eingehende Verbindungen annehmen darf: **Erlauben** (sonst erreicht das Handy den Rechner nicht).
5. Autostart: `python3 desktop/mf_dienst.py --autostart einrichten` (LaunchAgent `~/Library/LaunchAgents/de.maehrsteuern.maehrfit.plist`).

### Windows
1. Python von python.org installieren, Haken **„Add python.exe to PATH“** setzen. Prüfen: `py --version`.
2. Repo holen (GitHub Desktop oder `git clone …` nach `C:\Users\<Name>\maehr-fit`).
3. Erweiterungen: `py -m pip install cryptography pystray Pillow qrcode tzdata`.
4. Starten: `py desktop\mf_dienst.py`. Die Windows-Firewall fragt: **Private Netzwerke** erlauben, öffentliche nicht.
5. Autostart: `py desktop\mf_dienst.py --autostart einrichten` (Datei `maehr-fit.cmd` im Autostart-Ordner, startet mit
   `pythonw` ohne Fenster). Alternative über die Aufgabenplanung: `--autostart einrichten --autostart-art schtasks`.

### Linux
1. `python3 --version` (≥ 3.10).
2. Repo holen: `git clone … ~/maehr-fit`.
3. Erweiterungen: `python3 -m pip install --user cryptography qrcode` (Taskleiste: zusätzlich `pystray Pillow`).
4. Starten: `python3 desktop/mf_dienst.py`. Firewall (z. B. `ufw`): `sudo ufw allow from 192.168.0.0/16 to any port 8765 proto tcp`.
5. Autostart: `python3 desktop/mf_dienst.py --autostart einrichten` (systemd-Benutzerdienst
   `~/.config/systemd/user/maehr-fit.service`, aktiviert mit `systemctl --user enable --now`). Damit er ohne Anmeldung läuft:
   `loginctl enable-linger $USER`.

Entfernen geht überall mit `--autostart entfernen`.

## Handy koppeln
- Am Rechner in der App: **Mehr → Sync → „QR-Code zeigen“**, oder im Terminal: `python3 desktop/mf_dienst.py koppeln --name "Mein Handy"`.
- Auf dem Handy: **Mehr → Sync → „QR-Code scannen“** (oder den Code-Text einfügen). Der Code gilt **10 Minuten**.
- Beide zeigen danach denselben **Fingerabdruck** (8 Zeichen). Stimmt er nicht überein: entkoppeln und neu koppeln.

## Befehle

| Befehl | Wirkung |
|---|---|
| `mf_dienst.py` | starten (Browser, Taskleisten-Symbol, Eingangsordner) |
| `--kein-browser`, `--kein-tray` | ohne Browser bzw. ohne Symbol (Autostart nutzt beides) |
| `--port 8766` | anderer Port (wenn 8765 belegt ist) |
| `--lan-adresse 192.168.178.20` / `aus` / `0.0.0.0` | Heimnetz-Adresse festlegen, abschalten oder auf allen Netzen lauschen |
| `--html PFAD` | andere `MF.html` ausliefern (Standard: `MF.html` im Repo, Kopie in `~/.maehrfit/MF.html`) |
| `--eingang ORDNER` | Eingangsordner (Standard `~/.maehrfit/eingang/`), z. B. ein Ordner in iCloud Drive / OneDrive |
| `--daten-ordner ORDNER` | statt `~/.maehrfit` (auch über Umgebungsvariable `MF_DATEN`) |
| `koppeln`, `geraete`, `entkoppeln ID` | Handys verwalten |
| `importieren DATEI …` | WHOOP-ZIP/CSV, `.mfx` oder `.json` sofort einlesen |
| `exportieren ZIEL.zip` | Sicherung aller Messwerte |
| `passwort` | Passwort für `.mfx`-Dateien hinterlegen (Datei `~/.maehrfit/ordner_passwort`, nur für dich lesbar) |
| `status` | kurzer Zustand |

Dauerhafte Einstellungen in `~/.maehrfit/einstellungen.json`, z. B.
`{"port": 8765, "lan_adresse": "192.168.178.20", "eingang": "~/Library/Mobile Documents/com~apple~CloudDocs/MAEHR FIT", "eingang_takt_s": 30}`.

## Freiwillige Erweiterungen

| Paket | Wofür | Ohne |
|---|---|---|
| `cryptography` | Sendungen vom Handy zusätzlich **verschlüsseln** (AES-256-GCM); `.mfx`-Dateien lesen | Sendungen sind nur **unterschrieben**, nicht verschlüsselt (Hinweis in der App und im Protokoll); `.mfx` bleibt liegen, bis es installiert ist |
| `pystray` + `Pillow` | Symbol in der Taskleiste (Öffnen, Handy koppeln, Beenden) | beenden mit Strg+C bzw. über den Autostart |
| `qrcode` | QR-Code im Terminal und in der Sync-Ansicht | Code-Text zum Einfügen |
| `tzdata` (nur Windows) | Zeitzonen wie `Europe/Berlin` in CSV-Dateien | WHOOP schreibt `UTC+01:00` – das geht auch ohne |

## Eingangsordner
Der Dienst sieht alle 30 Sekunden in den Eingangsordner und liest neue Dateien ein, sobald sich ihre Größe nicht mehr ändert
(Cloud-Programme schreiben oft in Stücken). Er **verschiebt und löscht nichts** – ein geteilter Ordner bleibt, wie er ist. Gelesen
werden: WHOOP-Export (`.zip` oder einzelne `.csv`, gleiche Spaltenlogik wie die App: `desktop/whoop_csv.py` ↔
`daten/csv_import.js`), `.mfx` (verschlüsselter Export vom Handy) und `.json` (Sicherung der App). Was schon da ist (gleiche
Kennung), wird erkannt und nicht verdoppelt. Ergebnis je Datei: App → Sync → „Eingangsordner“, und `~/.maehrfit/mf_dienst.log`.

## Sicherung
- Alles steckt in **einer Datei**: `~/.maehrfit/mf.sqlite`. Zum Sichern den Dienst beenden und die Datei kopieren, oder im
  laufenden Betrieb `python3 desktop/mf_dienst.py exportieren ~/Sicherung/maehr-fit.zip` (ZIP mit JSON im Format der App).
- Wiederherstellen: die JSON-Datei aus dem ZIP in den Eingangsordner legen.
- Die Datenbank enthält die Kopplungsschlüssel der Handys; sie ist nur für deinen Benutzer lesbar (macOS/Linux: Rechte 600).
  Eine Sicherung gehört deshalb nicht in einen fremden oder öffentlichen Ordner.

## Was die Shell noch braucht
`shell/shell.js` wählt den Speicher mit `speicherServer()` aus `shell/speicher_server.js`: Wird die App vom Dienst ausgeliefert,
liest und schreibt sie über `/api/speicher/…` in die SQLite-Datei; als Datei geöffnet oder auf dem Handy bleibt alles wie bisher
(IndexedDB). Die Sync-Ansicht heißt `#/sync` (`shell/apps/sync.js`).

## Cowork-Prompt: Dienst auf Loris' Mac oder PC einrichten

```text
Richte auf diesem Rechner den MAEHR-FIT-Dienst ein und prüfe ihn. Sprich Deutsch mit mir, erkläre jeden Schritt in einem Satz.

1. Stelle fest, ob dies ein Mac oder ein Windows-PC ist, und ob Python ≥ 3.10 installiert ist (`python3 --version` bzw. `py --version`).
   Fehlt es: führe mich durch die Installation von python.org (Windows: Haken „Add python.exe to PATH“).
2. Hole oder aktualisiere das Repo maehrsteuern/maehr-fit in meinen Benutzerordner (Ordner `maehr-fit`), Zweig `main`.
   Ändere nichts am Repo und committe nichts.
3. Installiere die Erweiterungen nur für meinen Benutzer: `python3 -m pip install --user cryptography pystray Pillow qrcode`
   (Windows: `py -m pip install cryptography pystray Pillow qrcode tzdata`).
4. Prüfe die Tests: `python3 -m pytest tests/python -q` (vorher ggf. `pip install --user pytest`). Melde das Ergebnis.
5. Starte den Dienst einmal von Hand: `python3 desktop/mf_dienst.py`. Bestätige, dass sich der Browser mit MAEHR FIT öffnet und dass
   `http://127.0.0.1:8765/api/status` „maehr-fit-dienst“ meldet. Fragt die Firewall, erlaube nur private Netzwerke und sag mir Bescheid.
6. Richte den Autostart ein: `python3 desktop/mf_dienst.py --autostart einrichten` und zeig mir die Meldung.
   (Windows: `py desktop\mf_dienst.py --autostart einrichten`.)
7. Frag mich, ob der Eingangsordner in einem Cloud-Ordner liegen soll (iCloud Drive, OneDrive, Google Drive). Wenn ja: lege dort den
   Ordner „MAEHR FIT“ an und trage ihn in `~/.maehrfit/einstellungen.json` als "eingang" ein. Für .mfx-Dateien: lass mich mit
   `python3 desktop/mf_dienst.py passwort` das Passwort selbst eintippen – lies es nicht mit und schreib es nirgends auf.
8. Koppeln: Öffne in der App Mehr → Sync → „QR-Code zeigen“ und sag mir, dass ich ihn jetzt mit dem Handy scannen soll
   (gültig 10 Minuten). Prüfe danach unter „Gekoppelte Handys“, dass das Handy erscheint und der Fingerabdruck auf beiden Geräten gleich ist.
9. Fasse zum Schluss zusammen: Adresse im Heimnetz, Port, Datenordner, Eingangsordner, ob Verschlüsselung aktiv ist, was offen blieb.
Lies keine Gesundheitsdaten aus und schicke nichts davon irgendwohin.
```
