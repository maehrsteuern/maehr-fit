# Daten und Einstellungen

**Kernaussage.** Unter „Daten“ verbindest du Health Connect (nur in der Android-App), liest den Datenexport von WHOOP ein
(ZIP oder CSV), sicherst alles als Datei oder löschst alles. Nichts verlässt dein Gerät. Unter „Einstellungen“ trägst du Alter,
Höchstpuls und Schlafbedarf ein und wählst Sprache, Darstellung und Vibration; gespeichert wird sofort.

## Daten (`#/daten`)

| Karte | Wirkung |
|---|---|
| Health Connect | Knopf „Verbinden“ nur, wenn `window.MF.daten.healthConnect.verfuegbar()` ja sagt; sonst „nur in der Android-App“ |
| CSV-Datei einlesen | Dateiwahl (mehrere, `.csv`/`.zip`) → `window.MF.daten.csvImport` (`daten/verbinden.js`); Meldung „55 Messwerte aus … eingelesen.“ |
| Eigene Daten sichern | lädt alle Speicher-Einträge als `maehr-fit-<datum>.json` herunter (Blob, kein Netz) |
| Alle Daten löschen | erst Rückfrage in der Karte („Wirklich alles löschen?“), dann `loescheAlles()`; danach wieder Demodaten |

Nach dem Einlesen liest die Shell `messung:<art>:<tag>` neu (`daten/ablage.js` `leseMessungen`), rechnet und springt auf den
letzten Tag mit Messwerten, falls heute noch nichts da ist.

## Einstellungen (`#/einstellungen`)

Alter, Höchstpuls (leer = Schätzung aus dem Alter, Beleg `maxpuls:schaetzung`, Formel aus dem Kern), Grundbedarf Schlaf in
Stunden (gespeichert als `schlafBasisMs`), Sprache (DE/EN), Darstellung (wie das Gerät/hell/dunkel), Vibration für Atemübungen.
Speicher-Schlüssel `einstellungen`. Bei Demodaten gelten Alter und Höchstpuls der Musterperson, solange du nichts einträgst.

## Speicher

`shell/speicher_browser.js`: IndexedDB („maehr-fit“, Ablage „werte“), sonst localStorage (Präfix `mf.`), sonst Arbeitsspeicher.
Vertrag `lies / schreib / liste`, dazu `loesche`, `loescheAlles`. `window.MF.speicher` ist derselbe Speicher für die Datenschicht.
