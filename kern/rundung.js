/* kern/rundung.js – die einzige Stelle, an der gerundet wird.
 *
 * Kernaussage: Gerundet wird überall gleich – kaufmännisch nach DIN 1333 (ab der Hälfte vom Betrag her auf).
 * Ganzzahlige Brüche (z. B. Summe ÷ Anzahl) werden exakt mit ganzen Zahlen gerundet, ohne Gleitkomma-Fehler.
 * Fundstelle: formeln.json "rundung.kaufmaennisch".
 */
import { formel } from "./formeln.js";

export const RUNDUNG = "rundung.kaufmaennisch";
/** Formel zur Rundung (für Belegfenster). */
export const rundungFormel = () => formel(RUNDUNG);

/**
 * Kaufmännisch runden auf `stellen` Nachkommastellen (DIN 1333).
 * Der Faktor (1 + EPSILON) gleicht Darstellungsfehler wie 1,005 × 100 = 100,4999… aus.
 * @param {number} x
 * @param {number} [stellen=0]
 * @returns {number|null} null bei fehlender oder ungültiger Zahl
 */
export function rund(x, stellen = 0) {
  if (typeof x !== "number" || !Number.isFinite(x)) return null;
  const f = 10 ** stellen;
  const r = Math.round(Math.abs(x) * f * (1 + Number.EPSILON)) / f;
  return x < 0 && r !== 0 ? -r : r;
}

/**
 * Ganzzahligen Bruch zaehler ÷ nenner kaufmännisch auf eine ganze Zahl runden – exakt, ohne Gleitkomma.
 * @param {number} zaehler ganze Zahl
 * @param {number} nenner ganze Zahl ≠ 0
 * @returns {number}
 */
export function rundBruch(zaehler, nenner) {
  if (!Number.isInteger(zaehler) || !Number.isInteger(nenner) || nenner === 0) throw new Error("rundBruch: ganze Zahlen, Nenner ≠ 0");
  const vz = Math.sign(zaehler) * Math.sign(nenner);
  const z = Math.abs(zaehler), n = Math.abs(nenner);
  const q = Math.floor(z / n), rest = z - q * n;
  const r = 2 * rest >= n ? q + 1 : q;
  return vz < 0 && r !== 0 ? -r : r;
}

/** Wert auf [unten, oben] begrenzen. */
export const begrenze = (x, unten, oben) => Math.min(oben, Math.max(unten, x));
