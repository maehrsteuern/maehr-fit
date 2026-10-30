// tests/node/whoop_erwartet_erzeugen.mjs – schreibt daten/fixtures/whoop_erwartet.json aus der App-Seite (daten/csv_import.js).
// Kernaussage: Die Datei sagt, was die App aus den WHOOP-Beispieldateien und aus kniffligen Einzelwerten (Zeitformate, Zahlen,
// CSV mit Anführungszeichen) macht. desktop/whoop_csv.py muss genau dasselbe liefern (tests/python/test_dienst.py), und
// tests/node/daten_sync.test.mjs prüft, dass die App sich nicht unbemerkt davon entfernt.
// Aufruf: node tests/node/whoop_erwartet_erzeugen.mjs   (kein Test; Name endet nicht auf .test.mjs)
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { importiereWhoop, parseCsv, leseZahl } from "../../daten/csv_import.js";
import { leseZeit, versatzFuer } from "../../daten/zeit.js";
import { ARTEN, tagVon } from "../../daten/ablage.js";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const NAMEN = ["whoop_physiological_cycles.csv", "whoop_sleeps.csv", "whoop_workouts.csv", "whoop_journal_entries.csv"];
export const ZEITEN = [
  ["2026-10-12 23:14:05", "UTC+02:00"], ["2026-10-12T23:14:05Z", null], ["2026-10-12T23:14:05.5+01:30", null], ["2026-10-12", "UTC"],
  ["12.10.2026 23:14", "+0100"], ["10/12/2026 11:14:05 PM", "GMT-5"], ["10/12/2026 12:00 AM", "Z"], ["2026-03-29 02:30:00", "Europe/Berlin"],
  ["2026-10-25 02:30:00", "Europe/Berlin"], ["2026-02-31 10:00", "UTC"], ["1793350800", null], ["1793350800123", null], ["2026-13-01", "UTC"], ["unsinn", "UTC"],
];
export const ZAHLEN = ["45.3", "45,3", "87 %", "87%", "", "n/a", "NA", "-", "1e3", ".5", "5.", "+5", "0x1A", "1_000", "1.234,5", "Infinity", "  12  "];
export const VERSAETZE = [["Europe/Berlin", 1793350800000], ["America/New_York", 1780000000000], ["UTC+05:30", 0], ["Mars/Olymp", 0]];
export const CSV = ['a,b,c\r\n1,"x ""y""",3\n\n"mehr\nzeilig",,\r"ende"', "x;y\n1;2", "﻿k\tl\n1\t2"];

export function erwartet() {
  const dateien = NAMEN.map((n) => ({ name: "export/" + n, text: readFileSync(join(WURZEL, "daten/fixtures", n), "utf8") }));
  const r = importiereWhoop(dateien, {});
  return {
    hinweis: "Erzeugt von tests/node/whoop_erwartet_erzeugen.mjs aus daten/csv_import.js – nicht von Hand ändern.",
    import: { ...r, tage: Object.fromEntries(ARTEN.map((a) => [a, r.paket[a].map((d) => tagVon(a, d))])) },
    zeiten: ZEITEN.map(([text, zone]) => [text, zone, leseZeit(text, zone ?? undefined)]),
    zahlen: ZAHLEN.map((t) => [t, leseZahl(t)]),
    versaetze: VERSAETZE.map(([z, t]) => [z, t, versatzFuer(z, t)]),
    csv: CSV.map((t) => [t, parseCsv(t)]),
  };
}

if (process.argv[1] && process.argv[1].endsWith("whoop_erwartet_erzeugen.mjs")) {
  writeFileSync(join(WURZEL, "daten/fixtures/whoop_erwartet.json"), JSON.stringify(erwartet(), null, 1) + "\n");
  console.log("geschrieben: daten/fixtures/whoop_erwartet.json");
}
