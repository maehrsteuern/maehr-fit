# Design MAEHR FIT: Kleid „Nacht“

> **Kernaussage.** MAEHR FIT ist dunkel, ruhig und leuchtet nur dort, wo es etwas zu sagen gibt: Die Erholung glimmt in ihrer
> Farbe, alles andere tritt zurück. Jede Ansicht beginnt mit einem Satz in normaler Sprache, dann kommt eine große Zahl, dann
> ein paar kleine Bilder, erst auf Tipp der Beleg bis zum Messwert. Flächen heben sich durch Tonstufen ab, nicht durch Schatten;
> Bewegung ist kurz (höchstens 450 ms) und erklärt etwas. Hell sieht MF aus wie die MAEHR BUSINESS SUITE, mit denselben Rollen.

Gilt für `shell/` (Ansichten, Kopf- und Reiterleiste, Belegfenster). Die Lese-Regeln stehen in `docs/technik/ux_leitlinien.md`;
geprüft wird beides von `tests/node/ruhe.test.mjs` und `tests/node/shell_viz.test.mjs`.

## 1. Themen

| | Dunkel „Nacht“ (Grundeinstellung beim ersten Start) | Hell „Ruhe“ (wie MBS) |
|---|---|---|
| Bühne | Verlauf `--m-nacht-2` (oben, Nachtgrün) → `--m-nacht` | `--m-h-buehne-oben` (Grünschimmer) → `--m-h-grund` (Salbei) |
| Flächen | `--m-d-flaeche-1/2/3` | `--m-h-flaeche-1/2/3` (Weiß, fast Weiß, Salbei) |
| Leisten | Glas `--m-d-glas` + Unschärfe 18 px, ohne Unterstützung deckend | Glas `--m-h-glas` |
| Leuchten | `--m-d-glow-gruen/gelb/rot/akzent` (Alpha .45–.55) | dieselben Rollen, Alpha .22–.28 |

Umschalten: Knopf in der Kopfleiste (dunkel → wie das Gerät → hell → dunkel) oder Einstellungen → Darstellung. `shell/index.html`
startet mit `data-theme="dark"`, damit beim Laden nichts hell aufblitzt. Farbwerte stehen nur in `shell/design/marke.css`; die
drei Token-Blöcke in `design.css` (hell, `@media` dunkel, `[data-theme="dark"]`) verweisen nur darauf.

## 2. Höhe ohne Schatten

| Stufe | Token | Wofür |
|---|---|---|
| Bühne | `--buehne-oben/-unten` | Hintergrund der Seite (`body::before`, fest) |
| 1 | `--flaeche-1` | Karten, Kacheln, Listen, Belegfenster, Reiterleiste ohne Glas |
| 2 | `--flaeche-2` | Innen: Rechenweg-Karte, Quellen-Karten, Legende, Knöpfe, Hover |
| 3 | `--flaeche-3` | Pillen (Abstand „+6 ms“), Spuren von Ring und Balken, gedrückt |

Jede Fläche trägt eine Haarlinie `--haarlinie` und oben 1 px Innenkante `--innenkante` (`box-shadow: inset 0 1px 0`). Radien:
Karten und Kacheln 24 px, innen 16 px, Knöpfe und Pillen 999 px.

## 3. Leuchten und Verläufe

- **Heldenring** (`ring()` in `shell/viz/viz.js`): Bogen 14 px, Verlauf von der Farbe der Stufe zu ihrem hellen Ende
  (`--erholung-*-hell`), dahinter eine Kopie mit `feGaussianBlur` in `--glow-*` (statisch, kein Neuzeichnen). Ein Strich quer
  über die Spur zeigt das Mittel der letzten 30 Tage, ein heller Punkt das Ende des Bogens. Belastung: Akzentfarbe und ein
  dünner Außenring mit der Zeit je Pulszone.
- Verlaufsstopps tragen Klassen (`rg-stopp-a/b`, `vz-stopp-*`); `stop-color` kommt aus Tokens. Füllungen mit Verlauf stehen als
  `style="fill:url(#…)"` am Element, die Kennungen sind je Dokument eindeutig.
- **Kacheln**: kleines Bild je Messwert – Belastung flacher Bogen (`minibogen`), Schlaf Phasenstreifen (`streifen`), HRV und
  Ruhepuls 7-Tage-Linie mit üblichem Bereich (`sparkline`). Der Abstand zum Mittel steht als Pille („+6 ms“, Zahl-Knopf) mit Wort.
- **Schlaf**: `hypnogramm()` (Bänder je Phase über die Uhrzeit, Wach als bernsteinfarbene Marken, Stufenlinien),
  `bedarfBalken()` (Bedarf, Geschlafen, gestreifter Rest = Schuld), Regelmäßigkeit als Punktreihe der letzten 7 Nächte.
- **Trends**: Fläche unter der Linie (Akzent → durchsichtig), üblicher Bereich als leiser Streifen, Hinweiskarte am gezeigten
  Punkt (ohne Auswahl am letzten). Mehr als 14 Punkte: Punkte erst beim Zeigen.

## 4. Bewegung

| Bewegung | Dauer | Eigenschaft | Datei |
|---|---|---|---|
| Ansicht taucht auf (Abschnitte gestaffelt, 8 px) | 200 ms, Versatz 40 ms, zusammen ≤ 400 ms | opacity, transform | `design_bewegung.css`, `shell/bewegung.js` |
| Heldenring kommt dazu, Leuchten blendet nach | 350 / 450 ms | opacity, transform | `design_bewegung.css` |
| Heldenzahl zählt hoch | 450 ms (requestAnimationFrame) | Text | `shell/bewegung.js` |
| Druck auf Kachel, Knopf, Zeile | 150 ms, scale .98 | transform | `design.css` |
| Aktiver Reiter: Pille hinter dem Symbol | 220 ms | opacity, transform | `design.css` |
| Belegfenster von unten, nach unten ziehen schließt | 450 ms / 220 ms | opacity, transform | `design.css`, `shell/apps/beleg.js` |
| Laden: Skelett atmet | 450 ms im Wechsel | opacity | `design_bewegung.css` |
| Hinweiskarte, Punkte im dichten Diagramm | 220 ms | opacity | `design_viz.css` |
| **Ausnahme** Live-Herz pocht | 60 ÷ Puls Sekunden (`--lv-schlag`) | transform | `design_bewegung.css`, `shell/apps/live.js` |
| **Ausnahme** Atemkreis, Leuchten, Läufer auf dem Phasenring | Atemtakt, je Bild gesetzt | transform | `design_atem.css`, `shell/apps/atem.js` |

Kurve `--kurve` = `cubic-bezier(.33,1,.68,1)`. Kein `setInterval`. Bei `prefers-reduced-motion: reduce` steht alles still
(globale Regel in `design.css`, zusätzlich je Datei); der Atemkreis zeigt dann einen Fortschrittsbalken, das Herz steht.
Reiter merken sich die Scrollhöhe (`scrollMerken/scrollZurueck`).

## 5. Symbole und leere Zustände

Ein Satz Strich-Symbole (24 px, Strich 1,75, runde Enden) als Sprite in `shell/icons.js` (Herz, Mond, Aktivität, Wind, Mehr,
Sync, Bluetooth, Kalender, Pfeile u. a.), eingebunden mit `<use>`; kein Emoji. Leere Ansichten zeigen eine kleine Strichzeichnung
(`leerBild()`) in Tokenfarben, einen Satz und – wenn es einen gibt – den Knopf zum letzten Tag mit Werten.

## 6. Regeln (geprüft)

1. Je Ansicht genau eine Kernaussage; höchstens 4 Kacheln auf „Heute“; ein Diagramm je Frage.
2. Jede Zahl ist `button.zahl[data-q]` mit Beleg – auch die Pille „+6 ms“ und die Legenden-Summen.
3. Farben nur über Tokens; Hex-Farben nur in `marke.css`.
4. Kontrast: Schrift ≥ 4,5 : 1 auf Bühne und allen drei Flächen, Grafik ≥ 3 : 1 auf Fläche 1 und 2 – hell und dunkel.
5. Bewegung ≤ 450 ms (Ausnahmen oben), nur `transform`/`opacity`, aus bei `prefers-reduced-motion`.
6. Kein waagerechter Überlauf bei 360 px; Tippziele ≥ 44 px; geprüft mit Playwright bei 390 × 844, 360 × 780, 1280 × 900.
7. Keine medizinischen Aussagen; Farbe nie allein (Wort, Zeichen oder Vorzeichen dazu).
