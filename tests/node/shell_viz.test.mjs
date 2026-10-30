// tests/node/shell_viz.test.mjs – Diagrammbibliothek shell/viz/viz.js.
// Kernaussage: Jede Funktion liefert { svg, text, html, ziele }; jedes Ziel ist fokussierbar und trägt data-q und data-quelle;
// der Satz nennt alle Werte; ohne Werte erscheint ein freundlicher Satz statt eines leeren Bildes; Farben nur als Klassen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ring, kennzahlKachel, balken, zonen, zeitreihe, segmentbalken, fortschritt, hypnogramm, sparkline, minibogen, streifen, bedarfBalken, HYPNO_REIHE } from "../../shell/viz/viz.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";
setzeSprache("de");

const Q = { art: "demo", id: "demo-hrv-1", datei: "kern/demo.js" };
const reihen = [{ name: "Mo", wert: 40, text: "40 ms", q: "hrv:2026-10-26", quelle: Q }, { name: "Di", wert: 55, text: "55 ms", q: "hrv:2026-10-27" }, { name: "Mi", wert: 50, text: "50 ms", q: "hrv:2026-10-28" }];
const form = (e) => { for (const k of ["svg", "text", "html", "ziele"]) assert.ok(k in e, k); assert.doesNotMatch(e.html, /#[0-9a-fA-F]{6}\b/); };

test("ring: Anteil wird auf 0–10.000 begrenzt, Zahl ist Knopf mit data-q, Stufe als Klasse", () => {
  const r = ring({ wert: "78", nach: "%", anteilBp: 12000, beschriftung: "Erholung", q: "erholung:2026-10-30", stufe: "gruen" });
  form(r);
  assert.equal(r.anteilBp, 10000);
  assert.match(r.html, /<button type="button" class="zahl rg-zahl" data-q="erholung:2026-10-30"/);
  assert.match(r.html, /class="rg rg-gruen"/);
  assert.match(r.text, /Erholung: 78 %/);
  assert.equal(ring({ wert: "0", anteilBp: -5 }).anteilBp, 0);
  assert.doesNotMatch(ring({ wert: "0", anteilBp: 0 }).svg, /rg-bogen/, "kein Bogen bei 0");
  // Bogen: Größe 240, Strich 14 → Radius (240 − 14) ÷ 2 = 113; Umfang 2π·113 = 709,999 → „710.00“;
  // Versatz bei 2.500 bp = 75 % des Umfangs = 532,499 → „532.50“. Leuchten (rg-schein) und Bogen tragen dieselben Werte.
  const r25 = ring({ wert: "25", anteilBp: 2500, groesse: 240 }).svg;
  assert.equal((r25.match(/stroke-dasharray="710\.00" stroke-dashoffset="532\.50"/g) || []).length, 2);
  assert.match(r25, /<feGaussianBlur/, "Leuchten als statischer Weichzeichner");
  assert.match(r25, /style="stroke:url\(#rgv\d+\)"/, "Verlauf über eine Kennung, keine Farbwerte");
  // Mittel-Strich bei 5.000 bp = halber Kreis → unten: x = 120, y von 120 + 113 − 7 − 5 = 221 bis 120 + 113 + 7 + 5 = 245
  assert.match(ring({ wert: "1", anteilBp: 100, mittelBp: 5000, groesse: 240 }).svg, /<line class="rg-mittel" x1="120" y1="221" x2="120" y2="245"/);
  // Zonenring: zwei Abschnitte 3 : 1 auf Radius (240 − 4) ÷ 2 = 118, Hauptbogen rückt um 12 px nach innen (Radius 101)
  const rz = ring({ wert: "1", anteilBp: 100, groesse: 240, segmente: [{ anteil: 3, klasse: "vz-k0" }, { anteil: 1, klasse: "vz-k1" }] }).svg;
  assert.equal((rz.match(/class="rg-zone /g) || []).length, 2); assert.match(rz, /class="rg-spur" cx="120" cy="120" r="101"/);
  assert.match(ring({ wert: "71", anteilBp: 7100, hochzaehlen: 71 }).html, /data-hochzaehlen="71" data-stellen="0"/);
});

test("kennzahlKachel: Wert als Knopf, Pfeil mit Wort", () => {
  const k = kennzahlKachel({ titel: "HRV", wert: "55", einheit: "ms", q: "hrv:2026-10-30", vergleich: { richtung: "hoch", text: "über deinem Mittel" } });
  form(k);
  assert.match(k.html, /class="zahl" data-q="hrv:2026-10-30"/);
  assert.match(k.html, /↑/); assert.match(k.html, /über deinem Mittel/);
  assert.match(k.text, /HRV\. 55 ms\. über deinem Mittel\./);
});

test("balken: ein fokussierbares Ziel je Reihe mit data-q und data-quelle, Satz mit allen Werten", () => {
  const b = balken({ titel: "Titel", kernaussage: "Satz.", reihen });
  form(b);
  assert.equal((b.svg.match(/class="vz-ziel" tabindex="0"/g) || []).length, 3);
  assert.match(b.svg, /data-q="hrv:2026-10-26" data-quelle="\{&quot;art&quot;:&quot;demo&quot;/);
  assert.equal(b.text, "Titel. Satz. Mo: 40 ms; Di: 55 ms; Mi: 50 ms.");
  assert.deepEqual(b.ziele.map((z) => z.q), ["hrv:2026-10-26", "hrv:2026-10-27", "hrv:2026-10-28"]);
  assert.match(b.html, /<figcaption class="vz-kopf"><span class="vz-titel">Titel<\/span><span class="vz-kern">Satz\.<\/span>/);
  assert.match(b.html, /<details class="vz-tabelle">/);
  assert.doesNotMatch(balken({ titel: "x", reihen, tabelle: false }).html, /vz-tabelle/);
});

test("zonen: Zone 1–5 als Klassen vz-k0…k4", () => {
  const z = zonen({ titel: "Zonen", kernaussage: "Satz.", zonen: [1, 2, 3, 4, 5].map((n) => ({ zone: n, name: `Zone ${n}`, ms: n * 60000, text: `${n} min`, q: `zone:x:${n}` })) });
  form(z);
  for (const k of ["vz-k0", "vz-k1", "vz-k2", "vz-k3", "vz-k4"]) assert.match(z.svg, new RegExp(`vz-marke ${k}`));
  assert.equal(z.art, "zonen");
});

test("zeitreihe: Band, Linie, letzter Wert beschriftet, Ziele mit data-q", () => {
  const z = zeitreihe({ titel: "HRV", kernaussage: "Satz.", reihen, band: { unten: 45, oben: 52, text: "üblicher Bereich" } });
  form(z);
  assert.match(z.svg, /class="vz-band"/); assert.match(z.svg, /class="vz-linie"/);
  assert.match(z.svg, /class="vz-wert"[^>]*>50 ms</);
  assert.equal(z.ziele.length, 3);
  assert.match(z.text, /üblicher Bereich\.$/);
});

test("segmentbalken: Breite nach Anteil, Legende mit Zahl-Knöpfen", () => {
  const s = segmentbalken({ titel: "Phasen", kernaussage: "Satz.", segmente: [{ name: "Tief", wert: 1, text: "1 h", q: "p:tief", klasse: "vz-k4" }, { name: "Leicht", wert: 3, text: "3 h", q: "p:leicht", klasse: "vz-k2" }] });
  form(s);
  // Breite 360: Tief 1/4 → 90 − 2 Abstand = 88; Leicht 3/4 → 270 − 2 = 268
  assert.match(s.svg, /width="88"/); assert.match(s.svg, /width="268"/);
  assert.equal((s.html.match(/<button type="button" class="zahl" data-q="p:/g) || []).length, 2);
});

test("fortschritt: 0–100 begrenzt", () => {
  assert.equal(fortschritt({ wert: 140 }).wert, 100);
  assert.equal(fortschritt({ wert: -3 }).wert, 0);
  assert.match(fortschritt({ titel: "x", wert: 50 }).svg, /width="100"/);
});

test("leer: freundlicher Satz statt leerem Bild", () => {
  for (const f of [balken, zeitreihe, segmentbalken]) {
    const e = f({ titel: "Leer", reihen: [] });
    assert.equal(e.svg, ""); assert.match(e.html, /vz-leer/); assert.match(e.text, /Noch keine Werte/);
  }
});

// ------------------------------------------------------------------ Kleid „Nacht“: Hypnogramm, Bildzeichen, Bedarf mit Schuld
const H0 = Date.UTC(2026, 9, 29, 22, 0); // 22:00 UTC
const MIN = 60000;
const NACHT = [
  { von: H0, bis: H0 + 10 * MIN, art: "wach" }, { von: H0 + 10 * MIN, bis: H0 + 70 * MIN, art: "leicht" },
  { von: H0 + 70 * MIN, bis: H0 + 130 * MIN, art: "tief" }, { von: H0 + 130 * MIN, bis: H0 + 160 * MIN, art: "rem" },
  { von: H0 + 160 * MIN, bis: H0 + 240 * MIN, art: "leicht" },
];
const SUMMEN = [{ art: "tief", name: "Tief", text: "1 h", q: "p:tief" }, { art: "rem", name: "Traum (REM)", kurz: "REM", text: "30 min", q: "p:rem" },
  { art: "leicht", name: "Leicht", text: "2 h 20 min", q: "p:leicht" }, { art: "wach", name: "Wach", text: "10 min", q: "p:wach" }];

test("hypnogramm: ein Ziel je Phase mit data-q, Bänder in Phasenreihenfolge, Stufenlinien, Zeitachse, Legende mit Knöpfen", () => {
  const h = hypnogramm({ titel: "Deine Nacht", kernaussage: "Satz.", phasen: NACHT, summen: SUMMEN, vonMs: H0, bisMs: H0 + 240 * MIN, zeit: (ms) => String(new Date(ms).getUTCHours()).padStart(2, "0") + ":00" });
  form(h);
  assert.equal(h.art, "hypnogramm");
  assert.equal((h.svg.match(/class="vz-ziel" tabindex="0"/g) || []).length, 4, "vier Phasen = vier Ziele");
  for (const a of HYPNO_REIHE) assert.match(h.svg, new RegExp(`data-q="p:${a}"`));
  // fünf Abschnitte, aber „leicht“ zweimal: 5 Streifen; Wechsel 4 (alle Nachbarn verschieden) → 4 Stufenlinien
  assert.equal((h.svg.match(/class="vz-hyp vz-hyp-/g) || []).length, 5);
  assert.equal((h.svg.match(/class="vz-hyp-stufe"/g) || []).length, 4);
  // Zeitachse: 22:00 bis 02:00 → fünf volle Stunden (22, 23, 0, 1, 2) als Marken
  assert.match(h.svg, />22:00</); assert.match(h.svg, />02:00</);
  // Breite 360, Namensspalte = längster Kurzname + 10 (höchstens 84): „Leicht“ 6 × 15 × 0,55 = 49,5 + 10 = 59,5
  // Tief 70–130 min von 240 → x = 59,5 + 70/240 × (356 − 59,5) = 59,5 + 86,48 = 145,98 → „146“; Breite 60/240 × 296,5 − 0,5 = 73,6
  assert.match(h.svg, /class="vz-hyp vz-hyp-tief" x="146" y="[\d.]+" width="73\.6"/);
  assert.match(h.svg, />REM</, "Kurzname in der Spalte");
  assert.equal((h.html.match(/<button type="button" class="zahl" data-q="p:/g) || []).length, 4);
  assert.match(h.text, /^Deine Nacht\. Satz\. Tief: 1 h; Traum \(REM\): 30 min/);
  assert.match(hypnogramm({ titel: "Leer", phasen: [], summen: SUMMEN }).html, /vz-leer/);
});

test("sparkline: Lücken bleiben (x-Platz), Band, alle Punkte mit Stufenklasse, Ziele nur auf Wunsch", () => {
  const sp = sparkline({ breite: 100, hoehe: 20, plaetze: 7, alle: true, punkte: [{ x: 0, wert: 10, klasse: "vz-gruen" }, { x: 6, wert: 20, klasse: "vz-rot" }], band: { unten: 12, oben: 16 } });
  // Rand = Radius 3 + 2 = 5; x = 5 + 6/6 × 90 = 95 → letzter Punkt bei 95, erster bei 5
  assert.match(sp.svg, /cx="5" cy="15"/); assert.match(sp.svg, /cx="95" cy="5"/);
  assert.match(sp.svg, /vz-gruen/); assert.match(sp.svg, /vz-rot vz-letzter/); assert.match(sp.svg, /class="vz-band"/);
  assert.doesNotMatch(sp.svg, /vz-ziel/); assert.equal(sp.ziele.length, 0);
  const z = sparkline({ ziele: true, punkte: [{ wert: 1, q: "a:1", name: "Mo", text: "1" }, { wert: 2, q: "a:2", name: "Di", text: "2" }] });
  assert.equal((z.svg.match(/data-q="a:/g) || []).length, 2); assert.match(z.svg, /role="group"/);
  assert.equal(sparkline({ punkte: [] }).html, "");
});

test("minibogen, streifen: Anteil begrenzt, Klassen statt Farben", () => {
  const m = minibogen({ anteilBp: 15000, klasse: "vz-akzent", aria: "Belastung" });
  assert.equal(m.anteilBp, 10000); assert.match(m.svg, /class="vz-mb-wert vz-akzent"/); assert.doesNotMatch(m.svg, /#[0-9a-f]{6}/i);
  assert.doesNotMatch(minibogen({ anteilBp: 0 }).svg, /vz-mb-wert/);
  // Breite 120, Lücke 2: 3 : 1 → 90 − 2 = 88 und 30 − 2 = 28
  const st = streifen({ segmente: [{ wert: 3, klasse: "vz-k4", name: "Tief", text: "3 h" }, { wert: 1, klasse: "vz-k1", name: "REM", text: "1 h" }, { wert: 0, klasse: "vz-k2" }] });
  assert.match(st.svg, /width="88"/); assert.match(st.svg, /width="28"/); assert.equal((st.svg.match(/<rect/g) || []).length, 2);
});

test("bedarfBalken: Bedarf, Geschlafen und gestreifte Schuld als Ziele mit data-q", () => {
  const b = bedarfBalken({ titel: "Bedarf", kernaussage: "Satz.", bedarf: { name: "Bedarf", wert: 480, text: "8:00 h", q: "s:bedarf" }, ist: { name: "Geschlafen", wert: 420, text: "7:00 h", q: "s:ist" }, schuld: { name: "Fehlte", wert: 60, text: "1 h", q: "s:schuld" } });
  form(b);
  assert.equal(b.ziele.length, 3); assert.match(b.svg, /class="vz-schuld"/); assert.match(b.svg, /<pattern /);
  // Breite 360, Skala 480 → Geschlafen 420/480 × 360 = 315; Schuld ab 315 + 3 = 318, Breite 360 − 315 − 3 = 42
  assert.match(b.svg, /class="vz-ist" x="0" y="70" width="315"/); assert.match(b.svg, /class="vz-schuld" x="318" y="70" width="42"/);
  assert.doesNotMatch(bedarfBalken({ titel: "x", bedarf: { name: "B", wert: 1, text: "1" }, ist: { name: "I", wert: 2, text: "2" } }).svg, /vz-schuld/);
});

test("zeitreihe: Fläche und Hinweiskarten nur auf Wunsch; Kachel mit Pille „+6 ms“ als Zahl-Knopf", () => {
  const z = zeitreihe({ titel: "HRV", kernaussage: "Satz.", reihen, flaeche: true, karten: true });
  assert.match(z.svg, /class="vz-flaeche"/); assert.equal((z.svg.match(/class="vz-tip"/g) || []).length, 3); assert.match(z.svg, /vz-mit-karten/);
  assert.doesNotMatch(zeitreihe({ titel: "HRV", reihen }).svg, /vz-flaeche|vz-tip/);
  const k = kennzahlKachel({ titel: "HRV", wert: "55", einheit: "ms", q: "hrv:x", bild: "<svg></svg>", vergleich: { richtung: "hoch", text: "über deinem Mittel" }, delta: { text: "+6 ms", q: "hrv:x" } });
  assert.match(k.html, /<button type="button" class="zahl mf-delta" data-q="hrv:x" data-richtung="hoch"/); assert.match(k.html, /\+6 ms/);
  assert.match(k.html, /class="mf-kachel" data-vz="kachel" data-tipp data-q="hrv:x"/); assert.match(k.html, /mf-kachel-bild/);
});
