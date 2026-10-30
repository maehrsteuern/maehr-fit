// Ablage der normierten Messwerte im Speicher.
// Schlüssel: "messung:<art>:<JJJJ-MM-TT>" → Array von Datensätzen dieser Art an diesem Tag.
// Doppelte Datensätze (gleiche quelle.id) werden ersetzt, nicht verdoppelt.
// Der Speicher kommt von außen (Schnittstelle kern/speicher.js: lies, schreib, liste).

import { tagIso } from "./zeit.js";

/** Alle Arten eines Messpakets, in fester Reihenfolge. */
export const ARTEN = [
  "herzschlag", "hrv", "ruhepuls", "atemfrequenz", "spo2", "hauttemp", "schlaf", "training", "tagebuch", "fremdwerte",
];

/** Leeres Messpaket: { herzschlag: [], hrv: [], … }. */
export function leeresPaket() {
  return Object.fromEntries(ARTEN.map((a) => [a, []]));
}

/** Pakete zusammenlegen (ohne Abgleich, der passiert beim Ablegen). */
export function paketeVereinen(...pakete) {
  const ziel = leeresPaket();
  for (const p of pakete) {
    if (!p) continue;
    for (const a of ARTEN) if (Array.isArray(p[a])) ziel[a].push(...p[a]);
  }
  return ziel;
}

/** Anzahl Datensätze in einem Paket. */
export function paketGroesse(paket) {
  return ARTEN.reduce((s, a) => s + (paket[a] ? paket[a].length : 0), 0);
}

/** Bezugszeitpunkt eines Datensatzes für Tag und Sortierung. Schlaf zählt zum Tag des Aufwachens. */
export function bezugszeit(art, d) {
  if (art === "schlaf") return d.bis;
  if (art === "training") return d.von;
  if (art === "tagebuch" || art === "fremdwerte") return null;
  return d.t;
}

/** Kalendertag eines Datensatzes. */
export function tagVon(art, d, zoneMin) {
  if (art === "tagebuch" || art === "fremdwerte") return d.tag;
  const z = typeof d.zoneMin === "number" ? d.zoneMin : zoneMin;
  return tagIso(bezugszeit(art, d), z);
}

export function schluessel(art, tag) {
  return `messung:${art}:${tag}`;
}

/** Sortierung innerhalb eines Tages: Schlaf nach Einschlafen, sonst nach Bezugszeit. */
function sortierwert(art, d) {
  if (art === "schlaf") return d.von;
  const z = bezugszeit(art, d);
  return z === null ? 0 : z;
}

/**
 * Messpaket ablegen. Gleiche quelle.id ersetzt den alten Datensatz.
 * @param {{lies:Function, schreib:Function}} speicher
 * @param {object} paket
 * @param {{zoneMin?:number}} [optionen]
 * @returns {Promise<{neu:number, ersetzt:number, schluessel:string[], neuPaket:object}>} neuPaket = nur die neuen Datensätze
 */
export async function speichereMessungen(speicher, paket, optionen = {}) {
  const gruppen = new Map();
  for (const art of ARTEN) {
    for (const d of paket[art] || []) {
      const tag = tagVon(art, d, optionen.zoneMin);
      if (!tag) continue;
      const k = schluessel(art, tag);
      if (!gruppen.has(k)) gruppen.set(k, { art, liste: [] });
      gruppen.get(k).liste.push(d);
    }
  }
  let neu = 0;
  let ersetzt = 0;
  const neuPaket = leeresPaket();
  for (const [k, { art, liste }] of gruppen) {
    const alt = (await speicher.lies(k)) || [];
    const nachId = new Map();
    for (const d of alt) nachId.set(d.quelle && d.quelle.id, d);
    for (const d of liste) {
      const id = d.quelle && d.quelle.id;
      if (nachId.has(id)) ersetzt += 1;
      else {
        neu += 1;
        neuPaket[art].push(d);
      }
      nachId.set(id, d);
    }
    const ergebnis = [...nachId.values()].sort((a, b) => sortierwert(art, a) - sortierwert(art, b));
    await speicher.schreib(k, ergebnis);
  }
  return { neu, ersetzt, schluessel: [...gruppen.keys()].sort(), neuPaket };
}

/** Alle Datensätze einer Art lesen (optional nur Tage von…bis, jeweils "JJJJ-MM-TT", einschließlich). */
export async function leseMessungen(speicher, art, vonTag, bisTag) {
  const praefix = `messung:${art}:`;
  const schluesselListe = (await speicher.liste(praefix)).sort();
  const aus = [];
  for (const k of schluesselListe) {
    const tag = k.slice(praefix.length);
    if (vonTag && tag < vonTag) continue;
    if (bisTag && tag > bisTag) continue;
    const wert = await speicher.lies(k);
    if (Array.isArray(wert)) aus.push(...wert);
  }
  return aus;
}
