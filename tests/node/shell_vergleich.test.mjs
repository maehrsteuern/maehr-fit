// tests/node/shell_vergleich.test.mjs – Ansicht „Vergleich mit WHOOP“ (shell/apps/vergleich.js), Heute-Link, Mehr und „noch zu prüfen“.
// Kernaussage: Jede dieser Ansichten hat genau eine Kernaussage, jede Zahl ist ein Knopf mit data-q und Beleg, die WHOOP-Zahl
// führt zu Datei und Zeile im Export, und es gibt kein Urteil, welche Zahl stimmt.
//
// Von Hand (Fixture whoop_physiological_cycles.csv): WHOOP-Erholung 67, 54, 81, 72, 33, 61 an sechs Tagen (24.–29.10.).
// MF rechnet die Erholung erst, wenn genug Vortage für den Normalbereich da sind: Die Zahl der Tage mit beiden Werten (n) und
// die Zahl der Tage mit Abstand ≤ 10 Punkten (nah) stehen im Satz „An nah von n Tagen …“.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { erzeugeDaten } from "../../daten/verbinden.js";
import { leseMessungen } from "../../daten/ablage.js";
import { DATEN_ARTEN } from "../../shell/shell.js";
import { berechne, vergleich, demo, pruefListe } from "../../shell/kern.js";
import { neuesRegister } from "../../shell/ui.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";
import * as vgl from "../../shell/apps/vergleich.js";
import * as heute from "../../shell/apps/heute.js";
import * as mehr from "../../shell/apps/mehr.js";
import { importText } from "../../shell/apps/daten.js";

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATEIEN = ["physiological_cycles", "sleeps", "workouts", "journal_entries"].map((n) => ({ name: `whoop_${n}.csv`, text: fs.readFileSync(path.join(WURZEL, "daten", "fixtures", `whoop_${n}.csv`), "utf8") }));

async function ergAusFixtures() {
  const m = new Map();
  const speicher = { lies: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null), schreib: async (k, w) => { m.set(k, structuredClone(w)); }, liste: async (p) => [...m.keys()].filter((k) => k.startsWith(p)) };
  const r = await erzeugeDaten({ speicher }).csvImport(DATEIEN);
  const eigen = {};
  for (const art of DATEN_ARTEN) eigen[art] = await leseMessungen(speicher, art);
  return { erg: berechne(eigen, { alter: 38 }), r };
}
const { erg: ERG, r: IMPORT } = await ergAusFixtures();
const ctx = (teile, abfrage = {}, erg = ERG, tag = "2026-10-28") => ({ tag, heute: "2026-10-29", bild: erg.tage.get(tag) || null, erg, einst: {}, demo: false, route: { teile, abfrage }, register: neuesRegister(), aktionen: {} });
const zaehle = (html, re) => (html.match(re) || []).length;

function pruefeRuhe(html, c) {
  assert.equal(zaehle(html, /class="mf-kern"/g), 1, "genau eine Kernaussage");
  const knoepfe = html.match(/<button\b[^>]*class="zahl"[^>]*>/g) || [];
  for (const b of knoepfe) {
    const q = /data-q="([^"]+)"/.exec(b);
    assert.ok(q, `Zahl ohne data-q: ${b}`);
    assert.ok(c.register.has(q[1].replace(/&amp;/g, "&")), `kein Beleg für ${q[1]}`);
  }
  for (const z of html.match(/<g class="vz-ziel"[^>]*>/g) || []) {
    const q = /data-q="([^"]+)"/.exec(z);
    if (q) assert.ok(c.register.has(q[1]), `Diagrammziel ohne Beleg: ${q[1]}`);
  }
  for (const f of html.split('<figure class="vz"').slice(1)) { assert.match(f, /class="vz-titel"/); assert.match(f, /class="vz-kern"/); }
  return knoepfe.length;
}

for (const s of ["de", "en"]) {
  for (const feld of ["erholung", "belastung", "schlaf"]) {
    test(`Vergleich ${feld} (${s}): eine Kernaussage, jede Zahl mit data-q und Beleg`, () => {
      setzeSprache(s);
      const c = ctx(["vergleich"], { feld });
      const html = vgl.ansicht(c);
      assert.ok(pruefeRuhe(html, c) > 0, "Zahlen vorhanden");
      assert.match(html, new RegExp(`data-feld="${feld}"`));
      // Kein Urteil: außer dem Hinweis „nicht, welche Zahl stimmt“ kein Wort wie genauer/besser/richtig
      const ohneHinweis = html.replace(/<p class="mf-leise">[^<]*<\/p>/g, "");
      assert.doesNotMatch(ohneHinweis, /richtig|genauer|besser|stimmt|accurate|better|correct|right\b/i, "kein Urteil");
    });
  }
}

test("Vergleich: Kernsatz nennt nah von n Tagen, WHOOP-Zahl führt zu Datei und Zeile", () => {
  setzeSprache("de");
  const c = ctx(["vergleich"], { feld: "erholung", tag: "2026-10-28" });
  const html = vgl.ansicht(c), v = vergleich(ERG, "erholung");
  const kern = /<p class="mf-kern">([\s\S]*?)<\/p>/.exec(html)[1].replace(/<[^>]+>/g, "");
  assert.equal(kern, `An ${v.nah} von ${v.n} Tagen liegen MAEHR FIT und WHOOP bei der Erholung höchstens 10 Punkte auseinander.`);
  assert.match(html, /aria-current="date"/, "Tag aus der Route hervorgehoben");
  assert.equal(zaehle(html, /class="vz-svg/g), 2, "zwei Linien: MF und WHOOP");
  const f = c.register.get("fremd:erholung:2026-10-28");
  assert.equal(f.wert, "33 %");
  assert.match(f.formel.text, /Rechenweg nicht bekannt/);
  assert.deepEqual([f.quellen[0].datei, f.quellen[0].zeile], ["whoop_physiological_cycles.csv", 6]);
  const m = c.register.get("vergleich-mittel:erholung");
  assert.ok(m.formel.text.startsWith("Abstand = Wert von MAEHR FIT − Wert von WHOOP"));
});

test("Vergleich Belastung: MF ohne Herzschläge → Hinweis statt Diagramm, Übersicht zeigt 0 Tage", () => {
  setzeSprache("de");
  const c = ctx(["vergleich"], { feld: "belastung" });
  const html = vgl.ansicht(c);
  assert.match(html, /data-vgl-fehlt/);
  assert.equal(zaehle(html, /class="vz-svg/g), 0);
  assert.match(/<p class="mf-kern">([\s\S]*?)<\/p>/.exec(html)[1], /noch keinen Tag/);
});

test("Vergleich ohne WHOOP-Werte (Demodaten): ein Satz und ein Knopf zu den Daten", () => {
  setzeSprache("de");
  const d = demo({ heute: "2026-10-30" }), erg = berechne(d, d.einstellungen || { alter: 38 });
  const c = ctx(["vergleich"], {}, erg, "2026-10-30");
  const html = vgl.ansicht(c);
  pruefeRuhe(html, c);
  assert.match(html, /href="#\/daten"/);
});

test("Heute: Link zum Vergleich nur an Tagen mit WHOOP-Werten", () => {
  setzeSprache("de");
  const mit = heute.ansicht(ctx(["heute"]));
  assert.match(mit, /data-heute-vergleich/);
  const d = demo({ heute: "2026-10-30" }), erg = berechne(d, d.einstellungen || { alter: 38 });
  assert.doesNotMatch(heute.ansicht(ctx(["heute"], {}, erg, "2026-10-30")), /data-heute-vergleich/);
});

test("Mehr: Zeile zum Vergleich und Anzahl der zu prüfenden Formeln; Liste mit Beleg je Formel", () => {
  setzeSprache("de");
  const n = pruefListe().length;
  const html = mehr.ansicht(ctx(["mehr"]));
  assert.match(html, /href="#\/vergleich"/);
  assert.match(html, new RegExp(`data-pruefen-anzahl>${n}<`));
  for (const s of ["de", "en"]) {
    setzeSprache(s);
    const c = ctx(["mehr", "pruefen"]);
    const liste = mehr.ansicht(c);
    assert.equal(pruefeRuhe(liste, c), n + 1, "jede Formel ein Knopf plus Anzahl im Kernsatz");
    assert.ok(c.register.get("formel:vergleich.nah.erholung").formel.pruefen);
  }
  setzeSprache("de");
});

test("Daten: Zusammenfassung nach dem Einlesen nennt Arten und Zeitraum", () => {
  setzeSprache("de");
  const text = importText({ n: 55, arten: IMPORT.arten, zeitraum: IMPORT.zeitraum, hinweise: IMPORT.hinweise });
  assert.match(text, /^55 Messwerte eingelesen: 6 HRV, 7 Ruhepuls, 7 Atemfrequenz, 6 Sauerstoffsättigung, 7 Hauttemperatur, 7 Schlaf, 5 Trainings, 3 Tagebuch, 7 WHOOP-Werte · Zeitraum: /);
  assert.equal(importText(12, ["a.csv"]), "12 Messwerte aus „a.csv“ eingelesen.");
});
