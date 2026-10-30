// Tests kern/demo.js – erfundene Musterperson (32 J., Maximalpuls Tanaka: 208 − 0,7 · 32 = 185,6 → 186).
// Fall 1: gleicher Startwert → identische Daten; anderer Startwert → andere Daten.
// Fall 2: Form nach schnittstellen.md, jede quelle {art: "demo", id}; 90 Hauptschlafphasen und 90 Tagebuchtage.
// Fall 3: Muster erkennbar – 2–4 Trainings je voller Woche (Krankheitswoche ausgenommen); nach Alkohol niedrigere Erholung
//   (tagebuchWirkung, aussagekräftig); Krankheitswoche deutlich niedriger als der Durchschnitt; Wochenende länger Schlaf.
import test from "node:test";
import assert from "node:assert/strict";
process.env.TZ = "Europe/Berlin";
const { demoDaten, zufall } = await import("../../kern/demo.js");
const { alleTage } = await import("../../kern/tag.js");
const { tagebuchWirkung } = await import("../../kern/tagebuch.js");
const { isoTag, isoWoche, wochentag } = await import("../../kern/zeit.js");

const D = demoDaten({ tage: 90, seed: 7 });
const TAGE = alleTage(D, D.einstellungen);

test("deterministisch mit Startwert", () => {
  assert.deepEqual(JSON.stringify(demoDaten({ tage: 20, seed: 7 })), JSON.stringify(demoDaten({ tage: 20, seed: 7 })));
  assert.notDeepEqual(demoDaten({ tage: 20, seed: 7 }).hrv[0].rmssdMs, demoDaten({ tage: 20, seed: 8 }).hrv[0].rmssdMs);
  const r = zufall(1), r2 = zufall(1);
  assert.equal(r(), r2());
});

test("Form und Quellen", () => {
  assert.equal(D.person.name, "Musterperson");
  assert.deepEqual([D.person.alter, D.einstellungen.maxPuls], [32, 186]);
  for (const k of ["herzschlag", "hrv", "ruhepuls", "atemfrequenz", "spo2", "hauttemp", "schlaf", "training", "tagebuch"]) {
    assert.ok(D[k].length > 0, k);
    for (const x of D[k].slice(0, 50)) assert.ok(x.quelle?.art === "demo" && typeof x.quelle.id === "string", k);
  }
  for (const h of D.hrv) assert.ok(Number.isFinite(h.t) && h.rmssdMs > 10 && h.rmssdMs < 200);
  for (const s of D.schlaf) {
    assert.ok(s.bis > s.von);
    for (let i = 0; i < s.phasen.length; i++) {
      const p = s.phasen[i];
      assert.ok(p.von >= s.von && p.bis <= s.bis && ["wach", "leicht", "tief", "rem"].includes(p.art));
      if (i) assert.equal(p.von, s.phasen[i - 1].bis, "Phasen lückenlos");
    }
  }
  for (const t of D.training) assert.ok(t.herzschlaege.length > 100 && t.bis > t.von && t.art);
  assert.equal(D.tagebuch.length, 90);
  assert.equal(TAGE.length, 90);
  assert.equal(TAGE.filter((t) => t.schlaf).length, 90);
  assert.equal(TAGE.at(-1).tag, "2026-10-30");
});

test("Trainingsmuster: 2–4 je volle Woche außerhalb der Krankheitswoche", () => {
  const krank = new Set(D.tagebuch.filter((x) => x.eintraege.krank).map((x) => isoWoche(x.tag)));
  assert.ok(krank.size >= 1);
  const jeWoche = new Map();
  for (const t of D.tagebuch) jeWoche.set(isoWoche(t.tag), 0);
  for (const t of D.training) { const w = isoWoche(isoTag(t.von)); jeWoche.set(w, (jeWoche.get(w) || 0) + 1); }
  const voll = [...jeWoche.keys()].filter((w) => D.tagebuch.filter((x) => isoWoche(x.tag) === w).length === 7);
  for (const w of voll) {
    const n = jeWoche.get(w);
    assert.ok(n <= 4, w);
    if (!krank.has(w)) assert.ok(n >= 1, w + ": " + n);
  }
  const mittel = voll.reduce((a, w) => a + jeWoche.get(w), 0) / voll.length;
  assert.ok(mittel >= 2 && mittel <= 4, "Mittel " + mittel);
});

test("Muster in den Auswertungen sichtbar", () => {
  const alk = tagebuchWirkung(TAGE, "alkohol");
  assert.ok(alk.aussagekraeftig, "genug Alkoholabende");
  assert.ok(alk.differenz < -5, "Erholung nach Alkohol niedriger: " + alk.differenz);
  const e = TAGE.map((t) => t.erholung.wert).filter(Number.isFinite);
  const mittel = e.reduce((a, b) => a + b, 0) / e.length;
  assert.ok(mittel > 35 && mittel < 65, "Mittel " + mittel);
  const krank = TAGE.filter((t) => t.tagebuch?.eintraege.krank).map((t) => t.erholung.wert);
  assert.equal(krank.length, 7);
  assert.ok(krank.reduce((a, b) => a + b, 0) / krank.length < mittel - 15);
  const stufen = new Set(TAGE.map((t) => t.erholung.stufe));
  for (const s of ["gruen", "gelb", "rot"]) assert.ok(stufen.has(s), s);
  const dauer = (we) => { const xs = TAGE.filter((t) => (wochentag(t.tag) >= 5) === we && !t.tagebuch?.eintraege.krank).map((t) => t.schlaf.dauerMs); return xs.reduce((a, b) => a + b, 0) / xs.length; };
  assert.ok(dauer(true) > dauer(false), "am Wochenende länger Schlaf");
  const b = TAGE.map((t) => t.belastung?.wert ?? 0);
  assert.ok(Math.max(...b) > 10 && Math.max(...b) < 21);
});

test("kurze Zeiträume und Standardwerte", () => {
  const k = demoDaten({ tage: 10 });
  assert.equal(k.tagebuch.length, 10);
  assert.ok(!k.tagebuch.some((x) => x.eintraege.krank), "Krankheitswoche erst ab 30 Tagen");
  assert.equal(demoDaten().tagebuch.at(-1).tag, "2026-10-30");
});
