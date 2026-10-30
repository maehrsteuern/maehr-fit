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
