// tests/node/ruhe.test.mjs – Ruhe-Regeln der Oberfläche (docs/technik/ux_leitlinien.md), wie MBS tests/node/ruhe.test.mjs.
// Kernaussage: Jede Ansicht hat genau eine Kernaussage, „Heute“ höchstens vier Kacheln, die Kopfleiste höchstens sechs Dinge,
// jede Zahl ist ein Knopf mit data-q und jeder data-q hat einen Beleg, Hex-Farben stehen nur in marke.css, die Atemübung taktet
// ohne Intervall-Zeitgeber, beide Dunkel-Blöcke sind gleich und alle Schriftfarben erreichen 4,5 : 1.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { demo, berechne } from "../../shell/kern.js";
import { neuesRegister } from "../../shell/ui.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";
import { kopfHtml } from "../../shell/rahmen.js";
import * as heute from "../../shell/apps/heute.js";
import * as schlaf from "../../shell/apps/schlaf.js";
import * as belastung from "../../shell/apps/belastung.js";
import * as atem from "../../shell/apps/atem.js";
import * as tagebuch from "../../shell/apps/tagebuch.js";
import * as trends from "../../shell/apps/trends.js";
import * as daten from "../../shell/apps/daten.js";
import * as mehr from "../../shell/apps/mehr.js";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "../..");
const lies = (rel) => readFileSync(join(WURZEL, rel), "utf8");
function dateien(rel, endung) {
  const aus = [];
  for (const n of readdirSync(join(WURZEL, rel))) { const p = join(rel, n); if (statSync(join(WURZEL, p)).isDirectory()) aus.push(...dateien(p, endung)); else if (p.endsWith(endung)) aus.push(p); }
  return aus;
}

const HEUTE = "2026-10-30";
const DATEN = demo({ heute: HEUTE });
const ERG = berechne(DATEN, DATEN.einstellungen || { alter: 38 });
function ctx(teile, abfrage = {}, tag = HEUTE, bildWeg = false) {
  return { tag, heute: HEUTE, bild: bildWeg ? null : ERG.tage.get(tag), erg: ERG, einst: { alter: 38 }, demo: true, route: { teile, abfrage }, register: neuesRegister(), tagebuchEigen: {}, atemHeuteMs: 0, aktionen: {} };
}
const trainingId = ERG.liste.flatMap((b) => b.trainings).at(-1)?.id;
const TRAININGSTAG = ERG.liste.find((b) => b.trainings.some((x) => x.id === trainingId))?.tag;
const ANSICHTEN = [
  ["heute", heute, ["heute"]], ["schlaf", schlaf, ["schlaf"]], ["belastung", belastung, ["belastung"]], ["training", belastung, ["belastung", "training", trainingId], {}, TRAININGSTAG],
  ["atem", atem, ["atem"]], ["atem-sitzung", atem, ["atem", "box"]], ["mehr", mehr, ["mehr"]], ["tagebuch", tagebuch, ["tagebuch"]],
  ["wirkung", tagebuch, ["tagebuch", "wirkung"]], ["trends", trends, ["trends"]], ["trends-30", trends, ["trends"], { feld: "schlaf", fenster: "30" }],
  ["daten", daten, ["daten"]], ["einstellungen", daten, ["einstellungen"]],
];
const zaehle = (html, re) => (html.match(re) || []).length;

for (const s of ["de", "en"]) {
  for (const [name, app, teile, abfrage, tag] of ANSICHTEN) {
    test(`${name} (${s}): genau eine Kernaussage, jede Zahl ein Knopf mit Beleg, jedes Diagramm mit Titel und Satz`, () => {
      setzeSprache(s);
      const c = ctx(teile, abfrage, tag || HEUTE);
      const html = app.ansicht(c);
      assert.equal(zaehle(html, /class="mf-kern"/g), 1, "genau eine Kernaussage");
      for (const b of html.match(/<button\b[^>]*>/g) || []) {
        if (!/class="[^"]*\bzahl\b/.test(b)) continue;
        const q = /data-q="([^"]+)"/.exec(b);
        assert.ok(q, `Zahl ohne data-q: ${b}`);
        assert.ok(c.register.has(q[1].replace(/&amp;/g, "&")), `kein Beleg für ${q[1]}`);
      }
      for (const z of html.match(/<g class="vz-ziel"[^>]*>/g) || []) {
        const q = /data-q="([^"]+)"/.exec(z);
        if (q) assert.ok(c.register.has(q[1]), `Diagrammziel ohne Beleg: ${q[1]}`);
      }
      for (const f of html.split('<figure class="vz"').slice(1)) {
        assert.match(f, /class="vz-titel"/, "Diagramm ohne Titel"); assert.match(f, /class="vz-kern"/, "Diagramm ohne Kernaussage");
      }
    });
  }
}
setzeSprache("de");

test("leerer Tag: jede Ansicht sagt es in einem Satz", () => {
  for (const [name, app, teile] of ANSICHTEN.filter(([n]) => ["heute", "schlaf", "belastung", "training"].includes(n))) {
    assert.equal(zaehle(app.ansicht(ctx(teile, {}, HEUTE, true)), /class="mf-kern"/g), 1, name);
  }
});

test("Heute: höchstens vier Kacheln und eine Heldenzahl", () => {
  const html = heute.ansicht(ctx(["heute"]));
  assert.ok(zaehle(html, /class="mf-kachel"/g) <= 4);
  assert.equal(zaehle(html, /class="rg[ "]/g), 1);
});

test("Kopfleiste: höchstens sechs Elemente", () => {
  const html = kopfHtml({ tag: HEUTE, heute: HEUTE, erster: ERG.erster, thema: "auto" });
  const innen = /^<header[^>]*>([\s\S]*)<\/header>$/.exec(html)[1];
  // Kinder der obersten Ebene zählen (selbstschließende und leere Elemente kommen hier nicht vor)
  let tiefe = 0, kinder = 0;
  for (const m of innen.matchAll(/<(\/?)([a-z]+)[^>]*?(\/?)>/g)) {
    if (["path", "circle", "ellipse", "svg"].includes(m[2]) && tiefe > 0) { if (!m[1] && !m[3] && m[2] === "svg") tiefe++; else if (m[1] && m[2] === "svg") tiefe--; continue; }
    if (m[1]) tiefe--; else if (!m[3]) { if (tiefe === 0) kinder++; tiefe++; }
  }
  assert.equal(tiefe, 0);
  assert.ok(kinder <= 6, `Kopfleiste hat ${kinder} Elemente`);
});

test("jeder Zahl-Knopf im Quelltext trägt data-q", () => {
  for (const d of dateien("shell", ".js")) {
    for (const m of lies(d).matchAll(/<button\b[^>]*class="zahl[^"]*"[^>]*>/g)) assert.match(m[0], /data-q=/, `${d}: ${m[0]}`);
  }
});

test("keine Hex-Farben außerhalb von shell/design/marke.css", () => {
  const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
  const pruefen = [...dateien("shell", ".css"), ...dateien("shell", ".js"), "shell/index.html"].filter((d) => !d.endsWith("marke.css") && !d.startsWith("shell/vendor"));
  for (const d of pruefen) assert.deepEqual(lies(d).match(HEX) || [], [], d);
});

test("Atemübung taktet ohne Intervall-Zeitgeber", () => {
  const q = lies("shell/apps/atem.js");
  assert.doesNotMatch(q, /setInterval/);
  assert.match(q, /requestAnimationFrame/);
  assert.match(q, /performance\.now\(\)/);
});

test("Dunkel: beide Blöcke gleich (prefers-color-scheme und data-theme)", () => {
  for (const d of ["shell/design/design.css"]) {
    const css = lies(d);
    const a = /@media \(prefers-color-scheme: dark\) \{ :root:not\(\[data-theme="light"\]\) \{([\s\S]*?)\} \}/.exec(css)?.[1];
    const b = /:root\[data-theme="dark"\] \{([\s\S]*?)\}/.exec(css)?.[1];
    assert.ok(a && b, d);
    assert.equal(a.replace(/\s+/g, " ").trim(), b.replace(/\s+/g, " ").trim(), d);
  }
});

// Kontrast nach WCAG 2.2 (relative Leuchtdichte), Werte aus marke.css
const marke = Object.fromEntries([...lies("shell/design/marke.css").matchAll(/(--m-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
const lum = (hex) => { const k = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2]; };
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
for (const h of ["h", "d"]) {
  test(`Kontrast ${h === "h" ? "hell" : "dunkel"}: Schrift ≥ 4,5 : 1, Grafik ≥ 3 : 1`, () => {
    const m = (n) => marke[`--m-${h}-${n}`];
    for (const [text, flaeche] of [["tinte", "papier"], ["tinte", "grund"], ["tinte2", "papier"], ["leise", "papier"], ["leise", "grund"], ["leise", "flaeche2"], ["gruen", "papier"], ["gruen", "grund"],
      ["auf-gruen", "gruen"], ["bernstein", "papier"], ["bernstein", "bernstein-weich"], ["fehler", "papier"], ["fehler", "fehler-weich"], ["tinte", "gruen-weich"], ["tinte", "ok-weich"]]) {
      assert.ok(kontrast(m(text), m(flaeche)) >= 4.5, `${text} auf ${flaeche}: ${kontrast(m(text), m(flaeche)).toFixed(2)}`);
    }
    for (const g of ["vz-k0", "vz-k1", "vz-k2", "vz-k3", "vz-k4", "ok", "bernstein-punkt", "fehler", "linie-stark"]) {
      assert.ok(kontrast(m(g), m("papier")) >= 3, `${g} auf papier: ${kontrast(m(g), m("papier")).toFixed(2)}`);
    }
  });
}
