# MAEHR FIT (MF) – Regeln für jede Sitzung

- Start: `UEBERGABE.md` und `docs/STATUS.md` lesen, Loris sagen, was läuft und was offen ist.
- **Mit Loris auf Deutsch reden.** Repo-Sprache Deutsch (Kommentare, Dateinamen, Commits). Oberfläche DE/EN über `kern/i18n.js`.
- **Erklären vor Fachsprache:** Jede Antwort und jede Sicht beginnt mit der Kernaussage in drei bis vier Sätzen ohne Jargon.
- **UX wie MBS:** Ein Blick → Gliederung → Beleg (`docs/technik/ux_leitlinien.md`). Eine Kernaussage je Sicht, höchstens 4 Kacheln,
  höchstens ein Diagramm je Frage. Diagramme nur über `shell/viz/viz.js`. Geprüft von `tests/node/ruhe.test.mjs`.
- **Jede Zahl klickbar** (`data-q`) bis zur Quelle: Health-Connect-Datensatz oder CSV-Zeile, und zur Formel mit Fundstelle.
- **Formeln nur aus `kern/formeln/formeln.json`**, jeder Wert (Gewichte, Grenzen, Zonen, Dauer) mit Fundstelle. Unsichere Werte
  `"pruefen": true` und Loris melden. Keine Konstante, keine Schwelle im Code.
- **Kern ohne DOM, Netz, Speicher** – nur über die Schnittstelle `speicher` (`kern/speicher.js`). Rechnen in ganzen Einheiten
  (Millisekunden, Schläge, Promille) – keine Gleitkomma-Vergleiche auf Gleichheit.
- **Daten bleiben beim Nutzer.** Keine fremden Adressen, kein Netz. Health Connect wird nur gelesen. Keine echten Gesundheitsdaten
  im Repo; Demodaten = erfundene „Musterperson“ (`kern/demo.js`).
- **Kein medizinischer Rat.** Texte beschreiben Messwerte und Tendenzen, nie Diagnosen. Hinweis in `shell/i18n/`.
- **Tests:** je Kernmodul ein von Hand nachgerechneter Fall mit Rechenweg als Kommentar plus Grenzfälle (`node --test tests/node`).
- **Bau:** `python3 bau.py` erzeugt `MF.html` (eine Datei, offline). Nach Änderungen an Kern oder Shell neu bauen und mitcommitten.
  Android-APK über Capacitor in `android/` (`docs/technik/android.md`), gebaut auf Loris' Rechner.
- **Git:** deutsche Commit-Nachrichten. `docs/STATUS.md` nach jedem Schritt aktualisieren. Nie auf main pushen.

## EVA-Prinzip (Daueranweisung von Loris)
Eingabe → Verarbeitung → Ausgabe. Vor der Ausgabe wird alles vermenschlicht: Kernaussage zuerst, ohne Fachsprache, visuell sauber
(keine Überläufe, echte Knöpfe, lesbare Beschriftungen, ruhige Formulare).
