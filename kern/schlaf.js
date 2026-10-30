/* kern/schlaf.js – Schlafleistung und Schlafbedarf.
 *
 * Kernaussage: Die Schlafleistung sagt, wie viel von deinem Schlafbedarf du in der Nacht tatsächlich geschlafen
 * hast (Wachphasen zählen nicht). Der Schlafbedarf beginnt beim Grundbedarf von 8 Stunden und wächst nach einem
 * anstrengenden Tag und nach zu kurzen Nächten; ein Nickerchen senkt ihn. Dazu kommen zwei Begleitwerte: die
 * Effizienz (wie viel der Bettzeit Schlaf war) und die Regelmäßigkeit der Einschlafzeit.
 *
 * Alle Dauern in ganzen Millisekunden, Anteile in Promille, Prozent ganzzahlig über rundBruch (DIN 1333).
 */
import { formel, wert } from "./formeln.js";
import { rundBruch } from "./rundung.js";
import { uhrMinuten } from "./zeit.js";
import { vereinige } from "./quellen.js";

export const PHASEN = ["wach", "leicht", "tief", "rem"];
const MINUTEN_HALBER_TAG = 12 * 60; // Wanduhr: 12 h, um Einschlafzeiten um Mitternacht zu zentrieren

/**
 * Phasen zusammenfassen.
 * @param {{von:number, bis:number, phasen?:Array<{von:number,bis:number,art:string}>}} schlaf
 * @returns {{imBettMs:number, dauerMs:number, phasen:{wach:number,leicht:number,tief:number,rem:number}, anteile:Object, mitPhasen:boolean}}
 */
export function schlafZusammenfassung(schlaf) {
  const imBettMs = Math.max(0, schlaf.bis - schlaf.von);
  const p = { wach: 0, leicht: 0, tief: 0, rem: 0 };
  const liste = Array.isArray(schlaf.phasen) ? schlaf.phasen : [];
  for (const ph of liste) if (ph && p[ph.art] !== undefined && ph.bis > ph.von) p[ph.art] += ph.bis - ph.von;
  const mitPhasen = liste.length > 0;
  const dauerMs = mitPhasen ? p.leicht + p.tief + p.rem : imBettMs;
  const summe = p.wach + p.leicht + p.tief + p.rem;
  const anteile = {};
  for (const a of PHASEN) anteile[a] = summe > 0 ? rundBruch(p[a] * 1000, summe) : 0;
  return { imBettMs, dauerMs, phasen: p, anteile, mitPhasen };
}

/** Einschlafzeit in Minuten relativ zur örtlichen Mitternacht, zentriert: 23:30 → −30, 00:45 → +45. */
export function einschlafMinute(schlaf) {
  const m = uhrMinuten(schlaf.von);
  return m >= MINUTEN_HALBER_TAG ? m - 2 * MINUTEN_HALBER_TAG : m;
}

/**
 * Konsistenz: Abweichung der Einschlafzeit vom Mittel früherer Nächte (formeln.json "schlaf.konsistenz.grenze").
 * @param {object} schlaf heutige Nacht
 * @param {object[]} vorher frühere Hauptschlafphasen (höchstens "basis.fenster.kurz" werden genutzt)
 * @returns {null|{wert:number, abweichungMin:number, mittelMin:number, n:number, formel:object}}
 */
export function schlafKonsistenz(schlaf, vorher = []) {
  const fenster = wert("basis.fenster.kurz");
  const fruehere = (vorher || []).filter((s) => s && s.bis > s.von && s.von < schlaf.von)
    .sort((a, b) => b.von - a.von).slice(0, fenster);
  if (!fruehere.length) return null;
  const summe = fruehere.reduce((a, s) => a + einschlafMinute(s), 0);
  const mittelMin = rundBruch(summe, fruehere.length);
  const abweichungMin = Math.abs(einschlafMinute(schlaf) - mittelMin);
  const grenze = wert("schlaf.konsistenz.grenze");
  const w = Math.max(0, 100 - rundBruch(abweichungMin * 100, grenze));
  return { wert: w, abweichungMin, mittelMin, n: fruehere.length, formel: formel("schlaf.konsistenz.grenze") };
}

/**
 * Schlafleistung einer Nacht.
 * @param {object} arg
 * @param {object} arg.schlaf   Schlaf-Datensatz {von, bis, phasen, quelle}
 * @param {number|{ms:number}} arg.bedarf  Schlafbedarf in ms oder Ergebnis von schlafBedarf
 * @param {object[]} [arg.vorher] frühere Hauptschlafphasen für die Konsistenz
 * @returns {null|{wert:number, dauerMs:number, imBettMs:number, bedarfMs:number, schuld:number, phasen:Object, anteile:Object,
 *   effizienz:null|{promille:number, gut:boolean, formel:object}, konsistenz:object|null, formel:object, quellen:object[]}}
 */
export function schlafLeistung({ schlaf, bedarf, vorher = [] } = {}) {
  if (!schlaf || !(schlaf.bis > schlaf.von)) return null;
  const z = schlafZusammenfassung(schlaf);
  const bedarfMs = typeof bedarf === "number" ? bedarf : bedarf?.ms ?? wert("schlaf.bedarf.basis");
  const w = bedarfMs > 0 ? Math.min(100, rundBruch(z.dauerMs * 100, bedarfMs)) : 100;
  const effizienz = z.mitPhasen && z.imBettMs > 0
    ? (() => { const promille = rundBruch(z.dauerMs * 1000, z.imBettMs); return { promille, gut: promille >= wert("schlaf.effizienz.gut"), formel: formel("schlaf.effizienz.gut") }; })()
    : null;
  return {
    wert: w, dauerMs: z.dauerMs, imBettMs: z.imBettMs, bedarfMs, schuld: Math.max(0, bedarfMs - z.dauerMs),
    phasen: z.phasen, anteile: z.anteile, effizienz, konsistenz: schlafKonsistenz(schlaf, vorher),
    formel: formel("schlaf.leistung"), quellen: vereinige(schlaf.quelle, bedarf?.quellen),
  };
}

/**
 * Schlafschuld aus früheren Nächten (formeln.json "schlaf.schuld.fenster"): Summe (Bedarf − Dauer), nicht unter 0.
 * @param {Array<{bedarfMs:number, dauerMs:number}>} naechte die jüngsten zuerst oder zuletzt – es zählen die letzten `fenster` Einträge
 * @returns {number} ms
 */
export function schlafSchuld(naechte = []) {
  const fenster = wert("schlaf.schuld.fenster");
  const liste = naechte.filter((n) => n && Number.isFinite(n.bedarfMs) && Number.isFinite(n.dauerMs)).slice(-fenster);
  return Math.max(0, liste.reduce((a, n) => a + n.bedarfMs - n.dauerMs, 0));
}

/** Belastung als ganze Zehntel lesen: Zahl 0..21, Ergebnis von belastung() oder {wertZehntel}. */
function belastungZehntel(b) {
  if (b === null || b === undefined) return 0;
  if (typeof b === "number") return Math.round(b * 10);
  if (Number.isInteger(b.wertZehntel)) return b.wertZehntel;
  return Number.isFinite(b.wert) ? Math.round(b.wert * 10) : 0;
}

/** Nickerchen als ms: Zahl oder Schlaf[] (Summe der geschlafenen Zeit). */
function nickerchenMs(n) {
  if (!n) return 0;
  if (typeof n === "number") return Math.max(0, n);
  return n.reduce((a, s) => a + schlafZusammenfassung(s).dauerMs, 0);
}

/**
 * Schlafbedarf der kommenden Nacht (formeln.json "schlaf.bedarf").
 * @param {object} arg
 * @param {number} [arg.basis] Grundbedarf in ms (Standard "schlaf.bedarf.basis")
 * @param {number|object} [arg.belastungGestern] Belastung des Vortags (0..21 oder Ergebnis von belastung)
 * @param {number} [arg.schuld] Schlafschuld in ms
 * @param {number|object[]} [arg.nickerchen] Nickerchen des Vortags (ms oder Schlaf[])
 * @returns {{ms:number, teile:Array<{name:string, ms:number, formel:object}>, formel:object, quellen:object[]}}
 */
export function schlafBedarf({ basis, belastungGestern, schuld = 0, nickerchen } = {}) {
  const basisMs = Number.isFinite(basis) ? basis : wert("schlaf.bedarf.basis");
  const bz = belastungZehntel(belastungGestern);
  const teile = [
    { name: "basis", ms: basisMs, formel: formel("schlaf.bedarf.basis") },
    { name: "belastung", ms: rundBruch(bz * wert("schlaf.bedarf.je_belastung"), 10), formel: formel("schlaf.bedarf.je_belastung") },
    { name: "schuld", ms: rundBruch(Math.max(0, Math.round(schuld)) * wert("schlaf.bedarf.schuld_anteil"), 1000), formel: formel("schlaf.bedarf.schuld_anteil") },
    { name: "nickerchen", ms: nickerchenMs(nickerchen) > 0 ? -nickerchenMs(nickerchen) : 0, formel: formel("schlaf.bedarf") },
  ];
  const ms = Math.max(0, teile.reduce((a, t) => a + t.ms, 0));
  const quellen = vereinige(belastungGestern?.quellen, Array.isArray(nickerchen) ? nickerchen.map((s) => s.quelle) : null);
  return { ms, teile, formel: formel("schlaf.bedarf"), quellen };
}

