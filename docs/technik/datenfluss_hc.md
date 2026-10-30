# Datenfluss: Health Connect bis in jede Ansicht

> **Kernaussage.** Jede der acht gelesenen Health-Connect-Arten kommt vollständig im Speicher an (Prüfung Feld für Feld mit
> den Fixtures, `tests/node/daten_hc_datenfluss.test.mjs`). Ob eine Ansicht etwas zeigt, hängt also vor allem davon ab, **was
> WHOOP nach Health Connect schreibt** – und an drei Stellen im Kern, die nicht zu den Health-Connect-Daten passen
> (Doppelte mit dem CSV, Nachtfenster der Messwerte, Phasensummen aus dem CSV). Stand 31.10.2026, noch nicht am Handy geprüft.

## Health Connect

Weg: `HealthConnectPlugin.kt` (Brückenformat) → `daten/bruecke_capacitor.js` → `daten/healthconnect.js` (`zuordnen`) →
`daten/ablage.js` (`messung:<art>:<JJJJ-MM-TT>`) → Shell lädt alle Arten (`shell/shell.js`) → `kern/tag.js` → `shell/kern_echt.js` (Tagesbild).

| HC-Art | Kotlin-Feld | JS-Feld | Speicher-Feld | Kern-Feld | Ansicht | Status |
|---|---|---|---|---|---|---|
| `HeartRateRecord` | `samples[].time` (ms), `samples[].beatsPerMinute`, `startZoneOffsetSek` | `herzschlaege[]`: `t`, `bpm`, `zoneMin` | `messung:herzschlag:<Tag>` → `{ t, bpm, zoneMin, quelle }`, `quelle.id = <id>#<ms>` | `daten.herzschlag[].t/bpm` → `belastungTag` (Zonen, Alltag zwischen Aufwachen und Aufwachen) | Belastung, Heute (Belastungsring); Trainingskurve | OK. WHOOP schreibt Puls nach Nutzerberichten nur im Training (unbestätigt) → Belastung dann nur aus Trainings |
| `HeartRateVariabilityRmssdRecord` | `time`, `zoneOffsetSek`, `heartRateVariabilityMillis` (ms) | `hrv[]`: `t`, `rmssdMs`, `zoneMin` | `messung:hrv:<Tag>` | `nacht(tag).hrv`: Mittel aller Werte von Einschlafen bis Aufwachen + 1 ms, in Zehntel-ms; Basislinie in ln | Heute (Kachel, Erholungsteil), Trends HRV, Beleg `hrv:<Tag>` | OK im Code. **Daten unbestätigt**: schreibt WHOOP kein HRV, fehlt der größte Erholungsteil (Zeile „Nicht berücksichtigt: HRV“) |
| `RestingHeartRateRecord` | `time`, `zoneOffsetSek`, `beatsPerMinute` | `ruhepuls[]`: `t`, `bpm` | `messung:ruhepuls:<Tag>` | `nacht(tag).ruhepuls`: erster Wert ab Einschlafen bis zur nächsten Nacht; auch Ruhepuls für die Zonen | Heute, Trends Ruhepuls, Belastung (Zonen) | OK. Fehlt er: Einstellung „Ruhepuls“, sonst Belastung 0 |
| `RespiratoryRateRecord` | `time`, `zoneOffsetSek`, `rate` (Atemzüge/min) | `atemfrequenz[]`: `t`, `proMin` | `messung:atemfrequenz:<Tag>` | `nacht(tag).atem` (Zehntel), nur Werte im Schlaffenster | Heute (Kachel, Erholungsteil), Beleg. Die Ansicht „Atem“ (Übungen) braucht sie nicht | OK |
| `OxygenSaturationRecord` | `time`, `zoneOffsetSek`, `percentage.value` (0–100) | `spo2[]`: `t`, `prozent` | `messung:spo2:<Tag>` | `nacht(tag).spo2` (Zehntel) → Abzug in der Erholung | Heute (Erholungsteil), Beleg | OK |
| `SkinTemperatureRecord` | `startTime/endTime`, `baseline.inCelsius?`, `measurementLocation`, `deltas[].time/delta.inCelsius` | `hauttemp[]`: `t`, `deltaC`, `basisC` (je Abweichung ein Satz) | `messung:hauttemp:<Tag>` | `nacht(tag).hauttemp` (Mittel der Abweichung, Hundertstel) → Abzug in der Erholung | Heute (Erholungsteil), Beleg | OK. Nur wo das Gerät es meldet; WHOOP schreibt sie vermutlich nicht |
| `SleepSessionRecord` | `startTime/endTime`, `start/endZoneOffsetSek`, `title?`, `stages[]` (`startTime`, `endTime`, `stage`: 1 wach, 2 schläft, 3 außer Bett, 4 leicht, 5 tief, 6 REM, 7 wach im Bett, 0 unbekannt) | `schlaf[]`: `von`, `bis`, `phasen[]` (`von`, `bis`, `art` = wach/leicht/tief/rem, `unbestimmt` bei 2), `titel`, `zoneMin` (jetzt Versatz am **Ende**) | `messung:schlaf:<Aufwachtag>` | `hauptschlaf`, `schlafZusammenfassung` (`phasen` in ms, `mitPhasen`), Bedarf, Schuld, Konsistenz; Nickerchen = übrige Sitzungen des Tages | Schlaf (Hypnogramm, Phasen, Bedarf), Heute (Streifen), Trends Schlafdauer | OK, **wenn WHOOP Stufen schreibt**. Ohne Stufen (`phasen: []`) zeigt die Schlafansicht 0 min je Phase; Diagnose: `schlafPhasen { mit, ohne }` |
| `ExerciseSessionRecord` | `startTime/endTime`, `exerciseType` (Zahl), `title?` | `training[]`: `von`, `bis`, `art` (Kürzel oder `hc_<Nr>`), `typNr`, `titel`, `herzschlaege[]` (aus `HeartRate` im Zeitraum) | `messung:training:<Tag>` | `belastungTag(trainings, alltag)`; Training wird dem Tag des Beginns zugeordnet | Belastung (Karten, Pulskurve), Heute | OK. Ansichtstext kennt nur laufen/rad/kraft/gehen (siehe 2.) |
| – | `metadata.dataOrigin.packageName` | `quelle.herkunft` | in jedem Satz: `quelle { art: "healthconnect", id, datei, herkunft }` | Quellenlisten (`kern/quellen.js`) reichen das Objekt unverändert durch (getestet) | Beleg-Quellenkarte | OK im Datenpfad; **Beleg zeigt `herkunft` noch nicht** (siehe 3.) |

Nicht gelesen, bewusst: `ActiveCaloriesBurned`/`TotalCaloriesBurned`. Der Kern rechnet Belastung aus dem Puls; Kalorien würden nur
eine neue Art in `ARTEN` (`daten/ablage.js`), Rechte im Manifest und eine Ansicht brauchen. Kotlin dafür unverändert.

### Kotlin

Geprüft Feld für Feld gegen die Brücke: Schlafstufen (`stages` mit `stage`-Zahl), `dataOrigin`, `exerciseType`, `title`,
Zeitzonen-Versätze werden schon vollständig serialisiert; die Stufenkonstanten (0–7) stimmen mit `connect-client 1.1.0-alpha08`
überein. **Keine Kotlin-Änderung nötig.** Was fehlt, ist nicht im Plugin, sondern in den Daten, die WHOOP schreibt.

### Befunde und Regeln

1. **Doppelte bei CSV + Health Connect (Kern/Ablage, nicht in `daten/healthconnect.js`).** Gleiche Nacht aus beiden Quellen hat
   verschiedene `quelle.id` (`whoop:schlaf:<ms>` gegen `<HC-id>`) und wird nicht zusammengelegt. Gemessen mit den Fixtures:
   - 29.10.: zwei Nächte (HC mit 5 Phasen, CSV ohne) und zwei Läufe → die zweite Nacht zählt als **Nickerchen**, die Belastung des Trainings doppelt.
   - 28.10.: CSV 22:05–05:35 (450 min) und HC 22:20–05:35 (435 min). `hauptschlaf` nimmt den **längsten**, also die CSV-Nacht ohne Phasen – die HC-Phasen bleiben ungenutzt.
   - HRV/Ruhepuls/Atem aus beiden Quellen werden im Nachtfenster gemittelt (doppeltes Gewicht).

   Regel (in `kern/tag.js` `normiere` oder beim Lesen in der Ablage): zwei Schlafsätze gehören zusammen, wenn die Überlappung
   mindestens die Hälfte des kürzeren beträgt; zwei Trainings ebenso. Führender Satz: der **mit echten Phasen bzw. Pulswerten**
   (Health Connect), sonst der erste; fehlende Felder (`fremdwerte`, `phasenSummen`, `zonenProzent`, `art` statt `hc_<Nr>`) aus dem
   anderen übernehmen, beide Quellen in `quellen` behalten. Punktwerte je Art und Nacht nur aus **einer** Quelle (Health Connect, sonst CSV), nicht mitteln.
2. **Trainingsart.** `healthconnect.js` und `csv_import.js` liefern `radfahren`, `krafttraining`, `wandern`, … ; `shell/apps/belastung.js`
   (`artName`) kennt nur `laufen`, `rad`, `kraft`, `gehen` und zeigt sonst „Training“. Entweder `artName` um die Kürzel erweitern
   (`radfahren`→rad, `krafttraining`/`gewichtheben`→kraft) oder die Datenschicht auf `rad`/`kraft` umstellen.
3. **Quelle/App im Beleg.** `quellenAnzeige(quelle)` (`daten/healthconnect.js`) liefert `Health Connect · com.whoop.android`.
   `shell/apps/beleg.js` `quellenKarten`: `ort` um diese Zeile ergänzen (vor `datei`). Der Text „Herkunft“ steht schon als `beleg_herkunft`.
4. **Diagnose im Daten-Ansicht.** `verbinden()` liefert jetzt `herkunft` (je MF-Art die schreibenden Apps mit Anzahl) und `schlafPhasen`
   (`{ mit, ohne }`). `shell/shell.js` `hcVerbinden` gibt sie bisher nicht weiter; in `shell/apps/daten.js` anzeigen:
   „HRV: 0 Werte – WHOOP schreibt sie nicht“ und „Schlaf: 14 Nächte, 0 mit Phasen“. So sieht man am Handy sofort, woran es liegt.
5. **Phasensummen aus dem CSV.** `csv_import.js` liefert `phasen: []` plus `phasenSummen { wachMs, leichtMs, tiefMs, remMs }`;
   `kern/schlaf.js` `schlafZusammenfassung` liest nur `phasen` → CSV-Nächte zeigen 0 min je Phase. Fallback: ohne `phasen` die
   `phasenSummen` übernehmen (Hypnogramm bleibt leer, Summen und Anteile erscheinen).
6. **Nachtfenster der Messwerte.** `nacht()` nimmt HRV, Atem, SpO2, Hauttemperatur nur zwischen Einschlafen und Aufwachen + 1 ms.
   Schreibt WHOOP einen Tageswert mit Zeit nach dem Aufwachen (z. B. beim Synchronisieren), fällt er heraus. Fallback im Kern:
   gibt es im Schlaffenster nichts, nimm den Wert der ersten 3 Stunden nach dem Aufwachen. Erst am Handy prüfen, mit `herkunft` und der Zeit der Sätze.
7. **Mehrere Apps.** Schreiben mehrere Apps (z. B. WHOOP und Samsung Health) Schlaf oder Puls, mischt Health Connect sie. `quelle.herkunft`
   ist jetzt an jedem Satz; ein Filter nach Paketname wäre ein späterer Schritt.

### Geändert in diesem Durchgang

- `daten/healthconnect.js`: Schlaf-Tag nach dem Versatz am **Ende** der Sitzung (Aufwachtag, Reise über Zeitzonen); neue reine Hilfen
  `hatSchlafphasen`, `quellenAnzeige`; `synchronisieren` liefert `herkunft` und `schlafPhasen`.
- `daten/verbinden.js`: nur Kommentar (neue Ergebnisfelder).
- `daten/fixtures/healthconnect_SleepSession_ohneStufen.json`: Nacht ohne Stufen.
- `tests/node/daten_hc_datenfluss.test.mjs`: 9 Tests (jede Art bis zum Speicherformat, Schlafstufen von Hand nachgerechnet,
  Schlaf ohne Stufen, Zeitzone, 10 Tage bis zum Tagesbild für Heute/Schlaf/Belastung/Trends/Vergleich, Beleg mit Herkunft).
