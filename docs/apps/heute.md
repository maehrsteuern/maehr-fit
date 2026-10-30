# Heute

**Kernaussage.** „Heute“ sagt in einem Satz, wie erholt du bist, und zeigt dieselbe Zahl groß in einem Ring. Darunter stehen vier
Kacheln – Belastung, Schlaf, HRV und Ruhepuls – jeweils mit einem Pfeil, ob der Wert über, unter oder in deinem üblichen Bereich
liegt. Wer mehr wissen will, klappt auf, woraus sich die Erholung zusammensetzt, und sieht die letzten sieben Tage als Linie.
Jede Zahl lässt sich antippen und zeigt, woher sie kommt.

## Bildschirm (von oben nach unten)

1. **Kernaussage** – „Du bist heute gut erholt: 71 %. Die Nacht war kürzer als dein Bedarf, aber ruhig.“ Stufe grün/gelb/rot
   aus dem Kern; „kurz“ = geschlafene Zeit unter dem Bedarf; „ruhig“ = HRV der Nacht nicht unter dem üblichen Bereich.
   An einem früheren Tag: „Am Do., 29. Okt. warst du …“.
2. **Ring** (`ring()` in `shell/viz/viz.js`): Erholung 0–100 %, Bogenfarbe nach Stufe, darunter „Bereich grün“ (nie nur Farbe).
3. **Vier Kacheln** (`kennzahlKachel()`): Belastung heute (von 21), Schlaf (h:mm), HRV (ms), Ruhepuls (S/min); Pfeil ↑ ↓ → gegen
   Mittel ± Streuung der Basislinie, beim Schlaf gegen den Bedarf.
4. **Gliederung** (aufklappbar): Bestandteile der Erholung mit Gewicht und Beitrag in Punkten um die Mitte 50; Abzüge
   (Atemfrequenz, Hauttemperatur, Sauerstoff) ohne Gewicht.
5. **Sieben Tage** (`zeitreihe()`): Erholung je Tag, Punkte in der Farbe der Stufe, Satz „An 2 von 7 Tagen warst du im grünen Bereich.“

## Datenfluss

`shell/shell.js` lädt Messwerte (Demo der Musterperson oder `messung:*` aus dem Speicher) → `shell/kern.js` → `shell/kern_echt.js`
→ `kern/tag.js` (`alleTage`) → Tagesbild → `shell/apps/heute.js` (reines HTML). Belege: `shell/belege.js` (`erholung:<tag>`,
`erholung-teil:<tag>:<teil>`, `belastung:<tag>`, `schlaf-dauer:<tag>`, `hrv:<tag>`, `ruhepuls:<tag>`).

Leer: „Für diesen Tag liegen noch keine Messwerte vor.“ mit Knopf „Zum letzten Tag mit Messwerten“.
