// tests/node/shell_live.test.mjs – Live-Ansicht (shell/apps/live.js), Pulsquelle (shell/puls.js) und viz.verlauf.
// Kernaussage: Die Live-Sicht zeigt ohne Verbindung einen ruhigen Satz und den Demo-Puls, mit Werten jede Zahl als Knopf mit Beleg;
// die Verlaufslinie hat Titel, Kernaussage und genau ein Ziel; die Dauer läuft als Uhr „m:ss“.
// Handrechnung uhr: 247 000 ms = 4 min 7 s → „4:07“; 3 727 000 ms = 1 h 2 min 7 s → „1:02:07“; 999 ms → „0:00“.
import { test } from "node:test";
import assert from "node:assert/strict";
import { verlauf } from "../../shell/viz/viz.js";
import { uhr, pulsEinstellungen, ansicht } from "../../shell/apps/live.js";
import { neuesRegister } from "../../shell/ui.js";
import * as puls from "../../shell/puls.js";
import { liveEinhaengen } from "../../shell/live.js";

test("uhr: m:ss und h:mm:ss", () => {
  assert.equal(uhr(247000), "4:07");
  assert.equal(uhr(3727000), "1:02:07");
  assert.equal(uhr(999), "0:00");
  assert.equal(uhr(-5), "0:00");
});

test("verlauf: leer mit Satz, sonst ein Ziel mit data-q und Kennzahlen als Knöpfe", () => {
  const leer = verlauf({ titel: "Puls", kernaussage: "Noch nichts.", punkte: [] });
  assert.match(leer.html, /vz-leer/);
  assert.match(leer.html, /class="vz-titel"/);
  const v = verlauf({ titel: "Puls", kernaussage: "Zwischen 60 und 80.", punkte: [{ t: 0, wert: 60 }, { t: 60000, wert: 80 }, { t: 120000, wert: 70 }], vonMs: -60000, bisMs: 120000, q: "live:verlauf", text: "70",
    kennzahlen: [{ name: "zuletzt", text: "70", q: "live:puls" }] });
  assert.equal((v.html.match(/class="vz-ziel"/g) || []).length, 1);
  assert.match(v.html, /data-q="live:verlauf"/);
  assert.match(v.html, /<button type="button" class="zahl" data-q="live:puls">70<\/button>/);
  assert.match(v.text, /zuletzt: 70/);
  assert.doesNotMatch(v.svg, /NaN/);
});

test("Pulseinstellungen: Höchstpuls aus Einstellung oder Alter, Ruhepuls aus dem Tag", () => {
  const e = pulsEinstellungen({ einst: { alter: 32, maxPuls: "" }, heute: "2026-10-30", erg: { tage: new Map([["2026-10-30", { ruhepuls: { wert: 57.4 } }]]) } });
  assert.deepEqual(e, { maxPuls: 186, ruhepuls: 57, ok: true }); // Tanaka: (2080 − 7·32) ÷ 10 = 185,6 → 186
  assert.equal(pulsEinstellungen({ einst: { maxPuls: 190 } }).ok, false);
});

test("Live-Ansicht ohne Verbindung: ein Satz, Demo-Knopf, Zahlen mit Beleg", () => {
  const register = neuesRegister();
  const html = ansicht({ einst: { alter: 32 }, register, route: { teile: ["live"], abfrage: { von: "atem" } } });
  assert.equal((html.match(/class="mf-kern"/g) || []).length, 1);
  assert.match(html, /data-lv="demo"/);
  assert.match(html, /href="#\/atem"/);
  for (const q of html.matchAll(/data-q="([^"]+)"/g)) assert.ok(register.has(q[1]), q[1]);
  assert.equal(puls.zustand().aktiv, false);
  assert.equal(puls.bluetoothArt({}), null);
  assert.equal(puls.bluetoothArt({ navigator: { bluetooth: { requestDevice() {} } } }), "webbluetooth");
});

test("liveEinhaengen trägt die Ansicht unter „live“ ein", () => {
  const apps = liveEinhaengen({});
  assert.equal(typeof apps.live.ansicht, "function");
  assert.equal(typeof apps.live.binde, "function");
});
