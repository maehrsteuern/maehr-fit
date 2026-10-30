// Tests: WHOOP-CSV-Export → normierte Messwerte. CSV-Zerlegung (RFC 4180), Zeitformate und Zeitzonen,
// fehlende Spalten, Doppelte, ZIP. Fixtures: daten/fixtures/whoop_*.csv (erfunden, Musterperson).
import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { parseCsv, importiereWhoop, erkenneDatei, leseZahl, leseJaNein, frageSchluessel } from "../../daten/csv_import.js";
import { leseZeit, tagIso, zoneZuMinuten } from "../../daten/zeit.js";
import { leseZip } from "../../daten/zip.js";
import { erzeugeDaten } from "../../daten/verbinden.js";
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


const DATEIEN = ["physiological_cycles", "sleeps", "workouts", "journal_entries"].map((n) => ({
  name: `whoop_${n}.csv`,
  text: fixture(`whoop_${n}.csv`),
}));

// ---------------------------------------------------------------------------------------------------
// CSV nach RFC 4180
// ---------------------------------------------------------------------------------------------------

test("CSV: Anführungszeichen, verdoppelte \"\", Komma und Zeilenumbruch im Feld, CRLF", () => {
  const text = 'a,b,c\r\n1,"x, y","er sagte ""hallo"""\r\n2,"zwei\r\nzeilen",z\r\n';
  const csv = parseCsv(text);
  assert.deepEqual(csv.kopf, ["a", "b", "c"]);
  assert.deepEqual(csv.zeilen.map((z) => z.werte), [
    ["1", "x, y", 'er sagte "hallo"'],
    ["2", "zwei\r\nzeilen", "z"],
  ]);
  // Zeilennummern = physische Zeile des Satzbeginns (Kopf = 1)
  assert.deepEqual(csv.zeilen.map((z) => z.zeile), [2, 3]);
});

test("CSV: BOM, Semikolon (deutsches Excel), LF, leere Zeilen, fehlende Felder, kein Abschluss-Umbruch", () => {
  const csv = parseCsv("﻿Name;Wert\n\nA;1\nB\n;\nC;\"3\"");
  assert.equal(csv.trenner, ";");
  assert.deepEqual(csv.kopf, ["Name", "Wert"]);
  assert.deepEqual(csv.zeilen.map((z) => z.werte), [["A", "1"], ["B"], ["", ""], ["C", "3"]]);
  assert.deepEqual(csv.zeilen.map((z) => z.zeile), [3, 4, 5, 6]);
});

test("CSV: leeres Feld in Anführungszeichen bleibt ein Satz, leerer Text ergibt nichts", () => {
  assert.deepEqual(parseCsv('k\n""\n').zeilen.map((z) => z.werte), [[""]]);
  assert.deepEqual(parseCsv(""), { kopf: [], zeilen: [], trenner: "," });
});

test("Zahlen und Ja/Nein tolerant lesen", () => {
  assert.equal(leseZahl("45.3"), 45.3);
  assert.equal(leseZahl("45,3"), 45.3);
  assert.equal(leseZahl("87 %"), 87);
  assert.equal(leseZahl(""), null);
  assert.equal(leseZahl("n/a"), null);
  assert.equal(leseJaNein("TRUE"), true);
  assert.equal(leseJaNein("no"), false);
  assert.equal(leseJaNein("vielleicht"), null);
  assert.equal(frageSchluessel("Read (non-screened device) while in bed?"), "read_non_screened_device_while_in_bed");
  assert.equal(frageSchluessel("Süßes gegessen?"), "suesses_gegessen");
});

// ---------------------------------------------------------------------------------------------------
// Zeit und Zeitzone
// ---------------------------------------------------------------------------------------------------

test("Zeit: WHOOP-Format mit Zeitzonenspalte", () => {
  // "2026-10-23 23:14:00" in UTC+02:00 = 21:14 UTC
  assert.equal(leseZeit("2026-10-23 23:14:00", "UTC+02:00"), Date.UTC(2026, 9, 23, 21, 14));
  assert.equal(leseZeit("2026-10-26 06:40:00", "UTC+01:00"), Date.UTC(2026, 9, 26, 5, 40));
  assert.equal(leseZeit("2026-10-26 06:40:00", "UTC-05:30"), Date.UTC(2026, 9, 26, 12, 10));
  assert.equal(leseZeit("2026-10-26 06:40:00", "+0100"), Date.UTC(2026, 9, 26, 5, 40));
  assert.equal(leseZeit("2026-10-26 06:40:00", 60), Date.UTC(2026, 9, 26, 5, 40));
});

test("Zeit: Versatz im Text hat Vorrang vor der Zeitzonenspalte", () => {
  assert.equal(leseZeit("2026-10-26T06:40:00Z", "UTC+01:00"), Date.UTC(2026, 9, 26, 6, 40));
  assert.equal(leseZeit("2026-10-26T06:40:00.250+02:00"), Date.UTC(2026, 9, 26, 4, 40, 0, 250));
});

test("Zeit: IANA-Zone rechnet die Sommerzeit mit (Umstellung 25.10.2026)", () => {
  // Vor der Umstellung gilt MESZ (+02:00), danach MEZ (+01:00)
  assert.equal(leseZeit("2026-10-24 12:00:00", "Europe/Berlin"), Date.UTC(2026, 9, 24, 10, 0));
  assert.equal(leseZeit("2026-10-26 12:00:00", "Europe/Berlin"), Date.UTC(2026, 9, 26, 11, 0));
  assert.equal(zoneZuMinuten("Mars/Olympus", [2026, 10, 26, 12, 0, 0, 0]), null);
});

test("Zeit: deutsche und US-Schreibweise, Epoche, Unsinn", () => {
  assert.equal(leseZeit("26.10.2026 06:40", 60), Date.UTC(2026, 9, 26, 5, 40));
  assert.equal(leseZeit("10/26/2026 11:05:00 PM", 60), Date.UTC(2026, 9, 26, 22, 5));
  assert.equal(leseZeit("10/26/2026 12:05 AM", 0), Date.UTC(2026, 9, 26, 0, 5));
  assert.equal(leseZeit("1793000000"), 1793000000000);
  assert.equal(leseZeit("1793000000123"), 1793000000123);
  assert.equal(leseZeit("gestern"), null);
  assert.equal(leseZeit("2026-13-01 00:00:00", 0), null);
});

test("Zeit: ohne Zeitzone gilt die Gerätezeitzone", () => {
  assert.equal(leseZeit("2026-10-26 06:40:00"), new Date(2026, 9, 26, 6, 40, 0).getTime());
  const t = Date.UTC(2026, 9, 28, 23, 30);
  assert.equal(tagIso(t, 60), "2026-10-29");
  assert.equal(tagIso(t, -300), "2026-10-28");
  const d = new Date(t);
  assert.equal(tagIso(t), `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
});

// ---------------------------------------------------------------------------------------------------
// WHOOP-Export
// ---------------------------------------------------------------------------------------------------

test("Dateien werden am Namen oder an den Spalten erkannt", () => {
  assert.equal(erkenneDatei("physiological_cycles.csv"), "zyklen");
  assert.equal(erkenneDatei("my_data/sleeps.csv"), "schlaf");
  assert.equal(erkenneDatei("export (1).csv", ["Workout start time", "Activity name"]), "training");
  assert.equal(erkenneDatei("x.csv", ["Cycle start time", "Question text", "Answered yes"]), "tagebuch");
  assert.equal(erkenneDatei("x.csv", ["Foo"]), null);
});

test("Zyklen: Ruhepuls, HRV, SpO2, Hauttemp und WHOOP-Werte – Zeile 2 von Hand nachgerechnet", () => {
  const { paket, hinweise } = importiereWhoop(DATEIEN);
  // Zeile 2: Aufwachen "2026-10-24 06:58:00" in UTC+02:00 = 04:58 UTC
  const t = Date.UTC(2026, 9, 24, 4, 58);
  const start = Date.UTC(2026, 9, 23, 21, 14);
  const rhr = paket.ruhepuls[0];
  assert.deepEqual(rhr, {
    t, bpm: 53, zoneMin: 120,
    quelle: { art: "csv", id: `whoop:zyklus:${start}:ruhepuls`, datei: "whoop_physiological_cycles.csv", zeile: 2 },
  });
  assert.equal(paket.hrv[0].rmssdMs, 52);
  assert.equal(paket.spo2[0].prozent, 96.1);
  // Hauttemp: Werte 33.42 33.61 33.38 33.50 33.95 33.47 33.55 → sortiert, Median (4. von 7) = 33.50
  // Abweichung Zeile 2 = 33.42 − 33.50 = −0.08 °C (in Tausendstel: 33420 − 33500 = −80)
  assert.equal(paket.hauttemp[0].deltaC, -0.08);
  assert.equal(paket.hauttemp[0].absolutC, 33.42);
  assert.equal(paket.hauttemp[0].basisC, 33.5);
  // WHOOPs eigene Werte als Fremdwerte, Tag = Aufwachtag
  assert.deepEqual(
    { tag: paket.fremdwerte[0].tag, e: paket.fremdwerte[0].erholung, b: paket.fremdwerte[0].belastung, s: paket.fremdwerte[0].schlafLeistung },
    { tag: "2026-10-24", e: 67, b: 11.3, s: 88 },
  );
  // Zeile 7 hat leere HRV und SpO2 → keine Datensätze; 7 Zyklen, 6 HRV, 6 SpO2
  assert.equal(paket.ruhepuls.length, 7);
  assert.equal(paket.hrv.length, 6);
  assert.equal(paket.spo2.length, 6);
  // Zeile 8 (laufender Zyklus) ohne Aufwachzeit → Zyklusbeginn als Messzeit, markiert und gemeldet
  const letzter = paket.ruhepuls.at(-1);
  assert.equal(letzter.zeitGeschaetzt, true);
  assert.equal(letzter.t, Date.UTC(2026, 9, 29, 21, 50));
  assert.deepEqual(hinweise.map((h) => h.zeile), [8]);
});

test("Schlaf: Summen je Phase in ms, Nickerchen, Atemfrequenz, WHOOP-Schlafleistung", () => {
  const { paket } = importiereWhoop(DATEIEN);
  assert.equal(paket.schlaf.length, 7);
  const n = paket.schlaf[0];
  // 23:14 (+02:00) bis 06:58 (+02:00)
  assert.equal(n.von, Date.UTC(2026, 9, 23, 21, 14));
  assert.equal(n.bis, Date.UTC(2026, 9, 24, 4, 58));
  assert.deepEqual(n.phasen, []);
  // 201 min leicht = 201 × 60 000 = 12 060 000 ms; 98 min tief = 5 880 000 ms
  assert.deepEqual(n.phasenSummen, { wachMs: 3120000, leichtMs: 12060000, tiefMs: 5880000, remMs: 6780000 });
  assert.equal(n.schlafMs, 412 * 60000);
  assert.equal(n.bedarfMs, 470 * 60000);
  assert.equal(n.fremdwerte.schlafLeistung, 88);
  assert.equal(n.nickerchen, false);
  const nap = paket.schlaf.find((s) => s.nickerchen);
  assert.equal(nap.bis - nap.von, 25 * 60000);
  assert.equal(nap.fremdwerte.schlafLeistung, null);
  assert.equal(paket.atemfrequenz.length, 7);
  assert.equal(paket.atemfrequenz[0].proMin, 14.7);
});

test("Training: nur Zonenanteile, keine Herzschläge; fehlendes Ende = Beginn + Dauer", () => {
  const { paket } = importiereWhoop(DATEIEN);
  assert.equal(paket.training.length, 5);
  const t0 = paket.training[0];
  assert.equal(t0.art, "laufen");
  assert.equal(t0.name, "Running");
  assert.deepEqual(t0.zonenProzent, [8, 22, 41, 24, 5]);
  assert.deepEqual(t0.herzschlaege, []);
  assert.equal(t0.fremdwerte.belastung, 12.4);
  assert.equal(t0.energieKcal, 540);
  // Zeile 6: Beginn 17:00 (+01:00) = 16:00 UTC, Ende leer, Dauer 45 min → 16:45 UTC
  const t4 = paket.training[4];
  assert.equal(t4.von, Date.UTC(2026, 9, 29, 16, 0));
  assert.equal(t4.bis, Date.UTC(2026, 9, 29, 16, 45));
  assert.equal(paket.training[1].art, "gewichtheben");
  assert.equal(paket.training[1].distanzM, null);
});

test("Tagebuch: je Tag ein Eintrag, Notizen mit Komma, Anführungszeichen und Zeilenumbruch", () => {
  const { paket } = importiereWhoop(DATEIEN);
  assert.deepEqual(paket.tagebuch.map((t) => t.tag), ["2026-10-27", "2026-10-28", "2026-10-29"]);
  const [a, b] = paket.tagebuch;
  assert.deepEqual(a.eintraege, {
    have_any_alcoholic_drinks: false, read_non_screened_device_while_in_bed: true, consume_caffeine: true,
  });
  assert.equal(a.notizen.consume_caffeine, 'Espresso "doppio", 15 Uhr');
  assert.equal(b.notizen.have_any_alcoholic_drinks, "Feier bei Freunden,\nzwei Gläser Wein");
  assert.deepEqual(b.zeilen, [5, 7, 8]); // Zeile 6 ist die Fortsetzung der Notiz
  assert.equal(a.fragen.consume_caffeine, "Consume caffeine?");
});

test("Fehlende Spalten: nur Beginn und Erholung → nur Fremdwerte, kein Absturz", () => {
  const text = "Cycle start time,Recovery score %\n2026-10-26 23:20:00,72\n,50\n";
  const { paket, hinweise } = importiereWhoop([{ name: "physiological_cycles.csv", text }], { zone: "UTC+01:00" });
  assert.equal(paket.fremdwerte.length, 1);
  assert.equal(paket.fremdwerte[0].erholung, 72);
  assert.equal(paket.fremdwerte[0].belastung, null);
  assert.equal(paket.ruhepuls.length, 0);
  assert.equal(paket.hauttemp.length, 0);
  assert.equal(hinweise.length, 2); // Aufwachzeit fehlt (Z. 2), Zyklusbeginn fehlt (Z. 3)
});

test("Spaltennamen tolerant: andere Groß-/Kleinschreibung, Klammern, Semikolon", () => {
  const text = "cycle start time;WAKE ONSET;resting heart rate;Recovery score (%)\n" +
    "2026-10-26 23:20:00;2026-10-27 06:40:00;51;72\n";
  const { paket } = importiereWhoop([{ name: "export.csv", text }], { zone: 60 });
  assert.equal(paket.ruhepuls[0].bpm, 51);
  assert.equal(paket.ruhepuls[0].t, Date.UTC(2026, 9, 27, 5, 40));
  assert.equal(paket.fremdwerte[0].erholung, 72);
});

test("Unbekannte Datei wird gemeldet, nicht importiert", () => {
  const { hinweise, dateien } = importiereWhoop([{ name: "notizen.csv", text: "a,b\n1,2\n" }]);
  assert.equal(dateien[0].art, null);
  assert.match(hinweise[0].text, /nicht erkannt/);
});

test("Doppelter Import: gleiche Daten erneut → nichts Neues, alles ersetzt", async () => {
  const sp = mapSpeicher();
  const daten = erzeugeDaten({ speicher: sp });
  const r1 = await daten.csvImport(DATEIEN);
  // 7 RHR + 6 HRV + 6 SpO2 + 7 Hauttemp + 7 Fremdwerte + 7 Schlaf + 7 Atem + 5 Training + 3 Tagebuch = 55
  assert.equal(r1.neu, 55);
  assert.equal(r1.arten.schlaf, 7);
  const r2 = await daten.csvImport(DATEIEN);
  assert.deepEqual([r2.neu, r2.ersetzt], [0, 55]);
  // Schlaf zählt zum Aufwachtag: Nacht 23./24.10. → messung:schlaf:2026-10-24
  assert.equal((await sp.lies("messung:schlaf:2026-10-24")).length, 1);
  // Nickerchen am 27.10. liegt mit der Nacht 26./27.10. am selben Tag
  assert.equal((await sp.lies("messung:schlaf:2026-10-27")).length, 2);
});

// ---------------------------------------------------------------------------------------------------
// ZIP
// ---------------------------------------------------------------------------------------------------

/** Kleines ZIP bauen (Methode 8 = deflate, außer bei `gespeichert`), wie es der WHOOP-Export liefert. */
function baueZip(dateien, { gespeichert = false } = {}) {
  const teile = [];
  const verzeichnis = [];
  let pos = 0;
  for (const { name, text } of dateien) {
    const nameB = Buffer.from(name, "utf8");
    const roh = Buffer.from(text, "utf8");
    const daten = gespeichert ? roh : zlib.deflateRawSync(roh);
    const methode = gespeichert ? 0 : 8;
    const crc = zlib.crc32 ? zlib.crc32(roh) : 0;
    const lokal = Buffer.alloc(30);
    lokal.writeUInt32LE(0x04034b50, 0); lokal.writeUInt16LE(20, 4); lokal.writeUInt16LE(0x800, 6);
    lokal.writeUInt16LE(methode, 8); lokal.writeUInt32LE(crc, 14);
    lokal.writeUInt32LE(daten.length, 18); lokal.writeUInt32LE(roh.length, 22); lokal.writeUInt16LE(nameB.length, 26);
    const zentral = Buffer.alloc(46);
    zentral.writeUInt32LE(0x02014b50, 0); zentral.writeUInt16LE(20, 4); zentral.writeUInt16LE(20, 6);
    zentral.writeUInt16LE(0x800, 8); zentral.writeUInt16LE(methode, 10); zentral.writeUInt32LE(crc, 16);
    zentral.writeUInt32LE(daten.length, 20); zentral.writeUInt32LE(roh.length, 24);
    zentral.writeUInt16LE(nameB.length, 28); zentral.writeUInt32LE(pos, 42);
    teile.push(lokal, nameB, daten);
    verzeichnis.push(zentral, nameB);
    pos += 30 + nameB.length + daten.length;
  }
  const vz = Buffer.concat(verzeichnis);
  const ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0); ende.writeUInt16LE(dateien.length, 8); ende.writeUInt16LE(dateien.length, 10);
  ende.writeUInt32LE(vz.length, 12); ende.writeUInt32LE(pos, 16);
  return new Uint8Array(Buffer.concat([...teile, vz, ende]));
}

test("ZIP: WHOOP-Export als ZIP (deflate) wird entpackt und importiert", async () => {
  const zip = baueZip(DATEIEN.map((d) => ({ name: `my_whoop_data_2026_10_30/${d.name.replace("whoop_", "")}`, text: d.text })));
  const inhalt = await leseZip(zip);
  assert.equal(inhalt.length, 4);
  assert.equal(new TextDecoder().decode(inhalt[0].bytes), DATEIEN[0].text);
  const daten = erzeugeDaten({ speicher: mapSpeicher() });
  const r = await daten.csvImport([{ name: "my_whoop_data.zip", bytes: zip }]);
  assert.equal(r.neu, 55);
  assert.deepEqual(r.dateien.map((d) => d.art), ["zyklen", "schlaf", "training", "tagebuch"]);
});

test("ZIP: gespeicherte Einträge, Ordner, kaputte Datei", async () => {
  const zip = baueZip([{ name: "a/", text: "" }, { name: "a/sleeps.csv", text: "x" }], { gespeichert: true });
  const inhalt = await leseZip(zip);
  assert.deepEqual(inhalt.map((e) => e.name), ["a/sleeps.csv"]);
  await assert.rejects(leseZip(new Uint8Array([1, 2, 3])), /Keine gültige ZIP/);
});

test("csvImport nimmt eine einzelne Datei (File-ähnlich) und liefert die neuen Datensätze als Messpaket", async () => {
  const d = DATEIEN[3];
  const datei = { name: d.name, arrayBuffer: async () => new TextEncoder().encode(d.text).buffer };
  const daten = erzeugeDaten({ speicher: mapSpeicher() });
  const r = await daten.csvImport(datei);
  assert.equal(r.arten.tagebuch, 3);
  assert.equal(r.tagebuch.length, 3);
  assert.deepEqual(r.herzschlag, []);
  const r2 = await daten.csvImport([datei]);
  assert.deepEqual([r2.neu, r2.tagebuch.length], [0, 0]);
  await assert.rejects(daten.csvImport({ name: "liste.csv", text: "a,b\n1,2\n" }), /Keine WHOOP-Datei/);
});
