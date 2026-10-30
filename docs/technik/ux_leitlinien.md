# UX-Leitlinien: Ruhe statt Dichte (MAEHR FIT)

> **Kernaussage.** Jede Ansicht von MAEHR FIT wird vom Allgemeinen ins Spezielle gelesen: zuerst ein Satz und eine Zahl, dann
> eine kurze Gliederung, erst auf Tipp die Einzelzahl bis zum Messwert und zur Formel. Wer die App öffnet, soll in drei Sekunden
> wissen, wie erholt er ist – nicht zwanzig Werte lesen. Die Regeln sind messbar und werden von `tests/node/ruhe.test.mjs`
> geprüft; ein Verstoß macht den Test rot. Vorbild ist die MAEHR BUSINESS SUITE (MBS) im Kleid „Ruhe“.

Gilt für `shell/` (alle Ansichten, Kopf- und Reiterleiste, Belegfenster). Diagramme nur über `shell/viz/viz.js`.
Farben und Schriften: `shell/design/marke.css` (einzige Datei mit Farbwerten) und `shell/design/design.css` (Tokens, Bausteine).

## Ebene 1 – „Ein Blick“

**Regeln**
- Je Ansicht **genau eine Kernaussage** (`<p class="mf-kern">`, Baustein `kernaussage()` in `shell/ui.js`) als ganzer Satz in
  Alltagssprache, oben, vor allen Zahlen. Eine Zahl darin ist ein Knopf.
- Höchstens **eine Heldenzahl** (Ring, `ring()` aus `viz.js`) und **höchstens 4 Kacheln** auf „Heute“.
- Höchstens **ein Diagramm je Frage**; jedes Diagramm hat Titel und Kernaussage (Satz).
- **Kopfleiste ≤ 6 Elemente** – heute fünf: Marke „MF“ · Tag ‹ heute › · Hell/Dunkel · Sprache · Menü (`shell/rahmen.js`).
- **Reiterleiste unten** mit fünf Reitern: Heute · Schlaf · Belastung · Atem · Mehr (Tagebuch, Trends, Daten, Einstellungen).
- Hinweise als Chip (Demodaten), nicht als Band über die ganze Breite.

**Beispiele**: „Du bist heute gut erholt: 71 %. Die Nacht war kürzer als dein Bedarf, aber ruhig.“ über dem Ring; „Du hast
43 min weniger geschlafen, als du gebraucht hättest.“ über Bedarf und Phasen.

**Negativbeispiele**: acht Zahlen mit acht Ampeln nebeneinander; ein Satz „Tippe auf eine Kachel“ an der Stelle der Antwort;
Torte, zwei Y-Achsen, Zahlen an jedem Punkt.

## Ebene 2 – „Gliederung“

- Aufklappbare Abschnitte (`<details class="mf-gliederung">`), höchstens 7 Einträge je Ebene.
- Titel in Klartext („Woraus sich die Erholung zusammensetzt“), Formelnamen nur im Belegfenster.
- Bestandteile mit Gewicht und Beitrag in Punkten (Erholung), Teile des Schlafbedarfs, Zeit je Pulszone.

## Ebene 3 – „Beleg“

- **Jede Zahl ist ein Knopf** `<button class="zahl" data-q="art:schluessel">` (z. B. `erholung:2026-10-30`). Ein einziger
  Klick-Fang in `shell/shell.js` öffnet das Belegfenster (`shell/apps/beleg.js`): Wert, Rechenweg mit Fundstelle (aus
  `kern/formeln/formeln.json`, unsichere Werte mit „noch zu prüfen“), Bestandteile, Messwerte dahinter (Art, Kennung, Datei/Zeile).
- Zu jedem `data-q` gibt es einen Eintrag im Beleg-Register (`shell/belege.js` und die Ansichten); der Ruhe-Test prüft das.
- Jeder Balken, Punkt und Abschnitt eines Diagramms ist ein fokussierbares Ziel (`tabindex="0"`) mit `data-quelle` und `data-q`;
  Enter/Leertaste wirkt wie Tippen (`vizTastatur`).

## Typografie

Barlow Condensed (Titel, große Zahlen, Gewicht 500–700, Großbuchstaben für Überschriften) und Barlow (Sätze, 400–600), eingebettet (`shell/vendor/schriften.css`,
SIL OFL 1.1). Skala: `--t-1` 12 px (Beschriftung, versal, `.08em`) · `--t-2` 13 · `--t-3` 15 (Grundschrift) · `--t-4` 16 ·
`--t-5` 17 (Kernaussage) · `--t-6` 22 · `--t-anzeige` 32/40 (Kachelzahl) · `--t-held` 72/96 (Ring). Nichts unter 12 px.

## Abstände, Formen, Bewegung

`--r1..--r6` = 4/8/12/16/24/32 px; Karten Radius 24, Knöpfe als Pille (999 px), keine Schatten, Haarlinien `--grau-3`.
Bewegung höchstens 450 ms, Kurve `cubic-bezier(.33,1,.68,1)`, nur `transform` und `opacity`, aus bei `prefers-reduced-motion`.
Ausnahme mit Begründung: der Atemkreis folgt dem Atemtakt (Sekunden) und wird je Bild per `requestAnimationFrame` gesetzt;
bei „weniger Bewegung“ steht er still und ein Fortschrittsbalken zeigt die Phase.

## Farben (hell/dunkel)

- Werte nur in `marke.css` (gleich wie MBS, ergänzt um `--m-*-fehler-weich`, Diagrammfarben `--m-*-vz-k0…k4` und
  `--m-*-erholung-gruen/gelb/rot` als Verweise auf ok/bernstein/fehler). Keine Hex-Farbe sonst (Test).
- Dunkel über drei Blöcke wie MBS: `:root`, `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` und
  `:root[data-theme="dark"]` mit denselben Werten (Test prüft Gleichheit). Der Knopf im Kopf schaltet auto → hell → dunkel.
- Grün = weiter/gut, Bernstein = mittel/hinsehen, Rot = wenig/Fehler – **immer mit Wort** („Bereich grün“), nie nur Farbe.
- Kontrast: Schrift ≥ 4,5 : 1, Grafik ≥ 3 : 1, gerechnet aus `marke.css` im Ruhe-Test (hell und dunkel).

## Zustände

| Zustand | So sieht er aus |
|---|---|
| leer | Ein freundlicher Satz und ein Knopf („Zum letzten Tag mit Messwerten“); Diagramme: „Noch keine Werte für dieses Diagramm.“ |
| lädt | „Deine Werte werden geladen …“ an der Stelle der Kernaussage |
| Fehler | Ein Satz, was passiert ist und was zu tun ist |
| Demo | Chip „Demodaten der Musterperson – alle Werte sind erfunden.“ mit Knopf „Eigene Daten verbinden“ |

## Sprache und Ton

- Deutsch und Englisch (`shell/i18n/i18n.js`, `t()`); jeder Text in beiden Sprachen mit denselben Platzhaltern (Test).
- Warm, „du“, keine Fachsprache im ersten Satz. **Keine medizinischen Aussagen**: nie „gesund“, „krank“, „Diagnose“ – sondern
  „Messwerte“, „Tendenz“, „üblicher Bereich“ (Test sucht die Wörter). Hinweis „kein Medizinprodukt“ unter „Mehr“.

## Handy und Barrierefreiheit

- Handy zuerst (360–390 px): kein waagerechter Überlauf, Tippziele ≥ 44 px, Raster `repeat(n, minmax(0, 1fr))`.
- Geprüft mit Playwright bei 390 × 844 (hell, dunkel), 360 und 1280 px: keine Konsolenfehler, `scrollWidth ≤ innerWidth`.
- Fokus sichtbar (`:focus-visible` 2 px `--marke`), Landmarken (Kopf `banner`, `main`, Reiter `nav`), Belegfenster als `<dialog>`
  mit Titel, Esc schließt. Diagramme mit `role="img"`, `aria-label` (Satz mit allen Werten) und aufklappbarer Tabelle.
