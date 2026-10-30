/* kern/tag.js – alle Rechnungen eines Tages an einem Ort.
 *
 * Kernaussage: tagAuswerten nimmt alle Messwerte und baut daraus einen Tag: Erholung am Morgen, Belastung bis
 * zum nächsten Aufwachen, Schlafleistung der Nacht davor und den Schlafbedarf. Jeder Teil trägt Formel und Quellen.
 * Die Nacht, die am Morgen eines Tages endet, gehört zu diesem Tag; die Belastung des Vortags erhöht den
 * Schlafbedarf dieser Nacht. alleTage rechnet alle Tage am Stück und nutzt Zwischenergebnisse mehrfach.
 *
 * Datenbündel (normierte Messwerte aus docs/technik/schnittstellen.md):
 *   daten = { herzschlag: Herzschlag[] (Alltag), hrv: Hrv[], ruhepuls: Ruhepuls[], atemfrequenz: Atemfrequenz[],
 *             spo2: SpO2[], hauttemp: Hauttemp[], schlaf: Schlaf[], training: Training[], tagebuch: Tagebuch[] }
 *   einstellungen = { alter?, maxPuls?, ruhepuls? (Rückfall), schlafBasisMs? }
 * Kein DOM, kein Netz, kein Speicher.
 */
import { wert } from "./formeln.js";
import { rund, rundBruch } from "./rundung.js";
import { isoTag, plusTage, hauptschlaf, tagesgrenzen, istIsoTag } from "./zeit.js";
import { basislinie } from "./basislinie.js";
import { erholung } from "./erholung.js";
import { belastungTag, maxPulsTanaka } from "./belastung.js";
import { schlafLeistung, schlafBedarf, schlafSchuld, schlafZusammenfassung } from "./schlaf.js";
import { vereinige } from "./quellen.js";

const LISTEN = ["herzschlag", "hrv", "ruhepuls", "atemfrequenz", "spo2", "hauttemp", "schlaf", "training", "tagebuch"];
const nachT = (a, b) => a.t - b.t;
const nachVon = (a, b) => a.von - b.von;

/** Datenbündel prüfen und nach Zeit sortiert kopieren. */
function normiere(daten = {}) {
  const d = {};
  for (const k of LISTEN) d[k] = Array.isArray(daten[k]) ? daten[k].filter(Boolean).slice() : [];
  for (const k of ["herzschlag", "hrv", "ruhepuls", "atemfrequenz", "spo2", "hauttemp"]) d[k] = d[k].filter((x) => Number.isFinite(x.t)).sort(nachT);
  d.schlaf = d.schlaf.filter((s) => s.bis > s.von).sort(nachVon);
  d.training = d.training.filter((s) => s.bis >= s.von).sort(nachVon);
  d.tagebuchNachTag = new Map(d.tagebuch.filter((x) => istIsoTag(x.tag)).map((x) => [x.tag, x]));
  return d;
}

/** Erster Index mit t ≥ grenze (Binärsuche, Liste nach t sortiert). */
function ersterAb(liste, grenze) {
  let lo = 0, hi = liste.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (liste[m].t < grenze) lo = m + 1; else hi = m; }
  return lo;
}
/** Ausschnitt von ≤ t < bis. */
const abschnitt = (liste, von, bis) => liste.slice(ersterAb(liste, von), ersterAb(liste, bis));

/** Mittelwert einer Messreihe in ganzen Einheiten: Feld × Faktor, je Wert gerundet, dann rundBruch. */
function mittelwert(liste, feld, faktor) {
  const xs = liste.filter((x) => Number.isFinite(x[feld]));
  if (!xs.length) return null;
  const summe = xs.reduce((a, x) => a + rund(x[feld] * faktor), 0);
  return { wert: rundBruch(summe, xs.length), n: xs.length, quellen: vereinige(...xs.map((x) => x.quelle)) };
}

/**
 * Auswerter mit Zwischenspeicher für ein Datenbündel.
 * @param {object} daten Datenbündel
 * @param {object} [einstellungen]
 * @returns {{tag:(tagIso:string)=>object, spanne:()=>{von:string,bis:string}|null}}
 */
export function auswerter(daten, einstellungen = {}) {
  const D = normiere(daten);
  const memo = new Map();
  const merke = (k, f) => { if (!memo.has(k)) memo.set(k, f()); return memo.get(k); };
  const lang = wert("basis.fenster.lang"), kurz = wert("basis.fenster.kurz"), schuldFenster = wert("schlaf.schuld.fenster");
  const maxPuls = Number.isFinite(einstellungen.maxPuls) ? einstellungen.maxPuls : maxPulsTanaka(einstellungen.alter)?.bpm ?? null;

  const haupt = (tag) => merke("haupt:" + tag, () => hauptschlaf(tag, D.schlaf));
  const grenzen = (tag) => merke("grenzen:" + tag, () => tagesgrenzen(tag, einstellungen, D.schlaf));

  /** Nachtwerte des Morgens `tag`: Messungen während des Hauptschlafs (ohne Hauptschlaf: im Tagesfenster bis zur nächsten
   *  Nacht); Ruhepuls: erster Wert ab Schlafbeginn bis zum Beginn der nächsten Nacht. */
  const nacht = (tag) => merke("nacht:" + tag, () => {
    const s = haupt(tag), g = grenzen(tag);
    const naechste = haupt(plusTage(tag, 1)), ende = naechste ? Math.min(naechste.von, g.bis) : g.bis; // nächste Nacht gehört zum Folgetag
    const vonN = s ? s.von : g.von, bisN = s ? s.bis + 1 : ende;
    const rp = abschnitt(D.ruhepuls, vonN, Math.max(bisN, ende)).find((x) => Number.isFinite(x.bpm));
    return {
      schlaf: s,
      hrv: mittelwert(abschnitt(D.hrv, vonN, bisN), "rmssdMs", wert("einheit.hrv")),
      atem: mittelwert(abschnitt(D.atemfrequenz, vonN, bisN), "proMin", wert("einheit.atem")),
      spo2: mittelwert(abschnitt(D.spo2, vonN, bisN), "prozent", wert("einheit.spo2")),
      hauttemp: mittelwert(abschnitt(D.hauttemp, vonN, bisN), "deltaC", wert("einheit.hauttemp")),
      ruhepuls: rp ? { wert: rund(rp.bpm), n: 1, quellen: vereinige(rp.quelle) } : null,
    };
  });

  /** Basislinie eines Nachtwerts aus den `lang` Tagen vor `tag`. */
  const basis = (tag, feld) => merke("basis:" + feld + ":" + tag, () => {
    const werte = [];
    for (let k = 1; k <= lang; k++) { const d = plusTage(tag, -k), m = nacht(d)[feld]; if (m) werte.push({ tag: d, wert: m.wert, quellen: m.quellen }); }
    return basislinie(werte, { tage: lang, bis: tag, ln: feld === "hrv", teiler: feld === "hrv" ? wert("einheit.hrv") : 1 });
  });

  /** Ruhepuls für die Zonen: gemessen, sonst Mittel der Basislinie, sonst Einstellung. */
  const ruhepulsFuerZonen = (tag) => nacht(tag).ruhepuls?.wert ?? (basis(tag, "ruhepuls").mittel !== null ? rund(basis(tag, "ruhepuls").mittel) : null) ?? einstellungen.ruhepuls ?? null;

  const belastung = (tag) => merke("belastung:" + tag, () => {
    const g = grenzen(tag);
    const trainings = D.training.filter((x) => x.von >= g.von && x.von < g.bis);
    const alltag = abschnitt(D.herzschlag, g.von, g.bis);
    if (!trainings.length && !alltag.length) return null;
    return belastungTag(trainings, alltag, { maxPuls, ruhepuls: ruhepulsFuerZonen(tag) });
  });

  /** Nickerchen im Tagesfenster (ohne die Hauptschlafphasen an den Rändern). */
  const nickerchen = (tag) => merke("nap:" + tag, () => {
    const g = grenzen(tag), h1 = haupt(tag), h2 = haupt(plusTage(tag, 1));
    return D.schlaf.filter((s) => s.bis >= g.von && s.bis < g.bis && s !== h1 && s !== h2);
  });

  const basisMs = Number.isFinite(einstellungen.schlafBasisMs) ? einstellungen.schlafBasisMs : undefined;
  const bedarfOhneSchuld = (tag) => merke("bos:" + tag, () => schlafBedarf({ basis: basisMs, belastungGestern: belastung(plusTage(tag, -1)), schuld: 0, nickerchen: nickerchen(plusTage(tag, -1)) }).ms);
  const dauer = (tag) => (haupt(tag) ? schlafZusammenfassung(haupt(tag)).dauerMs : null);
  const schuld = (tag) => merke("schuld:" + tag, () => {
    const naechte = [];
    for (let k = schuldFenster; k >= 1; k--) { const d = plusTage(tag, -k); if (dauer(d) !== null) naechte.push({ bedarfMs: bedarfOhneSchuld(d), dauerMs: dauer(d) }); }
    return schlafSchuld(naechte);
  });
  const bedarf = (tag) => merke("bedarf:" + tag, () => {
    const b = schlafBedarf({ basis: basisMs, belastungGestern: belastung(plusTage(tag, -1)), schuld: schuld(tag), nickerchen: nickerchen(plusTage(tag, -1)) });
    return { ...b, schuldMs: schuld(tag) };
  });

  const schlaf = (tag) => merke("schlaf:" + tag, () => {
    const vorher = [];
    for (let k = 1; k <= kurz; k++) { const s = haupt(plusTage(tag, -k)); if (s) vorher.push(s); }
    return schlafLeistung({ schlaf: haupt(tag), bedarf: bedarf(tag), vorher });
  });

  const tagObjekt = (tag) => merke("tag:" + tag, () => {
    const n = nacht(tag), sl = schlaf(tag);
    const basen = { hrv: basis(tag, "hrv"), ruhepuls: basis(tag, "ruhepuls"), atem: basis(tag, "atem") };
    const er = erholung({ hrv: n.hrv, ruhepuls: n.ruhepuls, schlaf: sl, atem: n.atem, hauttemp: n.hauttemp, spo2: n.spo2, basis: basen });
    const be = belastung(tag), bd = bedarf(tag), tb = D.tagebuchNachTag.get(tag) ?? null;
    return {
      tag, grenzen: grenzen(tag), erholung: er, belastung: be, schlaf: sl, bedarf: bd,
      bedarfNaechsteNacht: bedarf(plusTage(tag, 1)),
      messwerte: { hrv: n.hrv, ruhepuls: n.ruhepuls, atem: n.atem, spo2: n.spo2, hauttemp: n.hauttemp },
      basis: basen, tagebuch: tb,
      quellen: vereinige(grenzen(tag).quellen, er.quellen, be?.quellen, sl?.quellen, bd.quellen, tb?.quelle),
    };
  });

  /** Erster und letzter Tag mit Daten. */
  const spanne = () => {
    const tage = [
      ...D.schlaf.map((s) => isoTag(s.bis)), ...D.training.map((x) => isoTag(x.von)), ...D.tagebuch.map((x) => x.tag).filter(istIsoTag),
      ...["herzschlag", "hrv", "ruhepuls"].flatMap((k) => (D[k].length ? [isoTag(D[k][0].t), isoTag(D[k].at(-1).t)] : [])),
    ].sort();
    return tage.length ? { von: tage[0], bis: tage.at(-1) } : null;
  };
  return { tag: tagObjekt, spanne };
}

/**
 * Einen Tag auswerten.
 * @param {string} tagIso "JJJJ-MM-TT"
 * @param {object} daten Datenbündel
 * @param {object} [einstellungen]
 * @returns {{tag:string, grenzen:object, erholung:object, belastung:object|null, schlaf:object|null, bedarf:object, bedarfNaechsteNacht:object, messwerte:object, basis:object, tagebuch:object|null, quellen:object[]}}
 */
export function tagAuswerten(tagIso, daten, einstellungen = {}) {
  if (!istIsoTag(tagIso)) throw new Error("tagAuswerten: Tag als 'JJJJ-MM-TT' erwartet");
  return auswerter(daten, einstellungen).tag(tagIso);
}

/**
 * Alle Tage vom ersten bis zum letzten Tag mit Daten, aufsteigend.
 * @returns {object[]} Tag-Objekte
 */
export function alleTage(daten, einstellungen = {}) {
  const a = auswerter(daten, einstellungen), sp = a.spanne();
  if (!sp) return [];
  const aus = [];
  for (let d = sp.von; d <= sp.bis; d = plusTage(d, 1)) aus.push(a.tag(d));
  return aus;
}
