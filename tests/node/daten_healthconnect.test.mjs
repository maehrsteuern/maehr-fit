// Tests: Health Connect → normierte Messwerte, inkrementeller Abgleich, Ablage, Brücke.
// Fixtures: daten/fixtures/healthconnect_*.json (erfunden, Musterperson, Zeitzone +01:00).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  zuordnen, schlafAus, trainingAus, herzschlaegeAus, synchronisieren, verfuegbar, berechtigungen,
  RECORD_TYPEN, VORGABEN, SYNC_PRAEFIX, TAG_MS, ersterZeitraumMs, erteilteRechte,
} from "../../daten/healthconnect.js";
import { speichereMessungen, leseMessungen, leeresPaket } from "../../daten/ablage.js";
import { erzeugeDaten, installiere } from "../../daten/verbinden.js";
import { installiereBruecke } from "../../daten/bruecke_capacitor.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --- Test-Hilfen ---
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "daten", "fixtures");

function fixture(name) {
  return fs.readFileSync(path.join(FIXTURES, name), "utf8");
}

function hcFixture(typ) {
  return JSON.parse(fixture(`healthconnect_${typ}.json`));
}

/** Speicher nach kern/speicher.js-Schnittstelle, im Arbeitsspeicher. */
function mapSpeicher() {
  const m = new Map();
  return {
    m,
    lies: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null),
    schreib: async (k, w) => { m.set(k, structuredClone(w)); },
    liste: async (p) => [...m.keys()].filter((k) => k.startsWith(p)),
  };
}


// 2026-10-29 17:00 +01:00 = 16:00 UTC. Rechenweg: Date.UTC(2026, 9, 29, 16, 0) = 1793289600000.
const LAUF_VON = Date.UTC(2026, 9, 29, 16, 0);
const LAUF_BIS = Date.UTC(2026, 9, 29, 16, 45);
const JETZT = Date.UTC(2026, 9, 30, 12, 0);

/** Brücke mit Fixtures: liefert je Art die Datensätze, deren Zeit im Fenster liegt (wie Health Connect). */
function fixtureBruecke({ fehlend = [] } = {}) {
  const aufrufe = [];
  return {
    aufrufe,
    verfuegbar: async () => ({ verfuegbar: true, status: "verfuegbar" }),
    berechtigungen: async (arten) => ({ erteilt: arten.filter((a) => !fehlend.includes(a)) }),
    lesen: async (art, von, bis) => {
      aufrufe.push({ art, von, bis });
      if (fehlend.includes(art)) throw new Error(`SecurityException: keine Leseberechtigung für ${art}`);
      const zeit = (r) => {
        const z = r.time ?? r.startTime;
        return typeof z === "number" ? z : Date.parse(z);
      };
      return hcFixture(art).filter((r) => zeit(r) >= von && zeit(r) <= bis);
    },
  };
}

test("Herzschlag: jede Einzelmessung wird ein Datensatz mit eigener quelle.id", () => {
  const p = zuordnen("HeartRate", hcFixture("HeartRate"));
  // 3 Nachtmessungen + 11 Messungen am Abend = 14
  assert.equal(p.herzschlag.length, 14);
  const h = p.herzschlag[0];
  assert.equal(h.bpm, 52);
  assert.equal(h.t, Date.UTC(2026, 9, 29, 2, 0)); // 03:00 +01:00
  assert.equal(h.zoneMin, 60);
  assert.deepEqual(h.quelle, {
    art: "healthconnect", id: `hr-0001#${h.t}`, datei: "HealthConnect/HeartRate", herkunft: "com.whoop.android",
  });
  assert.equal(new Set(p.herzschlag.map((x) => x.quelle.id)).size, 14);
});

test("Punktwerte: HRV, Ruhepuls, Atemfrequenz, SpO2 (Zeit als Zahl oder ISO-Text)", () => {
  const hrv = zuordnen("HeartRateVariabilityRmssd", hcFixture("HeartRateVariabilityRmssd")).hrv;
  assert.deepEqual(hrv.map((x) => x.rmssdMs), [61.5, 48.0, 55.2]);
  // "2026-10-29T05:50:00Z" → Date.UTC(2026, 9, 29, 5, 50)
  assert.equal(hrv[2].t, Date.UTC(2026, 9, 29, 5, 50));
  assert.equal(hrv[2].quelle.datei, "HealthConnect/HeartRateVariabilityRmssd");
  assert.deepEqual(zuordnen("RestingHeartRate", hcFixture("RestingHeartRate")).ruhepuls.map((x) => x.bpm), [51, 54, 52]);
  assert.deepEqual(zuordnen("RespiratoryRate", hcFixture("RespiratoryRate")).atemfrequenz.map((x) => x.proMin), [14.6, 14.9]);
  assert.deepEqual(zuordnen("OxygenSaturation", hcFixture("OxygenSaturation")).spo2.map((x) => x.prozent), [96, 97.5]);
});

test("Hauttemperatur: je Abweichung ein Datensatz, Basis des Geräts bleibt erhalten", () => {
  const ht = zuordnen("SkinTemperature", hcFixture("SkinTemperature")).hauttemp;
  assert.deepEqual(ht.map((x) => x.deltaC), [0.2, -0.1, 0.35]);
  assert.equal(ht[0].basisC, 33.6);
  assert.match(ht[0].quelle.id, /^skin-29#\d+$/);
});

test("Schlaf: Stufen AWAKE/LIGHT/DEEP/REM/… → wach/leicht/tief/rem, sortiert, UNKNOWN fällt weg", () => {
  const [n1, n2] = schlafAus(hcFixture("SleepSession"));
  // Nacht 1: 7 Stufen, davon 1 UNKNOWN → 6 Phasen
  assert.deepEqual(n1.phasen.map((p) => p.art), ["wach", "leicht", "tief", "rem", "leicht", "wach"]);
  assert.equal(n1.phasen[4].unbestimmt, true); // SLEEPING (2) → leicht, markiert
  assert.equal(n1.phasen[5].art, "wach"); // AWAKE_IN_BED (7)
  assert.equal(n1.titel, "Schlaf");
  // Nacht 2: Stufen als Text und unsortiert geliefert → sortiert
  assert.deepEqual(n2.phasen.map((p) => p.art), ["leicht", "tief", "rem", "leicht", "wach"]);
  for (let i = 1; i < n2.phasen.length; i++) assert.ok(n2.phasen[i].von >= n2.phasen[i - 1].von);
  // Dauer Nacht 2: 23:10 → 06:50 = 7 h 40 min = 27 600 000 ms
  assert.equal(n2.bis - n2.von, 27600000);
});

test("Schlaf-Grenzfälle: ohne Stufen, Ende vor Beginn", () => {
  const aus = schlafAus([
    { metadata: { id: "a" }, startTime: 1000, endTime: 5000 },
    { metadata: { id: "b" }, startTime: 5000, endTime: 1000 },
  ]);
  assert.equal(aus.length, 1);
  assert.deepEqual(aus[0].phasen, []);
});

test("Training: Herzschläge im Zeitraum werden angehängt, unbekannte Art bleibt erkennbar", () => {
  const hs = herzschlaegeAus(hcFixture("HeartRate"));
  const [lauf, rest] = trainingAus(hcFixture("ExerciseSession"), hs);
  assert.equal(lauf.von, LAUF_VON);
  assert.equal(lauf.bis, LAUF_BIS);
  assert.equal(lauf.art, "laufen");
  assert.equal(lauf.titel, "Abendlauf");
  // 17:00 bis 17:45 einschließlich, alle 5 min = 10 Messungen; 17:50 liegt außerhalb
  assert.equal(lauf.herzschlaege.length, 10);
  assert.equal(lauf.herzschlaege.at(-1).bpm, 112);
  assert.equal(rest.art, "hc_999");
  assert.deepEqual(rest.herzschlaege, []);
});

test("Unbekannte Datenart wird abgelehnt", () => {
  assert.throws(() => zuordnen("Steps", []), /Unbekannte/);
});

test("Ablage: Schlüssel messung:<art>:<tag>, Schlaf zählt zum Aufwachtag", async () => {
  const sp = mapSpeicher();
  const paket = { ...leeresPaket(), schlaf: schlafAus(hcFixture("SleepSession")) };
  const r = await speichereMessungen(sp, paket);
  // Nacht 27./28.10. → Tag 2026-10-28, Nacht 28./29.10. → 2026-10-29
  assert.deepEqual(r.schluessel, ["messung:schlaf:2026-10-28", "messung:schlaf:2026-10-29"]);
  assert.equal(r.neu, 2);
  const nochmal = await speichereMessungen(sp, paket);
  assert.deepEqual([nochmal.neu, nochmal.ersetzt], [0, 2]);
  assert.equal((await leseMessungen(sp, "schlaf")).length, 2);
  assert.equal((await leseMessungen(sp, "schlaf", "2026-10-29", "2026-10-29")).length, 1);
});

test("Ablage: Tag nach Zeitzone des Datensatzes, nicht des Testrechners", async () => {
  const sp = mapSpeicher();
  // 2026-10-28 23:30 UTC ist in +01:00 schon der 29.10. (00:30), in −05:00 noch der 28.10.
  const t = Date.UTC(2026, 9, 28, 23, 30);
  const paket = {
    ...leeresPaket(),
    ruhepuls: [
      { t, bpm: 50, zoneMin: 60, quelle: { art: "hand", id: "a" } },
      { t, bpm: 51, zoneMin: -300, quelle: { art: "hand", id: "b" } },
    ],
  };
  const r = await speichereMessungen(sp, paket);
  assert.deepEqual(r.schluessel, ["messung:ruhepuls:2026-10-28", "messung:ruhepuls:2026-10-29"]);
});

// Erster Abgleich: rueckblickTage (90) × 86 400 000 ms = 7 776 000 000 ms vor jetzt
const ERSTER = 90 * 24 * 3600 * 1000;

test("Abgleich: erster Lauf 90 Tage zurück, zweiter ab letztem Stand minus Überlappung, keine Doppelten", async () => {
  const sp = mapSpeicher();
  const b = fixtureBruecke();
  const r1 = await synchronisieren({ bruecke: b, speicher: sp, jetzt: JETZT });
  assert.equal(b.aufrufe[0].art, "HeartRate");
  assert.equal(ersterZeitraumMs(), ERSTER);
  assert.equal(b.aufrufe[0].von, JETZT - ERSTER);
  // 14 Herzschläge + 3 HRV + 3 Ruhepuls + 2 Atem + 2 SpO2 + 3 Hauttemp + 2 Schlaf + 2 Training = 31
  assert.equal(r1.neu, 31);
  assert.equal(r1.ersetzt, 0);
  const lauf = (await sp.lies("messung:training:2026-10-29"))[0];
  assert.equal(lauf.herzschlaege.length, 10);
  assert.deepEqual(await sp.lies(SYNC_PRAEFIX + "SleepSession"), { bisMs: JETZT, zeitpunktMs: JETZT, anzahl: 2 });

  const spaeter = JETZT + 3600 * 1000;
  b.aufrufe.length = 0;
  const r2 = await synchronisieren({ bruecke: b, speicher: sp, jetzt: spaeter });
  assert.equal(b.aufrufe[0].von, JETZT - VORGABEN.ueberlappungMs);
  assert.equal(r2.neu, 0); // alles schon da (gleiche quelle.id)
  assert.ok(r2.ersetzt > 0);
});

test("Abgleich: fehlendes Recht für eine Art stoppt die anderen nicht", async () => {
  const sp = mapSpeicher();
  const b = fixtureBruecke({ fehlend: ["HeartRate"] });
  const r = await synchronisieren({ bruecke: b, speicher: sp, jetzt: JETZT });
  assert.match(r.arten.HeartRate.fehler, /Leseberechtigung/);
  assert.equal(r.arten.SleepSession.neu, 2);
  // Training ohne Herzschlag-Recht: ohne Kurve, aber vorhanden
  const lauf = (await sp.lies("messung:training:2026-10-29"))[0];
  assert.deepEqual(lauf.herzschlaege, []);
  // Kein Stand für die fehlgeschlagene Art → nächster Lauf versucht wieder 90 Tage
  assert.equal(await sp.lies(SYNC_PRAEFIX + "HeartRate"), null);
});

test("Verfügbarkeit und Rechte ohne Android-Brücke", async () => {
  assert.deepEqual(await verfuegbar(null), { verfuegbar: false, grund: "kein_android" });
  assert.deepEqual(await berechtigungen(null, ["HeartRate"]), { erteilt: [], fehlend: ["HeartRate"] });
  const b = fixtureBruecke({ fehlend: ["SkinTemperature"] });
  const r = await berechtigungen(b, RECORD_TYPEN);
  assert.deepEqual(r.fehlend, ["SkinTemperature"]);
  await assert.rejects(synchronisieren({ bruecke: null, speicher: mapSpeicher() }), /Android/);
  // Alle Rechte verweigert → verbinden meldet es verständlich
  const keine = fixtureBruecke({ fehlend: RECORD_TYPEN });
  const d = erzeugeDaten({ speicher: mapSpeicher(), bruecke: keine, jetzt: () => JETZT });
  await assert.rejects(d.healthConnect.verbinden(), /keine Leseberechtigung/);
});

test("MF.daten: installieren, abgleichen, exportieren, löschen", async () => {
  const sp = mapSpeicher();
  const fenster = { MF: { native: {} } };
  const daten = installiere(fenster, { speicher: sp, jetzt: () => JETZT });
  assert.equal(fenster.MF.daten, daten);
  assert.equal((await daten.healthConnect.verfuegbar()).verfuegbar, false);
  await assert.rejects(daten.healthConnect.verbinden(), /Android/);
  fenster.MF.native.healthConnect = fixtureBruecke(); // Brücke kommt später (Capacitor lädt nach)
  assert.equal((await daten.healthConnect.verfuegbar()).verfuegbar, true);
  // verbinden = Rechte anfragen + abgleichen; die neuen Datensätze liegen als Messpaket oben auf (für die Shell)
  const r = await daten.healthConnect.verbinden();
  assert.deepEqual(r.fehlend, []);
  assert.equal(r.neu, 31);
  assert.equal(r.herzschlag.length, 14);
  assert.equal(r.schlaf.length, 2);
  assert.equal(r.training[0].herzschlaege.length + r.training[1].herzschlaege.length, 10);
  // Zweiter Abgleich: nichts Neues → leere Arrays, die Shell verdoppelt nichts
  const r2 = await daten.healthConnect.synchronisieren();
  assert.equal(r2.neu, 0);
  assert.equal(r2.herzschlag.length, 0);
  const exp = await daten.exportieren();
  assert.equal(exp.format, "maehr-fit-export");
  assert.ok(Object.keys(exp.eintraege).some((k) => k.startsWith("messung:hrv:")));
  assert.ok(Object.keys(exp.eintraege).some((k) => k.startsWith("sync:healthconnect:")));
  const weg = await daten.loeschen();
  assert.equal(weg.geloescht, Object.keys(exp.eintraege).length);
  assert.deepEqual((await daten.exportieren()).eintraege, {});
});

test("erzeugeDaten verlangt einen Speicher", () => {
  assert.throws(() => erzeugeDaten({}), /speicher/);
});

test("Capacitor-Brücke: Plugin-Aufrufe werden auf MF.native.healthConnect abgebildet", async () => {
  const aufrufe = [];
  const plugin = {
    verfuegbar: async () => ({ verfuegbar: true, status: "verfuegbar" }),
    berechtigungen: async (o) => { aufrufe.push(o); return { erteilt: o.arten }; },
    lesen: async (o) => { aufrufe.push(o); return { datensaetze: [{ x: 1 }] }; },
    einstellungen: async () => ({}),
  };
  const fenster = { Capacitor: { isNativePlatform: () => true, Plugins: { HealthConnect: plugin } } };
  const b = installiereBruecke(fenster);
  assert.equal(fenster.MF.native.healthConnect, b);
  assert.deepEqual(await b.lesen("HeartRate", 1, 2), [{ x: 1 }]);
  await b.berechtigungen(["HeartRate"]);
  assert.deepEqual(aufrufe, [{ art: "HeartRate", vonMs: 1, bisMs: 2 }, { arten: ["HeartRate"] }]);
  assert.equal(installiereBruecke({}), null);
  assert.equal(installiereBruecke({ Capacitor: { isNativePlatform: () => false } }), null);
});

test("Abgleich: liest in Tagesfenstern; dauerhaft gescheiterte Fenster werden Lücke, Stand bleibt vor der Lücke", async () => {
  const sp = mapSpeicher();
  const b = fixtureBruecke();
  const tag = VORGABEN.fensterMs;
  const beginn = JETZT - ERSTER;
  // ab dem dritten Tag liefert Health Connect nur noch Fehler (wie die Zeitüberschreitung vom 30.10.2026)
  const wackelig = {
    ...b,
    lesen: async (art, von, bis) => {
      if (art === "RestingHeartRate" && von >= beginn + 2 * tag) throw new Error("Verbindung zu Health Connect unterbrochen");
      return b.lesen(art, von, bis);
    },
  };
  const r = await synchronisieren({ bruecke: wackelig, speicher: sp, jetzt: JETZT, arten: ["RestingHeartRate"], vorgaben: { warte: async () => {} } });
  // Fenster 1 und 2 gelungen, Fenster 3 gescheitert (halbiert, wiederholt, Lücke) → Stand = Beginn + 2 Tage
  assert.equal(r.arten.RestingHeartRate.bisMs, beginn + 2 * tag);
  assert.match(r.arten.RestingHeartRate.fehler, /unterbrochen/);
  assert.match(r.arten.RestingHeartRate.fehler, /3 Lücken hintereinander/);
  assert.equal((await sp.lies(SYNC_PRAEFIX + "RestingHeartRate")).bisMs, beginn + 2 * tag);
  // nichts verschluckt: die Fehler stehen auch oben im Ergebnis
  assert.equal(r.fehler.length, 1);
  assert.match(r.fehler[0], /^RestingHeartRate: .*unterbrochen/);
  assert.ok(r.luecken.length >= 3); // drei Tagesfenster, je in 3-Stunden-Stücke zerlegt
  assert.equal(r.luecken[0].vonMs, beginn + 2 * tag);
  // 90 Tage = 90 Fenster je Art beim ersten Lauf; Tage ohne Werte (hier 88 von 90) beenden die Schleife nicht
  b.aufrufe.length = 0;
  const leer = await synchronisieren({ bruecke: b, speicher: mapSpeicher(), jetzt: JETZT, arten: ["OxygenSaturation"] });
  assert.equal(b.aufrufe.length, 90);
  assert.equal(b.aufrufe.at(-1).bis, JETZT);
  assert.equal(leer.arten.OxygenSaturation.bisMs, JETZT);
  assert.equal(leer.arten.OxygenSaturation.neu, 2);
  // Vorgabe überschreibbar: 7 Tage zurück = 7 Fenster
  b.aufrufe.length = 0;
  await synchronisieren({ bruecke: b, speicher: mapSpeicher(), jetzt: JETZT, arten: ["OxygenSaturation"], vorgaben: { rueckblickTage: 7 } });
  assert.equal(b.aufrufe.length, 7);
  assert.equal(b.aufrufe[0].von, JETZT - 7 * TAG_MS);
});

test("Abgleich: zweiter Lauf holt neue Datensätze bis jetzt, die Überlappung verdoppelt nichts", async () => {
  // Brücke mit veränderlichem Bestand: erst die Fixture, dann schreibt „WHOOP“ zwei neue Ruhepuls-Werte nach.
  const bestand = [...hcFixture("RestingHeartRate")];
  const aufrufe = [];
  const b = {
    verfuegbar: async () => ({ verfuegbar: true }),
    berechtigungen: async (arten) => ({ erteilt: arten }),
    lesen: async (art, von, bis) => {
      aufrufe.push({ von, bis });
      const zeit = (r) => (typeof r.time === "number" ? r.time : Date.parse(r.time));
      return bestand.filter((r) => zeit(r) >= von && zeit(r) <= bis);
    },
  };
  const sp = mapSpeicher();
  const r1 = await synchronisieren({ bruecke: b, speicher: sp, jetzt: JETZT, arten: ["RestingHeartRate"] });
  assert.equal(r1.neu, 3); // drei Ruhepuls-Werte der Fixture

  // Zwei Tage später: ein Wert im Überlappungsfenster (verspätet geschrieben, 31.10. 06:00 UTC) und einer von heute früh.
  // Rechenweg: JETZT = 30.10. 12:00 UTC; zweiter Lauf um 01.11. 12:00 UTC; Beginn = JETZT − 48 h = 28.10. 12:00 UTC.
  const spaeter = JETZT + 2 * TAG_MS;
  bestand.push(
    { metadata: { id: "rhr-neu-1", dataOrigin: "com.whoop.android" }, time: Date.UTC(2026, 9, 31, 6, 0), zoneOffsetSek: 3600, beatsPerMinute: 50 },
    { metadata: { id: "rhr-neu-2", dataOrigin: "com.whoop.android" }, time: Date.UTC(2026, 10, 1, 6, 0), zoneOffsetSek: 3600, beatsPerMinute: 49 },
  );
  aufrufe.length = 0;
  const r2 = await synchronisieren({ bruecke: b, speicher: sp, jetzt: spaeter, arten: ["RestingHeartRate"] });
  assert.equal(aufrufe[0].von, JETZT - VORGABEN.ueberlappungMs);
  assert.equal(aufrufe.at(-1).bis, spaeter); // liest bis jetzt
  assert.equal(r2.neu, 2);
  assert.deepEqual(r2.paket.ruhepuls.map((x) => x.bpm), [50, 49]);
  // Werte der Fixture, die im Überlappungsfenster liegen, kommen erneut und werden ersetzt, nicht verdoppelt
  assert.ok(r2.ersetzt >= 1);
  assert.equal((await leseMessungen(sp, "ruhepuls")).length, 5);
  assert.equal((await leseMessungen(sp, "ruhepuls", "2026-11-01", "2026-11-01")).length, 1);
  assert.equal((await sp.lies(SYNC_PRAEFIX + "RestingHeartRate")).bisMs, spaeter);
  // Dritter Lauf ohne Neues: nichts neu, Bestand bleibt bei 5
  const r3 = await synchronisieren({ bruecke: b, speicher: sp, jetzt: spaeter + 3600 * 1000, arten: ["RestingHeartRate"] });
  assert.equal(r3.neu, 0);
  assert.equal((await leseMessungen(sp, "ruhepuls")).length, 5);
});

test("Erteilte Rechte ohne Dialog: Brücke mit und ohne Methode „erteilt“", async () => {
  assert.equal(await erteilteRechte(null), null);
  assert.equal(await erteilteRechte(fixtureBruecke()), null); // alte App-Fassung: Methode fehlt → unbekannt
  const b = { ...fixtureBruecke(), erteilt: async () => ({ erteilt: ["SleepSession", "RestingHeartRate"] }) };
  const r = await erteilteRechte(b, RECORD_TYPEN);
  assert.deepEqual(r.erteilt, ["SleepSession", "RestingHeartRate"]);
  assert.equal(r.fehlend.length, RECORD_TYPEN.length - 2);
  const kaputt = { ...fixtureBruecke(), erteilt: async () => { throw new Error("not implemented"); } };
  assert.equal(await erteilteRechte(kaputt), null);
  // über MF.daten
  const d = erzeugeDaten({ speicher: mapSpeicher(), bruecke: b, jetzt: () => JETZT });
  assert.deepEqual((await d.healthConnect.erteilt()).erteilt, ["SleepSession", "RestingHeartRate"]);
});
