/* kern/atem.js – Atemübungen und ihr Zeitplan.
 *
 * Kernaussage: Fünf geführte Atemübungen mit festen Phasen (einatmen, halten, ausatmen, halten). Jede Übung sagt,
 * wie lange jede Phase dauert, wie viele Runden sie ohne eigene Angabe hat und woher sie stammt. atemPlan rechnet
 * daraus den genauen Zeitplan in Millisekunden – die Oberfläche muss nur noch abspielen.
 *
 * Phasen und Fundstellen stehen in formeln.json ("atem.*"). Kein DOM, kein Netz, kein Speicher.
 */
import { formel, wert, eintrag } from "./formeln.js";
import { rund } from "./rundung.js";
import { MS_MINUTE } from "./zeit.js";

/** Namen der Übungen (Reihenfolge der Anzeige). */
export const UEBUNGEN = ["box", "vier-sieben-acht", "kohaerenz", "seufzer", "entspannung"];
export const PHASEN_ARTEN = ["ein", "halten", "aus", "halten2"];

/**
 * Atemübung laden.
 * @param {string} name einer aus UEBUNGEN
 * @returns {{name:string, phasen:Array<{art:string, ms:number, label:string}>, runden:number, zyklusMs:number, gesamtMs:number,
 *   atemzuegeProMinZehntel:number, fundstelle:string, beschreibung:string, formel:object, pruefen:boolean}}
 */
export function atemUebung(name) {
  if (!UEBUNGEN.includes(name)) throw new Error("atem: unbekannte Übung '" + name + "'");
  const schluessel = "atem." + name, e = eintrag(schluessel);
  const phasen = e.wert.phasen.map((p) => ({ art: p.art, ms: p.ms, label: p.label ?? p.art }));
  const zyklusMs = phasen.reduce((a, p) => a + p.ms, 0);
  const runden = e.wert.runden ?? Math.max(1, Math.floor(wert("atem.dauer_standard") / zyklusMs));
  const f = formel(schluessel);
  return {
    name, phasen, runden, zyklusMs, gesamtMs: zyklusMs * runden,
    atemzuegeProMinZehntel: rund((10 * MS_MINUTE) / zyklusMs), // Atemzüge je Minute in Zehnteln (Anzeige)
    fundstelle: f.fundstelle, beschreibung: f.erklaerung, formel: f, pruefen: f.pruefen,
    rundenHerkunft: e.wert.runden ? "fundstelle" : "standarddauer",
  };
}

/**
 * Zeitplan einer Übung: alle Phasen Runde für Runde, Millisekunden ab Start.
 * @param {object|string} uebung Ergebnis von atemUebung oder Name
 * @param {number} [runden] Standard: uebung.runden
 * @returns {Array<{von:number, bis:number, art:string, label:string, runde:number}>}
 */
export function atemPlan(uebung, runden) {
  const u = typeof uebung === "string" ? atemUebung(uebung) : uebung;
  const n = runden ?? u.runden;
  if (!Number.isInteger(n) || n < 0) throw new Error("atem: Runden als ganze Zahl ≥ 0 erwartet");
  const plan = [];
  let t = 0;
  for (let r = 1; r <= n; r++) {
    for (const p of u.phasen) { plan.push({ von: t, bis: t + p.ms, art: p.art, label: p.label, runde: r }); t += p.ms; }
  }
  return plan;
}

/** Formel zum Zeitplan (Belegfenster). */
export const atemPlanFormel = () => formel("atem.plan");
