/* kern/belastung.js – Belastung 0 bis 21.
 *
 * Kernaussage: Die Belastung zählt, wie lange und wie hoch dein Puls über den Tag war. Jeder Pulswert fällt in eine
 * von fünf Zonen – gemessen an deinem Spielraum zwischen Ruhe- und Maximalpuls (Karvonen 1957). Minuten in hohen
 * Zonen zählen mehr (Zone 5 fünffach, Edwards 1993). Die Summe wird auf die Skala 0 bis 21 gebracht, und zwar so,
 * dass doppelte Anstrengung weniger als doppelt so viele Punkte bringt (logarithmische Kurve, eigene Festlegung).
 *
 * Ganzzahlig: Zeiten in ms, Zonenvergleich als ganzzahlige Ungleichung, Ergebnis in ganzen Zehnteln.
 * Kein DOM, kein Netz, kein Speicher.
 */
import { formel, wert } from "./formeln.js";
import { rund, rundBruch } from "./rundung.js";
import { MS_MINUTE } from "./zeit.js";
import { vereinige } from "./quellen.js";

/**
 * Maximalpuls aus dem Alter (Tanaka 2001): 208 − 0,7 × Alter, ganzzahlig in Zehnteln gerechnet.
 * @param {number} alter ganze Jahre
 * @returns {{bpm:number, formel:object}|null}
 */
export function maxPulsTanaka(alter) {
  if (!Number.isInteger(alter) || alter <= 0) return null;
  const { a_zehntel, b_zehntel } = wert("puls.max.tanaka");
  return { bpm: rundBruch(a_zehntel - b_zehntel * alter, 10), formel: formel("puls.max.tanaka") };
}

/**
 * Untergrenzen der Zonen 1–5 in Schlägen/min (zur Anzeige; gerechnet wird mit der exakten Ungleichung in zoneVon).
 * @returns {Array<{zone:number, prozent:number, abBpm:number}>}
 */
export function zonenGrenzen(maxPuls, ruhepuls) {
  const reserve = maxPuls - ruhepuls;
  return wert("belastung.zonen").map((p, i) => ({ zone: i + 1, prozent: p, abBpm: rund(ruhepuls + (p * reserve) / 100, 1) }));
}

/**
 * Zone eines Pulswerts (0 = unter Zone 1). Zone k, wenn 100 × (Puls − Ruhe) ≥ Grenze_k × (Max − Ruhe).
 * @returns {number} 0..5
 */
export function zoneVon(bpm, maxPuls, ruhepuls) {
  const reserve = maxPuls - ruhepuls, links = 100 * (bpm - ruhepuls);
  const grenzen = wert("belastung.zonen");
  let z = 0;
  for (let k = 0; k < grenzen.length; k++) if (links >= grenzen[k] * reserve) z = k + 1;
  return z;
}

/** Pulsreihe prüfen und nach Zeit sortieren (Kopie). */
const sortiert = (hs) => (hs || []).filter((h) => h && Number.isFinite(h.t) && Number.isFinite(h.bpm)).slice().sort((a, b) => a.t - b.t);

/**
 * Zeit je Zone: jeder Wert gilt bis zum nächsten, höchstens "belastung.luecke_max_ms"; der letzte zählt 0.
 * @param {Array<{t:number,bpm:number,quelle?:object}>} herzschlaege
 * @returns {{zonen:Array<{zone:number, ms:number, quelle:object[]}>, ohneZoneMs:number}}
 */
export function zeitInZonen(herzschlaege, maxPuls, ruhepuls) {
  const hs = sortiert(herzschlaege), luecke = wert("belastung.luecke_max_ms");
  const zonen = wert("belastung.zonen").map((_, i) => ({ zone: i + 1, ms: 0, quelle: [] }));
  const quellen = zonen.map(() => []);
  let ohneZoneMs = 0;
  for (let i = 0; i + 1 < hs.length; i++) {
    const ms = Math.min(luecke, hs[i + 1].t - hs[i].t);
    if (ms <= 0) continue;
    const z = zoneVon(hs[i].bpm, maxPuls, ruhepuls);
    if (z === 0) { ohneZoneMs += ms; continue; }
    zonen[z - 1].ms += ms;
    quellen[z - 1].push(hs[i].quelle);
  }
  zonen.forEach((z, i) => { z.quelle = vereinige(quellen[i]); });
  return { zonen, ohneZoneMs };
}

/** Zonen-Millisekunden gewichtet: Σ ms × Gewicht (ganzzahlig). */
export function trimpMs(zonen) {
  const g = wert("belastung.gewichte");
  return zonen.reduce((a, z) => a + z.ms * g[z.zone - 1], 0);
}

/**
 * Kurve Zonen-Minuten → Belastung in ganzen Zehnteln (formeln.json "belastung").
 * Zehntel = rund(10 × S × ln(1 + T/b) / ln(1 + Tmax/b)), höchstens 10 × S.
 * @param {number} tMs gewichtete Zonen-Millisekunden
 * @returns {number} 0..210
 */
export function kurveZehntel(tMs) {
  if (!(tMs > 0)) return 0;
  const S = wert("belastung.skala_max"), b = wert("belastung.kurve.b"), tmax = wert("belastung.kurve.tmax");
  const T = tMs / MS_MINUTE;
  return Math.min(10 * S, rund((10 * S * Math.log(1 + T / b)) / Math.log(1 + tmax / b)));
}

/** Ergebnisobjekt aus Zonen bauen. */
function ergebnis(zonen, ohneZoneMs, extra = {}) {
  const t = trimpMs(zonen), wertZehntel = kurveZehntel(t);
  return {
    wert: wertZehntel / 10, wertZehntel, zonenMinuten: rund(t / MS_MINUTE, 1), trimpMs: t, zonen, ohneZoneMs,
    formel: formel("belastung"), zonenFormel: formel("belastung.karvonen"),
    quellen: vereinige(...zonen.map((z) => z.quelle)), ...extra,
  };
}

/** Prüfen, ob Max- und Ruhepuls brauchbar sind. */
const pulsOk = (maxPuls, ruhepuls) => Number.isFinite(maxPuls) && Number.isFinite(ruhepuls) && maxPuls > ruhepuls;

/**
 * Belastung einer Pulsreihe (z. B. eines Trainings).
 * @param {{herzschlaege:Array, maxPuls:number, ruhepuls:number}} arg
 * @returns {object|null} null, wenn Max-/Ruhepuls fehlen
 */
export function belastung({ herzschlaege, maxPuls, ruhepuls } = {}) {
  if (!pulsOk(maxPuls, ruhepuls)) return null;
  const { zonen, ohneZoneMs } = zeitInZonen(herzschlaege, maxPuls, ruhepuls);
  return ergebnis(zonen, ohneZoneMs, { maxPuls, ruhepuls, grenzen: zonenGrenzen(maxPuls, ruhepuls) });
}

/**
 * Belastung eines Tages: Zonenzeiten aller Trainings plus Alltag (Alltag ohne Trainingszeiten), dann einmal die
 * Kurve. Die Tagesbelastung ist daher nicht die Summe der Trainingswerte.
 * @param {Array<{von:number,bis:number,art?:string,herzschlaege:Array,quelle?:object}>} trainings
 * @param {Array} alltag Herzschlag[] außerhalb der Trainings
 * @param {{maxPuls:number, ruhepuls:number}} puls
 * @returns {object|null}
 */
export function belastungTag(trainings = [], alltag = [], { maxPuls, ruhepuls } = {}) {
  if (!pulsOk(maxPuls, ruhepuls)) return null;
  const tr = (trainings || []).filter(Boolean);
  const imTraining = (t) => tr.some((x) => t >= x.von && t <= x.bis);
  const teile = tr.map((x) => ({ ...zeitInZonen(x.herzschlaege, maxPuls, ruhepuls), training: x }));
  teile.push({ ...zeitInZonen((alltag || []).filter((h) => h && !imTraining(h.t)), maxPuls, ruhepuls), training: null });
  const zonen = wert("belastung.zonen").map((_, i) => ({
    zone: i + 1,
    ms: teile.reduce((a, p) => a + p.zonen[i].ms, 0),
    quelle: vereinige(...teile.map((p) => p.zonen[i].quelle)),
  }));
  const ohneZoneMs = teile.reduce((a, p) => a + p.ohneZoneMs, 0);
  const einzel = teile.filter((p) => p.training).map((p) => ergebnis(p.zonen, p.ohneZoneMs, {
    art: p.training.art ?? null, von: p.training.von, bis: p.training.bis,
    quellen: vereinige(p.training.quelle, ...p.zonen.map((z) => z.quelle)),
  }));
  return ergebnis(zonen, ohneZoneMs, {
    maxPuls, ruhepuls, grenzen: zonenGrenzen(maxPuls, ruhepuls), trainings: einzel,
    alltagZonenMinuten: rund(trimpMs(teile.at(-1).zonen) / MS_MINUTE, 1),
    quellen: vereinige(...tr.map((x) => x.quelle), ...zonen.map((z) => z.quelle)),
  });
}
