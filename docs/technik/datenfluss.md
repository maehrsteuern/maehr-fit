# Datenfluss: WHOOP-CSV bis in jede Ansicht

> **Kernaussage.** Jede Zahl der Ansichten Heute, Schlaf, Belastung, Atem, Trends, Tagebuch, Vergleich und des Belegfensters
> lässt sich bis zu einer Spalte der WHOOP-Datei zurückverfolgen. Beim deutschen Export vom 30./31.10.2026 zeigte der Schlaf
> „0 min“ je Phase, weil der Kern nur die Zeitachse der Phasen las, die der Export nicht enthält. Das ist behoben; ein Test
> (`tests/node/daten_ende_zu_ende.test.mjs`) schickt zehn erfundene Nächte in vier Schreibweisen, deutsch und englisch, durch
> Import → Ablage → Kern → Ansichten und prüft jede Zahl. Health-Connect-Seite: `docs/technik/datenfluss_hc.md`. Stand 31.10.2026.

## Weg einer Zahl

`daten/csv_import.js` (`importiereWhoop`) → `daten/ablage.js` (`speichereMessungen`, Schlüssel `messung:<art>:<Tag>`) → `leseMessungen`
→ `shell/kern_echt.js` `berechne` (führt Health Connect und CSV zusammen, `kern/zusammenfuehren.js`) → `kern/tag.js` → Tagesbild → Ansicht → Beleg.

- **Tag eines Datensatzes** (`daten/ablage.js` `tagVon`): Schlaf zählt zum Tag des Aufwachens, Training zum Tag des Beginns, Messwerte zum Tag
  ihres Zeitpunkts (CSV: Aufwachzeit), jeweils im Versatz der Zeile (`zoneMin` aus „Cycle timezone“ / „Zeitzone des Zyklus“).
  Zonenformate: `UTC+01:00`, `GMT-5`, `+0100`, `Z` und IANA-Namen (`Europe/Berlin`, mit Sommerzeit je Zeitpunkt). Der Kern bildet den Tag in der
  Zeitzone des Geräts (`isoTag`); beide stimmen überein, solange das Handy in der Zone des Exports steht.
- **Zeitformate** (`daten/zeit.js`): `2026-10-29 21:15:00`, `2026-10-29T21:15:00Z`, mit Versatz, `29.10.2026 21:15`, `10/29/2026 9:15 PM`, Epoche.
- **Zahlen:** `64.5`, `64,5`, `87 %`; Trennzeichen `,` `;` Tab werden erraten; Felder in Anführungszeichen mit Komma/Zeilenumbruch gehen.
- **Einheiten:** Minuten × 60 000 = ms (Schlaf); HRV/Atem/SpO2/Hauttemperatur im Kern in Zehntel- bzw. Hundertstel-Einheiten (`formeln.json einheit.*`).
- **Zyklen-Datei legt keinen Schlaf an.** `physiologische_zyklen.csv` hat dieselben Schlafspalten wie `Schlaf.csv`, liefert daraus aber nur
  Ruhepuls, HRV, SpO2, Hauttemperatur und WHOOPs eigene Werte (Aufwachzeit als Messzeit). Schlaf und Atemfrequenz kommen nur aus `Schlaf.csv`;
  so entstehen keine doppelten Nächte (Test „keine Doppelten aus den Zyklen“).

## Tabelle: Ansicht | Zahl | Kern-Feld | Speicher-Feld | CSV-Spalte EN | CSV-Spalte DE | Health-Connect-Art | Status

| Ansicht | Zahl | Kern-Feld | Speicher-Feld | CSV-Spalte EN | CSV-Spalte DE | Health-Connect-Art | Status |
|---|---|---|---|---|---|---|---|
| Heute | Erholung (Ring, 7 Punkte) | `tag.erholung.wert` (aus HRV, Ruhepuls, Schlaf, Atem, Haut, SpO2 und Basislinie) | – (gerechnet) | – | – | → HC-Prüfung | OK; braucht 4 Vortage (`basis.min_n`), sonst „zu wenig Daten“ |
| Heute | HRV-Kachel | `messwerte.hrv` (Zehntel-ms) | `hrv.rmssdMs` | Heart rate variability (ms) | Herzfrequenzvariabilität (ms) | HeartRateVariabilityRmssd | OK |
| Heute | Ruhepuls-Kachel | `messwerte.ruhepuls` | `ruhepuls.bpm` | Resting heart rate (bpm) | Ruheherzfrequenz (Schläge pro Minute) | RestingHeartRate | OK |
| Heute | Schlaf-Kachel (Dauer + Phasenstreifen) | `schlaf.dauerMs`, `schlaf.phasen` | `schlaf.phasenSummen.{leicht,tief,rem,wach}Ms` | Light sleep / Deep (SWS) / REM / Awake duration (min) | Dauer des Leicht-/Tief-/REM-Schlafs, Dauer des Aufwachens (Min.) | SleepSession | **behoben** (vorher Bettzeit, Phasen 0) |
| Heute | Belastung-Kachel | `belastung.wertZehntel` | `training.zonenProzent`, `von`, `bis` | HR Zone 1–5 %, Workout start/end time, Duration (min) | HF-Zone 1–5 %, Startzeit/Endzeit des Trainings, Dauer (Min.) | ExerciseSession + HeartRate | **behoben** (vorher 0 ohne Höchstpuls-Einstellung); Ruhetag zeigt „–“ statt 0 |
| Heute | Erholungsteile Atem / SpO2 / Haut | `messwerte.atem`, `.spo2`, `.hauttemp` | `atemfrequenz.proMin`, `spo2.prozent`, `hauttemp.deltaC` | Respiratory rate (rpm) · Blood oxygen % · Skin temp (celsius) | Atemfrequenz (Atemzüge/Min.) · Blutsauerstoff % · Hauttemperatur (Celsius) | RespiratoryRate · OxygenSaturation · SkinTemperature | OK; Haut = Abweichung zum Median des Imports (`deltaBasis: median_import`) |
| Schlaf | Geschlafen (Satz oben, Doppelbalken) | `schlaf.dauerMs` = Leicht + Tief + REM | `schlaf.phasenSummen`, ersatzweise `schlafMs` | Asleep duration (min) | Schlafdauer (Min.) | SleepSession | **behoben** |
| Schlaf | Bestandteile Leicht / Tief / Traum / Wach | `schlaf.phasen.{leicht,tief,rem,wach}` (ms) | `schlaf.phasenSummen` | siehe Heute | siehe Heute | SleepSession.stages | **behoben**; Hypnogramm-Zeitachse bleibt leer (der Export hat nur Summen) |
| Schlaf | Bedarf, Schuld | `schlaf.bedarfMs`, `schlaf.schuld` (MF rechnet: 8 h + Belastung Vortag + Schuld − Nickerchen) | `nickerchen`, Belastung des Vortags | Nap | Nickerchen | – | OK; WHOOPs Sleep need / debt werden gespeichert (`bedarfMs`, `schuldMs`), aber nicht angezeigt |
| Schlaf | Schlafleistung | `schlaf.wert` | – (gerechnet) | – | – | – | OK; WHOOPs Wert nur im Vergleich |
| Schlaf | Regelmäßigkeit | `schlaf.konsistenz.wert` (Einschlafzeit gegen die 7 Nächte davor) | `schlaf.von` | Sleep onset | Beginn des Schlafs | SleepSession.startTime | OK |
| Schlaf | Zeiten | `schlafRoh.von`, `.bis` | `schlaf.von`, `.bis` | Sleep onset / Wake onset | Beginn des Schlafs / Beginn des Aufwachens | SleepSession | OK |
| Belastung | Ring 0–21, Zonen-Ring und -Balken | `belastung.wertZehntel`, `.zonen[].ms` (aus Dauer × Anteil, „geschätzt“) | `training.zonenProzent` | HR Zone 1–5 % | HF-Zone 1–5 % | HeartRate im Training | OK; Chip „geschätzt aus Zonenanteilen“ |
| Belastung | Trainingskarte (Art, Zeit, Dauer, Wert) | `trainings[].roh.art/name/von/bis` | `training.art`, `.name`, `.von`, `.bis` | Activity name | Name der Aktivität | ExerciseSession | OK; Art-Namen: **behoben** (Radfahren, Krafttraining, Yoga … statt „Training“) |
| Belastung | Ruhetag ohne Training und Puls | `belastung.gemessen = false` | – | – | – | – | **behoben**: Satz „keine Pulswerte … WHOOP nennt X“ statt „0,0 von 21“ |
| Belastung | Pulskurve im Training | `roh.herzschlaege` | `training.herzschlaege` | – (der Export hat keine Einzelpulse) | – | HeartRate | CSV: keine Kurve (erwartet) |
| Atem | Übungen, Dauer heute | – (`atemUebung`, Eingabe im Gerät) | `tagebuch.eintraege.atem` | – | – | – | braucht keine CSV-Daten; Atemfrequenz der Nacht erscheint nur als Erholungsteil (Heute) |
| Trends | Erholung, HRV, Ruhepuls, Schlafdauer | `trend(tage, feld)` über `erholung.wert`, `messwerte.*`, `schlaf.dauerMs` | wie Heute / Schlaf | wie Heute / Schlaf | wie Heute / Schlaf | → HC-Prüfung | OK; Schlafdauer **behoben** (war Bettzeit) |
| Tagebuch | Schalter je Katalogfrage | `tagebuch.eintraege[<Katalogschlüssel>]` | `tagebuch.eintraege[<WHOOP-Frage>]`, `.fragen` | Question text, Answered yes, Notes | Fragetext, Beantwortet mit Ja, Anmerkungen | – | **behoben** (vorher passte keine WHOOP-Frage zum Katalog); Zuordnung unten |
| Tagebuch | „Was hängt womit zusammen?“ | `tagebuchWirkung` (Erholung am Folgetag mit/ohne) | wie oben | wie oben | wie oben | – | OK; ab 5 Tagen je Gruppe (`tagebuch.min_n`) |
| Vergleich | WHOOP-Erholung | `fremd.erholung` | `fremdwerte.erholung` | Recovery score % | Erholungswert % | – | OK |
| Vergleich | WHOOP-Belastung | `fremd.belastung` (Zehntel) | `fremdwerte.belastung` | Day Strain | Tagesbelastung | – | OK |
| Vergleich | WHOOP-Schlafleistung | `fremd.schlafLeistung` | `fremdwerte.schlafLeistung` | Sleep performance % | Schlafleistung % | – | OK |
| Beleg | „Messwerte dahinter“ | `quellen[]` (`art`, `id`, `datei`, `zeile`, `herkunft`) | `quelle` je Datensatz | – | – | `metadata.dataOrigin` → `herkunft` | OK; Health Connect zeigt jetzt „Health Connect · com.whoop.android“; die einfache Erklärung steht über dem Rechenweg |
| (nicht angezeigt) | Energie, Max HF, Ø HF, Distanz, Schlafeffizienz/-beständigkeit von WHOOP, GPS | – | `energieKcal`, `maxPuls`, `mittelPuls`, `distanzM`, `effizienzProzent`, `konstanzProzent` | Energy burned (cal), Max HR, Average HR, Distance, Sleep efficiency %, Sleep consistency % | Verbrannte Energie (cal), Max HF, Durchschnittliche HF, – , Schlafeffizienz %, Schlafbeständigkeit % | – | gespeichert, keine Ansicht (Absicht) |

## Gefundene Brüche und Behebung

| # | Befund | Ursache | Behebung |
|---|---|---|---|
| 1 | Schlaf: „Geschlafen 9:26 h“, Leicht/Tief/REM 0 min | `kern/schlaf.js` `schlafZusammenfassung` las nur `phasen` (Zeitachse). CSV liefert `phasen: []` und `phasenSummen`; ohne Phasen galt die Bettzeit (bis − von) als Schlaf. 9:26 h war die **Bettzeit einer einzelnen Nacht**, keine Summe. | Reihenfolge: Zeitachse → `phasenSummen` → `schlafMs` → Bettzeit. Geschlafen = Leicht + Tief + REM. |
| 2 | Zwei CSV-Sätze unter „Messwerte dahinter“ | Es sind zwei verschiedene Nächte (Aufwachen 29. und 30.10.), nicht doppelt gezählt. Eine zweite Quelle kommt in den Beleg, wenn ein anderer Schlaf des Vortags als Nickerchen den Bedarf senkt (`nickerchen()` in `kern/tag.js`) oder wenn dieselbe Nacht aus Health Connect und CSV stammt. | Dieselbe Nacht/dasselbe Training aus zwei Quellen wird jetzt ein Satz (`kern/zusammenfuehren.js`, Überdeckung ≥ 50 % des kürzeren, `formeln.json zusammenfuehren.ueberlappung`); beide Quellen bleiben in der Quellenliste. |
| 3 | Belastung überall 0, wenn kein Alter/Höchstpuls eingestellt | `belastungTag` verlangte Höchst- und Ruhepuls, auch wenn alles aus WHOOPs Zonenanteilen kommt (braucht beides nicht). | Nur-Anteile-Tage rechnen ohne Pulsgrenzen (`kern/belastung.js`). |
| 4 | Ruhetage zeigten „0,0 von 21“ | Kein Training, keine Pulswerte → Kern liefert null → Ansicht setzte 0. | Heute: Strich; Belastung: Satz mit WHOOPs Wert, wenn vorhanden. |
| 5 | Tagebuch: keine WHOOP-Frage erreichte den Katalog | Schlüssel aus dem Fragetext (`haben_sie_alkohol_getrunken`) ≠ Katalogschlüssel (`alkohol`). | `kern/tagebuch.js` `katalogSchluessel`/`mitKatalog` beim Lesen (gilt auch für schon eingelesene Daten). |
| 6 | Tagebuch des laufenden Zyklus fiel auf den Vortag | Ohne Zyklusende galt der Tag des Zyklusbeginns (Vorabend) und überschrieb die Antworten des Vortags. | `daten/csv_import.js`: ohne Ende Mitte eines 24-Stunden-Zyklus. |
| 7 | Trainingsart „Training“ bei Radfahren, Krafttraining, Yoga | `artName` kannte nur `laufen/rad/kraft/gehen`. | Alias-Tabelle; Unbekanntes zeigt den Namen aus dem Export. |
| 8 | HRV, Atem, SpO2, Haut aus zwei Quellen gemittelt; Werte kurz nach dem Aufwachen fehlten | `nacht()` mittelte alles im Fenster; Fenster endete beim Aufwachen. | Eine Quelle je Art und Nacht (Health Connect, sonst CSV); Nachfenster 3 h (`zeit.nachfenster_nach_aufwachen`). |

## Tagebuch: Zuordnung der WHOOP-Fragen zum Katalog

Regeln in `kern/tagebuch.js` `katalogSchluessel` (nur eindeutig gleiche Bedeutung; verneinte Fragen nie). Die deutschen Fragetexte sind nach dem Muster
der WHOOP-App **vermutet** (die echten Texte des Nutzers liegen nicht vor) – beim ersten echten Export prüfen.

| Katalogschlüssel | Beispiele (DE / EN) |
|---|---|
| `alkohol` | „Alkohol getrunken?“ / „Have any alcoholic drinks?“ |
| `bildschirm_spaet` | „Mit Bildschirmgerät im Bett?“ / „Use a screen device in bed?“ |
| `lesen` | „Im Bett gelesen?“ / „Read (non-screened device) while in bed?“ |
| `spaete_mahlzeit` | „Kurz vor dem Schlafengehen gegessen?“ / „Eat close to bedtime?“ |
| `meditation` | „Meditiert?“ / „Meditate?“ |
| `kaltdusche` | „Eisbad genommen?“, „Kalt geduscht?“ / „Cold shower?“ |
| `sauna` | „Sauna?“ |
| `krank` | „Krank oder unwohl gefühlt?“ / „Feeling sick or ill?“ |
| `stress`, `reisen`, `atemuebung`, `koffein_spaet` | nur bei eindeutigem Wortlaut (z. B. „Koffein am Nachmittag“, „Caffeine after 3pm“) |

**Nicht zugeordnet** (bleiben unter ihrem eigenen Schlüssel erhalten, `fragen` hält den Text): „Koffein konsumiert?“ / „Consume caffeine?“ (ohne
Tageszeit, der Katalog fragt nach Koffein am Nachmittag), alle Fragen zu Ernährung, Medikamenten, Süßem, Sport, Nahrungsergänzung und jede verneinte
Frage („Kein …“, „No …“). Katalogfragen ohne WHOOP-Gegenstück: `atemuebung` (setzt die App selbst), `stress`, `reisen`, sofern WHOOP sie nicht fragt.

## Offen (Loris entscheiden)

1. **Tag eines Tagebucheintrags:** Mitte des WHOOP-Zyklus (heute). WHOOPs Journal fragt am Morgen nach dem Vortag; dann gehörte die Antwort einen Tag früher.
2. **Deutsche Fragetexte und Aktivitätsnamen** am echten Export abgleichen (`katalogSchluessel`, `artName`).
3. **Zeitzone im Zyklus mit Zeitumstellung:** WHOOP nennt eine Zone je Zyklus; liegt das Aufwachen nach der Umstellung, gilt für die Zeitstempel in der Datei vermutlich die neue Zone. Der Import nimmt die Zone der Zeile für alle Zeiten der Zeile (1 Stunde Abweichung, Tag bleibt gleich).
4. **Python-Port** `desktop/whoop_csv.py` kennt die Änderung 6 (Tagebuch ohne Zyklusende) noch nicht; die Fixtures haben immer ein Ende, der Test bleibt grün.
