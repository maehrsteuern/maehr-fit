/* kern/tagebuch.js – Tagebuch und sein Zusammenhang mit der Erholung.
 *
 * Kernaussage: Im Tagebuch hakst du abends an, was du gemacht hast (z. B. Alkohol, spätes Essen, Meditation).
 * tagebuchWirkung vergleicht dann deine Erholung am Morgen DANACH: an Tagen nach dem Verhalten und an Tagen ohne.
 * Erst ab 5 Tagen je Gruppe gilt der Vergleich als aussagekräftig. Er zeigt einen Zusammenhang, keinen Beweis.
 *
 * Kein DOM, kein Netz, kein Speicher. Beschriftungen über kern/i18n.js ("tagebuch.<schluessel>").
 */
import { formel, wert } from "./formeln.js";
import { rund } from "./rundung.js";
import { plusTage } from "./zeit.js";
import { vereinige } from "./quellen.js";

/** Katalog der Tagebuch-Fragen. art "ja_nein" (true/false) oder "zahl" (z. B. Getränke; > 0 zählt als „mit“). */
export const KATALOG = [
  { schluessel: "alkohol", art: "ja_nein" },
  { schluessel: "koffein_spaet", art: "ja_nein" },
  { schluessel: "bildschirm_spaet", art: "ja_nein" },
  { schluessel: "spaete_mahlzeit", art: "ja_nein" },
  { schluessel: "meditation", art: "ja_nein" },
  { schluessel: "atemuebung", art: "ja_nein" },
  { schluessel: "kaltdusche", art: "ja_nein" },
  { schluessel: "sauna", art: "ja_nein" },
  { schluessel: "lesen", art: "ja_nein" },
  { schluessel: "stress", art: "ja_nein" },
  { schluessel: "krank", art: "ja_nein" },
  { schluessel: "reisen", art: "ja_nein" },
];
export const SCHLUESSEL = KATALOG.map((k) => k.schluessel);

/** Fragetext → Schlüssel: "Did you drink alcohol?" → "did_you_drink_alcohol" (gleiche Regel wie daten/csv_import.js frageSchluessel). */
const textSchluessel = (text) => String(text ?? "").toLowerCase()
  .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/**
 * WHOOP-Fragetext → Schlüssel des Katalogs (KATALOG), wenn die Bedeutung eindeutig dieselbe ist; sonst null.
 * Verneinte Fragen („Kein Alkohol …“, „No caffeine …“) werden nie zugeordnet (die Antwort hätte die umgekehrte Bedeutung).
 * Nicht zugeordnet bleiben z. B. „Koffein konsumiert?“ (ohne Tageszeit; MF fragt nach Koffein am Nachmittag) und alle Fragen ohne
 * Gegenstück; sie bleiben unter ihrem eigenen Schlüssel im Datensatz erhalten (docs/technik/datenfluss.md, Abschnitt Tagebuch).
 */
export function katalogSchluessel(fragetext) {
  const k = textSchluessel(fragetext);
  if (!k || /(^|_)(kein|keine|keinen|keiner|ohne|no|not|without|nicht)(_|$)/.test(k)) return null;
  const ohneNichtBildschirm = k.replace(/non_?screened/g, "").replace(/(ohne|nicht)_bildschirm\w*/g, "");
  const hat = (re, text = k) => re.test(text);
  if (hat(/(^|_)(read|reading|lesen|gelesen)(_|$)/) && hat(/(bed|bett|sleep|schlaf)/) && !hat(/(screen|bildschirm|tablet|handy|phone)/, ohneNichtBildschirm)) return "lesen";
  if (hat(/(screen|bildschirm|handy|phone|tablet|fernseh|(^|_)tv(_|$))/, ohneNichtBildschirm) && hat(/(bed|bett|schlaf|sleep)/)) return "bildschirm_spaet";
  if (hat(/(alkohol|alcohol)/)) return "alkohol";
  if (hat(/(koffein|caffeine|kaffee|coffee)/) && hat(/(spaet|late|nachmittag|afternoon|abend|evening|(^|_)after(_|$))/)) return "koffein_spaet";
  if (hat(/(^|_)(eat|ate|eaten|essen|gegessen|mahlzeit|meal)(_|$)/) && hat(/(bedtime|schlafengehen|close_to_bed|before_bed|before_sleep|kurz_vor|(^|_)(late|spaet)(_|$))/)) return "spaete_mahlzeit";
  if (hat(/medit/)) return "meditation";
  if (hat(/(kaltdusche|cold_shower|cold_bath|cold_plunge|ice_bath|eisbad|kalt\w*_gedusch|kalt\w*_gebadet)/)) return "kaltdusche";
  if (hat(/sauna/)) return "sauna";
  if (hat(/(breathwork|breathing_exercise|atemuebung|atemtechnik)/)) return "atemuebung";
  if (hat(/stress/)) return "stress";
  if (hat(/(^|_)(sick|ill|krank|unwohl|unwell|erkaeltet)(_|$)/)) return "krank";
  if (hat(/(travel|reise|gereist|unterwegs)/)) return "reisen";
  return null;
}

/**
 * Tagebuch-Datensatz des Imports (WHOOP-Fragen unter eigenen Schlüsseln, `fragen[schluessel]` = Fragetext) um die Katalogschlüssel
 * ergänzen. Beim Lesen angewendet, damit auch schon eingelesene Daten zählen. Mehrere Fragen auf denselben Schlüssel: ein „Ja“ gilt.
 * Ein schon vorhandener Eintrag unter dem Katalogschlüssel (vom Nutzer gesetzt) hat Vorrang.
 * @returns {object} Kopie des Datensatzes (unverändert, wenn es nichts zuzuordnen gibt)
 */
export function mitKatalog(eintrag) {
  if (!eintrag || !eintrag.fragen || !eintrag.eintraege) return eintrag;
  const neu = {};
  for (const [k, text] of Object.entries(eintrag.fragen)) {
    const kat = katalogSchluessel(text);
    const v = eintrag.eintraege[k];
    if (!kat || typeof v !== "boolean" || kat === k || eintrag.eintraege[kat] !== undefined) continue;
    neu[kat] = neu[kat] === true ? true : v;
  }
  return Object.keys(neu).length ? { ...eintrag, eintraege: { ...eintrag.eintraege, ...neu } } : eintrag;
}

/** Eintrag deuten: true / Zahl > 0 → "mit", false / 0 → "ohne", sonst null (nicht erfasst). */
export function gruppe(v) {
  if (v === true || (typeof v === "number" && v > 0)) return "mit";
  if (v === false || v === 0) return "ohne";
  return null;
}

/** Einträge eines Tages lesen: Tag-Objekt mit tagebuch {eintraege}, Tagebuch-Datensatz oder {eintraege}. */
const eintraegeVon = (t) => t?.tagebuch?.eintraege ?? t?.eintraege ?? null;
const quelleVon = (t) => t?.tagebuch?.quelle ?? t?.quelle ?? null;
/** Erholungswert eines Tages: Zahl oder {wert}. */
const erholungVon = (t) => (typeof t?.erholung === "number" ? t.erholung : t?.erholung?.wert);

/**
 * Mittlere Erholung am Folgetag mit und ohne Verhalten.
 * @param {Array<{tag:string, erholung:number|{wert:number}, tagebuch?:{eintraege:Object}}>} tage
 * @param {string} schluessel
 * @returns {{schluessel:string, mit:{mittel:number|null,n:number}, ohne:{mittel:number|null,n:number}, differenz:number|null,
 *   aussagekraeftig:boolean, minN:number, hinweis:string, hinweisSchluessel:string, paare:object[], formel:object, quellen:object[]}}
 */
export function tagebuchWirkung(tage, schluessel) {
  const minN = wert("tagebuch.min_n");
  const nachTag = new Map((tage || []).filter((t) => t && t.tag).map((t) => [t.tag, t]));
  const summen = { mit: [0, 0], ohne: [0, 0] }, paare = [], quellen = [];
  for (const t of nachTag.values()) {
    const e = erholungVon(t);
    if (!Number.isFinite(e)) continue;
    const vortag = nachTag.get(plusTage(t.tag, -1));
    const g = gruppe(eintraegeVon(vortag)?.[schluessel]);
    if (!g) continue;
    summen[g][0] += e; summen[g][1] += 1;
    paare.push({ tagVerhalten: vortag.tag, tagErholung: t.tag, erholung: e, gruppe: g });
    quellen.push(quelleVon(vortag), t.erholung?.quellen);
  }
  const m = (g) => ({ mittel: summen[g][1] ? rund(summen[g][0] / summen[g][1], 1) : null, n: summen[g][1] });
  const mit = m("mit"), ohne = m("ohne");
  const differenz = mit.n && ohne.n ? rund(mit.mittel - ohne.mittel, 1) : null;
  const aussagekraeftig = mit.n >= minN && ohne.n >= minN;
  return { schluessel, mit, ohne, differenz, aussagekraeftig, minN, ...hinweis(mit, ohne, differenz, aussagekraeftig, minN), paare, formel: formel("tagebuch.wirkung"), quellen: vereinige(...quellen) };
}

/** Hinweistext (Deutsch) und i18n-Schlüssel; beschreibt nur, rät nichts. */
function hinweis(mit, ohne, differenz, ok, minN) {
  const schluss = " Das zeigt einen Zusammenhang, keinen Beweis.";
  if (!ok) {
    return { hinweisSchluessel: "tagebuch.hinweis.zu_wenig",
      hinweis: `Noch zu wenige Tage für einen Vergleich: je Gruppe braucht es mindestens ${minN} (mit: ${mit.n}, ohne: ${ohne.n}).` + schluss };
  }
  const betrag = String(Math.abs(differenz)).replace(".", ",");
  const richtung = differenz > 0 ? "höher" : differenz < 0 ? "niedriger" : "gleich hoch";
  const satz = differenz === 0 ? "Deine Erholung am Morgen danach war im Mittel gleich hoch."
    : `Deine Erholung am Morgen danach war im Mittel ${betrag} Punkte ${richtung}.`;
  return { hinweisSchluessel: "tagebuch.hinweis.vergleich", hinweis: satz + schluss };
}
