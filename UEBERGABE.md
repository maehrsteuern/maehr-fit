# Übergabe MAEHR FIT (MF)

> **Kernaussage.** MAEHR FIT ist eine persönliche Gesundheits-App nach dem Vorbild der MAEHR BUSINESS SUITE: Sie zeigt jeden
> Morgen, wie erholt man ist, wie stark der Tag belastet hat und wie gut der Schlaf war – mit eigenen, offengelegten Formeln
> statt einer Blackbox. Die Messwerte kommen vom WHOOP-Band, entweder über Health Connect auf dem Android-Handy oder aus dem
> WHOOP-Datenexport. Alles bleibt auf dem Gerät; die App gibt keinen medizinischen Rat.


> **Stand 30.10.2026 (Ende der ersten Sitzung).** Phase 1 und 2 sind gebaut und gepusht (Zweig `ccr-1cfdd73f-uziuf7`): Rechenkern mit
> Formeldatei, Oberfläche im dunklen Kleid „Nacht“ (Barlow Condensed, leuchtender Erholungsring, Hypnogramm), Live-Puls über Bluetooth,
> Vergleich mit WHOOP, Health-Connect- und CSV-Import, Rechner-Dienst in Python (`desktop/mf_dienst.py`) mit WLAN-Abgleich.
> 242 Node-Tests und 30 Python-Tests grün. Noch nie am echten Band, Handy oder Rechner geprüft. Nächste Schritte: APK bauen
> (`docs/technik/android.md`), Rechner-Dienst einrichten (`docs/technik/desktop.md`), 30+ Formelwerte mit `pruefen: true` abnehmen.

## 1. Stand (30.10.2026)

| Bereich | Stand |
|---|---|
| Kern (`kern/`): Erholung, Belastung, Schlaf, Basislinie, Trends, Formeln mit Fundstelle | in Arbeit (parallel) |
| Oberfläche (`shell/`), Offline-Datei `MF.html` | in Arbeit (parallel) |
| Datenschicht (`daten/`): Health Connect, WHOOP-CSV/ZIP, Ablage ohne Doppelte | fertig, getestet |
| Android-Hülle (`android/`, Capacitor 6, Health-Connect-Plugin) | fertig geschrieben, **noch nie gebaut** (kein Android SDK in der Cloud) |
| APK auf Loris' Handy | offen – Anleitung und Cowork-Prompt in `docs/technik/android.md` |

## 2. Ordnerkarte

| Ordner / Datei | Inhalt |
|---|---|
| `kern/` | Rechenlogik ohne DOM, Netz, Speicher; Formeln in `kern/formeln/formeln.json` |
| `shell/` | Oberfläche: Sichten in `shell/apps/`, Texte in `shell/i18n/`, Stile in `shell/design/`, Diagramme in `shell/viz/` |
| `daten/` | Messwerte holen: `healthconnect.js`, `csv_import.js`, `zip.js`, `zeit.js`, `ablage.js`, `verbinden.js`, `bruecke_capacitor.js` |
| `daten/fixtures/` | erfundene Beispieldaten (Musterperson) für Tests |
| `android/` | Android-Projekt; eigenes Plugin in `android/plugins/healthconnect/` |
| `tests/node/` | Tests (`node:test`) |
| `docs/technik/` | `schnittstellen.md` (Datenformen), `daten.md`, `healthconnect.md`, `android.md` |
| `docs/STATUS.md` | Statusliste |
| `bau.py` | baut `MF.html` |

## 3. Bauen und testen

```bash
npm test                    # alle Tests (node --test tests/node/*.test.mjs)
python3 bau.py              # MF.html neu bauen
npm install                 # einmalig: Capacitor
npm run android:sync        # MF.html → dist/index.html → Android-Projekt
npx cap open android        # Android Studio → Build → Build APK(s)
```

Hinweis: `node --test tests/node` (Ordner als Argument) funktioniert ab Node 22 nicht mehr; deshalb `npm test` bzw. das Muster
`tests/node/*.test.mjs`.

## 4. Offen

1. **APK bauen** auf Loris' Rechner (`docs/technik/android.md`, Cowork-Prompt am Ende).
2. **Am echten Handy prüfen, was WHOOP nach Health Connect schreibt** – Herzratenvariabilität und Hauttemperatur sind nicht
   belegt. Fehlen sie, kommt die HRV nur über den CSV-Export (`docs/technik/healthconnect.md`).
3. **Spaltennamen des WHOOP-Exports** mit einem echten Export abgleichen (`docs/technik/daten.md`, „Was bestätigt ist“).
4. **Auslegungen** (Loris): Tag eines Tagebucheintrags, Basis der Hauttemperatur aus CSV, Schlaf ohne Stufenangabe
   (`docs/technik/daten.md`, letzter Abschnitt).
5. **Shell ↔ Datenschicht**: Die Shell muss `installiereBruecke(window)` und `installiere(window, { speicher })` beim Start
   aufrufen und die Arten `spo2`, `hauttemp`, `fremdwerte` mit übernehmen.
6. **Play Store** (später): verlangt targetSdk 35 → Wechsel auf Capacitor 7/8 und connect-client 1.1.0.
