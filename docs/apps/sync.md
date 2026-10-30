# Sync (`#/sync`)

**Kernaussage.** Hier verbindest du dein Handy mit dem MAEHR-FIT-Programm auf deinem Rechner. Einmal den QR-Code scannen, danach
schickt das Handy auf Knopfdruck alle neuen Messwerte über dein WLAN zum Rechner. Ohne gemeinsames WLAN geht es über eine
verschlüsselte Datei in einem geteilten Ordner. Am Rechner siehst du hier, welche Handys verbunden sind und was zuletzt ankam.

Datei: `shell/apps/sync.js` (Stile `shell/design/design_sync.css`, Texte `sync_*` in `shell/i18n/i18n.js`). Technik und
Bedrohungsmodell: `docs/technik/sync.md`; Programm am Rechner: `docs/technik/desktop.md`.

## Zwei Gesichter

Die Ansicht erkennt selbst, wo sie läuft: Ist der Speicher der Dienst am Rechner (`shell/speicher_server.js`, `art: "rechner"`),
zeigt sie die **Rechner-Seite**, sonst die **Handy-Seite**. Der Zustand wird nach dem Zeichnen geladen; bis dahin sagt die
Kernaussage „Die Verbindung wird geprüft …“.

### Handy

| Zustand | Kernaussage | Karten |
|---|---|---|
| nicht gekoppelt | „Dein Handy ist noch mit keinem Rechner verbunden. …“ | **Mit dem Rechner koppeln**: „QR-Code scannen“ (nur mit `BarcodeDetector` und Kamera), sonst Hinweis; Feld „Code-Text“ + „Koppeln“ |
| gekoppelt, noch nie abgeglichen | „… Tippe auf „Jetzt abgleichen“ …“ | **Verbindung**: Rechner (Adresse:Port), Fingerabdruck, Schutz; „Jetzt abgleichen“, „Entkoppeln“ mit Rückfrage |
| gekoppelt | „Dein Handy und dein Rechner sind verbunden; zuletzt **vor 12 Minuten**, **48** neue Messwerte.“ | wie oben; letzter Fehler als Hinweis |
| immer | – | **Export für Ordner-Sync**: Passwort (≥ 8 Zeichen) → `maehr-fit-<datum>.mfx` herunterladen |

Die beiden Zahlen der Kernaussage sind Knöpfe mit Beleg: `sync:zuletzt` (Zeitpunkt, Rechner, Fingerabdruck) und `sync:neu`
(geschickt, neu für den Rechner, schon da, verschlüsselt ja/nein). Quelle im Beleg: Art „Abgleich“, Kennung = Gerät, Ort = Adresse.

„Schutz“ sagt in Worten, was beim letzten Abgleich galt: „unterschrieben und verschlüsselt“, „nur unterschrieben – der Rechner
kann nicht verschlüsseln (dort „cryptography“ installieren)“ oder „nur unterschrieben – dieses Gerät kann hier nicht
verschlüsseln“ (Seite über `http` im WLAN geöffnet, ohne WebCrypto).

### Rechner

| Bereich | Inhalt |
|---|---|
| Kernaussage | „1 Handy ist mit diesem Rechner verbunden; zuletzt vor 1 Stunde, 48 neue Messwerte.“ (Zahlen mit Beleg `sync:geraete`, `sync:zuletzt`, `sync:neu`) |
| Neues Handy koppeln | Name, „QR-Code zeigen“ → QR-Bild (wenn `qrcode` installiert ist, immer auf hellem Grund), Code-Text, gültig bis, Fingerabdruck; „Fertig“ |
| Gekoppelte Handys | Name, zuletzt / wartet bis, Fingerabdruck, „Entkoppeln“ je Zeile |
| Eingangsordner | Pfad, letzte fünf Dateien mit „55 neu, 0 schon da“ bzw. Fehler, „Jetzt nachsehen“ |

## Aktionen

| Knopf | Ruft | Meldung |
|---|---|---|
| QR-Code scannen | Kamera (`getUserMedia`, Rückkamera) + `BarcodeDetector` alle 250 ms, bis ein `MF-KOPPLUNG:`-Code erkannt ist | „Gekoppelt mit 192.168.178.20. Fingerabdruck ae216c2e – er muss am Rechner gleich lauten.“ |
| Koppeln | `syncEinrichten(text, { speicher })` | wie oben, oder der Fehler in einem Satz (abgelaufen, kein Rechner, …) |
| Jetzt abgleichen | `syncJetzt({ speicher })` | „Fertig: 60 Messwerte geschickt, davon 48 neu für den Rechner.“ |
| Entkoppeln → Ja | `syncEntkoppeln({ speicher })` | „Entkoppelt.“ bzw. „Auf dem Handy entkoppelt. Der Rechner war nicht erreichbar – entferne das Gerät dort auch.“ |
| Verschlüsselte Datei herunterladen | `exportInhalt` + `mfxErstellen` (`daten/sync.js`) | „Datei erstellt (42 Tage und Einträge). Lege sie in den geteilten Ordner.“ |
| QR-Code zeigen (Rechner) | `POST /api/koppeln` | QR + Code-Text |
| Entkoppeln (Rechner) | `DELETE /api/geraete?id=` | „Entkoppelt.“ |
| Jetzt nachsehen (Rechner) | `POST /api/eingang` | „2 neue Dateien bearbeitet.“ |

Während eine Aktion läuft, sind alle Knöpfe gesperrt; danach wird die Ansicht neu gezeichnet und die Meldung steht in der
Statuszeile der Karte (`role="status"`, `aria-live="polite"`).

## Einbindung in die Shell (noch offen, Datei gehört der Shell)
- `shell/shell.js`: `import * as sync from "./apps/sync.js";`, `sync` in `APPS` und in `ZU_MEHR`; Speicher über `speicherServer()`.
- `shell/apps/mehr.js`: Eintrag `{ id: "sync", titel: "sync_titel", text: "mehr_sync_text" }` (Symbol z. B. `IKON.daten`).
- `shell/index.html`: `<link rel="stylesheet" href="design/design_sync.css">` vor `design_mobil.css`.
- Demo-Chip: `sync` in die Liste der Sichten ohne Chip aufnehmen (wie `daten`).

## Prüfung
`tests/node/daten_sync.test.mjs`: genau eine Kernaussage und jeder Zahl-Knopf mit Beleg in allen Zuständen, DE und EN; keine
offenen Platzhalter. Im Browser geprüft (390 px hell, 360 px dunkel, 1280 px): kein waagrechter Überlauf, keine Konsolenfehler.
