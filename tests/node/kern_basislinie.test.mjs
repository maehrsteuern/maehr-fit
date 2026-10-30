// Tests kern/basislinie.js.
//
// Fall 1 (Handrechnung, Ruhepuls): 1.–4.10. = 50, 52, 54, 56; Fenster 7 Tage bis (ohne) 5.10.
//   n = 4; Mittel = 212 ÷ 4 = 53; Abstände −3, −1, 1, 3 → Quadratsumme 20; Streuung = √(20 ÷ 3) = √6,6667 = 2,58199 → 2,582.
//   Wert am 5.10. (der Tag selbst) und am 27.9. (8 Tage vorher, außerhalb 28.9.–4.10.) zählen nicht.
// Fall 2 (Handrechnung, HRV ln): 40 ms, 50 ms, 62,5 ms (als Zehntel 400, 500, 625; Teiler 10).
//   ln 40 = 3,688879; ln 50 = 3,912023; ln 62,5 = 4,135167 – gleiche Abstände d = ln 1,25 = 0,223144.
//   Mittel = ln 50 = 3,9120; Streuung = √((d² + 0 + d²) ÷ 2) = d = 0,2231. n = 3 < 4 → genug = falsch (Mindest-n).
// Fall 3 (z-Wert): x = 57, Mittel 53, Streuung 2,582 → z = 4 ÷ 2,582 = 1,5492; mit Untergrenze 5 → 0,8.
// Grenzfälle: keine Werte, ein Wert (Streuung null), ungültige Werte, ln von 0.
import test from "node:test";
import assert from "node:assert/strict";
import { basislinie, zWert, mittelUndStreuung } from "../../kern/basislinie.js";

const q = (id) => ({ art: "hand", id });
const W = [
  { tag: "2026-09-27", wert: 90, quelle: q("alt") },
  { tag: "2026-10-01", wert: 50, quelle: q("a") }, { tag: "2026-10-02", wert: 52, quelle: q("b") },
  { tag: "2026-10-03", wert: 54, quelle: q("c") }, { tag: "2026-10-04", wert: 56, quelle: q("d") },
  { tag: "2026-10-05", wert: 99, quelle: q("heute") },
];

test("Handrechnung Ruhepuls: Mittel 53, Streuung 2,582, n 4", () => {
  const b = basislinie(W, { tage: 7, bis: "2026-10-05" });
  assert.equal(b.mittel, 53);
  assert.equal(b.streuung, 2.582);
  assert.equal(b.n, 4);
  assert.equal(b.genug, true);
  assert.equal(b.von, "2026-09-28");
  assert.deepEqual(b.quellen.map((x) => x.id), ["a", "b", "c", "d"]);
  assert.equal(b.formel.schluessel, "basis.mittel");
});

test("Handrechnung HRV logarithmiert: Mittel 3,912, Streuung 0,2231, n unter Minimum", () => {
  const hrv = [{ tag: "2026-10-01", wert: 400 }, { tag: "2026-10-02", wert: 500 }, { tag: "2026-10-03", wert: 625 }];
  const b = basislinie(hrv, { tage: 7, bis: "2026-10-04", ln: true, teiler: 10 });
  assert.equal(b.mittel, 3.912);
  assert.equal(b.streuung, 0.2231);
  assert.equal(b.n, 3);
  assert.equal(b.genug, false);
  assert.equal(b.formel.schluessel, "basis.hrv_ln");
  assert.equal(basislinie(hrv, { tage: 7, bis: "2026-10-04", ln: true, teiler: 10, minN: 3 }).genug, true);
});

test("Standard: 30-Tage-Fenster bis zum Tag nach dem letzten Wert", () => {
  const b = basislinie(W);
  assert.equal(b.bis, "2026-10-06");
  assert.equal(b.tage, 30);
  assert.equal(b.n, 6);
});

test("7- und 30-Tage-Fenster unterscheiden sich", () => {
  const lang = [];
  for (let i = 1; i <= 30; i++) lang.push({ tag: "2026-09-" + String(i).padStart(2, "0"), wert: i <= 23 ? 60 : 50 });
  assert.equal(basislinie(lang, { tage: 7, bis: "2026-10-01" }).mittel, 50);
  assert.equal(basislinie(lang, { tage: 30, bis: "2026-10-01" }).mittel, 57.6667); // (23·60 + 7·50) ÷ 30 = 1730 ÷ 30
});

test("z-Wert mit Streuungs-Untergrenze", () => {
  const b = basislinie(W, { tage: 7, bis: "2026-10-05" });
  assert.equal(Number(zWert(57, b).toFixed(4)), 1.5492);
  assert.equal(zWert(57, b, 5), 0.8);
  assert.equal(zWert(57, null), null);
  assert.equal(zWert(NaN, b), null);
});

test("Grenzfälle: leer, ein Wert, ungültige Werte, ln von 0", () => {
  const leer = basislinie([], { tage: 7, bis: "2026-10-05" });
  assert.deepEqual([leer.mittel, leer.streuung, leer.n, leer.genug], [null, null, 0, false]);
  assert.equal(basislinie([]).bis, null);
  const eins = basislinie([{ tag: "2026-10-01", wert: 50 }], { tage: 7, bis: "2026-10-02" });
  assert.deepEqual([eins.mittel, eins.streuung, eins.n, eins.genug], [50, null, 1, false]);
  const kaputt = basislinie([{ tag: "2026-10-01", wert: "x" }, null, { wert: 3 }, { tag: "2026-10-01", wert: 0 }], { tage: 7, bis: "2026-10-02", ln: true });
  assert.equal(kaputt.n, 0);
  const mitT = basislinie([{ t: Date.UTC(2026, 9, 1, 10), wert: 7 }], { tage: 7, bis: "2026-10-02" });
  assert.equal(mitT.n, 1);
  assert.deepEqual(mittelUndStreuung([]), { mittel: null, streuung: null, n: 0 });
});
