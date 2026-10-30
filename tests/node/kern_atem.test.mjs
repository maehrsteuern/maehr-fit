// Tests kern/atem.js.
//
// Fall 1 (Handrechnung Box): Phasen 4 000 + 4 000 + 4 000 + 4 000 = 16 000 ms je Runde. Standarddauer 300 000 ms (Balban 2023)
//   → Runden = abgerundet 300 000 ÷ 16 000 = 18,75 → 18; Gesamt 18 · 16 000 = 288 000 ms (4 min 48 s).
//   Atemzüge je Minute: 60 000 ÷ 16 000 = 3,75 → in Zehnteln 37,5 → 38.
// Fall 2 (4-7-8): 4 000 + 7 000 + 8 000 = 19 000 ms; Runden fest 4 (Weil 1999) → 76 000 ms.
// Fall 3 (Kohärenz): 5 500 + 5 500 = 11 000 ms → 300 000 ÷ 11 000 = 27,27 → 27 Runden; 60 000 ÷ 11 000 = 5,4545/min → 55 Zehntel.
// Fall 4 (Seufzer): 2 000 + 1 000 + 6 000 = 9 000 ms → 33 Runden (33,33). Entspannung: 4 000 + 6 000 = 10 000 → 30 Runden, 6,0/min.
// Fall 5 (Zeitplan Box, 2 Runden): 8 Abschnitte, 0–4 000 ein (R1) … 28 000–32 000 halten2 (R2), lückenlos.
// Grenzfälle: unbekannte Übung wirft; 0 Runden → leerer Plan; negative/gebrochene Runden werfen; Name statt Objekt.
import test from "node:test";
import assert from "node:assert/strict";
import { atemUebung, atemPlan, UEBUNGEN, PHASEN_ARTEN } from "../../kern/atem.js";

test("Handrechnung Box: 18 Runden, 288 000 ms", () => {
  const u = atemUebung("box");
  assert.deepEqual(u.phasen.map((p) => [p.art, p.ms]), [["ein", 4000], ["halten", 4000], ["aus", 4000], ["halten2", 4000]]);
  assert.deepEqual([u.zyklusMs, u.runden, u.gesamtMs, u.atemzuegeProMinZehntel], [16000, 18, 288000, 38]);
  assert.match(u.fundstelle, /Balban/);
  assert.ok(u.beschreibung.length > 10);
  assert.equal(u.rundenHerkunft, "standarddauer");
});

test("alle fünf Übungen: Phasen, Runden, Fundstelle", () => {
  const erwartet = { box: [16000, 18], "vier-sieben-acht": [19000, 4], kohaerenz: [11000, 27], seufzer: [9000, 33], entspannung: [10000, 30] };
  assert.deepEqual(UEBUNGEN, Object.keys(erwartet));
  for (const [name, [zyklus, runden]] of Object.entries(erwartet)) {
    const u = atemUebung(name);
    assert.deepEqual([u.zyklusMs, u.runden], [zyklus, runden], name);
    assert.ok(u.fundstelle.length > 10, name);
    for (const p of u.phasen) assert.ok(PHASEN_ARTEN.includes(p.art) && Number.isInteger(p.ms) && p.ms > 0, name);
  }
  assert.equal(atemUebung("vier-sieben-acht").rundenHerkunft, "fundstelle");
  assert.equal(atemUebung("kohaerenz").atemzuegeProMinZehntel, 55);
  assert.equal(atemUebung("entspannung").atemzuegeProMinZehntel, 60);
  const s = atemUebung("seufzer");
  assert.deepEqual(s.phasen.map((p) => p.art), ["ein", "ein", "aus"], "doppeltes Einatmen");
  assert.equal(s.phasen[1].label, "nachatmen");
  assert.equal(s.pruefen, true);
});

test("Zeitplan Box mit 2 Runden", () => {
  const plan = atemPlan(atemUebung("box"), 2);
  assert.equal(plan.length, 8);
  assert.deepEqual(plan[0], { von: 0, bis: 4000, art: "ein", label: "ein", runde: 1 });
  assert.deepEqual(plan[7], { von: 28000, bis: 32000, art: "halten2", label: "halten2", runde: 2 });
  for (let i = 1; i < plan.length; i++) assert.equal(plan[i].von, plan[i - 1].bis, "lückenlos");
});

test("Standardrunden und Name statt Objekt", () => {
  const plan = atemPlan("vier-sieben-acht");
  assert.equal(plan.length, 12);
  assert.equal(plan.at(-1).bis, 76000);
});

test("Grenzfälle", () => {
  assert.throws(() => atemUebung("wim-hof"), /unbekannte Übung/);
  assert.deepEqual(atemPlan("box", 0), []);
  assert.throws(() => atemPlan("box", -1));
  assert.throws(() => atemPlan("box", 1.5));
});
