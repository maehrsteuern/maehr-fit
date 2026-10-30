# Atem

**Kernaussage.** „Atem“ führt dich durch ruhige Atemübungen. Du folgst einem großen Kreis: Er wächst beim Einatmen, bleibt beim
Halten stehen und wird beim Ausatmen kleiner; in der Mitte stehen Phase, Countdown und Runde. Auf Wunsch vibriert das Gerät oder
klingt ein leiser Ton bei jedem Wechsel. Am Ende steht die geatmete Zeit in deinem Tagebuch.

## Bildschirme

- **Liste** (`#/atem`): Übungen aus dem Kern (`atemKatalog()`): Box-Atmung, 4-7-8, Gleichmäßig atmen, Seufzer-Atmung, Lang
  ausatmen – mit einem Satz Beschreibung, Runden und Dauer. Satz oben nennt die heute schon geatmete Zeit.
- **Sitzung** (`#/atem/<übung>`): Kreis, Phase (Einatmen/Halten/Ausatmen, beim Seufzer „Nachatmen“), Sekunden-Countdown,
  „Runde 2 von 6“; Knöpfe Starten/Pause/Weiter/Beenden; Schalter Vibration (`navigator.vibrate`) und leiser Ton (WebAudio,
  Sinus, 0,45 s, leise Hüllkurve). Ergebnis: „Du hast 4 min ruhig geatmet. Das steht jetzt in deinem Tagebuch.“

## Takt und Bewegung

- Zeit nur über `requestAnimationFrame` gegen `performance.now()`; Pausen werden abgezogen – kein Intervall-Zeitgeber, kein Abdriften
  (Ruhe-Test prüft das).
- `phaseBei(uebung, ms)` (rein, getestet) sagt Runde, Phase und Restzeit; `skalenPlan`/`skalaBei` geben die Kreisgröße
  (0,55 → 1), auch bei zwei Einatem-Phasen hintereinander ohne Sprung.
- Nur `transform` und `opacity`; Ein-/Ausblenden 450 ms. Bei `prefers-reduced-motion` steht der Kreis, ein Fortschrittsbalken
  (`role="progressbar"`) zeigt die Phase.

## Datenfluss

`kern/atem.js` (Phasen in ms, Runden, Fundstelle aus `formeln.json`) → Sitzung → `ctx.atemSpeichern(ms)` → Speicher
`tagebuch:<tag>` mit `eintraege.atem` (Millisekunden, aufsummiert) und `eintraege.atemuebung = true`. Unter 10 s wird nichts gespeichert.

## Puls mitlesen (Phase 2)

- Schalter **„Puls mitlesen“** in der Sitzung (gemerkt in `einstellungen.atemPuls`). Ist noch nichts verbunden, stehen neben dem
  Kreis „Band verbinden“ (nur mit Bluetooth) und „Demo-Puls“; danach zwei Kacheln: **Puls** und **Kohärenz** (0–100), beide als
  Zahl-Knöpfe mit Beleg (`atem-live:puls`, `atem-live:kohaerenz`). Breit ab 720 px neben dem Kreis, schmal darunter.
- Kohärenz = `atemKohaerenz(rr, zyklusMs)` aus `kern/live.js` über die RR-Abstände der laufenden Sitzung (letzte bis zu sechs
  ganze Atemzüge, ab zwei). Eigene, vereinfachte Festlegung (`live.kohaerenz`, `pruefen: true`).
- Nach der Sitzung (ab 10 s) eine Karte: „Dein Puls ging von 70 auf 63 Schläge pro Minute“, Kurz-HRV der Übung und Kohärenz.
  Echte Werte (nicht Demo) kommen ins Tagebuch des Tages: `atem_puls_vor`, `atem_puls_nach` (S/min), `atem_hrv_kurz`
  (Zehntel-ms), `atem_kohaerenz` (0–100). Puls „vor“ = letzter Wert beim Start, „nach“ = letzter Wert beim Ende.
- Der Demo-Puls schwingt im Atemtakt der gewählten Übung (`demoPuls(seed, { profil: "atem", atemZyklusMs })`); läuft er noch mit
  dem Trainingsprofil aus der Live-Ansicht, stellt das Einschalten des Schalters ihn um.
- Weniger Bewegung: unverändert – der Kreis steht, der Balken zeigt die Phase, Puls und Kohärenz stehen daneben.
- Weg zur Live-Ansicht: Knopf „Puls live ansehen“ unter der Liste (`#/live?von=atem`).
