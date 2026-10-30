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
 *   vergleich(erg, feld)       → MF gegen WHOOP je Tag (feld: erholung|belastung|schlaf), alles in Zehnteln:
 *                                { feld, zeilen: [{ tag, mf, whoop, abstand, quelle }], n, nah, grenze, mittelAbstand, groesste, nurWhoop, formel, formelNah }
 *   formelVon(schluessel), pruefListe(), schlafBasisStandardMs()   – Formeln aus kern/formeln/formeln.json
 *
 * Tagesbild.erholung.teile: nur Teile, die mitgerechnet wurden. Ausgelassene (kein Messwert, Basislinie zu klein) stehen in
 *   erholung.ausgelassen [{ name, grund }] und als eine Zeile erholung.hinweis („Nicht berücksichtigt: HRV (kein Messwert)“) oder null.
 * Tagesbild.belastung.geschaetzt: true, wenn ein Training ohne Pulswerte aus WHOOPs Zonenanteilen geschätzt wurde (grund "zonen_aus_prozent").
 * Einstellungen: alter (→ Höchstpuls nach Tanaka, wenn maxPuls fehlt), maxPuls, ruhepuls (Rückfall, wenn weder Nachtmessung noch
 *   Basislinie einen Ruhepuls liefert; für Zonen und Belastung), schlafBasisMs, sprache (für erholung.hinweis).
 * kernText(schluessel, sprache, werte) – Beschriftungen aus kern/i18n.js (z. B. „einst.ruhepuls“).
 * Tagesbild.fremd: WHOOPs eigene Werte des Tages ({ erholung, belastung (Zehntel), schlafLeistung, quelle, formel }) oder null.
 *   Mehrere Zeilen am selben Tag: die mit gemessener Aufwachzeit zuerst, sonst die erste (daten/csv_import.js „zeitGeschaetzt“).
 */
import * as K from "../kern/index.js";

export const tagIso = K.tagIso, tagPlus = K.tagPlus;
export const atemKatalog = () => K.atemKatalog();
export const atemUebung = (name) => K.atemUebung(K.atemKatalog().includes(name) ? name : K.atemKatalog()[0]);
export const tagebuchKatalog = () => K.tagebuchKatalog();
export const maxPulsAus = (alter) => K.maxPulsAus(alter) || { wert: null, formel: null };
export const KERN = "kern/";
export const formelVon = (s) => K.formel(s);
export const pruefListe = () => K.pruefListe();
export const schlafBasisStandardMs = () => K.wert("schlaf.bedarf.basis");
export const kernText = (schluessel, sprache, werte) => K.t(schluessel, sprache, werte);

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

const leereBelastung = () => ({ wert: 0, zonen: [], formel: null, quellen: [], gemessen: false, geschaetzt: false, grund: null });
// gemessen: mindestens eine Zone mit Zeit (aus Pulswerten oder – geschaetzt – aus WHOOPs Zonenanteilen, kern/belastung.js)
const belastungAnzeige = (b) => (b ? { wert: b.wertZehntel, zonen: b.zonen || [], formel: b.formel, quellen: b.quellen || [], gemessen: (b.zonen || []).some((z) => z.ms > 0),
  geschaetzt: !!b.geschaetzt, grund: b.grund || null } : leereBelastung());

/** Ausgelassene Erholungsteile als eine Zeile: „Nicht berücksichtigt: HRV (kein Messwert), Atemfrequenz (…)“; keine → null. */
export function ausgelassenZeile(teile = [], sprache = "de") {
  const aus = teile.filter((x) => x && x.ausgelassen);
  if (!aus.length) return null;
  const liste = aus.map((x) => `${K.t("teil." + x.name, sprache)} (${K.t("grund." + (x.grund || "kein_messwert"), sprache)})`).join(", ");
  return K.t("erholung.nicht_beruecksichtigt", sprache, { liste });
}

/** WHOOP-Fremdwerte je Tag; Belastung in Zehnteln (WHOOP 11,3 → 113), Erholung und Schlafleistung wie geliefert. */
function fremdNachTag(liste = []) {
  const m = new Map();
  const zahl = (x) => (Number.isFinite(x) ? x : null);
  for (const f of [...liste].filter((x) => x && x.tag).sort((a, b) => Number(!!a.zeitGeschaetzt) - Number(!!b.zeitGeschaetzt))) {
    if (m.has(f.tag)) continue;
    m.set(f.tag, { anbieter: f.anbieter || "whoop", erholung: zahl(f.erholung), belastung: Number.isFinite(f.belastung) ? K.rund(f.belastung * 10) : null,
      schlafLeistung: zahl(f.schlafLeistung), zeitGeschaetzt: !!f.zeitGeschaetzt, quelle: f.quelle || null, formel: K.formel("vergleich.fremdwert") });
  }
  return m;
}

function teilAnzeige(x) {
  const teiler = x.name === "hrv" ? HRV() : x.name === "atem" ? ATEM() : x.name === "spo2" ? K.wert("einheit.spo2") : x.name === "hauttemp" ? K.wert("einheit.hauttemp") : 1;
  return { name: x.name, messwert: Number.isFinite(x.wert) ? x.wert / teiler : null, beitrag: Number.isFinite(x.beitrag) ? x.beitrag : null,
    gewicht: Number.isFinite(x.gewicht) && x.gewicht > 0 ? Math.round(x.gewicht * 100) : null, abzug: !!x.abzug, quelle: x.quelle || [], formel: x.formel };
}

export function berechne(daten = {}, einst = {}, eigenesTagebuch = {}) {
  const fremd = fremdNachTag(daten.fremdwerte);
  const tbNachTag = new Map((daten.tagebuch || []).map((x) => [x.tag, K.mitKatalog(x)]));  // WHOOP-Fragen zusätzlich unter den Katalogschlüsseln
  for (const [tag, e] of Object.entries(eigenesTagebuch)) tbNachTag.set(tag, { tag, eintraege: { ...(tbNachTag.get(tag)?.eintraege || {}), ...e.eintraege }, quelle: e.quelle });
  // Dieselbe Nacht / dasselbe Training aus Health Connect und CSV: ein Datensatz (kern/zusammenfuehren.js); die Ansicht liest dieselben Sätze wie der Kern
  const buendel = K.zusammenfuehren({ ...daten, tagebuch: [...tbNachTag.values()] });
  const zahlOder = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Math.round(Number(x)) : undefined);
  const e = { ...einst, alter: zahlOder(einst.alter), maxPuls: zahlOder(einst.maxPuls), ruhepuls: zahlOder(einst.ruhepuls), schlafBasisMs: Number(einst.schlafBasisMs) || undefined };
  const sprache = einst.sprache || "de";
  const kernTage = K.alleTage(buendel, e);
  const trainings = [...(buendel.training || [])].sort((a, b) => a.von - b.von);
  const tage = new Map(), liste = [];
  const belastungen = [];
  for (const kt of kernTage) {
    const roh = K.hauptschlaf(kt.tag, buendel.schlaf || []);
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
      erholung: { wert: kt.erholung.wert, stufe: kt.erholung.stufe, teile: kt.erholung.teile.filter((x) => !x.ausgelassen && Number.isFinite(x.beitrag)).map(teilAnzeige),
        ausgelassen: kt.erholung.teile.filter((x) => x.ausgelassen).map((x) => ({ name: x.name, grund: x.grund || null })),
        hinweis: ausgelassenZeile(kt.erholung.teile, sprache), formel: kt.erholung.formel, quellen: kt.erholung.quellen || [] },
      belastung: bel,
      trainings: (kt.belastung?.trainings || []).map((x, i) => {
        const r = trainings.find((t) => t.von === x.von) || { von: x.von, bis: x.bis, art: x.art, herzschlaege: [], quelle: (x.quellen || [])[0] };
        return { id: r.quelle?.id || `${kt.tag}-${i}`, roh: r, belastung: belastungAnzeige(x) };
      }),
      tagebuch: { eintraege: kt.tagebuch?.eintraege || {}, quelle: kt.tagebuch?.quelle || null },
      fremd: fremd.get(kt.tag) || null,
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

/** MF und WHOOP nebeneinander, in Zehnteln (Erholung 67 → 670, Belastung 11,3 → 113). Formel: formeln.json „vergleich.abstand“. */
const VERGLEICH = {
  erholung: { mf: (b) => (Number.isFinite(b.erholung?.wert) ? b.erholung.wert * 10 : null), whoop: (f) => f.erholung },
  belastung: { mf: (b) => (b.belastung?.gemessen ? b.belastung.wert : null), whoop: (f) => f.belastung, schonZehntel: true },
  schlaf: { mf: (b) => (b.schlafRoh && Number.isFinite(b.schlaf?.wert) ? b.schlaf.wert * 10 : null), whoop: (f) => f.schlafLeistung },
};
export const VERGLEICH_FELDER = Object.keys(VERGLEICH);
export function vergleich(erg, feld) {
  const v = VERGLEICH[feld] || VERGLEICH.erholung, f0 = VERGLEICH[feld] ? feld : "erholung";
  const zeilen = [];
  for (const b of erg.liste) {
    if (!b.fremd) continue;
    const w = v.whoop(b.fremd);
    const whoop = w === null ? null : v.schonZehntel ? w : K.rund(w * 10), mf = v.mf(b);
    zeilen.push({ tag: b.tag, mf, whoop, abstand: mf !== null && whoop !== null ? mf - whoop : null, quelle: b.fremd.quelle });
  }
  const beide = zeilen.filter((z) => z.abstand !== null), grenze = K.wert("vergleich.nah." + f0);
  const groesste = beide.reduce((g, z) => (!g || Math.abs(z.abstand) > Math.abs(g.abstand) ? z : g), null);
  return {
    feld: f0, zeilen, n: beide.length, grenze, nah: beide.filter((z) => Math.abs(z.abstand) <= grenze).length,
    mittelAbstand: beide.length ? K.rundBruch(beide.reduce((s, z) => s + Math.abs(z.abstand), 0), beide.length) : null,
    mittelDifferenz: beide.length ? K.rundBruch(beide.reduce((s, z) => s + z.abstand, 0), beide.length) : null,
    groesste, nurWhoop: zeilen.filter((z) => z.mf === null && z.whoop !== null).length,
    formel: K.formel("vergleich.abstand"), formelNah: K.formel("vergleich.nah." + f0),
  };
}
