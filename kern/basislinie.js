/* kern/basislinie.js – persönlicher Normalbereich.
 *
 * Kernaussage: Die Basislinie ist dein eigener Normalwert: Mittelwert und übliche Schwankung (Streuung) der
 * vergangenen 7 oder 30 Tage. Der betrachtete Tag selbst zählt nicht mit, damit er sich mit seiner Vorgeschichte
 * vergleichen lässt. Gibt es zu wenige Tage, wird zwar gerechnet, aber `genug` ist falsch. HRV wird vorher
 * logarithmiert, weil ihre Werte nach oben stärker ausschlagen als nach unten (Shaffer & Ginsberg 2017).
 *
 * Eingabe in ganzen Einheiten (z. B. Zehntel-ms); Summen exakt ganzzahlig, Mittel und Streuung über rund()
 * (DIN 1333) auf "basis.stellen" Nachkommastellen. Kein DOM, kein Netz, kein Speicher.
 */
import { formel, wert } from "./formeln.js";
import { rund } from "./rundung.js";
import { isoTag, plusTage, istIsoTag } from "./zeit.js";
import { vereinige } from "./quellen.js";

/** Tag eines Messwerts: `tag` oder aus `t` (örtlich). */
const tagVon = (w) => (istIsoTag(w.tag) ? w.tag : Number.isFinite(w.t) ? isoTag(w.t) : null);

/**
 * Mittel und Stichproben-Streuung (n − 1, JCGM 100:2008 Gl. 4) einer Zahlenliste.
 * Ganze Zahlen werden exakt summiert; die Streuung zweistufig (erst Mittel, dann Abstände).
 * @param {number[]} xs
 * @returns {{mittel:number|null, streuung:number|null, n:number}}
 */
export function mittelUndStreuung(xs) {
  const n = xs.length;
  if (n === 0) return { mittel: null, streuung: null, n };
  let summe = 0;
  for (const x of xs) summe += x;
  const mittel = summe / n;
  if (n === 1) return { mittel, streuung: null, n };
  let q = 0;
  for (const x of xs) q += (x - mittel) * (x - mittel);
  return { mittel, streuung: Math.sqrt(q / (n - 1)), n };
}

/**
 * Rollende Basislinie.
 * @param {Array<{tag?:string, t?:number, wert:number, quelle?:object, quellen?:object[]}>} werte ganze Einheiten
 * @param {object} [opt]
 * @param {number} [opt.tage]   Fenster in Kalendertagen (Standard "basis.fenster.lang")
 * @param {string} [opt.bis]    erster Tag NACH dem Fenster (exklusiv); Standard: Tag nach dem letzten Wert
 * @param {boolean} [opt.ln]    natürlichen Logarithmus nehmen ("basis.hrv_ln")
 * @param {number} [opt.teiler] Einheitenteiler vor dem ln (z. B. 10 für Zehntel-ms → ms)
 * @param {number} [opt.minN]   Mindestanzahl (Standard "basis.min_n")
 * @returns {{mittel:number|null, streuung:number|null, n:number, genug:boolean, minN:number, von:string|null, bis:string|null, ln:boolean, teiler:number, quellen:object[], formel:object}}
 */
export function basislinie(werte, opt = {}) {
  const tage = opt.tage ?? wert("basis.fenster.lang");
  const minN = opt.minN ?? wert("basis.min_n");
  const ln = !!opt.ln, teiler = opt.teiler ?? 1;
  const stellen = wert("basis.stellen");
  const gueltig = (werte || []).filter((w) => w && Number.isFinite(w.wert) && tagVon(w) && (!ln || w.wert > 0));
  let bis = opt.bis ?? null;
  if (!bis && gueltig.length) bis = plusTage(gueltig.map(tagVon).sort().at(-1), 1);
  const von = bis ? plusTage(bis, -tage) : null;
  const imFenster = bis ? gueltig.filter((w) => { const d = tagVon(w); return d >= von && d < bis; }) : [];
  const xs = imFenster.map((w) => (ln ? Math.log(w.wert / teiler) : w.wert));
  const s = mittelUndStreuung(xs);
  return {
    mittel: s.mittel === null ? null : rund(s.mittel, stellen),
    streuung: s.streuung === null ? null : rund(s.streuung, stellen),
    n: s.n, genug: s.n >= minN && s.streuung !== null, minN, tage, von, bis, ln, teiler,
    quellen: vereinige(...imFenster.map((w) => w.quellen ?? w.quelle)),
    formel: formel(ln ? "basis.hrv_ln" : "basis.mittel"),
  };
}

/**
 * z-Wert gegen eine Basislinie (formeln.json "statistik.z"), Streuung mindestens `untergrenze`.
 * @param {number} x Wert in derselben Skala wie die Basislinie (bei ln schon logarithmiert)
 * @returns {number|null}
 */
export function zWert(x, basis, untergrenze = 0) {
  if (!basis || basis.mittel === null || basis.streuung === null || !Number.isFinite(x)) return null;
  const s = Math.max(basis.streuung, untergrenze);
  return s > 0 ? (x - basis.mittel) / s : null;
}
