// tests/python/hilfe_sync_e2e.mjs – Handy-Seite für den Ende-zu-Ende-Test in tests/python/test_dienst.py.
// Kernaussage: Node spielt das Handy: koppelt mit dem Kopplungstext (Argument), schickt 1 200 erfundene Herzschläge an drei Tagen,
// gleicht ein zweites Mal ohne Änderung ab, ändert einen Wert und gleicht ein drittes Mal ab, entkoppelt. Ausgabe: JSON.
import { speicherMap } from "../../kern/speicher.js";
import { syncEinrichten, syncJetzt, syncEntkoppeln } from "../../daten/sync.js";

const speicher = speicherMap();
const tage = ["2026-10-28", "2026-10-29", "2026-10-30"];
const basis = Date.UTC(2026, 9, 28, 8, 0, 0);
for (const [i, tag] of tages()) {
  const liste = Array.from({ length: 400 }, (_, j) => ({ t: basis + i * 86400000 + j * 60000, bpm: 60 + (j % 30), zoneMin: 60, quelle: { art: "demo", id: `muster:hs:${tag}:${j}` } }));
  await speicher.schreib(`messung:herzschlag:${tag}`, liste);
}
function* tages() { for (let i = 0; i < tage.length; i++) yield [i, tage[i]]; }

const kein = async () => {};
await syncEinrichten(process.argv[2], { speicher, name: "Node" });
const erster = await syncJetzt({ speicher, warte: kein });
const zweiter = await syncJetzt({ speicher, warte: kein });
const tag = await speicher.lies("messung:herzschlag:2026-10-29");
tag[5].bpm = 99;
await speicher.schreib("messung:herzschlag:2026-10-29", tag);
const dritter = await syncJetzt({ speicher, warte: kein });
const entkoppelt = await syncEntkoppeln({ speicher });
console.log(JSON.stringify({ erster, zweiter, dritter, entkoppelt }));
