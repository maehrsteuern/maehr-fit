# Daten und Einstellungen

**Kernaussage.** Unter „Daten“ verbindest du Health Connect (nur in der Android-App), liest den Datenexport von WHOOP ein
(ZIP oder CSV), sicherst alles als Datei oder löschst alles. Nichts verlässt dein Gerät. Unter „Einstellungen“ trägst du Alter,
Höchstpuls und Schlafbedarf ein und wählst Sprache, Darstellung und Vibration; gespeichert wird sofort.

## Daten (`#/daten`)

| Karte | Wirkung |
|---|---|
| Health Connect | Knopf „Verbinden“ nur, wenn `window.MF.daten.healthConnect.verfuegbar()` ja sagt; sonst „nur in der Android-App“ |
| CSV-Datei einlesen | Dateiwahl (mehrere, `.csv`/`.zip`) → `window.MF.daten.csvImport` (`daten/verbinden.js`); Meldung „55 Messwerte eingelesen: 6 HRV, 7 Ruhepuls, …, 7 WHOOP-Werte · Zeitraum: Sa., 24. Okt. bis Do., 29. Okt. · Zeilen mit Hinweis: 1“ |
| Eigene Daten sichern | lädt alle Speicher-Einträge als `maehr-fit-<datum>.json` herunter (Blob, kein Netz) |
| Alle Daten löschen | erst Rückfrage in der Karte („Wirklich alles löschen?“), dann `loescheAlles()`; danach wieder Demodaten |

`csvImport` liefert `arten` (Anzahl je Art, Summe = neu + ersetzt) und `zeitraum` ({ von, bis }, Kalendertage); die Shell gibt
`{ n, arten, zeitraum, hinweise }` an `daten.js` weiter (`importText`).

Nach dem Einlesen liest die Shell `messung:<art>:<tag>` neu – jede Art der Ablage (`DATEN_ARTEN` in `shell/shell.js` = `ARTEN` in
`daten/ablage.js`): auch Sauerstoffsättigung und Hauttemperatur (Abzüge in der Erholung, im Beleg mit Datei und Zeile) und
`fremdwerte` (WHOOPs eigene Zahlen für den Vergleich, `docs/apps/vergleich.md`) (`daten/ablage.js` `leseMessungen`), rechnet und springt auf den
letzten Tag mit Messwerten, falls heute noch nichts da ist.

## Einstellungen (`#/einstellungen`)

Alter, Höchstpuls (leer = Schätzung aus dem Alter über Kern `maxPulsAus`, Tanaka 2001; dieselbe Schätzung nutzt der Kern für die
Pulszonen; Beleg `maxpuls:schaetzung`, ändert sich beim Ändern des Alters sofort mit), Grundbedarf Schlaf in Stunden (gespeichert
als `schlafBasisMs`; leer = `schlaf.bedarf.basis` aus `formeln.json`, 8 h, als Platzhalter sichtbar), Sprache (DE/EN), Darstellung (wie das Gerät/hell/dunkel), Vibration für Atemübungen.
Speicher-Schlüssel `einstellungen`. Bei Demodaten gelten Alter und Höchstpuls der Musterperson, solange du nichts einträgst.

## Speicher

`shell/speicher_browser.js`: IndexedDB („maehr-fit“, Ablage „werte“), sonst localStorage (Präfix `mf.`), sonst Arbeitsspeicher.
Vertrag `lies / schreib / liste`, dazu `loesche`, `loescheAlles`. `window.MF.speicher` ist derselbe Speicher für die Datenschicht.

## Mehr: Formeln, die noch zu prüfen sind (`#/mehr/pruefen`)

Mehr zeigt in einer eigenen Zeile die Anzahl der Formeln mit `"pruefen": true` (`kern/formeln.js` `pruefListe()`). Die Liste nennt
je Formel Erklärung, Fundstelle und Schlüssel; der Wert ist ein Knopf zum Beleg `formel:<schluessel>` (Rechenweg, Fundstelle,
„noch zu prüfen“).
