/* kern/demo.js – erfundene Messwerte der „Musterperson“.
 *
 * Kernaussage: Damit die App ohne echte Gesundheitsdaten vorgeführt und getestet werden kann, erzeugt diese Datei
 * 90 Tage glaubwürdige, aber vollständig erfundene Messwerte einer Musterperson (32 Jahre). Gleicher Startwert
 * (seed) → exakt dieselben Daten. Eingebaut sind typische Muster: unter der Woche früher auf, am Wochenende länger
 * Schlaf, 2–4 Trainings je Woche, an manchen Abenden Alkohol (niedrigere HRV am Morgen danach) und eine Woche krank.
 *
 * Alle Datensätze in der Form aus docs/technik/schnittstellen.md, quelle {art: "demo", id}. Die Zahlen hier sind
 * Spielwerte zur Erzeugung (keine Rechenkonstanten der Auswertung) und stehen deshalb nicht in formeln.json.
 */
import { lokal, plusTage, wochentag, MS_MINUTE, MS_SEKUNDE } from "./zeit.js";
import { rund } from "./rundung.js";
import { maxPulsTanaka } from "./belastung.js";
import { SCHLUESSEL as TAGEBUCH } from "./tagebuch.js";

/** Musterperson (erfunden). */
export const MUSTERPERSON = { name: "Musterperson", alter: 32, ruhepulsBasis: 57, hrvBasisMs: 58, atemBasis: 14.4, spo2Basis: 96.8 };

/**
 * Zufallszahlen mit Startwert: mulberry32 (gemeinfrei, T. Ettinger). Liefert [0, 1).
 * @param {number} seed
 */
export function zufall(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.normal = (m = 0, s = 1) => { const u = 1 - r(), v = r(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  r.ja = (p) => r() < p;
  r.zwischen = (a2, b2) => a2 + Math.floor(r() * (b2 - a2 + 1));
  return r;
}

/** Fisher-Yates-Mischen (deterministisch mit r, in jeder JS-Umgebung gleich). */
function mische(r, liste) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Trainingsarten mit Spielwerten: Dauer (min), Anteil Pulsreserve, Wirkung auf ln HRV in der Nacht danach. */
const ARTEN = {
  laufen: { dauer: [35, 55], hrr: 0.70, hrvLn: -0.05 },
  intervalle: { dauer: [40, 45], hrr: 0.62, hrvLn: -0.09 },
  kraft: { dauer: [45, 60], hrr: 0.52, hrvLn: -0.03 },
  rad: { dauer: [75, 110], hrr: 0.64, hrvLn: -0.08 },
};

/** Pulsreihe eines Trainings (alle 10 s). */
function trainingsPuls(r, art, von, minuten, ruhe, max, quelle) {
  const hs = [], schritte = (minuten * MS_MINUTE) / (10 * MS_SEKUNDE), res = max - ruhe;
  for (let i = 0; i <= schritte; i++) {
    const min = (i * 10) / 60;
    let p = ARTEN[art].hrr;
    if (art === "intervalle" && min >= 10 && min < 35) p = (min - 10) % 5 < 3 ? 0.88 : 0.6;
    if (art === "kraft" && Math.floor(min) % 6 < 1) p = 0.66;
    const anlauf = Math.min(1, min / 5), auslauf = Math.min(1, (minuten - min) / 4);
    const ziel = ruhe + 25 + (p * res - 25) * Math.min(anlauf, auslauf + 0.2);
    hs.push({ t: von + i * 10 * MS_SEKUNDE, bpm: Math.max(ruhe, rund(r.normal(ziel, 3))), quelle });
  }
  return hs;
}

/** Alltagspuls eines Tages (alle 2 min, aktive Abschnitte alle 30 s), ohne Trainingszeiten. */
function alltagsPuls(r, tag, aufMin, bettMin, ruhe, max, wochenende, krank, training, quelle) {
  const hs = [], abschnitte = [];
  if (!wochenende && !krank && r.ja(0.6)) abschnitte.push([8 * 60, 8 * 60 + 20, 0.5], [17 * 60 + 30, 17 * 60 + 50, 0.52]); // Rad zur Arbeit
  if (wochenende && !krank && r.ja(0.5)) abschnitte.push([15 * 60, 15 * 60 + 45, 0.42]);                                  // Spaziergang
  if (!krank) for (let k = 0; k < 3; k++) { const a = r.zwischen(aufMin + 60, Math.max(aufMin + 61, bettMin - 120)); abschnitte.push([a, a + 3, 0.5]); } // Treppen, Wege
  const aktiv = (m) => abschnitte.find(([a, b]) => m >= a && m < b);
  for (let m = aufMin; m < bettMin;) {
    const t = lokal(tag, m);
    const ab = aktiv(m);
    if (!(training && t >= training.von && t <= training.bis)) {
      const ziel = ab ? ruhe + ab[2] * (max - ruhe) + 10 : ruhe + 16 + (krank ? 8 : 0);
      hs.push({ t, bpm: rund(r.normal(ziel, ab ? 4 : 6)), quelle });
    }
    m += ab ? 0.5 : 2;
  }
  return hs;
}

/** Schlafphasen in Zyklen von etwa 90 Minuten. */
function phasen(r, von, bis, alkohol) {
  const ph = [];
  let t = von;
  const add = (art, min) => { const ende = Math.min(bis, t + rund(min * MS_MINUTE)); if (ende > t) ph.push({ von: t, bis: ende, art }); t = ende; };
  add("wach", alkohol ? r.zwischen(4, 8) : r.zwischen(8, 18));
  for (let z = 0; t < bis; z++) {
    add("leicht", r.zwischen(20, 30));
    add("tief", Math.max(5, 35 - z * 8 + r.zwischen(-4, 4) - (alkohol && z > 1 ? 5 : 0)));
    add("leicht", r.zwischen(10, 18));
    add("rem", Math.min(40, 10 + z * 7 + r.zwischen(-3, 3) - (alkohol ? 6 : 0)));
    if (r.ja(alkohol ? 0.55 : 0.25)) add("wach", r.zwischen(2, 7));
  }
  return ph;
}

/**
 * Demodaten erzeugen.
 * @param {{tage?:number, seed?:number, bis?:string}} [opt] bis = letzter Tag (Standard 2026-10-30)
 * @returns {{person:object, einstellungen:object, herzschlag:object[], hrv:object[], ruhepuls:object[], atemfrequenz:object[],
 *   spo2:object[], hauttemp:object[], schlaf:object[], training:object[], tagebuch:object[]}}
 */
export function demoDaten({ tage = 90, seed = 20261030, bis = "2026-10-30" } = {}) {
  const r = zufall(seed), P = MUSTERPERSON, max = maxPulsTanaka(P.alter).bpm;
  const start = plusTage(bis, -(tage - 1));
  const krankVon = tage >= 30 ? Math.floor(tage * 0.6) : -1;
  const istKrank = (i) => i >= krankVon && i < krankVon + 7 && krankVon >= 0;
  const D = { herzschlag: [], hrv: [], ruhepuls: [], atemfrequenz: [], spo2: [], hauttemp: [], schlaf: [], training: [], tagebuch: [] };
  const q = (id) => ({ art: "demo", id: "demo-" + id });

  // Trainingstage je Woche: 2–4 zufällig gewählte Tage
  const plan = new Map();
  for (let i = 0; i < tage; i++) {
    const tag = plusTage(start, i);
    if (wochentag(tag) !== 0 && i !== 0) continue;
    const anzahl = r.zwischen(2, 4), tageDerWoche = mische(r, [0, 2, 4, 5, 6, 1, 3]).slice(0, anzahl);
    for (const w of tageDerWoche) { const d = plusTage(tag, w - wochentag(tag)); if (d >= start) plan.set(d, true); }
  }

  let vorabend = { alkohol: false, bildschirm: false, mahlzeit: false, meditation: false, stress: false, hrvLn: 0, bettMin: -60 };
  for (let i = 0; i < tage; i++) {
    const tag = plusTage(start, i), wt = wochentag(tag), wochenende = wt >= 5, krank = istKrank(i);
    // --- Nacht, die am Morgen von `tag` endet ---
    const aufMin = krank ? r.zwischen(500, 560) : wochenende ? rund(r.normal(525, 35)) : rund(r.normal(405, 8));
    const bettMin = vorabend.bettMin, nVon = lokal(tag, bettMin), nBis = lokal(tag, aufMin);
    const ph = phasen(r, nVon, nBis, vorabend.alkohol);
    D.schlaf.push({ von: nVon, bis: nBis, phasen: ph, quelle: q("schlaf-" + tag) });
    const lnHrv = Math.log(P.hrvBasisMs) + 0.04 * Math.sin(i / 9) + r.normal(0, 0.08) + vorabend.hrvLn
      + (vorabend.alkohol ? -0.2 : 0) + (vorabend.mahlzeit ? -0.04 : 0) + (vorabend.stress ? -0.05 : 0) + (vorabend.meditation ? 0.03 : 0) + (krank ? -0.25 : 0);
    for (let k = 1; k <= 3; k++) {
      D.hrv.push({ t: nVon + rund(((nBis - nVon) * k) / 4), rmssdMs: rund(Math.exp(lnHrv + r.normal(0, 0.05)), 1), quelle: q(`hrv-${tag}-${k}`) });
    }
    const rhr = P.ruhepulsBasis + r.normal(0, 1.3) + (vorabend.alkohol ? 4 : 0) + (vorabend.mahlzeit ? 1.5 : 0) + (vorabend.hrvLn < -0.06 ? 1.5 : 0) + (krank ? 6 : 0);
    D.ruhepuls.push({ t: nBis - 60 * MS_MINUTE, bpm: rund(rhr), quelle: q("ruhepuls-" + tag) });
    const mitte = nVon + rund((nBis - nVon) / 2);
    D.atemfrequenz.push({ t: mitte, proMin: rund(P.atemBasis + r.normal(0, 0.3) + (krank ? 1.8 : 0) + (vorabend.alkohol ? 0.4 : 0), 1), quelle: q("atem-" + tag) });
    D.spo2.push({ t: mitte, prozent: Math.min(99.5, rund(P.spo2Basis + r.normal(0, 0.5) - (krank ? 1.6 : 0), 1)), quelle: q("spo2-" + tag) });
    D.hauttemp.push({ t: mitte, deltaC: rund(r.normal(0, 0.12) + (krank ? 0.6 + 0.3 * Math.sin(((i - krankVon) / 6) * Math.PI) : 0) + (vorabend.alkohol ? 0.15 : 0), 2), quelle: q("hauttemp-" + tag) });

    // --- Tag ---
    const ruhe = rund(rhr);
    let training = null, hrvLn = 0;
    if (plan.get(tag) && !krank && !istKrank(i + 1)) {
      const art = wochenende ? (r.ja(0.6) ? "rad" : "laufen") : ["laufen", "intervalle", "kraft"][r.zwischen(0, 2)];
      const min = r.zwischen(...ARTEN[art].dauer), beginnMin = wochenende ? rund(r.normal(600, 30)) : rund(r.normal(1110, 15));
      const von = lokal(tag, beginnMin), quelle = q("training-" + tag);
      training = { von, bis: von + min * MS_MINUTE, art, herzschlaege: trainingsPuls(r, art, von, min, ruhe, max, quelle), quelle };
      D.training.push(training);
      hrvLn = ARTEN[art].hrvLn;
    }
    const freitagSamstag = wt === 4 || wt === 5;
    const e = {
      alkohol: !krank && r.ja(freitagSamstag ? 0.45 : 0.07),
      koffein_spaet: r.ja(0.15), bildschirm_spaet: r.ja(wochenende ? 0.5 : 0.35), spaete_mahlzeit: r.ja(0.2),
      meditation: r.ja(0.3), atemuebung: r.ja(0.25), kaltdusche: !krank && r.ja(0.15), sauna: !krank && r.ja(0.05),
      lesen: r.ja(0.4), stress: !wochenende && r.ja(0.25), krank, reisen: r.ja(0.02),
    };
    const eintraege = {};
    for (const k of TAGEBUCH) eintraege[k] = !!e[k];
    D.tagebuch.push({ tag, eintraege, quelle: q("tagebuch-" + tag) });
    const morgenWe = wochentag(plusTage(tag, 1)) >= 5;
    const bettAbend = rund(r.normal(morgenWe ? 0 : -85, morgenWe ? 35 : 20)) + (e.alkohol ? 30 : 0) + (e.bildschirm_spaet ? 20 : 0) - (krank ? 45 : 0);
    D.herzschlag.push(...alltagsPuls(r, tag, aufMin, 24 * 60 + bettAbend, ruhe, max, wochenende, krank, training, q("puls-" + tag)));
    // Nickerchen am Wochenende
    if (wochenende && !krank && r.ja(0.12)) {
      const nv = lokal(tag, 14 * 60), nb = nv + 25 * MS_MINUTE;
      D.schlaf.push({ von: nv, bis: nb, phasen: [{ von: nv, bis: nb, art: "leicht" }], quelle: q("nickerchen-" + tag) });
    }
    vorabend = { alkohol: e.alkohol, bildschirm: e.bildschirm_spaet, mahlzeit: e.spaete_mahlzeit, meditation: e.meditation, stress: e.stress, hrvLn, bettMin: bettAbend };
  }
  const ende = lokal(plusTage(bis, 1), 0); // nichts nach dem letzten Tag
  D.herzschlag = D.herzschlag.filter((h) => h.t < ende && !D.schlaf.some((s) => h.t >= s.von && h.t < s.bis));
  return { person: { ...P, maxPuls: max }, einstellungen: { alter: P.alter, maxPuls: max }, ...D };
}
