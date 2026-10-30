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
import * as vergleich from "../../shell/apps/vergleich.js";
import * as liveApp from "../../shell/apps/live.js";

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
  ["vergleich", vergleich, ["vergleich"]], ["live", liveApp, ["live"]], ["pruefen", mehr, ["mehr", "pruefen"]],
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

test("Dunkel: Kleid Nacht ist die Grundeinstellung (index.html und shell.js)", () => {
  assert.match(lies("shell/index.html"), /<html lang="de" data-theme="dark">/);
  assert.match(lies("shell/shell.js"), /thema: "dunkel"/);
});

// Bewegung (docs/technik/design_mf.md): höchstens 450 ms, nur transform und opacity, aus bei prefers-reduced-motion.
// Ausnahmen mit Begründung: das Live-Herz (Dauer --lv-schlag = 60 ÷ Puls) und der Atemkreis (per requestAnimationFrame gesetzt).
const DESIGN = dateien("shell/design", ".css");
const ms = (wert, einheit) => Number(wert) * (einheit === "s" ? 1000 : 1);
test("Bewegung: jede Dauer in allen design*.css höchstens 450 ms (Ausnahme --lv-schlag)", () => {
  for (const d of DESIGN) {
    const css = lies(d).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of css.matchAll(/(?:transition|animation)(?:-duration|-delay)?\s*:\s*([^;}]+)/g)) {
      for (const z of m[1].matchAll(/(?<![\w-])(\d*\.?\d+)(ms|s)\b/g)) assert.ok(ms(z[1], z[2]) <= 450, `${d}: ${m[0]}`);
      if (/var\(--lv-schlag/.test(m[1])) assert.match(d, /design_bewegung\.css$/, "nur das Live-Herz darf dem Puls folgen");
    }
    for (const m of css.matchAll(/--(dauer[\w-]*)\s*:\s*(\d*\.?\d+)(ms|s)/g)) assert.ok(ms(m[2], m[3]) <= 450, `${d}: --${m[1]}`);
    // Staffelung: Verzögerung + Dauer des Auftauchens zusammen ≤ 450 ms
    for (const m of css.matchAll(/animation-delay:\s*(\d+)ms/g)) assert.ok(Number(m[1]) + 200 <= 450, `${d}: Verzögerung ${m[1]} ms`);
  }
});
test("Bewegung: Übergänge und Schlüsselbilder nur mit transform und opacity", () => {
  for (const d of DESIGN) {
    const css = lies(d).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of css.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g)) {
      for (const teil of m[1].split(",")) assert.match(teil.trim(), /^(transform|opacity|none)\b/, `${d}: ${m[0]}`);
    }
    for (const m of css.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?\})\s*\}/g)) {
      for (const p of m[1].matchAll(/([\w-]+)\s*:/g)) assert.ok(["transform", "opacity"].includes(p[1]), `${d}: Schlüsselbild mit ${p[1]}`);
    }
  }
});
test("Bewegung: aus bei prefers-reduced-motion (global in design.css, dazu je Datei mit Animation)", () => {
  assert.match(lies("shell/design/design.css"), /@media \(prefers-reduced-motion: reduce\) \{\s*\*, \*::before, \*::after \{ transition: none !important; animation: none !important; \}/);
  for (const d of DESIGN) if (/animation\s*:/.test(lies(d)) && !d.endsWith("design.css")) assert.match(lies(d), /prefers-reduced-motion: reduce/, d);
  for (const d of ["shell/bewegung.js", "shell/apps/live.js", "shell/apps/atem.js"]) assert.doesNotMatch(lies(d), /setInterval/, d);
  assert.match(lies("shell/bewegung.js"), /prefers-reduced-motion: reduce/);
  assert.match(lies("shell/bewegung.js"), /DAUER_HOCHZAEHLEN_MS = 450/);
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
    // Kleid Nacht: Schrift auf allen drei Flächenstufen (Kachel, Pille, Beleg-Karte) und auf der Bühne
    const buehne = h === "d" ? marke["--m-nacht"] : m("grund");
    for (const f of ["flaeche-1", "flaeche-2", "flaeche-3"]) {
      for (const text of ["tinte", "tinte2", "leise", "gruen", "bernstein"]) assert.ok(kontrast(m(text), m(f)) >= 4.5, `${text} auf ${f}: ${kontrast(m(text), m(f)).toFixed(2)}`);
      // Grafik: Bogen, Verlaufsenden, Diagrammfarben, Zonen – auf Karte und Kachel (Fläche 3 ist nur Spur und Pille, dort keine Grafik)
      if (f !== "flaeche-3") for (const g of ["ok", "bernstein-punkt", "fehler", "gruen-hell", "gelb-hell", "rot-hell", "akzent-hell", "gruen", "vz-k0", "vz-k1", "vz-k2", "vz-k3", "vz-k4"]) {
        assert.ok(kontrast(m(g), m(f)) >= 3, `${g} auf ${f}: ${kontrast(m(g), m(f)).toFixed(2)}`);
      }
    }
    for (const text of ["tinte", "leise", "gruen"]) assert.ok(kontrast(m(text), buehne) >= 4.5, `${text} auf Bühne: ${kontrast(m(text), buehne).toFixed(2)}`);
    assert.ok(kontrast(m("auf-gruen"), m("gruen")) >= 4.5, "Schrift auf gewählter Pille");
  });
}

// ------------------------------------------------------------------ Phase 2: Live-Puls (shell/apps/live.js) und Puls beim Atmen
import * as live from "../../shell/apps/live.js";
for (const s of ["de", "en"]) {
  for (const [name, app, teile, einst] of [["live", live, ["live"], {}], ["atem-puls", atem, ["atem", "kohaerenz"], { atemPuls: true }]]) {
    test(`${name} (${s}): genau eine Kernaussage, jede Zahl ein Knopf mit Beleg`, () => {
      setzeSprache(s);
      const c = { ...ctx(teile), einst: { alter: 38, ...einst } };
      const html = app.ansicht(c);
      assert.equal(zaehle(html, /class="mf-kern"/g), 1, "genau eine Kernaussage");
      for (const b of html.match(/<button\b[^>]*class="[^"]*\bzahl\b[^"]*"[^>]*>/g) || []) {
        const q = /data-q="([^"]+)"/.exec(b);
        assert.ok(q && c.register.has(q[1]), `Zahl ohne Beleg: ${b}`);
      }
      for (const f of html.split('<figure class="vz"').slice(1)) { assert.match(f, /class="vz-titel"/); assert.match(f, /class="vz-kern"/); }
      setzeSprache("de");
    });
  }
}
test("Live-Puls taktet ohne Intervall-Zeitgeber", () => {
  for (const d of ["shell/apps/live.js", "shell/puls.js", "shell/live.js", "daten/ble_puls.js", "daten/bruecke_demo.js", "daten/bruecke_webbluetooth.js", "daten/bruecke_ble_capacitor.js"]) assert.doesNotMatch(lies(d), /setInterval/, d);
  assert.match(lies("shell/apps/live.js"), /requestAnimationFrame/);
});
