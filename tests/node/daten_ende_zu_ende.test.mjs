// tests/node/daten_ende_zu_ende.test.mjs – deutscher WHOOP-Export von der Datei bis in jede Ansicht (Befund 31.10.2026:
// „Geschlafen 9:26 h“, aber Leicht/Tief/REM 0 min).
// Kernaussage: Zehn erfundene Nächte (tests/node/hilfe_whoop_de.mjs) laufen als CSV in vier Schreibweisen (Komma/ISO, Semikolon/Dezimalkomma,
// deutsche Daten mit IANA-Zone, Komma mit Dezimalkomma in Anführungszeichen), mit deutschen und englischen Kopfzeilen, älteste oder
// neueste Zeile zuerst durch importiereWhoop → speichereMessungen → leseMessungen → berechne → Ansichten. Jede Zahl der Ansichten
// ist ungleich 0/NaN, wo es Messwerte gibt, und passt zum Eingang.
//
// Von Hand nachgerechnet (Nacht zum 30.10.2026, Musterperson): Einschlafen 29.10. 22:50, Aufwachen 30.10. 06:55 (Zone UTC+01:00)
//   → im Bett 8 h 5 min = 485 min. Tief 99, REM 132, Wach 45 (aus der Datei) → Leicht = 485 − 99 − 132 − 45 = 209 min.
//   Geschlafen = Leicht + Tief + REM = 209 + 99 + 132 = 440 min = 7:20 h (nicht die Bettzeit 8:05 h).
//   Bedarf: 8 h (480 min) + 1 min je 1,0 Belastung-Zehntel-Punkt des Vortags (vom 29.10.: 134 Zehntel → 13,4 · 6 min … siehe Kern) + Schuld.
//   Geprüft wird hier nur: Schlafleistung = rund(440 · 100 ÷ Bedarf) und Bedarf ≥ 480 min.
//   Nacht zum 25.10. (Zeitumstellung 03:00): Einschlafen 24.10. 23:40 mit „UTC+02:00“, Aufwachen laut Zyklus +02:00 → 05:05 UTC → Tag 25.10.
//   Training 29.10. 18:15, 55 min, Zonen 4/10/38/33/15 %: 2,2 / 5,5 / 20,9 / 18,15 / 8,25 min; T = 2,2 + 11 + 62,7 + 72,6 + 41,25 = 189,75;
//   21 · ln(1 + 189,75/25) ÷ ln(29) = 21 · 2,1518 ÷ 3,3673 = 13,42 → 134 Zehntel.
process.env.TZ = "Europe/Berlin";
import { test } from "node:test";
import assert from "node:assert/strict";
import { baueDateien, NAECHTE, TRAININGS, nachtZeiten } from "./hilfe_whoop_de.mjs";
import { importiereWhoop } from "../../daten/csv_import.js";
import { speichereMessungen, leseMessungen, ARTEN } from "../../daten/ablage.js";
import { speicherMap } from "../../kern/speicher.js";
import { berechne, wirkung, trendPunkte, vergleich, VERGLEICH_FELDER } from "../../shell/kern.js";
import { neuesRegister } from "../../shell/ui.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";
import { belegHtml } from "../../shell/apps/beleg.js";
import * as heute from "../../shell/apps/heute.js";
import * as schlaf from "../../shell/apps/schlaf.js";
import * as belastung from "../../shell/apps/belastung.js";
import * as atem from "../../shell/apps/atem.js";
import * as trends from "../../shell/apps/trends.js";
import * as tagebuch from "../../shell/apps/tagebuch.js";
import * as vgl from "../../shell/apps/vergleich.js";

const MIN = 60000;
const tagText = (w) => `2026-10-${String(w).padStart(2, "0")}`;

async function lauf(opt) {
  const r = importiereWhoop(baueDateien(opt));
  const sp = speicherMap();
  await speichereMessungen(sp, r.paket);
  const eigen = {};
  for (const a of ARTEN) eigen[a] = await leseMessungen(sp, a);
  return { r, sp, eigen, erg: berechne(eigen, {}, {}) }; // bewusst ohne Einstellungen (kein Alter, kein Höchstpuls)
}
const ctx = (L, tag, teile, abfrage = {}) => ({ tag, heute: "2026-10-31", bild: L.erg.tage.get(tag) || null, erg: L.erg, einst: {}, demo: false, route: { teile, abfrage }, register: neuesRegister(), aktionen: {} });
const alleKnoepfe = (html) => (html.match(/data-q="([^"]+)"/g) || []).map((x) => x.slice(8, -1).replace(/&amp;/g, "&"));

for (const opt of [
  { variante: "A", kopf: "de", reihenfolge: "ab" }, { variante: "A", kopf: "de", reihenfolge: "auf" }, { variante: "B", kopf: "de", reihenfolge: "ab" },
  { variante: "C", kopf: "de", reihenfolge: "ab" }, { variante: "D", kopf: "de", reihenfolge: "auf" }, { variante: "A", kopf: "en", reihenfolge: "ab" },
]) {
  const name = `${opt.variante}/${opt.kopf}/${opt.reihenfolge}`;
  test(`Ende zu Ende (${name}): Import ohne Hinweise, Zählung, keine Doppelten aus den Zyklen`, async () => {
    const { r, eigen } = await lauf(opt);
    assert.deepEqual(r.hinweise, []);
    assert.deepEqual(r.dateien.map((d) => d.art), ["zyklen", "schlaf", "training", "tagebuch"]);
    const n = Object.fromEntries(ARTEN.map((a) => [a, r.paket[a].length]));
    // 10 Nächte + 1 Nickerchen NUR aus Schlaf.csv; die Zyklen-Datei legt keinen Schlaf an (sonst doppelt)
    assert.deepEqual(n, { herzschlag: 0, hrv: 10, ruhepuls: 10, atemfrequenz: 11, spo2: 10, hauttemp: 10, schlaf: 11, training: 5, tagebuch: 9, fremdwerte: 10 });
    assert.ok(r.paket.schlaf.every((s) => s.quelle.datei === "Schlaf.csv"));
    assert.equal(eigen.schlaf.length, 11);
    assert.equal(eigen.schlaf.filter((s) => s.nickerchen).length, 1);
  });

  test(`Ende zu Ende (${name}): Schlaf – Phasen, geschlafene Zeit, Tag der Zeitumstellung`, async () => {
    const L = await lauf(opt);
    for (const nacht of NAECHTE) {
      const { bis, imBett, leicht } = nachtZeiten(nacht);
      const b = L.erg.tage.get(tagText(nacht.w));
      assert.ok(b, `Tag ${nacht.w}`);
      assert.equal(b.schlafRoh.bis, bis, "Aufwachzeit");
      const p = b.schlaf.phasen;
      assert.deepEqual([p.leicht, p.tief, p.rem, p.wach], [leicht * MIN, nacht.tief * MIN, nacht.rem * MIN, nacht.wach * MIN], `Phasen ${nacht.w}.10.`);
      assert.equal(b.schlaf.dauerMs, (leicht + nacht.tief + nacht.rem) * MIN, "geschlafen = Leicht + Tief + REM, nicht die Bettzeit");
      assert.ok(b.schlaf.dauerMs < imBett * MIN);
      assert.ok(b.schlaf.wert > 0 && b.schlaf.wert <= 100);
      assert.ok(b.schlaf.bedarfMs >= 8 * 60 * MIN);
    }
    // von Hand: Nacht zum 30.10. (siehe Kopf)
    const b30 = L.erg.tage.get("2026-10-30");
    assert.equal(b30.schlaf.dauerMs, 440 * MIN);
    assert.equal(b30.schlaf.phasen.leicht, 209 * MIN);
    assert.equal(b30.schlaf.wert, Math.min(100, Math.round((440 * MIN * 100) / b30.schlaf.bedarfMs)));
    // Nickerchen (27.10. 14:00–14:40) ist kein Hauptschlaf des Tages und steht nicht als zweite Quelle der Nacht zum 27.10.
    assert.equal(L.erg.tage.get("2026-10-27").schlaf.dauerMs, 405 * MIN);
  });

  test(`Ende zu Ende (${name}): Heute – Erholung, HRV, Ruhepuls, Atem, Belastung`, async () => {
    setzeSprache("de");
    const L = await lauf(opt);
    for (const nacht of NAECHTE) {
      const b = L.erg.tage.get(tagText(nacht.w));
      assert.equal(b.hrv.wert, nacht.hrv, "HRV in ms");
      assert.equal(b.ruhepuls.wert, nacht.rhr);
      assert.equal(b.atem.wert, nacht.atem);
      assert.equal(b.fremd.erholung, nacht.erh);
      assert.equal(b.fremd.belastung, Math.round(nacht.belast * 10));
      assert.equal(b.fremd.schlafLeistung, nacht.leistung);
    }
    // Erholung braucht 4 Vortage (formeln.json basis.min_n): ab 26.10. gerechnet, nie NaN, immer 0..100
    for (const nacht of NAECHTE) {
      const e = L.erg.tage.get(tagText(nacht.w)).erholung;
      if (nacht.w >= 26) { assert.ok(Number.isFinite(e.wert) && e.wert >= 0 && e.wert <= 100, `Erholung ${nacht.w}.10.: ${e.wert}`); assert.ok(e.teile.length >= 3); }
    }
    // Belastung: Trainingstage > 0 (aus WHOOPs Zonenanteilen, ohne Höchstpuls-Einstellung), Ruhetage nicht gemessen
    for (const t of TRAININGS) {
      const b = L.erg.tage.get(tagText(t.d));
      assert.ok(b.belastung.wert > 0 && b.belastung.gemessen && b.belastung.geschaetzt, `Belastung ${t.d}.10.`);
      assert.equal(b.trainings.length, 1);
    }
    assert.equal(L.erg.tage.get("2026-10-29").belastung.wert, 134);
    assert.equal(L.erg.tage.get("2026-10-28").belastung.gemessen, false);
    // Ansicht Heute: eine Kernaussage, alle Zahlen belegt, kein NaN
    const c = ctx(L, "2026-10-30", ["heute"]);
    const html = heute.ansicht(c);
    assert.doesNotMatch(html, /NaN|undefined|\bnull\b/);
    for (const q of alleKnoepfe(html)) assert.ok(c.register.has(q), "Beleg " + q);
    assert.ok(html.includes("61") || html.includes("HRV"), "HRV-Kachel");
    // Ruhetag: Belastungskachel zeigt einen Strich statt 0; an einem anderen Tag als heute heißt sie nur „Belastung“ (Überschrift = Datum)
    const ruhe = heute.ansicht(ctx(L, "2026-10-28", ["heute"]));
    assert.match(ruhe, /<span class="mf-kachel-titel">Belastung<\/span><span class="mf-kachel-wert"><span class="zahl-text">–/);
  });

  test(`Ende zu Ende (${name}): Schlaf-, Belastungs-, Atem-, Trends-, Tagebuch-, Vergleichs-Ansicht und Belege`, async () => {
    for (const sprache of ["de", "en"]) {
      setzeSprache(sprache);
      const L = await lauf(opt);
      const ansichten = [
        ["schlaf", schlaf, "2026-10-30", ["schlaf"], {}], ["belastung", belastung, "2026-10-29", ["belastung"], {}], ["belastung-ruhe", belastung, "2026-10-28", ["belastung"], {}],
        ["atem", atem, "2026-10-30", ["atem"], {}], ["tagebuch", tagebuch, "2026-10-30", ["tagebuch"], {}], ["wirkung", tagebuch, "2026-10-30", ["tagebuch", "wirkung"], {}],
        ...["erholung", "hrv", "ruhepuls", "schlaf"].map((f) => [`trends-${f}`, trends, "2026-10-31", ["trends"], { feld: f, fenster: "7" }]),
        ...VERGLEICH_FELDER.map((f) => [`vergleich-${f}`, vgl, "2026-10-31", ["vergleich"], { feld: f }]),
      ];
      for (const [id, modul, tag, teile, abfrage] of ansichten) {
        const c = ctx(L, tag, teile, abfrage);
        const html = modul.ansicht(c);
        assert.equal((html.match(/class="mf-kern"/g) || []).length, 1, `${id}: genau eine Kernaussage`);
        assert.doesNotMatch(html, /NaN|undefined|\bnull\b/, id);
        for (const q of alleKnoepfe(html)) {
          assert.ok(c.register.has(q), `${id}: kein Beleg für ${q}`);
          const e = c.register.get(q);
          const bh = belegHtml(e, q);
          assert.doesNotMatch(bh, /NaN|undefined|\bnull\b/, `${id}/${q}`);
          assert.ok(e.titel && e.wert !== undefined && e.wert !== "", `${id}/${q}: Titel und Wert`);
        }
        if (id === "schlaf") {
          // „Messwerte dahinter“ der Schlafdauer: die Nacht selbst (Datei und Zeile), keine Zyklen-Datei, Phasen als Teile ungleich 0
          const e = c.register.get("schlaf-dauer:2026-10-30");
          assert.equal(e.quellen[0].datei, "Schlaf.csv");
          assert.ok(e.quellen.every((x) => x.datei !== "physiologische_zyklen.csv"));
          assert.deepEqual(e.teile.map((x) => x.wert).filter((w) => /^0 min$/.test(w)), [], "keine Phase mit 0 min");
          assert.equal(c.register.get("schlaf-phase:2026-10-30:tief").wert, sprache === "de" ? "1 h 39 min" : "1 h 39 min");
        }
      }
    }
  });

  test(`Ende zu Ende (${name}): Trends, Tagebuch-Wirkung und Vergleich liefern Werte`, async () => {
    const L = await lauf(opt);
    for (const f of ["erholung", "hrv", "ruhepuls", "schlaf"]) {
      const p = trendPunkte(L.erg, f, { fenster: 7, bis: "2026-10-31" });
      assert.ok(p.length >= 5, f);
      assert.ok(p.every((x) => Number.isFinite(x.wert) && x.wert > 0 || f === "erholung"), f);
    }
    assert.equal(trendPunkte(L.erg, "hrv", { fenster: 7, bis: "2026-10-31" }).at(-1).wert, 57.7);
    // Tagebuch: deutsche Fragen sind den Katalogschlüsseln zugeordnet → Wirkung hat Tage mit und ohne
    const tb = L.erg.tage.get("2026-10-29").tagebuch.eintraege;
    for (const k of ["alkohol", "bildschirm_spaet", "spaete_mahlzeit", "meditation", "krank", "lesen"]) assert.equal(typeof tb[k], "boolean", k);
    assert.equal(tb.alkohol, false);
    assert.equal(tb.krank, true);
    assert.equal(tb.koffein_spaet, undefined, "„Koffein konsumiert?“ ist nicht „Koffein am Nachmittag“ – nicht zugeordnet");
    assert.equal(typeof tb.koffein_konsumiert, "boolean", "eigener Schlüssel bleibt");
    const w = wirkung(L.erg, "alkohol");
    assert.ok(w.mit.n > 0 && w.ohne.n > 0, JSON.stringify([w.mit, w.ohne]));
    assert.equal(w.hinweis, "zu_wenig"); // erst ab 5 Tagen je Gruppe (formeln.json tagebuch.min_n)
    // Vergleich: alle drei Felder mit Tagen, die beide Werte haben
    for (const f of VERGLEICH_FELDER) {
      const v = vergleich(L.erg, f);
      assert.ok(v.n >= 3, `Vergleich ${f}: ${v.n}`);
      assert.ok(v.zeilen.every((z) => z.whoop !== undefined));
    }
  });
}

test("Zeitumstellung: Nacht vom 24. auf den 25.10. liegt im Speicher unter dem Aufwachtag 25.10.", async () => {
  const L = await lauf({ variante: "A", kopf: "de", reihenfolge: "ab" });
  const schluessel = await L.sp.liste("messung:schlaf:");
  assert.ok(schluessel.includes("messung:schlaf:2026-10-25"));
  const s = (await L.sp.lies("messung:schlaf:2026-10-25"))[0];
  assert.equal(s.zoneMin, 120, "Zone des Zyklus UTC+02:00");
  assert.equal(s.von, Date.UTC(2026, 9, 24, 21, 40));
});
