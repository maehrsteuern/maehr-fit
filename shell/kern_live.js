/* shell/kern_live.js – Tür der Shell zum Live-Teil des Kerns (kern/live.js, kern/demo.js).
 *
 * Kernaussage: Die Live-Ansicht und die Atemübung holen ihre Rechenergebnisse zum Live-Puls nur über diese Datei – Pulszone,
 * laufende Belastung, Kurz-HRV und Kohärenz. Sie steht neben shell/kern.js, damit beide unabhängig wachsen können.
 *
 * Schnittstelle: liveZone(bpm, { maxPuls, ruhepuls }), laufendeBelastung(hs, e, zustand?), hrvKurz(rr, fenster?),
 *   atemKohaerenz(rr, zyklusMs), trainingMindestMs(), pulsFormel(), zonenGrenzen(maxPuls, ruhepuls), maxPulsTanaka(alter)
 */
export { zoneVon as liveZone, laufendeBelastung, hrvKurz, atemKohaerenz, trainingMindestMs, pulsFormel } from "../kern/live.js";
export { zonenGrenzen, maxPulsTanaka } from "../kern/belastung.js";
