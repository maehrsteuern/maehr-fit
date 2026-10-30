// Tests kern/zeit.js – Zeitzone Europe/Berlin (Sommerzeit endet 25.10.2026 um 03:00, beginnt 29.03.2026 um 02:00).
//
// Fall 1 (Handrechnung Tagesgrenzen): Hauptschlaf 29.10. 23:00 → 30.10. 06:45, nächster 30.10. 23:15 → 31.10. 07:10.
//   Tag 30.10. = 06:45 bis 07:10 des Folgetags = 24 h 25 min = 87 900 000 ms.
// Fall 2 (Zeitumstellung): 25.10.2026 hat 25 Stunden (90 000 000 ms), 29.03.2026 nur 23 (82 800 000 ms).
//   Schlaf 24.10. 23:00 (MESZ) → 25.10. 07:00 (MEZ) dauert 9 h echte Zeit; 28.03. 23:00 → 29.03. 07:00 nur 7 h.
// Fall 3 (ISO-Woche): 1.1.2026 ist Donnerstag → Woche 1 beginnt Mo 29.12.2025. 30.10.2026 (Fr): Montag 26.10.;
//   29.12.2025 → 26.10.2026 = 3 + 298 = 301 Tage = 43 Wochen → W44. 31.12.2026 (Do) → 2026-W53; 1.1.2027 (Fr) → 2026-W53;
//   4.1.2027 (Mo) → 2027-W01.
// Fall 4 (Dauer): 27 000 000 ms = 450 min = 7 h 30 min; 90 000 ms = 1,5 min → 2 min (kaufmännisch); 89 999 → 1 min.
// Grenzfälle: kein Schlaf → Mitternacht bis Mitternacht; nur Nickerchen (< 3 h) → kein Hauptschlaf; ungültiger Tag wirft.
import test from "node:test";
import assert from "node:assert/strict";
process.env.TZ = "Europe/Berlin";
const Z = await import("../../kern/zeit.js");
const { isoTag, mitternacht, lokal, plusTage, tageZwischen, tagLaengeMs, wochentag, isoWoche, monat, dauer, hauptschlaf, tagesgrenzen, MS_STUNDE, MS_MINUTE } = Z;

test("örtliche Mitternacht und Kalendertag", () => {
  assert.equal(mitternacht("2026-10-30"), Date.UTC(2026, 9, 29, 23, 0));   // MEZ = UTC+1
  assert.equal(mitternacht("2026-07-01"), Date.UTC(2026, 5, 30, 22, 0));   // MESZ = UTC+2
  assert.equal(isoTag(Date.UTC(2026, 9, 29, 23, 30)), "2026-10-30");
  assert.equal(isoTag(Date.UTC(2026, 9, 29, 22, 59)), "2026-10-29");
  assert.equal(lokal("2026-10-30", -60), Date.UTC(2026, 9, 29, 22, 0)); // 23:00 Vorabend
});

test("Kalenderrechnung über Monats- und Jahresgrenzen", () => {
  assert.equal(plusTage("2026-12-31", 1), "2027-01-01");
  assert.equal(plusTage("2026-03-01", -1), "2026-02-28");
  assert.equal(plusTage("2026-10-24", 2), "2026-10-26");
  assert.equal(tageZwischen("2026-10-01", "2026-10-30"), 29);
  assert.equal(wochentag("2026-10-30"), 4); // Freitag
  assert.equal(monat("2026-10-30"), "2026-10");
  assert.throws(() => plusTage("30.10.2026", 1), /JJJJ-MM-TT/);
});

test("Zeitumstellung: 25- und 23-Stunden-Tag", () => {
  assert.equal(tagLaengeMs("2026-10-25"), 25 * MS_STUNDE);
  assert.equal(tagLaengeMs("2026-03-29"), 23 * MS_STUNDE);
  assert.equal(tagLaengeMs("2026-10-30"), 24 * MS_STUNDE);
  assert.equal(lokal("2026-10-25", 420) - lokal("2026-10-25", -60), 9 * MS_STUNDE);
  assert.equal(lokal("2026-03-29", 420) - lokal("2026-03-29", -60), 7 * MS_STUNDE);
});

test("ISO-Kalenderwoche", () => {
  assert.equal(isoWoche("2026-10-30"), "2026-W44");
  assert.equal(isoWoche("2026-10-26"), "2026-W44");
  assert.equal(isoWoche("2026-10-25"), "2026-W43");
  assert.equal(isoWoche("2026-12-31"), "2026-W53");
  assert.equal(isoWoche("2027-01-01"), "2026-W53");
  assert.equal(isoWoche("2027-01-04"), "2027-W01");
  assert.equal(isoWoche("2026-01-01"), "2026-W01");
});

test("Dauer als reine Daten", () => {
  assert.deepEqual(dauer(27_000_000), { h: 7, min: 30, negativ: false, gesamtMin: 450 });
  assert.deepEqual(dauer(90_000), { h: 0, min: 2, negativ: false, gesamtMin: 2 });
  assert.deepEqual(dauer(89_999), { h: 0, min: 1, negativ: false, gesamtMin: 1 });
  assert.deepEqual(dauer(-3_600_000), { h: 1, min: 0, negativ: true, gesamtMin: -60 });
  assert.deepEqual(dauer(NaN), { h: 0, min: 0, negativ: false, gesamtMin: 0 });
});

const schlaf = (vonTag, vonMin, bisTag, bisMin, id) => ({ von: lokal(vonTag, vonMin), bis: lokal(bisTag, bisMin), phasen: [], quelle: { art: "hand", id } });

test("Tagesgrenzen: Aufwachen bis Aufwachen (Handrechnung)", () => {
  const s = [schlaf("2026-10-29", 23 * 60, "2026-10-30", 405, "n1"), schlaf("2026-10-30", 23 * 60 + 15, "2026-10-31", 430, "n2")];
  const g = tagesgrenzen("2026-10-30", {}, s);
  assert.equal(g.von, lokal("2026-10-30", 405));
  assert.equal(g.bis, lokal("2026-10-31", 430));
  assert.equal(g.bis - g.von, 24 * MS_STUNDE + 25 * MS_MINUTE);
  assert.deepEqual([g.beginn, g.ende], ["aufwachen", "aufwachen"]);
  assert.deepEqual(g.quellen.map((q) => q.id), ["n1", "n2"]);
  // gleiche Liste über einstellungen.schlaf
  assert.deepEqual(tagesgrenzen("2026-10-30", { schlaf: s }).von, g.von);
  // Folgetag beginnt genau dort, wo dieser endet
  assert.equal(tagesgrenzen("2026-10-31", {}, s).von, g.bis);
});

test("Tagesgrenzen am Tag der Zeitumstellung", () => {
  const s = [schlaf("2026-10-24", 23 * 60, "2026-10-25", 420, "dst"), schlaf("2026-10-25", 23 * 60, "2026-10-26", 420, "n")];
  const g = tagesgrenzen("2026-10-25", {}, s);
  assert.equal(g.bis - g.von, 24 * MS_STUNDE);           // 07:00 MEZ → 07:00 MEZ
  const g0 = tagesgrenzen("2026-10-24", {}, s);          // ohne Schlaf am 24.: Mitternacht → Aufwachen 25.10.
  assert.equal(g0.von, mitternacht("2026-10-24"));
  assert.equal(g0.bis - g0.von, 32 * MS_STUNDE);         // 00:00 MESZ → 07:00 MEZ = 31 h + 1 h Umstellung
  assert.equal(hauptschlaf("2026-10-25", s).bis - hauptschlaf("2026-10-25", s).von, 9 * MS_STUNDE);
});

test("Grenzfälle: kein Schlaf, nur Nickerchen, gleich lange Schlafphasen", () => {
  const g = tagesgrenzen("2026-10-30");
  assert.equal(g.von, mitternacht("2026-10-30"));
  assert.equal(g.bis, mitternacht("2026-10-31"));
  assert.deepEqual([g.beginn, g.ende], ["mitternacht", "mitternacht"]);
  const nap = [schlaf("2026-10-30", 14 * 60, "2026-10-30", 16 * 60, "nap")]; // 2 h < 3 h
  assert.equal(hauptschlaf("2026-10-30", nap), null);
  const zwei = [schlaf("2026-10-30", 0, "2026-10-30", 240, "a"), schlaf("2026-10-30", 600, "2026-10-30", 840, "b")];
  assert.equal(hauptschlaf("2026-10-30", zwei).quelle.id, "a"); // gleich lang → früherer
  assert.equal(hauptschlaf("2026-10-30", [null, { von: 5, bis: 1 }]), null);
});
