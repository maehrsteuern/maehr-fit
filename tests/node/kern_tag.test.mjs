// Tests kern/tag.js – Zeitzone Europe/Berlin, Zieltag 25.10.2026 (Ende der Sommerzeit).
//
// Daten (von Hand gebaut): Hauptschlaf jeweils 23:00 → 07:00 (ohne Phasen, geschlafen = im Bett), Nächte bis zum Morgen
//   21., 22., 24., 25.10.; Nacht zum 23.10. nur 01:00 → 07:00 (6 h). Nacht zum 25.10. dauert wegen der Umstellung 9 h.
//   HRV je Nacht: 40 / 50 / 50 / 62,5 ms (21.–24.), 55 ms am 25. Ruhepuls: 56 / 58 / 58 / 60, am 25.: 57.
//   Maximalpuls 190 (Einstellung). Training 24.10. 18:00, 31 Werte im Minutentakt à 160 Schläge/min.
//
// Rechenweg 25.10.:
//   Tagesgrenzen 24.10.: 07:00 MESZ → 07:00 MEZ = 25 h.
//   Belastung 24.10.: Ruhepuls dieses Morgens 60 → Reserve 130; 160: 100 · 100 = 10 000 ≥ 70 · 130 = 9 100 (Zone 3),
//     < 80 · 130 = 10 400 → Zone 3. 30 Abstände à 60 s = 30 min · 3 = 90 Zonen-Minuten.
//     21 · ln(1 + 90/25) ÷ ln 29 = 21 · ln 4,6 ÷ 3,367296 = 21 · 1,526056 ÷ 3,367296 = 9,517 → 95 Zehntel → 9,5.
//   Schlafschuld zum 25.: Nächte 21.–24. mit Bedarf ohne Schuld 8 h (keine Belastung an den Vortagen) und Dauer 8/8/6/8 h
//     → 0 + 0 + 2 + 0 = 2 h.
//   Bedarf 25.: 8 h (28 800 000) + 9,5 min (95 · 60 000 ÷ 10 = 570 000) + 2 h · 25 % (1 800 000) = 31 170 000 ms.
//   Schlafleistung 25.: 9 h = 32 400 000 ≥ Bedarf → 100.
//   Basis HRV (ln, 21.–24.): ln 40 = 3,688879, ln 50 = 3,912023 (2×), ln 62,5 = 4,135167 → Mittel 3,912023 → 3,9120;
//     Abstände ∓0,223144, 0, 0 → Streuung √(2 · 0,049793 ÷ 3) = √0,033195 = 0,182195 → 0,1822.
//     z = (ln 55 − 3,9120) ÷ 0,1822 = (4,007333 − 3,9120) ÷ 0,1822 = 0,523234 → Beitrag 20 · 0,523234 · 0,5 = 5,23 → 5,2.
//   Basis Ruhepuls: 56, 58, 58, 60 → Mittel 58, Streuung √(8 ÷ 3) = 1,63299 → 1,633.
//     z = (57 − 58) ÷ 1,633 = −0,612370 → umgekehrt · 20 · 0,25 = 3,06 → 3,1.
//   Schlaf: z = (100 − 85) ÷ 15 = 1 → 20 · 1 · 0,25 = 5,0.
//   Erholung = 50 + 5,2 + 3,1 + 5,0 = 63,3 → 63 → gelb.
// Grenzfälle: Tag ohne jede Daten; erster Tag (keine Basislinie); alleTage über die Spanne; leeres Datenbündel.
import test from "node:test";
import assert from "node:assert/strict";
process.env.TZ = "Europe/Berlin";
const { tagAuswerten, alleTage } = await import("../../kern/tag.js");
const { lokal, plusTage, mitternacht, MS_STUNDE } = await import("../../kern/zeit.js");

const q = (id) => ({ art: "hand", id });
function daten() {
  const d = { schlaf: [], hrv: [], ruhepuls: [], training: [], herzschlag: [], tagebuch: [] };
  const naechte = [["2026-10-21", -60, 40, 56], ["2026-10-22", -60, 50, 58], ["2026-10-23", 60, 50, 58], ["2026-10-24", -60, 62.5, 60], ["2026-10-25", -60, 55, 57]];
  for (const [tag, vonMin, hrv, rp] of naechte) {
    const von = lokal(tag, vonMin), bis = lokal(tag, 420);
    d.schlaf.push({ von, bis, phasen: [], quelle: q("schlaf-" + tag) });
    d.hrv.push({ t: von + (bis - von) / 2, rmssdMs: hrv, quelle: q("hrv-" + tag) });
    d.ruhepuls.push({ t: bis - 30 * 60000, bpm: rp, quelle: q("rp-" + tag) });
  }
  const tv = lokal("2026-10-24", 18 * 60), qt = q("training-24");
  d.training.push({ von: tv, bis: tv + 30 * 60000, art: "laufen", herzschlaege: Array.from({ length: 31 }, (_, i) => ({ t: tv + i * 60000, bpm: 160, quelle: qt })), quelle: qt });
  d.tagebuch.push({ tag: "2026-10-24", eintraege: { alkohol: false }, quelle: q("tb-24") });
  return d;
}
const E = { maxPuls: 190 };

test("Handrechnung 25.10.: Erholung 63, Bedarf 31 170 000 ms, Belastung Vortag 9,5", () => {
  const T = tagAuswerten("2026-10-25", daten(), E);
  assert.equal(T.tag, "2026-10-25");
  assert.equal(T.grenzen.von, lokal("2026-10-25", 420));
  assert.equal(T.basis.hrv.mittel, 3.912);
  assert.equal(T.basis.hrv.streuung, 0.1822);
  assert.equal(T.basis.ruhepuls.mittel, 58);
  assert.equal(T.basis.ruhepuls.streuung, 1.633);
  assert.equal(T.messwerte.hrv.wert, 550);
  assert.equal(T.bedarf.ms, 31_170_000);
  assert.equal(T.bedarf.schuldMs, 2 * MS_STUNDE);
  assert.deepEqual(T.bedarf.teile.map((t) => t.ms), [28_800_000, 570_000, 1_800_000, 0]);
  assert.equal(T.schlaf.dauerMs, 9 * MS_STUNDE);
  assert.equal(T.schlaf.wert, 100);
  const teil = (n) => T.erholung.teile.find((t) => t.name === n);
  assert.deepEqual([teil("hrv").beitrag, teil("ruhepuls").beitrag, teil("schlaf").beitrag], [5.2, 3.1, 5]);
  assert.equal(T.erholung.roh, 63.3);
  assert.deepEqual([T.erholung.wert, T.erholung.stufe], [63, "gelb"]);
  assert.equal(T.belastung, null, "am 25. selbst keine Pulsdaten");
  assert.ok(T.quellen.some((x) => x.id === "hrv-2026-10-25"));
  assert.ok(T.quellen.some((x) => x.id === "training-24"), "Belastung des Vortags steckt im Bedarf");
});

test("Vortag 24.10.: 25-Stunden-Tag, Belastung 9,5, Tagebuch", () => {
  const T = tagAuswerten("2026-10-24", daten(), E);
  assert.equal(T.grenzen.bis - T.grenzen.von, 25 * MS_STUNDE);
  assert.deepEqual([T.belastung.wert, T.belastung.wertZehntel, T.belastung.zonenMinuten], [9.5, 95, 90]);
  assert.equal(T.belastung.ruhepuls, 60);
  assert.equal(T.belastung.zonen[2].ms, 30 * 60000);
  assert.equal(T.tagebuch.eintraege.alkohol, false);
  assert.equal(T.bedarfNaechsteNacht.ms, 31_170_000);
});

test("alleTage: Spanne 21.–25.10., erster Tag ohne Basislinie", () => {
  const tage = alleTage(daten(), E);
  assert.deepEqual(tage.map((t) => t.tag), ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
  assert.equal(tage[0].erholung.wert, null);
  assert.equal(tage[0].erholung.grund, "zu_wenig_daten");
  assert.equal(tage[4].erholung.wert, 63, "gleiches Ergebnis wie tagAuswerten");
  assert.equal(tage[2].schlaf.dauerMs, 6 * MS_STUNDE);
});

test("Grenzfälle: Tag ohne Daten, leeres Bündel, ungültiger Tag", () => {
  const T = tagAuswerten("2026-11-15", daten(), E);
  assert.equal(T.grenzen.von, mitternacht("2026-11-15"));
  assert.equal(T.erholung.wert, null);
  assert.equal(T.schlaf, null);
  assert.equal(T.belastung, null);
  assert.equal(T.bedarf.ms, 8 * MS_STUNDE);
  assert.deepEqual(alleTage({}), []);
  assert.equal(tagAuswerten("2026-10-25", {}).erholung.wert, null);
  assert.throws(() => tagAuswerten("25.10.2026", daten()));
  // ohne Maximalpuls und Alter: keine Belastung, Rest rechnet weiter
  const ohne = tagAuswerten("2026-10-24", daten(), {});
  assert.equal(ohne.belastung, null);
  assert.equal(plusTage("2026-10-24", 1), "2026-10-25");
});
