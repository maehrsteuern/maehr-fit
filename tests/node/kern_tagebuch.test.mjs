// Tests kern/tagebuch.js.
//
// Fall 1 (Handrechnung): Verhalten am Abend → Erholung am nächsten Morgen.
//   1.10. Alkohol ja, Erholung 50 | 2.10. nein, 40 | 3.10. ja, 60 | 4.10. kein Eintrag, 30 | 5.10. nein, 70 | 6.10. –, 80.
//   Paare (Vortag → Tag): 1.→2. mit: 40; 2.→3. ohne: 60; 3.→4. mit: 30; 4.→5. kein Eintrag, zählt nicht; 5.→6. ohne: 80.
//   mit: (40 + 30) ÷ 2 = 35, n 2; ohne: (60 + 80) ÷ 2 = 70, n 2; Differenz 35 − 70 = −35.
//   n < 5 je Gruppe → nicht aussagekräftig, Hinweis nennt Mindestzahl und „kein Beweis“.
// Fall 2 (genug Tage): Abende 1.–12.10. abwechselnd ja/nein, Erholung nach „ja“ 40, nach „nein“ 60 → mit 40 (n 6),
//   ohne 60 (n 6), Differenz −20; je Gruppe ≥ 5 → aussagekräftig.
// Grenzfälle: leere Liste, Lücke im Kalender (Vortag fehlt), Zahleneinträge (2 Getränke = mit, 0 = ohne), Erholung als Objekt.
import test from "node:test";
import assert from "node:assert/strict";
import { tagebuchWirkung, KATALOG, gruppe } from "../../kern/tagebuch.js";
import { plusTage } from "../../kern/zeit.js";

const tag = (t, e, alkohol) => ({ tag: t, erholung: e, tagebuch: alkohol === undefined ? null : { eintraege: { alkohol }, quelle: { art: "hand", id: "tb-" + t } } });

test("Handrechnung: mit 35, ohne 70, Differenz −35, zu wenige Tage", () => {
  const tage = [tag("2026-10-01", 50, true), tag("2026-10-02", 40, false), tag("2026-10-03", 60, true), tag("2026-10-04", 30),
    tag("2026-10-05", 70, false), tag("2026-10-06", 80)];
  const w = tagebuchWirkung(tage, "alkohol");
  assert.deepEqual(w.mit, { mittel: 35, n: 2 });
  assert.deepEqual(w.ohne, { mittel: 70, n: 2 });
  assert.equal(w.differenz, -35);
  assert.equal(w.aussagekraeftig, false);
  assert.match(w.hinweis, /mindestens 5/);
  assert.match(w.hinweis, /keinen Beweis/);
  assert.equal(w.hinweisSchluessel, "tagebuch.hinweis.zu_wenig");
  assert.deepEqual(w.paare.map((p) => [p.tagVerhalten, p.gruppe]), [["2026-10-01", "mit"], ["2026-10-02", "ohne"], ["2026-10-03", "mit"], ["2026-10-05", "ohne"]]);
  assert.equal(w.formel.schluessel, "tagebuch.wirkung");
  assert.ok(w.quellen.some((q) => q.id === "tb-2026-10-01"));
});

test("genug Tage: aussagekräftiger Vergleich, Text beschreibt nur", () => {
  // 13 Tage ab 1.10.: Abende 1.–12. abwechselnd ja (ungerade) / nein; Erholung am Folgetag 40 nach ja, 60 nach nein.
  const tage = [];
  for (let i = 0; i < 13; i++) {
    const vortagJa = i > 0 && (i - 1) % 2 === 0;
    tage.push(tag(plusTage("2026-10-01", i), i === 0 ? 50 : vortagJa ? 40 : 60, i % 2 === 0));
  }
  const w = tagebuchWirkung(tage, "alkohol");
  assert.deepEqual([w.mit.n, w.ohne.n], [6, 6]);
  assert.deepEqual([w.mit.mittel, w.ohne.mittel, w.differenz], [40, 60, -20]);
  assert.equal(w.aussagekraeftig, true);
  assert.equal(w.hinweis, "Deine Erholung am Morgen danach war im Mittel 20 Punkte niedriger. Das zeigt einen Zusammenhang, keinen Beweis.");
});

test("Grenzfälle", () => {
  const leer = tagebuchWirkung([], "alkohol");
  assert.deepEqual([leer.mit.n, leer.ohne.n, leer.differenz, leer.mit.mittel], [0, 0, null, null]);
  // Lücke: 3.10. fehlt → 4.10. hat keinen Vortag
  const luecke = tagebuchWirkung([tag("2026-10-02", 50, true), tag("2026-10-04", 70, true)], "alkohol");
  assert.equal(luecke.mit.n, 0);
  // Zahlen und Erholung als Objekt
  const z = tagebuchWirkung([
    { tag: "2026-10-01", erholung: { wert: 50 }, tagebuch: { eintraege: { alkohol: 2 } } },
    { tag: "2026-10-02", erholung: { wert: 44, quellen: [] }, tagebuch: { eintraege: { alkohol: 0 } } },
    { tag: "2026-10-03", erholung: { wert: null } },
    { tag: "2026-10-04", erholung: 61, eintraege: {} },
  ], "alkohol");
  assert.deepEqual([z.mit.mittel, z.mit.n, z.ohne.n], [44, 1, 0]);
  assert.deepEqual([gruppe(true), gruppe(3), gruppe(false), gruppe(0), gruppe(undefined), gruppe("ja")], ["mit", "mit", "ohne", "ohne", null, null]);
  assert.ok(KATALOG.length >= 10);
  for (const k of ["alkohol", "koffein_spaet", "bildschirm_spaet", "spaete_mahlzeit", "meditation", "kaltdusche", "krank", "reisen", "lesen", "stress"]) {
    assert.ok(KATALOG.some((x) => x.schluessel === k), k);
  }
});
