// Tests kern/live.js (Live-Puls) und demoPuls aus kern/demo.js.
//
// Fall 1 (Zone, Karvonen wie kern/belastung.js): Max 190, Ruhe 60 → Reserve 130; 125 → Zone 1 (100·65 = 6500 ≥ 50·130), 124 → 0,
//   177 → Zone 5, ohne Ruhepuls → null.
// Fall 2 (laufende Belastung = Fall 3 aus kern_belastung.test.mjs): Punkte t/Puls 0/130, 60/140, 120/155, 300/170, 330/180,
//   390/100, 400/100 → Zonen Z1–Z5 = 60, 60, 60, 30, 60 s; T = 13 Zonen-Minuten → 21 · ln 1,52 ÷ ln 29 = 2,6113 → 26 Zehntel.
//   In drei Stücken übergeben (je mit dem Zustand des vorigen Aufrufs) ergibt sich dasselbe.
// Fall 3 (Artefaktfilter, Grenzen 300/2000 ms, Sprung 20 %): [1000, 250, 1010, 1300, 1020, 2100, 1015]
//   1000 gültig · 250 < 300 verworfen · 1010 gültig (|10| ≤ 200), aber kein Paar (Vorgänger verworfen) · 1300: 1000·290 = 290 000
//   > 200·1010 = 202 000 → verworfen · 1020 gültig (10 ≤ 20 % von 1010), kein Paar · 2100 > 2000 verworfen · 1015 gültig, kein Paar.
//   → gueltig [1000, 1010, 1020, 1015], paare [], verworfen 3.
// Fall 4 (Kurz-HRV): Muster [1000, 1020, 990, 1010] dreimal = 12 Abstände, 11 Differenzen:
//   +20, −30, +20, −10, +20, −30, +20, −10, +20, −30, +20 → Quadrate 6 × 400 + 3 × 900 + 2 × 100 = 2400 + 2700 + 200 = 5300 ms²
//   RMSSD = √(5300 ÷ 11) = √481,818 = 21,9504 ms → Zehntel √(100 · 5300 ÷ 11) = 219,504 → 220.
// Fall 5 (Kohärenz): Atemzug T = 4000 ms, Muster [1100, 1000, 900, 1000] zweimal (8000 ms = 2 Atemzüge). Mittel 1000, gelegt auf
//   t_i = i · 1000 → Winkel 0°, 90°, 180°, 270°. Abweichungen d = 100, 0, −100, 0, …
//   a = 2/8 · Σ d·cos = 2/8 · (100 + 100 + 100 + 100) = 100; b = 2/8 · Σ d·sin = 0 → Leistung (100² + 0²) ÷ 2 = 5000.
//   Streuung Σ d² ÷ n = 4 · 10 000 ÷ 8 = 5000 → Kohärenz 100 · 5000 ÷ 5000 = 100.
//   Gegenprobe doppelte Frequenz [1050, 950] viermal: d = 50, −50, …; Σ d·cos = 50 − 50 + 50 − 50 … = 0 (cos 0°, 180° …
//   an geraden i, 0 an ungeraden): a = 2/8 · (50·1 + 50·(−1) + 50·1 + 50·(−1)) = 0; b = 2/8 · (−50·1 − 50·(−1) …) = 0 → 0.
// Grenzfälle: zu wenig Differenzen (null), kein Atemtakt, weniger als 2 Atemzüge, keine Schwankung (0).
import test from "node:test";
import assert from "node:assert/strict";
import { zoneVon, laufendeBelastung, rrFilter, hrvKurz, atemKohaerenz, trainingMindestMs, pulsFormel } from "../../kern/live.js";
import { belastung } from "../../kern/belastung.js";
import { demoPuls } from "../../kern/demo.js";

const E = { maxPuls: 190, ruhepuls: 60 };
const S = 1000, q = { art: "ble", id: "x" };
const REIHE = [[0, 130], [60, 140], [120, 155], [300, 170], [330, 180], [390, 100], [400, 100]].map(([t, bpm]) => ({ t: t * S, bpm, quelle: q }));

test("Zone wie in der Tagesbelastung (Karvonen)", () => {
  assert.equal(zoneVon(125, E), 1);
  assert.equal(zoneVon(124, E), 0);
  assert.equal(zoneVon(177, E), 5);
  assert.equal(zoneVon(176, E), 4);
  assert.equal(zoneVon(150, { maxPuls: 190 }), null);
  assert.equal(zoneVon(150, { maxPuls: 60, ruhepuls: 60 }), null);
  assert.equal(zoneVon(NaN, E), null);
});

test("laufende Belastung: Handrechnung 2,6 und gleich in Stücken", () => {
  const ganz = laufendeBelastung(REIHE, E);
  assert.equal(ganz.wertZehntel, 26);
  assert.deepEqual(ganz.zonen.map((z) => z.ms / S), [60, 60, 60, 30, 60]);
  assert.equal(ganz.ohneZoneMs, 10 * S);
  assert.equal(ganz.wertZehntel, belastung({ herzschlaege: REIHE, ...E }).wertZehntel);
  let r = laufendeBelastung(REIHE.slice(0, 2), E);
  r = laufendeBelastung(REIHE.slice(2, 5), E, r.zustand);
  r = laufendeBelastung(REIHE.slice(5), E, r.zustand);
  assert.equal(r.wertZehntel, 26);
  assert.deepEqual(r.zonen, ganz.zonen);
  assert.equal(r.formel.schluessel, "belastung");
  // Zustand wird nicht verändert (rein)
  const z0 = laufendeBelastung(REIHE.slice(0, 2), E).zustand, kopie = JSON.stringify(z0);
  laufendeBelastung(REIHE.slice(2), E, z0);
  assert.equal(JSON.stringify(z0), kopie);
  assert.equal(laufendeBelastung(REIHE, { maxPuls: 190 }), null);
  assert.equal(laufendeBelastung([], E).wertZehntel, 0);
});

test("Artefaktfilter: Grenzen 300/2000 ms und 20-%-Sprung", () => {
  const f = rrFilter([1000, 250, 1010, 1300, 1020, 2100, 1015]);
  assert.deepEqual(f.gueltig, [1000, 1010, 1020, 1015]);
  assert.deepEqual(f.paare, []);
  assert.equal(f.verworfen, 3);
  // Grenzwerte genau: 300 und 2000 gültig; Sprung genau 20 % gültig (1000·200 = 200·1000)
  assert.deepEqual(rrFilter([1000, 1200]).paare, [[1000, 1200]]);
  assert.equal(rrFilter([1000, 1201]).verworfen, 1);
  assert.equal(rrFilter([300]).verworfen, 0);
  assert.equal(rrFilter([2000]).verworfen, 0);
  assert.equal(rrFilter([299, 2001, NaN]).verworfen, 3);
});

test("Kurz-HRV: Handrechnung 22,0 ms (220 Zehntel)", () => {
  const rr = [1000, 1020, 990, 1010, 1000, 1020, 990, 1010, 1000, 1020, 990, 1010];
  const h = hrvKurz(rr, 60);
  assert.equal(h.n, 11);
  assert.equal(h.rmssdZehntel, 220);
  assert.equal(h.formel.schluessel, "live.hrv_kurz");
  // Fenster: nur die letzten 6 Abstände → 5 Differenzen < 10 → null
  assert.equal(hrvKurz(rr, 6).rmssdZehntel, null);
  assert.equal(hrvKurz([], 60).grund, "zu_wenig_daten");
  // Standardfenster aus formeln.json (60)
  assert.equal(hrvKurz(rr).rmssdZehntel, 220);
});

test("Kohärenz: Handrechnung 100 im Atemtakt, 0 bei doppelter Frequenz", () => {
  const im = [1100, 1000, 900, 1000, 1100, 1000, 900, 1000];
  const k = atemKohaerenz(im, 4000);
  assert.equal(k.wert, 100);
  assert.equal(k.zyklen, 2);
  assert.equal(k.n, 8);
  assert.equal(k.formel.pruefen, true);
  assert.equal(atemKohaerenz([1050, 950, 1050, 950, 1050, 950, 1050, 950], 4000).wert, 0);
  assert.equal(atemKohaerenz(im.slice(0, 4), 4000).grund, "zu_wenig_daten");
  assert.equal(atemKohaerenz(im, 0).grund, "kein_atemtakt");
  assert.equal(atemKohaerenz(Array(10).fill(1000), 4000).wert, 0);
  // höchstens 6 Atemzüge: 10 Atemzüge Muster → es zählen die letzten 6 (24 Abstände)
  assert.equal(atemKohaerenz(Array(10).fill([1100, 1000, 900, 1000]).flat(), 4000).n, 24);
});

test("Formeln: Mindestdauer und Herkunft des Pulses", () => {
  assert.equal(trainingMindestMs(), 60000);
  assert.match(pulsFormel().text, /0x2A37/);
});

test("demoPuls: gleich mit gleichem Startwert, etwa 1 Meldung je Sekunde, Atemprofil kohärent", () => {
  const a = demoPuls(7), b = demoPuls(7);
  const ra = Array.from({ length: 30 }, () => a.naechster()), rb = Array.from({ length: 30 }, () => b.naechster());
  assert.deepEqual(ra, rb);
  assert.equal(ra[1].t - ra[0].t, 1000);
  for (const m of ra) { assert.ok(Number.isInteger(m.bpm) && m.bpm > 40 && m.bpm < 200, String(m.bpm)); assert.ok(m.rrMs.every(Number.isInteger)); }
  const at = demoPuls(7, { profil: "atem", atemZyklusMs: 11000 });
  const rr = Array.from({ length: 90 }, () => at.naechster()).flatMap((m) => m.rrMs);
  const k = atemKohaerenz(rr, 11000);
  assert.ok(k.wert >= 50, `Kohärenz Demo ${k.wert}`);
  assert.ok(hrvKurz(rr).rmssdZehntel > 0);
});
