# Health Connect in MAEHR FIT

> **Kernaussage.** Health Connect ist der Datenspeicher für Gesundheitswerte auf Android-Handys. Die WHOOP-App kann dort
> Werte ablegen, und MAEHR FIT liest sie von dort – nur lesen, nichts schreiben, nichts ins Internet. Was WHOOP dort
> ablegt, ist allerdings weniger als im WHOOP-Export: Herzratenvariabilität und Hauttemperatur sind dort nach heutigem
> Wissen **nicht** sicher vorhanden. Für diese Werte bleibt der CSV-Export der verlässliche Weg.

## Weg der Daten

```
WHOOP-Band → WHOOP-App → Health Connect → Plugin (Kotlin) → MF.native.healthConnect → daten/healthconnect.js → Speicher → Kern
```

| Schicht | Datei | Aufgabe |
|---|---|---|
| Plugin | `android/plugins/healthconnect/…/HealthConnectPlugin.kt` | Rechte anfragen, Datensätze je Art und Zeitraum lesen, als JSON zurückgeben |
| Brücke | `daten/bruecke_capacitor.js` | Plugin als `window.MF.native.healthConnect` bereitstellen |
| Zuordnung | `daten/healthconnect.js` | Brückenformat → normierte Messwerte (rein, getestet) |
| Ablage | `daten/ablage.js` | `messung:<art>:<JJJJ-MM-TT>`, Doppelte über `quelle.id` ersetzen |
| Verbindung | `daten/verbinden.js` | `window.MF.daten.healthConnect.{verfuegbar, verbinden, synchronisieren}` |

## Zuordnung der Datenarten

| Health Connect | Recht (`android.permission.health.…`) | MF-Art | Feld | Hinweis |
|---|---|---|---|---|
| `HeartRateRecord` (Serie) | `READ_HEART_RATE` | `herzschlag` | `bpm` | je Einzelmessung ein Datensatz, `quelle.id = <id>#<ms>` |
| `HeartRateVariabilityRmssdRecord` | `READ_HEART_RATE_VARIABILITY` | `hrv` | `rmssdMs` | |
| `RestingHeartRateRecord` | `READ_RESTING_HEART_RATE` | `ruhepuls` | `bpm` | |
| `RespiratoryRateRecord` | `READ_RESPIRATORY_RATE` | `atemfrequenz` | `proMin` | |
| `OxygenSaturationRecord` | `READ_OXYGEN_SATURATION` | `spo2` | `prozent` | |
| `SkinTemperatureRecord` | `READ_SKIN_TEMPERATURE` | `hauttemp` | `deltaC`, `basisC` | je Abweichungswert ein Datensatz; nur wo das Gerät die Funktion meldet |
| `SleepSessionRecord` | `READ_SLEEP` | `schlaf` | `von`, `bis`, `phasen` | Stufen siehe unten; Tag = Aufwachtag |
| `ExerciseSessionRecord` | `READ_EXERCISE` | `training` | `von`, `bis`, `art`, `herzschlaege` | Herzschläge im Zeitraum werden angehängt |
| – | `READ_HEALTH_DATA_HISTORY` | – | – | Daten älter als 30 Tage vor der ersten Freigabe (nur neuere Health-Connect-Fassungen) |

Jeder Datensatz trägt `quelle = { art: "healthconnect", id: <metadata.id>, datei: "HealthConnect/<Art>", herkunft: <App-Paket> }`
und, falls geliefert, `zoneMin` (Versatz der Gerätezeit zu UTC in Minuten).

### Schlafstufen

| Health Connect (`STAGE_TYPE_…`) | Wert | MF-Phase |
|---|---|---|
| `UNKNOWN` | 0 | – (ausgelassen) |
| `AWAKE` | 1 | `wach` |
| `SLEEPING` | 2 | `leicht`, markiert `unbestimmt: true` (Schlaf ohne Stufenangabe) |
| `OUT_OF_BED` | 3 | `wach` |
| `LIGHT` | 4 | `leicht` |
| `DEEP` | 5 | `tief` |
| `REM` | 6 | `rem` |
| `AWAKE_IN_BED` | 7 | `wach` |

Die Werte stammen aus `connect-client 1.1.0-alpha08` (geprüft mit `javap`). Die Brücke darf Stufen als Zahl oder als Name
(`"DEEP"`) liefern.

### Trainingsarten

Häufige `EXERCISE_TYPE_…` werden zu MF-Kürzeln (`56 → laufen`, `8 → radfahren`, `70 → krafttraining`, `83 → yoga`, …, Liste in
`TRAININGSARTEN` in `daten/healthconnect.js`). Unbekannte Nummern bleiben als `hc_<nummer>` erkennbar, die Nummer steht in `typNr`.

## Brückenformat (Plugin → JavaScript)

Feldnamen wie in Health Connect, Zeiten als Unix-Millisekunden, Zeitzonen als Sekunden-Versatz.

```js
// gemeinsam
{ metadata: { id, dataOrigin: "com.whoop.android", lastModifiedTime }, … }
// Zeitpunkt-Arten
{ time, zoneOffsetSek, heartRateVariabilityMillis | beatsPerMinute | rate | percentage }
// Zeitraum-Arten
{ startTime, endTime, startZoneOffsetSek, endZoneOffsetSek, … }
HeartRate        … samples: [{ time, beatsPerMinute }]
SkinTemperature  … baselineCelsius?, measurementLocation, deltas: [{ time, deltaCelsius }]
SleepSession     … title?, stages: [{ startTime, endTime, stage }]
ExerciseSession  … exerciseType, title?
```

Beispiele: `daten/fixtures/healthconnect_*.json` (erfunden).

## Abgleich

- Erster Abgleich: 30 Tage zurück. Danach ab dem letzten Stand minus 48 Stunden, weil WHOOP verzögert schreibt.
  Doppelte fängt `quelle.id` ab.
- Gelesen wird in Tagesfenstern. Nach jedem Fenster wird der Stand gemerkt (`sync:healthconnect:<Art>` → `{ bisMs, zeitpunktMs, anzahl }`).
  Bricht etwas ab, setzt der nächste Lauf dort an.
- Fehlt ein Recht für eine Art, wird nur diese übersprungen und gemeldet.
- Die Vorgaben (30 Tage, 48 Stunden, 1 Tag) sind technische Einstellungen des Lesens, keine Rechenformeln; sie stehen in
  `VORGABEN` in `daten/healthconnect.js` und lassen sich je Aufruf überschreiben.

## Was WHOOP nach Health Connect schreibt

Stand der Recherche: 30.10.2026. Eine vollständige offizielle Liste von WHOOP wurde nicht gefunden; die Tabelle stützt sich auf die Ankündigung von 2023 und Nutzerberichte.

| Art | Stand | Beleg |
|---|---|---|
| Training („Cardio workouts“) | **bestätigt** | WHOOP-Ankündigung der Integration, zitiert bei gadgetsandwearables.com (14.07.2023) |
| Schlaf („Sleep summary“) | **bestätigt** (Zusammenfassung; ob mit Stufen: unklar) | ebenda |
| Ruhepuls | **bestätigt** | ebenda |
| Atemfrequenz | **bestätigt** | ebenda |
| Blutsauerstoff (SpO2) | **bestätigt** (nur WHOOP 4.0 und neuer) | ebenda; DC Rainmaker (2022) zu Apple Health |
| Herzschlag | **teilweise**: nach Nutzerberichten nur während Trainings | WHOOP-Community „Share heart rate with health connect / apple health“ |
| Herzratenvariabilität (RMSSD) | **nicht bestätigt**, eher nicht | keine Quelle gefunden; für Apple Health wurde HRV früher ausdrücklich nicht geteilt (tryterra.co) |
| Hauttemperatur | **nicht bestätigt** | keine Quelle gefunden |
| Schritte | **nein** | WHOOP-Community, Antwort des Supports |

Folge: Über Health Connect fehlt MF voraussichtlich die HRV, die für die Erholung wichtig ist. Bis das am echten Gerät geprüft
ist, sollte zusätzlich der WHOOP-CSV-Export eingelesen werden (`docs/technik/daten.md`). Prüfen geht so: Health Connect öffnen →
„Daten und Zugriff“ → je Kategorie nachsehen, ob WHOOP als Quelle erscheint.

Freischalten in der WHOOP-App: Menü „Mehr“ → „Integrationen“ (je nach Fassung „App-Einstellungen“) → „Health Connect“ →
Freigabe einschalten und die Datenarten wählen.

## Datenschutz-Seite

Health Connect verlangt eine Seite, die erklärt, wofür die App die Daten nutzt. Sie liegt in
`DatenschutzActivity.kt` (Text in `android/plugins/healthconnect/src/main/res/values*/strings.xml`) und ist im Manifest für
Android 13 (`androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`) und Android 14+ (`VIEW_PERMISSION_USAGE` über
`activity-alias`) eingetragen.

## Versionen

| Teil | Version | Grund |
|---|---|---|
| `androidx.health.connect:connect-client` | 1.1.0-alpha08 | letzte Fassung, die mit compileSdk 34 baut (alpha09: 35, 1.1.0: 36 und AGP 8.9.1); enthält `SkinTemperatureRecord` |
| Capacitor | 6.2 | targetSdk 34, compileSdk 34, AGP 8.2.1 |
| Kotlin | 1.9.24 | für das Plugin; geprüft: das Plugin übersetzt fehlerfrei gegen die echte Health-Connect-Bibliothek |
| minSdk | 26 | von Health Connect verlangt; Health Connect selbst läuft erst ab Android 9 |

Wechsel auf neuere Versionen (für den Play Store nötig: targetSdk 35) = Capacitor 7 oder 8, dann connect-client 1.1.0.

Quellen der Recherche:
[gadgetsandwearables.com – WHOOP Health Connect](https://gadgetsandwearables.com/2023/07/14/whoop-health-connect-integration/) ·
[WHOOP-Community – Herzschlag teilen](https://www.community.whoop.com/t/share-heart-rate-with-health-connect-apple-health/13681) ·
[WHOOP-Community – Schritte](https://www.community.whoop.com/t/steps-sync-issue-with-android-health-connect/3702) ·
[DC Rainmaker – Exporting Health](https://dcrainmaker.com/2022/04/exporting-health-actually.html) ·
[Terra – WHOOP und Apple Health](https://tryterra.co/blog/whoop-syncs-health-data-to-apple-health-ee298d328f41) ·
[Android – Health-Connect-Datentypen](https://developer.android.com/guide/health-and-fitness/health-connect/plan/data-types)
