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

// Fall 5 (Handrechnung geschätzt aus Zonenanteilen, WHOOP-CSV ohne Pulswerte; formeln.json „belastung.zonen_aus_prozent“):
//   Training 60 min = 3 600 000 ms, Anteile Zone 1–5 = 10 / 20 / 40 / 20 / 10 %.
//   Zeit je Zone = Dauer × Anteil ÷ 100: 6 / 12 / 24 / 12 / 6 min (360 000 / 720 000 / 1 440 000 / 720 000 / 360 000 ms).
//   Zonen-Minuten T = 6·1 + 12·2 + 24·3 + 12·4 + 6·5 = 6 + 24 + 72 + 48 + 30 = 180.
//   Belastung = 21 · ln(1 + 180/25) ÷ ln(1 + 700/25) = 21 · ln 8,2 ÷ ln 29 = 21 · 2,104134 ÷ 3,367296 = 21 · 0,624874
//   = 13,1224 → Zehntel 131 → 13,1.
// Gegenprobe: dieselben Minuten je Zone als Pulsreihe (Max 190, Ruhe 60; ein Wert je Minute: 6× 130 (Z1), 12× 140 (Z2),
//   24× 155 (Z3), 12× 170 (Z4), 6× 180 (Z5), Schlusswert 100 zählt 0) → ebenfalls 131 Zehntel, aber gemessen.
const M = 60 * S;
const qw = { art: "csv", id: "whoop:training:0", datei: "whoop_workouts.csv", zeile: 2 };
const PROZENT = { von: 0, bis: 60 * M, art: "laufen", herzschlaege: [], zonenProzent: [10, 20, 40, 20, 10], quelle: qw };
const PROBEN = [[6, 130], [12, 140], [24, 155], [12, 170], [6, 180]].flatMap(([n, bpm]) => Array(n).fill(bpm))
  .concat([100]).map((bpm, i) => ({ t: i * M, bpm, quelle: q }));

test("Handrechnung geschätzt aus Zonenanteilen: 60 min, 10/20/40/20/10 % → 13,1", () => {
  const b = belastung({ ...PROZENT, maxPuls: 190, ruhepuls: 60 });
  assert.deepEqual(b.zonen.map((z) => z.ms), [6 * M, 12 * M, 24 * M, 12 * M, 6 * M]);
  assert.equal(b.zonenMinuten, 180);
  assert.equal(b.wertZehntel, 131);
  assert.equal(b.wert, 13.1);
  assert.equal(b.geschaetzt, true);
  assert.equal(b.grund, "zonen_aus_prozent");
  assert.equal(b.formel.schluessel, "belastung.zonen_aus_prozent");
  assert.equal(b.formel.pruefen, true);
  assert.match(b.formel.text, /Dauer × Anteil k ÷ 100/);
  assert.match(b.formel.fundstelle, /^eigene Festlegung MF/);
  assert.deepEqual(b.quellen, [qw]);
  assert.equal(b.ohneZoneMs, 0);
});

test("Gegenprobe: gleiche Zeit je Zone als Pulsreihe ergibt denselben Wert, gemessen", () => {
  const g = belastung({ herzschlaege: PROBEN, maxPuls: 190, ruhepuls: 60 });
  const p = belastung({ ...PROZENT, maxPuls: 190, ruhepuls: 60 });
  assert.deepEqual(g.zonen.map((z) => z.ms), p.zonen.map((z) => z.ms));
  assert.equal(g.wertZehntel, p.wertZehntel);
  assert.equal(g.geschaetzt, false);
  assert.equal(g.formel.schluessel, "belastung");
  // Tag: geschätztes Training wie gemessenes, Kennzeichen am Training und am Tag
  const tp = belastungTag([PROZENT], [], { maxPuls: 190, ruhepuls: 60 });
  const tg = belastungTag([{ ...PROZENT, herzschlaege: PROBEN, zonenProzent: null }], [], { maxPuls: 190, ruhepuls: 60 });
  assert.equal(tp.wertZehntel, 131);
  assert.equal(tg.wertZehntel, 131);
  assert.equal(tp.geschaetzt, true);
  assert.equal(tp.trainings[0].geschaetzt, true);
  assert.equal(tp.trainings[0].grund, "zonen_aus_prozent");
  assert.equal(tg.geschaetzt, false);
});

test("Grenzfälle Zonenanteile", () => {
  // Pulswerte gehen vor: mit Proben und Anteilen wird gemessen
  const beides = belastung({ ...PROZENT, herzschlaege: PROBEN, zonenProzent: [100, 0, 0, 0, 0], maxPuls: 190, ruhepuls: 60 });
  assert.equal(beides.geschaetzt, false);
  assert.equal(beides.wertZehntel, 131);
  // Anteile unter 100 %: Rest zählt unter Zone 1; leere Felder (null) zählen 0
  const teil = belastung({ ...PROZENT, zonenProzent: [50, null, 0, 0, 0], maxPuls: 190, ruhepuls: 60 });
  assert.deepEqual(teil.zonen.map((z) => z.ms), [30 * M, 0, 0, 0, 0]);
  assert.equal(teil.ohneZoneMs, 30 * M);
  assert.deepEqual(teil.zonen[1].quelle, []);
  // keine Anteile, keine Dauer, nur Nullen → nicht geschätzt, 0
  assert.equal(belastung({ ...PROZENT, zonenProzent: null, maxPuls: 190, ruhepuls: 60 }).wert, 0);
  assert.equal(belastung({ ...PROZENT, bis: 0, maxPuls: 190, ruhepuls: 60 }).geschaetzt, false);
  assert.equal(belastung({ ...PROZENT, zonenProzent: [0, 0, 0, 0, 0], maxPuls: 190, ruhepuls: 60 }).geschaetzt, false);
  // ohne Max-/Ruhepuls bleibt es bei null (wie gemessen)
  assert.equal(belastung({ ...PROZENT, maxPuls: null, ruhepuls: 60 }), null);
  // Kommaanteile: ganze Millisekunden (46 min × 41,3 % = 1 139 880 ms)
  assert.equal(belastung({ ...PROZENT, bis: 46 * M, zonenProzent: [0, 0, 41.3, 0, 0], maxPuls: 190, ruhepuls: 60 }).zonen[2].ms, 1139880);
});
