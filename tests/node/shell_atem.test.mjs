// tests/node/shell_atem.test.mjs – Taktung der Atemübung (shell/apps/atem.js), von Hand nachgerechnet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { phaseBei, gesamtDauer, rundenDauer, skalaFuer, SKALA_KLEIN, SKALA_GROSS } from "../../shell/apps/atem.js";

// Box-Atmung: 4 Phasen × 4.000 ms = 16.000 ms je Runde, 6 Runden = 96.000 ms
const BOX = { name: "box", phasen: [{ art: "ein", ms: 4000 }, { art: "halten", ms: 4000 }, { art: "aus", ms: 4000 }, { art: "halten2", ms: 4000 }], runden: 6 };

test("Dauer: 16.000 ms je Runde, 96.000 ms gesamt", () => {
  assert.equal(rundenDauer(BOX), 16000);
  assert.equal(gesamtDauer(BOX), 96000);
});

test("phaseBei: Grenzen der Phasen und Runden", () => {
  assert.deepEqual([phaseBei(BOX, 0).runde, phaseBei(BOX, 0).art, phaseBei(BOX, 0).restMs], [1, "ein", 4000]);
  assert.equal(phaseBei(BOX, 3999).art, "ein");            // 1 ms vor dem Wechsel
  assert.equal(phaseBei(BOX, 4000).art, "halten");         // 4.000 ms: zweite Phase
  assert.equal(phaseBei(BOX, 15999).art, "halten2");       // letzte ms der Runde 1
  assert.equal(phaseBei(BOX, 15999).restMs, 1);
  const r2 = phaseBei(BOX, 16000);                          // 16.000 ms: Runde 2 beginnt mit Einatmen
  assert.deepEqual([r2.runde, r2.art, r2.imPhaseMs], [2, "ein", 0]);
  const mitte = phaseBei(BOX, 16000 * 3 + 8000 + 1500);     // Runde 4, 8.000 ms → „aus“, 1.500 ms hinein, Rest 2.500
  assert.deepEqual([mitte.runde, mitte.art, mitte.imPhaseMs, mitte.restMs], [4, "aus", 1500, 2500]);
  assert.equal(phaseBei(BOX, 96000).fertig, true);
  assert.equal(phaseBei(BOX, -50).art, "ein", "negative Zeit zählt als Anfang");
});

test("phaseBei: ungleiche Phasen (4-7-8)", () => {
  const U = { phasen: [{ art: "ein", ms: 4000 }, { art: "halten", ms: 7000 }, { art: "aus", ms: 8000 }], runden: 4 };
  assert.equal(gesamtDauer(U), 76000);                      // (4 + 7 + 8) s × 4
  assert.equal(phaseBei(U, 10999).art, "halten");           // 4.000 + 7.000 − 1
  assert.equal(phaseBei(U, 11000).art, "aus");
});

test("skalaFuer: klein → groß beim Einatmen, sanft (Sinus)", () => {
  assert.equal(skalaFuer("ein", 0), SKALA_KLEIN);
  assert.equal(skalaFuer("ein", 1), SKALA_GROSS);
  assert.ok(Math.abs(skalaFuer("ein", 0.5) - (SKALA_KLEIN + SKALA_GROSS) / 2) < 1e-9);  // Mitte: 0,775
  assert.equal(skalaFuer("aus", 0), SKALA_GROSS);
  assert.equal(skalaFuer("aus", 1), SKALA_KLEIN);
  assert.equal(skalaFuer("halten", 0.3), SKALA_GROSS);
  assert.equal(skalaFuer("halten2", 0.3), SKALA_KLEIN);
  assert.equal(skalaFuer("ein", 2), SKALA_GROSS, "Anteil über 1 begrenzt");
});

test("skalenPlan: zweimal Einatmen (Seufzer) teilt den Weg nach Dauer, kein Sprung", async () => {
  const { skalenPlan, skalaBei } = await import("../../shell/apps/atem.js");
  const S = { phasen: [{ art: "ein", ms: 2000 }, { art: "ein", ms: 1000, label: "nachatmen" }, { art: "aus", ms: 6000 }], runden: 1 };
  const plan = skalenPlan(S);
  // Weg 0,55 → 1: erste 2 s zwei Drittel (0,55 → 0,85), letzte 1 s ein Drittel (0,85 → 1), dann zurück auf 0,55
  assert.ok(Math.abs(plan[0].von - 0.55) < 1e-9 && Math.abs(plan[0].bis - 0.85) < 1e-9);
  assert.ok(Math.abs(plan[1].von - 0.85) < 1e-9 && Math.abs(plan[1].bis - 1) < 1e-9);
  assert.ok(Math.abs(plan[2].von - 1) < 1e-9 && Math.abs(plan[2].bis - 0.55) < 1e-9);
  assert.ok(Math.abs(skalaBei(S, phaseBei(S, 2000)) - 0.85) < 1e-9, "Übergang ohne Sprung");
  // Box: halten bleibt groß, halten2 bleibt klein
  const bp = skalenPlan(BOX);
  assert.deepEqual(bp.map((x) => [x.von, x.bis]), [[0.55, 1], [1, 1], [1, 0.55], [0.55, 0.55]]);
});
