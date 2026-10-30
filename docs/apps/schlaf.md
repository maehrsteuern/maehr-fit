# Schlaf

**Kernaussage.** „Schlaf“ sagt zuerst, ob die letzte Nacht deinen Schlafbedarf gedeckt hat und wie viel gefehlt hat. Zwei Balken
zeigen Bedarf und geschlafene Zeit, ein geteilter Balken die Schlafphasen. Vier Kacheln nennen Schlafleistung, Regelmäßigkeit,
Schlafschuld und die Zeit im Bett. Aufklappbar steht, woraus sich dein Bedarf zusammensetzt.

## Bildschirm

1. **Kernaussage** – „Du hast 43 min weniger geschlafen, als du gebraucht hättest.“ bzw. „… so lange, wie du gebraucht hast: 8 h 5 min.“
2. **Bedarf und geschlafene Zeit** (`balken()`): zwei Balken in h:mm.
3. **Schlafphasen** (`segmentbalken()`): Wach · Leicht · Tief · Traum (REM) nach Anteil, Legende mit Dauer als Knopf; Satz
   „Tief- und Traumschlaf machten zusammen 48 % der Nacht aus.“
4. **Kacheln**: Schlafleistung (% vom Bedarf), Regelmäßigkeit (Einschlafzeit gegen frühere Nächte), Schlafschuld, Im Bett (von–bis).
5. **Gliederung**: Grundbedarf, Ausgleich für die Belastung von gestern, Anteil der Schlafschuld, Nickerchen.

## Datenfluss

Tagesbild aus `kern/tag.js`: `schlaf` (`schlafLeistung` inkl. `konsistenz`), `bedarf` (`schlafBedarf`), Hauptschlaf über
`kern/zeit.js` `hauptschlaf`. Belege: `schlaf:<tag>`, `schlaf-dauer:<tag>`, `schlaf-schuld:<tag>`, `schlaf-bedarf:<tag>`,
`schlaf-phase:<tag>:<phase>`, `schlaf-konstanz:<tag>`, `schlaf-zeiten:<tag>`.
