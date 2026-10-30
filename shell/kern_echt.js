/* shell/kern_echt.js – Übersetzer zwischen dem echten Kern (kern/index.js) und den Ansichten der Shell.
 *
 * Kernaussage: Der Kern rechnet jeden Tag vollständig (kern/tag.js: Erholung, Belastung, Schlaf, Bedarf, Basislinien) und
 * liefert ganze Einheiten (HRV in Zehntel-Millisekunden, Belastung in Zehnteln). Diese Datei rechnet nichts neu: Sie ordnet die
 * Ergebnisse in die Form, die die Ansichten lesen („Tagesbild“), und rechnet nur Einheiten für die Anzeige um (Zehntel → ganze
 * Werte, HRV-Basislinie aus dem Logarithmus zurück in Millisekunden). Formeln, Fundstellen und Quellen reicht sie unverändert durch.
 *
 * Schnittstelle (über shell/kern.js):
 *   tagIso, tagPlus, demo({ heute }), atemKatalog(), atemUebung(name), tagebuchKatalog(), maxPulsAus(alter)
 *   berechne(daten, einstellungen, eigenesTagebuch) → { tage: Map<tag, Tagesbild>, liste, erster, letzter, kernTage }
 *   wirkung(erg, schluessel)   → { mit, ohne, differenz, hinweis: "zu_wenig"|"tendenz", formel, quellen }
 *   trendPunkte(erg, feld, { fenster, bis }) → [{ tag, wert, band: { unten, oben } | null, basis, quellen, formel }]
 */
import * as K from "../kern/index.js";

export const tagIso = K.tagIso, tagPlus = K.tagPlus;
export const atemKatalog = () => K.atemKatalog();
export const atemUebung = (name) => K.atemUebung(K.atemKatalog().includes(name) ? name : K.atemKatalog()[0]);
export const tagebuchKatalog = () => K.tagebuchKatalog();
export const maxPulsAus = (alter) => K.maxPulsAus(alter) || { wert: null, formel: null };
export const KERN = "kern/";

const HRV = () => K.wert("einheit.hrv"), ATEM = () => K.wert("einheit.atem");
const geteilt = (x, d) => (x && Number.isFinite(x.wert) ? { wert: x.wert / d, n: x.n, quellen: x.quellen || [] } : null);

/** Demodaten der Musterperson bis `heute`. */
export function demo({ heute }) { return K.demoDaten({ bis: heute, tage: 60 }); }

/** Basislinie für die Anzeige: Mittel und halbe Bandbreite in Anzeigeeinheiten (HRV aus ln zurück in ms). */
function basisAnzeige(b, teiler = 1) {
  if (!b || !b.n || b.mittel === null) return { mittel: null, streuung: null, n: b?.n || 0, formel: b?.formel || null, quellen: b?.quellen || [] };
  if (b.ln) {
    const s = b.streuung ?? 0, unten = Math.exp(b.mittel - s), oben = Math.exp(b.mittel + s);
    return { mittel: Math.exp(b.mittel), streuung: (oben - unten) / 2, n: b.n, formel: b.formel, quellen: b.quellen || [] };
  }
  return { mittel: b.mittel / teiler, streuung: b.streuung === null ? null : b.streuung / teiler, n: b.n, formel: b.formel, quellen: b.quellen || [] };
}

const leereBelastung = () => ({ wert: 0, zonen: [], formel: null, quellen: [] });
const belastungAnzeige = (b) => (b ? { wert: b.wertZehntel, zonen: b.zonen || [], formel: b.formel, quellen: b.quellen || [] } : leereBelastung());

function teilAnzeige(x) {
  const teiler = x.name === "hrv" ? HRV() : x.name === "atem" ? ATEM() : x.name === "spo2" ? K.wert("einheit.spo2") : x.name === "hauttemp" ? K.wert("einheit.hauttemp") : 1;
  return { name: x.name, messwert: Number.isFinite(x.wert) ? x.wert / teiler : null, beitrag: Number.isFinite(x.beitrag) ? x.beitrag : null,
    gewicht: Number.isFinite(x.gewicht) && x.gewicht > 0 ? Math.round(x.gewicht * 100) : null, abzug: !!x.abzug, quelle: x.quelle || [], formel: x.formel };
}

export function berechne(daten = {}, einst = {}, eigenesTagebuch = {}) {
  const tbNachTag = new Map((daten.tagebuch || []).map((x) => [x.tag, x]));
  for (const [tag, e] of Object.entries(eigenesTagebuch)) tbNachTag.set(tag, { tag, eintraege: { ...(tbNachTag.get(tag)?.eintraege || {}), ...e.eintraege }, quelle: e.quelle });
  const buendel = { ...daten, tagebuch: [...tbNachTag.values()] };
  const e = { ...einst, alter: Number(einst.alter) || undefined, maxPuls: Number(einst.maxPuls) || undefined, schlafBasisMs: Number(einst.schlafBasisMs) || undefined };
  const kernTage = K.alleTage(buendel, e);
  const trainings = [...(daten.training || [])].sort((a, b) => a.von - b.von);
  const tage = new Map(), liste = [];
  const belastungen = [];
  for (const kt of kernTage) {
    const roh = K.hauptschlaf(kt.tag, daten.schlaf || []);
    const sl = kt.schlaf;
    const bel = belastungAnzeige(kt.belastung);
    const bild = {
      tag: kt.tag, schlafRoh: roh && sl ? roh : null,
      schlaf: sl ? { wert: sl.wert, dauerMs: sl.dauerMs, bedarfMs: sl.bedarfMs, schuld: sl.schuld, phasen: sl.phasen, formel: sl.formel, quellen: sl.quellen,
        konsistenz: sl.konsistenz ? { wert: sl.konsistenz.wert, formel: sl.konsistenz.formel, quellen: sl.quellen } : null } : { wert: null, dauerMs: 0, bedarfMs: kt.bedarf?.ms || 0, schuld: 0, phasen: {}, formel: null, quellen: [] },
      bedarf: { ms: kt.bedarf.ms, teile: kt.bedarf.teile, formel: kt.bedarf.formel },
      hrv: geteilt(kt.messwerte.hrv, HRV()), ruhepuls: geteilt(kt.messwerte.ruhepuls, 1), atem: geteilt(kt.messwerte.atem, ATEM()),
      basis: { hrv: basisAnzeige(kt.basis.hrv, HRV()), ruhepuls: basisAnzeige(kt.basis.ruhepuls), atem: basisAnzeige(kt.basis.atem, ATEM()),
        belastung: basisAnzeige(K.basislinie(belastungen.slice(-K.wert("basis.fenster.lang")), { bis: kt.tag })) },
      erholung: { wert: kt.erholung.wert, stufe: kt.erholung.stufe, teile: kt.erholung.teile.filter((x) => Number.isFinite(x.beitrag)).map(teilAnzeige), formel: kt.erholung.formel, quellen: kt.erholung.quellen || [] },
      belastung: bel,
      trainings: (kt.belastung?.trainings || []).map((x, i) => {
        const r = trainings.find((t) => t.von === x.von) || { von: x.von, bis: x.bis, art: x.art, herzschlaege: [], quelle: (x.quellen || [])[0] };
        return { id: r.quelle?.id || `${kt.tag}-${i}`, roh: r, belastung: belastungAnzeige(x) };
      }),
      tagebuch: { eintraege: kt.tagebuch?.eintraege || {}, quelle: kt.tagebuch?.quelle || null },
    };
    if (kt.belastung) belastungen.push({ tag: kt.tag, wert: kt.belastung.wertZehntel, quellen: [] });
    tage.set(kt.tag, bild); liste.push(bild);
  }
  return { tage, liste, erster: liste[0]?.tag || null, letzter: liste.at(-1)?.tag || null, kernTage };
}

export function wirkung(erg, schluessel) {
  const w = K.tagebuchWirkung(erg.kernTage, schluessel);
  return { mit: w.mit, ohne: w.ohne, differenz: w.differenz, hinweis: w.aussagekraeftig ? "tendenz" : "zu_wenig", formel: w.formel, quellen: w.quellen || [] };
}

const FELD = { erholung: ["erholung", 1], hrv: ["hrv", null], ruhepuls: ["ruhepuls", 1], schlaf: ["schlafdauer", 1] };
export function trendPunkte(erg, feld, { fenster = 7, bis } = {}) {
  const [kf, t0] = FELD[feld] || FELD.hrv, teiler = t0 ?? HRV();
  const tage = erg.kernTage.filter((x) => !bis || x.tag <= bis);
  const formel = K.wert ? (() => { try { return K.formel("trend.band"); } catch { return null; } })() : null;
  return K.trend(tage, kf).filter((p) => p.wert !== null).slice(-fenster).map((p) => ({
    tag: p.tag, wert: p.wert / teiler, quellen: p.quellen || [], formel,
    basis: { mittel: p.basis.mittel === null ? null : p.basis.mittel / teiler, streuung: p.basis.streuung === null ? null : p.basis.streuung / teiler, n: p.basis.n },
    band: p.basis.unten !== null && p.basis.oben !== null && p.basis.genug ? { unten: p.basis.unten / teiler, oben: p.basis.oben / teiler } : null,
  }));
}
