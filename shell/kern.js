/* shell/kern.js – die eine Tür der Shell zum Kern (docs/technik/schnittstellen.md).
 *
 * Kernaussage: Alle Ansichten holen Rechenergebnisse nur über diese Datei. Sie zeigt auf den Übersetzer zum echten Kern
 * (shell/kern_echt.js → kern/index.js). Der frühere Platzhalter (shell/kern_stub.js) ist mit der Landung von kern/ entfallen.
 *
 * Schnittstelle: tagIso, tagPlus, demo({ heute }), atemKatalog(), atemUebung(name), tagebuchKatalog(), maxPulsAus(alter),
 *   berechne(daten, einstellungen, eigenesTagebuch), wirkung(erg, schluessel), trendPunkte(erg, feld, { fenster, bis }), KERN
 */
export { tagIso, tagPlus, demo, atemKatalog, atemUebung, tagebuchKatalog, maxPulsAus, berechne, wirkung, trendPunkte, KERN } from "./kern_echt.js";
