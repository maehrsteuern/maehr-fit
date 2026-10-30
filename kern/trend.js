/* kern/trend.js – Verläufe, Wochen und Monate.
 *
 * Kernaussage: Ein Trend zeigt einen Wert Tag für Tag zusammen mit deinem Normalbereich der Tage davor (graues
 * Band = Mittel ± eine übliche Schwankung). Wochen- und Monatszusammenfassungen verdichten die Tage auf Mittelwert,
 * kleinsten und größten Wert und zählen die Tage je Erholungsstufe.
 *
 * Eingabe: Tag-Objekte aus kern/tag.js. Kein DOM, kein Netz, kein Speicher.
 */
import { formel, wert } from "./formeln.js";
import { rund } from "./rundung.js";
import { basislinie, mittelUndStreuung } from "./basislinie.js";
import { isoWoche, monat, wochenBeginn, plusTage } from "./zeit.js";
import { vereinige } from "./quellen.js";

/** Lesbare Felder eines Tag-Objekts: Wert und Quellen. */
export const FELDER = {
  erholung: { wert: (t) => t.erholung?.wert, quellen: (t) => t.erholung?.quellen },
  belastung: { wert: (t) => t.belastung?.wert, quellen: (t) => t.belastung?.quellen },
  schlaf: { wert: (t) => t.schlaf?.wert, quellen: (t) => t.schlaf?.quellen },
  schlafdauer: { wert: (t) => t.schlaf?.dauerMs, quellen: (t) => t.schlaf?.quellen },
  bedarf: { wert: (t) => t.bedarf?.ms, quellen: (t) => t.bedarf?.quellen },
  hrv: { wert: (t) => t.messwerte?.hrv?.wert, quellen: (t) => t.messwerte?.hrv?.quellen },
  ruhepuls: { wert: (t) => t.messwerte?.ruhepuls?.wert, quellen: (t) => t.messwerte?.ruhepuls?.quellen },
  atem: { wert: (t) => t.messwerte?.atem?.wert, quellen: (t) => t.messwerte?.atem?.quellen },
};

function feldVon(feld) {
  const f = FELDER[feld];
  if (!f) throw new Error("trend: unbekanntes Feld '" + feld + "'");
  return f;
}

const sortiert = (tage) => (tage || []).filter((t) => t && t.tag).slice().sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));

/**
 * Verlauf eines Feldes mit Normalbereich aus den `fenster` Tagen davor.
 * @param {object[]} tage Tag-Objekte
 * @param {string} feld Schlüssel aus FELDER
 * @param {{fenster?:number}} [opt] Standard "basis.fenster.kurz"
 * @returns {Array<{tag:string, wert:number|null, basis:{mittel:number|null, streuung:number|null, n:number, genug:boolean, unten:number|null, oben:number|null}, quellen:object[]}>}
 */
export function trend(tage, feld, { fenster } = {}) {
  const f = feldVon(feld), fen = fenster ?? wert("basis.fenster.kurz"), band = wert("trend.band");
  const liste = sortiert(tage);
  const werte = liste.map((t) => ({ tag: t.tag, wert: f.wert(t), quellen: f.quellen(t) })).filter((w) => Number.isFinite(w.wert));
  return liste.map((t) => {
    const b = basislinie(werte, { tage: fen, bis: t.tag });
    const mit = b.streuung !== null && b.mittel !== null;
    const w = f.wert(t);
    return {
      tag: t.tag, wert: Number.isFinite(w) ? w : null,
      basis: { mittel: b.mittel, streuung: b.streuung, n: b.n, genug: b.genug,
        unten: mit ? rund(b.mittel - band * b.streuung, 1) : null, oben: mit ? rund(b.mittel + band * b.streuung, 1) : null },
      quellen: vereinige(f.quellen(t)),
    };
  });
}
/** Formel zum Band (Belegfenster). */
export const trendFormel = () => formel("trend.band");

/** Kennzahlen einer Werteliste: Mittel (1 Nachkommastelle), min, max, n. */
function kennzahlen(xs) {
  const ys = xs.filter(Number.isFinite);
  const s = mittelUndStreuung(ys);
  return { mittel: s.mittel === null ? null : rund(s.mittel, 1), min: ys.length ? Math.min(...ys) : null, max: ys.length ? Math.max(...ys) : null, n: ys.length };
}

/** Tage nach Schlüssel gruppieren und zusammenfassen. */
function zusammenfassen(tage, schluesselVon, grenzenVon) {
  const gruppen = new Map();
  for (const t of sortiert(tage)) {
    const k = schluesselVon(t.tag);
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(t);
  }
  return [...gruppen.entries()].map(([k, ts]) => {
    const stufen = { gruen: 0, gelb: 0, rot: 0 };
    for (const t of ts) if (stufen[t.erholung?.stufe] !== undefined) stufen[t.erholung.stufe] += 1;
    return {
      schluessel: k, ...grenzenVon(ts), tage: ts.length,
      erholung: kennzahlen(ts.map(FELDER.erholung.wert)),
      belastung: kennzahlen(ts.map(FELDER.belastung.wert)),
      schlaf: kennzahlen(ts.map(FELDER.schlaf.wert)),
      schlafdauerMs: kennzahlen(ts.map(FELDER.schlafdauer.wert)),
      trainings: ts.reduce((a, t) => a + (t.belastung?.trainings?.length ?? 0), 0),
      stufen, formel: formel("zusammenfassung"),
    };
  });
}

/** Wochen (ISO 8601, Montag–Sonntag). @returns {object[]} je Woche {woche, von, bis, tage, erholung, belastung, schlaf, schlafdauerMs, trainings, stufen} */
export function wochenZusammenfassung(tage) {
  return zusammenfassen(tage, isoWoche, (ts) => { const von = wochenBeginn(ts[0].tag); return { von, bis: plusTage(von, 6) }; })
    .map((w) => ({ woche: w.schluessel, ...w }));
}

/** Kalendermonate. @returns {object[]} je Monat {monat, tage, erholung, …} */
export function monatsZusammenfassung(tage) {
  return zusammenfassen(tage, monat, (ts) => ({ von: ts[0].tag, bis: ts.at(-1).tag })).map((m) => ({ monat: m.schluessel, ...m }));
}
