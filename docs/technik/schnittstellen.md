# Schnittstellen zwischen Kern, Daten und Shell

> **Kernaussage.** Der Kern rechnet aus normierten Messwerten die Tageswerte Erholung, Belastung und Schlaf und sagt zu jeder
> Zahl, woher sie kommt und mit welcher Formel sie entstand. Die Datenschicht füllt den Kern aus Health Connect oder einem
> WHOOP-CSV-Export. Die Shell zeigt an und bindet jede Zahl an den Prüfpfad. Alle drei sprechen nur über die Formen hier.

## Normierte Messwerte (`daten/` → `kern/`)
Alle Zeiten als Unix-Millisekunden (Number), Zeitzone des Geräts. Jeder Datensatz trägt `quelle`.

```js
quelle = { art: "healthconnect" | "csv" | "demo" | "hand", id: String, datei?: String, zeile?: Number }

Herzschlag   { t, bpm, quelle }                               // Einzelmessung
Hrv          { t, rmssdMs, quelle }                           // RMSSD in ms (Health Connect: HeartRateVariabilityRmssd)
Ruhepuls     { t, bpm, quelle }
Atemfrequenz { t, proMin, quelle }
SpO2         { t, prozent, quelle }
Hauttemp     { t, deltaC, quelle }                            // Abweichung zur Basis in °C
Schlaf       { von, bis, phasen: [{ von, bis, art: "wach"|"leicht"|"tief"|"rem" }], quelle }
Training     { von, bis, art, herzschlaege: Herzschlag[], quelle }
Tagebuch     { tag: "JJJJ-MM-TT", eintraege: { [schluessel]: true|false|Number }, quelle }
```

## Kern-API (`kern/`, reine Funktionen, kein DOM)
```js
tagesgrenzen(tagIso, einstellungen)              -> { von, bis }            // Tag = Aufwachen bis Aufwachen
basislinie(werte, { tage: 30 })                  -> { mittel, streuung, n, quellen }
erholung({ hrv, ruhepuls, schlaf, atem, basis }) -> { wert: 0..100, stufe: "gruen"|"gelb"|"rot", teile: [{ name, wert, gewicht, quelle, formel }] }
belastung({ herzschlaege, maxPuls, ruhepuls })   -> { wert: 0..21 (eine Nachkommastelle, als Zehntel ganzzahlig), zonen: [{ zone, ms, quelle }], formel }
schlafLeistung({ schlaf, bedarf })               -> { wert: 0..100, dauerMs, bedarfMs, schuld, phasen, formel }
schlafBedarf({ basis, belastungGestern, schuld, nickerchen }) -> { ms, teile: [...] }
atemUebung(name)                                 -> { name, phasen: [{ art: "ein"|"halten"|"aus"|"halten2", ms }], runden, fundstelle }
tagebuchWirkung(tage, schluessel)                -> { mit: { mittel, n }, ohne: { mittel, n }, differenz, hinweis }
trend(tage, feld, { fenster: 7|30 })             -> [{ tag, wert, basis, quellen }]
```
Jedes Ergebnis-Objekt hat `formel: { schluessel, text, fundstelle }` (aus `kern/formeln/formeln.json`) und `quellen: quelle[]`.

## Prüfpfad (`shell/`)
Jede sichtbare Zahl: `<button class="zahl" data-q="erholung:2026-10-30">…</button>`. `data-q` = `art:schluessel`. Die Shell
öffnet dazu das Belegfenster: Formel (Text, Fundstelle), Teile mit Gewichten, Quelldatensätze (Art, Kennung, Datei/Zeile).

## Speicher (`kern/speicher.js`)
```js
speicher = { lies(schluessel) -> Promise<any>, schreib(schluessel, wert) -> Promise<void>, liste(praefix) -> Promise<String[]> }
```
Shell liefert IndexedDB (`shell/speicher_browser.js`); Tests liefern eine Map.
