# Vergleich mit WHOOP

**Kernaussage.** Wer den Datenexport von WHOOP einliest, bekommt WHOOPs eigene Zahlen für Erholung, Belastung und
Schlafleistung mit. Diese Ansicht stellt sie Tag für Tag neben die Zahlen, die MAEHR FIT aus denselben Messwerten rechnet. Ein
Satz oben sagt, an wie vielen Tagen beide nah beieinanderliegen. Welche Zahl stimmt, sagt die Ansicht nicht: WHOOPs Rechenweg ist
nicht veröffentlicht.

## Wege dorthin

- Mehr → „Vergleich mit WHOOP“ (`#/vergleich`).
- Heute → kleiner Link „WHOOP-Werte dieses Tages im Vergleich“, nur an Tagen mit WHOOP-Werten (`#/vergleich?feld=erholung&tag=…`).
- Beleg der Erholung (auch Belastung, Schlafleistung) → Zeile „WHOOP: 61 %“ mit Link „Zum Vergleich mit MAEHR FIT“.

## Bildschirm (`#/vergleich?feld=erholung|belastung|schlaf&tag=JJJJ-MM-TT`)

1. **Kernaussage** – „An 4 von 6 Tagen liegen MAEHR FIT und WHOOP bei der Schlafleistung höchstens 10 Punkte auseinander.“
   Ohne gemeinsamen Tag: „Für die Belastung gibt es noch keinen Tag, an dem … beide einen Wert haben.“ Ohne WHOOP-Daten: ein Satz
   und der Knopf „WHOOP-Export einlesen“.
2. **Hinweis** in einem Satz: WHOOP rechnet nach eigenem Verfahren; hier steht nur nebeneinander, was beide sagen.
3. **Wahl** des Messwerts (Pillen mit `aria-pressed`).
4. **Zwei Linien** über `shell/viz/viz.js` `zeitreihe()` (kann nur eine Reihe): „MAEHR FIT · Erholung“ und „WHOOP · Erholung“,
   gleiche Achse (0–100, Belastung 0–21), nur Tage mit beiden Werten. Untereinander am Telefon, nebeneinander ab 720 px.
   Fehlen MF-Werte, steht der Grund darüber (zu wenige Vortage; Belastung: WHOOP-Export hat keine einzelnen Herzschläge).
5. **Tag für Tag** – Tabelle Tag · MF · WHOOP · Abstand; der Tag aus der Route ist hervorgehoben.
6. **Übersicht** – je Messwert: Tage mit beiden Werten, mittlerer Abstand, größte Abweichung mit Tag.

## Belege (jede Zahl ist ein Knopf)

| Schlüssel | Inhalt |
|---|---|
| `erholung:<tag>`, `belastung:<tag>`, `schlaf:<tag>` | MF-Zahl wie überall (Formel, Teile, Messwerte) |
| `fremd:<feld>:<tag>` | WHOOP-Zahl: „Fremdwert aus dem WHOOP-Export, Rechenweg nicht bekannt.“, Datei und Zeile im Export |
| `vergleich:<feld>:<tag>` | Abstand mit MF- und WHOOP-Wert, Formel `vergleich.abstand` |
| `vergleich-mittel:<feld>` | Tage, davon nah beieinander, Grenze, Mittel mit Vorzeichen; Formel `vergleich.abstand` |

## Rechnung

`shell/kern_echt.js` `vergleich(erg, feld)`, alles in Zehnteln (Erholung 67 → 670, Belastung 11,3 → 113): Abstand = MF − WHOOP;
mittlerer Abstand = Mittel der Beträge, kaufmännisch gerundet (`rundBruch`); „nah“ = Betrag ≤ `vergleich.nah.<feld>`
(10 Punkte bzw. 2 Belastungspunkte, eigene Festlegung, `pruefen: true`). Liegen zwei WHOOP-Zeilen auf einem Tag, gilt die mit
gemessener Aufwachzeit (`zeitGeschaetzt` fehlt). MF-Belastung zählt nur, wenn mindestens eine Pulszone Zeit hat.

## Tests

`tests/node/shell_vergleich.test.mjs` (eine Kernaussage, jede Zahl mit Beleg, kein Urteil, Heute-Link, Mehr, „noch zu prüfen“),
`tests/node/daten_pipeline.test.mjs` (WHOOP-Fixtures → Speicher → Shell → Kern → Beleg, von Hand nachgerechnet).
