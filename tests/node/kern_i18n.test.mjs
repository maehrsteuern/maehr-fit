// Tests kern/i18n.js – Beschriftungen DE/EN.
// Fall: t("erholung") = "Erholung", t("erholung", "en") = "Recovery"; Platzhalter {minN}; fehlende Sprache → Deutsch;
//   unbekannter Schlüssel → Schlüssel selbst. Vollständigkeit: jede Tagebuch-Frage, Atemübung, Zone, Stufe hat DE und EN.
import test from "node:test";
import assert from "node:assert/strict";
import { t, fehlend, hat } from "../../kern/i18n.js";
import { KATALOG } from "../../kern/tagebuch.js";
import { UEBUNGEN } from "../../kern/atem.js";

test("Grundfunktion", () => {
  assert.equal(t("erholung"), "Erholung");
  assert.equal(t("erholung", "en"), "Recovery");
  assert.equal(t("erholung", "fr"), "Erholung");
  assert.equal(t("gibt.es.nicht"), "gibt.es.nicht");
  assert.match(t("tagebuch.hinweis.zu_wenig", "de", { minN: 5, mit: 2, ohne: 3 }), /mindestens 5 \(mit: 2, ohne: 3\)/);
});

test("Vollständigkeit", () => {
  assert.deepEqual(fehlend(), []);
  for (const k of KATALOG) assert.ok(hat("tagebuch." + k.schluessel), k.schluessel);
  for (const u of UEBUNGEN) { assert.ok(hat("atem." + u), u); assert.ok(hat("atem." + u + ".beschreibung"), u); }
  for (let z = 0; z <= 5; z++) assert.ok(hat("zone." + z));
  for (const s of ["gruen", "gelb", "rot"]) assert.ok(hat("stufe." + s));
  for (const p of ["wach", "leicht", "tief", "rem"]) assert.ok(hat("phase." + p));
});
