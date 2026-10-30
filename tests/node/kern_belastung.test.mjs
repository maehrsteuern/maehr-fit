// Tests kern/belastung.js.
//
// Fall 1 (Handrechnung Maximalpuls, Tanaka 2001): 32 J. → (2080 − 7·32) ÷ 10 = 1856 ÷ 10 = 185,6 → 186;
//   30 J. → 1870 ÷ 10 = 187; 35 J. → 1835 ÷ 10 = 183,5 → 184 (kaufmännisch).
// Fall 2 (Handrechnung Zonen, Karvonen): Max 190, Ruhe 60 → Reserve 130. Grenzen 60 + p·130:
//   50 % → 125, 60 % → 138, 70 % → 151, 80 % → 164, 90 % → 177. 125 → Zone 1 (100·65 = 6500 ≥ 50·130 = 6500), 124 → 0,
//   177 → Zone 5 (11 700 ≥ 11 700), 176 → Zone 4.
// Fall 3 (Handrechnung Training): Messpunkte t (s) / Puls: 0/130 (Z1), 60/140 (Z2), 120/155 (Z3), 300/170 (Z4),
//   330/180 (Z5), 390/100 (unter Z1), 400/100 (letzter Wert, zählt 0).
//   Dauern bis zum nächsten Wert, höchstens 60 s: 60, 60, min(180, 60) = 60, 30, 60, 10.
//   Zonen: Z1 60 s, Z2 60 s, Z3 60 s, Z4 30 s, Z5 60 s; unter Zone 1: 10 s.
//   Zonen-Minuten T = 1·1 + 1·2 + 1·3 + 0,5·4 + 1·5 = 13.
//   Belastung = 21 · ln(1 + 13/25) ÷ ln(1 + 700/25) = 21 · ln 1,52 ÷ ln 29 = 21 · 0,418710 ÷ 3,367296 = 21 · 0,124346
//   = 2,6113 → Zehntel 26 → 2,6.
// Fall 4 (Handrechnung Tag): Training aus Fall 3 + Alltag 1000/130, 1030/130, 1060/130 (2 × 30 s Z1 = 1 Zonen-Minute);
//   Alltagswert bei 100 s liegt im Training und zählt nicht. T = 14 → 21 · ln 1,56 ÷ ln 29 = 21 · 0,444686 ÷ 3,367296
//   = 2,7733 → 28 → 2,8 (nicht 2,6 + Alltag einzeln: die Kurve wird einmal auf die Tagessumme angewandt).
// Grenzfälle: keine Werte, ein Wert, unsortiert, doppelte Zeitpunkte, fehlender Max-/Ruhepuls, Skalenende (T ≥ 700 → 21).
import test from "node:test";
import assert from "node:assert/strict";
import { maxPulsTanaka, zonenGrenzen, zoneVon, zeitInZonen, belastung, belastungTag, kurveZehntel } from "../../kern/belastung.js";

const S = 1000;
const q = { art: "hand", id: "training-1" };
const REIHE = [[0, 130], [60, 140], [120, 155], [300, 170], [330, 180], [390, 100], [400, 100]].map(([t, bpm]) => ({ t: t * S, bpm, quelle: q }));

test("Maximalpuls nach Tanaka mit kaufmännischer Rundung", () => {
  assert.equal(maxPulsTanaka(32).bpm, 186);
  assert.equal(maxPulsTanaka(30).bpm, 187);
  assert.equal(maxPulsTanaka(35).bpm, 184);
  assert.equal(maxPulsTanaka(32).formel.schluessel, "puls.max.tanaka");
  assert.equal(maxPulsTanaka(0), null);
  assert.equal(maxPulsTanaka(32.5), null);
});

test("Zonengrenzen nach Karvonen, Grenzwerte exakt ganzzahlig", () => {
  assert.deepEqual(zonenGrenzen(190, 60).map((z) => z.abBpm), [125, 138, 151, 164, 177]);
  assert.equal(zoneVon(124, 190, 60), 0);
  assert.equal(zoneVon(125, 190, 60), 1);
  assert.equal(zoneVon(150, 190, 60), 2);
  assert.equal(zoneVon(176, 190, 60), 4);
  assert.equal(zoneVon(177, 190, 60), 5);
  assert.equal(zoneVon(200, 190, 60), 5);
});

test("Handrechnung Training: Zonenzeiten und Belastung 2,6", () => {
  const b = belastung({ herzschlaege: REIHE, maxPuls: 190, ruhepuls: 60 });
  assert.deepEqual(b.zonen.map((z) => z.ms), [60 * S, 60 * S, 60 * S, 30 * S, 60 * S]);
  assert.equal(b.ohneZoneMs, 10 * S);
  assert.equal(b.zonenMinuten, 13);
  assert.equal(b.wertZehntel, 26);
  assert.equal(b.wert, 2.6);
  assert.equal(b.formel.schluessel, "belastung");
  assert.deepEqual(b.zonen[0].quelle, [q]);
  assert.deepEqual(b.quellen, [q]);
});

test("Handrechnung Tag: Training plus Alltag ergibt 2,8", () => {
  const qa = { art: "hand", id: "alltag" };
  const alltag = [[100, 180], [1000, 130], [1030, 130], [1060, 130]].map(([t, bpm]) => ({ t: t * S, bpm, quelle: qa }));
  const tag = belastungTag([{ von: 0, bis: 400 * S, art: "laufen", herzschlaege: REIHE, quelle: q }], alltag, { maxPuls: 190, ruhepuls: 60 });
  assert.equal(tag.zonenMinuten, 14);
  assert.equal(tag.alltagZonenMinuten, 1);
  assert.equal(tag.wertZehntel, 28);
  assert.equal(tag.trainings.length, 1);
  assert.equal(tag.trainings[0].wert, 2.6);
  assert.equal(tag.trainings[0].art, "laufen");
  assert.equal(tag.zonen[0].ms, 120 * S);
  assert.deepEqual(tag.zonen[0].quelle.map((x) => x.id), ["training-1", "alltag"]);
  assert.equal(tag.zonen[4].ms, 60 * S, "Alltagswert im Training (180 bei 100 s) zählt nicht");
});

test("Kurve: doppelte Anstrengung bringt weniger als doppelte Punkte, Skalenende 21", () => {
  const m = 60 * S;
  assert.equal(kurveZehntel(0), 0);
  assert.ok(kurveZehntel(200 * m) < 2 * kurveZehntel(100 * m));
  assert.ok(kurveZehntel(200 * m) > kurveZehntel(100 * m));
  assert.equal(kurveZehntel(700 * m), 210);
  assert.equal(kurveZehntel(5000 * m), 210);
});

test("Grenzfälle", () => {
  assert.equal(belastung({ herzschlaege: [], maxPuls: 190, ruhepuls: 60 }).wert, 0);
  assert.equal(belastung({ herzschlaege: [REIHE[0]], maxPuls: 190, ruhepuls: 60 }).wertZehntel, 0, "ein Wert = keine Dauer");
  assert.equal(belastung({ herzschlaege: REIHE.slice().reverse(), maxPuls: 190, ruhepuls: 60 }).wertZehntel, 26, "unsortiert");
  const doppelt = [{ t: 0, bpm: 180 }, { t: 0, bpm: 180 }, { t: 30 * S, bpm: 180 }];
  assert.equal(zeitInZonen(doppelt, 190, 60).zonen[4].ms, 30 * S);
  assert.equal(belastung({ herzschlaege: REIHE, maxPuls: null, ruhepuls: 60 }), null);
  assert.equal(belastung({ herzschlaege: REIHE, maxPuls: 60, ruhepuls: 60 }), null);
  assert.equal(belastungTag([], [], { maxPuls: 190 }), null);
  assert.equal(belastungTag([], [], { maxPuls: 190, ruhepuls: 60 }).wert, 0);
  assert.equal(belastung({ herzschlaege: [{ t: 0, bpm: NaN }, null, { t: "x", bpm: 1 }], maxPuls: 190, ruhepuls: 60 }).wert, 0);
});
