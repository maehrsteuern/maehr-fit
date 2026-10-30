/* kern/quellen.js – Quellenlisten für den Prüfpfad.
 *
 * Kernaussage: Jede Zahl trägt die Liste der Datensätze, aus denen sie entstand. Diese Hilfen führen Listen
 * zusammen und entfernen Doppelte (gleiche Art, Kennung, Datei und Zeile), damit das Belegfenster jede Quelle
 * genau einmal zeigt.
 */

/** Schlüssel einer Quelle für den Vergleich. */
export const quellSchluessel = (q) => [q.art, q.id, q.datei ?? "", q.zeile ?? ""].join("|");

/**
 * Quellenlisten (oder Einzelquellen) zusammenführen, Reihenfolge des ersten Auftretens, ohne Doppelte.
 * @param {...(Array|object|null|undefined)} listen
 * @returns {Array<object>}
 */
export function vereinige(...listen) {
  const gesehen = new Set(), aus = [];
  for (const l of listen) {
    for (const q of Array.isArray(l) ? l : l ? [l] : []) {
      if (!q || typeof q !== "object") continue;
      const k = quellSchluessel(q);
      if (!gesehen.has(k)) { gesehen.add(k); aus.push(q); }
    }
  }
  return aus;
}
