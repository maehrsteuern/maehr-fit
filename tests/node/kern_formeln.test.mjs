// Tests kern/formeln.js, kern/rundung.js und kern/formeln/formeln.json.
//
// Fall 1 (Vollständigkeit): jeder Eintrag hat wert, einheit, fundstelle und erklaerung; pruefen ist ein Wahrheitswert.
// Fall 2 (Platzhalter): Text "erholung" ersetzt {erholung.mitte} → 50, {erholung.punkte_je_z} → 20,
//   {erholung.gewicht.hrv|prozent} → 500 ‰ ÷ 10 = 50 %, {schlaf.bedarf.je_belastung|min} → 60 000 ms ÷ 60 000 = 1.
// Fall 3 (Rundung DIN 1333): 2,5 → 3; −2,5 → −3; 1,005 auf 2 Stellen → 1,01 (Gleitkomma 100,4999… ausgeglichen);
//   rundBruch(7, 2) = 3,5 → 4; rundBruch(−7, 2) → −4; rundBruch(5, 3) = 1,67 → 2; rundBruch(4, 3) = 1,33 → 1.
// Grenzfälle: unbekannter Schlüssel wirft; rund(NaN) = null; rundBruch mit Nenner 0 wirft.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formel, wert, alleSchluessel, pruefListe, eintrag } from "../../kern/formeln.js";
import { rund, rundBruch, begrenze } from "../../kern/rundung.js";

const JSON_ = JSON.parse(readFileSync(new URL("../../kern/formeln/formeln.json", import.meta.url), "utf8"));

test("jeder Eintrag hat wert, einheit, fundstelle, erklaerung und pruefen", () => {
  for (const [k, e] of Object.entries(JSON_.eintraege)) {
    assert.ok("wert" in e, k + ": wert fehlt");
    assert.ok(typeof e.einheit === "string" && e.einheit.length > 0, k + ": einheit");
    assert.ok(typeof e.fundstelle === "string" && e.fundstelle.length > 5, k + ": fundstelle");
    assert.ok(typeof e.erklaerung === "string" && e.erklaerung.length > 5, k + ": erklaerung");
    assert.equal(typeof e.pruefen, "boolean", k + ": pruefen");
    if (e.fundstelle.startsWith("eigene Festlegung MF") && !/Zahlendarstellung|Darstellung/.test(e.fundstelle) && e.wert !== null) {
      assert.equal(e.pruefen, true, k + ": eigene Festlegung mit Zahlenwert muss pruefen: true tragen");
    }
  }
  assert.equal(alleSchluessel().length, Object.keys(JSON_.eintraege).length);
});

test("formel liefert schluessel, text, fundstelle, wert, einheit und ersetzt Platzhalter", () => {
  const f = formel("erholung");
  assert.deepEqual(Object.keys(f).slice(0, 5), ["schluessel", "text", "fundstelle", "wert", "einheit"]);
  assert.match(f.text, /^Erholung = 50 \+ 20 ×/);
  assert.match(f.text, /Gewichte HRV 50 %, Ruhepuls 25 %, Schlaf 25 %/);
  assert.match(formel("schlaf.bedarf").text, /\+ 1 min je Belastungspunkt/);
  assert.match(formel("belastung").text, /21 × ln\(1 \+ T ÷ 25\) ÷ ln\(1 \+ 700 ÷ 25\)/);
  assert.equal(formel("puls.max.tanaka").pruefen, false);
  assert.equal(wert("belastung.skala_max"), 21);
  assert.equal(eintrag("basis.fenster.kurz").wert, 7);
});

test("unbekannter Schlüssel wirft", () => {
  assert.throws(() => formel("gibt.es.nicht"), /unbekannter Schlüssel/);
  assert.throws(() => wert(""), /unbekannter Schlüssel/);
});

test("pruefListe enthält eigene Festlegungen, nicht die Literaturwerte", () => {
  const p = pruefListe().map((f) => f.schluessel);
  for (const k of ["erholung.gewicht.hrv", "erholung.stufe.gruen", "belastung.kurve.b", "schlaf.bedarf.schuld_anteil", "tagebuch.min_n", "atem.seufzer"]) assert.ok(p.includes(k), k);
  for (const k of ["puls.max.tanaka", "belastung.gewichte", "atem.box", "schlaf.bedarf.basis"]) assert.ok(!p.includes(k), k);
});

test("Rundung kaufmännisch nach DIN 1333", () => {
  assert.equal(rund(2.5), 3);
  assert.equal(rund(-2.5), -3);
  assert.equal(rund(2.4999), 2);
  assert.equal(rund(1.005, 2), 1.01);
  assert.equal(rund(-0.04, 1), 0);
  assert.ok(Object.is(rund(-0.04, 1), 0), "kein −0");
  assert.equal(rund(NaN), null);
  assert.equal(rund("3"), null);
  assert.equal(rundBruch(7, 2), 4);
  assert.equal(rundBruch(-7, 2), -4);
  assert.equal(rundBruch(5, 3), 2);
  assert.equal(rundBruch(4, 3), 1);
  assert.equal(rundBruch(0, 5), 0);
  assert.throws(() => rundBruch(1, 0));
  assert.throws(() => rundBruch(1.5, 2));
  assert.equal(begrenze(120, 0, 100), 100);
  assert.equal(begrenze(-3, 0, 100), 0);
});
