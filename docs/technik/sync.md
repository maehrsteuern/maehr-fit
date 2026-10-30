# Abgleich Handy ↔ Rechner: Protokoll und Bedrohungsmodell

> **Kernaussage.** Handy und Rechner teilen sich nach dem Koppeln einen geheimen Schlüssel, den nur diese beiden kennen. Mit ihm
> unterschreibt das Handy jede Sendung; der Rechner nimmt nur Sendungen an, die richtig unterschrieben, höchstens fünf Minuten
> alt und noch nie dagewesen sind. Ist am Rechner die Erweiterung `cryptography` installiert, wird der Inhalt zusätzlich
> verschlüsselt – **ohne sie ist er nur unterschrieben, nicht verschlüsselt**: Wer im selben WLAN mitliest, könnte die Messwerte
> dann lesen, aber nicht verändern. Alles bleibt im Heimnetz; kein Dienst im Internet ist beteiligt.

Beteiligte Dateien: `daten/sync.js` (Handy, Browser), `desktop/mf_dienst.py` (Rechner), `shell/apps/sync.js` (Ansicht),
`shell/speicher_server.js` (App am Rechner liest/schreibt die Datenbank), Tests `tests/node/daten_sync.test.mjs`,
`tests/python/test_dienst.py`, gemeinsame Beispiele `daten/fixtures/sync_interop.json` (erzeugt von der Python-Seite).

## Drei Wege hinein

| Weg | Wann | Schutz |
|---|---|---|
| 1. Handy schickt über WLAN (`POST /api/sync`) | Handy und Rechner im selben Heimnetz | Unterschrift (immer) + Verschlüsselung (wenn `cryptography`) |
| 2. Verschlüsselte Datei im geteilten Ordner (`.mfx`) | kein gemeinsames WLAN, Cloud-Ordner vorhanden | Passwort → PBKDF2 → AES-256-GCM (Cloud-Anbieter sieht nur Zufallsbytes) |
| 3. WHOOP-Export (`.zip`/`.csv`) im Eingangsordner | Datenexport von WHOOP per E-Mail | wie der Ordner selbst (WHOOP liefert unverschlüsselt) |

## Koppeln
1. Rechner erzeugt Gerät `g` + 12 Hex-Zeichen und Schlüssel **K = 32 Zufallsbytes** (`secrets.token_bytes`), gültig 10 Minuten.
2. QR-Inhalt: `MF-KOPPLUNG:` + base64url(JSON) mit `{ v: 1, host, port, geraet_id, schluessel: base64url(K), ablauf: Unix-ms, name }`.
3. Handy (`syncEinrichten`) prüft Code und Ablauf, fragt `GET /api/status` (muss `app: "maehr-fit-dienst"` sagen) und schickt eine
   leere, unterschriebene Sendung `{ messungen: [] }`. Erst damit gilt die Kopplung am Rechner (`gekoppelt_am`). Unbestätigte
   Kopplungen verfallen nach 10 Minuten und werden gelöscht.
4. Beide zeigen den **Fingerabdruck** = erste 8 Hex-Zeichen von SHA-256(K) zum Vergleich.

Speicherorte: Handy `sync:kopplung` (Speicher der App), Rechner Tabelle `geraete` in `~/.maehrfit/mf.sqlite`. Der Rechner muss
K selbst kennen, um Unterschriften zu prüfen (ein Hash allein genügt dafür nicht); `schluessel_hash` dient nur dem Fingerabdruck.
Geschützt ist K durch die Dateirechte (600) der Datenbank.

## Unterschrift jeder Anfrage

```
kanonisch  = METHODE "\n" PFAD_MIT_ABFRAGE "\n" ZEIT "\n" hex(SHA-256(KÖRPER))
X-MF-Geraet   = geraet_id
X-MF-Zeit     = ZEIT (Unix-Millisekunden, Uhr des Handys)
X-MF-Signatur = hex(HMAC-SHA256(K, kanonisch))      Kleinbuchstaben
```
Beispiel (erfunden, `daten/fixtures/sync_interop.json`): K = Bytes 01…20, `POST`, `/api/sync`, Zeit `1793350800000` →
Signatur `2a24b4ba…38af`. Das Handy rechnet SHA-256/HMAC ohne WebCrypto (eigene Umsetzung nach FIPS 180-4/RFC 2104 in
`daten/sync.js`, geprüft gegen `node:crypto` und RFC 4231), damit es überall gleich und testbar ist.

Prüfung am Rechner (`pruefe_anfrage`), in dieser Reihenfolge:
1. alle drei Kopfzeilen da, Zeit lesbar;
2. |Rechnerzeit − ZEIT| ≤ **5 Minuten** (sonst 401 `uhrzeit`; genau 5:00 min ist noch gültig);
3. Gerät bekannt; unbestätigte Kopplung nicht abgelaufen;
4. HMAC gleich (Vergleich in konstanter Zeit, `hmac.compare_digest`);
5. **Wiederholschutz:** die Unterschrift wird in Tabelle `nonces` gemerkt; dieselbe Unterschrift noch einmal → 409 `wiederholt`.
   Einträge älter als 10 Minuten werden gelöscht (älter kann eine Anfrage wegen Schritt 2 ohnehin nicht sein).

Das Handy unterschreibt bei jeder Wiederholung neu (neue Zeit) – darum stört der Wiederholschutz echte Wiederholungen nach
Netzfehlern nicht.

## Verschlüsselung der Sendung (wenn möglich)
- Der Rechner meldet in `GET /api/status` → `verschluesselung: ["aes-256-gcm"]`, wenn `cryptography` installiert ist.
- Das Handy verschlüsselt nur, wenn es selbst WebCrypto hat (sichere Umgebung: App, `https`, `127.0.0.1`).
- Schlüssel: **K_aes = HMAC-SHA256(K, "mf-verschluesselung")** (nie derselbe Schlüssel für Unterschrift und Verschlüsselung).
- Körper: `{ "iv": base64url(12 Zufallsbytes), "daten": base64url(AES-256-GCM(K_aes, iv, JSON, Zusatzdaten = geraet "\n" ZEIT)) }`.
  Die Zusatzdaten binden den Inhalt an Gerät und Zeit; die Unterschrift läuft über den verschlüsselten Körper.
- Ob und warum nicht verschlüsselt wurde, steht im Stand (`ohneVerschluesselung: "rechner" | "geraet"`) und in der Sync-Ansicht.

## Sendungen und Stand
- Handy: `syncJetzt` vergleicht je Speicher-Schlüssel `messung:<art>:<tag>` den Fingerabdruck (SHA-256 des JSON) mit dem Stand
  `sync:stand` und schickt **alle Messwerte der geänderten Tage**, in Stapeln zu höchstens **500**. Bis zu 3 Versuche je Stapel
  (Pausen 1 s, 4 s) bei Netzfehler, 5xx oder 409; bei 401/403/400 sofort Abbruch mit Meldung. Der Stand wird erst gesetzt, wenn
  alle Stapel angekommen sind – ein Abbruch führt beim nächsten Mal zu einer Wiederholung, die der Rechner als „schon da“ erkennt.
- Rechner: `{ messungen: [{ art, tag, daten }] }`; gleiche `(art, quelle.id)` ersetzt den alten Datensatz (wie `daten/ablage.js`,
  dort je Tag). Antwort `{ ok, neu, ersetzt, ungueltig, zeit }`.

## Wege des Dienstes

| Weg | Wer | Zweck |
|---|---|---|
| `GET /` | alle | `MF.html`; am Rechner mit Sitzungsschlüssel `<meta name="mf-dienst">` und `connect-src 'self'` |
| `GET /api/status` | alle | App, Version, Protokoll, Zeit, Verschlüsselung; am Rechner zusätzlich Zähler |
| `POST /api/sync` | gekoppeltes Gerät (Unterschrift) | Messwerte abliefern |
| `GET /api/messungen?seit=<iso\|ms>&art=&von=&bis=` | Gerät oder App am Rechner | Messwerte seit einer Änderungszeit |
| `GET /api/export` | Gerät oder App am Rechner (`?token=`) | ZIP mit `maehr-fit-export.json` |
| `DELETE /api/geraet` | Gerät selbst | sich entkoppeln |
| `/api/speicher/{liste,alle,wert,alles}`, `/api/geraete`, `/api/koppeln`, `/api/eingang` | nur App am Rechner (`X-MF-Lokal`) | Speicher-Schnittstelle, Geräte, QR-Code, Eingangsordner |

## Ordner-Weg: `.mfx`-Datei
```json
{ "format": "maehr-fit-mfx", "version": 1,
  "kdf": { "name": "PBKDF2", "hash": "SHA-256", "iterationen": 600000, "salz": "<16 Bytes base64url>" },
  "chiffre": { "name": "AES-GCM", "iv": "<12 Bytes base64url>" },
  "daten": "<AES-256-GCM(Schlüssel, iv, JSON der Sicherung, Zusatzdaten \"maehr-fit-mfx:1\")>" }
```
Schlüssel = PBKDF2-HMAC-SHA256(Passwort, Salz, 600 000 Runden, 32 Bytes) – Rundenzahl nach OWASP Password Storage Cheat Sheet
(2023). Der Rechner liest 1 000 bis 10 000 000 Runden (weniger nur in Tests). Inhalt: `{ format: "maehr-fit-export", version: 1,
erstelltMs, eintraege: { "messung:…": [...], "tagebuch:…": {...} } }`. Das Passwort hinterlegt man am Rechner einmal mit
`mf_dienst.py passwort` (Datei mit Rechten 600) oder über die Umgebungsvariable `MF_ORDNER_PASSWORT`.

## Bedrohungsmodell (ehrlich)

| Angreifer / Lage | Was er kann | Was ihn hindert |
|---|---|---|
| Fremdes Gerät im Heimnetz schickt Daten | nichts | ohne K keine gültige Unterschrift (401) |
| Mitlauscher im WLAN, **mit** `cryptography` | sieht, dass und wann gesendet wird, und die Größe | Inhalt AES-GCM-verschlüsselt |
| Mitlauscher im WLAN, **ohne** `cryptography` | **liest die Messwerte mit** | nur Unterschrift: er kann nichts ändern oder einschleusen |
| Mitlauscher spielt eine Sendung erneut ein | nichts | Zeitfenster 5 min + gemerkte Unterschrift (409) |
| Jemand fängt den QR-Code ab (Foto, Bildschirm) | kann sich innerhalb von 10 min an Stelle des Handys koppeln | kurze Gültigkeit, Fingerabdruck vergleichen, Gerät in der Liste entfernen |
| Gefälschte Antwort „angekommen“ im WLAN | Handy glaubt, es sei gesendet | Daten bleiben auf dem Handy; Antworten sind (noch) nicht unterschrieben – offener Punkt |
| Webseite im Browser am Rechner greift auf `127.0.0.1:8765` zu | nichts | API am Rechner nur mit Sitzungsschlüssel aus der ausgelieferten Seite; Host-Prüfung gegen DNS-Rebinding; keine CORS-Freigabe |
| Zugriff aus dem Internet | nichts, solange der Router Port 8765 nicht weiterleitet | Dienst lauscht nur auf `127.0.0.1` und der Heimnetz-Adresse; Absender außerhalb privater Netze → 403 |
| Anderer Benutzer am selben Rechner | kann `127.0.0.1:8765/` öffnen und erhält damit den Sitzungsschlüssel | Ein Rechner = ein Benutzer vorausgesetzt; Datenbank selbst nur für dich lesbar |
| Cloud-Anbieter des geteilten Ordners | sieht `.mfx`-Dateien (Zufallsbytes) und WHOOP-ZIPs **im Klartext** | `.mfx` verschlüsselt; WHOOP-Exporte besser direkt in `~/.maehrfit/eingang/` legen |
| Diebstahl des Rechners | liest `mf.sqlite` und die Kopplungsschlüssel | Festplattenverschlüsselung (FileVault/BitLocker/LUKS) einschalten |

Es gibt kein TLS im Heimnetz (ein selbst signiertes Zertifikat müsste jedes Handy einzeln vertrauen); die Unterschrift ersetzt die
Echtheitsprüfung, `cryptography` die Vertraulichkeit.

## Handy: was noch eingestellt werden muss
- **CSP:** `shell/index.html` erlaubt `connect-src 'none'`. Die Android-App erreicht den Rechner deshalb nur, wenn ihre Anfragen nicht
  über die WebView laufen: Empfehlung `plugins: { CapacitorHttp: { enabled: true } }` in `capacitor.config.ts` (Capacitor leitet
  `fetch` dann nativ; CSP, gemischte Inhalte und CORS greifen nicht – **am echten Gerät prüfen**). Alternative: CSP `connect-src 'self' http:` und
  `android.allowMixedContent: true` – breiter, darum nicht empfohlen. Am Rechner setzt der Dienst `connect-src 'self'` selbst.
- **Kamera** zum Scannen: `BarcodeDetector` + Kamerarecht in `AndroidManifest.xml` (`android.permission.CAMERA`); ohne beides
  bleibt das Einfügen des Code-Texts.
- **Download der `.mfx`-Datei** in der Android-App: ein `<a download>` reicht in der WebView meist nicht; später über
  `@capacitor/filesystem` + Teilen-Dialog.

## Fixtures neu erzeugen
- `python3 tests/python/erzeuge_fixture_sync.py` → `daten/fixtures/sync_interop.json` (nur bei Protokolländerung).
- `node tests/node/whoop_erwartet_erzeugen.mjs` → `daten/fixtures/whoop_erwartet.json` (nach Änderungen an `daten/csv_import.js`;
  danach muss `desktop/whoop_csv.py` nachziehen, bis `python3 -m pytest tests/python` grün ist).
