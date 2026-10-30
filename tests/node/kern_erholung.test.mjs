// Tests kern/erholung.js.
//
// Fall 1 (Handrechnung): Basis HRV (ln): Mittel 3,9120, Streuung 0,2; Ruhepuls: Mittel 58, Streuung 2; Atem: Mittel 144, Streuung 3.
//   HRV 60,0 ms (600 Zehntel): ln 60 = 4,0943446 → z = (4,0943446 − 3,912) ÷ 0,2 = 0,911723.
//   Ruhepuls 55: z = (55 − 58) ÷ 2 = −1,5 → umgekehrt +1,5.  Schlafleistung 94: z = (94 − 85) ÷ 15 = 0,6.
//   Beiträge (Gewichte 500/250/250 ‰, 20 Punkte je z): HRV 20 · 0,911723 · 0,5 = 9,117 → 9,1; Ruhepuls 20 · 1,5 · 0,25 = 7,5;
//   Schlaf 20 · 0,6 · 0,25 = 3,0.
//   Abzüge: Atem 146: z = 0,667 < 1 → 0; Hauttemperatur +0,70 °C (70): (70 − 50) · 10 ÷ 100 = 2,0 → −2,0;
//   SpO2 94,0 % (940): (950 − 940) · 5 ÷ 10 = 5,0 → −5,0.
//   Erholung = 50 + 9,1 + 7,5 + 3,0 + 0 − 2,0 − 5,0 = 62,6 → 63 → gelb. Ohne Abzüge 69,6 → 70 → grün.
// Fall 2 (HRV fehlt): Ruhepuls und Schlaf je 250 ÷ 500 = 50 %: 20 · 1,5 · 0,5 = 15; 20 · 0,6 · 0,5 = 6 → 50 + 15 + 6 = 71.
// Grenzfälle: weder HRV noch Ruhepuls → null; Basislinie zu klein → Teil ausgelassen; z gekappt bei ±3;
//   Streuung unter Mindestwert; Grenzen 0/100; Stufengrenzen 33/34/66/67; Rohdatensätze.
import test from "node:test";
import assert from "node:assert/strict";
import { erholung, stufe, messwert } from "../../kern/erholung.js";

const q = (id) => ({ art: "hand", id });
const BASIS = {
  hrv: { mittel: 3.912, streuung: 0.2, n: 30, genug: true, ln: true },
  ruhepuls: { mittel: 58, streuung: 2, n: 30, genug: true },
  atem: { mittel: 144, streuung: 3, n: 30, genug: true },
};
const teil = (e, name) => e.teile.find((t) => t.name === name);

test("Handrechnung: Erholung 63, gelb", () => {
  const e = erholung({
    hrv: { wert: 600, quellen: [q("hrv")] }, ruhepuls: { wert: 55, quellen: [q("rp")] }, schlaf: { wert: 94, quellen: [q("schlaf")] },
    atem: { wert: 146, quellen: [q("atem")] }, hauttemp: { wert: 70, quellen: [q("temp")] }, spo2: { wert: 940, quellen: [q("spo2")] }, basis: BASIS,
  });
  assert.equal(teil(e, "hrv").z, 0.9117);
  assert.equal(teil(e, "hrv").beitrag, 9.1);
  assert.equal(teil(e, "hrv").gewicht, 0.5);
  assert.equal(teil(e, "ruhepuls").z, -1.5);
  assert.equal(teil(e, "ruhepuls").beitrag, 7.5);
  assert.equal(teil(e, "schlaf").beitrag, 3);
  assert.equal(teil(e, "atem").beitrag, 0);
  assert.equal(teil(e, "hauttemp").beitrag, -2);
  assert.equal(teil(e, "spo2").beitrag, -5);
  assert.equal(e.roh, 62.6);
  assert.equal(e.wert, 63);
  assert.equal(e.stufe, "gelb");
  assert.equal(e.formel.schluessel, "erholung");
  assert.deepEqual(e.quellen.map((x) => x.id), ["hrv", "rp", "schlaf", "atem", "temp", "spo2"]);
  for (const t of e.teile) for (const k of ["name", "wert", "gewicht", "beitrag", "quelle", "formel"]) assert.ok(k in t, t.name + "." + k);
});

test("ohne Abzüge 70, grün", () => {
  const e = erholung({ hrv: 600, ruhepuls: 55, schlaf: 94, basis: BASIS });
  assert.equal(e.roh, 69.6);
  assert.deepEqual([e.wert, e.stufe], [70, "gruen"]);
  assert.equal(teil(e, "atem").ausgelassen, true);
});

test("HRV fehlt: übrige Gewichte auf 100 % hochgerechnet → 71", () => {
  const e = erholung({ ruhepuls: 55, schlaf: 94, basis: BASIS });
  assert.equal(teil(e, "hrv").grund, "kein_messwert");
  assert.equal(teil(e, "ruhepuls").gewicht, 0.5);
  assert.equal(teil(e, "ruhepuls").beitrag, 15);
  assert.equal(teil(e, "schlaf").beitrag, 6);
  assert.equal(e.wert, 71);
});

test("Basislinie zu klein: Teil ausgelassen, Grund genannt", () => {
  const e = erholung({ hrv: 600, ruhepuls: 55, schlaf: 94, basis: { ...BASIS, hrv: { ...BASIS.hrv, n: 2, genug: false } } });
  assert.equal(teil(e, "hrv").ausgelassen, true);
  assert.equal(teil(e, "hrv").grund, "basis_zu_klein");
  assert.equal(e.wert, 71);
});

test("weder HRV noch Ruhepuls: kein Wert", () => {
  const e = erholung({ schlaf: 94, basis: BASIS });
  assert.deepEqual([e.wert, e.stufe, e.grund], [null, null, "zu_wenig_daten"]);
  assert.equal(erholung().wert, null);
});

test("z wird bei ±3 gekappt, Streuung nicht unter dem Mindestwert, Ergebnis 0..100", () => {
  const e = erholung({ ruhepuls: 40, basis: BASIS }); // z = −9 → −3 → +3 · 20 · 1,0 = 60 → 110 → 100
  assert.equal(teil(e, "ruhepuls").z, -3);
  assert.equal(e.wert, 100);
  const tief = erholung({ ruhepuls: 80, spo2: 900, basis: BASIS });
  assert.equal(tief.wert, 0);
  const eng = erholung({ ruhepuls: 57, basis: { ruhepuls: { mittel: 58, streuung: 0.25, n: 10, genug: true } } });
  assert.equal(teil(eng, "ruhepuls").z, -1, "Streuung 0,25 → Mindestwert 1 Schlag/min");
});

test("Rohdatensätze werden in ganze Einheiten umgerechnet", () => {
  assert.deepEqual(messwert({ rmssdMs: 45.3, quelle: q("h") }, "hrv"), { wert: 453, quelle: [q("h")] });
  assert.deepEqual(messwert({ proMin: 14.6, quelle: q("a") }, "atem").wert, 146);
  assert.deepEqual(messwert({ deltaC: -0.35, quelle: q("t") }, "hauttemp").wert, -35);
  assert.deepEqual(messwert({ prozent: 96.8 }, "spo2").wert, 968);
  assert.equal(messwert(null, "hrv"), null);
  assert.equal(messwert(NaN, "hrv"), null);
  const e = erholung({ hrv: { rmssdMs: 60, quelle: q("roh") }, ruhepuls: { bpm: 55 }, schlaf: 94, basis: BASIS });
  assert.equal(e.wert, 70);
});

test("Stufengrenzen", () => {
  assert.deepEqual([67, 66, 34, 33, 0, 100].map(stufe), ["gruen", "gelb", "gelb", "rot", "rot", "gruen"]);
  assert.equal(stufe(null), null);
});
