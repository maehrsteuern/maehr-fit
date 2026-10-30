// tests/node/kern_echt.test.mjs – Übersetzer shell/kern_echt.js: ausgelassene Erholungsteile und Ruhepuls aus den Einstellungen.
//
// Fall 1 (ausgelassene Teile): Erholungsteile hrv (ausgelassen, kein Messwert), ruhepuls (+5), schlaf (+3), spo2 (ausgelassen,
//   kein Messwert) → Bestandteile nur ruhepuls und schlaf; eine Zeile „Nicht berücksichtigt: HRV (kein Messwert),
//   Sauerstoffsättigung (kein Messwert)“. Englisch: „Not included: HRV (no measurement), …“.
// Fall 2 (Ruhepuls-Rückfall, nur Live-Puls): Training 26.10.2026 10:00, ein Pulswert je Minute, 30 × 160, Schlusswert 100.
//   Keine Nachtmessung, keine Basislinie → ohne Einstellung kein Ruhepuls → keine Belastung (0, ungemessen).
//   Mit Alter 38 → Höchstpuls Tanaka (2080 − 7·38) ÷ 10 = 1814 ÷ 10 = 181,4 → 181; Ruhepuls 60 aus den Einstellungen →
//   Reserve 121; 160: 100·(160 − 60) = 10 000 ≥ 80·121 = 9 680, < 90·121 = 10 890 → Zone 4.
//   Zonen-Minuten T = 30 · 4 = 120; Belastung = 21 · ln(1 + 120/25) ÷ ln 29 = 21 · ln 5,8 ÷ ln 29 = 21 · 1,757858 ÷ 3,367296
//   = 10,9626 → Zehntel 110.
// Grenzfälle: Ruhepuls als Text "60" (aus dem Formular) zählt wie 60; leere Einstellung, 0 und Unsinn zählen nicht;
//   ohne Alter und Höchstpuls keine Belastung.
import test from "node:test";
import assert from "node:assert/strict";
import { berechne, ausgelassenZeile, kernText, tagIso } from "../../shell/kern_echt.js";

test("ausgelassene Erholungsteile: eine Zeile statt Tabellenzeilen", () => {
  const teile = [
    { name: "hrv", ausgelassen: true, grund: "kein_messwert", beitrag: 0 },
    { name: "ruhepuls", beitrag: 5 }, { name: "schlaf", beitrag: 3 },
    { name: "spo2", ausgelassen: true, grund: "kein_messwert", beitrag: 0 },
  ];
  assert.equal(ausgelassenZeile(teile), "Nicht berücksichtigt: HRV (kein Messwert), Sauerstoffsättigung (kein Messwert)");
  assert.equal(ausgelassenZeile(teile, "en"), "Not included: HRV (no measurement), Blood oxygen (no measurement)");
  assert.equal(ausgelassenZeile(teile.filter((x) => !x.ausgelassen)), null);
  assert.equal(ausgelassenZeile([]), null);
  assert.equal(kernText("einst.ruhepuls", "de"), "Ruhepuls (Schläge/min, optional)");
});

test("Tagesbild: ausgelassene Teile nicht in erholung.teile, sondern in erholung.ausgelassen und erholung.hinweis", () => {
  const T = Date.UTC(2026, 9, 26, 6, 0);
  const q = (id) => ({ art: "hand", id });
  // eine Nacht ohne HRV: Ruhepuls und Schlaf da, HRV fehlt
  const daten = {
    schlaf: [{ von: T - 8 * 3600000, bis: T, phasen: [{ von: T - 8 * 3600000, bis: T, art: "leicht" }], quelle: q("s") }],
    ruhepuls: [{ t: T - 3600000, bpm: 55, quelle: q("rp") }],
  };
  const bild = berechne(daten, { alter: 38 }).liste.find((b) => b.schlafRoh);
  assert.ok(bild, "Tag mit Schlaf");
  const namen = bild.erholung.teile.map((x) => x.name);
  assert.ok(!namen.includes("hrv"), namen.join(","));
  assert.ok(bild.erholung.ausgelassen.some((x) => x.name === "hrv" && x.grund === "kein_messwert"));
  assert.match(bild.erholung.hinweis, /^Nicht berücksichtigt: HRV \(kein Messwert\)/);
});

const M = 60000, VON = Date.UTC(2026, 9, 26, 10, 0);
const PULS = [...Array(30).fill(160), 100].map((bpm, i) => ({ t: VON + i * M, bpm, quelle: { art: "ble", id: `band:${VON + i * M}` } }));
const LIVE = { training: [{ von: VON, bis: VON + 30 * M, art: "live", herzschlaege: PULS, quelle: { art: "ble", id: `live:band:${VON}` } }] };
const tagMit = (einst) => berechne(LIVE, einst).tage.get(tagIso(VON));

test("Ruhepuls aus den Einstellungen als Rückfall (nur Live-Puls): 11,0 statt keiner Belastung", () => {
  const ohne = tagMit({ alter: 38 });
  assert.equal(ohne.belastung.wert, 0);
  assert.equal(ohne.belastung.gemessen, false);
  const mit = tagMit({ alter: 38, ruhepuls: 60 });
  assert.equal(mit.belastung.wert, 110);
  assert.equal(mit.belastung.gemessen, true);
  assert.equal(mit.belastung.geschaetzt, false);
  assert.equal(mit.belastung.zonen[3].ms, 30 * M);
  const kt = berechne(LIVE, { alter: 38, ruhepuls: 60 }).kernTage.find((x) => x.belastung);
  assert.equal(kt.belastung.ruhepuls, 60);
  assert.equal(kt.belastung.maxPuls, 181, "Alter 38 → Tanaka 181");
});

test("Grenzfälle Einstellungen: Text aus dem Formular, leer, 0, ohne Alter", () => {
  assert.equal(tagMit({ alter: "38", ruhepuls: "60" }).belastung.wert, 110);
  for (const rp of ["", 0, "abc", null]) assert.equal(tagMit({ alter: 38, ruhepuls: rp }).belastung.wert, 0, String(rp));
  assert.equal(tagMit({ ruhepuls: 60 }).belastung.wert, 0, "ohne Alter und Höchstpuls");
  assert.equal(tagMit({ maxPuls: "181", ruhepuls: 60 }).belastung.wert, 110, "Höchstpuls direkt");
});
