# Tagebuch

**Kernaussage.** Im Tagebuch hakst du mit großen Schaltern an, was an einem Tag zutraf – Alkohol, spätes Essen, Bildschirm im
Bett, Meditation und mehr. Gespeichert wird sofort und nur auf deinem Gerät. Die Ansicht „Was hängt womit zusammen?“ vergleicht
deine Erholung am Morgen danach mit und ohne das Verhalten und sagt ehrlich, ob es schon genug Tage für eine Tendenz gibt.

## Bildschirme

- **Formular** (`#/tagebuch`, für den Tag aus dem Kopf): ein Schalter je Frage aus `kern/tagebuch.js` (`KATALOG`, Art
  `ja_nein`), Zeilen 64–72 px hoch, Status „Gespeichert.“ als Live-Region; Atemzeit des Tages als Zeile.
- **Wirkung** (`#/tagebuch/wirkung`): Satz zum stärksten Zusammenhang („An Tagen nach „Alkohol getrunken“ lag deine Erholung im
  Mittel 35 Punkte niedriger.“), Hinweis „Eine Tendenz, kein Beweis“, dann je Verhalten ein kleines Balkendiagramm (mit/ohne),
  Unterschied in Punkten, Anzahl Tage, bei zu wenigen Tagen „Noch zu wenige Tage für eine Aussage.“

## Datenfluss

Speicher `tagebuch:<JJJJ-MM-TT>` = `{ tag, eintraege, quelle: { art: "hand", id } }`; beim Rechnen über eingelesene oder
Demo-Einträge gelegt. `kern/tagebuch.js` `tagebuchWirkung(tage, schluessel)` (Mindestzahl Tage aus `formeln.json`).
Belege: `wirkung:<schluessel>`, `wirkung-mit:<schluessel>`, `wirkung-ohne:<schluessel>`.
