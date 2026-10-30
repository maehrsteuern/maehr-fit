/* kern/speicher.js – Schnittstelle zum Speicher.
 *
 * Kernaussage: Der Kern speichert nie selbst. Wer etwas ablegen will, reicht ein Objekt mit drei Methoden herein:
 * lesen, schreiben, Schlüssel auflisten. Die Shell liefert dafür IndexedDB (shell/speicher_browser.js), die Tests
 * eine einfache Map aus dieser Datei. Daten bleiben so immer beim Nutzer, und der Kern bleibt ohne Nebenwirkungen.
 *
 * Vertrag (docs/technik/schnittstellen.md):
 *   speicher = {
 *     lies(schluessel)          -> Promise<any>        // undefined, wenn nichts abgelegt ist
 *     schreib(schluessel, wert) -> Promise<void>       // Wert muss strukturiert klonbar sein (JSON-artig)
 *     liste(praefix)            -> Promise<String[]>   // alle Schlüssel, die mit praefix beginnen, sortiert
 *   }
 * Schlüssel-Konvention: SCHLUESSEL unten (z. B. "tagebuch:2026-10-30").
 */

/** Empfohlene Schlüssel. */
export const SCHLUESSEL = {
  einstellungen: "einstellungen",
  tagebuch: (tagIso) => "tagebuch:" + tagIso,
  tag: (tagIso) => "tag:" + tagIso,
  import: (id) => "import:" + id,
};

export const METHODEN = ["lies", "schreib", "liste"];

/** Erfüllt s die Schnittstelle? */
export const istSpeicher = (s) => !!s && METHODEN.every((m) => typeof s[m] === "function");

/** Tiefe Kopie, damit gespeicherte Werte nicht von außen verändert werden. */
const kopie = (w) => (w === undefined ? undefined : structuredClone(w));

/**
 * Speicher im Arbeitsspeicher (für Tests und als Rückfall ohne IndexedDB).
 * @param {Object<string, any>} [anfang] Startinhalt
 * @returns {{lies:Function, schreib:Function, liste:Function, groesse:Function}}
 */
export function speicherMap(anfang = {}) {
  const m = new Map(Object.entries(anfang).map(([k, v]) => [k, kopie(v)]));
  const pruefe = (k) => { if (typeof k !== "string" || !k) throw new Error("speicher: Schlüssel als nicht leerer Text erwartet"); };
  return {
    async lies(schluessel) { pruefe(schluessel); return kopie(m.get(schluessel)); },
    async schreib(schluessel, wert) { pruefe(schluessel); m.set(schluessel, kopie(wert)); },
    async liste(praefix = "") { return [...m.keys()].filter((k) => k.startsWith(praefix)).sort(); },
    groesse: () => m.size,
  };
}
