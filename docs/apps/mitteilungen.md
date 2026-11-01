# Mitteilungen & Widgets (`#/mehr/mitteilungen`)

**Kernaussage.** Hier stellst du ein, ob MAEHR FIT auch bei geschlossener App neue Werte holt, wann der Morgenbericht kommt und wie
du die drei Widgets auf den Startbildschirm bekommst. Oben steht in einem Satz, ob der Abgleich läuft und wann er zuletzt lief.
Auf Xiaomi-Handys braucht es zwei Schalter im System (Autostart, Akku) – die Knöpfe führen direkt dorthin. Im Browser gibt es das
alles nicht; die Seite sagt das ruhig in einem Satz.

Datei: `shell/apps/mitteilungen.js` (aufgerufen aus `shell/apps/mehr.js`, Weg `#/mehr/mitteilungen`, damit `shell/shell.js` keinen
neuen Weg braucht), Stile `shell/design/design_mitteilungen.css`, Texte `mt_*`/`hg_*` in `shell/i18n/i18n.js`.
Technik: `docs/technik/hintergrund.md`.

## Im Browser

Kernaussage: „Morgenbericht, Widgets und der Abgleich bei geschlossener App gibt es nur in der Android-App von MAEHR FIT. Im Browser
holst du neue Werte beim Öffnen.“ Darunter eine Karte mit drei Punkten, was die App zusätzlich kann. Keine Schalter, keine Knöpfe.

## In der Android-App

Der Stand kommt nach dem Zeichnen von Android (`MF.native.hintergrund.status()`); bis dahin „Der Stand des Abgleichs wird geladen …“.

| Zustand | Kernaussage |
|---|---|
| Abgleich aus | „Der Abgleich im Hintergrund ist aus. Neue Werte kommen nur, wenn du die App öffnest.“ |
| an, Hintergrundrecht fehlt | „MAEHR FIT darf Health Connect noch nicht im Hintergrund lesen. Erlaube es unten, …“ |
| an, noch kein Lauf | „MAEHR FIT holt alle 60 Minuten neue Werte, auch wenn die App zu ist. Der erste Lauf steht noch aus.“ |
| an | „… Zuletzt: **vor 12 Minuten**. Der Morgenbericht kommt um 07:30.“ |

„vor 12 Minuten“ ist ein Zahl-Knopf mit Beleg `hintergrund:letzter` (Zeitpunkt, Ergebnis, neue Datensätze je Art, Quelle
`files/eingang/<Typ>.jsonl`).

Karten (je mit Symbol-Kachel vor dem Titel, wie „Sync“):

1. **Abgleich im Hintergrund** – Schalter „Im Hintergrund abgleichen“, Auswahl „Wie oft“ (30 / 60 / 120 Minuten), Zeilen
   „Letzter Lauf“, „Nächster Lauf“ (etwa), „Health Connect im Hintergrund“ (erlaubt / nicht erlaubt / auf diesem Gerät nicht
   möglich); Knöpfe „Im Hintergrund erlauben“ (nur wenn möglich und nicht erteilt), „Health Connect öffnen“, „Jetzt abgleichen“.
2. **Morgenbericht** – Hinweis auf weicher Bernstein-Fläche, wenn Android Mitteilungen nicht zeigt („Mitteilungen erlauben“ bzw.
   nach Ablehnung „Mitteilungs-Einstellungen“); Schalter „Morgenbericht senden“; Auswahl „Wann“: „nach dem Aufwachen“ oder
   05:00–11:00 in Viertelstunden (Standard 07:30); Schalter „Hinweis bei roter Erholung“ (nur, wenn der Morgenbericht aus ist) und
   „Hinweis zur Schlafenszeit“; Knopf „Test-Mitteilung senden“ (mit eigenen Werten, sonst klar benannte Beispielzahlen).
3. **Xiaomi, Redmi, POCO** (bei diesen Herstellern) – „Autostart erlauben und Akku-Optimierung für MAEHR FIT ausschalten – sonst
   stoppt das System den Abgleich im Hintergrund.“ Knöpfe „Autostart öffnen“, „Akku-Einstellungen öffnen“. Bei anderen Herstellern
   „Wenn nichts im Hintergrund ankommt“ mit „Akku-Einstellungen öffnen“.
4. **Widgets** – „Startbildschirm lange gedrückt halten → „Widgets“ → MAEHR FIT → Erholung (2 × 2), Heute (4 × 2) oder Schlaf
   (2 × 1) auf den Bildschirm ziehen.“, Anzahl auf dem Startbildschirm, Knopf „Widgets jetzt aktualisieren“ (spiegelt erst die
   Zusammenfassung der App, dann zeichnet Android neu).

Jede Änderung geht sofort an Android (`hintergrund.einstellen`, `mitteilungen.einstellen`); danach wird der Stand neu geladen.
Wer aus den System-Einstellungen zurückkommt, sieht den neuen Stand (Sichtbarkeitswechsel). Eine Statuszeile (`role="status"`)
meldet Ergebnis oder Fehler in einem Satz.

## Prüfung

`tests/node/shell_hintergrund.test.mjs`: Browser und Android je DE/EN – genau eine Kernaussage, jeder Zahl-Knopf mit Beleg, vier
Schalter, Uhrzeit vorausgewählt, Xiaomi-Knopf nur bei Xiaomi, ohne Recht der Erlauben-Knopf, Stylesheet eingebunden und ohne Farbwerte.
