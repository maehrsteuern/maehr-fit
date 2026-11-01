// tests/node/daten_deutsch.test.mjs – deutscher WHOOP-Export (Befund 30.10.2026) und Health-Connect-Abgleich ohne verschluckte Fehler.
// Kernaussage: (1) Die vier deutschen Dateien (physiologische_zyklen, Schlaf, Trainings, logbuch_eintraege) werden erkannt und wie die
// englischen gelesen – auch mit ";" als Trenner, Dezimalkomma und deutschen Datumsangaben. (2) Passen die Spalten nicht, steht die
// Kopfzeile (nie ein Wert) im Hinweis. (3) Ein gescheitertes Health-Connect-Fenster bricht den Abgleich nicht mehr still ab.
// Alle Werte sind erfunden („Musterperson“).
import { test } from "node:test";
import assert from "node:assert/strict";
import { importiereWhoop, erkenneDatei } from "../../daten/csv_import.js";
import { erzeugeDaten } from "../../daten/verbinden.js";
import { synchronisieren, mitZeitgrenze, berechtigungen, VORGABEN, SYNC_PRAEFIX, ersterZeitraumMs } from "../../daten/healthconnect.js";
import { leseMessungen, ARTEN } from "../../daten/ablage.js";
import { speicherMap } from "../../kern/speicher.js";
import { berechne } from "../../shell/kern_echt.js";
import { hcText, kopfDetails } from "../../shell/apps/daten.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";

// Kopfzeilen genau wie in den Dateien des Nutzers
const KOPF = {
  logbuch: ["Startzeit des Zyklus", "Endzeit des Zyklus", "Zeitzone des Zyklus", "Fragetext", "Beantwortet mit Ja", "Anmerkungen"],
  trainings: ["Startzeit des Zyklus", "Endzeit des Zyklus", "Zeitzone des Zyklus", "Startzeit des Trainings", "Endzeit des Trainings", "Dauer (Min.)", "Name der Aktivität", "Aktivitätsbelastung", "Verbrannte Energie (cal)", "Max HF (Schläge pro Minute)", "Durchschnittliche HF (Schläge pro Minute)", "HF-Zone 1 %", "HF-Zone 2 %", "HF-Zone 3 %", "HF-Zone 4 %", "HF-Zone 5 %", "GPS aktiviert"],
  zyklen: ["Startzeit des Zyklus", "Endzeit des Zyklus", "Zeitzone des Zyklus", "Erholungswert %", "Ruheherzfrequenz (Schläge pro Minute)", "Herzfrequenzvariabilität (ms)", "Hauttemperatur (Celsius)", "Blutsauerstoff %", "Tagesbelastung", "Verbrannte Energie (cal)", "Max HF (Schläge pro Minute)", "Durchschnittliche HF (Schläge pro Minute)", "Beginn des Schlafs", "Beginn des Aufwachens", "Schlafleistung %", "Atemfrequenz (Atemzüge/Min.)", "Schlafdauer (Min.)", "Dauer im Bett (Min.)", "Dauer des Leichtschlafs (Min.)", "Dauer des Tiefschlafs (Min.)", "Dauer des REM-Schlafs (Min.)", "Dauer des Aufwachens (Min.)", "Schlafbedarf (Min.)", "Schlafdefizit (Min.)", "Schlafeffizienz %", "Schlafbeständigkeit %"],
  schlaf: ["Startzeit des Zyklus", "Endzeit des Zyklus", "Zeitzone des Zyklus", "Beginn des Schlafs", "Beginn des Aufwachens", "Schlafleistung %", "Atemfrequenz (Atemzüge/Min.)", "Schlafdauer (Min.)", "Dauer im Bett (Min.)", "Dauer des Leichtschlafs (Min.)", "Dauer des Tiefschlafs (Min.)", "Dauer des REM-Schlafs (Min.)", "Dauer des Aufwachens (Min.)", "Schlafbedarf (Min.)", "Schlafdefizit (Min.)", "Schlafeffizienz %", "Schlafbeständigkeit %", "Nickerchen"],
};
const csv = (kopf, zeilen, trenner) => [kopf, ...zeilen].map((z) => z.join(trenner)).join("\r\n") + "\r\n";

// Variante A: "," als Trenner, ISO-Zeiten, Punkt als Dezimalzeichen · Variante B: ";" , deutsche Zeiten, Dezimalkomma, Ja/Nein
const VAR = {
  A: { t: ",", zeit: (d, h) => `2026-10-${d} ${h}:00`, zahl: (x) => String(x) },
  B: { t: ";", zeit: (d, h) => `${d}.10.2026 ${h}:00`, zahl: (x) => String(x).replace(".", ",") },
};
function dateien(v) {
  const { t, zeit, zahl } = VAR[v];
  const zyklus = [zeit("27", "23:10"), zeit("28", "22:55"), "UTC+01:00"];
  const zyk = [...zyklus, "72", "51", zahl(64.5), zahl(33.9), "97", zahl(9.8), "2500", "170", "75", zeit("27", "23:10"), zeit("28", "06:40"), "88", zahl(14.2), "420", "450", "230", "90", "100", "30", "480", "40", "93", "81"];
  const sl = [...zyklus, zeit("27", "23:10"), zeit("28", "06:40"), "88", zahl(14.2), "420", "450", "230", "90", "100", "30", "480", "40", "93", "81", v === "A" ? "false" : "Nein"];
  const tr = [...zyklus, zeit("28", "17:00"), zeit("28", "17:45"), "45", "Laufen", zahl(10.4), "400", "170", "140", "5", "10", "40", "30", "15", "true"];
  const lb = [...zyklus, "Haben Sie Alkohol getrunken?", v === "A" ? "true" : "Ja", ""];
  return [
    { name: "physiologische_zyklen.csv", text: csv(KOPF.zyklen, [zyk], t) },
    { name: "Schlaf.csv", text: csv(KOPF.schlaf, [sl], t) },
    { name: "Trainings.csv", text: csv(KOPF.trainings, [tr], t) },
    { name: "logbuch_eintraege.csv", text: csv(KOPF.logbuch, [lb], t) },
  ];
}

test("erkenneDatei: deutsche Dateinamen, Groß-/Kleinschreibung, Ordner und Endung egal; fremde Namen nicht", () => {
  for (const [name, art] of [["physiologische_zyklen.csv", "zyklen"], ["Physiologische_Zyklen.CSV", "zyklen"], ["Schlaf.csv", "schlaf"], ["export/SCHLAF.csv", "schlaf"],
    ["Trainings.csv", "training"], ["trainings.CSV", "training"], ["logbuch_eintraege.csv", "tagebuch"], ["Logbuch.csv", "tagebuch"],
    ["physiological_cycles.csv", "zyklen"], ["sleeps.csv", "schlaf"], ["workouts.csv", "training"], ["journal_entries.csv", "tagebuch"]]) {
    assert.equal(erkenneDatei(name, []), art, name);
  }
  assert.equal(erkenneDatei("Schlafphasen_notizen.csv", []), null);
  assert.equal(erkenneDatei("notizen.csv", []), null);
});

test("erkenneDatei: auch ohne Dateinamen allein an den deutschen Spalten", () => {
  assert.equal(erkenneDatei("x.csv", KOPF.logbuch), "tagebuch");
  assert.equal(erkenneDatei("x.csv", KOPF.trainings), "training");
  assert.equal(erkenneDatei("x.csv", KOPF.zyklen), "zyklen");
  assert.equal(erkenneDatei("x.csv", KOPF.schlaf), "schlaf");
});

for (const v of ["A", "B"]) {
  test(`Deutscher Export (Variante ${v}: ${VAR[v].t === "," ? "Komma, ISO-Zeit" : "Semikolon, Dezimalkomma, deutsche Zeit, Ja/Nein"}) wird wie der englische gelesen`, () => {
    const { paket, hinweise, dateien: ue } = importiereWhoop(dateien(v));
    assert.deepEqual(ue.map((d) => d.art), ["zyklen", "schlaf", "training", "tagebuch"]);
    assert.deepEqual(hinweise, []);
    const wach = Date.UTC(2026, 9, 28, 5, 40); // 06:40 in der Zone "UTC+01:00" der Datei
    // Zyklen: Nachtwerte am Aufwachzeitpunkt
    assert.equal(paket.ruhepuls[0].bpm, 51);
    assert.equal(paket.ruhepuls[0].t, wach);
    assert.equal(paket.hrv[0].rmssdMs, 64.5);
    assert.equal(paket.spo2[0].prozent, 97);
    assert.equal(paket.fremdwerte[0].erholung, 72);
    assert.equal(paket.fremdwerte[0].belastung, 9.8); // Spalte „Tagesbelastung“
    assert.equal(paket.hauttemp.length, 1);
    assert.equal(paket.fremdwerte[0].schlafLeistung, 88);
    // Schlaf (Datei Schlaf.csv); Nickerchen „Nein/false“ = kein Nickerchen
    assert.equal(paket.schlaf.length, 1);
    const s = paket.schlaf[0];
    assert.equal(s.bis, wach);
    assert.equal(s.von, Date.UTC(2026, 9, 27, 22, 10));
    assert.equal(s.schlafMs, 420 * 60000);
    assert.equal(s.phasenSummen.tiefMs, 90 * 60000);
    assert.equal(s.phasenSummen.remMs, 100 * 60000);
    assert.equal(s.nickerchen, false);
    assert.equal(paket.atemfrequenz[0].proMin, 14.2);
    // Training
    const tr = paket.training[0];
    assert.equal(tr.von, Date.UTC(2026, 9, 28, 16, 0));
    assert.equal(tr.art, "laufen");
    assert.deepEqual(tr.zonenProzent, [5, 10, 40, 30, 15]);
    assert.equal(tr.maxPuls, 170);
    assert.equal(tr.mittelPuls, 140);
    assert.equal(tr.fremdwerte.belastung, 10.4);
    // Logbuch: Ja → true
    assert.deepEqual(paket.tagebuch[0].eintraege, { haben_sie_alkohol_getrunken: true });
  });
}

test("Zyklus-Tag: Zeilen ohne Spalten-Treffer – erkannte Datei mit fremden Spaltennamen meldet nur die Kopfzeile", () => {
  const geheim = "GEHEIMWERT-4711";
  const kopf = ["Spalte Eins", "Spalte Zwei", "Größe (äöü)"];
  const r = importiereWhoop([{ name: "Schlaf.csv", text: `${kopf.join(",")}\n${geheim},${geheim},${geheim}\n` }]);
  assert.equal(r.dateien[0].art, "schlaf");
  assert.equal(r.paket.schlaf.length, 0);
  const h = r.hinweise[0];
  assert.equal(h.datei, "Schlaf.csv");
  assert.deepEqual(h.kopf, kopf);
  assert.match(h.text, /Pflichtspalten nicht gefunden \(Sleep onset, Wake onset\)/);
  assert.ok(!JSON.stringify(r.hinweise).includes(geheim), "keine Werte im Hinweis");
  setzeSprache("de");
  const zeilen = kopfDetails(r.hinweise);
  assert.equal(zeilen[2], "Spalte Eins | Spalte Zwei | Größe (äöü)");
  assert.ok(!zeilen.join("\n").includes(geheim));
});

test("Unbekannte Datei: Dateiname und Kopfzeile im Hinweis; csvImport wirft mit denselben Hinweisen", async () => {
  const r = importiereWhoop([{ name: "etwas.csv", text: "Alpha;Beta\n1;2\n" }]);
  assert.deepEqual(r.hinweise[0].kopf, ["Alpha", "Beta"]);
  const daten = erzeugeDaten({ speicher: speicherMap() });
  await assert.rejects(daten.csvImport({ name: "etwas.csv", text: "Alpha;Beta\n1;2\n" }), (e) => {
    assert.match(e.message, /Keine WHOOP-Datei erkannt/);
    assert.deepEqual(e.hinweise[0].kopf, ["Alpha", "Beta"]);
    return true;
  });
});

test("csvImport (deutsch, beide Varianten): landet in der Ablage, Zeitraum und Arten stimmen", async () => {
  for (const v of ["A", "B"]) {
    const daten = erzeugeDaten({ speicher: speicherMap() });
    const r = await daten.csvImport(dateien(v));
    assert.equal(r.arten.training, 1);
    assert.equal(r.arten.schlaf, 1);
    assert.equal(r.arten.tagebuch, 1);
    assert.deepEqual(r.zeitraum, { von: "2026-10-28", bis: "2026-10-28" });
    assert.deepEqual(r.hinweise, []);
  }
});

// ---------------------------------------------------------------------------------------------------
// Health Connect: nichts mehr still abbrechen
// ---------------------------------------------------------------------------------------------------
const MIN = 60000, H = 3600000;
// Feste Zeitpunkte in UTC (Versatz +1 h wie OFFSET), damit der Test in jeder Gerätezeitzone gleich rechnet: 30.10. 23:50 (+1 h)
const JETZT = Date.UTC(2026, 9, 30, 22, 50);
const OFFSET = 3600;
const keinWarten = { warte: async () => {} };
// Die Fälle vom 30.10.2026 liefen mit 30 Tagen Rückblick; seit dem selbsttätigen Abgleich greift der erste Lauf 90 Tage zurück
const v30 = { ...keinWarten, rueckblickTage: 30 };
// Health Connect gibt ohne Verlaufsrecht nichts heraus, was älter als 30 Tage ist (ältere Fenster kommen leer zurück)
const HC_GRENZE = JETZT - 30 * 24 * H;

/** WHOOP-ähnlich: Herzschlag je Minute, ein Schlaf je Nacht, ein Training je Tag – kein HRV, kein Ruhepuls. */
function whoopBruecke(fehlerBei = () => null) {
  const aufrufe = [];
  return {
    aufrufe,
    lesen: async (typ, von, bis) => {
      aufrufe.push({ typ, von, bis });
      const f = fehlerBei(typ, von, bis, aufrufe.length);
      if (f) throw f;
      const aus = [];
      if (bis <= HC_GRENZE) return aus;
      von = Math.max(von, HC_GRENZE);
      if (typ === "HeartRate") for (let t = Math.ceil(von / MIN) * MIN; t < bis; t += MIN) aus.push({ metadata: { id: `hr${t}`, dataOrigin: "com.whoop.android" }, startTime: t, endTime: t + MIN, startZoneOffsetSek: OFFSET, samples: [{ time: t, beatsPerMinute: 55 + (t / MIN) % 30 }] });
      if (typ === "SleepSession") for (let d = -31; d <= 0; d++) { const w = Date.UTC(2026, 9, 30 + d, 5, 30), s = w - 8 * H; if (s < bis && w > von) aus.push({ metadata: { id: `sl${w}` }, startTime: s, endTime: w, startZoneOffsetSek: OFFSET, stages: [{ startTime: s, endTime: w, stage: 4 }] }); }
      return aus;
    },
  };
}
const ablage = async (sp) => Object.fromEntries(await Promise.all(ARTEN.map(async (a) => [a, await leseMessungen(sp, a)])));

test("Abgleich: ein einmal gescheitertes Tagesfenster (wie am 30.10.2026) wird halbiert und gelesen – alle Tage kommen an", async () => {
  const sp = speicherMap();
  const beginn = JETZT - ersterZeitraumMs(v30);
  let schonGescheitert = false;
  const b = whoopBruecke((typ, von, bis) => {
    if (typ === "HeartRate" && !schonGescheitert && von >= beginn + 9 * VORGABEN.fensterMs && bis - von === VORGABEN.fensterMs) { schonGescheitert = true; return new Error("Zeitüberschreitung"); }
    return null;
  });
  const gemeldet = [];
  const r = await synchronisieren({ bruecke: b, speicher: sp, jetzt: JETZT, arten: ["HeartRate", "SleepSession"], vorgaben: v30, fortschritt: (i) => gemeldet.push(i) });
  assert.ok(schonGescheitert);
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.luecken, []);
  assert.equal(r.arten.HeartRate.bisMs, JETZT);
  assert.ok(r.zaehlung.herzschlag >= 43200 && r.zaehlung.schlaf >= 31, JSON.stringify(r.zaehlung)); // Schlaf über eine Fenstergrenze zählt in beiden Fenstern
  assert.equal(r.zeitraum.von, "2026-09-30");
  assert.equal(r.zeitraum.bis, "2026-10-30");
  // Fortschritt: je Fenster eine Meldung, Zähler wächst
  const hr = gemeldet.filter((g) => g.typ === "HeartRate");
  assert.equal(hr.length, 30);
  assert.deepEqual([hr[0].nr, hr[0].von], [1, 30]);
  assert.ok(hr.at(-1).gelesen > hr[1].gelesen);
  // Ansicht: bis zum heutigen Tag, nicht bis zum 9.10.
  const erg = berechne(await ablage(sp), { alter: 26 }, {});
  assert.equal(erg.letzter, "2026-10-30");
});

test("Abgleich: Lücke mitten drin – spätere Tage werden trotzdem gelesen, Stand bleibt vor der Lücke, nächster Lauf füllt sie", async () => {
  const sp = speicherMap();
  const beginn = JETZT - ersterZeitraumMs(v30);
  const lueckeVon = beginn + 9 * VORGABEN.fensterMs, lueckeBis = lueckeVon + VORGABEN.fensterMs;
  let kaputt = true;
  const b = whoopBruecke((typ, von, bis) => (kaputt && typ === "HeartRate" && von < lueckeBis && bis > lueckeVon ? new Error("Health Connect: Quote überschritten") : null));
  const r1 = await synchronisieren({ bruecke: b, speicher: sp, jetzt: JETZT, arten: ["HeartRate"], vorgaben: v30 });
  assert.match(r1.fehler[0], /^HeartRate: .*Quote überschritten/);
  assert.equal(r1.luecken.length, 8); // 24 h in 3-Stunden-Stücken
  assert.equal(r1.luecken[0].vonMs, lueckeVon);
  assert.equal((await sp.lies(SYNC_PRAEFIX + "HeartRate")).bisMs, lueckeVon, "Stand vor der Lücke");
  let erg = berechne(await ablage(sp), { alter: 26 }, {});
  assert.equal(erg.letzter, "2026-10-30", "Tage nach der Lücke kommen an");
  assert.ok(erg.tage.size >= 29);
  // Lücke behoben → nächster Lauf liest ab Stand (minus Überlappung) und schließt sie
  kaputt = false;
  const r2 = await synchronisieren({ bruecke: b, speicher: sp, jetzt: JETZT, arten: ["HeartRate"], vorgaben: v30 });
  assert.deepEqual(r2.luecken, []);
  assert.equal((await sp.lies(SYNC_PRAEFIX + "HeartRate")).bisMs, JETZT);
  assert.ok(r2.neu > 1000);
});

test("Abgleich: Antwortet die Brücke gar nicht, endet das Lesen mit Meldung statt zu hängen", async () => {
  const sp = speicherMap();
  const haengt = { lesen: () => new Promise(() => {}) };
  const t0 = Date.now();
  const r = await synchronisieren({ bruecke: haengt, speicher: sp, jetzt: JETZT, arten: ["SleepSession"], vorgaben: { ...keinWarten, lesenZeitgrenzeMs: 5, wiederholungen: 0, kleinsterFensterMs: VORGABEN.fensterMs } });
  assert.ok(Date.now() - t0 < 5000);
  assert.match(r.fehler[0], /nicht geantwortet/);
  await assert.rejects(mitZeitgrenze(new Promise(() => {}), 5, "zu lang"), /zu lang/);
  assert.equal(await mitZeitgrenze(Promise.resolve(7), 50, "x"), 7);
});

test("Rechte-Dialog ohne Antwort: Meldung mit Hinweis statt endlosem Warten", async () => {
  const b = { berechtigungen: () => new Promise(() => {}) };
  await assert.rejects(berechtigungen(b, ["HeartRate"], 5), /Health Connect hat auf die Rechte-Abfrage nicht geantwortet/);
});

test("verbinden liefert Anzahl je Art, Zeitraum und Fehler (Fortschritt wird durchgereicht)", async () => {
  const sp = speicherMap();
  const b = { ...whoopBruecke(), verfuegbar: async () => ({ verfuegbar: true }), berechtigungen: async (arten) => ({ erteilt: arten.filter((a) => a === "HeartRate" || a === "SleepSession") }) };
  const daten = erzeugeDaten({ speicher: sp, bruecke: b, jetzt: () => JETZT });
  const meldungen = [];
  const r = await daten.healthConnect.verbinden(undefined, { fortschritt: (i) => meldungen.push(i.typ) });
  assert.ok(meldungen.includes("HeartRate") && meldungen.includes("SleepSession"));
  assert.ok(r.zaehlung.schlaf >= 31);
  assert.equal(r.neu + r.ersetzt, r.zaehlung.herzschlag + r.zaehlung.schlaf);
  assert.deepEqual(r.zeitraum, { von: "2026-09-30", bis: "2026-10-30" });
  assert.equal(r.fehlend.includes("HeartRateVariabilityRmssd"), true);
});

test("Daten-Ansicht: Text nach dem Verbinden nennt Arten, Zeitraum, Lücken und den Hinweis zu fehlender HRV", () => {
  setzeSprache("de");
  const z = hcText({
    n: 66965, arten: { herzschlag: 66000, schlaf: 31, training: 12 }, zeitraum: { von: "2026-10-01", bis: "2026-10-30" },
    fehler: ["HeartRate: Zeitüberschreitung"], gespeichert: { von: "2026-10-01", bis: "2026-10-30" }, ohneHrvRuhepuls: true,
  });
  assert.match(z.text, /^Verbunden: 66\.043 Messwerte gelesen: 66\.000 Herzschlag, 31 Schlaf, 12 Trainings · Zeitraum: /);
  assert.equal(z.details.length, 3);
  assert.match(z.details[0], /Nicht alles gelesen: HeartRate: Zeitüberschreitung/);
  assert.match(z.details[2], /keine HRV und keinen Ruhepuls/);
  assert.equal(hcText(5).text, "Verbunden: 5 Messwerte gelesen.");
  setzeSprache("en");
  assert.match(hcText({ n: 3, arten: { schlaf: 3 } }).text, /^Connected: 3 measurements read: 3 sleep/);
  setzeSprache("de");
});
