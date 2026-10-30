// Tests kern/schlaf.js – Zeitzone Europe/Berlin.
//
// Fall 1 (Handrechnung Schlafleistung): im Bett 29.10. 23:00 → 30.10. 07:00 = 480 min. Phasen: wach 20, leicht 120,
//   tief 90, rem 90, wach 10, leicht 150 → wach 30, leicht 270, tief 90, rem 90; geschlafen 450 min = 27 000 000 ms.
//   Bedarf 8 h = 28 800 000 ms → Leistung = 27 000 000 · 100 ÷ 28 800 000 = 93,75 → 94. Schuld 30 min = 1 800 000 ms.
//   Effizienz = 450 ÷ 480 = 937,5 ‰ → 938 ‰ (≥ 850 ‰ = gut). Anteile: wach 30/480 = 62,5 → 63 ‰; leicht 562,5 → 563;
//   tief 187,5 → 188; rem 188 (jeder Anteil einzeln gerundet).
// Fall 2 (Handrechnung Konsistenz): frühere Einschlafzeiten 22:00, 22:30, 23:00 → −120, −90, −60 min um Mitternacht;
//   Mittel −90. Heute 23:00 = −60 → Abweichung 30 min → 100 − 30 · 100 ÷ 120 = 100 − 25 = 75.
// Fall 3 (Handrechnung Bedarf): Grundbedarf 28 800 000 + Belastung 12,5 (125 Zehntel · 60 000 ÷ 10 = 750 000)
//   + Schuld 1 h · 250 ‰ = 900 000 − Nickerchen 20 min (1 200 000) = 29 250 000 ms = 8 h 7,5 min → angezeigt 8 h 8 min.
// Fall 4 (Handrechnung Schuld): Nächte (Bedarf/Dauer) 8/7, 8/9, 8/6,5 h → +1 − 1 + 1,5 = 1,5 h = 5 400 000 ms.
// Grenzfälle: keine Nacht, keine Phasen, Bedarf 0, mehr geschlafen als Bedarf, Überschuss statt Schuld, Schuld nur 7 Nächte.
import test from "node:test";
import assert from "node:assert/strict";
process.env.TZ = "Europe/Berlin";
const { schlafLeistung, schlafBedarf, schlafSchuld, schlafKonsistenz, einschlafMinute, schlafZusammenfassung } = await import("../../kern/schlaf.js");
const { lokal, dauer, MS_STUNDE, MS_MINUTE } = await import("../../kern/zeit.js");

const T = "2026-10-30";
const ab = (min) => lokal(T, min); // Minuten relativ zu Mitternacht des 30.10.
function nacht() {
  const stuecke = [["wach", 20], ["leicht", 120], ["tief", 90], ["rem", 90], ["wach", 10], ["leicht", 150]];
  let t = -60; const phasen = [];
  for (const [art, min] of stuecke) { phasen.push({ von: ab(t), bis: ab(t + min), art }); t += min; }
  return { von: ab(-60), bis: ab(420), phasen, quelle: { art: "hand", id: "nacht-1" } };
}
const frueher = (min, tageZurueck) => ({ von: lokal("2026-10-" + String(30 - tageZurueck), min), bis: lokal("2026-10-" + String(30 - tageZurueck), 420) });

test("Handrechnung Schlafleistung 94, Effizienz 938 ‰", () => {
  const s = schlafLeistung({ schlaf: nacht(), bedarf: 8 * MS_STUNDE });
  assert.equal(s.dauerMs, 27_000_000);
  assert.equal(s.imBettMs, 28_800_000);
  assert.equal(s.wert, 94);
  assert.equal(s.schuld, 1_800_000);
  assert.deepEqual(s.phasen, { wach: 30 * MS_MINUTE, leicht: 270 * MS_MINUTE, tief: 90 * MS_MINUTE, rem: 90 * MS_MINUTE });
  assert.deepEqual(s.anteile, { wach: 63, leicht: 563, tief: 188, rem: 188 });
  assert.deepEqual([s.effizienz.promille, s.effizienz.gut], [938, true]);
  assert.equal(s.formel.schluessel, "schlaf.leistung");
  assert.deepEqual(s.quellen.map((q) => q.id), ["nacht-1"]);
  assert.equal(s.konsistenz, null, "ohne frühere Nächte keine Konsistenz");
});

test("Handrechnung Konsistenz 75", () => {
  assert.equal(einschlafMinute(nacht()), -60);
  assert.equal(einschlafMinute({ von: lokal(T, 45) }), 45);
  const k = schlafKonsistenz(nacht(), [frueher(-120, 3), frueher(-90, 2), frueher(-60, 1)]);
  assert.deepEqual([k.mittelMin, k.abweichungMin, k.wert, k.n], [-90, 30, 75, 3]);
  const weit = schlafKonsistenz(nacht(), [frueher(-240, 1)]);
  assert.equal(weit.wert, 0, "3 h Abweichung → nicht unter 0");
});

test("Handrechnung Schlafbedarf 29 250 000 ms", () => {
  const b = schlafBedarf({ basis: 8 * MS_STUNDE, belastungGestern: 12.5, schuld: MS_STUNDE, nickerchen: 20 * MS_MINUTE });
  assert.equal(b.ms, 29_250_000);
  assert.deepEqual(b.teile.map((t) => [t.name, t.ms]), [["basis", 28_800_000], ["belastung", 750_000], ["schuld", 900_000], ["nickerchen", -1_200_000]]);
  assert.deepEqual(dauer(b.ms), { h: 8, min: 8, negativ: false, gesamtMin: 488 });
  // gleiche Belastung als Ergebnisobjekt und Nickerchen als Schlaf[]
  const nap = { von: 0, bis: 20 * MS_MINUTE, phasen: [{ von: 0, bis: 20 * MS_MINUTE, art: "leicht" }], quelle: { art: "hand", id: "nap" } };
  const b2 = schlafBedarf({ belastungGestern: { wertZehntel: 125, quellen: [{ art: "hand", id: "b" }] }, schuld: MS_STUNDE, nickerchen: [nap] });
  assert.equal(b2.ms, 29_250_000);
  assert.deepEqual(b2.quellen.map((q) => q.id), ["b", "nap"]);
});

test("Handrechnung Schlafschuld 1,5 h", () => {
  const h = MS_STUNDE;
  assert.equal(schlafSchuld([{ bedarfMs: 8 * h, dauerMs: 7 * h }, { bedarfMs: 8 * h, dauerMs: 9 * h }, { bedarfMs: 8 * h, dauerMs: 6.5 * h }]), 5_400_000);
  assert.equal(schlafSchuld([{ bedarfMs: 8 * h, dauerMs: 10 * h }]), 0, "Überschuss ergibt keine negative Schuld");
  const neun = Array.from({ length: 9 }, () => ({ bedarfMs: 8 * h, dauerMs: 7 * h }));
  assert.equal(schlafSchuld(neun), 7 * h, "nur die letzten 7 Nächte");
  assert.equal(schlafSchuld(), 0);
});

test("Grenzfälle Schlafleistung", () => {
  assert.equal(schlafLeistung({}), null);
  assert.equal(schlafLeistung({ schlaf: { von: 10, bis: 5 } }), null);
  const ohne = schlafLeistung({ schlaf: { von: 0, bis: 9 * MS_STUNDE }, bedarf: 8 * MS_STUNDE });
  assert.deepEqual([ohne.wert, ohne.dauerMs, ohne.effizienz, ohne.schuld], [100, 9 * MS_STUNDE, null, 0]);
  assert.equal(schlafLeistung({ schlaf: nacht(), bedarf: 0 }).wert, 100);
  assert.equal(schlafLeistung({ schlaf: nacht() }).bedarfMs, 8 * MS_STUNDE, "Standardbedarf aus formeln.json");
  assert.equal(schlafBedarf({ nickerchen: 20 * MS_STUNDE }).ms, 0, "nicht unter 0");
  assert.equal(schlafZusammenfassung({ von: 0, bis: 100, phasen: [{ von: 0, bis: 100, art: "unbekannt" }] }).dauerMs, 0);
});
