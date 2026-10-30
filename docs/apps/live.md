# Live-Puls

**Kernaussage.** „Live-Puls“ zeigt deinen Puls in Echtzeit, direkt vom WHOOP-Band oder einem anderen Pulsmesser. Du verbindest das
Band, startest die Aufzeichnung und siehst groß den Puls, die Pulszone, die Belastung der Einheit und die Dauer. Mit „Beenden“
wird die Einheit als Training gespeichert, und der Tag wird neu gerechnet. Ohne Bluetooth zeigt ein Demo-Puls, wie es aussieht –
erfundene Werte werden nie gespeichert.

## Wege hinein

- **Belastung** → Knopf „Training live aufzeichnen“ (`#/live?von=belastung`, auch an Tagen ohne Messwerte).
- **Atem** → Knopf „Puls live ansehen“ unter der Übungsliste (`#/live?von=atem`); der Zurück-Link führt jeweils dorthin.
- Eingehängt über `shell/live.js` (`liveEinhaengen(APPS)`), eine Zeile Import und eine Zeile Aufruf am Ende von `shell/shell.js`.

## Aufbau (Ein Blick → Gliederung → Beleg)

1. **Kernaussage** (ein Satz): mit Bluetooth „Hier siehst du deinen Puls in Echtzeit …“, ohne Bluetooth eine ruhige Erklärung,
   wo es geht (Chrome am Rechner, Chrome auf Android, Android-App) und dass der Demo-Puls es zeigt.
2. **Verbindung** (Karte): Status mit Punkt und Wort (nicht verbunden · Suche · verbunden mit „WHOOP 4A2B“ · Verbindung verloren –
   neuer Versuch (n) · Fehler), Knöpfe „Band verbinden“ (nur mit Bluetooth), „Demo-Puls“, „Trennen“; solange nichts verbunden ist,
   der Hinweis auf WHOOPs „Heart Rate Broadcast“.
3. **Heldenzahl**: Puls jetzt in Fraunces (`--t-held`), darunter die Zone als Pille („Zone 3“, „unter Zone 1“). Fehlen Höchst-
   oder Ruhepuls, sagt ein Satz das statt einer Zone.
4. **Kacheln** (höchstens drei): Belastung 0–21, Dauer als Uhr „m:ss“, Kurz-HRV in ms (nur wenn das Band RR-Abstände sendet; sonst
   ein Satz, dass es ohne sie keine Kurz-HRV gibt).
5. **Steuerung**: „Aufzeichnung starten“ → „Pause“/„Weiter“, „Beenden“. Starten geht erst mit Verbindung.
6. **Ergebnis** nach „Beenden“: gespeichert mit Dauer und Belastung und Knopf „Training ansehen“; unter einer Minute
   (`live.training.min_ms`) nichts; beim Demo-Puls „Probelauf … nicht gespeichert“.
7. **Diagramme** (über `shell/viz/viz.js`): `verlauf()` – Puls der letzten 3 Minuten als ruhige Linie mit „zuletzt / tiefster /
   höchster“ als Zahl-Knöpfe; `segmentbalken()` – Zeit je Zone der Aufzeichnung.

Jede Zahl ist ein `button.zahl` mit `data-q` und Beleg: `live:puls` (Formel `live.formel_puls`, Uhrzeit, RR-Abstände, Quelle
`ble`), `live:zone` (Karvonen, Höchst-/Ruhepuls, Grenzen), `live:belastung` (Formel `belastung`, Zonenzeiten, alle Herzschläge),
`live:dauer`, `live:hrv` (`live.hrv_kurz`, gültige Differenzen, verworfene Abstände), `live:verlauf`, `live:verlauf-min|max`,
`live:zone-ms:<z>`.

## Rechnen (`kern/live.js`, Tür `shell/kern_live.js`)

- `zoneVon(bpm, { maxPuls, ruhepuls })` – dieselbe Regel wie die Tagesbelastung (`kern/belastung.js`, keine eigenen Grenzen).
- `laufendeBelastung(neue, einstellungen, zustand)` – Schritt für Schritt; Ergebnis gleich `belastung()` über die ganze Reihe.
- `hrvKurz(rr, fenster)` – RMSSD der letzten 60 RR-Abstände nach dem Artefaktfilter (300–2000 ms, Sprung ≤ 20 %).
- Höchstpuls: Einstellung, sonst aus dem Alter (Tanaka 2001); Ruhepuls: Messung des heutigen Tages, sonst Mittel der Basislinie,
  sonst `einstellungen.ruhepuls`.

## Speichern

- Herzschläge laufend über `daten/ble_puls.js` → alle 10 s `messung:herzschlag:<tag>` (Kennung `<Gerät>:<t>`, nie doppelt), auch
  ohne laufende Aufzeichnung – es sind Messwerte. Datensatz: `{ t, bpm, rrMs, quelle: { art: "ble", id } }`.
- „Beenden“: Training `{ von, bis, art: "sonst", herzschlaege, quelle: { art: "ble", id: "live:<Gerät>:<von>" } }` nach
  `messung:training:<tag>`, dann `MF.shell.neuLaden()`. Im Tag zählen die Herzschläge im Training zum Training, die übrigen zum Alltag.
- Demo-Puls: nichts im Speicher.

## Zustand

Die Verbindung (`shell/puls.js`) und die Aufzeichnung (Modul `shell/apps/live.js`) bleiben beim Wechsel der Ansicht bestehen. Die
Uhr läuft über `requestAnimationFrame` gegen `performance.now()`, Pausen werden abgezogen; kein Intervall-Zeitgeber.

## Offen

- Trainingsart wählen (jetzt immer „Training“/`sonst`).
- Wer nur Live-Daten hat (kein Health Connect, kein CSV), braucht Alter und Ruhepuls in den Einstellungen, sonst gibt es keine
  Zonen und keine Tagesbelastung. Ein Feld „Ruhepuls“ fehlt in den Einstellungen noch.
