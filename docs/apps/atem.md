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
