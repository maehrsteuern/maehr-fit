// tests/node/shell_abgleich.test.mjs – Regeln des selbsttätigen Abgleichs (shell/abgleich.js) und die Abgleich-Zeile (shell/rahmen.js).
// Kernaussage: Nie zwei Abgleiche gleichzeitig, selbsttätig höchstens einer pro Minute (Knopf/Herunterziehen dürfen früher),
// „schon verbunden“ wird auch ohne Merkzeichen erkannt, und nach dem Abgleich springt die Ansicht vom letzten Tag auf heute.
import { test } from "node:test";
import assert from "node:assert/strict";
import { neuerAbgleicher, istVerbunden, zuletzt, zugAuswerten, tagWaehlen, ABGLEICH_ABSTAND_MS, ZUG_SCHWELLE_PX } from "../../shell/abgleich.js";
import { abgleichZeileHtml, zuletztText } from "../../shell/rahmen.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";
import * as heute from "../../shell/apps/heute.js";
import * as daten from "../../shell/apps/daten.js";
import { demo, berechne } from "../../shell/kern.js";
import { neuesRegister } from "../../shell/ui.js";

/** Abgleich, der erst auf Zuruf fertig wird (zum Prüfen von „läuft schon“). */
function haltbar() {
  const offen = [];
  let n = 0;
  return { offen, zaehler: () => n, ausfuehren: () => { n++; return new Promise((ok) => offen.push(ok)); } };
}

test("Abgleicher: gleichzeitige Anstöße teilen sich einen Lauf (Start + Rückkehr + Knopf)", async () => {
  let uhr = 1_000_000;
  const h = haltbar();
  const a = neuerAbgleicher({ ausfuehren: h.ausfuehren, jetzt: () => uhr });
  const p1 = a.anstossen({ grund: "start" });
  const p2 = a.anstossen({ grund: "sichtbar" });
  const p3 = a.anstossen({ erzwingen: true, grund: "knopf" });
  assert.equal(h.zaehler(), 1);
  assert.equal(a.laeuft(), true);
  assert.equal(p1, p2); assert.equal(p1, p3);
  h.offen[0]({ neu: 12 });
  assert.deepEqual(await Promise.all([p1, p2, p3]), [{ neu: 12 }, { neu: 12 }, { neu: 12 }]);
  assert.equal(a.laeuft(), false);
});

test("Abgleicher: höchstens einmal pro 60 s, außer erzwungen", async () => {
  // Rechenweg: Start bei t = 0; Rückkehr bei 59 999 ms → übersprungen; bei 60 000 ms → läuft (Abstand ≥ 60 000).
  let uhr = 0, n = 0;
  const a = neuerAbgleicher({ ausfuehren: async () => ({ neu: ++n }), jetzt: () => uhr });
  assert.equal(ABGLEICH_ABSTAND_MS, 60000);
  assert.deepEqual(await a.anstossen(), { neu: 1 });
  uhr = 59_999;
  assert.deepEqual(await a.anstossen(), { uebersprungen: "zu_frueh" });
  assert.deepEqual(await a.anstossen({ erzwingen: true }), { neu: 2 }); // Knopf: sofort; setzt die Minute neu (Start 59 999)
  uhr = 60_000;
  assert.deepEqual(await a.anstossen(), { uebersprungen: "zu_frueh" });
  uhr = 59_999 + 60_000;
  assert.deepEqual(await a.anstossen(), { neu: 3 });
  assert.equal(n, 3);
});

test("Abgleicher: ein Fehler gibt den Weg frei und erreicht den Aufrufer", async () => {
  let uhr = 0, mal = 0;
  const a = neuerAbgleicher({ ausfuehren: async () => { if (++mal === 1) throw new Error("Health Connect antwortet nicht"); return { neu: 0 }; }, jetzt: () => uhr });
  await assert.rejects(a.anstossen(), /antwortet nicht/);
  assert.equal(a.laeuft(), false);
  assert.deepEqual(await a.anstossen({ erzwingen: true }), { neu: 0 });
});

test("Schon verbunden: Merkzeichen, Stand der Datenschicht oder erteilte Rechte", () => {
  assert.equal(istVerbunden({}), false);
  assert.equal(istVerbunden({ flag: { zeitpunktMs: 1 } }), true);
  // Loris' Fall: vor dieser Fassung verbunden, kein Merkzeichen, aber Stand sync:healthconnect:… vorhanden
  assert.equal(istVerbunden({ standSchluessel: ["sync:healthconnect:SleepSession"] }), true);
  assert.equal(istVerbunden({ erteilt: ["SleepSession"] }), true);
  assert.equal(istVerbunden({ erteilt: [] }), false);
});

test("Zuletzt: gerade, Minuten, Stunden, Tage (abgerundet), nie", () => {
  const t0 = Date.UTC(2026, 10, 1, 6, 0);
  assert.deepEqual(zuletzt(null, t0), { einheit: "nie", n: 0 });
  assert.deepEqual(zuletzt(t0 - 59_999, t0), { einheit: "gerade", n: 0 });
  assert.deepEqual(zuletzt(t0 - 3 * 60_000 - 5000, t0), { einheit: "minuten", n: 3 });
  assert.deepEqual(zuletzt(t0 - 59 * 60_000, t0), { einheit: "minuten", n: 59 });
  assert.deepEqual(zuletzt(t0 - 60 * 60_000, t0), { einheit: "stunden", n: 1 });
  assert.deepEqual(zuletzt(t0 - 49 * 3600_000, t0), { einheit: "tage", n: 2 });
  assert.deepEqual(zuletzt(t0 + 5000, t0), { einheit: "gerade", n: 0 }); // Uhr des Geräts zurückgestellt
  setzeSprache("de");
  assert.equal(zuletztText(t0 - 3 * 60_000, t0), "vor 3 Minuten");
  assert.equal(zuletztText(t0 - 60_000, t0), "vor 1 Minute");
  setzeSprache("en");
  assert.equal(zuletztText(t0 - 2 * 3600_000, t0), "2 hours ago");
  setzeSprache("de");
});

test("Herunterziehen: nur ganz oben, ausgelöst ab mehr als 80 px, Ausschlag gedämpft", () => {
  assert.equal(ZUG_SCHWELLE_PX, 80);
  assert.deepEqual(zugAuswerten({ startY: 100, y: 180, scrollTop: 0 }), { abstand: 80, ausschlag: 40, bereit: false });
  assert.deepEqual(zugAuswerten({ startY: 100, y: 181, scrollTop: 0 }), { abstand: 81, ausschlag: 40.5, bereit: true });
  assert.equal(zugAuswerten({ startY: 100, y: 400, scrollTop: 0 }).ausschlag, 60); // höchstens 0,75 × 80
  assert.equal(zugAuswerten({ startY: 100, y: 300, scrollTop: 12 }).bereit, false); // Seite nicht oben
  assert.equal(zugAuswerten({ startY: 300, y: 100, scrollTop: 0 }).abstand, 0); // nach oben gewischt
});

test("Tag nach dem Abgleich: vom letzten Tag auf heute, selbst geblätterte Tage bleiben", () => {
  const basis = { heute: "2026-11-01", erster: "2026-10-27", letzter: "2026-10-30" };
  // Start: heute ohne Werte → letzter Tag mit Werten
  assert.deepEqual(tagWaehlen({ ...basis, hatHeute: false }), { tag: "2026-10-30", modus: "letzter" });
  // Abgleich bringt Werte für heute → springt auf heute
  assert.deepEqual(tagWaehlen({ ...basis, tag: "2026-10-30", modus: "letzter", letzter: "2026-11-01", hatHeute: true }), { tag: "2026-11-01", modus: "heute" });
  // Abgleich bringt nur den 31.10. → bleibt im Modus „letzter“, rückt aber nach
  assert.deepEqual(tagWaehlen({ ...basis, tag: "2026-10-30", modus: "letzter", letzter: "2026-10-31", hatHeute: false }), { tag: "2026-10-31", modus: "letzter" });
  // Selbst auf den 29.10. geblättert → bleibt, auch wenn heute Werte kommen
  assert.deepEqual(tagWaehlen({ ...basis, tag: "2026-10-29", modus: "hand", hatHeute: true }), { tag: "2026-10-29", modus: "hand" });
  // Selbst geblätterter Tag außerhalb des Bereichs (z. B. nach Löschen) → neu wählen
  assert.deepEqual(tagWaehlen({ ...basis, tag: "2026-10-01", modus: "hand", hatHeute: false }), { tag: "2026-10-30", modus: "letzter" });
  // Gar keine Werte → heute
  assert.deepEqual(tagWaehlen({ heute: "2026-11-01" }), { tag: "2026-11-01", modus: "heute" });
});

test("Abgleich-Zeile: nichts im Browser, „nicht verbunden · Verbinden“, „Zuletzt … · Aktualisieren“, läuft ohne Knopf", () => {
  setzeSprache("de");
  const jetzt = Date.UTC(2026, 10, 1, 6, 0);
  assert.equal(abgleichZeileHtml({ hcVerfuegbar: false, bekannt: true, verbunden: true }, jetzt), "");
  assert.equal(abgleichZeileHtml({ hcVerfuegbar: true, bekannt: false }, jetzt), "");
  const nicht = abgleichZeileHtml({ hcVerfuegbar: true, bekannt: true, verbunden: false }, jetzt);
  assert.match(nicht, /Health Connect nicht verbunden/);
  assert.match(nicht, /<a class="mf-abgleich-knopf" href="#\/daten">Verbinden<\/a>/);
  const ok = abgleichZeileHtml({ hcVerfuegbar: true, bekannt: true, verbunden: true, letzterMs: jetzt - 3 * 60_000 }, jetzt);
  assert.match(ok, /Zuletzt abgeglichen: vor 3 Minuten/);
  assert.match(ok, /<button type="button" class="mf-abgleich-knopf" data-aktion="abgleich">Aktualisieren<\/button>/);
  const laeuft = abgleichZeileHtml({ hcVerfuegbar: true, bekannt: true, verbunden: true, laeuft: true }, jetzt);
  assert.doesNotMatch(laeuft, /data-aktion/);
  assert.match(abgleichZeileHtml({ hcVerfuegbar: true, bekannt: true, verbunden: true, fehler: true }, jetzt), /nicht geklappt.*Erneut versuchen/s);
});

test("Heute: Überschrift ist der gewählte Tag, wenn er nicht heute ist (auch auf dem leeren Tag)", () => {
  setzeSprache("de");
  const D = demo({ heute: "2026-10-30" }), erg = berechne(D, D.einstellungen);
  const ctx = (tag, h) => ({ tag, heute: h, bild: erg.tage.get(tag) || null, erg, einst: {}, demo: false, route: { teile: ["heute"], abfrage: {} }, register: neuesRegister(), tagebuchEigen: {}, aktionen: {} });
  const titel = (html) => /<h1>([^<]*)<\/h1>/.exec(html)[1];
  assert.equal(titel(heute.ansicht(ctx("2026-10-30", "2026-10-30"))), "Heute");
  assert.equal(titel(heute.ansicht(ctx("2026-10-30", "2026-11-01"))), "Fr., 30. Okt.");
  assert.equal(titel(heute.ansicht(ctx("2026-10-31", "2026-11-01"))), "Sa., 31. Okt."); // leerer Tag
  assert.match(heute.ansicht(ctx("2026-10-30", "2026-11-01")), /Belastung</);
  assert.doesNotMatch(heute.ansicht(ctx("2026-10-30", "2026-11-01")), /Belastung heute/);
});

test("Daten: „Jetzt abgleichen“ neben Verbinden, Zeit des letzten Abgleichs und WHOOP-Hinweis", () => {
  setzeSprache("de");
  const c = { hcVerfuegbar: true, csvVerfuegbar: true, demo: false, route: { teile: ["daten"] }, register: neuesRegister(), abgleich: { verbunden: true, letzterMs: Date.now() - 5 * 60_000 } };
  const html = daten.ansicht(c);
  assert.match(html, /data-aktion="hc"[^>]*>Verbinden<\/button><button type="button" class="mf-knopf primaer" data-aktion="abgleich">Jetzt abgleichen/);
  assert.match(html, /data-abgleich-zeit>Zuletzt abgeglichen: vor 5 Minuten/);
  assert.match(html, /nachdem die WHOOP-App ihre Daten geholt hat/);
  const ohne = daten.ansicht({ ...c, abgleich: { verbunden: false } });
  assert.doesNotMatch(ohne, /data-aktion="abgleich"/);
  assert.match(ohne, /class="mf-knopf primaer" data-aktion="hc"/);
});
