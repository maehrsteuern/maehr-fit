// tests/node/shell_viz.test.mjs – Diagrammbibliothek shell/viz/viz.js.
// Kernaussage: Jede Funktion liefert { svg, text, html, ziele }; jedes Ziel ist fokussierbar und trägt data-q und data-quelle;
// der Satz nennt alle Werte; ohne Werte erscheint ein freundlicher Satz statt eines leeren Bildes; Farben nur als Klassen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ring, kennzahlKachel, balken, zonen, zeitreihe, segmentbalken, fortschritt } from "../../shell/viz/viz.js";
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
  // Bogen: Umfang 2π·117 = 735,13; Versatz bei 2.500 bp = 75 % des Umfangs = 551,35 (Größe 240, Strich 6 → Radius 117)
  assert.match(ring({ wert: "25", anteilBp: 2500, groesse: 240 }).svg, /stroke-dasharray="735\.13" stroke-dashoffset="551\.35"/);
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
