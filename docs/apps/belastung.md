# Belastung

**Kernaussage.** „Belastung“ zeigt, wie sehr dich der Tag gefordert hat, auf einer Skala von 0 bis 21, und ob das mehr oder
weniger war als an deinen üblichen Tagen. Balken zeigen, wie lange dein Puls in welcher Zone lag. Darunter stehen die Trainings
des Tages; ein Tipp öffnet die Pulskurve des Trainings und seine Zonen.

## Bildschirm

1. **Kernaussage** – „Heute hast du 10,6 von 21 Belastung gesammelt, mehr als an deinen üblichen Tagen.“ (Vergleich gegen Mittel ±
   Streuung der Tagesbelastung der letzten Wochen.)
2. **Bogen** (`ring()`): Belastung als Anteil von 21.
3. **Zeit in den Pulszonen** (`zonen()`): Zone 1 sehr locker … Zone 5 sehr zügig, Minuten je Zone, Farben `--vz-k0…k4` mit Wort.
4. **Trainings**: Liste (Art, Beginn, Dauer, Belastung) → `#/belastung/training/<id>`.

**Training** (`#/belastung/training/<id>`): Satz „Laufen von 18:10 bis 19:02 brachte 9,8 von 21 Belastung.“, Pulskurve
(`zeitreihe()`, höchstens 60 Punkte, jeder Punkt mit seiner Messung als Beleg `puls:<id>:<i>`), Zonen des Trainings.

## Datenfluss

`kern/belastung.js` `belastungTag` (Tag) und dessen `trainings` (je Training), Pulsreihe aus dem Trainingsdatensatz.
Belastung kommt in ganzen Zehnteln (`wertZehntel`), die Shell zeigt sie mit einer Nachkommastelle.
Belege: `belastung:<tag>`, `zone:<tag>:<n>`, `training:<id>`, `training-zone:<id>:<n>`, `puls:<id>:<i>`.
