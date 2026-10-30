// tests/node/shell_i18n.test.mjs – Texte der Oberfläche (shell/i18n/i18n.js).
// Kernaussage: Jeder Text gibt es auf Deutsch und Englisch mit denselben Platzhaltern, und kein Text macht eine medizinische Aussage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TEXTE, t, setzeSprache } from "../../shell/i18n/i18n.js";

const platzhalter = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

test("jeder Schlüssel hat DE und EN mit denselben Platzhaltern", () => {
  for (const [k, [de, en]] of Object.entries(TEXTE)) {
    assert.ok(de && en, `${k} unvollständig`);
    assert.equal(platzhalter(de), platzhalter(en), `${k}: Platzhalter verschieden`);
  }
});

test("keine medizinischen Aussagen (gesund, krank, Diagnose …)", () => {
  const verboten = /\b(gesund\w*|krank\w*|diagnos\w*|healthy|sick\w*|illness|disease|therap\w*|heil\w*)\b/i;
  for (const [k, [de, en]] of Object.entries(TEXTE)) { assert.doesNotMatch(de, verboten, k); assert.doesNotMatch(en, verboten, k); }
});

test("t(): Platzhalter, Sprache, unbekannter Schlüssel", () => {
  setzeSprache("en");
  assert.equal(t("runde", { n: 2, gesamt: 6 }), "Round 2 of 6");
  setzeSprache("de");
  assert.equal(t("runde", { n: 2, gesamt: 6 }), "Runde 2 von 6");
  assert.equal(t("gibt_es_nicht"), "gibt_es_nicht");
  assert.match(t("hinweis_medizin"), /kein Medizinprodukt/);
});
