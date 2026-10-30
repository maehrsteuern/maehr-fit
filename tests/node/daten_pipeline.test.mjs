// tests/node/daten_pipeline.test.mjs – ganzer Weg mit den WHOOP-Fixtures: Import → Speicher (Map) → Shell lädt alle Arten
// (shell/shell.js DATEN_ARTEN) → Kern alleTage → Tagesbild → Beleg. Fixtures: daten/fixtures/whoop_*.csv (erfunden, Musterperson).
//
// Von Hand nachgerechnet (whoop_physiological_cycles.csv):
//   Hauttemperatur absolut 33,42 · 33,61 · 33,38 · 33,50 · 33,95 · 33,47 · 33,55 °C → sortiert, Median = 33,50 °C (Zeile 5 der Liste).
//   Morgen 28.10. (Zeile 6): 33,95 − 33,50 = +0,45 °C = 45 Hundertstel. Schwelle 50 Hundertstel (formeln.json) → kein Abzug, 0 Punkte.
//   SpO2 am 28.10.: 95,2 % = 952 Zehntel ≥ Schwelle 950 → kein Abzug, 0 Punkte. Beide Teile stehen trotzdem im Beleg, mit Messwert
//   und Quelle (Datei whoop_physiological_cycles.csv, Zeile 6).
//   Zählung: 6 HRV (Zeile 7 ohne HRV) + 7 Ruhepuls + 7 Atem + 6 SpO2 (Zeile 7 ohne) + 7 Hauttemp + 7 Schlaf + 5 Trainings
//   + 3 Tagebuchtage + 7 Fremdwerte = 55.
//   Fremdwerte: 7 Zeilen, aber 2 am 29.10. (Zeile 7 mit Aufwachzeit, Zeile 8 ohne → zeitGeschaetzt); die Shell nimmt Zeile 7
//   (Erholung 61), der Vergleich hat also 6 Tage.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { erzeugeDaten, zeitraumVon } from "../../daten/verbinden.js";
import { leseMessungen, ARTEN } from "../../daten/ablage.js";
import { DATEN_ARTEN } from "../../shell/shell.js";
import { berechne, vergleich } from "../../shell/kern.js";
import { belegeTag } from "../../shell/belege.js";
import { belegHtml } from "../../shell/apps/beleg.js";
import { neuesRegister, beleg } from "../../shell/ui.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "daten", "fixtures");
const DATEIEN = ["physiological_cycles", "sleeps", "workouts", "journal_entries"].map((n) => ({ name: `whoop_${n}.csv`, text: fs.readFileSync(path.join(FIXTURES, `whoop_${n}.csv`), "utf8") }));

function mapSpeicher() {
  const m = new Map();
  return { m, lies: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null), schreib: async (k, w) => { m.set(k, structuredClone(w)); }, liste: async (p) => [...m.keys()].filter((k) => k.startsWith(p)) };
}

/** Wie shell/shell.js ladeAlles: jede Art aus DATEN_ARTEN aus dem Speicher lesen. */
async function wieShell() {
  const speicher = mapSpeicher(), daten = erzeugeDaten({ speicher });
  const r = await daten.csvImport(DATEIEN);
  const eigen = {};
  for (const art of DATEN_ARTEN) eigen[art] = await leseMessungen(speicher, art);
  return { speicher, daten, r, eigen, erg: berechne(eigen, { alter: 38 }) };
}

test("Shell lädt jede Art der Ablage (auch spo2, hauttemp, fremdwerte)", () => {
  for (const a of ARTEN) assert.ok(DATEN_ARTEN.includes(a), a);
});

test("csvImport: Anzahl je Art (Summe 55) und Zeitraum 24.10. bis 29.10.2026", async () => {
  const { r } = await wieShell();
  assert.deepEqual(r.arten, { hrv: 6, ruhepuls: 7, atemfrequenz: 7, spo2: 6, hauttemp: 7, schlaf: 7, training: 5, tagebuch: 3, fremdwerte: 7 });
  assert.equal(Object.values(r.arten).reduce((s, n) => s + n, 0), 55);
  assert.equal(r.neu + r.ersetzt, 55);
  assert.deepEqual(r.zeitraum, { von: "2026-10-24", bis: "2026-10-29" });
  assert.equal(zeitraumVon({}), null, "leeres Paket → kein Zeitraum");
});

test("Erholung 28.10.: Hauttemperatur +0,45 °C und SpO2 95,2 % stehen mit Quelle in den Teilen und im Beleg", async () => {
  setzeSprache("de");
  const { erg } = await wieShell();
  const bild = erg.tage.get("2026-10-28");
  assert.ok(Number.isFinite(bild.erholung.wert), "Erholung gerechnet");
  const haut = bild.erholung.teile.find((x) => x.name === "hauttemp"), spo2 = bild.erholung.teile.find((x) => x.name === "spo2");
  assert.equal(haut.messwert, 0.45);
  assert.equal(haut.beitrag, 0);
  assert.equal(spo2.messwert, 95.2);
  assert.equal(spo2.beitrag, 0);
  for (const x of [haut, spo2]) {
    assert.equal(x.quelle[0].datei, "whoop_physiological_cycles.csv");
    assert.equal(x.quelle[0].zeile, 6);
  }
  const reg = neuesRegister();
  belegeTag(beleg(reg), bild);
  const e = reg.get("erholung:2026-10-28");
  const namen = e.teile.map((x) => x.name);
  assert.ok(namen.includes("Sauerstoffsättigung") && namen.includes("Hauttemperatur"), namen.join(", "));
  assert.equal(reg.get("erholung-teil:2026-10-28:hauttemp").quellen[0].zeile, 6);
  assert.equal(reg.get("erholung-teil:2026-10-28:spo2").quellen[0].datei, "whoop_physiological_cycles.csv");
  // WHOOP-Zeile im Beleg der Erholung: „WHOOP: 33 %“ mit Weg zum Vergleich
  assert.equal(e.fremd.q, "fremd:erholung:2026-10-28");
  const html = belegHtml(e, "erholung:2026-10-28");
  assert.match(html, /WHOOP: <button type="button" class="zahl" data-q="fremd:erholung:2026-10-28">33 %<\/button>/);
  assert.match(html, /href="#\/vergleich\?feld=erholung&amp;tag=2026-10-28"/);
  // Beleg der WHOOP-Zahl: Datei und Zeile, kein Rechenweg
  const f = reg.get("fremd:erholung:2026-10-28");
  assert.match(f.formel.text, /Fremdwert aus dem WHOOP-Export, Rechenweg nicht bekannt/);
  assert.deepEqual([f.quellen[0].datei, f.quellen[0].zeile], ["whoop_physiological_cycles.csv", 6]);
});

test("Vergleich: WHOOP-Werte in Zehnteln, Abstand = MF − WHOOP, doppelter Tag 29.10. nimmt Zeile 7", async () => {
  const { erg } = await wieShell();
  const v = vergleich(erg, "erholung");
  assert.deepEqual(v.zeilen.map((z) => [z.tag, z.whoop]), [["2026-10-24", 670], ["2026-10-25", 540], ["2026-10-26", 810], ["2026-10-27", 720], ["2026-10-28", 330], ["2026-10-29", 610]]);
  assert.equal(v.zeilen.at(-1).quelle.zeile, 7);
  const beide = v.zeilen.filter((z) => z.mf !== null);
  for (const z of beide) assert.equal(z.abstand, z.mf - z.whoop);
  assert.equal(v.n, beide.length);
  // Mittel der Beträge in Zehnteln, kaufmännisch gerundet
  const summe = beide.reduce((s, z) => s + Math.abs(z.abstand), 0);
  assert.equal(v.mittelAbstand, Math.round(summe / beide.length));
  assert.equal(v.nah, beide.filter((z) => Math.abs(z.abstand) <= 100).length);
  // Belastung: WHOOP 11,3 → 113 Zehntel; MF ohne Herzschlag-Proben ungemessen → kein Abstand
  const b = vergleich(erg, "belastung");
  assert.equal(b.zeilen[0].whoop, 113);
  assert.equal(b.n, 0);
  assert.equal(b.nurWhoop, 6);
  // Schlafleistung: WHOOP 88 % → 880 Zehntel
  assert.equal(vergleich(erg, "schlaf").zeilen[0].whoop, 880);
});

test("exportieren() enthält jede Art der Ablage, auch fremdwerte", async () => {
  const { daten } = await wieShell();
  const x = await daten.exportieren();
  const arten = new Set(Object.keys(x.eintraege).map((k) => k.split(":")[1]));
  for (const a of ["hrv", "ruhepuls", "atemfrequenz", "spo2", "hauttemp", "schlaf", "training", "tagebuch", "fremdwerte"]) assert.ok(arten.has(a), a);
  assert.equal(x.eintraege["messung:fremdwerte:2026-10-29"].length, 2);
});
