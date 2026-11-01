// tests/node/shell_hintergrund.test.mjs – Ansicht „Mitteilungen & Widgets“ (shell/apps/mitteilungen.js) und ihr Eintrag in „Mehr“.
// Kernaussage: Im Browser sagt die Seite ruhig in einem Satz, dass es das nur in der Android-App gibt; in der App steht oben genau eine
// Kernaussage mit dem letzten Lauf als Zahl-Knopf samt Beleg, darunter echte Schalter und Knöpfe. Xiaomi-Handys bekommen den Autostart-Knopf.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neuesRegister } from "../../shell/ui.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";
import * as mehr from "../../shell/apps/mehr.js";
import * as mitteilungen from "../../shell/apps/mitteilungen.js";
import { menueHtml } from "../../shell/rahmen.js";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ctx = () => ({ route: { teile: ["mehr", "mitteilungen"], abfrage: {} }, register: neuesRegister(), aktionen: {} });
const zaehle = (html, re) => (html.match(re) || []).length;
const JETZT = Date.now();
const STATUS = {
  aktiv: true, intervallMin: 60, letzterLauf: { zeit: JETZT - 12 * 60000, ergebnis: "ok", neu: 3, arten: { HeartRate: 2, SleepSession: 1 } }, naechsterLauf: JETZT + 48 * 60000,
  hc: { verfuegbar: true, hintergrundMoeglich: true, hintergrundErteilt: true },
  mitteilungen: { recht: "granted", morgen: { aktiv: true, uhrzeit: "07:30" }, erholung: { aktiv: false }, schlaf: { aktiv: true } },
  widgets: { erholung: 1, heute: 0, schlaf: 1 }, geraet: { hersteller: "Xiaomi", modell: "Muster", android: 34 },
};
function mitBruecke(fn) {
  const alt = globalThis.MF;
  globalThis.MF = { native: { hintergrund: { status: async () => STATUS } } };
  try { return fn(); } finally { globalThis.MF = alt; mitteilungen.setzeStatus(null); }
}
function pruefeRuhe(html, c) {
  assert.equal(zaehle(html, /class="mf-kern"/g), 1, "genau eine Kernaussage");
  for (const b of html.match(/<button\b[^>]*>/g) || []) {
    if (!/class="[^"]*\bzahl\b/.test(b)) { assert.match(b, /type="button"/); continue; }
    const q = /data-q="([^"]+)"/.exec(b);
    assert.ok(q, `Zahl ohne data-q: ${b}`);
    assert.ok(c.register.has(q[1]), `kein Beleg für ${q[1]}`);
  }
}

for (const s of ["de", "en"]) {
  test(`Browser (${s}): ein ruhiger Satz „nur in der Android-App“, keine Schalter`, () => {
    setzeSprache(s);
    const c = ctx(), html = mehr.ansicht(c);
    pruefeRuhe(html, c);
    assert.match(html, /data-modus="browser"/);
    assert.match(html, s === "de" ? /nur in der Android-App/ : /only available in the MAEHR FIT Android app/);
    assert.doesNotMatch(html, /type="checkbox"/);
    assert.match(html, /href="#\/mehr"/, "Zurück zu Mehr");
  });

  test(`Android (${s}): Kernaussage mit letztem Lauf als Zahl-Knopf, Schalter, Uhrzeit, Xiaomi-Knopf, Widgets`, () => {
    setzeSprache(s);
    mitBruecke(() => {
      const c = ctx();
      assert.match(mitteilungen.ansicht(c), new RegExp(s === "de" ? "wird geladen" : "Loading"));
      mitteilungen.setzeStatus(STATUS);
      const html = mehr.ansicht(c);
      pruefeRuhe(html, c);
      assert.match(html, /data-modus="android"/);
      assert.match(html, /data-q="hintergrund:letzter"/);
      assert.equal(c.register.get("hintergrund:letzter").teile.length, 4);
      assert.equal(zaehle(html, /role="switch"/g), 4);
      assert.match(html, /<option value="07:30" selected>/);
      assert.match(html, /<option value="60" selected>/);
      assert.match(html, /data-aktion="autostart"/);
      assert.match(html, /data-aktion="test"/);
      assert.match(html, /data-aktion="widgets"/);
      assert.doesNotMatch(html, /data-aktion="hc-erlauben"/, "Recht schon erteilt");
      assert.match(html, s === "de" ? /Der Morgenbericht kommt um 07:30\./ : /The morning report arrives at 07:30\./);
    });
  });
}

test("Android: ohne Hintergrundrecht, Mitteilungen verweigert, anderes Handy, Abgleich aus", () => {
  setzeSprache("de");
  mitBruecke(() => {
    const c = ctx();
    mitteilungen.setzeStatus({ ...STATUS, hc: { verfuegbar: true, hintergrundMoeglich: true, hintergrundErteilt: false }, mitteilungen: { ...STATUS.mitteilungen, recht: "denied" }, geraet: { hersteller: "Google" } });
    const html = mitteilungen.ansicht(c);
    pruefeRuhe(html, c);
    assert.match(html, /darf Health Connect noch nicht im Hintergrund lesen/);
    assert.match(html, /data-aktion="hc-erlauben"/);
    assert.match(html, /data-aktion="mt-einstellungen"/, "verweigert → System-Einstellungen statt Dialog");
    assert.doesNotMatch(html, /data-aktion="autostart"/);
    mitteilungen.setzeStatus({ ...STATUS, aktiv: false, letzterLauf: null });
    const aus = mitteilungen.ansicht(ctx());
    assert.match(aus, /Abgleich im Hintergrund ist aus/);
    assert.match(aus, /<select name="intervallMin" data-einst="intervallMin" disabled>/);
  });
});

test("ergebnisText: alle Ergebnisse eines Laufs als Satz", () => {
  setzeSprache("de");
  assert.equal(mitteilungen.ergebnisText(null), "noch keiner");
  assert.equal(mitteilungen.ergebnisText({ ergebnis: "ok", neu: 1 }), "1 neuer Messwert");
  assert.equal(mitteilungen.ergebnisText({ ergebnis: "ok", neu: 0 }), "nichts Neues");
  assert.equal(mitteilungen.ergebnisText({ ergebnis: "ok", neu: 1200 }), "1.200 neue Messwerte");
  assert.match(mitteilungen.ergebnisText({ ergebnis: "ohne_recht" }), /Hintergrundrecht/);
  assert.match(mitteilungen.ergebnisText({ ergebnis: "fehler", fehler: "Zeitüberschreitung" }), /Zeitüberschreitung/);
  assert.equal(mitteilungen.UHRZEITEN[0], "05:00");
  assert.equal(mitteilungen.UHRZEITEN.at(-1), "11:00");
  assert.ok(mitteilungen.UHRZEITEN.includes("07:30"));
});

test("Mehr und Menü führen zu #/mehr/mitteilungen; Stylesheet eingebunden, ohne Farbwerte", () => {
  assert.match(mehr.ansicht({ route: { teile: ["mehr"] }, register: neuesRegister() }), /href="#\/mehr\/mitteilungen"/);
  assert.match(menueHtml(), /href="#\/mehr\/mitteilungen"/);
  assert.match(readFileSync(join(WURZEL, "shell/index.html"), "utf8"), /design\/design_mitteilungen\.css/);
  const css = readFileSync(join(WURZEL, "shell/design/design_mitteilungen.css"), "utf8");
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(css, /transition|animation/);
});
