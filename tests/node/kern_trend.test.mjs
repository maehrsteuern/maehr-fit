// Tests kern/trend.js.
//
// Fall 1 (Handrechnung Trend, Fenster 7): Erholung 1.–10.10. = 50, 52, …, 68.
//   Am 8.10. (Wert 64) zählen 1.–7.10.: 50 … 62 → Mittel 56; Abstände −6 … +6 → Quadratsumme 112; Streuung √(112 ÷ 6)
//   = √18,6667 = 4,3205. Band: 56 ± 4,3205 → unten 51,7, oben 60,3. Am 1.10. gibt es keine Vortage → Band leer.
// Fall 2 (Woche): 1.10.2026 ist Donnerstag (KW 40: 28.9.–4.10.). KW 40: 1.–4.10. → 50, 52, 54, 56 → Mittel 53, 4 Tage;
//   KW 41 (5.–11.10.): 58 … 68 → Mittel 63, 6 Tage, Stufen: 58–66 gelb (5), 68 grün (1).
// Fall 3 (Monat): Oktober 10 Tage, Mittel (50 + 68) ÷ 2 = 59.
// Grenzfälle: unbekanntes Feld wirft, leere Liste, fehlende Werte, unsortierte Eingabe.
import test from "node:test";
import assert from "node:assert/strict";
import { trend, wochenZusammenfassung, monatsZusammenfassung } from "../../kern/trend.js";
import { stufe } from "../../kern/erholung.js";
import { plusTage } from "../../kern/zeit.js";

const TAGE = Array.from({ length: 10 }, (_, i) => {
  const w = 50 + 2 * i;
  return { tag: plusTage("2026-10-01", i), erholung: { wert: w, stufe: stufe(w), quellen: [{ art: "hand", id: "e" + i }] },
    belastung: { wert: i / 2, trainings: i % 3 === 0 ? [{}] : [] }, schlaf: { wert: 80, dauerMs: 7 * 3600000 } };
});

test("Handrechnung Trend mit Band", () => {
  const r = trend(TAGE, "erholung", { fenster: 7 });
  assert.equal(r.length, 10);
  const t8 = r.find((x) => x.tag === "2026-10-08");
  assert.equal(t8.wert, 64);
  assert.deepEqual([t8.basis.mittel, t8.basis.streuung, t8.basis.n, t8.basis.unten, t8.basis.oben], [56, 4.3205, 7, 51.7, 60.3]);
  assert.deepEqual(t8.quellen, [{ art: "hand", id: "e7" }]);
  assert.deepEqual([r[0].basis.n, r[0].basis.unten], [0, null]);
  assert.equal(trend(TAGE.slice().reverse(), "erholung", { fenster: 7 })[7].basis.mittel, 56, "unsortiert");
});

test("Wochenzusammenfassung nach ISO-Woche", () => {
  const w = wochenZusammenfassung(TAGE);
  assert.deepEqual(w.map((x) => [x.woche, x.von, x.bis, x.tage]), [["2026-W40", "2026-09-28", "2026-10-04", 4], ["2026-W41", "2026-10-05", "2026-10-11", 6]]);
  assert.deepEqual(w[0].erholung, { mittel: 53, min: 50, max: 56, n: 4 });
  assert.equal(w[1].erholung.mittel, 63);
  assert.deepEqual(w[1].stufen, { gruen: 1, gelb: 5, rot: 0 });
  assert.equal(w[0].trainings, 2); // i = 0 und 3
  assert.equal(w[0].formel.schluessel, "zusammenfassung");
});

test("Monatszusammenfassung", () => {
  const m = monatsZusammenfassung(TAGE);
  assert.equal(m.length, 1);
  assert.deepEqual([m[0].monat, m[0].tage, m[0].erholung.mittel, m[0].von, m[0].bis], ["2026-10", 10, 59, "2026-10-01", "2026-10-10"]);
  assert.equal(m[0].schlafdauerMs.mittel, 7 * 3600000);
});

test("Grenzfälle", () => {
  assert.throws(() => trend(TAGE, "laune"), /unbekanntes Feld/);
  assert.deepEqual(trend([], "erholung"), []);
  assert.deepEqual(wochenZusammenfassung([]), []);
  const luecke = trend([{ tag: "2026-10-01", erholung: { wert: null } }, { tag: "2026-10-02" }], "erholung");
  assert.deepEqual(luecke.map((x) => x.wert), [null, null]);
  assert.deepEqual(monatsZusammenfassung([{ tag: "2026-10-01" }])[0].erholung, { mittel: null, min: null, max: null, n: 0 });
});
