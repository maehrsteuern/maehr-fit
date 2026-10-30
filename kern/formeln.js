/* kern/formeln.js – Formeln und Konstanten aus kern/formeln/formeln.json.
 *
 * Kernaussage: Jede Zahl, mit der MAEHR FIT rechnet (Gewichte, Grenzen, Zonen, Dauern), steht genau einmal in
 * formeln.json – mit Einheit, Fundstelle und einer Erklärung in einfachem Deutsch. Der Code fragt sie hier ab und
 * hat selbst keine Konstante. Unbekannte Schlüssel brechen sofort ab, damit kein Tippfehler still mit „undefined“
 * weiterrechnet. Unsichere Werte tragen "pruefen": true und lassen sich mit pruefListe() auflisten.
 *
 * Kein DOM, kein Netz, kein Speicher. Die JSON-Datei wird als ES-Modul eingebunden (Import-Attribut, ES2025).
 */
import DATEN from "./formeln/formeln.json" with { type: "json" };

let EINTRAEGE = DATEN.eintraege;

/** Formelsammlung austauschen (z. B. für Tests oder einen Bündler, der die JSON selbst einsetzt).
 *  @param {{eintraege: Object}} json */
export function setzeFormeln(json) {
  if (!json || typeof json.eintraege !== "object") throw new Error("formeln: Objekt mit 'eintraege' erwartet");
  EINTRAEGE = json.eintraege;
}

/** Roh-Eintrag aus formeln.json; wirft bei unbekanntem Schlüssel. */
export function eintrag(schluessel) {
  const e = EINTRAEGE[schluessel];
  if (!e) throw new Error("formeln: unbekannter Schlüssel '" + schluessel + "'");
  return e;
}

/** Nur der Wert eines Eintrags (Zahl, Text, Liste oder Objekt). */
export const wert = (schluessel) => eintrag(schluessel).wert;

/** Zahl im deutschen Format (Komma), ohne Tausenderpunkt. */
const deZahl = (x) => String(x).replace(".", ",");

/** Platzhalter {schluessel} bzw. {schluessel|prozent} (Promille → %) oder {schluessel|min} (ms → Minuten) im Text ersetzen. */
function fuelle(text) {
  return text.replace(/\{([a-z0-9_.\-]+)(?:\|(prozent|min))?\}/gi, (_, s, f) => {
    const w = wert(s);
    if (f === "prozent") return deZahl(w / 10) + " %";
    if (f === "min") return deZahl(w / 60000);
    return deZahl(w);
  });
}

/**
 * Formel für Ergebnisobjekte und das Belegfenster.
 * @param {string} schluessel
 * @returns {{schluessel:string, text:string, fundstelle:string, wert:any, einheit:string, erklaerung:string, pruefen:boolean}}
 */
export function formel(schluessel) {
  const e = eintrag(schluessel);
  return {
    schluessel,
    text: fuelle(e.text ?? e.erklaerung ?? ""),
    fundstelle: e.fundstelle,
    wert: e.wert,
    einheit: e.einheit,
    erklaerung: e.erklaerung ?? "",
    pruefen: !!e.pruefen,
  };
}

/** Alle Schlüssel der Formelsammlung. */
export const alleSchluessel = () => Object.keys(EINTRAEGE);

/** Alle Einträge mit "pruefen": true (für die Meldung an Loris). */
export const pruefListe = () => alleSchluessel().filter((s) => EINTRAEGE[s].pruefen).map(formel);
