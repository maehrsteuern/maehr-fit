# Status MAEHR FIT

| Datum | Schritt | Stand |
|---|---|---|
| 2026-10-30 | Projektstart, Entscheidungen Loris: Health Connect, Capacitor, Repo maehrsteuern/maehr-fit, Umfang Phase 1 (Heute-Sicht, Atem, Tagebuch/Trends, eigene Formeln) | erledigt |
| 2026-10-30 | Phase 1 gebaut: Kern (15 Module, 63 Formeln mit Fundstelle, 65 Tests), Shell (9 Ansichten, eigene Viz, Kleid „Ruhe“, MF.html 549 KB), Daten (Health Connect, WHOOP-CSV/ZIP, Capacitor-Projekt mit Kotlin-Plugin). 155 Tests grün, Browserprüfung 390/360/1280 px ohne Fehler. | erledigt |
| 2026-10-30 | Offen: Repo maehrsteuern/maehr-fit anlegen (Loris), APK auf Loris' Rechner bauen (`docs/technik/android.md`), 25 Formelwerte mit `pruefen: true` abnehmen, drei Auslegungen Daten (Tagebuch-Tag = Zyklusmitte, Hauttemp-Basis = Median des Imports, Schlaf ohne Phasen = „leicht“), WHOOP-Spaltennamen am ersten echten Export prüfen, Herzratenvariabilität über Health Connect unbestätigt (sonst CSV). | offen |
| 2026-10-30 | Phase 2 Live-Puls: BLE-Leser 0x2A37 + Strom mit Neuverbinden und 10-s-Stapel (`daten/ble_puls.js`, Brücken Web Bluetooth, Capacitor `@capacitor-community/bluetooth-le`, Demo), `kern/live.js` (Zone, laufende Belastung, Kurz-HRV, Kohärenz; 10 neue Formelwerte, 8 `pruefen: true`), Ansicht „Live-Puls“ (`#/live`), „Puls mitlesen“ im Atem, Android-Rechte. Tests grün, Playwright 390 px mit Demo und nachgebildetem Bluetooth ohne Fehler. Offen: am echten WHOOP-Band prüfen (Broadcast, RR-Abstände), `npm install` + `npx cap sync` auf Loris' Rechner, Feld Ruhepuls in den Einstellungen. | erledigt (ungeprüft am Band) |
