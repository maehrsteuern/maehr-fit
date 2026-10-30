# Datenschicht: Woher MAEHR FIT seine Messwerte bekommt

> **Kernaussage.** MAEHR FIT bekommt seine Messwerte auf zwei Wegen: direkt vom Handy über Health Connect oder aus der
> Export-Datei, die WHOOP auf Wunsch per E-Mail schickt. Beide Wege werden in dieselbe einfache Form gebracht und auf dem
> Gerät abgelegt; doppelt eingelesene Werte werden erkannt und nicht verdoppelt. Was WHOOP selbst ausgerechnet hat
> (Erholung, Belastung, Schlafleistung), bleibt erhalten, damit die App zeigen kann: „WHOOP sagte X, MAEHR FIT rechnet Y“.

## Dateien

| Datei | Aufgabe |
|---|---|
| `daten/healthconnect.js` | Health Connect → normierte Messwerte, inkrementeller Abgleich (`docs/technik/healthconnect.md`) |
| `daten/csv_import.js` | WHOOP-CSV → normierte Messwerte, CSV-Zerlegung nach RFC 4180 |
| `daten/zip.js` | WHOOP-Export als ZIP direkt lesen (ohne Fremdbibliothek, über `DecompressionStream`) |
| `daten/zeit.js` | Zeitangaben → Unix-ms, Zeitzonen (`UTC+01:00`, `Europe/Berlin`), Kalendertag |
| `daten/ablage.js` | Ablage im Speicher, Abgleich doppelter Datensätze |
| `daten/verbinden.js` | `window.MF.daten` |
| `daten/bruecke_capacitor.js` | Android-Plugin → `window.MF.native.healthConnect` |
| `daten/fixtures/` | erfundene Beispieldaten (Musterperson) für die Tests |

## Schnittstelle für die Shell

```js
import { installiere } from "../daten/verbinden.js";
import { installiereBruecke } from "../daten/bruecke_capacitor.js";
installiereBruecke(window);                  // nur in der Android-App wirksam
installiere(window, { speicher });           // speicher = Schnittstelle kern/speicher.js

await MF.daten.healthConnect.verfuegbar();   // { verfuegbar, grund: "kein_android" | "verfuegbar" | "nicht_installiert" | "update_noetig" }
await MF.daten.healthConnect.verbinden();    // Rechte anfragen + abgleichen
await MF.daten.healthConnect.synchronisieren();
await MF.daten.csvImport(datei | dateien);   // CSV oder ZIP, File oder { name, text } oder { name, bytes }
await MF.daten.exportieren();                // { format: "maehr-fit-export", version: 1, erstelltMs, eintraege }
await MF.daten.loeschen();                   // alle "messung:" und "sync:healthconnect:" Schlüssel
```

`verbinden`, `synchronisieren` und `csvImport` liefern die **neu hinzugekommenen** Datensätze als Messpaket auf oberster Ebene
(`{ herzschlag: [], hrv: [], ruhepuls: [], atemfrequenz: [], spo2: [], hauttemp: [], schlaf: [], training: [], tagebuch: [], fremdwerte: [] }`)
plus `neu`, `ersetzt`, `arten`, `hinweise` (CSV: `{ datei, zeile, text }` für übersprungene oder geschätzte Zeilen).
CSV zusätzlich: `arten` = Anzahl je Art aller eingelesenen Datensätze (Summe = `neu` + `ersetzt`), `zeitraum` = `{ von, bis }`
(erster/letzter Kalendertag wie in der Ablage, `zeitraumVon(paket)`). `exportieren()` enthält jede Art unter `messung:` – auch
`fremdwerte` (geprüft in `tests/node/daten_pipeline.test.mjs`).

## Ablage

Schlüssel `messung:<art>:<JJJJ-MM-TT>` → Array der Datensätze dieser Art an diesem Tag, sortiert nach Zeit.

| Art | Tag des Datensatzes |
|---|---|
| `schlaf` | Tag des Aufwachens (`bis`) |
| `training` | Tag des Beginns (`von`) |
| `tagebuch`, `fremdwerte` | Feld `tag` |
| alle anderen | Tag von `t` |

Der Tag richtet sich nach der Zeitzone des Datensatzes (`zoneMin`), sonst nach der Gerätezeitzone. Gleiche `quelle.id` ersetzt
den alten Datensatz. CSV-Kennungen hängen am Zeitpunkt, nicht an der Zeilennummer (`whoop:zyklus:<Beginn-ms>:hrv`), damit ein
späterer, längerer Export dieselben Zeilen wiedererkennt.

## WHOOP-Export (CSV)

Anfordern in der WHOOP-App: „Mehr“ → „App-Einstellungen“ → „Data Export“. WHOOP schickt einen Link per E-Mail (gültig etwa
7 Tage) zu einer ZIP-Datei mit mehreren CSV-Dateien. MAEHR FIT liest die ZIP direkt oder einzelne CSV-Dateien.

Spalten werden über ihren Namen gefunden, nicht über die Position; Groß-/Kleinschreibung, Leerzeichen und Klammern spielen keine
Rolle. Fehlt eine Spalte, bleibt das Feld leer (`null`). Komma, Semikolon und Tab als Trennzeichen, Werte in Anführungszeichen,
Zeilenumbrüche in Notizen und BOM werden verstanden.

### physiological_cycles.csv → mehrere Arten

| WHOOP-Spalte | MF | Umrechnung |
|---|---|---|
| Cycle start time | `quelle.id` | Unix-ms in der Zeitzone aus „Cycle timezone“ |
| Cycle timezone | `zoneMin` | `UTC+01:00` → 60 |
| Wake onset | `t` aller Nachtwerte | fehlt sie: Zyklusbeginn, markiert `zeitGeschaetzt: true` |
| Resting heart rate (bpm) | `ruhepuls.bpm` | – |
| Heart rate variability (ms) | `hrv.rmssdMs` | – |
| Blood oxygen % | `spo2.prozent` | – |
| Skin temp (celsius) | `hauttemp.deltaC`, `absolutC`, `basisC` | WHOOP liefert absolute Grad; `deltaC` = Wert − Median aller Werte dieses Imports (in Tausendstel Grad gerechnet), `deltaBasis: "median_import"` |
| Recovery score % | `fremdwerte.erholung` | WHOOPs Wert, nur zum Vergleich |
| Day Strain | `fremdwerte.belastung` | WHOOPs Wert (0–21) |
| Sleep performance % | `fremdwerte.schlafLeistung` | WHOOPs Wert |

Tag der Fremdwerte: Aufwachtag; ohne Aufwachzeit die Mitte des Zyklus.

### sleeps.csv → `schlaf`, `atemfrequenz`

| WHOOP-Spalte | MF | Umrechnung |
|---|---|---|
| Sleep onset / Wake onset | `von` / `bis` | Pflicht, sonst Zeile übersprungen |
| Light sleep / Deep (SWS) / REM / Awake duration (min) | `phasenSummen.leichtMs / tiefMs / remMs / wachMs` | Minuten × 60 000 |
| Asleep / In bed duration (min) | `schlafMs` / `imBettMs` | Minuten × 60 000 |
| Sleep need / Sleep debt (min) | `bedarfMs` / `schuldMs` | Minuten × 60 000 (WHOOPs Werte) |
| Sleep efficiency % / Sleep consistency % | `effizienzProzent` / `konstanzProzent` | – |
| Nap | `nickerchen` | `true`/`false` |
| Sleep performance % | `fremdwerte.schlafLeistung` | – |
| Respiratory rate (rpm) | `atemfrequenz.proMin`, `t` = Aufwachen | – |

`phasen` bleibt leer: der Export enthält nur Summen je Phase, keine Zeitachse.

### workouts.csv → `training`

| WHOOP-Spalte | MF | Umrechnung |
|---|---|---|
| Workout start time / end time | `von` / `bis` | fehlt das Ende: Beginn + „Duration (min)“ |
| Activity name | `name`, `art` | `Running → laufen`, `Cycling → radfahren`, … sonst Name als Kürzel |
| HR Zone 1 % … HR Zone 5 % | `zonenProzent` `[z1…z5]` | WHOOPs Zonen; keine Einzelherzschläge (`herzschlaege: []`) |
| Max HR / Average HR (bpm) | `maxPuls` / `mittelPuls` | – |
| Energy burned (cal) | `energieKcal` | WHOOP meint Kilokalorien |
| Distance (meters) | `distanzM` | – |
| Activity Strain | `fremdwerte.belastung` | WHOOPs Wert |

### journal_entries.csv → `tagebuch`

| WHOOP-Spalte | MF |
|---|---|
| Cycle start/end time | `tag` = Kalendertag der Zyklusmitte |
| Question text | Schlüssel `frageSchluessel("Consume caffeine?") = "consume_caffeine"`, Text in `fragen` |
| Answered yes | `eintraege[schluessel] = true/false` |
| Notes | `notizen[schluessel]` |

## Was bestätigt ist

| Punkt | Stand |
|---|---|
| Export kommt als ZIP mit mehreren CSV (Zyklen, Schlaf, Trainings, Tagebuch) | bestätigt (WHOOP-Hilfe, zitiert bei gneta.app) |
| Dateinamen `physiological_cycles.csv`, `sleeps.csv`, `workouts.csv`, `journal_entries.csv` | aus Nutzerberichten, nicht offiziell belegt; die Erkennung klappt zur Not auch an den Spalten |
| genaue Spaltennamen | **nicht mit einer Primärquelle belegt** – stammen aus der Auftragsbeschreibung und Nutzerberichten. Bitte mit dem ersten echten Export abgleichen; abweichende Namen in `SPALTEN` (`daten/csv_import.js`) als weitere Variante eintragen |
| Datumsformat `JJJJ-MM-TT hh:mm:ss` mit Spalte „Cycle timezone“ (`UTC+01:00`) | nicht belegt; andere Formate (ISO mit Z, `TT.MM.JJJJ`, US `MM/TT/JJJJ` mit AM/PM, IANA-Zonen) werden zusätzlich verstanden |

## Offene Auslegungen (Loris entscheiden)

1. **Tag eines Tagebucheintrags:** Mitte des WHOOP-Zyklus. Alternative: Tag des Zyklusbeginns (Vorabend).
2. **Hauttemperatur aus CSV:** Abweichung zum Median des Imports. Alternative: Kern bildet die Basislinie aus `absolutC`.
3. **Schlaf `SLEEPING` aus Health Connect** (ohne Stufe) zählt als `leicht` mit Markierung `unbestimmt`.
