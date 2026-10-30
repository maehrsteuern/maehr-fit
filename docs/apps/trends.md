# Trends

**Kernaussage.** „Trends“ zeigt einen Messwert über eine Woche oder einen Monat als Linie, mit deinem üblichen Bereich als hellem
Streifen dahinter. Du wählst Erholung, HRV, Ruhepuls oder Schlafdauer und 7 oder 30 Tage. Der Satz oben sagt, ob der letzte Wert
darüber, darunter oder darin liegt. Ein Diagramm, eine Frage.

## Bildschirm

1. **Kernaussage** – „Deine HRV lag zuletzt in deinem üblichen Bereich.“
2. **Wahl** – Messwert (Pillen mit `aria-pressed`) und Zeitraum; Weg `#/trends?feld=hrv&fenster=30` (Link teilbar, Zurück geht).
3. **Diagramm** (`zeitreihe()` mit Band): Titel „HRV, 30 Tage“, Satz „Der helle Streifen ist dein üblicher Bereich aus den
   Tagen davor.“, jeder Punkt mit Beleg `trend:<feld>:<tag>`.

## Datenfluss

`shell/kern_echt.js` `trendPunkte` → `kern/trend.js` `trend(tage, feld)` (Band = Mittel ± Band × Streuung, `formeln.json`
„trend.band“) → Anzeigeeinheiten (HRV aus Zehntel-ms in ms). Es zählen nur Tage bis zum Tag im Kopf.
