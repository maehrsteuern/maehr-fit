/* kern/index.js – eine Tür zum Kern.
 *
 * Kernaussage: Die Shell und die Datenschicht holen alles, was der Kern kann, aus dieser einen Datei. Hier stehen
 * die Funktionen aus docs/technik/schnittstellen.md und einige kleine Ergänzungen (Kataloge, Kalenderhilfen).
 */
export { formel, wert, pruefListe, alleSchluessel as formelSchluessel, setzeFormeln } from "./formeln.js";
export { rund, rundBruch } from "./rundung.js";
export {
  isoTag, isoTag as tagIso, plusTage, plusTage as tagPlus, mitternacht, lokal, tageZwischen, tagLaengeMs, wochentag,
  isoWoche, monat, dauer, hauptschlaf, tagesgrenzen, MS_MINUTE, MS_STUNDE,
} from "./zeit.js";
export { basislinie, zWert } from "./basislinie.js";
export { erholung, stufe } from "./erholung.js";
export { belastung, belastungTag, maxPulsTanaka, zonenGrenzen, zoneVon } from "./belastung.js";
export { schlafLeistung, schlafBedarf, schlafSchuld, schlafKonsistenz, schlafZusammenfassung } from "./schlaf.js";
export { atemUebung, atemPlan, UEBUNGEN } from "./atem.js";
export { tagebuchWirkung, KATALOG as TAGEBUCH_KATALOG } from "./tagebuch.js";
export { trend, wochenZusammenfassung, monatsZusammenfassung, FELDER as TREND_FELDER } from "./trend.js";
export { speicherMap, istSpeicher, SCHLUESSEL as SPEICHER_SCHLUESSEL } from "./speicher.js";
export { demoDaten, demoPuls, MUSTERPERSON } from "./demo.js";
export { zoneVon as liveZone, laufendeBelastung, rrFilter, hrvKurz, atemKohaerenz, pulsFormel } from "./live.js";
export { tagAuswerten, alleTage, auswerter } from "./tag.js";
export { t, SPRACHEN } from "./i18n.js";

import { UEBUNGEN } from "./atem.js";
import { KATALOG } from "./tagebuch.js";
import { maxPulsTanaka } from "./belastung.js";
/** Namen der Atemübungen. */
export const atemKatalog = () => UEBUNGEN.slice();
/** Tagebuch-Fragen. */
export const tagebuchKatalog = () => KATALOG.map((k) => ({ ...k }));
/** Maximalpuls aus dem Alter als {wert, formel} (Tanaka 2001). */
export const maxPulsAus = (alter) => { const m = maxPulsTanaka(alter); return m ? { wert: m.bpm, formel: m.formel } : null; };
