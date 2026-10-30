// tests/node/kern_zusammenfuehren.test.mjs – dieselbe Nacht / dasselbe Training aus Health Connect und WHOOP-CSV, Phasensummen, Nachtfenster,
// Belastung ohne Höchstpuls, Tagebuch-Zuordnung, Trainingsart, Herkunft im Beleg und Diagnose beim Verbinden.
//
// Von Hand nachgerechnet:
//   Nacht A (Health Connect) 22:00–06:00 = 480 min, Nacht B (CSV) 22:20–05:35 = 435 min. Überdeckung = 435 min ≥ 50 % von 435 → ein Satz.
//   Nickerchen 14:00–14:40 liegt nicht in der Nacht → eigener Satz.
//   Training: 45 min in Zone 3 (Zone 3 ab 70 % der Reserve: Ruhe 55, Max 180 → ab 142,5 Schlägen; 150 Schläge/min ist Zone 3, Zone 4 beginnt bei 155).
//   T = 45 min × Gewicht 3 = 135; 21 · ln(1 + 135/25) ÷ ln(29) = 21 · ln(6,4) ÷ ln(29) = 21 · 1,8563 ÷ 3,3673 = 11,58 → 116 Zehntel.
//   Dasselbe Training noch einmal aus dem CSV (Zonenanteile 100 % Zone 3) dürfte NICHT zusätzlich zählen: sonst T = 270 → 21 · ln(11,8) ÷ ln(29) = 15,4.
process.env.TZ = "Europe/Berlin";
import { test } from "node:test";
import assert from "node:assert/strict";
import { gleicherSatz, zusammenlegen, zusammenfuehren, eineQuelle } from "../../kern/zusammenfuehren.js";
import { tagAuswerten } from "../../kern/tag.js";
import { schlafZusammenfassung } from "../../kern/schlaf.js";
import { belastungTag } from "../../kern/belastung.js";
import { katalogSchluessel, mitKatalog, KATALOG } from "../../kern/tagebuch.js";
import { lokal } from "../../kern/zeit.js";
import { artName } from "../../shell/apps/belastung.js";
import { belegHtml } from "../../shell/apps/beleg.js";
import { hcText } from "../../shell/apps/daten.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";

const MIN = 60000;
const HC = (id) => ({ art: "healthconnect", id, herkunft: "com.whoop.android" });
const CSV = (id, zeile) => ({ art: "csv", id, datei: "Schlaf.csv", zeile });

test("gleicherSatz: Überdeckung mindestens die Hälfte des kürzeren", () => {
  const A = { von: lokal("2026-10-28", 22 * 60), bis: lokal("2026-10-29", 6 * 60) }, B = { von: lokal("2026-10-28", 22 * 60 + 20), bis: lokal("2026-10-29", 5 * 60 + 35) };
  const nap = { von: lokal("2026-10-29", 14 * 60), bis: lokal("2026-10-29", 14 * 60 + 40) };
  assert.equal(gleicherSatz(A, B), true);
  assert.equal(gleicherSatz(A, nap), false);
  assert.equal(gleicherSatz({ von: 0, bis: 100 }, { von: 50, bis: 250 }), true, "50 von 100 = genau die Hälfte des kürzeren");
  assert.equal(gleicherSatz({ von: 0, bis: 100 }, { von: 51, bis: 250 }), false);
  assert.equal(gleicherSatz({ von: 0, bis: 0 }, { von: 0, bis: 10 }), false);
});

test("Nacht aus Health Connect (Phasen) und CSV (Summen, WHOOP-Werte): ein Satz, Phasen führend, Felder ergänzt, beide Quellen", () => {
  const hc = { von: lokal("2026-10-28", 22 * 60), bis: lokal("2026-10-29", 6 * 60), quelle: HC("hc1"),
    phasen: [{ von: lokal("2026-10-28", 22 * 60), bis: lokal("2026-10-29", 2 * 60), art: "leicht" }, { von: lokal("2026-10-29", 2 * 60), bis: lokal("2026-10-29", 6 * 60), art: "tief" }] };
  const csv = { von: lokal("2026-10-28", 22 * 60 + 20), bis: lokal("2026-10-29", 5 * 60 + 35), quelle: CSV("whoop:schlaf:1", 2), phasen: [],
    phasenSummen: { wachMs: 30 * MIN, leichtMs: 200 * MIN, tiefMs: 100 * MIN, remMs: 105 * MIN }, schlafMs: 405 * MIN, fremdwerte: { anbieter: "whoop", schlafLeistung: 91 } };
  const nap = { von: lokal("2026-10-29", 14 * 60), bis: lokal("2026-10-29", 14 * 60 + 40), quelle: HC("hc2"), phasen: [] };
  for (const liste of [[hc, csv, nap], [csv, nap, hc]]) {
    const z = zusammenlegen(liste, "schlaf");
    assert.equal(z.length, 2);
    assert.equal(z[0].quelle.id, "hc1", "Health Connect mit echten Phasen führt");
    assert.equal(z[0].von, hc.von);
    assert.equal(z[0].fremdwerte.schlafLeistung, 91);
    assert.equal(z[0].phasenSummen, undefined, "Summen nur, wenn der führende Satz keine Phasen hat");
    assert.deepEqual(z[0].weitereQuellen.map((q) => q.id), ["whoop:schlaf:1"]);
    assert.equal(z[1], nap);
  }
  // Health Connect ohne Stufen, CSV mit Summen: der CSV-Satz führt (er kennt die Phasen)
  const hcOhne = { ...hc, phasen: [] };
  const z = zusammenlegen([hcOhne, csv], "schlaf");
  assert.equal(z.length, 1);
  assert.equal(z[0].quelle.id, "whoop:schlaf:1");
  assert.deepEqual(z[0].weitereQuellen.map((q) => q.id), ["hc1"]);
  assert.equal(schlafZusammenfassung(z[0]).phasen.tief, 100 * MIN);
  // zweimal angewendet ändert nichts mehr
  assert.deepEqual(zusammenlegen(z, "schlaf"), z);
});

function trainingTag(mitCsv) {
  const von = lokal("2026-10-29", 18 * 60), bis = von + 45 * MIN;
  const hs = Array.from({ length: 46 }, (_, i) => ({ t: von + i * MIN, bpm: 150, quelle: HC("hr" + i) }));
  const hc = { von, bis, art: "hc_56", herzschlaege: hs, quelle: HC("ex1") };
  const csv = { von: von + MIN, bis, art: "laufen", name: "Laufen", herzschlaege: [], zonenProzent: [0, 0, 100, 0, 0], maxPuls: 160, quelle: { art: "csv", id: "whoop:training:1", datei: "Trainings.csv", zeile: 2 } };
  const schlaf = (tag, tz) => ({ von: lokal(tag, -90), bis: lokal(tag, 6 * 60), phasen: [], schlafMs: 400 * MIN, quelle: CSV("s" + tag, tz) });
  const daten = { schlaf: [schlaf("2026-10-29", 2), schlaf("2026-10-30", 3)], training: mitCsv ? [hc, csv] : [hc] };
  return tagAuswerten("2026-10-29", daten, { maxPuls: 180, ruhepuls: 55 });
}
test("Training aus Health Connect und CSV: ein Training, Belastung nicht doppelt, Art aus dem CSV, beide Quellen", () => {
  const nur = trainingTag(false), beide = trainingTag(true);
  assert.equal(nur.belastung.wertZehntel, 116);
  assert.equal(beide.belastung.wertZehntel, 116, "gleiche Belastung wie ohne das zweite Training");
  assert.equal(beide.belastung.trainings.length, 1);
  assert.equal(beide.belastung.trainings[0].art, "laufen");
  assert.ok(beide.belastung.trainings[0].quellen.some((q) => q.id === "whoop:training:1"), "CSV-Quelle bleibt sichtbar");
  assert.ok(beide.belastung.trainings[0].quellen.some((q) => q.id === "ex1"));
  const z = zusammenfuehren({ training: [{ von: 0, bis: 45 * MIN, art: "hc_56", herzschlaege: [{ t: 0, bpm: 1 }, { t: 1, bpm: 1 }], quelle: HC("a") }, { von: 0, bis: 45 * MIN, art: "laufen", zonenProzent: [1, 2, 3, 4, 5], herzschlaege: [], quelle: HC("b") }] });
  assert.equal(z.training.length, 1);
  assert.deepEqual(z.training[0].zonenProzent, [1, 2, 3, 4, 5]);
  assert.equal(z.training[0].herzschlaege.length, 2, "Pulswerte des führenden Satzes bleiben");
});

test("Punktwerte je Art aus einer Quelle (Health Connect, sonst CSV), nicht gemittelt", () => {
  const hrv = [{ t: 1, rmssdMs: 40, quelle: { art: "csv", id: "c" } }, { t: 2, rmssdMs: 60, quelle: HC("h") }];
  assert.deepEqual(eineQuelle(hrv).map((x) => x.rmssdMs), [60]);
  assert.deepEqual(eineQuelle([hrv[0]]).map((x) => x.rmssdMs), [40]);
  assert.deepEqual(eineQuelle([{ t: 1, quelle: { art: "csv", id: "x" } }, { t: 2, quelle: { art: "demo", id: "y" } }]).length, 1);
  const s = { von: lokal("2026-10-28", 23 * 60), bis: lokal("2026-10-29", 6 * 60), phasen: [], quelle: CSV("s", 2) };
  const tag = tagAuswerten("2026-10-29", { schlaf: [s], hrv: hrv.map((x) => ({ ...x, t: s.bis - 60 * MIN * x.t })) }, {});
  assert.equal(tag.messwerte.hrv.wert, 600, "60 ms (Health Connect) in Zehntel-ms, nicht (40 + 60) ÷ 2 = 50 ms");
});

test("Nachtwerte kurz nach dem Aufwachen zählen bis 3 Stunden danach; später nicht", () => {
  const s = { von: lokal("2026-10-28", 23 * 60), bis: lokal("2026-10-29", 6 * 60), phasen: [], quelle: CSV("s", 2) };
  const mit = (nachMin) => tagAuswerten("2026-10-29", { schlaf: [s], hrv: [{ t: s.bis + nachMin * MIN, rmssdMs: 55, quelle: HC("h") }] }, {}).messwerte.hrv;
  assert.equal(mit(120).wert, 550);
  assert.equal(mit(179).wert, 550);
  assert.equal(mit(181), null);
  const im = tagAuswerten("2026-10-29", { schlaf: [s], hrv: [{ t: s.von + 60 * MIN, rmssdMs: 50, quelle: HC("a") }, { t: s.bis + 60 * MIN, rmssdMs: 70, quelle: HC("b") }] }, {}).messwerte.hrv;
  assert.equal(im.wert, 500, "im Schlaffenster vorhanden → das Nachfenster wird nicht gemischt");
});

test("schlafZusammenfassung: Phasenzeitachse, Phasensummen (CSV), nur schlafMs, sonst Bettzeit", () => {
  const von = 0, bis = 480 * MIN;
  const achse = schlafZusammenfassung({ von, bis, phasen: [{ von: 0, bis: 100 * MIN, art: "leicht" }, { von: 100 * MIN, bis: 150 * MIN, art: "wach" }] });
  assert.deepEqual([achse.dauerMs, achse.phasen.wach], [100 * MIN, 50 * MIN]);
  const summen = schlafZusammenfassung({ von, bis, phasen: [], phasenSummen: { wachMs: 45 * MIN, leichtMs: 209 * MIN, tiefMs: 99 * MIN, remMs: 132 * MIN } });
  assert.deepEqual(summen.phasen, { wach: 45 * MIN, leicht: 209 * MIN, tief: 99 * MIN, rem: 132 * MIN });
  assert.equal(summen.dauerMs, 440 * MIN, "209 + 99 + 132 min, nicht die Bettzeit 480 min");
  assert.equal(summen.mitPhasen, true);
  assert.equal(summen.anteile.tief, Math.round((99 * 1000) / 485));
  const nurSumme = schlafZusammenfassung({ von, bis, phasen: [], schlafMs: 420 * MIN });
  assert.deepEqual([nurSumme.dauerMs, nurSumme.mitPhasen], [420 * MIN, false]);
  assert.equal(schlafZusammenfassung({ von, bis, phasen: [] }).dauerMs, 480 * MIN);
  assert.equal(schlafZusammenfassung({ von, bis, phasen: [], phasenSummen: { wachMs: null, leichtMs: null, tiefMs: null, remMs: null }, schlafMs: null }).dauerMs, 480 * MIN);
});

test("Belastung aus Zonenanteilen braucht keinen Höchstpuls; Pulswerte ohne Höchstpuls geben weiter null", () => {
  const von = lokal("2026-10-29", 18 * 60), t = { von, bis: von + 55 * MIN, art: "laufen", herzschlaege: [], zonenProzent: [4, 10, 38, 33, 15], quelle: CSV("t", 2) };
  const b = belastungTag([t], [], {});
  assert.equal(b.wertZehntel, 134, "siehe Rechnung in daten_ende_zu_ende.test.mjs");
  assert.equal(b.grenzen, null);
  assert.equal(b.geschaetzt, true);
  const mitPuls = { ...t, zonenProzent: null, herzschlaege: [{ t: von, bpm: 150 }, { t: von + MIN, bpm: 150 }] };
  assert.equal(belastungTag([mitPuls], [], {}), null);
  assert.equal(belastungTag([t], [{ t: von - 3600000, bpm: 90 }], {}), null, "Alltagspuls braucht die Grenzen");
});

test("Tagebuch: deutsche und englische WHOOP-Fragen auf den Katalog; Verneinungen und Unklares bleiben unzugeordnet", () => {
  const ja = { "Alkohol getrunken?": "alkohol", "Haben Sie Alkohol getrunken?": "alkohol", "Have any alcoholic drinks?": "alkohol", "Mit Bildschirmgerät im Bett?": "bildschirm_spaet",
    "Use a screen device in bed?": "bildschirm_spaet", "Read (non-screened device) while in bed?": "lesen", "Im Bett gelesen?": "lesen", "Kurz vor dem Schlafengehen gegessen?": "spaete_mahlzeit",
    "Eat close to bedtime?": "spaete_mahlzeit", "Meditiert?": "meditation", "Krank oder unwohl gefühlt?": "krank", "Feeling sick or ill?": "krank", "Eisbad genommen?": "kaltdusche",
    "Sauna?": "sauna", "Gestresst?": "stress", "Reise?": "reisen", "Koffein am Nachmittag?": "koffein_spaet", "Caffeine after 3pm?": "koffein_spaet" };
  for (const [frage, schluessel] of Object.entries(ja)) { assert.equal(katalogSchluessel(frage), schluessel, frage); assert.ok(KATALOG.some((k) => k.schluessel === schluessel), schluessel); }
  for (const frage of ["Koffein konsumiert?", "Consume caffeine?", "Kein Alkohol getrunken?", "No alcohol today?", "Pille genommen?", "Süßes gegessen?", "Spazieren gegangen?", ""]) assert.equal(katalogSchluessel(frage), null, frage);
  const e = { tag: "2026-10-29", quelle: { art: "csv", id: "x" }, eintraege: { alkohol_getrunken: false, im_bett_gelesen: true, bildschirm: true, koffein_konsumiert: true }, fragen: { alkohol_getrunken: "Alkohol getrunken?", im_bett_gelesen: "Im Bett gelesen?", koffein_konsumiert: "Koffein konsumiert?" } };
  const m = mitKatalog(e);
  assert.deepEqual(m.eintraege, { ...e.eintraege, alkohol: false, lesen: true });
  assert.equal(e.eintraege.alkohol, undefined, "Original bleibt unverändert");
  assert.equal(mitKatalog({ ...e, eintraege: { ...e.eintraege, alkohol: true } }).eintraege.alkohol, true, "vom Nutzer gesetzter Eintrag hat Vorrang");
  assert.equal(mitKatalog({ tag: "x", eintraege: {} }).eintraege.alkohol, undefined);
});

test("Trainingsart: Kürzel aus Health Connect und CSV, deutsche Namen; Unbekanntes zeigt den Namen aus dem Export", () => {
  setzeSprache("de");
  assert.equal(artName("laufen"), "Laufen");
  assert.equal(artName("radfahren"), "Radfahren");
  assert.equal(artName("heimtrainer"), "Radfahren");
  assert.equal(artName("krafttraining"), "Krafttraining");
  assert.equal(artName("gewichtheben", "Gewichtheben"), "Krafttraining");
  assert.equal(artName("wandern"), "Gehen");
  assert.equal(artName("yoga", "Yoga"), "Yoga");
  assert.equal(artName("hc_79"), "Training");
  assert.equal(artName("sonstiges", ""), "Training");
  setzeSprache("en");
  assert.equal(artName("radfahren"), "Cycling");
  setzeSprache("de");
});

test("Beleg: Quellenkarte nennt bei Health Connect die schreibende App; CSV zeigt Datei und Zeile", () => {
  setzeSprache("de");
  const html = belegHtml({ titel: "HRV", wert: "55 ms", formel: null, teile: [], quellen: [HC("hc1"), CSV("whoop:schlaf:1", 3)] }, "hrv:2026-10-29");
  assert.match(html, /Health Connect · com\.whoop\.android/);
  assert.match(html, /Schlaf\.csv #3/);
});

test("Beleg: die einfache Erklärung steht über dem Rechenweg", () => {
  setzeSprache("de");
  const f = { text: "Erholung = 50 + …", fundstelle: "Eigene Festlegung MF", erklaerung: "Die Erholung vergleicht die letzte Nacht mit deinem Normalbereich.", pruefen: false };
  const html = belegHtml({ titel: "Erholung", wert: "70 %", formel: f, teile: [], quellen: [] }, "erholung:x");
  assert.ok(html.indexOf("data-formel-erklaerung") > -1 && html.indexOf("data-formel-erklaerung") < html.indexOf('<div class="mf-formel">'));
  assert.match(html, /vergleicht die letzte Nacht/);
  const ohne = belegHtml({ titel: "x", wert: "1", formel: { ...f, erklaerung: "" }, teile: [], quellen: [] }, "q");
  assert.doesNotMatch(ohne, /data-formel-erklaerung/);
});

test("Daten-Ansicht nach Health Connect: Diagnose zu HRV, Herkunft und Nächten mit Phasen", () => {
  setzeSprache("de");
  const z = hcText({ n: 10, arten: { schlaf: 14 }, herkunft: { schlaf: { "com.whoop.android": 14 } }, schlafPhasen: { mit: 0, ohne: 14 } });
  assert.ok(z.details.includes("HRV: 0 Werte – WHOOP liefert sie nicht über Health Connect."), z.details.join("|"));
  assert.ok(z.details.includes("Schlaf: 14 Nächte, davon 0 mit Phasen."));
  assert.ok(z.details.some((d) => d.startsWith("Geschrieben von: schlaf: com.whoop.android (14)")));
  const mitHrv = hcText({ n: 1, arten: { hrv: 3 }, herkunft: { hrv: { "com.whoop.android": 3 } }, schlafPhasen: { mit: 2, ohne: 0 } });
  assert.ok(!mitHrv.details.some((d) => d.startsWith("HRV: 0")));
  assert.deepEqual(hcText({ n: 3, arten: { schlaf: 3 } }).details, []);
});
