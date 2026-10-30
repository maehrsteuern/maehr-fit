// Tests: Health Connect → Brückenformat (daten/fixtures/healthconnect_*.json, erfunden) → Zuordnung → Speicher → Kern → Tagesbild → Beleg.
// Gehört zu docs/technik/datenfluss_hc.md (Tabelle HC-Art → Ansicht).
//
// Von Hand nachgerechnet (Mehrtage-Datensatz unten, Nacht zum 29.10.2026, alle Zeiten UTC, Ortszeit = +01:00):
//   Schlaf 22:00–05:30 = 450 min im Bett. Stufen: wach 22:00–22:20 (20) + 05:10–05:30 (20) = 40 min;
//   leicht 22:20–00:20 (120) + 03:30–05:10 (100) = 220 min; tief 00:20–02:00 = 100 min; REM 02:00–03:30 = 90 min.
//   Geschlafen = leicht + tief + rem = 220 + 100 + 90 = 410 min (Wachphasen zählen nicht).
//   HRV 60 + Nr (Nr 9 = 29.10.) = 69 ms; Ruhepuls 50 + (9 mod 3) = 50; Atemfrequenz 14,5 + 0,1 · (9 mod 4) = 14,6.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  zuordnen, schlafAus, synchronisieren, hatSchlafphasen, quellenAnzeige, RECORD_TYPEN, ART_ZU_PAKET,
} from "../../daten/healthconnect.js";
import { speichereMessungen, leseMessungen, leeresPaket } from "../../daten/ablage.js";
import { erzeugeDaten } from "../../daten/verbinden.js";
import { DATEN_ARTEN } from "../../shell/shell.js";
import { berechne, trendPunkte, vergleich } from "../../shell/kern.js";
import { belegeTag } from "../../shell/belege.js";
import { neuesRegister, beleg } from "../../shell/ui.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "daten", "fixtures");
const hcFixture = (name) => JSON.parse(fs.readFileSync(path.join(FIXTURES, `healthconnect_${name}.json`), "utf8"));

function mapSpeicher() {
  const m = new Map();
  return { m, lies: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null), schreib: async (k, w) => { m.set(k, structuredClone(w)); }, liste: async (p) => [...m.keys()].filter((k) => k.startsWith(p)) };
}

const zeitVon = (r) => { const z = r.time ?? r.startTime; return typeof z === "number" ? z : Date.parse(z); };
/** Brücke über eine Datensatz-Tabelle { Art: [Brückenformat] } (wie Health Connect: Datensätze, deren Beginn im Fenster liegt). */
const tabellenBruecke = (tabelle) => ({
  verfuegbar: async () => ({ verfuegbar: true, status: "verfuegbar" }),
  berechtigungen: async (arten) => ({ erteilt: arten }),
  lesen: async (art, von, bis) => (tabelle[art] || []).filter((r) => zeitVon(r) >= von && zeitVon(r) <= bis),
});

// ---------------------------------------------------------------------------------------------------
// 1. Jede Art bis zum Speicherformat
// ---------------------------------------------------------------------------------------------------

const WHOOP = "com.whoop.android";
const q = (id, typ) => ({ art: "healthconnect", id, datei: `HealthConnect/${typ}`, herkunft: WHOOP });

// Erwartung je Art: Speicherschlüssel und erster Datensatz (Fixture healthconnect_<Art>.json)
const ERWARTET = {
  HeartRate: { key: "messung:herzschlag:2026-10-29", erster: { t: 1793239200000, bpm: 52, quelle: q("hr-0001#1793239200000", "HeartRate"), zoneMin: 60 } },
  HeartRateVariabilityRmssd: { key: "messung:hrv:2026-10-27", erster: { t: 1793079600000, rmssdMs: 61.5, quelle: q("hrv-27", "HeartRateVariabilityRmssd"), zoneMin: 60 } },
  RestingHeartRate: { key: "messung:ruhepuls:2026-10-27", erster: { t: 1793079600000, bpm: 51, quelle: q("rhr-27", "RestingHeartRate"), zoneMin: 60 } },
  RespiratoryRate: { key: "messung:atemfrequenz:2026-10-28", erster: { t: 1793165700000, proMin: 14.6, quelle: q("rr-28", "RespiratoryRate"), zoneMin: 60 } },
  OxygenSaturation: { key: "messung:spo2:2026-10-28", erster: { t: 1793165700000, prozent: 96, quelle: q("spo2-28", "OxygenSaturation"), zoneMin: 60 } },
  SkinTemperature: { key: "messung:hauttemp:2026-10-29", erster: { t: 1793232000000, deltaC: 0.2, basisC: 33.6, quelle: q("skin-29#1793232000000", "SkinTemperature"), zoneMin: 60 } },
  SleepSession: { key: "messung:schlaf:2026-10-28" },
  ExerciseSession: { key: "messung:training:2026-10-29" },
};

test("Jede Health-Connect-Art landet unter dem erwarteten Speicherschlüssel, Feld für Feld, mit App-Herkunft und Zeitzone", async () => {
  assert.deepEqual(Object.keys(ERWARTET).sort(), [...RECORD_TYPEN].sort());
  for (const typ of RECORD_TYPEN) {
    const sp = mapSpeicher();
    await speichereMessungen(sp, zuordnen(typ, hcFixture(typ)));
    const liste = await sp.lies(ERWARTET[typ].key);
    assert.ok(Array.isArray(liste) && liste.length > 0, `${typ}: nichts unter ${ERWARTET[typ].key}`);
    // Alles, was gespeichert wurde, liegt in genau der Art-Familie des Schlüssels
    for (const k of sp.m.keys()) assert.ok(k.startsWith(`messung:${ART_ZU_PAKET[typ]}:`), `${typ}: ${k}`);
    for (const d of liste) {
      assert.equal(d.quelle.art, "healthconnect");
      assert.equal(d.quelle.herkunft, WHOOP, `${typ}: Herkunft (dataOrigin) geht verloren`);
      assert.equal(d.zoneMin, 60, `${typ}: Zeitzone`);
    }
    if (ERWARTET[typ].erster) assert.deepEqual(liste[0], ERWARTET[typ].erster, typ);
  }
});

test("Schlaf: Stufen mit Zeiten im Speicher, Dauer je Phase von Hand nachgerechnet", async () => {
  // Nacht 28.10. (Fixture sleep-28): wach 15 min, leicht 75, tief 75, REM 85, UNKNOWN (fällt weg), SLEEPING 160 (→ leicht, unbestimmt), im Bett wach 15
  const sp = mapSpeicher();
  await speichereMessungen(sp, zuordnen("SleepSession", hcFixture("SleepSession")));
  const [n] = await sp.lies("messung:schlaf:2026-10-28");
  const summe = (art) => n.phasen.filter((p) => p.art === art).reduce((s, p) => s + p.bis - p.von, 0) / 60000;
  assert.deepEqual([summe("wach"), summe("leicht"), summe("tief"), summe("rem")], [30, 235, 75, 85]);
  assert.equal(n.phasen.filter((p) => p.unbestimmt).length, 1);
  assert.equal(hatSchlafphasen(n), true);
  assert.equal(n.quelle.herkunft, WHOOP);
});

test("ExerciseSession: Art, Titel, Typnummer und Herkunft im Speicher", async () => {
  const sp = mapSpeicher();
  await speichereMessungen(sp, zuordnen("ExerciseSession", hcFixture("ExerciseSession")));
  const [lauf] = await sp.lies("messung:training:2026-10-29");
  assert.deepEqual([lauf.art, lauf.typNr, lauf.titel, lauf.von, lauf.bis], ["laufen", 56, "Abendlauf", 1793289600000, 1793292300000]);
  assert.equal(lauf.quelle.herkunft, WHOOP);
});

// ---------------------------------------------------------------------------------------------------
// 2. Schlaf ohne Stufen (Verdacht: WHOOP schreibt nur die Zusammenfassung) und Zeitzone des Aufwachtags
// ---------------------------------------------------------------------------------------------------

test("Schlaf ohne Stufen: Nacht bleibt erhalten, Phasen leer, Diagnose zählt sie als „ohne Phasen“", async () => {
  const roh = hcFixture("SleepSession_ohneStufen");
  const [n] = schlafAus(roh);
  assert.deepEqual(n.phasen, []);
  assert.equal(n.bis - n.von, 27000000); // 22:00–05:30 = 7 h 30 min
  assert.equal(hatSchlafphasen(n), false);
  const r = await synchronisieren({
    bruecke: tabellenBruecke({ SleepSession: [...hcFixture("SleepSession"), ...roh] }), speicher: mapSpeicher(),
    jetzt: Date.UTC(2026, 9, 30, 12, 0), arten: ["SleepSession"],
  });
  assert.deepEqual(r.schlafPhasen, { mit: 2, ohne: 1 });
  assert.deepEqual(r.herkunft, { schlaf: { [WHOOP]: 3 } });
});

test("Aufwachtag nach dem Versatz am Ende der Sitzung (Reise über die Zeitzone)", async () => {
  // Beginn 28.10. 20:00 UTC mit Versatz 0, Ende 28.10. 23:30 UTC mit Versatz +60 min = 29.10. 00:30 Ortszeit → Tag 29.10.
  const roh = [{ metadata: { id: "reise", dataOrigin: WHOOP }, startTime: 1793217600000, endTime: 1793230200000, startZoneOffsetSek: 0, endZoneOffsetSek: 3600 }];
  const sp = mapSpeicher();
  const r = await speichereMessungen(sp, { ...leeresPaket(), schlaf: schlafAus(roh) });
  assert.deepEqual(r.schluessel, ["messung:schlaf:2026-10-29"]);
  // Ohne Endversatz gilt der vom Beginn
  const ohneEnde = schlafAus([{ ...roh[0], endZoneOffsetSek: undefined }]);
  assert.equal(ohneEnde[0].zoneMin, 0);
});

test("Quelle/App-Zeile für den Beleg: Health Connect · <Paket>", () => {
  assert.equal(quellenAnzeige(q("x", "HeartRate")), "Health Connect · com.whoop.android");
  assert.equal(quellenAnzeige({ art: "healthconnect", id: "x" }), "Health Connect");
  assert.equal(quellenAnzeige({ art: "whoop_csv", id: "x", datei: "a.csv" }), "");
  assert.equal(quellenAnzeige(null), "");
});

// ---------------------------------------------------------------------------------------------------
// 3. Zehn Tage Health Connect → alle Ansichten (Tagesbild wie in der Shell)
// ---------------------------------------------------------------------------------------------------

/** Zehn Nächte (Aufwachtag 20.–29.10.2026) im Brückenformat; Werte erfunden. Zeiten UTC, Ortszeit +01:00. */
function zehnTage() {
  const t = { HeartRate: [], HeartRateVariabilityRmssd: [], RestingHeartRate: [], RespiratoryRate: [], OxygenSaturation: [], SkinTemperature: [], SleepSession: [], ExerciseSession: [] };
  const md = (id) => ({ id, dataOrigin: WHOOP });
  const min = 60000;
  for (let i = 0; i < 10; i++) {
    const tag = 20 + i;
    const u = (tagNr, h, m = 0) => Date.UTC(2026, 9, tagNr, h, m);
    const nachtVon = u(tag - 1, 22), nachtBis = u(tag, 5, 30);
    const stufe = (von, bis, stage) => ({ startTime: von, endTime: bis, stage });
    t.SleepSession.push({
      metadata: md(`s${i}`), startTime: nachtVon, endTime: nachtBis, startZoneOffsetSek: 3600, endZoneOffsetSek: 3600,
      stages: [
        stufe(nachtVon, nachtVon + 20 * min, 1), stufe(nachtVon + 20 * min, u(tag, 0, 20), 4), stufe(u(tag, 0, 20), u(tag, 2), 5),
        stufe(u(tag, 2), u(tag, 3, 30), 6), stufe(u(tag, 3, 30), u(tag, 5, 10), 4), stufe(u(tag, 5, 10), nachtBis, 1),
      ],
    });
    t.HeartRateVariabilityRmssd.push({ metadata: md(`hrv${i}`), time: u(tag, 4), zoneOffsetSek: 3600, heartRateVariabilityMillis: 60 + i });
    t.RestingHeartRate.push({ metadata: md(`rhr${i}`), time: u(tag, 4, 30), zoneOffsetSek: 3600, beatsPerMinute: 50 + (i % 3) });
    t.RespiratoryRate.push({ metadata: md(`rr${i}`), time: u(tag, 3), zoneOffsetSek: 3600, rate: 14.5 + 0.1 * (i % 4) });
    t.OxygenSaturation.push({ metadata: md(`o2${i}`), time: u(tag, 2), zoneOffsetSek: 3600, percentage: 96 + (i % 2) * 0.5 });
    t.SkinTemperature.push({ metadata: md(`st${i}`), startTime: nachtVon, endTime: nachtBis, startZoneOffsetSek: 3600, baselineCelsius: 33.6, measurementLocation: 1,
      deltas: [{ time: u(tag, 2), deltaCelsius: 0.1 * (i % 3) }] });
    // Alltagspuls 06:00–15:50 alle 10 min (Serie 1), Trainingspuls 16:00–16:45 alle 5 min (Serie 2)
    t.HeartRate.push({ metadata: md(`hra${i}`), startTime: u(tag, 6), endTime: u(tag, 15, 50), startZoneOffsetSek: 3600,
      samples: Array.from({ length: 60 }, (_, k) => ({ time: u(tag, 6) + k * 10 * min, beatsPerMinute: 65 + (k % 7) })) });
    t.HeartRate.push({ metadata: md(`hrt${i}`), startTime: u(tag, 16), endTime: u(tag, 16, 45), startZoneOffsetSek: 3600,
      samples: Array.from({ length: 10 }, (_, k) => ({ time: u(tag, 16) + k * 5 * min, beatsPerMinute: 135 + 3 * k })) });
    t.ExerciseSession.push({ metadata: md(`ex${i}`), startTime: u(tag, 16), endTime: u(tag, 16, 45), startZoneOffsetSek: 3600, exerciseType: 56, title: "Lauf" });
  }
  return t;
}

async function wieShell() {
  const speicher = mapSpeicher();
  const daten = erzeugeDaten({ speicher, bruecke: tabellenBruecke(zehnTage()), jetzt: () => Date.UTC(2026, 9, 30, 12, 0) });
  const r = await daten.healthConnect.verbinden();
  const eigen = {};
  for (const art of DATEN_ARTEN) eigen[art] = await leseMessungen(speicher, art);
  return { r, speicher, eigen, erg: berechne(eigen, { alter: 38 }) };
}

test("Zehn Tage: Zählung je Art, Herkunft und Schlafstufen im Abgleich-Ergebnis", async () => {
  const { r } = await wieShell();
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.zaehlung, { herzschlag: 700, hrv: 10, ruhepuls: 10, atemfrequenz: 10, spo2: 10, hauttemp: 10, schlaf: 10, training: 10 });
  assert.deepEqual(r.zeitraum, { von: "2026-10-20", bis: "2026-10-29" });
  assert.deepEqual(r.herkunft.hrv, { [WHOOP]: 10 });
  assert.deepEqual(r.herkunft.herzschlag, { [WHOOP]: 700 });
  assert.deepEqual(r.schlafPhasen, { mit: 10, ohne: 0 });
});

test("Heute/Schlaf/Belastung/Atem-Werte: Tagesbild 29.10. aus Health-Connect-Daten", async () => {
  const { erg } = await wieShell();
  const b = erg.tage.get("2026-10-29");
  // Heute: Erholung gerechnet, alle Nachtwerte mit Messwert (nicht ausgelassen)
  assert.ok(Number.isFinite(b.erholung.wert));
  assert.deepEqual(b.erholung.ausgelassen, []);
  const namen = b.erholung.teile.map((x) => x.name);
  for (const n of ["hrv", "ruhepuls", "atem", "schlaf"]) assert.ok(namen.includes(n), `${n} fehlt in ${namen}`);
  assert.equal(b.hrv.wert, 69);
  assert.equal(b.ruhepuls.wert, 50);
  assert.equal(b.atem.wert, 14.6);
  // Schlaf: Phasen in Millisekunden, geschlafen = leicht + tief + rem
  const min = 60000;
  assert.deepEqual(b.schlaf.phasen, { wach: 40 * min, leicht: 220 * min, tief: 100 * min, rem: 90 * min });
  assert.equal(b.schlaf.dauerMs, 410 * min);
  assert.equal(b.schlafRoh.phasen.length, 6); // Hypnogramm
  // Belastung: Training erkannt, aus Pulswerten (nicht geschätzt)
  assert.equal(b.trainings.length, 1);
  assert.equal(b.trainings[0].roh.art, "laufen");
  assert.equal(b.trainings[0].roh.herzschlaege.length, 10);
  assert.ok(b.belastung.wert > 0);
  assert.equal(b.belastung.geschaetzt, false);
  // Trends: HRV-Reihe endet mit dem Messwert
  const hrv = trendPunkte(erg, "hrv", { fenster: 7 });
  assert.equal(hrv.length, 7);
  assert.equal(hrv.at(-1).wert, 69);
  // Vergleich mit WHOOP: Health Connect liefert keine WHOOP-Scores → keine Paare, kein Fehler
  assert.equal(vergleich(erg, "erholung").n, 0);
});

test("Beleg: HRV-Quelle nennt Health Connect und die schreibende App", async () => {
  setzeSprache("de");
  const { erg } = await wieShell();
  const bild = erg.tage.get("2026-10-29");
  const reg = neuesRegister();
  belegeTag(beleg(reg), bild);
  for (const schluessel of ["hrv:2026-10-29", "ruhepuls:2026-10-29", "schlaf-dauer:2026-10-29"]) {
    const quellen = reg.get(schluessel).quellen;
    assert.ok(quellen.length > 0, schluessel);
    for (const x of quellen) {
      assert.equal(x.art, "healthconnect", schluessel);
      assert.equal(x.herkunft, WHOOP, `${schluessel}: Herkunft geht auf dem Weg durch den Kern verloren`);
      assert.equal(quellenAnzeige(x), "Health Connect · com.whoop.android");
    }
  }
});
