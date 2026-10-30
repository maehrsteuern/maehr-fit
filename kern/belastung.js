/* kern/belastung.js – Belastung 0 bis 21.
 *
 * Kernaussage: Die Belastung zählt, wie lange und wie hoch dein Puls über den Tag war. Jeder Pulswert fällt in eine
 * von fünf Zonen – gemessen an deinem Spielraum zwischen Ruhe- und Maximalpuls (Karvonen 1957). Minuten in hohen
 * Zonen zählen mehr (Zone 5 fünffach, Edwards 1993). Die Summe wird auf die Skala 0 bis 21 gebracht, und zwar so,
 * dass doppelte Anstrengung weniger als doppelt so viele Punkte bringt (logarithmische Kurve, eigene Festlegung).
 *
 * Ohne einzelne Pulswerte (WHOOP-CSV: nur Anteile je Zone und Dauer) wird die Zeit je Zone aus Dauer × Anteil geschätzt und
 * genauso weitergerechnet; das Ergebnis trägt dann geschaetzt: true, grund "zonen_aus_prozent" (formeln.json
 * "belastung.zonen_aus_prozent").
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

/**
 * Zeit je Zone aus Anteilen (WHOOP-CSV „HR Zone 1–5 %“): ms Zone k = rund(Dauer × Anteil k ÷ 100); der Rest der Dauer zählt
 * unter Zone 1. Quelle jeder Zone mit Zeit ist die Trainingszeile.
 * @param {number[]} zonenProzent Anteile Zone 1–5 in Prozent (null/leer = 0)
 * @param {number} dauerMs
 * @param {object} [quelle]
 * @returns {{zonen:Array<{zone:number, ms:number, quelle:object[]}>, ohneZoneMs:number}}
 */
export function zeitAusProzent(zonenProzent, dauerMs, quelle) {
  const zonen = wert("belastung.zonen").map((_, i) => {
    const p = Number(zonenProzent?.[i]);
    const ms = Number.isFinite(p) && p > 0 && dauerMs > 0 ? rund((dauerMs * p) / 100) : 0;
    return { zone: i + 1, ms, quelle: ms > 0 && quelle ? [quelle] : [] };
  });
  const summe = zonen.reduce((a, z) => a + z.ms, 0);
  return { zonen, ohneZoneMs: Math.max(0, (dauerMs > 0 ? dauerMs : 0) - summe) };
}

/** Hat das Training brauchbare Pulswerte (mindestens zwei, dann gibt es eine Dauer)? */
const hatProben = (hs) => sortiert(hs).length >= 2;
/** Anteile je Zone vorhanden und Dauer positiv? */
const hatProzent = (x) => Array.isArray(x?.zonenProzent) && x.zonenProzent.some((p) => Number(p) > 0) && Number.isFinite(x.von) && Number.isFinite(x.bis) && x.bis > x.von;

/**
 * Zeit je Zone eines Trainings: aus den Pulswerten, sonst aus den Zonenanteilen (geschätzt).
 * @returns {{zonen:Array, ohneZoneMs:number, geschaetzt:boolean}}
 */
function zeitTraining(x, maxPuls, ruhepuls) {
  if (!hatProben(x.herzschlaege) && hatProzent(x)) return { ...zeitAusProzent(x.zonenProzent, x.bis - x.von, x.quelle), geschaetzt: true };
  return { ...zeitInZonen(x.herzschlaege, maxPuls, ruhepuls), geschaetzt: false };
}

/** Kennzeichen für geschätzte Ergebnisse; die Formel erklärt den Weg (ersetzt "belastung", der Kurventeil ist derselbe). */
const SCHAETZUNG = () => ({ geschaetzt: true, grund: "zonen_aus_prozent", formel: formel("belastung.zonen_aus_prozent"), formelGemessen: formel("belastung") });

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
 * Belastung einer Pulsreihe (z. B. eines Trainings). Ohne Pulswerte, aber mit zonenProzent und von/bis: geschätzt.
 * @param {{herzschlaege:Array, maxPuls:number, ruhepuls:number, zonenProzent?:number[], von?:number, bis?:number, quelle?:object}} arg
 * @returns {object|null} null, wenn Max-/Ruhepuls fehlen
 */
export function belastung({ herzschlaege, maxPuls, ruhepuls, zonenProzent, von, bis, quelle } = {}) {
  if (!pulsOk(maxPuls, ruhepuls)) return null;
  const { zonen, ohneZoneMs, geschaetzt } = zeitTraining({ herzschlaege, zonenProzent, von, bis, quelle }, maxPuls, ruhepuls);
  return ergebnis(zonen, ohneZoneMs, { maxPuls, ruhepuls, grenzen: zonenGrenzen(maxPuls, ruhepuls), geschaetzt: false, ...(geschaetzt ? SCHAETZUNG() : {}) });
}

/**
 * Belastung eines Tages: Zonenzeiten aller Trainings plus Alltag (Alltag ohne Trainingszeiten), dann einmal die
 * Kurve. Die Tagesbelastung ist daher nicht die Summe der Trainingswerte. Trainings ohne Pulswerte mit zonenProzent
 * zählen geschätzt (zeitAusProzent); dann tragen sie und der Tag geschaetzt: true.
 * @param {Array<{von:number,bis:number,art?:string,herzschlaege:Array,zonenProzent?:number[],quelle?:object}>} trainings
 * @param {Array} alltag Herzschlag[] außerhalb der Trainings
 * @param {{maxPuls:number, ruhepuls:number}} puls
 * @returns {object|null}
 */
export function belastungTag(trainings = [], alltag = [], { maxPuls, ruhepuls } = {}) {
  const tr = (trainings || []).filter(Boolean);
  // Ohne Max-/Ruhepuls geht es nur, wenn alles aus Zonenanteilen kommt (WHOOP-CSV): dann braucht die Rechnung keine Pulsgrenzen.
  const nurAnteile = tr.length > 0 && !(alltag || []).length && tr.every((x) => !hatProben(x.herzschlaege) && hatProzent(x));
  if (!pulsOk(maxPuls, ruhepuls) && !nurAnteile) return null;
  const imTraining = (t) => tr.some((x) => t >= x.von && t <= x.bis);
  const teile = tr.map((x) => ({ ...zeitTraining(x, maxPuls, ruhepuls), training: x }));
  teile.push({ ...zeitInZonen((alltag || []).filter((h) => h && !imTraining(h.t)), maxPuls, ruhepuls), geschaetzt: false, training: null });
  const zonen = wert("belastung.zonen").map((_, i) => ({
    zone: i + 1,
    ms: teile.reduce((a, p) => a + p.zonen[i].ms, 0),
    quelle: vereinige(...teile.map((p) => p.zonen[i].quelle)),
  }));
  const ohneZoneMs = teile.reduce((a, p) => a + p.ohneZoneMs, 0);
  const einzel = teile.filter((p) => p.training).map((p) => ergebnis(p.zonen, p.ohneZoneMs, {
    art: p.training.art ?? null, von: p.training.von, bis: p.training.bis,
    quellen: vereinige(p.training.quelle, p.training.weitereQuellen, ...p.zonen.map((z) => z.quelle)),
    geschaetzt: false, ...(p.geschaetzt ? SCHAETZUNG() : {}),
  }));
  return ergebnis(zonen, ohneZoneMs, {
    maxPuls, ruhepuls, grenzen: pulsOk(maxPuls, ruhepuls) ? zonenGrenzen(maxPuls, ruhepuls) : null, trainings: einzel,
    geschaetzt: false, ...(teile.some((p) => p.geschaetzt) ? SCHAETZUNG() : {}),
    alltagZonenMinuten: rund(trimpMs(teile.at(-1).zonen) / MS_MINUTE, 1),
    quellen: vereinige(...tr.map((x) => x.quelle), ...tr.map((x) => x.weitereQuellen), ...zonen.map((z) => z.quelle)),
  });
}
